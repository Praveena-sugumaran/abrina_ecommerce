import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

interface RiskAlert {
    _id: string;
    userId?: { _id: string; email: string };
    activity: string;
    ip: string;
    riskLevel: string;
    status: string;
    createdAt: string;
}

const AdminFraud: React.FC = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<RiskAlert[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAlerts(); }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const { data: alerts } = await api.get('/admin/risk-alerts');
            setData(alerts || []);
        } catch (err) {
            console.error('Failed to fetch risk alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            setData(data.map(d => d._id === id ? { ...d, status } : d));
            showToast(`Status updated to "${status}"`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const filtered = data.filter(d =>
        (d.userId?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.activity || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.status || '').toLowerCase().includes(search.toLowerCase())
    );

    const riskBadge = (level: string) => {
        if (level === 'High') return 'admin-badge-danger';
        if (level === 'Medium') return 'admin-badge-warning';
        return 'admin-badge-success';
    };

    const statusBadge = (status: string) => {
        if (status === 'Flagged') return 'admin-badge-danger';
        if (status === 'Under Review') return 'admin-badge-info';
        if (status === 'Blocked') return 'admin-badge-neutral';
        return 'admin-badge-success';
    };

    if (loading) return (
        <div className="admin-page">
            <div className="admin-loading-text">Scanning for threats...</div>
        </div>
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Fraud Detection</h1>
                    <p className="admin-page-subtitle">Monitor suspicious activity and protect the platform</p>
                </div>
            </div>

            <div className="admin-stats-grid">
                {[
                    { label: 'Total Alerts', value: data.length },
                    { label: 'High Risk', value: data.filter(d => d.riskLevel === 'High').length },
                    { label: 'Under Review', value: data.filter(d => d.status === 'Under Review').length },
                    { label: 'Blocked', value: data.filter(d => d.status === 'Blocked').length },
                ].map((card, i) => (
                    <div key={i} className="admin-stat-premium">
                        <div className="admin-stat-card-label">{card.label}</div>
                        <div className="admin-stat-card-value">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="admin-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
                    <input
                        type="text"
                        style={{
                            width: '100%', maxWidth: '360px',
                            padding: '9px 14px', borderRadius: '10px',
                            border: '1.5px solid var(--admin-border)',
                            background: 'var(--admin-card-bg)',
                            color: 'var(--admin-text-main)',
                            fontSize: '13px', fontWeight: 600,
                            outline: 'none'
                        }}
                        placeholder="Search by email, activity or status..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                {['Identified User', 'Risk Activity', 'Origin IP', 'Threat Level', 'Detected At', 'Status', 'Resolution'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item._id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--admin-text-main)' }}>
                                            {item.userId?.email || 'Guest Session'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                            UID: {item.userId?._id || 'N/A'}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '220px', color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                                        {item.activity}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                        {item.ip}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${riskBadge(item.riskLevel)}`}>
                                            {item.riskLevel}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${statusBadge(item.status || 'Flagged')}`}>
                                            {item.status || 'Flagged'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleStatusChange(item._id, 'Blocked')}
                                                className="admin-action-btn-delete"
                                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                            >
                                                Block
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(item._id, 'Cleared')}
                                                className="admin-action-btn-edit"
                                                style={{ padding: '6px 12px', fontSize: '11px', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                                        No active security alerts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminFraud;
