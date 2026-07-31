import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface BankDetails {
    bank_name: string;
    account_number: string;
    swift_code: string;
}

interface WithdrawalRequest {
    _id: string;
    user_id: {
        first_name: string;
        last_name: string;
        email: string;
        company_name?: string;
        payout_methods?: any[];
    };
    bank_details?: BankDetails;
    payout_method_type?: string;
    payout_details?: any;
    amount: number;
    status: string;
    createdAt: string;
}

const AdminWithdrawals = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    

    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

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
        fetchRequests(); 
    }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/admin/withdraw-requests');
            setRequests(data);
        } catch (err) { console.error('Error fetching requests:', err); }
        finally { setLoading(false); }
    };



    const handleAction = async (id: string, action: string) => {
        setActionLoading(id);
        try {
            await api.put(`/admin/withdraw-requests/${id}/${action}`);
            showToast(`Request ${action}d successfully`);
            fetchRequests();
        } catch (err: any) { showToast(err.response?.data?.message || 'Action failed', 'error'); }
        finally { setActionLoading(null); }
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return "admin-badge-success";
            case 'declined': return "admin-badge-danger";
            default: return "admin-badge-warning";
        }
    };

    const filteredRequests = requests.filter((req: any) => {
        const matchesStatus = statusFilter === 'All' || req.status === statusFilter.toLowerCase();
        
        const supplierName = `${req.user_id?.first_name} ${req.user_id?.last_name}`.toLowerCase();
        const supplierEmail = (req.user_id?.email || '').toLowerCase();
        const companyName = (req.user_id?.company_name || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        const matchesSearch = supplierName.includes(query) || supplierEmail.includes(query) || companyName.includes(query);
        
        return matchesStatus && matchesSearch;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
                <div style={{
                    width: '44px', height: '44px', border: '4px solid #e2e8f0',
                    borderTop: '4px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading withdrawal requests...</span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={"admin-page"}>

            <div className={"admin-page-header"}>
                <div>
                    <h1 className={"admin-page-title"}>Supplier Payouts</h1>
                    <p className={"admin-page-subtitle"}>Manage and approve withdrawal requests from suppliers</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className={"admin-card"} style={{ marginBottom: '20px' }}>
                <div className={""} style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                        <div className={styles['admin-search-wrap']} style={{ flex: '1', minWidth: '180px' }}>
                            <svg className={styles['admin-search-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={styles['admin-search-input-premium']}
                                placeholder="Search supplier name, email or company..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status:</span>
                        {['All', 'Pending', 'Approved', 'Declined'].map(status => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                                className={`${"admin-btn"} ${statusFilter === status ? "admin-btn-primary" : "admin-btn-secondary"}`}
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        className={"admin-btn" + " " + "admin-btn-secondary"} 
                        style={{ padding: '6px 14px' }}
                        onClick={() => { setStatusFilter('All'); setSearchQuery(''); setCurrentPage(1); }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className={"admin-card"}>
                <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--admin-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Showing {filteredRequests.length} payout requests
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={"admin-table"}>
                        <thead>
                            <tr>
                                <th>Supplier Details</th>
                                <th>Bank Information</th>
                                <th>Requested Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRequests.length === 0 ? (
                                <tr className={""}>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.1 }}>Empty</div>
                                        <div style={{ fontWeight: 800, color: 'var(--admin-text-main)' }}>No results found</div>
                                        <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Try adjusting your filters or search query</div>
                                    </td>
                                </tr>
                            ) : currentRequests.map(req => {
                                const userPayoutMethod = req.user_id?.payout_methods?.find((pm: any) => pm.is_default) || req.user_id?.payout_methods?.[0];
                                const payoutType = req.payout_method_type || userPayoutMethod?.type;
                                const details = req.payout_details || userPayoutMethod?.details;

                                return (
                                    <tr key={req._id}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '13px' }}>
                                                {req.user_id?.first_name} {req.user_id?.last_name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{req.user_id?.email}</div>
                                            {req.user_id?.company_name && (
                                                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700 }}>{req.user_id?.company_name}</div>
                                            )}
                                        </td>
                                        <td>
                                            {payoutType === 'paypal' ? (
                                                <>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#00457C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#00457C"><path d="M20.067 8.478c-.492-3.269-3.212-4.144-6.495-4.144H7.135a1.29 1.29 0 0 0-1.28 1.12L3.102 21.05a.43.43 0 0 0 .425.498h4.295c.27 0 .5-.2.536-.467l.805-5.074c.036-.226.228-.396.457-.396h2.247c3.957 0 6.666-1.583 7.33-6.196.115-.81.085-1.554-.13-2.227L20.067 8.478z" /></svg>
                                                        PayPal
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                                                        Email: {details?.email || userPayoutMethod?.account_name || userPayoutMethod?.details?.email || 'N/A'}
                                                    </div>
                                                </>
                                            ) : payoutType && payoutType !== 'bank' && payoutType !== 'bank_transfer' ? (
                                                <>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'capitalize' }}>
                                                        {payoutType.replace('_', ' ')}
                                                    </div>
                                                    {details && Object.entries(details).map(([key, val]) => (
                                                        <div key={key} style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                                            <strong style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}:</strong> {String(val)}
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (req.bank_details?.bank_name || details?.bank_name || userPayoutMethod?.bank_name) ? (
                                                <>
                                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                                        {req.bank_details?.bank_name || details?.bank_name || userPayoutMethod?.bank_name || 'Bank Transfer'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                                        Acc: {req.bank_details?.account_number || details?.account_number || userPayoutMethod?.account_number || 'N/A'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                                        SWIFT: {req.bank_details?.swift_code || details?.swift_code || userPayoutMethod?.swift_code || 'N/A'}
                                                    </div>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>No bank details</span>
                                            )}
                                        </td>
                                    <td style={{ fontSize: '12px' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 800, fontSize: '15px', color: 'var(--admin-text-main)' }}>${req.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`admin-badge ${getStatusBadge(req.status)}`}>{req.status}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {req.status === 'pending' ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className={"admin-action-btn-edit"}
                                                    disabled={actionLoading === req._id}
                                                    onClick={() => handleAction(req._id, 'approve')}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className={"admin-action-btn-delete"}
                                                    disabled={actionLoading === req._id}
                                                    onClick={() => handleAction(req._id, 'decline')}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>Processed</span>
                                        )}
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className={styles['admin-pagination-footer']}>
                        <span className={styles['admin-pagination-info']}>
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRequests.length)} of {filteredRequests.length} payouts
                        </span>
                        <div className={styles['admin-pagination-controls']}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['admin-pagination-btn-arrow']} title="Prev">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['admin-pagination-btn-arrow']} title="Next">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminWithdrawals;
