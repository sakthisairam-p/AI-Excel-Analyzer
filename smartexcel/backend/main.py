import os
import uuid
import pandas as pd
from typing import Dict, List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from core.analyzer import analyze_dataframe, check_data_quality
from core.cleaner import apply_cleaning_operation
from core.ai_insights import generate_dataset_summary, generate_pivot_recommendations, generate_chart_recommendations
from core.export import export_cleaned_data, export_full_report

app = FastAPI(title="SmartExcel Data Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage
# In production, use Redis or a Database
class SessionState:
    def __init__(self, original_df: pd.DataFrame, filename: str):
        self.original_df = original_df.copy()
        self.current_df = original_df.copy()
        self.filename = filename
        self.issues = []
        self.log = []
        self.metadata = {}
        self.saved_charts = []

sessions: Dict[str, SessionState] = {}

class PivotRequest(BaseModel):
    session_id: str
    rows: List[str]
    columns: List[str]
    values: List[str]
    aggregation: str

class SaveChartRequest(BaseModel):
    session_id: str
    chart_id: str
    title: str
    chart_type: str
    rows: List[str]
    columns: List[str]
    values: List[str]
    aggregation: str
    pivot_data: List[dict]

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    session_id = str(uuid.uuid4())
    session = SessionState(df, file.filename)
    
    # 1. Analyze DataFrame
    profile = analyze_dataframe(df)
    session.metadata = profile
    
    # 2. Check Data Quality (find issues)
    issues = check_data_quality(df, profile)
    session.issues = issues
    
    sessions[session_id] = session
    
    # Generate AI explanation
    ai_summary = generate_dataset_summary(profile)

    return {
        "session_id": session_id,
        "profile": profile,
        "ai_summary": ai_summary,
        "issues": [issue for issue in issues if issue['status'] == 'pending']
    }

@app.get("/dataset/profile")
def get_profile(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    profile = analyze_dataframe(session.current_df)
    return {
        "profile": profile,
        "ai_summary": generate_dataset_summary(profile)
    }

@app.get("/data-quality/issues")
def get_issues(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    # Return all pending and history
    return {
        "pending": [issue for issue in session.issues if issue['status'] == 'pending'],
        "fixed": [issue for issue in session.issues if issue['status'] == 'fixed'],
        "declined": [issue for issue in session.issues if issue['status'] == 'declined']
    }

@app.post("/data-quality/{issue_id}/accept")
def accept_issue(issue_id: str, session_id: str = Form(...)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    issue = next((i for i in session.issues if i['id'] == issue_id), None)
    
    if not issue or issue['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Invalid issue or already processed")

    # Apply cleaning operation
    try:
        updated_df, action_log = apply_cleaning_operation(session.current_df, issue)
        session.current_df = updated_df
        issue['status'] = 'fixed'
        session.log.append(action_log)
        
        # update metadata logic minimally
        session.metadata = analyze_dataframe(session.current_df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "success", "message": f"Applied fix for {issue['title']}"}


@app.post("/data-quality/{issue_id}/decline")
def decline_issue(issue_id: str, session_id: str = Form(...)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    issue = next((i for i in session.issues if i['id'] == issue_id), None)
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue['status'] = 'declined'
    
    return {"status": "success"}

@app.post("/data-quality/accept-safe")
def accept_safe_issues(session_id: str = Form(...)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    
    applied_count = 0
    for issue in session.issues:
        if issue['status'] == 'pending' and issue.get('is_safe', False):
            try:
                updated_df, action_log = apply_cleaning_operation(session.current_df, issue)
                session.current_df = updated_df
                issue['status'] = 'fixed'
                session.log.append(action_log)
                applied_count += 1
            except Exception:
                pass
                
    if applied_count > 0:
        session.metadata = analyze_dataframe(session.current_df)
    
    return {"status": "success", "applied": applied_count}

@app.get("/dataset/preview")
def get_preview(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    
    orig_shape = session.original_df.shape
    curr_shape = session.current_df.shape
    
    # Replace nan with None for JSON serialization
    orig_head = session.original_df.head(10).astype(str).fillna("").to_dict(orient="records")
    curr_head = session.current_df.head(10).astype(str).fillna("").to_dict(orient="records")
    
    return {
        "original_rows": orig_shape[0],
        "original_cols": orig_shape[1],
        "current_rows": curr_shape[0],
        "current_cols": curr_shape[1],
        "fixed_count": len([i for i in session.issues if i['status'] == 'fixed']),
        "declined_count": len([i for i in session.issues if i['status'] == 'declined']),
        "remaining_count": len([i for i in session.issues if i['status'] == 'pending']),
        "original_data": orig_head,
        "current_data": curr_head,
        "changes": session.log
    }

@app.get("/pivot/recommendations")
def get_pivot_recommendations(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    pivots = generate_pivot_recommendations(session.metadata)
    charts = generate_chart_recommendations(session.metadata)
    
    return {
        "pivots": pivots,
        "charts": charts,
        "saved_charts": getattr(session, 'saved_charts', [])
    }

@app.post("/pivot/create")
def create_pivot(req: PivotRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[req.session_id]
    df = session.current_df
    
    # validate columns
    all_req_cols = req.rows + req.columns + req.values
    for c in all_req_cols:
        if c not in df.columns:
             raise HTTPException(status_code=400, detail=f"Column {c} not found")
             
    agg_func = req.aggregation.lower()
    valid_aggs = ['sum', 'count', 'mean', 'average', 'min', 'max']
    if agg_func not in valid_aggs:
        agg_func = 'sum'
    if agg_func == 'average':
        agg_func = 'mean'
    
    try:
        if not req.rows and not req.columns:
            return {"error": "Must provide at least one row or column"}
            
        pivot = pd.pivot_table(
            df, 
            values=req.values if req.values else None, 
            index=req.rows if req.rows else None,
            columns=req.columns if req.columns else None,
            aggfunc=agg_func,
            fill_value=0
        )
        # reset object for JSON
        if hasattr(pivot.columns, 'levels'):
            pivot.columns = ['_'.join([str(c) for c in col]).strip() for col in pivot.columns.values]
            
        flat_pivot = pivot.reset_index()
        return flat_pivot.astype(str).fillna("").to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot create pivot: {str(e)}")

@app.post("/pivot/save")
def save_chart(req: SaveChartRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[req.session_id]
    
    chart_info = {
        "chart_id": req.chart_id,
        "title": req.title,
        "chart_type": req.chart_type,
        "rows": req.rows,
        "columns": req.columns,
        "values": req.values,
        "aggregation": req.aggregation,
        "pivot_data": req.pivot_data
    }
    
    # Prevent duplicate configurations
    is_duplicate = any(
        c["rows"] == req.rows and c["values"] == req.values and c["aggregation"] == req.aggregation and c["chart_type"] == req.chart_type
        for c in session.saved_charts
    )
    if is_duplicate:
        return {"status": "success", "message": "Already added"}
        
    # Store or update
    existing_idx = next((i for i, c in enumerate(session.saved_charts) if c["chart_id"] == req.chart_id), None)
    if existing_idx is not None:
        session.saved_charts[existing_idx] = chart_info
    else:
        session.saved_charts.append(chart_info)
        
    return {"status": "success"}

@app.delete("/pivot/delete/{chart_id}")
def delete_chart(chart_id: str, session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    if hasattr(session, 'saved_charts'):
        session.saved_charts = [c for c in session.saved_charts if c["chart_id"] != chart_id]
    return {"status": "success"}

@app.get("/report")
def get_report(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    return {
        "dataset_overview": session.metadata,
        "data_quality_summary": {
            "fixed": len([i for i in session.issues if i['status'] == 'fixed']),
            "declined": len([i for i in session.issues if i['status'] == 'declined']),
            "remaining": len([i for i in session.issues if i['status'] == 'pending'])
        },
        "log": session.log,
        "charts": session.saved_charts
    }

@app.get("/report/insights")
def get_report_insights(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    try:
        insights = generate_dataset_summary(session.metadata)
        return {"insights": insights}
    except Exception as e:
        return {"insights": None, "error": str(e)}

@app.get("/download/cleaned")
def download_cleaned(session_id: str, format: str = 'csv'):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    filepath = export_cleaned_data(session.current_df, format, session_id)
    
    filename = f"cleaned_{session.filename}"
    if format == 'csv':
        filename = filename.rsplit('.', 1)[0] + '.csv'
        
    return FileResponse(filepath, filename=filename)

@app.get("/download/report")
def download_report(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    filepath = export_full_report(session, session_id)
    return FileResponse(filepath, filename=f"Report_{session.filename.rsplit('.', 1)[0]}.xlsx")

if __name__ == "__main__":
    import uvicorn
    # run with: uvicorn main:app --reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
