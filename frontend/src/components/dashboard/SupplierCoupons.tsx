import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

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

const SupplierCoupons = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/coupons');
            setCoupons(data || []);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to load coupons', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this coupon? This cannot be undone.')) return;
        try {
            await api.delete(`/coupons/${id}`);
            setCoupons(coupons.filter(c => c._id !== id));
            showToast('Coupon deleted successfully', 'success');
        } catch (err: any) {
            showToast('Failed to delete coupon', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
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

            const { data } = await api.post('/coupons', payload);
            setCoupons([data, ...coupons]);
            showToast('Promo code created successfully', 'success');
            setShowForm(false);
            setForm(emptyForm);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to save coupon', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading store coupons...
            </div>
        );
    }

    return (
        <div className="dashboard-card-container" style={{ minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                        Coupons & Sourcing Incentives
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        Create promotional discount codes that apply specifically to your products at checkout.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setForm(emptyForm); }}
                        style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        + Create Store Coupon
                    </button>
                )}
            </div>

            {showForm ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', background: '#f8fafc', maxWidth: '800px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        New Promo Code Details
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Promo Code *</label>
                                <input
                                    required
                                    type="text"
                                    maxLength={20}
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.code}
                                    onChange={e => setForm({...form, code: e.target.value.toUpperCase().trim()})}
                                    placeholder="e.g. DISCOUNT10"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Discount Type *</label>
                                <select
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                    value={form.discount_type}
                                    onChange={e => setForm({...form, discount_type: e.target.value as 'percentage' | 'fixed'})}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Discount Value *</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.discount_value}
                                    onChange={e => setForm({...form, discount_value: e.target.value})}
                                    placeholder={form.discount_type === 'percentage' ? "e.g. 10" : "e.g. 25"}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Min Order Subtotal ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.min_order_amount}
                                    onChange={e => setForm({...form, min_order_amount: e.target.value})}
                                    placeholder="e.g. 50"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Max Discount ($) (Optional)</label>
                                <input
                                    type="number"
                                    min="0"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.max_discount_amount}
                                    onChange={e => setForm({...form, max_discount_amount: e.target.value})}
                                    placeholder="Cap for percentage discount"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Usage Limit Per Buyer</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.user_usage_limit}
                                    onChange={e => setForm({...form, user_usage_limit: e.target.value})}
                                    placeholder="e.g. 1"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Start Date *</label>
                                <input
                                    required
                                    type="date"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.start_date}
                                    onChange={e => setForm({...form, start_date: e.target.value})}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>End Date *</label>
                                <input
                                    required
                                    type="date"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.end_date}
                                    onChange={e => setForm({...form, end_date: e.target.value})}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Total Usage Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    value={form.usage_limit}
                                    onChange={e => setForm({...form, usage_limit: e.target.value})}
                                    placeholder="Empty for unlimited"
                                />
                            </div>

                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ background: 'var(--primary-color, #ff6600)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Save Promo Code
                            </button>
                        </div>
                    </form>
                </div>
            ) : coupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Sourcing Incentives Yet</h4>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Provide buyers with custom promo codes to boost conversion rates on your shop items.
                    </p>
                    <button 
                        onClick={() => { setShowForm(true); setForm(emptyForm); }} 
                        style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        Create Store Coupon
                    </button>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Code', 'Type', 'Value', 'Min Order', 'Valid Period', 'Used / Limit', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '14px 20px', fontWeight: 700, color: '#475569' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map(item => {
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

                                const color = status === 'Active' 
                                    ? { bg: '#dcfce7', text: '#15803d' } 
                                    : status === 'Inactive' 
                                        ? { bg: '#fef3c7', text: '#d97706' } 
                                        : { bg: '#fee2e2', text: '#b91c1c' };

                                return (
                                    <tr key={item._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '14px 20px' }}><strong>{item.code}</strong></td>
                                        <td style={{ padding: '14px 20px', textTransform: 'capitalize' }}>{item.discount_type}</td>
                                        <td style={{ padding: '14px 20px', fontWeight: 800 }}>
                                            {item.discount_type === 'percentage' ? `${item.discount_value}%` : `$${item.discount_value}`}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>${item.min_order_amount}</td>
                                        <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: '#64748b' }}>
                                            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {item.used_count} / {item.usage_limit !== null ? item.usage_limit : '∞'}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: color.bg, color: color.text }}>
                                                {status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <button
                                                onClick={() => handleDelete(item._id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Delete
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
    );
};

export default SupplierCoupons;
