import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface Coupon {
    _id?: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    max_discount_amount: number | null;
    start_date: string;
    end_date: string;
    usage_limit: number | null;
    used_count: number;
    user_usage_limit: number;
    is_active: boolean;
    supplier?: {
        _id: string;
        company_name?: string;
        first_name?: string;
        last_name?: string;
    } | null;
}

const emptyForm = {
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    user_usage_limit: '1'
};

const AdminCoupons = () => {
    const { showToast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(data.pagination_limit);
            } catch (err) {}
        };
        fetchSettings();
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/coupons');
            setCoupons(data || []);
        } catch (err: any) {
            console.error('Failed to fetch coupons:', err);
            showToast('Failed to load coupons', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return;
        try {
            await api.delete(`/coupons/${id}`);
            setCoupons(coupons.filter(c => c._id !== id));
            showToast('Coupon deleted successfully', 'success');
        } catch (err: any) {
            showToast('Failed to delete coupon', 'error');
        }
    };

    const handleEdit = (item: Coupon) => {
        setEditingId(item._id || null);
        setForm({
            code: item.code,
            discount_type: item.discount_type,
            discount_value: item.discount_value.toString(),
            min_order_amount: item.min_order_amount ? item.min_order_amount.toString() : '0',
            max_discount_amount: item.max_discount_amount ? item.max_discount_amount.toString() : '',
            start_date: item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : '',
            end_date: item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : '',
            usage_limit: item.usage_limit ? item.usage_limit.toString() : '',
            user_usage_limit: item.user_usage_limit ? item.user_usage_limit.toString() : '1'
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Expiry date verification
        if (new Date(form.start_date) >= new Date(form.end_date)) {
            showToast('End date must be after start date', 'error');
            return;
        }

        try {
            const payload = {
                ...form,
                discount_value: Number(form.discount_value),
                min_order_amount: Number(form.min_order_amount || 0),
                max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
                usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
                user_usage_limit: Number(form.user_usage_limit || 1)
            };

            if (editingId) {
                const { data } = await api.put(`/coupons/${editingId}`, payload);
                setCoupons(coupons.map(c => c._id === editingId ? data : c));
                showToast('Coupon updated successfully', 'success');
            } else {
                const { data } = await api.post('/coupons', payload);
                setCoupons([data, ...coupons]);
                showToast('Coupon created successfully', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to save coupon', 'error');
        }
    };

    const handleExport = () => {
        if (coupons.length === 0) {
            showToast('No coupons available to export', 'error');
            return;
        }

        const headers = ['Code', 'Owner', 'Type', 'Value', 'Min Order ($)', 'Start Date', 'End Date', 'Used Count', 'Usage Limit', 'Status'];
        
        const rows = coupons.map(item => {
            const now = new Date();
            const isExpired = new Date(item.end_date) < now;
            const usageExceeded = item.usage_limit !== null && item.used_count >= item.usage_limit;
            const status = isExpired ? 'Expired' : usageExceeded ? 'Limit Reached' : item.is_active ? 'Active' : 'Inactive';
            
            const ownerName = item.supplier 
                ? item.supplier.company_name || `${item.supplier.first_name || ''} ${item.supplier.last_name || ''}`.trim()
                : 'Platform';

            const val = item.discount_type === 'percentage' ? `${item.discount_value}%` : `$${item.discount_value}`;

            return [
                `"${item.code}"`,
                `"${ownerName}"`,
                `"${item.discount_type}"`,
                `"${val}"`,
                `"${item.min_order_amount}"`,
                `"${new Date(item.start_date).toLocaleDateString()}"`,
                `"${new Date(item.end_date).toLocaleDateString()}"`,
                `"${item.used_count}"`,
                `"${item.usage_limit !== null ? item.usage_limit : 'Unlimited'}"`,
                `"${status}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `coupons_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Coupons exported successfully', 'success');
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = coupons.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(coupons.length / itemsPerPage);

    if (loading) return <div className="admin-loading-text">Loading coupon configurations...</div>;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Coupons & Promo Codes</h1>
                    <p className="admin-page-subtitle">Manage global marketplace promo codes and supplier specific discounts</p>
                </div>
                {!showForm && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            onClick={handleExport}
                            className="admin-btn admin-btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export CSV
                        </button>
                        <button 
                            onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} 
                            className="admin-btn admin-btn-primary"
                        >
                            + Create Global Coupon
                        </button>
                    </div>
                )}
            </div>

            {showForm ? (
                <div className="admin-card" style={{ maxWidth: '800px' }}>
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">{editingId ? 'Edit Promo Code' : 'Create New Promo Code'}</h2>
                    </div>
                    <div className="admin-card-body">
                        <form onSubmit={handleSubmit}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Promo Code *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        maxLength={20}
                                        value={form.code} 
                                        onChange={e => setForm({...form, code: e.target.value.toUpperCase().trim()})} 
                                        placeholder="e.g. SAVE20" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Discount Type *</label>
                                    <select 
                                        className={styles['admin-form-select']} 
                                        value={form.discount_type} 
                                        onChange={e => setForm({...form, discount_type: e.target.value as 'percentage' | 'fixed'})}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Discount Value *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        min="0"
                                        value={form.discount_value} 
                                        onChange={e => setForm({...form, discount_value: e.target.value})} 
                                        placeholder={form.discount_type === 'percentage' ? "e.g. 20 (for 20%)" : "e.g. 50 (for $50)"} 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Min Order Amount ($)</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        type="number" 
                                        min="0"
                                        value={form.min_order_amount} 
                                        onChange={e => setForm({...form, min_order_amount: e.target.value})} 
                                        placeholder="e.g. 100" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Max Discount Amount ($)</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        type="number" 
                                        min="0"
                                        value={form.max_discount_amount} 
                                        onChange={e => setForm({...form, max_discount_amount: e.target.value})} 
                                        placeholder="Optional cap for % discount" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>User Usage Limit</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        type="number" 
                                        min="1"
                                        required
                                        value={form.user_usage_limit} 
                                        onChange={e => setForm({...form, user_usage_limit: e.target.value})} 
                                        placeholder="Usage limit per user (default 1)" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Start Date *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        type="date" 
                                        value={form.start_date} 
                                        onChange={e => setForm({...form, start_date: e.target.value})} 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>End Date *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        type="date" 
                                        value={form.end_date} 
                                        onChange={e => setForm({...form, end_date: e.target.value})} 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Total Usage Limit</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        type="number" 
                                        min="1"
                                        value={form.usage_limit} 
                                        onChange={e => setForm({...form, usage_limit: e.target.value})} 
                                        placeholder="Leave empty for unlimited" 
                                    />
                                </div>
                            </div>
                            <div className={styles['admin-form-actions']}>
                                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="admin-btn admin-btn-secondary">Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary">{editingId ? 'Update Promo Code' : 'Save Promo Code'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="admin-card">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        {['Code', 'Owner', 'Type', 'Value', 'Min Order', 'Valid Period', 'Used / Limit', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.map(item => {
                                        const now = new Date();
                                        const isExpired = new Date(item.end_date) < now;
                                        const usageExceeded = item.usage_limit !== null && item.used_count >= item.usage_limit;
                                        const status = isExpired 
                                            ? 'Expired' 
                                            : usageExceeded 
                                                ? 'Limit Reached' 
                                                : item.is_active 
                                                    ? 'Active' 
                                                    : 'Inactive';
                                        
                                        const badgeClass = status === 'Active' 
                                            ? 'admin-badge-success' 
                                            : status === 'Inactive' 
                                                ? 'admin-badge-warning' 
                                                : 'admin-badge-danger';

                                        const ownerName = item.supplier 
                                            ? item.supplier.company_name || `${item.supplier.first_name || ''} ${item.supplier.last_name || ''}`.trim()
                                            : 'Platform';

                                        return (
                                            <tr key={item._id}>
                                                <td><strong style={{ color: 'var(--admin-text-main)' }}>{item.code}</strong></td>
                                                <td><span style={{ fontSize: '12.5px', fontWeight: 600 }}>{ownerName}</span></td>
                                                <td><span style={{ textTransform: 'capitalize' }}>{item.discount_type}</span></td>
                                                <td style={{ fontWeight: 800, color: 'var(--admin-text-main)' }}>
                                                    {item.discount_type === 'percentage' ? `${item.discount_value}%` : `$${item.discount_value}`}
                                                </td>
                                                <td>${item.min_order_amount}</td>
                                                <td style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)' }}>
                                                    {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    {item.used_count} / {item.usage_limit !== null ? item.usage_limit : '∞'}
                                                </td>
                                                <td>
                                                    <span className={`admin-badge ${badgeClass}`}>{status}</span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <button 
                                                            onClick={() => handleEdit(item)} 
                                                            className="admin-action-btn-edit" 
                                                            title="Edit Coupon"
                                                            style={{ padding: '6px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item._id)} 
                                                            className="admin-action-btn-delete"
                                                            title="Delete Coupon"
                                                            style={{ padding: '6px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {coupons.length === 0 && (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>No coupon codes defined yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', borderRadius: '14px', border: '1px solid var(--admin-border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, coupons.length)} of {coupons.length} coupons
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="admin-btn admin-btn-secondary" style={{ padding: '6px 12px' }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="admin-btn admin-btn-secondary" style={{ padding: '6px 12px' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
