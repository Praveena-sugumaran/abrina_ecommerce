import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface ModerationItem {
    id: string;
    content: string;
    type: string;
    reportedBy: string;
    status: string;
    date: string;
    originalData: any;
}

const AdminModeration: React.FC = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<ModerationItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchModerationData(); }, []);

    const fetchModerationData = async () => {
        try {
            setLoading(true);
            const [productsRes, companiesRes] = await Promise.all([
                api.get('/admin/products'),
                api.get('/admin/companies'),
            ]);

            const products = (productsRes.data || []).map((p: any) => ({
                id: p._id,
                content: p.name,
                type: 'Product Listing',
                reportedBy: p.supplier?.company_name || 'System Auto-Flag',
                status: p.approval_status === 'pending' ? 'Pending' : p.approval_status === 'rejected' ? 'Removed' : 'Approved',
                date: p.createdAt,
                originalData: p,
            }));

            const companies = (companiesRes.data || [])
                .filter((c: any) => c.verification_status !== 'verified')
                .map((c: any) => ({
                    id: c._id,
                    content: c.company_name,
                    type: 'Company Verification',
                    reportedBy: 'Onboarding System',
                    status: c.verification_status === 'pending' ? 'Pending' : 'Under Review',
                    date: c.createdAt,
                    originalData: c,
                }));

            setData([...products, ...companies].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ));
        } catch (err) {
            console.error('Moderation fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (item: ModerationItem, action: 'approve' | 'reject') => {
        try {
            if (item.type === 'Product Listing') {
                await api.patch(`/admin/products/${item.id}/status`, { status: action === 'approve' ? 'approved' : 'rejected' });
            } else {
                await api.put(`/admin/companies/${item.id}/verify`, { status: action === 'approve' ? 'verified' : 'rejected' });
            }
            showToast(`${item.type} ${action}d successfully`, 'success');
            fetchModerationData();
        } catch (err) {
            showToast('Moderation action failed', 'error');
        }
    };

    const filtered = data.filter(d =>
        d.content.toLowerCase().includes(search.toLowerCase()) ||
        d.type.toLowerCase().includes(search.toLowerCase()) ||
        d.status.toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (status: string) => {
        if (status === 'Removed') return "admin-badge-danger";
        if (status === 'Approved') return "admin-badge-success";
        if (status === 'Under Review') return "admin-badge-info";
        return "admin-badge-warning";
    };

    if (loading) return <div className={"admin-loading-text"}>Synchronizing moderation queue...</div>;

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"}>
                <div>
                    <h1 className={"admin-page-title"}>Content Moderation</h1>
                    <p className={"admin-page-subtitle"}>Review and moderate reported listings, descriptions, and companies</p>
                </div>
            </div>

            <div className={"admin-stats-grid"}>
                {[
                    { label: 'Pending Review', value: data.filter(d => d.status === 'Pending').length },
                    { label: 'Under Review', value: data.filter(d => d.status === 'Under Review').length },
                    { label: 'Removed / Rejected', value: data.filter(d => d.status === 'Removed').length },
                ].map((c, i) => (
                    <div key={i} className={"admin-stat-premium"}>
                        <div className={"admin-stat-card-label"}>{c.label}</div>
                        <div className={"admin-stat-card-value"}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div className={"admin-card"}>
                <div style={{ padding: '16px 20px' }}>
                    <div className={styles['admin-search-wrap']} style={{ maxWidth: '400px' }}>
                        <svg className={styles['admin-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="search"
                            className={styles['admin-search-input-premium']}
                            placeholder="Search by content, type, or status..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={"admin-table"}>
                        <thead>
                            <tr>
                                {['Target Content', 'Entity Type', 'Reporter', 'Queued Date', 'Status', 'Actions'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item.id}>
                                    <td style={{ maxWidth: '240px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>ID: {item.id}</div>
                                    </td>
                                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{item.type}</td>
                                    <td style={{ fontSize: '12px' }}>{item.reportedBy}</td>
                                    <td style={{ fontSize: '12px' }}>{new Date(item.date).toLocaleDateString()}</td>
                                    <td><span className={`${"admin-badge"} ${statusBadge(item.status)}`}>{item.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleAction(item, 'approve')} className={"admin-action-btn-edit"}>Approve</button>
                                            <button onClick={() => handleAction(item, 'reject')} className={"admin-action-btn-delete"}>Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr className={""}><td colSpan={6}>No pending moderation tasks found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminModeration;
