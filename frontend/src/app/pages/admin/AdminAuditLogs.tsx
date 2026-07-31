import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

interface AuditLog {
    _id: string;
    createdAt: string;
    userId?: { email?: string };
    action: string;
    module: string;
    status: 'success' | 'failure' | string;
    ipAddress?: string;
}

const AdminAuditLogs = () => {
    const { t } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data } = await api.get('/admin/audit-logs');
                setLogs(data);
            } catch (err) {
                console.error('Failed to fetch audit logs', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    if (loading) return (
        <div className="admin-page">
            <div className="admin-loading-text">{t('loading_logs') || 'Analyzing infrastructure logs...'}</div>
        </div>
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('audit_logs') || 'System Security & Audit Logs'}</h1>
                    <p className="admin-page-subtitle">{t('audit_logs_desc') || 'Track every critical action performed on the platform.'}</p>
                </div>
            </div>

            <div className="admin-card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '180px' }}>{t('timestamp') || 'Timestamp'}</th>
                                <th>{t('user') || 'User'}</th>
                                <th style={{ width: '160px' }}>{t('action') || 'Action'}</th>
                                <th style={{ width: '130px' }}>{t('module') || 'Module'}</th>
                                <th style={{ width: '110px' }}>{t('status') || 'Status'}</th>
                                <th style={{ width: '130px' }}>{t('ip_address') || 'IP Address'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id}>
                                    <td>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '13px' }}>
                                            {log.userId?.email || t('anonymous_system') || 'Anonymous/System'}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '12px' }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="admin-badge admin-badge-neutral">
                                            {log.module}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${log.status === 'success' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                            {t(log.status) || log.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                                            {log.ipAddress}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {logs.length === 0 && (
                    <div className="admin-card-body">
                        <div className="admin-empty-state">
                            <div className="admin-empty-state-icon">📋</div>
                            <h3>{t('no_audit_logs') || 'No audit logs yet'}</h3>
                            <p>{t('system_activity_tracked') || 'System activity will be tracked and displayed here.'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAuditLogs;
