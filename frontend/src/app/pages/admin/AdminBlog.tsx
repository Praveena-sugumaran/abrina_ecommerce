'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface BlogPost {
    _id?: string;
    title: string;
    slug: string;
    content: string;
    image: string;
    category?: string;
    author: string;
    createdAt: string;
}

const AdminBlog = () => {
    const { showToast } = useToast();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState('');
    const [category, setCategory] = useState('Sourcing');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/blog');
            setPosts(data || []);
        } catch (err: any) {
            console.error('Failed to fetch blog posts:', err);
            showToast('Failed to load blog posts list', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('images', file);

        setUploadingImage(true);
        try {
            const { data } = await api.post('/products/upload-single', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (data.url || data.path) {
                const uploadedUrl = data.url || data.path;
                setImage(uploadedUrl);
                showToast('Cover image uploaded successfully!', 'success');
            }
        } catch (err: any) {
            console.error('Image upload error:', err);
            showToast('Failed to upload image.', 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showToast('Title and content are required.', 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const { data } = await api.put(`/blog/${editingId}`, { title, content, image, category });
                if (data.success) {
                    showToast('Blog article updated successfully!', 'success');
                    handleCancelEdit();
                    fetchPosts();
                }
            } else {
                const { data } = await api.post('/blog', { title, content, image, category });
                if (data.success) {
                    showToast('Blog article published successfully!', 'success');
                    handleCancelEdit();
                    fetchPosts();
                }
            }
        } catch (err: any) {
            console.error('Save blog post error:', err);
            showToast(err.response?.data?.message || 'Failed to save blog article.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (post: BlogPost) => {
        if (!post._id) return;
        setEditingId(post._id);
        setTitle(post.title);
        setContent(post.content);
        setImage(post.image || '');
        setCategory(post.category || 'Sourcing');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setContent('');
        setImage('');
        setCategory('Sourcing');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this blog post?')) return;

        try {
            await api.delete(`/blog/${id}`);
            showToast('Blog article deleted successfully!', 'success');
            if (editingId === id) {
                handleCancelEdit();
            }
            setPosts(posts.filter(p => p._id !== id));
        } catch (err: any) {
            showToast('Failed to delete blog post', 'error');
        }
    };

    const handleExportCSV = () => {
        if (!posts.length) return;
        const headers = ["Title", "Category", "Author", "Created At", "Slug"];
        const rows = posts.map(p => [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.category || 'Sourcing').replace(/"/g, '""')}"`,
            `"${(p.author || 'Admin').replace(/"/g, '""')}"`,
            `"${new Date(p.createdAt).toLocaleDateString()}"`,
            `"${p.slug || ''}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `blog_posts_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Blog & Article Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Blog Posts</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 800 }}>
                        Total Articles: {posts.length}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'start' }}>
                {/* Compose / Edit Form Card */}
                <div className={styles['usr-main-card']} style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {editingId ? 'Edit Article' : 'Compose New Article'}
                        </h3>
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '0.78rem', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                    
                    <form onSubmit={handleSavePost}>
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Article Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Sourcing High-Quality Electronics: A Complete Guide"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a', fontWeight: 600 }}
                            />
                        </div>

                        {/* Article Category Field */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Article Category *
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a', fontWeight: 700 }}
                            >
                                <option value="Sourcing">Sourcing</option>
                                <option value="Logistics">Logistics</option>
                                <option value="Market Trends">Market Trends</option>
                                <option value="Guides">Guides</option>
                                <option value="General">General</option>
                            </select>
                        </div>

                        {/* Cover Image with Upload Option */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Cover Image
                            </label>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Paste Image URL or select file to upload"
                                    value={image}
                                    onChange={e => setImage(e.target.value)}
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a', fontWeight: 500 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    style={{
                                        padding: '0 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#334155',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Image Preview Box */}
                            {image && (
                                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img
                                        src={image}
                                        alt="Cover preview"
                                        style={{ width: '50px', height: '36px', objectFit: 'cover', borderRadius: '6px' }}
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {image}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setImage('')}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '4px 8px' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Article Body *
                            </label>
                            <textarea
                                required
                                rows={8}
                                placeholder="Write your article body content here..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none', background: '#fff', boxSizing: 'border-box', resize: 'vertical', color: '#0f172a', lineHeight: '1.6', fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                width: '100%',
                                padding: '12px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#ff6a00',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? (editingId ? 'Updating Article...' : 'Publishing Article...') : (editingId ? 'Update Article' : 'Publish Article')}
                        </button>
                    </form>
                </div>

                {/* Published Articles List Card */}
                <div className={styles['usr-main-card']} style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0' }}>
                        Published Articles
                    </h3>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '14px' }}>
                            <div style={{
                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading articles...</span>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : posts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <p style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>No articles published yet</p>
                            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px' }}>Draft and publish your first article using the form on the left.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '620px', overflowY: 'auto', paddingRight: '4px' }}>
                            {posts.map((p) => (
                                <div key={p._id} style={{ padding: '14px 16px', borderRadius: '12px', border: editingId === p._id ? '2px solid #ff6a00' : '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}>
                                    <div style={{ flex: 1, marginRight: '14px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.4' }}>{p.title}</h4>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                                            <span>By: {p.author || 'Admin'}</span>
                                            <span>Date: {new Date(p.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={styles['usr-actions-cell']}>
                                        {/* Edit Icon */}
                                        <button
                                            onClick={() => handleEditClick(p)}
                                            className={styles['usr-icon-btn']}
                                            title="Edit Article"
                                        >
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                        {/* Delete Icon */}
                                        <button
                                            onClick={() => handleDelete(p._id)}
                                            className={styles['usr-icon-btn-delete']}
                                            title="Delete Article"
                                        >
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminBlog;
