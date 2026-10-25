import os
import pandas as pd
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows

TMP_DIR = "tmp_exports"
if not os.path.exists(TMP_DIR):
    os.makedirs(TMP_DIR)

def export_cleaned_data(df: pd.DataFrame, format: str, session_id: str) -> str:
    path = os.path.join(TMP_DIR, f"{session_id}_cleaned")
    if format == 'csv':
        path += '.csv'
        df.to_csv(path, index=False)
    else:
        path += '.xlsx'
        df.to_excel(path, index=False)
    return path

def export_full_report(session, session_id: str) -> str:
    path = os.path.join(TMP_DIR, f"{session_id}_report.xlsx")
    
    # Use Pandas ExcelWriter to create multiple sheets
    with pd.ExcelWriter(path, engine='xlsxwriter') as writer:
        # Sheet 1: Cleaned Data
        session.current_df.to_excel(writer, sheet_name='Cleaned Data', index=False)
        
        # Sheet 2: Data Quality Summary
        dq_data = {
            "Total Issues Found": [len(session.issues)],
            "Issues Fixed": [len([i for i in session.issues if i['status'] == 'fixed'])],
            "Issues Declined": [len([i for i in session.issues if i['status'] == 'declined'])],
            "Issues Remaining": [len([i for i in session.issues if i['status'] == 'pending'])]
        }
        pd.DataFrame(dq_data).to_excel(writer, sheet_name='Data Quality Summary', index=False)
        
        # Sheet 3: Cleaning Log
        if session.log:
            pd.DataFrame(session.log).to_excel(writer, sheet_name='Cleaning Log', index=False)
        else:
            pd.DataFrame({"Log": ["No cleaning operations performed."]}).to_excel(writer, sheet_name='Cleaning Log', index=False)
            
        # Sheet 4+: Render Pivot Tables and Native Excel Charts for saved_charts
        if hasattr(session, 'saved_charts') and session.saved_charts:
            workbook = writer.book
            for i, chart_info in enumerate(session.saved_charts):
                # Ensure sheet name is short enough
                sheet_name = f'Pivot {i+1}'
                df_chart = pd.DataFrame(chart_info["pivot_data"])
                df_chart.to_excel(writer, sheet_name=sheet_name, index=False)
                
                worksheet = writer.sheets[sheet_name]
                
                # Map charting types properly
                ctype = 'column'
                if chart_info['chart_type'] == 'Line Chart': ctype = 'line'
                elif chart_info['chart_type'] == 'Bar Chart': ctype = 'bar'
                elif chart_info['chart_type'] == 'Pie Chart' or chart_info['chart_type'] == 'Donut Chart': 
                    ctype = 'pie'
                    if chart_info['chart_type'] == 'Donut Chart': ctype = 'doughnut'
                elif chart_info['chart_type'] == 'Scatter Chart': ctype = 'scatter'
                
                chart = workbook.add_chart({'type': ctype})
                
                num_rows = len(df_chart.index)
                num_cols = len(df_chart.columns)
                
                if num_rows > 0 and num_cols > 1:
                    for col_num in range(1, num_cols):
                        chart.add_series({
                            'name':       [sheet_name, 0, col_num],
                            'categories': [sheet_name, 1, 0, num_rows, 0],
                            'values':     [sheet_name, 1, col_num, num_rows, col_num],
                        })
                    
                    chart.set_title({'name': chart_info['title']})
                    # Insert the chart right next to the pivot table data
                    insert_r = 'D2' if num_cols <= 3 else f'{chr(ord("A") + num_cols + 2)}2'
                    worksheet.insert_chart(insert_r, chart)
        else:
            pd.DataFrame({"Info": ["No charts saved."]}).to_excel(writer, sheet_name='Charts', index=False)
        
    return path
