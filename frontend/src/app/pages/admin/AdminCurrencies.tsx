import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

const emptyForm = { name: '', code: '', symbol: '', exchange_rate: 1, is_active: true };

interface Currency {
    _id: string;
    name: string;
    code: string;
    symbol: string;
    exchange_rate: number;
    is_active: boolean;
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


const AdminCurrencies = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<Currency[]>([]);
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

    const fetchCurrencies = async () => {
        try {
            setLoading(true);
            const { data: currencies } = await api.get('/admin/currencies');
            setData(currencies);
        } catch (err) {
            console.error('Fetch error', err);
        } finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchCurrencies(); 
    }, []);

    // Search and Pagination Logic
    const filteredData = data.filter(item => {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.code.toLowerCase().includes(searchTerm.toLowerCase());
    });
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleEdit = (item: Currency) => {
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
            await api.delete(`/admin/currencies/${pendingDeleteId}`);
            showToast('Currency removed', 'success');
            fetchCurrencies();
        } catch (err) { showToast('Delete failed', 'error'); }
        finally { setModalOpen(false); setPendingDeleteId(null); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/currencies/${editingId}`, form);
                showToast('Currency updated', 'success');
            } else {
                await api.post('/admin/currencies', form);
                showToast('Currency registered', 'success');
            }
            setShowForm(false);
            fetchCurrencies();
        } catch (err) { showToast('Save failed', 'error'); }
    };

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900 }}>Currency Management</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Configure exchange rates and default platform symbols</p>
                </div>
                {!showForm && <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className={"admin-btn" + " " + "admin-btn-primary"}>+ Add Currency</button>}
            </div>

            <AdminModal isOpen={modalOpen} title="Delete Currency" type="danger" onConfirm={handleDelete} onCancel={() => setModalOpen(false)} confirmText="Delete Now">
                <p>Are you sure you want to remove this currency? This may impact prices and analytics for users using this unit.</p>
            </AdminModal>

            {showForm ? (
                <div className={"admin-card"} style={{ borderRadius: '24px' }}>
                    <div style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>{editingId ? 'Modify Currency Rate' : 'Enter New Currency'}</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Currency Name</label>
                                    <input className={styles['admin-form-input']} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. US Dollar" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Currency Code</label>
                                    <input className={styles['admin-form-input']} value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. USD" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Symbol</label>
                                    <input className={styles['admin-form-input']} value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} required placeholder="e.g. $" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Exchange Rate (1 USD = X)</label>
                                    <input type="number" step="0.0001" className={styles['admin-form-input']} value={form.exchange_rate} onChange={e => setForm({...form, exchange_rate: e.target.value})} required placeholder="1.00" />
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
                                <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"}> {editingId ? 'Update' : 'Save Currency'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={"admin-card"}>
                    <div style={{ padding: '14px 18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className={styles['admin-search-wrap']} style={{ flex: '1', minWidth: '220px' }}>
                            <svg className={styles['admin-search-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={styles['admin-search-input-premium']}
                                placeholder="Search currencies..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={"admin-table"}>
                            <thead>
                                <tr>
                                    <th>Currency Name</th>
                                    <th>Code</th>
                                    <th>Symbol</th>
                                    <th>Exchange Rate</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr className={""}><td colSpan={6}>No currencies found.</td></tr>
                                ) : currentData.map(item => (
                                    <tr key={item._id}>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.code}</td>
                                        <td>{item.symbol}</td>
                                        <td>{item.exchange_rate}</td>
                                        <td>
                                            <span className={`admin-badge ${item.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEdit(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Edit Currency" 
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
                                                    title="Delete Currency" 
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
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} currencies
                            </span>
                            <div className={styles['admin-pagination-controls']}>
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

export default AdminCurrencies;
