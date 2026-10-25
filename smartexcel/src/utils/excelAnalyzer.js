import * as XLSX from 'xlsx';

export async function analyzeExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                const sheetNames = workbook.SheetNames;
                const mainSheetName = sheetNames[0];
                const worksheet = workbook.Sheets[mainSheetName];

                // Convert to array of arrays
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length === 0) {
                    throw new Error("The Excel sheet is empty.");
                }

                // Remove empty rows at the end if any
                let lastRowIndex = jsonData.length - 1;
                while (lastRowIndex >= 0 && (!jsonData[lastRowIndex] || jsonData[lastRowIndex].length === 0)) {
                    lastRowIndex--;
                }
                const cleanData = jsonData.slice(0, lastRowIndex + 1);

                // Extract Headers
                const headers = cleanData[0] || [];
                const rows = cleanData.slice(1);

                const analysis = performAnalysis(headers, rows);

                resolve({
                    fileInfo: {
                        name: file.name,
                        size: formatBytes(file.size),
                        sheetCount: sheetNames.length,
                        mainSheet: mainSheetName
                    },
                    summary: {
                        totalRows: rows.length,
                        totalColumns: headers.length,
                        duplicateRecords: analysis.duplicateRowsCount,
                        missingValuesTotal: analysis.totalMissing,
                        dataQualityIssues: analysis.totalIssues
                    },
                    columns: analysis.columns,
                    recommendations: analysis.recommendations,
                    pivotRecommendations: generatePivotRecommendations(analysis.columns),
                    chartRecommendations: generateChartRecommendations(analysis.columns)
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function performAnalysis(headers, rows) {
    const numRows = rows.length;

    // Track unique rows for duplicate detection
    const rowStrings = new Set();
    let duplicateRowsCount = 0;

    rows.forEach(row => {
        const rowStr = JSON.stringify(row);
        if (rowStrings.has(rowStr)) {
            duplicateRowsCount++;
        } else {
            rowStrings.add(rowStr);
        }
    });

    const columnsAnalysis = headers.map((header, colIndex) => {
        let missingCount = 0;
        const values = [];
        let numCount = 0;
        let textCount = 0;
        let dateCount = 0;
        let textLookLikeNumberCount = 0;

        for (let i = 0; i < numRows; i++) {
            const val = rows[i] ? rows[i][colIndex] : undefined;

            if (val === undefined || val === null || val === '') {
                missingCount++;
            } else {
                values.push(val);

                if (val instanceof Date) {
                    dateCount++;
                } else if (typeof val === 'number') {
                    numCount++;
                } else if (typeof val === 'string') {
                    textCount++;
                    // check if text looks like a number
                    if (!isNaN(Number(val)) && val.trim() !== '') {
                        textLookLikeNumberCount++;
                    }
                }
            }
        }

        const uniqueValues = new Set(values);
        let type = 'Text';
        if (dateCount > values.length * 0.5) type = 'Date';
        else if (numCount > values.length * 0.5) type = 'Numeric';
        else if (uniqueValues.size === 2 && values.length > 10) type = 'Boolean';

        // Categorical identification
        const isCategorical = type === 'Text' && uniqueValues.size < values.length * 0.1 && uniqueValues.size <= 50 && values.length > 10;

        if (isCategorical) type = 'Categorical';
        if (headers[colIndex].toLowerCase().includes('id') && uniqueValues.size === values.length) type = 'ID';

        const issues = [];
        const suggestedActions = [];

        if (missingCount > 0) {
            issues.push(`Missing Values (${((missingCount / numRows) * 100).toFixed(1)}%)`);
            if (type === 'Numeric') suggestedActions.push('Fill with Mean/Median');
            else suggestedActions.push('Fill with "Unknown" or Mode');
        }

        if (textLookLikeNumberCount > values.length * 0.1) {
            issues.push('Numbers stored as text');
            suggestedActions.push('Convert to Numeric');
        }

        let outlierCount = 0;
        if (type === 'Numeric' && values.length > 5) {
            // Basic IQR Outlier detection
            const numVals = values.filter(v => typeof v === 'number').sort((a, b) => a - b);
            if (numVals.length >= 4) {
                const q1 = numVals[Math.floor(numVals.length * 0.25)];
                const q3 = numVals[Math.floor(numVals.length * 0.75)];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;

                outlierCount = numVals.filter(v => v < lowerBound || v > upperBound).length;
                if (outlierCount > 0) {
                    issues.push(`${outlierCount} Potential Outliers`);
                    suggestedActions.push('Review Outliers');
                }
            }
        }

        return {
            name: header,
            type,
            missingCount,
            missingPercent: ((missingCount / numRows) * 100).toFixed(1),
            uniqueCount: uniqueValues.size,
            duplicateCount: values.length - uniqueValues.size,
            issues,
            suggestedActions,
            _valuesLength: values.length,
            _numCount: numCount,
            _dateCount: dateCount
        };
    });

    let totalMissing = 0;
    let totalIssues = 0;
    const recommendations = [];

    if (duplicateRowsCount > 0) {
        totalIssues++;
        recommendations.push({
            type: 'Duplicate Records',
            issue: `${duplicateRowsCount} duplicate rows found`,
            reason: 'Duplicate records can affect aggregation, Pivot Tables and chart accuracy.',
            action: 'Remove duplicate records.'
        });
    }

    columnsAnalysis.forEach(c => {
        totalMissing += c.missingCount;
        if (c.issues.length > 0) {
            totalIssues += c.issues.length;

            c.issues.forEach(iss => {
                if (iss.includes('Missing Values')) {
                    recommendations.push({
                        type: 'Missing Values',
                        column: c.name,
                        issue: `${c.missingCount} missing values in ${c.name}`,
                        reason: 'Missing data can skew analysis and models.',
                        action: c.suggestedActions.find(a => a.includes('Fill')) || 'Leave unchanged'
                    });
                }
                if (iss === 'Numbers stored as text') {
                    recommendations.push({
                        type: 'Data Type',
                        column: c.name,
                        issue: iss,
                        reason: 'Text values cannot be safely aggregated (Sum/Avg).',
                        action: 'Convert column to numeric.'
                    });
                }
            });
        }
    });

    return {
        columns: columnsAnalysis,
        duplicateRowsCount,
        totalMissing,
        totalIssues,
        recommendations
    };
}

function generatePivotRecommendations(columns) {
    const pivots = [];

    const numerics = columns.filter(c => c.type === 'Numeric');
    const categoricals = columns.filter(c => ['Categorical', 'Text', 'Boolean'].includes(c.type) && c.uniqueCount < 50);
    const dates = columns.filter(c => c.type === 'Date' || c.name.toLowerCase().includes('date'));

    if (categoricals.length >= 2 && numerics.length >= 1) {
        pivots.push({
            title: `${numerics[0].name} by ${categoricals[0].name} and ${categoricals[1].name}`,
            rows: categoricals[0].name,
            cols: categoricals[1].name,
            values: `Sum of ${numerics[0].name}`,
            purpose: `Compare ${numerics[0].name.toLowerCase()} across ${categoricals[0].name.toLowerCase()}s and ${categoricals[1].name.toLowerCase()}s.`
        });
    }

    if (categoricals.length >= 1 && numerics.length >= 2) {
        pivots.push({
            title: `${categoricals[0].name} Performance`,
            rows: categoricals[0].name,
            cols: '',
            values: `Sum of ${numerics[0].name}, Sum of ${numerics[1].name}`,
            purpose: `Identify high-${numerics[0].name.toLowerCase()} and high-${numerics[1].name.toLowerCase()} ${categoricals[0].name.toLowerCase()}s.`
        });
    }

    if (dates.length >= 1 && numerics.length >= 1) {
        pivots.push({
            title: `${numerics[0].name} Trend`,
            rows: `Month(${dates[0].name})`,
            cols: '',
            values: `Sum of ${numerics[0].name}`,
            purpose: `Analyze ${numerics[0].name.toLowerCase()} performance over time.`
        });
    }

    // Fallback
    if (pivots.length === 0 && categoricals.length > 0 && numerics.length > 0) {
        pivots.push({
            title: `${numerics[0].name} by ${categoricals[0].name}`,
            rows: categoricals[0].name,
            cols: '',
            values: `Sum of ${numerics[0].name}`,
            purpose: `Basic breakdown of ${numerics[0].name.toLowerCase()}.`
        });
    }

    return pivots;
}

function generateChartRecommendations(columns) {
    const charts = [];
    const numerics = columns.filter(c => c.type === 'Numeric');
    const categoricals = columns.filter(c => ['Categorical', 'Text', 'Boolean'].includes(c.type) && c.uniqueCount < 20);
    const dates = columns.filter(c => c.type === 'Date');

    if (dates.length >= 1 && numerics.length >= 1) {
        charts.push({
            title: `${numerics[0].name} over Time`,
            type: 'Line Chart',
            xAxis: dates[0].name,
            yAxis: numerics[0].name,
            reason: 'Perfect for showing trends over time.'
        });
    }

    if (categoricals.length >= 1 && numerics.length >= 1) {
        charts.push({
            title: `${numerics[0].name} by ${categoricals[0].name}`,
            type: 'Bar Chart',
            xAxis: categoricals[0].name,
            yAxis: numerics[0].name,
            reason: `Best to compare ${numerics[0].name.toLowerCase()} across different ${categoricals[0].name.toLowerCase()}s.`
        });

        if (categoricals[0].uniqueCount <= 6) {
            charts.push({
                title: `${numerics[0].name} Distribution by ${categoricals[0].name}`,
                type: 'Pie Chart',
                xAxis: 'N/A',
                yAxis: `${numerics[0].name} (Proportion)`,
                reason: 'Shows proportional distribution effectively for small number of categories.'
            });
        }
    }

    if (numerics.length >= 2) {
        charts.push({
            title: `Correlation: ${numerics[0].name} vs ${numerics[1].name}`,
            type: 'Scatter Plot',
            xAxis: numerics[0].name,
            yAxis: numerics[1].name,
            reason: 'Helps identify potential correlations between two numerical metrics.'
        });
    }

    return charts;
}
