import React, { useRef } from 'react';
import { UploadCloud, FileSpreadsheet, FilePlus, ArrowRight } from 'lucide-react';

function Dashboard({ result, analyzing, onFileUpload, setActiveTab }) {
    const fileInputRef = useRef();

    return (
        <div className="dashboard-container fade-in">
            <div className="upload-section">
                <h2>Excel File Analysis</h2>
                <p className="upload-subtitle">Upload your Excel file and get intelligent insights, recommendations and visualizations.</p>

                <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current.click()}
                >
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        ref={fileInputRef}
                        onChange={onFileUpload}
                        style={{ display: 'none' }}
                    />
                    <UploadCloud size={48} className="upload-icon" />
                    {analyzing ? (
                        <h3 className="pulse">Analyzing File...</h3>
                    ) : (
                        <>
                            <h3>Drag & Drop or Click to Upload</h3>
                            <p>Supports .xlsx and .xls formats</p>
                        </>
                    )}
                </div>

                {result && (
                    <div className="upload-success">
                        <div className="file-info-badge">
                            <FileSpreadsheet className="text-secondary" />
                            <span>{result.fileInfo.name}</span>
                            <span className="file-size">{result.fileInfo.size}</span>
                        </div>
                        <p className="success-text">File uploaded successfully</p>
                    </div>
                )}
            </div>

            {result && (
                <div className="summary-section slide-up">
                    <h3 className="section-title">Data Summary</h3>
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="sc-header">Rows</div>
                            <div className="sc-value">{result.summary.totalRows.toLocaleString()}</div>
                        </div>
                        <div className="summary-card">
                            <div className="sc-header">Columns</div>
                            <div className="sc-value">{result.summary.totalColumns.toLocaleString()}</div>
                        </div>
                        <div className="summary-card error-card">
                            <div className="sc-header">Missing Values</div>
                            <div className="sc-value">{result.summary.missingValuesTotal.toLocaleString()}</div>
                        </div>
                        <div className="summary-card warning-card">
                            <div className="sc-header">Duplicate Rows</div>
                            <div className="sc-value">{result.summary.duplicateRecords.toLocaleString()}</div>
                        </div>
                        <div className="summary-card info-card">
                            <div className="sc-header">Quality Issues</div>
                            <div className="sc-value">{result.summary.dataQualityIssues.toLocaleString()}</div>
                        </div>
                        <div className="summary-card">
                            <div className="sc-header">Sheets</div>
                            <div className="sc-value">{result.fileInfo.sheetCount}</div>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <button className="btn btn-primary" onClick={() => setActiveTab('Data Overview')}>
                            View Data Overview <ArrowRight size={16} />
                        </button>
                        <button className="btn btn-secondary" onClick={() => setActiveTab('Cleaning Recommendations')}>
                            Review Recommendations
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
