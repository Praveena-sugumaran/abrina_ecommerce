import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

const AdminCreditApproval = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [editLimit, setEditLimit] = useState('');
    const [editNetDays, setEditNetDays] = useState('30');
    const [editInterest, setEditInterest] = useState('1.5');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/credit/admin/requests');
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching credit requests:', err);
            showToast('Failed to load credit requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!requests.length) return;
        const headers = ["Company", "Buyer", "Email", "Credit Limit ($)", "Available Credit ($)", "Repayment Days", "Status"];
        const rows = requests.map(req => [
            `"${(req.buyer_id?.company_name || 'N/A').replace(/"/g, '""')}"`,
            `"${req.buyer_id?.first_name || ''} ${req.buyer_id?.last_name || ''}"`,
            `"${req.buyer_id?.email || 'N/A'}"`,
            `"${req.credit_limit || 0}"`,
            `"${req.available_credit || 0}"`,
            `"Net-${req.net_days || 30}"`,
            `"${req.status || ''}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `trade_credit_approvals_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const showToast = (msg: string, type = 'success') => {
        setToast({ show: true, message: msg, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    const handleSelectRequest = (req: any) => {
        setSelectedRequest(req);
        setEditLimit(req.requested_limit > 0 ? req.requested_limit.toString() : req.credit_limit.toString());
        setEditNetDays(req.net_days.toString());
        setEditInterest(req.interest_rate_overdue.toString());
    };

    const handleUpdateLimit = async (status: string) => {
        if (!selectedRequest) return;
        const limit = parseFloat(editLimit);
        const days = parseInt(editNetDays);
        const interest = parseFloat(editInterest);

        if (isNaN(limit) || limit < 0 || isNaN(days) || days <= 0 || isNaN(interest) || interest < 0) {
            return showToast('Please enter valid numerical configurations', 'error');
        }

        setSubmitting(true);
        try {
            await api.put(`/credit/admin/approve/${selectedRequest._id}`, {
                credit_limit: limit,
                status,
                net_days: days,
                interest_rate_overdue: interest
            });
            showToast(`Credit profile updated to status: ${status}`);
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            showToast('Failed to update credit profile', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '14px' }}>
                <div style={{
                    width: '44px', height: '44px', border: '4px solid #e2e8f0',
                    borderTop: '4px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Retrieving Trade Finance Limit Applications...</span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={styles['usr-page-container']}>
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px',
                    padding: '12px 24px', borderRadius: '10px',
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', fontWeight: 'bold', zIndex: 10000,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Trade Credit Approvals</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Trade Credit Approvals</span>
                    </div>
                </div>
                <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedRequest ? '2fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
                {/* REQUESTS LIST TABLE */}
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontWeight: 800 }}>Applications Ledger</h3>
                    {requests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                            <p>No credit limit requests submitted yet.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                                        <th style={{ padding: '12px 8px' }}>Company & Buyer</th>
                                        <th style={{ padding: '12px 8px' }}>Requested/Limit</th>
                                        <th style={{ padding: '12px 8px' }}>Available Credit</th>
                                        <th style={{ padding: '12px 8px' }}>Repayment Days</th>
                                        <th style={{ padding: '12px 8px' }}>Status</th>
                                        <th style={{ padding: '12px 8px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => {
                                        const companyName = req.buyer_id?.company_name || 'N/A';
                                        const buyerName = `${req.buyer_id?.first_name || ''} ${req.buyer_id?.last_name || ''}`.trim() || 'Deleted Buyer';
                                        const email = req.buyer_id?.email || 'N/A';

                                        return (
                                            <tr key={req._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{companyName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{buyerName} ({email})</div>
                                                </td>
                                                <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                                                     ${req.credit_limit.toFixed(2)}
                                                     {req.requested_limit > 0 && (
                                                         <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', fontWeight: 'bold' }}>
                                                             Requested Upgrade: ${req.requested_limit.toFixed(2)}
                                                         </div>
                                                     )}
                                                </td>
                                                <td style={{ padding: '12px 8px', color: '#10b981', fontWeight: '700' }}>
                                                    ${req.available_credit.toFixed(2)}
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>Net-{req.net_days} days</td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                                        background: req.status === 'active' ? '#e8fdf0' : (req.status === 'pending' ? '#fffbeb' : '#fee2e2'),
                                                        color: req.status === 'active' ? '#10b981' : (req.status === 'pending' ? '#d97706' : '#ef4444')
                                                    }}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <button
                                                        onClick={() => handleSelectRequest(req)}
                                                        style={{
                                                            padding: '6px 12px', background: 'none', border: '1.5px solid #cbd5e1',
                                                            borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: '700'
                                                        }}
                                                    >
                                                        Audit Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* AUDIT FORM CONTAINER */}
                {selectedRequest && (
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800' }}>Audit Application</h3>
                        <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Applicant</div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{selectedRequest.buyer_id?.company_name}</div>
                            {selectedRequest.requested_limit > 0 && (
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>
                                    Requested Upgrade: ${selectedRequest.requested_limit.toFixed(2)}
                                </div>
                            )}
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Submitted Docs: {selectedRequest.verification_documents?.join(', ')}</div>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Credit Limit ($)</label>
                                <input
                                    type="number"
                                    value={editLimit}
                                    onChange={e => setEditLimit(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Repayment Terms (Days)</label>
                                <select
                                    value={editNetDays}
                                    onChange={e => setEditNetDays(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}
                                >
                                    <option value="30">Net-30 Days</option>
                                    <option value="60">Net-60 Days</option>
                                    <option value="90">Net-90 Days</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Interest Penalty Overdue (% Monthly)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editInterest}
                                    onChange={e => setEditInterest(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUpdateLimit('active')}
                                    style={{
                                        width: '100%', height: '40px', background: '#10b981', color: '#fff',
                                        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    Approve & Settle Limit
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUpdateLimit('suspended')}
                                    style={{
                                        width: '100%', height: '40px', background: '#d97706', color: '#fff',
                                        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    Suspend Profile
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUpdateLimit('rejected')}
                                    style={{
                                        width: '100%', height: '40px', background: '#ef4444', color: '#fff',
                                        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    Reject Application
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRequest(null)}
                                    style={{
                                        width: '100%', height: '40px', background: '#f1f5f9', color: '#475569',
                                        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    Close Auditor View
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCreditApproval;
