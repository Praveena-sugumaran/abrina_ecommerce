import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface EmiPlan {
    _id?: string;
    name: string;
    installments: number;
    interest_rate: number;
    processing_fee: number;
    min_order_amount: number;
    max_order_amount: number;
    is_active: boolean;
}

const emptyForm = {
    name: '',
    installments: '6',
    interest_rate: '0',
    processing_fee: '0',
    min_order_amount: '500',
    max_order_amount: '100000'
};

const AdminEmiPlans = () => {
    const { showToast } = useToast();
    const [plans, setPlans] = useState<EmiPlan[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/emi/plans');
            setPlans(data.data || []);
        } catch (err: any) {
            console.error('Failed to fetch EMI plans:', err);
            showToast('Failed to load EMI plans', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan: EmiPlan) => {
        setEditingId(plan._id || null);
        setForm({
            name: plan.name,
            installments: String(plan.installments),
            interest_rate: String(plan.interest_rate),
            processing_fee: String(plan.processing_fee),
            min_order_amount: String(plan.min_order_amount),
            max_order_amount: String(plan.max_order_amount)
        });
        setShowForm(true);
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this EMI plan?')) return;
        try {
            await api.delete(`/emi/plans/${id}`);
            setPlans(plans.filter(p => p._id !== id));
            showToast('EMI Plan deleted successfully', 'success');
        } catch (err: any) {
            showToast('Failed to delete EMI plan', 'error');
        }
    };

    const handleToggleActive = async (plan: EmiPlan) => {
        try {
            const { data } = await api.put(`/emi/plans/${plan._id}`, { is_active: !plan.is_active });
            setPlans(plans.map(p => p._id === plan._id ? data.data : p));
            showToast(`EMI Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`, 'success');
        } catch (err: any) {
            showToast('Failed to update EMI plan status', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                installments: Number(form.installments),
                interest_rate: Number(form.interest_rate),
                processing_fee: Number(form.processing_fee),
                min_order_amount: Number(form.min_order_amount),
                max_order_amount: Number(form.max_order_amount),
                is_active: true
            };

            if (editingId) {
                const { data } = await api.put(`/emi/plans/${editingId}`, payload);
                setPlans(plans.map(p => p._id === editingId ? (data.data || { ...p, ...payload }) : p));
                showToast('EMI Plan updated successfully', 'success');
            } else {
                const { data } = await api.post('/emi/plans', payload);
                setPlans([data.data, ...plans]);
                showToast('EMI Plan created successfully', 'success');
            }
            setEditingId(null);
            setShowForm(false);
            setForm(emptyForm);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to save EMI plan', 'error');
        }
    };

    const handleExportCSV = () => {
        if (!plans.length) return;
        const headers = ["Plan Name", "Installments", "Interest Rate", "Processing Fee", "Min Order", "Max Order", "Status"];
        const rows = plans.map(p => [
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${p.installments} Months"`,
            `"${p.interest_rate === 0 ? '0% (Interest-Free)' : `${p.interest_rate}% / month`}"`,
            `"$${p.processing_fee}"`,
            `"$${p.min_order_amount}"`,
            `"$${p.max_order_amount}"`,
            `"${p.is_active ? 'Active' : 'Inactive'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `emi_plans_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
            <div style={{
                width: '44px', height: '44px', border: '4px solid #e2e8f0',
                borderTop: '4px solid #ff6a00', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading EMI configurations...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>EMI Payment Plans</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>EMI Plans</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {!showForm && (
                        <button 
                            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} 
                            className={styles['usr-add-btn']}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            Create EMI Plan
                        </button>
                    )}
                </div>
            </div>

            {showForm ? (
                <div className={styles['usr-main-card']} style={{ padding: '24px', maxWidth: '800px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>{editingId ? 'Edit EMI Plan' : 'Create New EMI Plan'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Plan Name *</label>
                                <input 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    required 
                                    value={form.name} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                    placeholder="e.g. 6-Month Interest Free Plan" 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Installments (Months) *</label>
                                <select 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    value={form.installments} 
                                    onChange={e => setForm({...form, installments: e.target.value})}
                                >
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                    <option value="12">12 Months</option>
                                    <option value="24">24 Months</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Interest Rate (% per Month) *</label>
                                <input 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    required 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    value={form.interest_rate} 
                                    onChange={e => setForm({...form, interest_rate: e.target.value})} 
                                    placeholder="e.g. 0 (Interest Free) or 1.5" 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>One-time Processing Fee ($)</label>
                                <input 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    type="number" 
                                    min="0"
                                    value={form.processing_fee} 
                                    onChange={e => setForm({...form, processing_fee: e.target.value})} 
                                    placeholder="e.g. 15" 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Min Order Amount ($) *</label>
                                <input 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    required
                                    type="number" 
                                    min="0"
                                    value={form.min_order_amount} 
                                    onChange={e => setForm({...form, min_order_amount: e.target.value})} 
                                    placeholder="e.g. 500" 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Max Order Amount ($) *</label>
                                <input 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} 
                                    required
                                    type="number" 
                                    min="0"
                                    value={form.max_order_amount} 
                                    onChange={e => setForm({...form, max_order_amount: e.target.value})} 
                                    placeholder="e.g. 100000" 
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '8px 18px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '8px 18px', borderRadius: '10px', background: '#ff6a00', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Save Changes' : 'Save Plan'}</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className={styles['usr-main-card']}>
                    {/* Result Bar */}
                    <div className={styles['usr-result-bar']}>
                        Showing {plans.length} EMI payment plans
                    </div>

                    <div className={styles['usr-table-wrap']}>
                        <table className={styles['usr-table']}>
                            <thead>
                                <tr>
                                    <th>Plan Name</th>
                                    <th>Installments</th>
                                    <th>Interest Rate</th>
                                    <th>Processing Fee</th>
                                    <th>Order Limits</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.length > 0 ? (
                                    plans.map(plan => (
                                        <tr key={plan._id}>
                                            <td style={{ fontWeight: 800, color: '#0f172a' }}>{plan.name}</td>
                                            <td style={{ fontWeight: 700 }}>{plan.installments} Months</td>
                                            <td>{plan.interest_rate === 0 ? <span style={{ color: '#16a34a', fontWeight: 800 }}>0% (Interest-Free)</span> : `${plan.interest_rate}% / month`}</td>
                                            <td style={{ fontWeight: 600 }}>${plan.processing_fee}</td>
                                            <td>${plan.min_order_amount} - ${plan.max_order_amount}</td>
                                            <td>
                                                <span 
                                                    style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800, backgroundColor: plan.is_active ? '#f0fdf4' : '#fef2f2', color: plan.is_active ? '#16a34a' : '#dc2626', cursor: 'pointer' }}
                                                    onClick={() => handleToggleActive(plan)}
                                                >
                                                    {plan.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                    {/* Edit Icon */}
                                                    <button
                                                        onClick={() => handleEdit(plan)}
                                                        className={styles['usr-icon-btn']}
                                                        title="Edit Plan"
                                                    >
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                        </svg>
                                                    </button>
                                                    {/* Delete Icon */}
                                                    <button
                                                        onClick={() => handleDelete(plan._id)}
                                                        className={styles['usr-icon-btn-delete']}
                                                        title="Delete Plan"
                                                    >
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <polyline points="3 6 5 6 21 6"/>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600 }}>
                                            No EMI plans configured. Click "Create EMI Plan" to add one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEmiPlans;
