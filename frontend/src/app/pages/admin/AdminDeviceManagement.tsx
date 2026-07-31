'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface UserSession {
    _id: string;
    user_id: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    ip_address: string;
    device_type: string;
    os: string;
    browser: string;
    device_name: string;
    location?: string;
    is_active: boolean;
    last_active: string;
    created_at: string;
    expires_at: string;
}

const DeviceIcon = ({ type }: { type: string }) => {
    const t = (type || '').toLowerCase();
    if (t.includes('mobile') || t.includes('phone')) return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
    );
    if (t.includes('tablet')) return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
    );
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
    );
};

const OsBadge = ({ os }: { os: string }) => {
    const o = (os || '').toLowerCase();
    let color = '#6b7280';
    if (o.includes('windows')) color = '#0078d4';
    else if (o.includes('mac') || o.includes('ios')) color = '#555555';
    else if (o.includes('android')) color = '#3ddc84';
    else if (o.includes('linux')) color = '#f7a41d';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            background: color + '22', color
        }}>
            {os || 'Unknown OS'}
        </span>
    );
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
};

const AdminDeviceManagement = () => {
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
    const [filterDevice, setFilterDevice] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkRevoking, setBulkRevoking] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, mobile: 0, desktop: 0 });

    const PER_PAGE = 20;

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: PER_PAGE };
            if (search) params.search = search;
            if (filterStatus !== 'all') params.status = filterStatus;
            if (filterDevice !== 'all') params.device_type = filterDevice;
            const res = await api.get('/admin/sessions', { params });
            const data = res.data;
            setSessions(data.sessions || []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.total || 0);
            setStats(data.stats || { total: 0, active: 0, mobile: 0, desktop: 0 });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to load sessions', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, search, filterStatus, filterDevice, showToast]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const handleRevoke = async (sessionId: string) => {
        if (!window.confirm('Revoke this session? The user will be logged out immediately.')) return;
        setRevoking(sessionId);
        try {
            await api.delete('/admin/sessions/' + sessionId);
            showToast('Session revoked successfully', 'success');
            fetchSessions();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to revoke session', 'error');
        } finally {
            setRevoking(null);
        }
    };

    const handleBulkRevoke = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm('Revoke ' + selectedIds.length + ' selected session(s)?')) return;
        setBulkRevoking(true);
        try {
            await api.post('/admin/sessions/bulk-revoke', { session_ids: selectedIds });
            showToast(selectedIds.length + ' session(s) revoked', 'success');
            setSelectedIds([]);
            fetchSessions();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Bulk revoke failed', 'error');
        } finally {
            setBulkRevoking(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const statCards = [
        { label: 'Total Sessions', value: stats.total, color: '#6366f1', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
        { label: 'Active Now', value: stats.active, color: '#10b981', d: 'M22 12h-4l-3 9L9 3l-3 9H2' },
        { label: 'Mobile Devices', value: stats.mobile, color: '#f59e0b', d: 'M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z' },
        { label: 'Desktop / Other', value: stats.desktop, color: '#3b82f6', d: 'M20 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM12 17v4M8 21h8' },
    ];

    return (
        <div className={styles['admin-page']}>
            <div className={styles['admin-page-header']}>
                <div>
                    <h1 className={styles['admin-page-title']}>Device Management</h1>
                    <p className={styles['admin-page-subtitle']}>Monitor and manage all active user sessions across devices</p>
                </div>
                <button 
                    onClick={fetchSessions} 
                    disabled={loading}
                    className="admin-btn admin-btn-secondary"
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 600, 
                        fontSize: '13px', 
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
                        transition: 'all 0.2s ease', 
                        cursor: loading ? 'not-allowed' : 'pointer' 
                    }}
                >
                    <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
                    >
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {statCards.map(({ label, value, color, d }) => (
                    <div key={label} className={styles['admin-card']} style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={d}/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{loading ? '-' : value}</div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles['admin-card']} style={{ padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input className={styles['admin-form-input']} style={{ paddingLeft: '36px' }}
                            placeholder="Search by user, IP, browser, OS..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <select className={styles['admin-form-input']} style={{ width: 'auto' }} value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                    </select>
                    <select className={styles['admin-form-input']} style={{ width: 'auto' }} value={filterDevice}
                        onChange={e => { setFilterDevice(e.target.value); setPage(1); }}>
                        <option value="all">All Devices</option>
                        <option value="mobile">Mobile</option>
                        <option value="tablet">Tablet</option>
                        <option value="desktop">Desktop</option>
                    </select>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkRevoke} disabled={bulkRevoking}
                            style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Revoke {selectedIds.length} Selected
                        </button>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginLeft: 'auto' }}>
                        {totalCount} session{totalCount !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className={styles['admin-card']}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: 'var(--admin-text-muted)' }}>
                        <div style={{ width: '24px', height: '24px', border: '3px solid var(--admin-border)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        Loading sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--admin-text-muted)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>No sessions found</div>
                        <div style={{ fontSize: '13px' }}>Try adjusting your filters</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles['admin-table']}>
                            <thead>
                                <tr>
                                    <th style={{ width: '36px' }}>
                                        <input type="checkbox"
                                            checked={selectedIds.length === sessions.length && sessions.length > 0}
                                            onChange={() => setSelectedIds(prev => prev.length === sessions.length ? [] : sessions.map(s => s._id))} />
                                    </th>
                                    <th>User</th>
                                    <th>Device</th>
                                    <th>Browser / OS</th>
                                    <th>IP Address</th>
                                    <th>Last Active</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(session => {
                                    const isExpired = !session.is_active || new Date(session.expires_at) < new Date();
                                    return (
                                        <tr key={session._id} style={{ opacity: isExpired ? 0.6 : 1 }}>
                                            <td>
                                                <input type="checkbox" checked={selectedIds.includes(session._id)}
                                                    onChange={() => toggleSelect(session._id)} disabled={isExpired} />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                                                        {(session.user_id?.name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{session.user_id?.name || 'Unknown'}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{session.user_id?.email || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <DeviceIcon type={session.device_type} />
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{session.device_name || session.device_type || 'Unknown'}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{session.device_type}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{session.browser || 'Unknown'}</div>
                                                <OsBadge os={session.os} />
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--admin-text-secondary)' }}>
                                                    {session.ip_address || '-'}
                                                </span>
                                                {session.location && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{session.location}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{timeAgo(session.last_active || session.created_at)}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{new Date(session.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: isExpired ? '#f3f4f6' : '#d1fae5', color: isExpired ? '#6b7280' : '#065f46' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isExpired ? '#9ca3af' : '#10b981', display: 'inline-block' }} />
                                                    {isExpired ? 'Expired' : 'Active'}
                                                </span>
                                            </td>
                                            <td>
                                                {!isExpired && (
                                                    <button onClick={() => handleRevoke(session._id)} disabled={revoking === session._id}
                                                        style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                        {revoking === session._id ? 'Revoking...' : 'Revoke'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--admin-border)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Page {page} of {totalPages}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className={styles['admin-btn-secondary']} style={{ padding: '6px 14px', fontSize: '12px' }}>Previous</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className={styles['admin-btn-primary']} style={{ padding: '6px 14px', fontSize: '12px' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDeviceManagement;
