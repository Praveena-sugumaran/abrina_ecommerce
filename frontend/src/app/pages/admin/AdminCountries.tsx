import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import { getImgUrl, getFlagUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

const emptyForm = { name: '', code: '', dial_code: '', currency: '', status: 'Active', flag: '' };

interface Country {
    _id: string;
    name: string;
    code: string;
    dial_code: string;
    currency: string;
    status: string;
    flag: string;
    phone_length: number;
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


const AdminCountries = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [uploading, setUploading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchCountries = async () => {
        try {
            setLoading(true);
            const { data: countries } = await api.get('/admin/countries');
            setData(countries);
        } catch (err) {
            console.error('Fetch error', err);
        } finally { setLoading(false); }
    };

    useEffect(() => { 
        const fetchSettings = async () => {
            try {
                const { data: set } = await api.get('/admin/site-settings');
                if (set?.pagination_limit) setItemsPerPage(set.pagination_limit);
            } catch (err) { }
        };
        fetchSettings();
        fetchCountries(); 
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('media', file);
        try {
            const res = await api.post('/products/upload-media', uploadData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            if (res.data.success) {
                setForm({ ...form, flag: res.data.url });
                showToast('Flag uploaded', 'success');
            }
        } catch (err) { showToast('Upload failed', 'error'); }
        finally { setUploading(false); }
    };

    const handleEdit = (item: any) => {
        setForm(item);
        setEditingId(item._id);
        setShowForm(true);
    };

    const confirmDelete = (id: string) => {
        setPendingDeleteId(id);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/admin/countries/${pendingDeleteId}`);
            showToast('Country deleted', 'success');
            fetchCountries();
        } catch (err) { showToast('Delete failed', 'error'); }
        finally { setModalOpen(false); setPendingDeleteId(null); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/countries/${editingId}`, form);
                showToast('Country updated', 'success');
            } else {
                await api.post('/admin/countries', form);
                showToast('Country created', 'success');
            }
            setShowForm(false);
            fetchCountries();
        } catch (err) { showToast('Save failed', 'error'); }
    };

    const handleSeed = async () => {
        if (!window.confirm('This will add/update common world countries. Continue?')) return;
        try {
            setLoading(true);
            await api.post('/admin/countries/seed');
            showToast('Countries seeded successfully', 'success');
            fetchCountries();
        } catch (err) { showToast('Seed failed', 'error'); }
        finally { setLoading(false); }
    };

    // Search and Pagination Logic
    const filteredData = data.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#000000' }}>Countries & Dial Codes</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Manage shipping destinations, dial codes, and regional settings</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleSeed} className={"admin-btn" + " " + "admin-btn-secondary"}>🌱 Seed Countries</button>
                    <button onClick={() => { setForm({...emptyForm, phone_length: 10}); setEditingId(null); setShowForm(true); }} className={"admin-btn" + " " + "admin-btn-primary"}>+ Add Country</button>
                </div>
            </div>

            <AdminModal isOpen={modalOpen} title="Delete Country" type="danger" onConfirm={handleDelete} onCancel={() => setModalOpen(false)} confirmText="Delete Now">
                <p>Are you sure you want to remove this country? This will affect shipping and dial codes.</p>
            </AdminModal>

            {showForm ? (
                <div className={"admin-card"} style={{ maxWidth: '800px', margin: '0 auto', borderRadius: '24px' }}>
                    <div style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>{editingId ? 'Edit Country Details' : 'Register New Country'}</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Country Name</label>
                                    <input className={styles['admin-form-input']} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Canada" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>ISO Code</label>
                                    <input className={styles['admin-form-input']} value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. CA" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Dial Code</label>
                                    <input className={styles['admin-form-input']} value={form.dial_code} onChange={e => setForm({...form, dial_code: e.target.value})} required placeholder="e.g. +1" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Phone Length</label>
                                    <input type="number" className={styles['admin-form-input']} value={form.phone_length} onChange={e => setForm({...form, phone_length: parseInt(e.target.value)})} required placeholder="e.g. 10" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Currency Code</label>
                                    <input className={styles['admin-form-input']} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} required placeholder="e.g. CAD" />
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>Flag Image / Emoji</label>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {form.flag && (
                                            <div style={{ width: 60, height: 40, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                                {form.flag.startsWith('http') || form.flag.startsWith('/') ? (
                                                    <img src={getImgUrl(form.flag)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    form.flag
                                                )}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <input className={styles['admin-form-input']} style={{ flex: 1 }} value={form.flag} onChange={e => setForm({...form, flag: e.target.value})} placeholder="e.g. 🇨🇦 or URL" />
                                                <label className={"admin-btn" + " " + "admin-btn-secondary"} style={{ whiteSpace: 'nowrap', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 15px', height: '42px' }}>
                                                    {uploading ? '...' : '📁 Upload'}
                                                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Paste an emoji, enter a URL, or upload a flag image.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Status</label>
                                    <select className={styles['admin-form-select']} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles['admin-form-actions']}>
                                <button type="button" onClick={() => setShowForm(false)} className={"admin-btn" + " " + "admin-btn-secondary"}>Cancel</button>
                                <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"} disabled={uploading}>{editingId ? 'Update' : 'Save Country'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={"admin-card"}>
                    <div style={{ padding: '14px 18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className={styles['admin-search-wrap']} style={{ flex: '2', minWidth: '220px' }}>
                            <svg className={styles['admin-search-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={styles['admin-search-input-premium']}
                                placeholder="Search countries by name or ISO code..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <select
                            className={styles['admin-form-select']}
                            style={{ flex: '1', minWidth: '140px', padding: '9px 14px' }}
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={"admin-table"}>
                            <thead>
                                <tr>
                                    <th>Flag</th>
                                    <th>Country Name</th>
                                    <th>ISO Code</th>
                                    <th>Dial Code</th>
                                    <th>Phone Len</th>
                                    <th>Currency</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr className={""}><td colSpan={7}>No records found.</td></tr>
                                ) : currentData.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <img src={getFlagUrl(item.code)} alt="" style={{ width: '22px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                                                <span style={{ fontSize: '18px' }}>{item.flag}</span>
                                            </div>
                                        </td>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.code}</td>
                                        <td>{item.dial_code}</td>
                                        <td>{item.phone_length || 10}</td>
                                        <td>{item.currency}</td>
                                        <td>
                                            <span className={`admin-badge ${item.status === 'Active' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEdit(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Edit Country" 
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
                                                    title="Delete Country" 
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
                        <div className={styles['admin-pagination-footer']}>
                            <span className={styles['admin-pagination-info']}>
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} countries
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
            )}
        </div>
    );
};

export default AdminCountries;
