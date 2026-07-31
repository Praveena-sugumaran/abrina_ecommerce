import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

const emptyForm = { name: '', status: 'Active' };

interface BusinessType {
    _id: string;
    name: string;
    status: string;
    createdAt: string;
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
                    <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} onClick={onCancel}>Cancel</button>
                    <button
                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
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


const AdminBusinessTypes = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<BusinessType[]>([]);
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
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchBusinessTypes = async () => {
        try {
            setLoading(true);
            const { data: businessTypes } = await api.get('/admin/business-types');
            setData(businessTypes);
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
        fetchBusinessTypes(); 
    }, []);

    // Search and Pagination Logic
    const filteredData = data.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleEdit = (item: BusinessType) => {
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
            await api.delete(`/admin/business-types/${pendingDeleteId}`);
            showToast('Type deleted', 'success');
            fetchBusinessTypes();
        } catch (err) { showToast('Delete failed', 'error'); }
        finally { setModalOpen(false); setPendingDeleteId(null); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/business-types/${editingId}`, form);
                showToast('Type updated', 'success');
            } else {
                await api.post('/admin/business-types', form);
                showToast('Type created', 'success');
            }
            setShowForm(false);
            fetchBusinessTypes();
        } catch (err) { showToast('Save failed', 'error'); }
    };

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--admin-text-main)' }}>Business Types</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Categorize vendors and suppliers for better market segmentation</p>
                </div>
                {!showForm && <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); window.scrollTo(0, 0); }} className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>+ Add Business Type</button>}
            </div>

            <AdminModal isOpen={modalOpen} title="Delete Business Type" type="danger" onConfirm={handleDelete} onCancel={() => setModalOpen(false)} confirmText="Delete Now">
                <p>Are you sure you want to remove this category? Companies currently using this type will need to be reassigned.</p>
            </AdminModal>

            {showForm ? (
                <div className={"admin-card"} style={{ borderRadius: '24px' }}>
                    <div style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>{editingId ? 'Edit Business Type' : 'Register New Classification'}</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Category Name</label>
                                    <input className={styles['admin-form-input']} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Manufacturer, Exporter, etc." />
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
                                <button type="button" onClick={() => setShowForm(false)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>Cancel</button>
                                <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>{editingId ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={"admin-card"}>
                    <div className={""} style={{ padding: '14px 18px', display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                        <div className={"admin-search-wrap"} style={{ flex: '2', minWidth: '200px' }}>
                            <svg className={"admin-search-icon"} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={""}
                                placeholder="Search business types..."
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
                                    <th>Business Type Name</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr className={""}><td colSpan={4}>No records found.</td></tr>
                                ) : currentData.map(item => (
                                    <tr key={item._id}>
                                        <td><strong>{item.name}</strong></td>
                                        <td>
                                            <span className={`admin-badge ${item.status === 'Active' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEdit(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Edit Business Type" 
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
                                                    title="Delete Business Type" 
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
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} types
                            </span>
                             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminBusinessTypes;
