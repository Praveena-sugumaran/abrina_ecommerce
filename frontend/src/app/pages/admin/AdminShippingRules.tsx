import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

const emptyForm = { 
    country_code: '', 
    country_name: '', 
    base_cost: 0, 
    cost_per_kg: 0, 
    estimated_days_min: 3, 
    estimated_days_max: 15, 
    carrier: 'Standard Global', 
    is_active: true,
    type: 'country',
    min_distance: 0,
    max_distance: 99999,
    cost_per_km: 0
};

interface ShippingRule {
    _id: string;
    country_code: string;
    country_name: string;
    base_cost: number;
    cost_per_kg: number;
    estimated_days_min: number;
    estimated_days_max: number;
    carrier: string;
    is_active: boolean;
    type: string;
    min_distance: number;
    max_distance: number;
    cost_per_km: number;
}

interface Country {
    _id: string;
    name: string;
    code: string;
}

const AdminModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', type = 'info' }: any) => {
    const { t } = useAuth();
    if (!isOpen) return null;
    return (
        <div className={styles['admin-modal-overlay']}>
            <div className={styles['admin-modal']}>
                <div className={styles['admin-modal-header']}>
                    <h3>{title}</h3>
                    <button className={styles['admin-modal-close']} onClick={onCancel}>&times;</button>
                </div>
                <div className={styles['admin-modal-body']}>{children}</div>
                <div className={styles['admin-modal-footer']}>
                    <button className={"admin-btn" + " " + "admin-btn-secondary"} onClick={onCancel}>Cancel</button>
                    <button
                        className={"admin-btn" + " " + "admin-btn-primary"}
                        style={{ background: type === 'danger' ? '#dc2626' : 'var(--primary-color)' }}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminShippingRules = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<ShippingRule[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRules = async () => {
        try {
            setLoading(true);
            const { data: rules } = await api.get('/admin/shipping-rules');
            setData(rules);
        } catch (err) {
            console.error('Fetch error', err);
        } finally { setLoading(false); }
    };

    const fetchCountries = async () => {
        try {
            const { data: list } = await api.get('/admin/countries');
            setCountries(list);
        } catch (err) { }
    };

    useEffect(() => { 
        const fetchSettings = async () => {
            try {
                const { data: set } = await api.get('/admin/site-settings');
                if (set?.pagination_limit) setItemsPerPage(set.pagination_limit);
            } catch (err) { }
        };
        fetchSettings();
        fetchRules();
        fetchCountries();
    }, []);

    const filteredData = data.filter(item => {
        return item.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.carrier.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleCountryChange = (e: any) => {
        const country: any = countries.find((c: any) => c.code === e.target.value);
        if (country) {
            setForm({ ...form, country_code: country.code, country_name: country.name });
        } else {
            setForm({ ...form, country_code: e.target.value });
        }
    };

    const handleEdit = (item: any) => {
        setForm(item);
        setEditingId(item._id);
        setShowForm(true);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const confirmDelete = (id: string) => {
        setPendingDeleteId(id);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/admin/shipping-rules/${pendingDeleteId}`);
            showToast('Rule deleted', 'success');
            fetchRules();
        } catch (err) { showToast('Delete failed', 'error'); }
        finally { setModalOpen(false); setPendingDeleteId(null); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/shipping-rules/${editingId}`, form);
                showToast('Rule updated', 'success');
            } else {
                await api.post('/admin/shipping-rules', form);
                showToast('Rule created', 'success');
            }
            setShowForm(false);
            fetchRules();
        } catch (err) { showToast('Save failed', 'error'); }
    };

    const handleExport = () => {
        if (!data.length) return;
        const headers = ['Type', 'Carrier', 'Detail/Country', 'Base Fee', 'Variable Cost', 'Min Delivery Days', 'Max Delivery Days', 'Status'];
        const rows = data.map(item => [
            item.type,
            `"${item.carrier}"`,
            item.type === 'country' ? `"${item.country_name} (${item.country_code})"` : `"${item.min_distance}km - ${item.max_distance}km"`,
            item.base_cost,
            item.type === 'country' ? item.cost_per_kg : item.cost_per_km,
            item.estimated_days_min,
            item.estimated_days_max,
            item.is_active ? 'Active' : 'Inactive'
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `shipping_rules_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={"admin-page"}>

            <AdminModal isOpen={modalOpen} title="Delete Shipping Rule" onConfirm={handleDelete} onCancel={() => setModalOpen(false)} confirmText="Delete" type="danger">
                <p style={{ fontSize: '14px', color: '#4b5563' }}>Are you sure you want to delete this shipping rule? Buyers in this country will fallback to default platform rates.</p>
            </AdminModal>

            <div className={"admin-page-header"}>
                <div>
                    <h1 className={"admin-page-title"}>Logistics & Shipping Rules</h1>
                    <p className={"admin-page-subtitle"}>Configure base fees and per-unit costs for different countries</p>
                </div>
                {!showForm && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button onClick={handleExport} className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export Rules
                        </button>
                        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); window.scrollTo(0, 0); }} className={"admin-btn" + " " + "admin-btn-primary"}>+ Add Rule</button>
                    </div>
                )}
            </div>

            {showForm ? (
                <div className={"admin-card"} style={{ overflow: 'visible' }}>
                    <div className={"admin-card-header"}>
                        <h2>{editingId ? 'Edit Mapping' : 'Create New Logistics Rule'}</h2>
                        <button onClick={() => setShowForm(false)} className={styles['admin-back-btn']}>← Back</button>
                    </div>
                    <div className={"admin-card-body"} style={{ overflow: 'visible' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Rule Type</label>
                                    <select className={styles['admin-form-select']} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                        <option value="country">Country-wise</option>
                                        <option value="distance">Distance-based</option>
                                    </select>
                                </div>
                                {form.type === 'country' ? (
                                    <div className={styles['admin-form-group']} style={{ position: 'relative', zIndex: 10 }}>
                                        <label className={styles['admin-form-label']}>Destination Country</label>
                                        <select className={styles['admin-form-select']} style={{ width: '100%' }} value={form.country_code} onChange={handleCountryChange} required={form.type === 'country'}>
                                            <option value="">Select a country</option>
                                            {countries.map(c => <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']}>Min Distance (KM)</label>
                                            <input type="number" className={styles['admin-form-input']} value={form.min_distance} onChange={e => setForm({...form, min_distance: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']}>Max Distance (KM)</label>
                                            <input type="number" className={styles['admin-form-input']} value={form.max_distance} onChange={e => setForm({...form, max_distance: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']}>Cost per KM (USD)</label>
                                            <input type="number" step="0.0001" className={styles['admin-form-input']} value={form.cost_per_km} onChange={e => setForm({...form, cost_per_km: parseFloat(e.target.value)})} />
                                        </div>
                                    </>
                                )}
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Carrier / Service Name</label>
                                    <input className={styles['admin-form-input']} value={form.carrier} onChange={e => setForm({...form, carrier: e.target.value})} required placeholder="e.g. FedEx Priority" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Base Fee (USD)</label>
                                    <input type="number" step="0.01" className={styles['admin-form-input']} value={form.base_cost} onChange={e => setForm({...form, base_cost: parseFloat(e.target.value)})} required />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Cost per Unit/KG (USD)</label>
                                    <input type="number" step="0.01" className={styles['admin-form-input']} value={form.cost_per_kg} onChange={e => setForm({...form, cost_per_kg: parseFloat(e.target.value)})} required />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Min Delivery Days</label>
                                    <input type="number" className={styles['admin-form-input']} value={form.estimated_days_min} onChange={e => setForm({...form, estimated_days_min: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Max Delivery Days</label>
                                    <input type="number" className={styles['admin-form-input']} value={form.estimated_days_max} onChange={e => setForm({...form, estimated_days_max: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Status</label>
                                    <select className={styles['admin-form-select']} value={form.is_active} onChange={e => setForm({...form, is_active: e.target.value === 'true'})}>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles['admin-form-actions']}>
                                <button type="button" onClick={() => setShowForm(false)} className={"admin-btn" + " " + "admin-btn-secondary"}>Cancel</button>
                                <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"}>{editingId ? 'Update Rule' : 'Save Rule'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={"admin-card"}>
                    <div style={{ padding: '16px 20px' }}>
                        <div className={"admin-search-wrap"} style={{ flex: '1' }}>
                            <svg className={"admin-search-icon"} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                placeholder="Search by country or carrier..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={"admin-table"}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Carrier</th>
                                    <th>Detail</th>
                                    <th>Base Fee</th>
                                    <th>Variable Cost</th>
                                    <th>Delivery</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr className={""}><td colSpan={8}>No logistics rules configured.</td></tr>
                                ) : currentData.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <span className={`admin-badge ${item.type === 'distance' ? 'admin-badge-purple' : 'admin-badge-info'}`} style={{ color: item.type === 'distance' ? '#a855f7' : '' }}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td>{item.carrier}</td>
                                        <td>
                                            {item.type === 'country' ? (
                                                <><strong>{item.country_name}</strong> <span style={{ color: '#666', fontSize: '11px' }}>({item.country_code})</span></>
                                            ) : (
                                                <span style={{ fontSize: '12px' }}>{item.min_distance}km - {item.max_distance}km</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: '700' }}>${item.base_cost.toFixed(2)}</td>
                                        <td>
                                            {item.type === 'country' ? `$${item.cost_per_kg.toFixed(2)}/unit` : `$${item.cost_per_km.toFixed(4)}/km`}
                                        </td>
                                        <td>{item.estimated_days_min}-{item.estimated_days_max} days</td>
                                        <td>
                                            <span className={`admin-badge ${item.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {item.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEdit(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Edit Rule" 
                                                    style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(item._id)} 
                                                    className="admin-action-btn-delete" 
                                                    title="Delete Rule" 
                                                    style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--admin-border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} rules
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={"admin-btn" + " " + "admin-btn-secondary"} style={{ padding: '6px 12px' }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={"admin-btn" + " " + "admin-btn-secondary"} style={{ padding: '6px 12px' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminShippingRules;
