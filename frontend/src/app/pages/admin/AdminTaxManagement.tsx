import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface Category {
    _id: string;
    title: string;
}

interface TaxRule {
    _id?: string;
    name: string;
    country_code: string;
    country_name: string;
    type: string;
    value: string;
    scope: string;
    category_ids: string[];
    product_ids: string[];
    description?: string;
    is_active: boolean;
}

const COUNTRIES = [
    { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
    { code: 'IN', name: 'India' }, { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' }, { code: 'AU', name: 'Australia' },
    { code: 'CA', name: 'Canada' }, { code: 'BR', name: 'Brazil' },
    { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
    { code: 'SG', name: 'Singapore' }, { code: 'VN', name: 'Vietnam' },
    { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
    { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' }, { code: 'TR', name: 'Turkey' },
];

const emptyForm: TaxRule = { 
    name: '', 
    country_code: '', 
    country_name: '', 
    type: 'percentage', 
    value: '', 
    scope: 'global', 
    category_ids: [], 
    product_ids: [], 
    description: '', 
    is_active: true 
};

const AdminTaxManagement = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [rules, setRules] = useState<TaxRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<TaxRule>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/tax');
            setRules(data);
        } catch (err) {
            showToast('Failed to fetch tax rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/categories');
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    useEffect(() => {
        fetchRules();
        fetchCategories();
    }, []);

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const country = COUNTRIES.find(c => c.code === code);
        setForm(f => ({ ...f, country_code: code, country_name: country?.name || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            if (editingId) { await api.put(`/tax/${editingId}`, form); showToast('Tax updated!'); }
            else { await api.post('/tax', form); showToast('Tax created!'); }
            setShowForm(false); setEditingId(null); setForm(emptyForm); fetchRules();
        } catch (err) { showToast('Error', 'error'); }
        finally { setSaving(false); }
    };

    const handleEdit = (rule: TaxRule) => {
        setForm({ 
            name: rule.name, 
            country_code: rule.country_code, 
            country_name: rule.country_name, 
            type: rule.type, 
            value: rule.value, 
            scope: rule.scope, 
            category_ids: rule.category_ids?.map((c: any) => c._id || c) || [], 
            product_ids: rule.product_ids?.map((p: any) => p._id || p) || [], 
            description: rule.description || '', 
            is_active: rule.is_active 
        });
        setEditingId(rule._id || null);
        setShowForm(true);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this tax?')) return;
        try { await api.delete(`/tax/${id}`); showToast('Tax deleted.'); fetchRules(); }
        catch (err) { showToast('Delete failed.'); }
    };

    const handleToggle = async (rule: TaxRule) => {
        try { await api.put(`/tax/${rule._id}`, { ...rule, is_active: !rule.is_active }); fetchRules(); }
        catch (err) { showToast('Toggle failed.'); }
    };

    const filtered = rules.filter(r =>
        r.country_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRules = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const scopeLabel = (scope: string) => {
        const labels: Record<string, string> = { global: '🌍 Global', category: '📦 Category', product: '🏷 Product' };
        return labels[scope] || scope;
    };

    const handleExportCSV = () => {
        if (!filtered.length) return;
        const headers = ["Country Name", "Country Code", "Rule Name", "Type", "Value", "Scope", "Status"];
        const rows = filtered.map(rule => [
            `"${(rule.country_name || '').replace(/"/g, '""')}"`,
            `"${rule.country_code || ''}"`,
            `"${(rule.name || '').replace(/"/g, '""')}"`,
            `"${rule.type || ''}"`,
            `"${rule.type === 'percentage' ? `${rule.value}%` : `$${rule.value}`}"`,
            `"${rule.scope || ''}"`,
            `"${rule.is_active ? 'Active' : 'Inactive'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tax_settings_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {!showForm ? (
                <>
                    {/* Page Header */}
                    <div className={styles['usr-header-row']}>
                        <div>
                            <h1 className={styles['usr-page-title']}>Tax Management</h1>
                            <div className={styles['usr-breadcrumbs']}>
                                <span>Dashboard</span>
                                <span>›</span>
                                <span>Tax Management</span>
                            </div>
                        </div>
                        <div className={styles['usr-header-actions']}>
                            <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export CSV
                            </button>
                            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); window.scrollTo(0, 0); }} className={styles['usr-add-btn']}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                Add Tax
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles['usr-stats-grid']}>
                        {[
                            { label: 'Total Taxes', value: rules.length, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>, color: '#2563eb', bg: '#eff6ff' },
                            { label: 'Active', value: rules.filter(r => r.is_active).length, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, color: '#16a34a', bg: '#f0fdf4' },
                            { label: 'Countries Covered', value: new Set(rules.map(r => r.country_code)).size, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>, color: '#7e22ce', bg: '#f3e8ff' },
                        ].map((card, i) => (
                            <div key={i} className={styles['usr-stat-card']}>
                                <div className={styles['usr-stat-header']}>
                                    <span className={styles['usr-stat-label']}>{card.label}</span>
                                    <div className={styles['usr-stat-icon-wrap']} style={{ background: card.bg, color: card.color }}>
                                        {card.icon}
                                    </div>
                                </div>
                                <div className={styles['usr-stat-val']}>{card.value}</div>
                            </div>
                        ))}
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
                                    placeholder="Search by country or name..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            {search && (
                                <button onClick={() => setSearch('')} className={styles['usr-btn-reset']}>
                                    Clear Search
                                </button>
                            )}
                        </div>

                        {/* Result Bar */}
                        <div className={styles['usr-result-bar']}>
                            Showing {filtered.length} tax rules
                        </div>

                        {loading ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                        borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading tax rules...</span>
                                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                <p>No tax rules found matching your search.</p>
                                <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); window.scrollTo(0, 0); }} className={styles['usr-add-btn']} style={{ margin: '16px auto 0 auto' }}>+ Add Tax</button>
                            </div>
                        ) : (
                            <div className={styles['usr-table-wrap']}>
                                <table className={styles['usr-table']}>
                                    <thead>
                                        <tr>
                                            <th>Country</th>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Value</th>
                                            <th>Scope</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRules.map(rule => (
                                            <tr key={rule._id}>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem' }}>{rule.country_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rule.country_code}</div>
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{rule.name}</td>
                                                <td>
                                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: rule.type === 'percentage' ? '#eff6ff' : '#fff7ed', color: rule.type === 'percentage' ? '#2563eb' : '#ea580c' }}>
                                                        {rule.type === 'percentage' ? '% Percentage' : '$ Fixed'}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 800, color: '#0f172a' }}>
                                                    {rule.type === 'percentage' ? `${rule.value}%` : `$${rule.value}`}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: '#475569' }}>{scopeLabel(rule.scope)}</td>
                                                <td>
                                                    <div
                                                        className={`${styles['admin-toggle'] || ''} ${rule.is_active ? 'on' : ''}`}
                                                        style={{ width: '38px', height: '22px', borderRadius: '12px', background: rule.is_active ? '#16a34a' : '#cbd5e1', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onClick={() => handleToggle(rule)}
                                                    >
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: rule.is_active ? '19px' : '3px', transition: 'all 0.2s' }} />
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                        {/* Edit Icon */}
                                                        <button
                                                            onClick={() => handleEdit(rule)}
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
                                                            onClick={() => rule._id && handleDelete(rule._id)}
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
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {totalPages > 1 && (
                            <div className={styles['usr-pagination-bar']}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                    Showing Page {currentPage} of {totalPages} ({filtered.length} rules)
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
                </>
            ) : (
                /* ── FORM ── */
                <>
                    <div className={"admin-page-header"}>
                        <div>
                            <h1 className={"admin-page-title"}>{editingId ? 'Edit Tax Rule' : 'Create New Tax Rule'}</h1>
                            <p className={"admin-page-subtitle"}>Define when and how tax applies to buyer orders</p>
                        </div>
                        <button onClick={() => { setShowForm(false); setEditingId(null); }} className={styles['admin-back-btn']}>← Back</button>
                    </div>

                    <div className={"admin-card"}>
                        <div className={"admin-card-body"}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Row 1 */}
                                <div className={styles['admin-form-grid']}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>Rule Name</label>
                                        <input type="text" required className={styles['admin-form-input']} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. EU VAT, India GST" />
                                    </div>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>Country</label>
                                        <select required className={styles['admin-form-select']} value={form.country_code} onChange={handleCountryChange}>
                                            <option value="">Select a country</option>
                                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Tax Type Picker */}
                                <div className={styles['admin-form-grid']}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>Tax Type</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                            {['percentage', 'fixed'].map(t => (
                                                <label key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                                                    border: `2px solid ${form.type === t ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                    borderRadius: '10px', cursor: 'pointer',
                                                    background: form.type === t ? '#f0f4ff' : 'var(--admin-card-bg)',
                                                    fontWeight: 700, fontSize: '13px', color: form.type === t ? 'var(--primary-color)' : 'var(--admin-text-muted)'
                                                }}>
                                                    <span style={{ fontSize: '18px' }}>{t === 'percentage' ? '%' : '$'}</span>
                                                    {t === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>{form.type === 'percentage' ? 'Rate (%)' : 'Fixed Amount ($)'}</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--primary-color)' }}>{form.type === 'percentage' ? '%' : '$'}</span>
                                            <input type="number" required min="0" step="0.01" className={styles['admin-form-input']} style={{ paddingLeft: '36px' }} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percentage' ? '20' : '15.00'} />
                                        </div>
                                        {form.type === 'percentage' && <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>e.g. 20 = 20% VAT on the order total</p>}
                                    </div>
                                </div>

                                {/* Row 3: Scope */}
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Applies To (Scope)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                        {[
                                            { val: 'global', icon: '🌍', title: 'All Orders', desc: 'Applied to all orders from this country' },
                                            { val: 'category', icon: '📦', title: 'Specific Category', desc: 'Only for products in selected categories' },
                                            { val: 'product', icon: '🏷', title: 'Specific Product', desc: 'Only for selected individual products' },
                                        ].map(s => (
                                            <label key={s.val} onClick={() => setForm(f => ({ ...f, scope: s.val }))} style={{
                                                display: 'flex', flexDirection: 'column', gap: '4px', padding: '14px 16px',
                                                border: `2px solid ${form.scope === s.val ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                borderRadius: '12px', cursor: 'pointer',
                                                background: form.scope === s.val ? '#f0f4ff' : 'var(--admin-card-bg)',
                                            }}>
                                                <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                                                <span style={{ fontWeight: 800, fontSize: '13px', color: form.scope === s.val ? 'var(--primary-color)' : 'var(--admin-text-main)' }}>{s.title}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{s.desc}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Category selector */}
                                {form.scope === 'category' && (
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>Select Categories</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '14px', border: '1px solid var(--admin-border)', borderRadius: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                                            {categories.map(cat => {
                                                const selected = form.category_ids.includes(cat._id);
                                                return (
                                                    <span key={cat._id}
                                                        onClick={() => setForm(f => ({
                                                            ...f,
                                                            category_ids: selected ? f.category_ids.filter(id => id !== cat._id) : [...f.category_ids, cat._id]
                                                        }))}
                                                        style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: `1px solid ${selected ? 'var(--primary-color)' : 'var(--admin-border)'}`, background: selected ? 'var(--primary-color)' : 'var(--admin-bg)', color: selected ? '#fff' : 'var(--admin-text-secondary)' }}
                                                    >
                                                        {cat.title}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Notes / Description (Optional)</label>
                                    <input type="text" className={styles['admin-form-input']} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Standard EU VAT applied to all digital goods" />
                                </div>

                                {/* Active Toggle */}
                                <div className={styles['admin-section-box']} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div
                                        className={`admin-toggle${form.is_active ? ' on' : ''}`}
                                        onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--admin-text-main)' }}>Active</div>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>When active, this tax will be applied at checkout for matching orders</div>
                                    </div>
                                </div>

                                <div className={styles['admin-form-actions']}>
                                    <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className={"admin-btn" + " " + "admin-btn-secondary"}>Cancel</button>
                                    <button type="submit" disabled={saving} className={"admin-btn" + " " + "admin-btn-primary"}>
                                        {saving ? 'Saving...' : editingId ? 'Update Tax' : 'Create Tax'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminTaxManagement;
