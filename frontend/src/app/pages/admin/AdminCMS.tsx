import { useAuth } from '@/context/AuthContext';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <div style={{ height: '400px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Loading editor...</div>
});
import ReactDOM from 'react-dom';

import styles from './AdminLayout.module.css';

// Fix for ReactQuill in React 18 (findDOMNode deprecation)
if (typeof window !== 'undefined' && typeof (ReactDOM as any).findDOMNode !== 'function') {
    (ReactDOM as any).findDOMNode = (node: any) => node;
}

interface CMSPage {
    _id: string;
    title: string;
    slug: string;
    content: string;
    isPublished: boolean;
    metaDescription?: string;
    updatedAt: string;
}


const AdminCMS = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [pages, setPages] = useState<CMSPage[]>([]);
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [editingPage, setEditingPage] = useState<CMSPage | { isNew: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        isPublished: true,
        metaDescription: ''
    });

    const [isSourceView, setIsSourceView] = useState(false);
    
    // Pagination & Filter states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image', 'video', 'blockquote', 'code-block'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'align',
        'link', 'image', 'video', 'blockquote', 'code-block'
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(data.pagination_limit);
            } catch (err) { }
        };
        fetchSettings();
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const { data } = await api.get('/cms');
            setPages(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (page: CMSPage) => {
        setEditingPage(page);
        setFormData({
            title: page.title,
            slug: page.slug,
            content: page.content,
            isPublished: page.isPublished,
            metaDescription: page.metaDescription || ''
        });
        setView('editor');
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleNew = () => {
        setEditingPage({ isNew: true });
        setFormData({
            title: '',
            slug: '',
            content: '',
            isPublished: true,
            metaDescription: ''
        });
        setView('editor');
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!editingPage) return;

            if ('isNew' in editingPage && editingPage.isNew) {
                await api.post('/cms', formData);
            } else if ('_id' in editingPage) {
                await api.put(`/cms/${editingPage._id}`, formData);
            }
            setView('list');
            setEditingPage(null);
            fetchPages();
        } catch (err) {
            showToast('Failed to save page', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/cms/${id}`);
            fetchPages();
        } catch (err) {
            console.error(err);
        }
    };

    if (view === 'editor') {
        return (
            <div className={"admin-page"} style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div className={"admin-page-header"} style={{ marginBottom: '24px' }}>
                    <div>
                        <h1 className={"admin-page-title"} style={{ fontSize: '24px', fontWeight: 900, color: '#000' }}>
                            {(editingPage && 'isNew' in editingPage) ? 'Create New Page' : 'Edit Page Content'}
                        </h1>
                        <p className={"admin-page-subtitle"}>Design your marketplace content with high precision</p>
                    </div>
                    <button onClick={() => setView('list')} className={"admin-btn" + " " + "admin-btn-secondary"} style={{ borderRadius: '12px' }}>
                        Back
                    </button>
                </div>

                <div className={"admin-card"} style={{ border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div className={"admin-card-body"} style={{ padding: '32px' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Page Title</label>
                                    <input
                                        type="text" required
                                        className={styles['admin-form-input']}
                                        style={{ height: '48px', borderRadius: '12px', fontSize: '15px', fontWeight: 600 }}
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Terms of Service"
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>URL Slug</label>
                                    <input
                                        type="text" required disabled={!(editingPage && 'isNew' in editingPage)}
                                        className={styles['admin-form-input']}
                                        style={{ height: '48px', borderRadius: '12px', background: (editingPage && 'isNew' in editingPage) ? '#fff' : '#f8fafc', fontWeight: 700 }}
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                        placeholder="terms-of-service"
                                    />
                                </div>
                            </div>
                            
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Meta Description (SEO)</label>
                                <textarea
                                    className={styles['admin-form-textarea']}
                                    value={formData.metaDescription}
                                    onChange={e => setFormData({ ...formData, metaDescription: e.target.value })}
                                    placeholder="Brief description for search engines..."
                                    style={{ minHeight: '60px', borderRadius: '12px', padding: '12px' }}
                                />
                            </div>

                            <div className={styles['admin-form-group']}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                    <label className={styles['admin-form-label']} style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-muted)', margin: 0 }}>Content Designer</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSourceView(!isSourceView)}
                                        style={{ background: '#000', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    >
                                        {isSourceView ? '👁 View Visual' : '⚡ Source Code'}
                                    </button>
                                </div>

                                <div style={{ 
                                    background: '#fff', 
                                    borderRadius: '16px', 
                                    border: '1.5px solid #e2e8f0', 
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}>
                                    {isSourceView ? (
                                        <textarea
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            style={{ width: '100%', height: '400px', border: 'none', padding: '20px', fontFamily: '"Fira Code", monospace', fontSize: '13px', lineHeight: '1.6', background: '#0f172a', color: '#e2e8f0', outline: 'none', resize: 'none' }}
                                        />
                                    ) : (
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={content => setFormData({ ...formData, content })}
                                            modules={modules}
                                            formats={formats}
                                            style={{ height: '400px', marginBottom: '45px' }}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={styles['admin-form-group']} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
                                <div
                                    className={`${styles['admin-toggle']} ${formData.isPublished ? styles['on'] : ''}`}
                                    onClick={() => setFormData(f => ({ ...f, isPublished: !f.isPublished }))}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>Publication Status</div>
                                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>When active, this page will be publicly accessible on the marketplace</div>
                                </div>
                            </div>

                            <div className={styles['admin-form-actions']}>
                                <button type="button" onClick={() => setView('list')} className={"admin-btn" + " " + "admin-btn-secondary"}>Cancel</button>
                                <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"}>
                                    {(editingPage && 'isNew' in editingPage) ? 'Create Page' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Pagination & Filtering Logic
    const filteredPages = pages.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Published' && p.isPublished) || (statusFilter === 'Draft' && !p.isPublished);
        return matchesSearch && matchesStatus;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPages = filteredPages.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPages.length / itemsPerPage);

    const handleExportCSV = () => {
        if (!filteredPages.length) return;
        const headers = ["Title", "Slug", "Status", "Last Updated"];
        const rows = filteredPages.map(page => [
            `"${(page.title || '').replace(/"/g, '""')}"`,
            `"${page.slug || ''}"`,
            `"${page.isPublished ? 'Published' : 'Draft'}"`,
            `"${new Date(page.updatedAt).toLocaleDateString()}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `cms_pages_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const stats = [
        { label: 'Total Pages', value: pages.length, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, color: '#2563eb', bg: '#eff6ff' },
        { label: 'Published', value: pages.filter(p => p.isPublished).length, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, color: '#16a34a', bg: '#f0fdf4' },
        { label: 'Drafts', value: pages.filter(p => !p.isPublished).length, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, color: '#ea580c', bg: '#fff7ed' }
    ];

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Content & CMS</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Content & CMS</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <button onClick={handleNew} className={styles['usr-add-btn']}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                        Create New Page
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles['usr-stats-grid']}>
                {stats.map((s, i) => (
                    <div key={i} className={styles['usr-stat-card']}>
                        <div className={styles['usr-stat-header']}>
                            <span className={styles['usr-stat-label']}>{s.label}</span>
                            <div className={styles['usr-stat-icon-wrap']} style={{ background: s.bg, color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                        <div className={styles['usr-stat-val']}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']} style={{ flex: '2' }}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search pages by title or slug..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        style={{ padding: '9px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', background: '#fff', cursor: 'pointer', minWidth: '140px' }}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                    </select>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {filteredPages.length} pages
                </div>

                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Page Title</th>
                                <th>URL Slug</th>
                                <th>Status</th>
                                <th className={styles['hide-mobile-col']}>Last Updated</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading storefront pages...</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentPages.map(page => (
                                <tr key={page._id}>
                                    <td>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                            {page.title}
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{ fontSize: '0.78rem', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                            /{page.slug}
                                        </code>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: page.isPublished ? '#f0fdf4' : '#f1f5f9', color: page.isPublished ? '#16a34a' : '#64748b' }}>
                                            {page.isPublished ? '✓ Published' : '○ Draft'}
                                        </span>
                                    </td>
                                    <td className={styles['hide-mobile-col']} style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                                        {new Date(page.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                            {/* Edit Icon */}
                                            <button
                                                onClick={() => handleEdit(page)}
                                                className={styles['usr-icon-btn']}
                                                title="Edit Page"
                                            >
                                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            {/* Delete Icon */}
                                            <button
                                                onClick={() => handleDelete(page._id)}
                                                className={styles['usr-icon-btn-delete']}
                                                title="Delete Page"
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
                            {filteredPages.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600 }}>
                                        No pages found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className={styles['usr-pagination-bar']}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Showing Page {currentPage} of {totalPages} ({filteredPages.length} pages)
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
        </div>
    );
};

export default AdminCMS;
