
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface Commission {
    _id?: string;
    id?: string;
    name: string;
    type: string;
    value: string | number;
    appliesTo: string;
    description: string;
}

interface Category {
    _id: string;
    title: string;
}

const emptyForm = { name: '', type: 'Percentage', value: '', appliesTo: 'All Products', description: '' };
type CommissionForm = typeof emptyForm;

const AdminCommissions = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [data, setData] = useState<Commission[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CommissionForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => { 
        const fetchSettings = async () => {
            try {
                const { data: set } = await api.get('/admin/site-settings');
                if (set?.pagination_limit) setItemsPerPage(set.pagination_limit);
            } catch (err: any) { }
        };
        fetchSettings();
        fetchCommissions(); 
        fetchCategories(); 
    }, []);

    const fetchCategories = async () => {
        try { const { data } = await api.get('/categories'); setCategories(data || []); } catch (err: any) { console.error(err); }
    };

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/commissions');
            setData(data || []);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch commissions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Commission) => {
        setEditingId(item._id || item.id || null);
        setForm({
            name: item.name,
            type: item.type,
            value: item.value.toString(),
            appliesTo: item.appliesTo,
            description: item.description
        });
        setShowForm(true);
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this commission rule?')) return;
        try {
            await api.delete(`/commissions/${id}`);
            setData(data.filter(item => item._id !== id && item.id !== id));
            showToast('Commission rule deleted', 'success');
        } catch (err: any) {
            showToast('Failed to delete rule', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { data: updated } = await api.put(`/commissions/${editingId}`, form);
                setData(data.map(item => (item._id === editingId || item.id === editingId) ? updated : item));
                showToast('Commission rule updated', 'success');
            } else {
                const { data: created } = await api.post('/commissions', form);
                setData([...data, created]);
                showToast('Commission rule created', 'success');
            }
            setShowForm(false);
            setForm(emptyForm);
            setEditingId(null);
        } catch (err: any) {
            showToast('Failed to save commission rule', 'error');
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = data.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const handleExportCSV = () => {
        if (!data.length) return;
        const headers = ["Name", "Applies To", "Type", "Value", "Description"];
        const rows = data.map(item => [
            `"${item.name.replace(/"/g, '""')}"`,
            `"${item.appliesTo}"`,
            `"${item.type}"`,
            `"${item.type === 'Fixed' ? '$' : ''}${item.value}${item.type === 'Percentage' ? '%' : ''}"`,
            `"${(item.description || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `commission_rates_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
                <div style={{
                    width: '44px', height: '44px', border: '4px solid #e2e8f0',
                    borderTop: '4px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading commission rules...</span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Commission Rates</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Commission Rates</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {!showForm && (
                        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className={styles['usr-add-btn']}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            New Rule
                        </button>
                    )}
                </div>
            </div>

            {showForm ? (
                <div className={styles['usr-main-card']} style={{ maxWidth: '800px', padding: '24px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>{editingId ? 'Edit Commission Rule' : 'Create New Rule'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Rule Name</label>
                                <input style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Standard Commission" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Applies To</label>
                                <select style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} value={form.appliesTo} onChange={e => setForm({...form, appliesTo: e.target.value})}>
                                    <option value="All Products">All Products</option>
                                    <optgroup label="Categories">
                                        {categories.map(cat => <option key={cat._id} value={cat.title}>{cat.title}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Type</label>
                                <select style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                    <option value="Percentage">Percentage (%)</option>
                                    <option value="Fixed">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Value</label>
                                <input style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} required type="number" step="0.01" min="0" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="e.g. 5" />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Rule Description</label>
                                <textarea style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', minHeight: '80px' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Details about when this commission applies..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 18px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '8px 18px', borderRadius: '10px', background: '#ff6a00', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Update Rule' : 'Save Rule'}</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className={styles['usr-main-card']}>
                    {/* Result Bar */}
                    <div className={styles['usr-result-bar']}>
                        Showing {data.length} commission rules
                    </div>

                    <div className={styles['usr-table-wrap']}>
                        <table className={styles['usr-table']}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Scope</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map(item => (
                                    <tr key={item._id || item.id}>
                                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</td>
                                        <td>
                                            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569' }}>
                                                {item.appliesTo}
                                            </span>
                                        </td>
                                        <td style={{ color: '#475569', fontSize: '0.84rem' }}>{item.type}</td>
                                        <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                            {item.type === 'Fixed' ? '$' : ''}{item.value}{item.type === 'Percentage' ? '%' : ''}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.description || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                {/* Edit Icon */}
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className={styles['usr-icon-btn']}
                                                    title="Edit Rule"
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                </button>
                                                {/* Delete Icon */}
                                                <button
                                                    onClick={() => handleDelete(item._id || item.id)}
                                                    className={styles['usr-icon-btn-delete']}
                                                    title="Delete Rule"
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <polyline points="3 6 5 6 21 6"/>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr><td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No commission rules defined yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className={styles['usr-pagination-bar']}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                Showing Page {currentPage} of {totalPages} ({data.length} rules)
                            </span>
                            <div className={styles['usr-pagination-pages']}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['usr-page-arrow']}>
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        className={`${styles['usr-page-num']} ${currentPage === idx + 1 ? styles['usr-active'] : ''}`}
                                        onClick={() => setCurrentPage(idx + 1)}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['usr-page-arrow']}>
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminCommissions;

