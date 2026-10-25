import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, XCircle, Download, ArrowRight, BarChart2, Activity, Play, Settings, Navigation, AlertTriangle, FileText, Check, Database, Home, ChevronRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import * as api from './api';
import './index.css';

function App() {
    const [sessionId, setSessionId] = useState(null);
    const [activeStep, setActiveStep] = useState(1);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Steps Navigation
    const steps = [
        { id: 1, name: 'Upload Dataset', icon: <UploadCloud size={18} /> },
        { id: 2, name: 'Data Cleaning', icon: <AlertTriangle size={18} /> },
        { id: 3, name: 'Cleaned Preview', icon: <Database size={18} /> },
        { id: 4, name: 'Pivot & Charts', icon: <BarChart2 size={18} /> },
        { id: 5, name: 'Report', icon: <FileText size={18} /> },
    ];

    const handleUpload = async (file) => {
        setLoading(true);
        try {
            const data = await api.uploadDataset(file);
            data.filename = file.name;
            setSessionId(data.session_id);
            setProfileData(data);
            setActiveStep(2);
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            {/* Dynamic Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">AI</div>
                    <h2>SmartExcel</h2>
                </div>
                <nav className="sidebar-nav" style={{ marginTop: '20px' }}>
                    <ul style={{ position: 'relative' }}>
                        {steps.map((st, i) => (
                            <li
                                key={st.id}
                                className={activeStep === st.id ? 'active' : ''}
                                onClick={() => { if (sessionId || st.id === 1) setActiveStep(st.id); }}
                                style={{ opacity: (!sessionId && st.id > 1) ? 0.5 : 1, cursor: (!sessionId && st.id > 1) ? 'not-allowed' : 'pointer' }}
                            >
                                {st.icon}
                                <span>{st.id}. {st.name}</span>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            <main className="main-content">
                <header className="top-header">
                    <h1>AI Dataset Analyzer & Cleaner</h1>
                    <p className="subtitle">Automated profiling, cleaning, and reporting.</p>
                </header>
                <div className="content-area">
                    {activeStep === 1 && <UploadStep onUpload={handleUpload} loading={loading} />}
                    {activeStep === 2 && sessionId && profileData && <CleaningStep sessionId={sessionId} profileData={profileData} onNext={() => setActiveStep(3)} />}
                    {activeStep === 3 && sessionId && <PreviewStep sessionId={sessionId} onNext={() => setActiveStep(4)} />}
                    {activeStep === 4 && sessionId && profileData && <PivotStep sessionId={sessionId} profileData={profileData} onNext={() => setActiveStep(5)} />}
                    {activeStep === 5 && sessionId && <ReportStep sessionId={sessionId} profileData={profileData} onBackToCharts={() => setActiveStep(4)} />}
                </div>
            </main>
        </div>
    );
}

// -------------------------------------------------------------
// UI COMPONENTS
// -------------------------------------------------------------

function UploadStep({ onUpload, loading }) {
    const fileRef = useRef(null);

    return (
        <div className="slide-up text-center" style={{ marginTop: '40px' }}>
            <h2>Upload Dataset</h2>
            <p className="text-muted" style={{ maxWidth: '600px', margin: '16px auto' }}>Upload your Excel or CSV dataset to let the AI profile the data, identify structural issues, and recommend safe cleaning actions.</p>

            <div className="upload-dropzone" onClick={() => !loading && fileRef.current.click()} style={{ marginTop: '40px' }}>
                <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".csv,.xlsx,.xls" onChange={(e) => onUpload(e.target.files[0])} />
                <UploadCloud size={64} className={loading ? "pulse" : "upload-icon"} />
                {loading ? (
                    <h3>Analyzing Dataset... (Running Python checks)</h3>
                ) : (
                    <>
                        <h3>Drag & Drop Dataset Here</h3>
                        <p>Supported: .xlsx, .xls, .csv</p>
                    </>
                )}
            </div>
        </div>
    );
}

function CleaningStep({ sessionId, profileData, onNext }) {
    const [issuesData, setIssuesData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentIssues = async () => {
        const data = await api.fetchIssues(sessionId);
        setIssuesData(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCurrentIssues();
    }, [sessionId]);

    const onAccept = async (issueId) => {
        await api.acceptIssue(sessionId, issueId);
        fetchCurrentIssues();
    };

    const onDecline = async (issueId) => {
        await api.declineIssue(sessionId, issueId);
        fetchCurrentIssues();
    };

    const onAcceptAll = async () => {
        await api.acceptSafeIssues(sessionId);
        fetchCurrentIssues();
    };

    if (loading) return <div>Loading Profile...</div>;

    const pd = profileData.profile;

    return (
        <div className="slide-up">
            <div className="component-card">
                <h2>Dataset Profile</h2>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2563eb', marginBottom: '24px' }}>
                    <strong>AI Analysis:</strong> {profileData.ai_summary}
                </div>
                <div className="summary-cards">
                    <div className="summary-card"><div className="sc-header">Rows</div><div className="sc-value">{pd.rows.toLocaleString()}</div></div>
                    <div className="summary-card"><div className="sc-header">Columns</div><div className="sc-value">{pd.columns}</div></div>
                    <div className="summary-card"><div className="sc-header">Numeric Cols</div><div className="sc-value">{pd.numeric_cols.length}</div></div>
                    <div className="summary-card"><div className="sc-header">Categorical Cols</div><div className="sc-value">{pd.categorical_cols.length}</div></div>
                    <div className="summary-card"><div className="sc-header">Date Cols</div><div className="sc-value">{pd.datetime_cols.length}</div></div>
                </div>
            </div>

            <div className="component-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2>Data Quality Issues</h2>
                    {issuesData.pending.length > 0 && <button className="btn btn-secondary" onClick={onAcceptAll}>Accept All Safe Fixes</button>}
                </div>

                {issuesData.pending.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <AlertTriangle size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                        <h3>All clear!</h3>
                        <p>No remaining data quality issues detected.</p>
                        <button className="btn btn-primary" onClick={onNext} style={{ margin: '24px auto' }}>Continue to Cleaned Preview <ArrowRight size={16} /></button>
                    </div>
                ) : (
                    <div className="recommendations-grid">
                        {issuesData.pending.map(issue => (
                            <div className="rec-card" key={issue.id}>
                                <div className="rec-header">
                                    <AlertTriangle className="text-warning" />
                                    <h3>{issue.title}</h3>
                                </div>
                                <p><strong>Column:</strong> {issue.column}</p>
                                <p><strong>Problem:</strong> {issue.description}</p>
                                <div className="rec-action-box">
                                    <p><strong>AI Recommendation:</strong> {issue.recommendation}</p>
                                    <div className="rec-buttons mt-15">
                                        <button className="btn btn-primary" onClick={() => onAccept(issue.id)}><Check size={16} /> ACCEPT</button>
                                        <button className="btn btn-outline" onClick={() => onDecline(issue.id)}><XCircle size={16} /> DECLINE</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '32px' }}>
                    <h4>Issue Status Summary</h4>
                    <ul style={{ display: 'flex', gap: '24px', listStyle: 'none', marginTop: '12px', fontSize: '14px' }}>
                        <li style={{ color: '#64748b' }}>Remaining: {issuesData.pending.length}</li>
                        <li style={{ color: '#10b981' }}>Fixed: {issuesData.fixed.length}</li>
                        <li style={{ color: '#ef4444' }}>Declined: {issuesData.declined.length}</li>
                    </ul>
                </div>
            </div>

            <button className="btn btn-primary full-width" onClick={onNext} style={{ padding: '16px' }}>
                Skip / Continue to Cleaned Preview <ArrowRight size={18} />
            </button>
        </div>
    );
}

function PreviewStep({ sessionId, onNext }) {
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('cleaned');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.fetchPreview(sessionId);
            setData(res);
        } catch (e) {
            setError(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [sessionId]);

    if (loading) return <div>Loading preview...</div>;
    if (error) return (
        <div>
            <p>Unable to load data. {error}</p>
            <button className="btn btn-outline" onClick={loadData}>Retry</button>
        </div>
    );
    if (!data) return <div>No data found.</div>;

    return (
        <div className="slide-up">
            <div className="component-card">
                <h2>Cleaned Dataset Preview</h2>
                <div style={{ display: 'flex', gap: '32px', marginTop: '24px', marginBottom: '24px' }}>
                    <div>
                        <p className="text-muted">Original</p>
                        <h3>{data.original_rows} rows x {data.original_cols} cols</h3>
                    </div>
                    <div>
                        <p className="text-muted">Current</p>
                        <h3>{data.current_rows} rows x {data.current_cols} cols</h3>
                    </div>
                    <div>
                        <p className="text-muted">Issues Handled</p>
                        <h3>{data.fixed_count} fixed, {data.declined_count} declined</h3>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                    <button className={`btn ${tab === 'original' ? 'btn-primary' : 'btn-text'}`} onClick={() => setTab('original')}>Original Data</button>
                    <button className={`btn ${tab === 'cleaned' ? 'btn-primary' : 'btn-text'}`} onClick={() => setTab('cleaned')}>Cleaned Data</button>
                    <button className={`btn ${tab === 'changes' ? 'btn-primary' : 'btn-text'}`} onClick={() => setTab('changes')}>Changes Made (Log)</button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {tab === 'changes' ? (
                        <table className="modern-table">
                            <thead><tr><th>Issue</th><th>Column</th><th>Operation</th><th>Rows Affected</th><th>Status</th></tr></thead>
                            <tbody>
                                {data.changes.map((log, i) => (
                                    <tr key={i}>
                                        <td>{log.issue}</td><td>{log.column}</td><td>{log.operation}</td><td>{log.affected}</td>
                                        <td style={{ color: '#10b981', fontWeight: 600 }}>✓ {log.status}</td>
                                    </tr>
                                ))}
                                {data.changes.length === 0 && <tr><td colSpan="5">No changes were applied.</td></tr>}
                            </tbody>
                        </table>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    {data[tab === 'original' ? 'original_data' : 'current_data'][0] && Object.keys(data[tab === 'original' ? 'original_data' : 'current_data'][0]).map(k => <th key={k}>{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data[tab === 'original' ? 'original_data' : 'current_data'].map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((v, j) => <td key={j}>{v?.toString()}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <a className="btn btn-secondary" href={`http://localhost:8000/download/cleaned?session_id=${sessionId}&format=csv`} download>
                    <Download size={16} /> Download Cleaned Dataset
                </a>
                <button className="btn btn-primary" onClick={onNext}>Continue to Pivot & Charts <ArrowRight size={16} /></button>
            </div>
        </div>
    );
}
export function ChartRenderer({ chartType, chartData, xKey }) {
    if (!chartData || chartData.length === 0) return null;
    const keys = Object.keys(chartData[0]).filter(k => k !== xKey);
    let ChartComp = BarChart;
    if (chartType === 'Line Chart') ChartComp = LineChart;
    if (chartType === 'Scatter Chart') ChartComp = ScatterChart;
    if (chartType === 'Column Chart') ChartComp = BarChart;
    if (chartType === 'Pie Chart' || chartType === 'Donut Chart') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <RechartsTooltip />
                    <Legend />
                    <Pie data={chartData} dataKey={keys[0]} nameKey={xKey} cx="50%" cy="50%" fill="#2563eb" innerRadius={chartType === 'Donut Chart' ? 60 : 0}>
                        {chartData.map((e, index) => <Cell key={index} fill={['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ChartComp data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                {keys.map((k, i) => {
                    const color = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'][i % 4];
                    if (chartType === 'Line Chart') return <Line key={k} type="monotone" dataKey={k} stroke={color} />;
                    if (chartType === 'Scatter Chart') return <Scatter key={k} name={k} dataKey={k} fill={color} />;
                    return <Bar key={k} dataKey={k} fill={color} />;
                })}
            </ChartComp>
        </ResponsiveContainer>
    );
}

function PivotStep({ sessionId, profileData, onNext }) {
    const [recs, setRecs] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [selectedCharts, setSelectedCharts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Custom Configuration State
    const [rowField, setRowField] = useState('');
    const [colField, setColField] = useState('');
    const [valField, setValField] = useState('');
    const [agg, setAgg] = useState('SUM');
    const [chartType, setChartType] = useState('Bar Chart');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        api.fetchPivotRecommendations(sessionId).then(setRecs);
    }, [sessionId]);

    const determineChartType = (rField, vField, cField) => {
        if (!rField) return 'Bar Chart';

        if (profileData.profile.datetime_cols.includes(rField) || rField.toLowerCase().includes('date') || rField.toLowerCase().includes('month')) {
            return 'Line Chart';
        }

        if (profileData.profile.categorical_cols.includes(rField)) {
            const uniqueCount = profileData.profile.unique_counts[rField];
            if (uniqueCount && uniqueCount <= 6 && !cField) return 'Pie Chart';
        }

        if (profileData.profile.numeric_cols.includes(rField) && profileData.profile.numeric_cols.includes(vField) && !cField) {
            return 'Scatter Chart';
        }

        return 'Bar Chart';
    };

    const handleApplyPivot = async () => {
        setErrorMsg('');
        if (!rowField || !valField) {
            setErrorMsg("Select at least one Row field and one Value field to generate a Pivot Table.");
            return;
        }

        try {
            const res = await api.createPivot(sessionId, {
                rows: [rowField],
                columns: colField ? [colField] : [],
                values: [valField],
                aggregation: agg
            });
            const converted = res.map(row => {
                const newRow = {};
                for (const key in row) {
                    const num = Number(row[key]);
                    newRow[key] = !isNaN(num) && row[key] !== '' && key !== rowField && key !== colField ? num : row[key];
                }
                return newRow;
            });
            setChartData(converted);
            setChartType(determineChartType(rowField, valField, colField));
        } catch (e) {
            setErrorMsg(e.message || "Failed to generate pivot.");
        }
    };

    const handleSaveCustomChart = () => {
        const newChart = {
            chart_id: 'chart_custom_' + Date.now(),
            title: `${valField} by ${rowField}`,
            chart_type: chartType,
            rows: [rowField],
            columns: colField ? [colField] : [],
            values: [valField],
            aggregation: agg,
            pivot_data: chartData,
            isCustom: true
        };
        setSelectedCharts(prev => [...prev, newChart]);
        alert("Custom Chart Added!");
    };

    const handleAddRec = async (rec) => {
        try {
            const res = await api.createPivot(sessionId, {
                rows: rec.rows,
                columns: rec.columns,
                values: rec.values,
                aggregation: rec.aggregation
            });
            const converted = res.map(row => {
                const newRow = {};
                for (const key in row) {
                    const num = Number(row[key]);
                    newRow[key] = !isNaN(num) && row[key] !== '' && key !== rec.rows[0] ? num : row[key];
                }
                return newRow;
            });
            const cType = determineChartType(rec.rows[0], rec.values[0], rec.columns[0]);

            const newSelected = {
                chart_id: 'chart_rec_' + Math.random().toString(36).substr(2, 9),
                title: rec.title,
                chart_type: cType,
                rows: rec.rows,
                columns: rec.columns,
                values: rec.values,
                aggregation: rec.aggregation,
                pivot_data: converted,
                recId: rec.title // use title as simple unique ID for matching
            };
            setSelectedCharts(prev => [...prev, newSelected]);
        } catch (e) {
            alert("Failed to compute actual chart data for recommendation: " + e.message);
        }
    };

    const handleRemoveRec = (recTitle) => {
        setSelectedCharts(prev => prev.filter(c => c.recId !== recTitle && c.title !== recTitle));
    };

    const handleComplete = async () => {
        if (selectedCharts.length === 0) {
            alert("Please add at least one chart to the report before continuing.");
            return;
        }
        setIsSaving(true);
        try {
            for (let chart of selectedCharts) {
                await api.saveChart(sessionId, Object.assign({}, chart));
            }
            onNext();
        } catch (e) {
            alert("Failed to save selected charts: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!recs || !profileData) return <div>Analyzing for Pivot Recommendations...</div>;

    const allCols = profileData.profile.column_names || [];

    return (
        <div className="slide-up">
            <h2 className="section-title">AI RECOMMENDED CHARTS</h2>
            <p className="subtitle" style={{ marginBottom: '24px' }}>Select the charts you want to include in your final report.</p>

            <div className="pivots-grid">
                {recs.pivots.map((rec, i) => {
                    const isSelected = selectedCharts.some(c => c.recId === rec.title || c.title === rec.title);
                    return (
                        <div className="pivot-card" key={i} style={{ border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0' }}>
                            <h3>{rec.title}</h3>
                            <p className="text-muted" style={{ margin: '12px 0' }}>{rec.why}</p>
                            <div className="pivot-config" style={{ marginBottom: '16px' }}>
                                <div><span className="pivot-label">Chart Type:</span> {determineChartType(rec.rows[0], rec.values[0], rec.columns[0])}</div>
                                <div><span className="pivot-label">X Axis:</span> {rec.rows.join(', ')}</div>
                                {rec.columns.length > 0 && <div><span className="pivot-label">Cols:</span> {rec.columns.join(', ')}</div>}
                                <div><span className="pivot-label">Y Axis:</span> {rec.aggregation}({rec.values.join(', ')})</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {!isSelected ? (
                                    <button className="btn btn-primary" onClick={() => handleAddRec(rec)}>ADD</button>
                                ) : (
                                    <>
                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ ADDED</span>
                                        <button className="btn btn-outline" onClick={() => handleRemoveRec(rec.title)}>REMOVE</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="component-card mt-15" style={{ marginTop: '40px' }}>
                <h2>Dynamic Pivot Configuration (Optional custom charts)</h2>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <div>
                        <label className="pivot-label" style={{ display: 'block', marginBottom: '4px' }}>Row:</label>
                        <select className="btn btn-outline" value={rowField} onChange={e => setRowField(e.target.value)}>
                            <option value="">Select Row...</option>
                            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="pivot-label" style={{ display: 'block', marginBottom: '4px' }}>Column:</label>
                        <select className="btn btn-outline" value={colField} onChange={e => setColField(e.target.value)}>
                            <option value="">(None)</option>
                            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="pivot-label" style={{ display: 'block', marginBottom: '4px' }}>Value:</label>
                        <select className="btn btn-outline" value={valField} onChange={e => setValField(e.target.value)}>
                            <option value="">Select Measure...</option>
                            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="pivot-label" style={{ display: 'block', marginBottom: '4px' }}>Aggregation:</label>
                        <select className="btn btn-outline" value={agg} onChange={e => setAgg(e.target.value)}>
                            <option value="SUM">SUM</option>
                            <option value="COUNT">COUNT</option>
                            <option value="AVERAGE">AVERAGE</option>
                            <option value="MIN">MIN</option>
                            <option value="MAX">MAX</option>
                        </select>
                    </div>
                    <div style={{ marginTop: '22px' }}>
                        <button className="btn btn-primary" onClick={handleApplyPivot}>Update Pivot</button>
                    </div>
                </div>

                {errorMsg && <div style={{ color: 'var(--danger)', background: 'var(--warning-bg)', padding: '12px', borderLeft: '4px solid var(--danger)', marginBottom: '16px' }}>{errorMsg}</div>}

                {chartData && (
                    <div className="slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Generated Data ({chartData.length} records)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart2 size={16} />
                                <select className="btn btn-outline" value={chartType} onChange={e => setChartType(e.target.value)}>
                                    <option value="Bar Chart">Bar Chart</option>
                                    <option value="Column Chart">Column Chart</option>
                                    <option value="Line Chart">Line Chart</option>
                                    <option value="Pie Chart">Pie Chart</option>
                                    <option value="Donut Chart">Donut Chart</option>
                                    <option value="Scatter Chart">Scatter Chart</option>
                                </select>
                                <button className="btn btn-secondary" onClick={handleSaveCustomChart}><Check size={16} /> Add to Report</button>
                            </div>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '300px', marginBottom: '24px' }}>
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        {Object.keys(chartData[0]).map(k => <th key={k}>{k}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((v, j) => <td key={j}>{typeof v === 'number' ? v.toFixed(2) : v}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: '16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <ChartRenderer chartType={chartType} chartData={chartData} xKey={rowField} />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '16px' }} onClick={handleComplete} disabled={isSaving}>
                    {isSaving ? "SAVING..." : "COMPLETE & CONTINUE TO FINAL REPORT →"}
                </button>
            </div>
        </div>
    );
}

function ReportStep({ sessionId, profileData, onBackToCharts }) {
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const [insights, setInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [insightsError, setInsightsError] = useState(null);

    // Dynamic Filters State
    const [activeFilters, setActiveFilters] = useState({});

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.fetchReport(sessionId);
            setReport(res);
        } catch (e) {
            setError(e.message || "Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    const loadInsights = async () => {
        setInsightsLoading(true);
        setInsightsError(null);
        try {
            const res = await api.fetchReportInsights(sessionId);
            setInsights(res.insights);
        } catch (e) {
            setInsightsError(e.message || "Failed to load insights");
        } finally {
            setInsightsLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
        loadInsights();
    }, [sessionId]);

    // --- ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS ---
    // 1. Detect which categorical columns exist in the charts data
    const availableSlicers = React.useMemo(() => {
        if (!report || !report.charts || !profileData?.profile) return {};
        const slicers = {};

        report.charts.forEach(chart => {
            if (chart.pivot_data && chart.pivot_data.length > 0) {
                const keys = Object.keys(chart.pivot_data[0]);
                keys.forEach(key => {
                    const prof = profileData.profile;
                    if (prof.categorical_cols?.includes(key) || prof.text_cols?.includes(key) || prof.datetime_cols?.includes(key)) {
                        if (!slicers[key]) slicers[key] = new Set();
                        chart.pivot_data.forEach(row => {
                            if (row[key] !== undefined && row[key] !== null) {
                                slicers[key].add(String(row[key]));
                            }
                        });
                    }
                });
            }
        });

        const finalSlicers = {};
        Object.keys(slicers).forEach(key => {
            if (slicers[key].size > 1 && slicers[key].size < 50) {
                finalSlicers[key] = Array.from(slicers[key]).sort();
            }
        });
        return finalSlicers;
    }, [report, profileData]);

    // Compute filtered row count across all charts (applied before early returns to satisfy Rules of Hooks)
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const filteredRowCount = React.useMemo(() => {
        if (!report || !report.charts || report.charts.length === 0) return 0;
        if (!hasActiveFilters) return report.dataset_overview.rows;
        let maxRows = 0;
        report.charts.forEach(chart => {
            let data = chart.pivot_data || [];
            if (data.length > 0) {
                const chartKeys = Object.keys(data[0]);
                Object.keys(activeFilters).forEach(filterKey => {
                    if (chartKeys.includes(filterKey)) {
                        data = data.filter(row => String(row[filterKey]) === activeFilters[filterKey]);
                    }
                });
            }
            if (data.length > maxRows) maxRows = data.length;
        });
        return maxRows;
    }, [activeFilters, report, hasActiveFilters]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><h3>Building Dashboard...</h3></div>;
    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>Unable to load data. {error}</p>
            <button className="btn btn-outline" onClick={loadReportData} style={{ margin: '0 auto' }}>Retry</button>
        </div>
    );
    if (!report) return <div>No data found.</div>;

    if (!report.charts || report.charts.length === 0) return (
        <div className="slide-up text-center" style={{ marginTop: '40px' }}>
            <h3>No charts have been added.</h3>
            <p className="text-muted" style={{ margin: '16px auto' }}>Please return and add at least one chart to build a report.</p>
            <button className="btn btn-outline" onClick={onBackToCharts} style={{ margin: '0 auto' }}>Back to Chart Recommendations</button>
        </div>
    );

    const missingValuesTotal = Object.values(report.dataset_overview.missing_counts || {}).reduce((a, b) => a + b, 0);
    const duplicatesRemoved = report.log.find(l => l.issue === "Duplicate Rows" || l.operation.toLowerCase().includes("duplicate"))?.affected || 0;
    const reportDate = new Date().toLocaleString();
    const datasetName = profileData?.filename || "Uploaded Dataset";

    const handleFilterChange = (col, val) => {
        setActiveFilters(prev => {
            if (!val || val === "All") {
                const next = { ...prev };
                delete next[col];
                return next;
            }
            return { ...prev, [col]: val };
        });
    };

    return (
        <div className="slide-up" style={{ paddingBottom: '60px' }}>
            {/* 1. Header */}
            <div style={{ background: '#1e293b', color: 'white', padding: '32px 40px', borderRadius: '12px', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#f8fafc' }}>Analytics Dashboard</h1>
                <div style={{ display: 'flex', gap: '24px', color: '#94a3b8', fontSize: '14px' }}>
                    <span><strong>Source:</strong> {datasetName}</span>
                    <span><strong>Generated:</strong> {reportDate}</span>
                </div>
            </div>

            {/* 2. KPI Cards */}
            <h3 style={{ marginBottom: '16px', color: '#334155' }}>Dataset KPIs</h3>
            <div className="summary-cards" style={{ marginBottom: '32px' }}>
                <div className="summary-card" style={{ borderTopColor: '#3b82f6', background: '#fff' }}>
                    <div className="sc-header">Total Rows{hasActiveFilters ? ' (filtered)' : ''}</div>
                    <div className="sc-value" style={{ color: '#1e293b' }}>{filteredRowCount.toLocaleString()}</div>
                </div>
                <div className="summary-card" style={{ borderTopColor: '#8b5cf6', background: '#fff' }}>
                    <div className="sc-header">Total Columns</div>
                    <div className="sc-value" style={{ color: '#1e293b' }}>{report.dataset_overview.columns}</div>
                </div>
                <div className="summary-card" style={{ borderTopColor: missingValuesTotal > 0 ? '#f59e0b' : '#10b981', background: '#fff' }}>
                    <div className="sc-header">Missing Values Remaining</div>
                    <div className="sc-value" style={{ color: '#1e293b' }}>{missingValuesTotal.toLocaleString()}</div>
                </div>
                <div className="summary-card" style={{ borderTopColor: '#ec4899', background: '#fff' }}>
                    <div className="sc-header">Duplicates Fixed</div>
                    <div className="sc-value" style={{ color: '#1e293b' }}>{duplicatesRemoved.toLocaleString()}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                {/* 3. Data Cleaning Summary */}
                <div className="component-card" style={{ margin: 0, padding: '24px', background: '#fff' }}>
                    <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px', color: '#334155' }}>Data Cleaning Summary</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Total Issues Detected:</span>
                            <span style={{ fontWeight: 600 }}>{report.data_quality_summary.fixed + report.data_quality_summary.declined + report.data_quality_summary.remaining}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Issues Fixed:</span>
                            <span style={{ fontWeight: 600, color: '#10b981' }}>{report.data_quality_summary.fixed}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Issues Declined:</span>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{report.data_quality_summary.declined}</span>
                        </div>
                        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Rows (Original vs Current):</span>
                            <span style={{ fontWeight: 600 }}>{profileData?.profile?.rows?.toLocaleString() || report.dataset_overview.rows.toLocaleString()} → {report.dataset_overview.rows.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Columns (Original vs Current):</span>
                            <span style={{ fontWeight: 600 }}>{profileData?.profile?.columns || report.dataset_overview.columns} → {report.dataset_overview.columns}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Insights (Side by side with cleaning) */}
                <div className="component-card" style={{ margin: 0, padding: '24px', background: '#fff' }}>
                    <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px', color: '#334155' }}>AI Dataset Insights</h3>
                    {insightsLoading ? (
                        <p className="pulse" style={{ fontStyle: 'italic', color: '#64748b' }}>Generating insights asynchronously...</p>
                    ) : insightsError ? (
                        <div style={{ color: '#ef4444' }}>Unable to load insights. <button className="btn btn-outline" style={{ display: 'inline-block', padding: '4px 8px', fontSize: '12px', marginLeft: '8px' }} onClick={loadInsights}>Retry</button></div>
                    ) : (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                            <p style={{ fontSize: '15px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{insights}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Slicers / Filters */}
            {Object.keys(availableSlicers).length > 0 && (
                <div className="component-card" style={{ padding: '24px', background: '#fff', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h3 style={{ color: '#334155', margin: 0 }}>Dashboard Filters</h3>
                        {hasActiveFilters && (
                            <button
                                className="btn btn-outline"
                                style={{ padding: '6px 14px', fontSize: '13px' }}
                                onClick={() => setActiveFilters({})}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {Object.entries(availableSlicers).map(([col, values]) => (
                            <div key={col} style={{ minWidth: '200px', flex: '1 1 200px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>{col}</label>
                                <select
                                    className="filter-select"
                                    value={activeFilters[col] || "All"}
                                    onChange={(e) => handleFilterChange(col, e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="All">All {col}...</option>
                                    {values.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Charts Dashboard */}
            <h3 style={{ marginBottom: '16px', color: '#334155' }}>Visualizations</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {report.charts.map((chart, idx) => {
                    let filteredData = chart.pivot_data || [];

                    // Apply active filters ONLY if the chart contains the filter property
                    if (filteredData.length > 0) {
                        const chartKeys = Object.keys(filteredData[0]);
                        Object.keys(activeFilters).forEach(filterKey => {
                            if (chartKeys.includes(filterKey)) {
                                filteredData = filteredData.filter(row => String(row[filterKey]) === activeFilters[filterKey]);
                            }
                        });
                    }

                    return (
                        <div key={idx} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ marginBottom: '20px', fontSize: '16px', color: '#1e293b' }}>{chart.title}</h4>
                            <div style={{ height: '300px' }}>
                                {filteredData.length > 0 ? (
                                    <ChartRenderer chartType={chart.chart_type} chartData={filteredData} xKey={chart.rows[0]} />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                        No data matches the current filters.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Report Footer / Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #cbd5e1' }}>
                <a className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '16px', fontWeight: 'bold' }} href={`http://localhost:8000/download/report?session_id=${sessionId}`} download>
                    <Download size={20} style={{ marginRight: '8px' }} /> DOWNLOAD EXCEL REPORT
                </a>
            </div>
        </div>
    );
}

export default App;
