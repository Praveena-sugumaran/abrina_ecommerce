import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface HeaderLink {
    _id: string;
    title: string;
    url: string;
    order: number;
    isFlash: boolean;
    status: 'active' | 'inactive';
    parent?: any;
}

const emptyLinkForm = { title: '', url: '', order: 0, isFlash: false, status: 'active', parent: '' };

const AdminHeaderMenu = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [links, setLinks] = useState<HeaderLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingLink, setAddingLink] = useState(false);
    const [linkForm, setLinkForm] = useState<any>(emptyLinkForm);
    const [editLink, setEditLink] = useState<string | null>(null);

    const fetchLinks = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/header-navigations');
            setLinks(data || []);
        } catch (err) {
            console.error('Fetch error', err);
            showToast('Failed to fetch header links', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    const handleAddLink = async () => {
        if (!linkForm.title) {
            showToast('Please enter a Link Title', 'warning');
            return;
        }
        try {
            const payload = { ...linkForm, parent: linkForm.parent || null };
            await api.post('/admin/header-navigations', payload);
            showToast('Link added successfully', 'success');
            setAddingLink(false);
            setLinkForm(emptyLinkForm);
            fetchLinks();
        } catch (err) {
            showToast('Failed to add link', 'error');
        }
    };

    const handleUpdateLink = async (id: string) => {
        if (!linkForm.title) {
            showToast('Please enter a Link Title', 'warning');
            return;
        }
        try {
            const payload = { ...linkForm, parent: linkForm.parent || null };
            await api.put(`/admin/header-navigations/${id}`, payload);
            showToast('Link updated successfully', 'success');
            setEditLink(null);
            setLinkForm(emptyLinkForm);
            fetchLinks();
        } catch (err) {
            showToast('Failed to update link', 'error');
        }
    };

    const handleDeleteLink = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this navigation link?')) return;
        try {
            await api.delete(`/admin/header-navigations/${id}`);
            showToast('Link deleted successfully', 'success');
            fetchLinks();
        } catch (err) {
            showToast('Failed to delete link', 'error');
        }
    };

    const startEdit = (link: HeaderLink) => {
        setEditLink(link._id);
        setLinkForm({
            title: link.title,
            url: link.url,
            order: link.order || 0,
            isFlash: link.isFlash || false,
            status: link.status || 'active',
            parent: link.parent?._id || link.parent || ''
        });
    };

    const handleExportCSV = () => {
        if (!links.length) return;
        const headers = ["Order", "Title", "URL Path", "Parent", "Is Flash", "Status"];
        const rows = links.map((link: HeaderLink) => [
            `"${link.order || 0}"`,
            `"${(link.title || '').replace(/"/g, '""')}"`,
            `"${link.url || ''}"`,
            `"${link.parent ? (typeof link.parent === 'object' ? link.parent.title : link.parent) : 'Root'}"`,
            `"${link.isFlash ? 'Yes' : 'No'}"`,
            `"${link.status || 'active'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `header_menu_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading header configuration...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Header Menu Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Header Menu</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {!addingLink && (
                        <button onClick={() => { setAddingLink(true); setLinkForm(emptyLinkForm); setEditLink(null); }} className={styles['usr-add-btn']}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            Add Nav Link
                        </button>
                    )}
                </div>
            </div>

            {/* Form Drawer / Card */}
            {addingLink && (
                <div className={styles['usr-main-card']} style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>{editLink ? 'Edit Nav Link' : 'Add New Nav Link'}</h3>
                    <form onSubmit={handleSaveLink}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Link Title *</label>
                                <input style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} required value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="e.g. Consumer Electronics" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>URL Path *</label>
                                <input style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} required value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="e.g. /products?category=electronics" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Parent Menu</label>
                                <select style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} value={linkForm.parent} onChange={e => setLinkForm({ ...linkForm, parent: e.target.value })}>
                                    <option value="">None (Top-Level Category)</option>
                                    {links.filter((l: HeaderLink) => !editLink || l._id !== editLink).map((l: HeaderLink) => (
                                        <option key={l._id} value={l._id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Display Order</label>
                                <input style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} type="number" value={linkForm.order} onChange={e => setLinkForm({ ...linkForm, order: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Status</label>
                                <select style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }} value={linkForm.status} onChange={e => setLinkForm({ ...linkForm, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                                <input type="checkbox" id="isFlash" checked={linkForm.isFlash} onChange={e => setLinkForm({ ...linkForm, isFlash: e.target.checked })} />
                                <label htmlFor="isFlash" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>Flash Sale Highlight ⚡</label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button type="button" onClick={() => { setAddingLink(false); setEditLink(null); setLinkForm(emptyLinkForm); }} style={{ padding: '8px 18px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '8px 18px', borderRadius: '10px', background: '#ff6a00', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{editLink ? 'Save Changes' : 'Create Link'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Links Table Card */}
            <div className={styles['usr-main-card']}>
                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {links.length} header menu links
                </div>

                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Link Title</th>
                                <th>URL Path</th>
                                <th>Parent Menu</th>
                                <th>Special Style</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {links.map((link: HeaderLink) => (
                                <tr key={link._id}>
                                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{link.order}</td>
                                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{link.title}</td>
                                    <td><code style={{ fontSize: '0.78rem', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{link.url}</code></td>
                                    <td>
                                        {link.parent ? (
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800, backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                                ↳ {typeof link.parent === 'object' ? link.parent.title : link.parent}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Root Menu</span>
                                        )}
                                    </td>
                                    <td>
                                        {link.isFlash ? <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.78rem' }}>⚡ Flash Sale</span> : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Standard</span>}
                                    </td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800, backgroundColor: link.status === 'active' ? '#f0fdf4' : '#fef2f2', color: link.status === 'active' ? '#16a34a' : '#dc2626' }}>
                                            {link.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                            {/* Edit Icon */}
                                            <button
                                                onClick={() => startEdit(link)}
                                                className={styles['usr-icon-btn']}
                                                title="Edit Link"
                                            >
                                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            {/* Delete Icon */}
                                            <button
                                                onClick={() => handleDeleteLink(link._id)}
                                                className={styles['usr-icon-btn-delete']}
                                                title="Delete Link"
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
                            {links.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600 }}>
                                        No header links configured. Use the button above to add some.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminHeaderMenu;
