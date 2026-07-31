import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface PayoutMethod {
    type: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    swift_code?: string;
    ifsc_code?: string;
    is_default: boolean;
}

interface SupplierPayout {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    company_name: string;
    wallet_balance: number;
    payout_methods: PayoutMethod[];
}

const AdminPayoutManagement: React.FC = () => {
    const [suppliers, setSuppliers] = useState<SupplierPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/payout-methods');
            setSuppliers(data);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to fetch payout data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportCSV = () => {
        if (!filteredSuppliers.length) return;
        const headers = ["Supplier Name", "Email", "Company", "Wallet Balance ($)", "Payout Methods Count"];
        const rows = filteredSuppliers.map(s => [
            `"${s.first_name || ''} ${s.last_name || ''}"`,
            `"${s.email}"`,
            `"${(s.company_name || 'N/A').replace(/"/g, '""')}"`,
            `"${s.wallet_balance || 0}"`,
            `"${s.payout_methods ? s.payout_methods.length : 0}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payout_management_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Payout Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Payout Management</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <button
                        onClick={fetchSuppliers}
                        disabled={loading}
                        className={styles['usr-add-btn']}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'spin' : ''}>
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search by supplier name, company or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className={styles['usr-btn-reset']}>
                            Clear Search
                        </button>
                    )}
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {filteredSuppliers.length} supplier payout records
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Supplier & Company</th>
                                <th>Wallet Balance</th>
                                <th>Configured Payout Methods</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading supplier payout information...</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>No suppliers found.</td>
                                </tr>
                            ) : (
                                filteredSuppliers.map(s => (
                                    <tr key={s._id}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '13px' }}>{s.first_name} {s.last_name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{s.email}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginTop: '2px' }}>{s.company_name || 'N/A'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 900, fontSize: '15px', color: s.wallet_balance > 0 ? '#10b981' : 'inherit' }}>
                                                ${s.wallet_balance?.toLocaleString() || '0.00'}
                                            </div>
                                        </td>
                                        <td>
                                            {s.payout_methods && s.payout_methods.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {s.payout_methods.map((pm: any, idx) => (
                                                        <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: 900, background: 'var(--primary-color)', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{pm.type?.replace('_', ' ')}</span>
                                                                {pm.is_default && <span style={{ fontSize: '10px', fontWeight: 900, background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Default</span>}
                                                            </div>
                                                            {(pm.type === 'bank' || pm.type === 'bank_transfer') && (
                                                                <div style={{ fontSize: '11px', color: '#334155' }}>
                                                                    <div><b>Bank:</b> {pm.bank_name || pm.details?.bank_name || 'N/A'}</div>
                                                                    <div><b>A/N:</b> {pm.account_name || pm.details?.account_name || 'N/A'}</div>
                                                                    <div><b>A/C:</b> {pm.account_number || pm.details?.account_number || 'N/A'}</div>
                                                                    {(pm.swift_code || pm.details?.swift_code) && <div><b>SWIFT:</b> {pm.swift_code || pm.details?.swift_code}</div>}
                                                                </div>
                                                            )}
                                                            {pm.type === 'paypal' && (
                                                                <div style={{ fontSize: '11px', color: '#334155' }}>
                                                                    <div><b>PayPal Email:</b> {pm.details?.email || pm.account_name || 'N/A'}</div>
                                                                </div>
                                                            )}
                                                            {pm.type !== 'bank' && pm.type !== 'bank_transfer' && pm.type !== 'paypal' && pm.details && (
                                                                <div style={{ fontSize: '11px', color: '#334155' }}>
                                                                    {Object.entries(pm.details).map(([key, val]: any) => (
                                                                        <div key={key}><b>{key.replace('_', ' ').toUpperCase()}:</b> {String(val)}</div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>Not Configured</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${s.payout_methods?.length > 0 ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {s.payout_methods?.length > 0 ? 'Verified' : 'Action Required'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPayoutManagement;
