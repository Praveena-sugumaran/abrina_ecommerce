import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface FooterLink {
    _id: string;
    title: string;
    url: string;
}

interface FooterSection {
    _id: string;
    label: string;
    links: FooterLink[];
}

interface EditSectionState {
    id: string;
    label: string;
}

interface EditLinkState {
    sectionId: string;
    linkId: string;
}

const emptyLinkForm = { title: '', url: '' };

const AdminFooterMenu = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [sections, setSections] = useState<FooterSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [editSection, setEditSection] = useState<EditSectionState | null>(null);
    const [newSectionLabel, setNewSectionLabel] = useState('');
    const [addingSection, setAddingSection] = useState(false);
    const [addingLink, setAddingLink] = useState<string | null>(null);
    const [linkForm, setLinkForm] = useState(emptyLinkForm);
    const [editLink, setEditLink] = useState<EditLinkState | null>(null);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/footer-sections');
            setSections(data || []);
        } catch (err) { 
            console.error('Fetch error', err);
            showToast('Failed to fetch footer sections', 'error');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { 
        fetchSections(); 
    }, []);

    const handleUpdateSection = async (id: string) => {
        if (!editSection?.label) return;
        try {
            await api.put(`/admin/footer-sections/${id}`, { label: editSection.label });
            showToast('Section updated', 'success');
            setEditSection(null);
            fetchSections();
        } catch (err) {
            showToast('Update failed', 'error');
        }
    };

    const handleDeleteSection = async (id: string) => {
        if (!window.confirm('Delete this section and all its links?')) return;
        try {
            await api.delete(`/admin/footer-sections/${id}`);
            showToast('Section deleted', 'success');
            fetchSections();
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const handleUpdateLink = async () => {
        if (!editLink || !linkForm.title || !linkForm.url) return;
        try {
            await api.put(`/admin/footer-sections/${editLink.sectionId}/links/${editLink.linkId}`, linkForm);
            showToast('Link updated', 'success');
            setEditLink(null);
            setLinkForm(emptyLinkForm);
            fetchSections();
        } catch (err) {
            showToast('Update failed', 'error');
        }
    };

    const handleDeleteLink = async (sectionId: string, linkId: string) => {
        if (!window.confirm('Delete this link?')) return;
        try {
            await api.delete(`/admin/footer-sections/${sectionId}/links/${linkId}`);
            showToast('Link deleted', 'success');
            fetchSections();
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const handleAddLink = async (sectionId: string) => {
        if (!linkForm.title || !linkForm.url) return;
        try {
            await api.post(`/admin/footer-sections/${sectionId}/links`, linkForm);
            showToast('Link added', 'success');
            setAddingLink(null);
            setLinkForm(emptyLinkForm);
            fetchSections();
        } catch (err) {
            showToast('Add failed', 'error');
        }
    };

    const handleAddSection = async () => {
        if (!newSectionLabel) return;
        try {
            await api.post('/admin/footer-sections', { label: newSectionLabel });
            showToast('Section created', 'success');
            setNewSectionLabel('');
            setAddingSection(false);
            fetchSections();
        } catch (err) {
            showToast('Failed to create section', 'error');
        }
    };

    const handleExportCSV = () => {
        if (!sections.length) return;
        const headers = ["Section Title", "Links Count"];
        const rows = sections.map(s => [
            `"${(s.title || '').replace(/"/g, '""')}"`,
            `"${s.links ? s.links.length : 0}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `footer_menu_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading footer configuration...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Footer Menu Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Footer Menu</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {!addingSection && (
                        <button onClick={() => setAddingSection(true)} className={styles['usr-add-btn']}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            Add Section
                        </button>
                    )}
                </div>
            </div>

            {/* Add Section Card */}
            {addingSection && (
                <div className={styles['usr-main-card']} style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>Add Footer Section</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                            autoFocus
                            placeholder="Section Title (e.g. Customer Care)" 
                            style={{ flex: 1, minWidth: '240px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none' }}
                            value={newSectionLabel} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSectionLabel(e.target.value)} 
                        />
                        <button onClick={handleAddSection} style={{ padding: '10px 20px', borderRadius: '10px', background: '#ff6a00', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Create</button>
                        <button onClick={() => setAddingSection(false)} style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                {sections.map((section: FooterSection) => (
                    <div key={section._id} className={"admin-card"} style={{ overflow: 'hidden' }}>
                        <div className={"admin-card-header"} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-bg)', padding: '16px 24px' }}>
                            {editSection?.id === section._id ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
                                    <input 
                                        autoFocus
                                        className={styles['admin-form-input']} 
                                        style={{ maxWidth: '100%', minWidth: '150px' }}
                                        value={editSection.label} 
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSection({ ...editSection, label: e.target.value })} 
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleUpdateSection(section._id)} className={"admin-btn" + " " + "admin-btn-primary"} style={{ padding: '6px 14px', fontSize: '12px' }}>Save</button>
                                        <button onClick={() => setEditSection(null)} className={"admin-btn"} style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--admin-text-main)' }}>{section.label}</h3>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setEditSection({ id: section._id, label: section.label })} className={"admin-action-btn-edit"}>Edit</button>
                                <button onClick={() => handleDeleteSection(section._id)} className={"admin-action-btn-delete"}>Delete</button>
                            </div>
                        </div>

                        <div className={"admin-card-body"} style={{ padding: '24px' }}>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className={"admin-table"}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '12px' }}>Link Title</th>
                                            <th style={{ textAlign: 'left', padding: '12px' }}>URL Path</th>
                                            <th style={{ textAlign: 'right', padding: '12px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.links.map((link: FooterLink) => (
                                            <tr key={link._id}>
                                                {editLink?.linkId === link._id && editLink?.sectionId === section._id ? (
                                                    <>
                                                        <td><input className={styles['admin-form-input']} style={{ padding: '8px 12px' }} value={linkForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkForm({ ...linkForm, title: e.target.value })} /></td>
                                                        <td><input className={styles['admin-form-input']} style={{ padding: '8px 12px' }} value={linkForm.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkForm({ ...linkForm, url: e.target.value })} /></td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button onClick={handleUpdateLink} className={"admin-action-btn-edit"}>Save</button>
                                                                <button onClick={() => setEditLink(null)} className={"admin-action-btn-edit"}>Cancel</button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td style={{ padding: '12px' }}><strong>{link.title}</strong></td>
                                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-muted)' }}>{link.url}</td>
                                                        <td style={{ textAlign: 'right', padding: '12px' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button onClick={() => { setEditLink({ sectionId: section._id, linkId: link._id }); setLinkForm({ title: link.title, url: link.url }); }} className={"admin-action-btn-edit"}>Edit</button>
                                                                <button onClick={() => handleDeleteLink(section._id, link._id)} className={"admin-action-btn-delete"}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}

                                        {addingLink === section._id && (
                                            <tr>
                                                <td><input autoFocus className={styles['admin-form-input']} placeholder="Link Label" value={linkForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkForm({ ...linkForm, title: e.target.value })} /></td>
                                                <td><input className={styles['admin-form-input']} placeholder="/page/example" value={linkForm.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkForm({ ...linkForm, url: e.target.value })} /></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => handleAddLink(section._id)} className={"admin-action-btn-edit"}>Add</button>
                                                        <button onClick={() => { setAddingLink(null); setLinkForm(emptyLinkForm); }} className={"admin-action-btn-edit"}>Cancel</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {addingLink !== section._id && (
                                <button
                                    onClick={() => { setAddingLink(section._id); setLinkForm(emptyLinkForm); setEditLink(null); }}
                                    style={{ marginTop: '20px', background: 'transparent', border: '1.5px dashed var(--admin-border)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '13px', fontWeight: 700 }}
                                >
                                    + Add New Link to this Section
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminFooterMenu;
