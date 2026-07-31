import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface GiftCardTemplate {
    _id: string;
    name: string;
    value: number;
    price: number;
    stock: number;
    sold_count: number;
    is_active: boolean;
    description: string;
    terms: string;
    expires_in_days: number;
    createdAt: string;
}

const emptyForm = {
    name: '',
    value: '25',
    price: '25',
    stock: '100',
    description: 'Official Marketplace Store Gift Voucher for order bookings.',
    terms: 'Valid for all product bookings and checkout orders. Non-refundable.',
    expires_in_days: '365'
};

const AdminGiftCards = () => {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/gift-cards/admin/templates');
            setTemplates(data.data || []);
        } catch (err: any) {
            console.error('Failed to load gift card products:', err);
            showToast('Failed to load gift card products', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const handleEdit = (item: GiftCardTemplate) => {
        setEditingId(item._id);
        setForm({
            name: item.name,
            value: String(item.value),
            price: String(item.price),
            stock: String(item.stock),
            description: item.description || '',
            terms: item.terms || '',
            expires_in_days: String(item.expires_in_days || 365)
        });
        setShowForm(true);
    };

    const handleToggleStatus = async (item: GiftCardTemplate) => {
        try {
            const newStatus = !item.is_active;
            await api.put(`/gift-cards/admin/templates/${item._id}`, { is_active: newStatus });
            showToast(`Gift card product ${newStatus ? 'activated' : 'deactivated'}`, 'success');
            setTemplates(templates.map(t => t._id === item._id ? { ...t, is_active: newStatus } : t));
        } catch (err: any) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this Gift Card product?')) return;
        try {
            await api.delete(`/gift-cards/admin/templates/${id}`);
            showToast('Gift Card product deleted', 'success');
            setTemplates(templates.filter(t => t._id !== id));
        } catch (err: any) {
            showToast('Failed to delete Gift Card product', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.value || Number(form.value) <= 0) {
            return showToast('Please enter a valid Gift Card name and value', 'error');
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                value: Number(form.value),
                price: Number(form.price || form.value),
                stock: Number(form.stock || 100),
                description: form.description,
                terms: form.terms,
                expires_in_days: Number(form.expires_in_days || 365)
            };

            if (editingId) {
                const { data } = await api.put(`/gift-cards/admin/templates/${editingId}`, payload);
                showToast('Gift Card product updated successfully!', 'success');
            } else {
                const { data } = await api.post('/gift-cards/admin/templates', payload);
                showToast('Gift Card product created successfully!', 'success');
            }

            setShowForm(false);
            setEditingId(null);
            fetchTemplates();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to save Gift Card product', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="admin-loading-text">Loading Gift Card products...</div>;

    return (
        <div className="admin-page" style={{ padding: '24px' }}>
            {/* Header */}
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="admin-page-title" style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        Gift Card Product Management
                    </h1>
                    <p className="admin-page-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                        Create and manage official store Gift Card products. Single source of truth for customer purchase denominations.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="admin-btn admin-btn-primary"
                    style={{ background: 'linear-gradient(135deg, #ff6a00 0%, #ff8e3c 100%)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                >
                    + Add Gift Card Product
                </button>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div style={{ background: '#fff', border: '1.5px solid #e8edf5', borderRadius: '18px', padding: '24px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            {editingId ? 'Edit Gift Card Product' : 'Create New Gift Card Product'}
                        </h3>
                        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Gift Card Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. $25 Holiday Voucher"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Card Value ($) *</label>
                            <input
                                type="number"
                                placeholder="25"
                                value={form.value}
                                onChange={(e) => setForm({ ...form, value: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Selling Price ($)</label>
                            <input
                                type="number"
                                placeholder="25"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Stock Quantity</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={form.stock}
                                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Expiry (Days)</label>
                            <input
                                type="number"
                                placeholder="365"
                                value={form.expires_in_days}
                                onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Description</label>
                            <input
                                type="text"
                                placeholder="Official store voucher code for booking order payments"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ff6a00', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                            >
                                {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Product List Table */}
            <div style={{ background: '#fff', border: '1.5px solid #e8edf5', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(13, 46, 103, 0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Product Name</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Card Value</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Selling Price</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Stock</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Sold</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800 }}>Status</th>
                            <th style={{ padding: '14px 20px', color: '#64748b', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    No Gift Card products created yet. Click <strong>+ Add Gift Card Product</strong> above to create one.
                                </td>
                            </tr>
                        ) : (
                            templates.map((item) => (
                                <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0f172a' }}>
                                        {item.name}
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b' }}>{item.description}</span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontWeight: 900, color: '#16a34a' }}>${item.value}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0f172a' }}>${item.price}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 700, color: item.stock > 0 ? '#0f172a' : '#dc2626' }}>
                                        {item.stock > 0 ? item.stock : 'Out of Stock'}
                                    </td>
                                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#64748b' }}>{item.sold_count || 0}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <button
                                            onClick={() => handleToggleStatus(item)}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                fontWeight: 800,
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                background: item.is_active ? '#dcfce7' : '#fee2e2',
                                                color: item.is_active ? '#15803d' : '#b91c1c'
                                            }}
                                        >
                                            {item.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleEdit(item)}
                                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginRight: '8px' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminGiftCards;
