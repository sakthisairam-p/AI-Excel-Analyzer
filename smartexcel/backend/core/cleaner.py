import pandas as pd
from datetime import datetime

def apply_cleaning_operation(df: pd.DataFrame, issue: dict):
    """
    Applies the cleaning fix described by the issue.
    Returns: (Updated DataFrame, ActionLog Dict)
    """
    updated_df = df.copy()
    issue_type = issue['type']
    col = issue.get('column')
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    action_log = {
        "timestamp": timestamp,
        "issue": issue['title'],
        "column": col,
        "operation": "",
        "affected": 0,
        "status": "Applied"
    }

    if issue_type == "empty_column":
        updated_df = updated_df.drop(columns=[col])
        action_log["operation"] = "Dropped Column"
        action_log["affected"] = len(df)
        
    elif issue_type == "duplicate_rows":
        initial_len = len(updated_df)
        updated_df = updated_df.drop_duplicates()
        action_log["operation"] = "Removed duplicate rows"
        action_log["affected"] = initial_len - len(updated_df)
        
    elif issue_type == "missing_values":
        affected = updated_df[col].isnull().sum()
        if pd.api.types.is_numeric_dtype(updated_df[col]):
            median_val = updated_df[col].median()
            updated_df[col] = updated_df[col].fillna(median_val)
            action_log["operation"] = f"Filled missing with median ({median_val})"
        else:
            updated_df[col] = updated_df[col].fillna("Unknown")
            action_log["operation"] = "Filled missing with 'Unknown'"
        action_log["affected"] = int(affected)
        
    elif issue_type == "extra_spaces":
        mask = updated_df[col].notnull()
        before = updated_df[col].astype(str)
        after = before.str.strip()
        affected = (before != after).sum()
        
        updated_df.loc[mask, col] = updated_df.loc[mask, col].astype(str).str.strip()
        action_log["operation"] = "Stripped leading/trailing spaces"
        action_log["affected"] = int(affected)
        
    elif issue_type == "inconsistent_casing":
        mask = updated_df[col].notnull()
        before = updated_df[col].astype(str)
        after = before.str.title()
        affected = (before != after).sum()
        
        updated_df.loc[mask, col] = updated_df.loc[mask, col].astype(str).str.title()
        action_log["operation"] = "Standardized to Title Case"
        action_log["affected"] = int(affected)
        
    elif issue_type == "numeric_as_text":
        mask = updated_df[col].notnull()
        updated_df[col] = pd.to_numeric(updated_df[col], errors='coerce')
        affected = mask.sum()
        action_log["operation"] = "Converted to numeric (coerced errors)"
        action_log["affected"] = int(affected)

    return updated_df, action_log
