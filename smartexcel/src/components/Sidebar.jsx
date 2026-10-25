import React from 'react';
import { Home, Database, AlertCircle, FileText, Layout, PieChart, Cpu, HelpCircle, DownloadCloud } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { name: 'Dashboard', icon: <Home size={20} /> },
        { name: 'Data Overview', icon: <Database size={20} /> },
        { name: 'Data Quality', icon: <AlertCircle size={20} /> },
        { name: 'Cleaning Recommendations', icon: <FileText size={20} /> },
        { name: 'Pivot Recommendations', icon: <Layout size={20} /> },
        { name: 'Chart Recommendations', icon: <PieChart size={20} /> },
        { name: 'AI Insights', icon: <Cpu size={20} /> },
        { name: 'Ask Your Excel', icon: <HelpCircle size={20} /> },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">SE</div>
                <h2>SmartExcel</h2>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {menuItems.map((item) => (
                        <li
                            key={item.name}
                            className={activeTab === item.name ? 'active' : ''}
                            onClick={() => setActiveTab(item.name)}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="sidebar-footer">
                <button className="btn btn-outline full-width">
                    <DownloadCloud size={18} style={{ marginRight: '8px' }} />
                    Download Report
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
