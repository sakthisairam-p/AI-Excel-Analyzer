def generate_dataset_summary(profile: dict) -> str:
    rows = profile['rows']
    cols = list(profile['column_names'])
    
    col_str_part = ", ".join(cols[:5])
    if len(cols) > 5:
        col_str_part += " and others"
        
    summary = (
        f"This dataset has {rows:,} rows across {profile['columns']} columns. "
        f"Key columns detected include {col_str_part}. "
    )
    
    if len(profile['numeric_cols']) > 0 and len(profile['datetime_cols']) > 0:
        summary += "It appears to be a transactional or time-series dataset containing both temporal (dates) and measurable metrics (numbers). "
    elif len(profile['numeric_cols']) > 0 and len(profile['categorical_cols']) > 0:
        summary += "It contains a mix of categorical attributes and numeric metrics, making it well-suited for aggregate reporting and Pivot analysis. "
        
    return summary

def generate_pivot_recommendations(profile: dict) -> list:
    recs = []
    num_cols = profile.get('numeric_cols', [])
    cat_cols = profile.get('categorical_cols', [])
    date_cols = profile.get('datetime_cols', [])
    
    # helper
    def add_rec(title, rows, cols, values, chart, why, agg="SUM"):
        # Prevent exact duplicates
        if not any(r['title'] == title for r in recs):
            recs.append({
                "title": title,
                "rows": rows,
                "columns": cols,
                "values": values,
                "aggregation": agg,
                "recommended_chart": chart,
                "why": why
            })

    # Pick top measures
    if num_cols:
        measure1 = num_cols[0]
        # 1. Bar / Column Chart
        if cat_cols:
            cat1 = cat_cols[0]
            add_rec(
                f"{measure1} by {cat1}",
                [cat1],
                [],
                [measure1],
                "Bar Chart",
                f"Useful for comparing {measure1.lower()} across different {cat1.lower()} categories."
            )
        
        # 2. Line Chart for trends
        if date_cols:
            date1 = date_cols[0]
            add_rec(
                f"{measure1} Trend over {date1}",
                [date1],
                [],
                [measure1],
                "Line Chart",
                f"Useful for understanding {measure1.lower()} trends over time."
            )
            
        # 3. Donut / Pie Chart for small categories
        low_cardinality = [c for c in cat_cols if profile.get('unique_counts', {}).get(c, 100) <= 8]
        if low_cardinality:
            small_cat = low_cardinality[-1] # pick another one if possible
            add_rec(
                f"{measure1} Distribution by {small_cat}",
                [small_cat],
                [],
                [measure1],
                "Donut Chart",
                f"Shows the contribution of each {small_cat.lower()} to total {measure1.lower()}."
            )

        # 4. Scatter Chart for relationship
        if len(num_cols) >= 2:
            m1, m2 = num_cols[0], num_cols[1]
            add_rec(
                f"{m1} vs {m2}",
                [m1],
                [],
                [m2],
                "Scatter Chart",
                f"Shows the relationship between {m1.lower()} and {m2.lower()}."
            )

        # 5. Stacked Bar Chart (Two dimensions, one measure)
        if len(cat_cols) >= 2:
            cat1, cat2 = cat_cols[0], cat_cols[1]
            add_rec(
                f"{measure1} by {cat1} and {cat2}",
                [cat1],
                [cat2],
                [measure1],
                "Column Chart",  # A column chart with rows+cols natively stacks visually
                f"Breaks down {measure1.lower()} by both {cat1.lower()} and {cat2.lower()}."
            )
            
        # 6. Additional general Bar Chart if we need more options
        if len(cat_cols) >= 2 and len(recs) < 3:
            add_rec(
                f"{measure1} by {cat_cols[1]}",
                [cat_cols[1]],
                [],
                [measure1],
                "Bar Chart",
                f"Useful for comparing {measure1.lower()}."
            )
            
    # Guarantee something returns
    if not recs and cat_cols:
        add_rec(f"Record Count by {cat_cols[0]}", [cat_cols[0]], [], [cat_cols[0]], "Column Chart", "Basic count grouped by category", "COUNT")

    return recs[:6]

def generate_chart_recommendations(profile: dict) -> list:
    # A bit redundant since pivot includes charts, but here for standalone requests
    return []
