import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

const STATUS_DETAILS: Record<string, { badge: string; label: string }> = {
    open: { badge: 'admin-badge-warning', label: 'Open' },
    under_review: { badge: 'admin-badge-info', label: 'Under Review' },
    resolved_buyer_favored: { badge: 'admin-badge-success', label: 'Resolved (Buyer)' },
    resolved_supplier_favored: { badge: 'admin-badge-success', label: 'Resolved (Supplier)' },
    closed: { badge: 'admin-badge-neutral', label: 'Closed' },
};

interface Dispute {
    _id: string;
    reason: string;
    description: string;
    status: string;
    createdAt: string;
    buyer_id?: { first_name: string; last_name: string };
    supplier_id?: { company_name?: string; first_name: string; last_name: string };
    order_id?: { _id: string };
    messages?: Array<{ sender_role: string; message: string; timestamp: string }>;
}

const AdminDisputes = () => {
    const { showToast } = useToast();
    const { t } = useAuth();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Dispute | null>(null); 
    const [resolveModal, setResolveModal] = useState(false);
    const [resolution, setResolution] = useState('resolved_buyer_favored');
    const [adminNote, setAdminNote] = useState('');
    const [issueRefund, setIssueRefund] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [adminMsg, setAdminMsg] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(data.pagination_limit);
            } catch (err) { }
        };
        fetchSettings();
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/disputes/admin/all');
            setDisputes(data);
            setLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch disputes');
            setLoading(false);
        }
    };

    const handleResolve = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setResolving(true);
        try {
            await api.put(`/disputes/${selected._id}/resolve`, { resolution, adminNote, issueRefund });
            setResolveModal(false);
            setAdminNote('');
            setIssueRefund(false);
            const { data } = await api.get('/disputes/admin/all');
            setDisputes(data);
            if (selected) {
                const updated = data.find((d: Dispute) => d._id === selected._id);
                setSelected(updated);
            }
            showToast('Dispute resolved successfully', 'success');
        } catch (err) {
            showToast('Failed to resolve dispute', 'error');
        } finally {
            setResolving(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !adminMsg.trim()) return;
        setSendingMsg(true);
        try {
            await api.post(`/disputes/${selected._id}/message`, { message: adminMsg });
            setAdminMsg('');
            const { data } = await api.get('/disputes/admin/all');
            setDisputes(data);
            const updated = data.find((d: Dispute) => d._id === selected._id);
            if (updated) setSelected(updated);
            showToast('Message sent', 'success');
        } catch (err) {
            showToast('Failed to send message', 'error');
        } finally {
            setSendingMsg(false);
        }
    };

    const filtered = filterStatus === 'all' ? disputes : disputes.filter(d => d.status === filterStatus);

    const stats = {
        total: disputes.length,
        open: disputes.filter(d => d.status === 'open').length,
        under_review: disputes.filter(d => d.status === 'under_review').length,
        resolved: disputes.filter(d => ['resolved_buyer_favored', 'resolved_supplier_favored', 'closed'].includes(d.status)).length,
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDisputes = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const handleExportCSV = () => {
        if (!filtered.length) return;
        const headers = ["Dispute ID", "Reason", "Buyer", "Supplier", "Status", "Created Date"];
        const rows = filtered.map(d => [
            `"${d._id}"`,
            `"${d.reason.replace(/"/g, '""')}"`,
            `"${d.buyer_id?.first_name || ''} ${d.buyer_id?.last_name || ''}"`,
            `"${d.supplier_id?.company_name || `${d.supplier_id?.first_name || ''} ${d.supplier_id?.last_name || ''}`}"`,
            `"${d.status}"`,
            `"${new Date(d.createdAt).toLocaleDateString()}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `disputes_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            <style dangerouslySetInnerHTML={{ __html: `
                .dispute-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    animation: disputeFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .dispute-panel {
                    background: #ffffff;
                    border-radius: 24px;
                    box-shadow: 0 25px 80px rgba(13, 46, 103, 0.16);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    width: 95%;
                    max-width: 860px;
                    max-height: 88vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: disputeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .dark .dispute-panel {
                    background: #0d1630;
                    border-color: rgba(30, 41, 59, 0.8);
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                }
                .dispute-header {
                    padding: 24px 32px;
                    background: linear-gradient(135deg, var(--primary-color, #0d2e67) 0%, #061633 100%);
                    color: #ffffff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .dispute-header-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin: 0;
                    letter-spacing: -0.02em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .dispute-header-subtitle {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 4px;
                    font-weight: 500;
                }
                .dispute-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #ffffff;
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.15rem;
                    transition: all 0.2s;
                }
                .dispute-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: rotate(90deg);
                }
            ` }} />

            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{t('dispute_management') || 'Dispute Management'}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Disputes</span>
                    </div>
                </div>
                <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                </button>
            </div>

            {error && <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>{error}</div>}

            {/* Stats Cards Section */}
            <div className={styles['usr-stats-grid']}>
                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-header']}>
                        <span className={styles['usr-stat-label']}>Total Disputes</span>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#eff6ff', color: '#2563eb' }}>
                            ⚖️
                        </div>
                    </div>
                    <div className={styles['usr-stat-val']}>{stats.total}</div>
                </div>
                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-header']}>
                        <span className={styles['usr-stat-label']}>Open</span>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#fff7ed', color: '#ea580c' }}>
                            ⚠️
                        </div>
                    </div>
                    <div className={styles['usr-stat-val']}>{stats.open}</div>
                </div>
                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-header']}>
                        <span className={styles['usr-stat-label']}>Under Review</span>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            🔍
                        </div>
                    </div>
                    <div className={styles['usr-stat-val']}>{stats.under_review}</div>
                </div>
                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-header']}>
                        <span className={styles['usr-stat-label']}>Resolved</span>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            ✅
                        </div>
                    </div>
                    <div className={styles['usr-stat-val']}>{stats.resolved}</div>
                </div>
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['all', 'open', 'under_review', 'resolved_buyer_favored', 'resolved_supplier_favored', 'closed'].map(s => (
                            <button
                                key={s}
                                onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                                className={`${styles['usr-page-num']} ${filterStatus === s ? styles['usr-active'] : ''}`}
                                style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.78rem', height: 'auto' }}
                            >
                                {s === 'all' ? 'All Disputes' : (STATUS_DETAILS[s]?.label || s)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Dispute ID</th>
                                <th>Reason</th>
                                <th>Buyer</th>
                                <th>Supplier</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{t('loading_disputes') || 'Loading disputes...'}</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentDisputes.length === 0 ? (
                                <tr className={""}>
                                    <td colSpan={7}>No disputes found</td>
                                </tr>
                            ) : (
                                currentDisputes.map(d => (
                                    <tr key={d._id} className={selected?._id === d._id ? 'admin-table-row-selected' : ''}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800 }}>
                                            #{d._id.slice(-8).toUpperCase()}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '13px' }}>
                                                {d.reason}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.description}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--admin-text-main)', fontSize: '12px' }}>
                                                {d.buyer_id?.first_name} {d.buyer_id?.last_name}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--admin-text-secondary)', fontSize: '12px' }}>
                                                {d.supplier_id?.company_name || `${d.supplier_id?.first_name} ${d.supplier_id?.last_name}`}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${STATUS_DETAILS[d.status]?.badge || 'admin-badge-neutral'}`}>
                                                {STATUS_DETAILS[d.status]?.label || d.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700 }}>
                                            {new Date(d.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => setSelected(d)}
                                                className={"admin-action-btn-edit"}
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--admin-border)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} disputes
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={"admin-btn" + " " + "admin-btn-secondary"} style={{ padding: '6px 12px' }}>Prev</button>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={"admin-btn" + " " + "admin-btn-secondary"} style={{ padding: '6px 12px' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dispute Detail Sidebar Overlay (similar to a fly-out or modal) */}
            {selected && (
                <div className="dispute-overlay" onClick={() => setSelected(null)}>
                    <div className="dispute-panel" onClick={e => e.stopPropagation()}>
                        <div className="dispute-header">
                            <div>
                                <h3 className="dispute-header-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    Dispute #{selected._id.slice(-8).toUpperCase()}
                                </h3>
                                <div className="dispute-header-subtitle">Resolution Control Center</div>
                            </div>
                            <button className="dispute-close-btn" onClick={() => setSelected(null)}>&times;</button>
                        </div>
                        
                        <div className="dispute-body">
                            {/* Case Information */}
                            <div className="dispute-card">
                                <h4 className="dispute-card-title">Case Information</h4>
                                <div className="dispute-row">
                                    <span className="dispute-label">Reason</span>
                                    <span className="dispute-value">{selected.reason}</span>
                                </div>
                                <div className="dispute-row">
                                    <span className="dispute-label">Dispute Type</span>
                                    <span className="dispute-value" style={{ textTransform: 'capitalize', fontWeight: 'bold', color: selected.type === 'exchange' ? '#ff6600' : 'inherit' }}>{selected.type || 'Refund'}</span>
                                </div>
                                <div className="dispute-row">
                                    <span className="dispute-label">Opened On</span>
                                    <span className="dispute-value">{new Date(selected.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="dispute-row">
                                    <span className="dispute-label">Status</span>
                                    <span className={`admin-badge ${STATUS_DETAILS[selected.status]?.badge || 'admin-badge-neutral'}`}>
                                        {STATUS_DETAILS[selected.status]?.label || selected.status}
                                    </span>
                                </div>
                                <div className="dispute-desc-box">
                                    <strong style={{ display: 'inline-block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.02em' }}>Description:</strong><br/>
                                    {selected.description}
                                </div>
                            </div>

                            {/* Parties & Order */}
                            <div className="dispute-card">
                                <h4 className="dispute-card-title">Parties & Order</h4>
                                <div className="dispute-row" style={{ alignItems: 'center' }}>
                                    <span className="dispute-label">Buyer</span>
                                    <span className="dispute-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(13, 46, 103, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                                            {selected.buyer_id?.first_name?.charAt(0)}{selected.buyer_id?.last_name?.charAt(0)}
                                        </span>
                                        {selected.buyer_id?.first_name} {selected.buyer_id?.last_name}
                                    </span>
                                </div>
                                <div className="dispute-row" style={{ alignItems: 'center' }}>
                                    <span className="dispute-label">Supplier</span>
                                    <span className="dispute-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                                            {selected.supplier_id?.company_name?.charAt(0) || selected.supplier_id?.first_name?.charAt(0)}
                                        </span>
                                        {selected.supplier_id?.company_name || `${selected.supplier_id?.first_name} ${selected.supplier_id?.last_name}`}
                                    </span>
                                </div>
                                <div className="dispute-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span className="dispute-label">Order Attachment</span>
                                    <span className="dispute-value">
                                        <a href={`/admin/orders/${selected.order_id?._id}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 800 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                            Order #{String(selected.order_id?._id).slice(-8)}
                                        </a>
                                    </span>
                                </div>
                            </div>

                            {/* Message Thread */}
                            <div className="dispute-card dispute-timeline-section">
                                <h4 className="dispute-card-title">Communication History</h4>
                                <div className="dispute-chat-box">
                                    {selected.messages?.length === 0 ? (
                                        <div style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>No messages exchanged yet.</div>
                                    ) : (
                                        selected.messages?.map((msg, i) => {
                                            const isAdmin = msg.sender_role === 'admin';
                                            return (
                                                <div key={i} className={`dispute-bubble ${isAdmin ? 'dispute-bubble-admin' : 'dispute-bubble-other'}`}>
                                                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', color: isAdmin ? '#1d4ed8' : '#64748b', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                        <span>{msg.sender_role}</span>
                                                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div style={{ fontSize: '13.5px', color: 'inherit', lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</div>
                                                </div>
                                            );
                                        })
                                    ) || []}
                                </div>
                                
                                {!['resolved_buyer_favored', 'resolved_supplier_favored', 'closed'].includes(selected.status) && (
                                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                        <input
                                            className={styles['admin-form-input']}
                                            style={{ borderRadius: '12px', border: '1.5px solid rgba(0,0,0,0.08)', padding: '12px 16px', fontSize: '13px' }}
                                            value={adminMsg}
                                            onChange={e => setAdminMsg(e.target.value)}
                                            placeholder="Write an internal note or reply to parties..."
                                        />
                                        <button className={"admin-btn" + " " + "admin-btn-primary"} style={{ borderRadius: '12px', padding: '0 24px', fontWeight: 800 }} disabled={sendingMsg}>
                                            {sendingMsg ? '...' : 'Send'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="dispute-footer">
                            <button className={"admin-btn" + " " + "admin-btn-secondary"} style={{ borderRadius: '12px', fontWeight: 800 }} onClick={() => setSelected(null)}>Close Details</button>
                            {!['resolved_buyer_favored', 'resolved_supplier_favored', 'closed'].includes(selected.status) && (
                                <button className={"admin-btn" + " " + "admin-btn-primary"} style={{ borderRadius: '12px', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary-color) 0%, #1a4a99 100%)' }} onClick={() => setResolveModal(true)}>Resolve Case</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {resolveModal && selected && (
                <div className="dispute-overlay" style={{ zIndex: 10005 }}>
                    <div className="dispute-panel" style={{ maxWidth: '500px', borderRadius: '24px' }}>
                        <div className="dispute-header" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                            <h3 className="dispute-header-title">Verify Resolution</h3>
                            <button className="dispute-close-btn" onClick={() => setResolveModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleResolve}>
                            <div className="dispute-body" style={{ gridTemplateColumns: '1fr', padding: '24px' }}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontWeight: 800 }}>Resolution Decision</label>
                                    <select
                                        className={styles['admin-form-select']}
                                        style={{ borderRadius: '12px', padding: '10px 14px', border: '1.5px solid rgba(0,0,0,0.08)' }}
                                        value={resolution}
                                        onChange={e => setResolution(e.target.value)}
                                    >
                                        <option value="resolved_buyer_favored">Favor Buyer (Refund Recommended)</option>
                                        <option value="resolved_supplier_favored">Favor Supplier (Release Payment)</option>
                                        <option value="closed">Close with No Action</option>
                                        <option value="under_review">Further Review Required</option>
                                    </select>
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontWeight: 800 }}>Resolution Note</label>
                                    <textarea
                                        className={styles['admin-form-textarea']}
                                        style={{ borderRadius: '12px', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.08)' }}
                                        rows={3}
                                        value={adminNote}
                                        onChange={e => setAdminNote(e.target.value)}
                                        placeholder="Explain the logic behind this decision..."
                                    />
                                </div>
                                {resolution === 'resolved_buyer_favored' && selected.type !== 'exchange' && (
                                    <div style={{ padding: '16px', background: '#fff1f2', borderRadius: '14px', border: '1.5px solid #fda4af', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input type="checkbox" id="refund-chk" checked={issueRefund} onChange={e => setIssueRefund(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <label htmlFor="refund-chk" style={{ fontSize: '13px', fontWeight: 800, color: '#9f1239', cursor: 'pointer', selectText: 'none' }}>Automatically Issue Stripe Refund</label>
                                    </div>
                                )}
                                {resolution === 'resolved_buyer_favored' && selected.type === 'exchange' && (
                                    <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '14px', border: '1.5px solid #6ee7b7', display: 'flex', alignItems: 'center', gap: '12px', color: '#065f46' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800 }}>
                                            ⚠️ This is an exchange dispute. Approving in favor of the buyer will instruct the supplier to dispatch replacement items.
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="dispute-footer" style={{ background: '#f8fafc' }}>
                                <button type="button" className={"admin-btn" + " " + "admin-btn-secondary"} style={{ borderRadius: '12px', fontWeight: 800 }} onClick={() => setResolveModal(false)}>Cancel</button>
                                <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"} style={{ borderRadius: '12px', fontWeight: 800, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} disabled={resolving}>
                                    {resolving ? 'Applying...' : 'Apply Resolution'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDisputes;
