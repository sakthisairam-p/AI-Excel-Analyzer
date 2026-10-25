import pandas as pd
import numpy as pd_np
import uuid

def analyze_dataframe(df: pd.DataFrame) -> dict:
    profile = {
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "types": dict(df.dtypes.astype(str)),
        "numeric_cols": list(df.select_dtypes(include=['int64', 'float64']).columns),
        "datetime_cols": list(df.select_dtypes(include=['datetime64', 'datetimetz']).columns),
        "text_cols": list(df.select_dtypes(include=['object', 'string']).columns),
        "categorical_cols": [],
        "missing_counts": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
        "unique_counts": {k: int(v) for k, v in df.nunique().to_dict().items()},
        "empty_cols": [col for col in df.columns if df[col].isnull().all()]
    }
    
    for col in profile["text_cols"]:
        if profile["unique_counts"][col] < 50 and profile["rows"] > 100:
            profile["categorical_cols"].append(col)
            
    # Attempt to find columns that are object but should be dates
    for col in profile["text_cols"]:
        if col not in profile["categorical_cols"] and 'date' in col.lower():
            try:
                pd.to_datetime(df[col].dropna().head(10), errors='raise')
                if col not in profile["datetime_cols"]:
                    profile["datetime_cols"].append(col)
            except:
                pass
                
    return profile

def check_data_quality(df: pd.DataFrame, profile: dict) -> list:
    issues = []
    
    # Check for empty columns
    for col in profile["empty_cols"]:
        issues.append({
            "id": str(uuid.uuid4()),
            "type": "empty_column",
            "column": col,
            "title": "Completely Empty Column",
            "description": f"The column '{col}' contains absolutely no data.",
            "recommendation": f"Remove the empty column '{col}'.",
            "is_safe": True,
            "status": "pending"
        })

    # Duplicate rows
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        issues.append({
            "id": str(uuid.uuid4()),
            "type": "duplicate_rows",
            "column": "Dataset",
            "title": "Duplicate Rows",
            "description": f"{dup_count} completely duplicated rows were detected.",
            "recommendation": "Remove the duplicate rows to ensure accurate aggregations.",
            "is_safe": True,
            "status": "pending"
        })
        
    # Missing values
    for col, count in profile["missing_counts"].items():
        if count > 0 and col not in profile["empty_cols"]:
            issues.append({
                "id": str(uuid.uuid4()),
                "type": "missing_values",
                "column": col,
                "title": "Missing Values",
                "description": f"{count} cells in the '{col}' column are empty.",
                "recommendation": f"Fill missing '{col}' values with 'Unknown' or Mean/Median depending on data type.",
                "is_safe": False,  # Not fully safe because dropping might be preferred, or imputing differently
                "status": "pending"
            })
            
    # Extra spaces / Inconsistent capitalization in Categorical / Text cols
    for col in profile["categorical_cols"] + profile["text_cols"]:
        if col not in df.columns:
             continue
        # check leading/trailing space
        s = df[col].dropna().astype(str)
        space_issues = s[s.str.startswith(' ') | s.str.endswith(' ')].count()
        if space_issues > 0:
            issues.append({
                "id": str(uuid.uuid4()),
                "type": "extra_spaces",
                "column": col,
                "title": "Unnecessary Whitespace",
                "description": f"{space_issues} values in '{col}' contain unnecessary leading/trailing spaces.",
                "recommendation": "Remove unnecessary spaces from these values.",
                "is_safe": True,
                "status": "pending"
            })
            
        # check inconsistent casing for categoricals
        if col in profile["categorical_cols"]:
            lowered = s.str.lower()
            if lowered.nunique() < s.nunique():
                issues.append({
                    "id": str(uuid.uuid4()),
                    "type": "inconsistent_casing",
                    "column": col,
                    "title": "Inconsistent Capitalization",
                    "description": f"The '{col}' column contains values that only differ by capitalization.",
                    "recommendation": "Standardize all values to Title Case to fix inconsistencies.",
                    "is_safe": True,
                    "status": "pending"
                })

    # Numbers stored as text
    for col in profile["text_cols"]:
        if col in df.columns:
            s_non_null = df[col].dropna()
            # check if a significant portion contains numeric digits
            if len(s_non_null) > 0:
                is_numeric_str = s_non_null.astype(str).str.match(r'^-?\d+(?:\.\d+)?$')
                numeric_count = is_numeric_str.sum()
                if numeric_count > 0 and numeric_count > len(s_non_null) * 0.5:
                    issues.append({
                        "id": str(uuid.uuid4()),
                        "type": "numeric_as_text",
                        "column": col,
                        "title": "Numeric Values Stored as Text",
                        "description": f"{numeric_count} values in '{col}' appear to be numbers stored as text.",
                        "recommendation": f"Convert '{col}' completely to numeric format.",
                        "is_safe": True,
                        "status": "pending"
                    })

    return issues
