import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import ProductForm from '@/components/dashboard/products/ProductForm';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL || '';

interface Category {
    _id: string;
    title: string;
}

interface Product {
    _id: string;
    name: string;
    description: string;
    sku: string;
    moq: number;
    currency: string;
    status: 'active' | 'inactive' | 'pending' | 'rejected' | 'draft';
    approval_status: 'approved' | 'pending' | 'rejected';
    countInStock?: number;
    oldPrice?: number;
    images?: string[];
    category?: Category;
    supplier?: {
        _id?: string;
        company_name?: string;
        first_name?: string;
        last_name?: string;
    };
}

const statusStyles = {
    active:    { background: '#dcfce7', color: '#166534' },
    inactive:  { background: '#f3f4f6', color: '#6b7280' },
    pending:   { background: '#fef9c3', color: '#854d0e' },
    rejected:  { background: '#fee2e2', color: '#991b1b' },
};

const AdminProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const { siteSettings, t, user } = useAuth();
    const { showToast } = useToast();

    const userRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = userRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];
    
    const canEdit = isSuperAdmin || userPerms.includes('products.edit');
    const canDelete = isSuperAdmin || userPerms.includes('products.delete');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [approvalFilter, setApprovalFilter] = useState('All');
    const [categories, setCategories] = useState<Category[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(siteSettings?.pagination_limit || 10);

    useEffect(() => {
        if (siteSettings?.pagination_limit) {
            setItemsPerPage(Number(siteSettings.pagination_limit) || 10);
        }
    }, [siteSettings?.pagination_limit]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/products');
            setProducts(data);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const fetchCategories = async () => {
        try { const { data } = await api.get('/categories'); setCategories(data); }
        catch (err) { console.error(err); }
    };

    const handleApprove = async (id: string) => {
        try { 
            await api.put(`/admin/products/${id}/approve`); 
            fetchProducts(); 
            showToast('Product approved successfully!', 'success');
        } catch (err: any) { 
            console.error(err); 
            showToast(err.response?.data?.message || 'Failed to approve product.', 'error');
        }
    };

    const handleReject = async (id: string) => {
        try { 
            await api.put(`/admin/products/${id}/reject`, { note: 'Disapproved by admin' }); 
            fetchProducts(); 
            showToast('Product rejected successfully.', 'success');
        } catch (err: any) { 
            console.error(err); 
            showToast(err.response?.data?.message || 'Failed to reject product.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this product?')) return;
        try { 
            await api.delete(`/admin/products/${id}`); 
            fetchProducts(); 
            showToast('Product deleted successfully.', 'success');
        } catch (err: any) { 
            console.error(err); 
            showToast(err.response?.data?.message || 'Failed to delete product.', 'error');
        }
    };

    const filteredProducts = products.filter((p: Product) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.supplier?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.supplier?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter.toLowerCase();
        const matchesApproval = approvalFilter === 'All' ||
            (approvalFilter === 'Approved' && p.approval_status === 'approved') ||
            (approvalFilter === 'Pending' && p.approval_status === 'pending') ||
            (approvalFilter === 'Rejected' && p.approval_status === 'rejected');
        const matchesCategory = categoryFilter === 'All' || p.category?._id === categoryFilter;
        return matchesSearch && matchesStatus && matchesApproval && matchesCategory;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    const stats = [
        { label: t('total_products') || 'Total Products', value: products.length },
        { label: t('active') || 'Active', value: products.filter((p: Product) => p.status === 'active').length },
        { label: t('pending_approval') || 'Pending Approval', value: products.filter((p: Product) => p.approval_status === 'pending').length },
        { label: t('rejected') || 'Rejected', value: products.filter((p: Product) => p.approval_status === 'rejected').length },
    ];

    if (formMode === 'add' || formMode === 'edit') {
        return (
            <ProductForm
                product={editingProduct as any}
                onSave={() => { setFormMode(null); setEditingProduct(null); fetchProducts(); }}
                onCancel={() => { setFormMode(null); setEditingProduct(null); }}
            />
        );
    }

    // Export CSV handler
    const handleExportCSV = () => {
        if (!products.length) return;
        const headers = ["Product Name", "SKU", "Seller", "Category", "Status", "Approval Status"];
        const rows = products.map(p => [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.sku || p._id}"`,
            `"${p.supplier?.company_name || `${p.supplier?.first_name || ''} ${p.supplier?.last_name || ''}`}"`,
            `"${p.category?.title || 'General'}"`,
            `"${p.status}"`,
            `"${p.approval_status}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `products_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
                <div style={{
                    width: '42px', height: '42px', border: '3.5px solid #e2e8f0',
                    borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{t('product_management') || 'Product Management'}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Products</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {canEdit && (
                        <button className={styles['usr-add-btn']} onClick={() => { setEditingProduct(null); setFormMode('add'); }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Add Product
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className={styles['usr-stats-grid']}>
                {stats.map((s, i) => (
                    <div key={i} className={styles['usr-stat-card']}>
                        <div className={styles['usr-stat-card-top']}>
                            <div className={styles['usr-stat-info']}>
                                <span className={styles['usr-stat-label']}>{s.label}</span>
                                <span className={styles['usr-stat-value']} style={{ color: i === 1 ? '#16a34a' : i === 2 ? '#d97706' : i === 3 ? '#dc2626' : '#0f172a' }}>
                                    {s.value}
                                </span>
                            </div>
                            <div className={styles['usr-stat-icon-wrap']} style={{
                                background: i === 1 ? '#f0fdf4' : i === 2 ? '#fef3c7' : i === 3 ? '#fef2f2' : '#fff5ee',
                                color: i === 1 ? '#16a34a' : i === 2 ? '#d97706' : i === 3 ? '#dc2626' : '#ff6a00'
                            }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Search & Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder={t('search_products') || "Search product by name, SKU or seller..."}
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {/* Approval filter */}
                    <select
                        className={styles['usr-filter-select']}
                        value={approvalFilter}
                        onChange={e => { setApprovalFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">{t('all_approvals') || 'All Approvals'}</option>
                        <option value="Approved">{t('approved') || 'Approved'}</option>
                        <option value="Pending">{t('pending') || 'Pending'}</option>
                        <option value="Rejected">{t('rejected') || 'Rejected'}</option>
                    </select>

                    {/* Category filter */}
                    <select
                        className={styles['usr-filter-select']}
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">{t('all_categories') || 'All Categories'}</option>
                        {categories.map((cat: Category) => (
                            <option key={cat._id} value={cat._id}>{cat.title}</option>
                        ))}
                    </select>

                    {/* Reset button */}
                    <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('All'); setCategoryFilter('All'); setApprovalFilter('All'); setCurrentPage(1); }}
                        className={styles['usr-filter-btn']}
                    >
                        {t('reset') || 'Reset'}
                    </button>

                    {/* View mode toggle */}
                    <div style={{ display: 'flex', gap: '4px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3px', marginLeft: 'auto', background: '#f8fafc' }}>
                        {(['table', 'grid'] as const).map((mode: 'table' | 'grid') => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    padding: '6px 12px', border: 'none', borderRadius: '9px', cursor: 'pointer',
                                    background: viewMode === mode ? '#ff6a00' : 'transparent',
                                    color: viewMode === mode ? '#fff' : '#64748b',
                                    fontWeight: 800, fontSize: '13px', transition: 'all 0.2s'
                                }}
                            >{mode === 'table' ? '☰ Table' : '⊞ Grid'}</button>
                        ))}
                    </div>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </div>

                {filteredProducts.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📦</div>
                        <p>{t('no_products_found') || 'No products matched your criteria.'}</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ── Grid View ── */
                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
                        {currentProducts.map(product => {
                            const cleanPath = product.images?.[0] ? (product.images[0].startsWith('/') ? product.images[0].slice(1) : product.images[0]) : null;
                            const imgSrc = cleanPath ? (cleanPath.startsWith('http') ? cleanPath : `${IMAGE_URL.replace(/\/+$/, '')}/${cleanPath}`) : null;
                            const approvalSt = product.approval_status;
                            return (
                                <div key={product._id} style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: '170px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                        {!imgSrc && <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>📦</span>}
                                        {imgSrc && (
                                            <img 
                                                src={imgSrc} 
                                                alt={product.name} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                onError={(e: any) => { e.target.style.display = 'none'; }} 
                                            />
                                        )}
                                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase',
                                                background: approvalSt === 'approved' ? '#f0fdf4' : approvalSt === 'pending' ? '#fff7ed' : '#fef2f2',
                                                color: approvalSt === 'approved' ? '#16a34a' : approvalSt === 'pending' ? '#ea580c' : '#dc2626'
                                            }}>
                                                {approvalSt}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                                            {product.category?.title || 'General'}
                                        </div>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '38px', lineHeight: '1.3' }}>
                                            {product.name}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                                                Seller: {product.supplier?.company_name || product.supplier?.first_name || 'Global'}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div className={styles['usr-actions-cell']}>
                                                {canEdit && (
                                                    <button className={styles['usr-icon-btn']} title="Edit product" onClick={() => { setEditingProduct(product); setFormMode('edit'); }}>
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`} title="Delete product" onClick={() => handleDelete(product._id)}>
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Table View ── */
                    <div className={styles['usr-table-wrap']}>
                        <table className={styles['usr-table']}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Seller</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Approval</th>
                                    {(canEdit || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.map(product => {
                                    const cleanPath = product.images?.[0] ? (product.images[0].startsWith('/') ? product.images[0].slice(1) : product.images[0]) : null;
                                    const imgSrc = cleanPath ? (cleanPath.startsWith('http') ? cleanPath : `${IMAGE_URL.replace(/\/+$/, '')}/${cleanPath}`) : null;
                                    const approvalSt = product.approval_status;
                                    return (
                                        <tr key={product._id}>
                                            <td>
                                                <div className={styles['usr-cell']}>
                                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', position: 'relative' }}>
                                                        <span style={{ fontSize: '16px', position: 'absolute' }}>📦</span>
                                                        {imgSrc && (
                                                            <img 
                                                                src={imgSrc} 
                                                                alt="" 
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} 
                                                                onError={(e: any) => { e.target.style.display = 'none'; }} 
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={styles['usr-name']} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {product.name}
                                                        </div>
                                                        <div className={styles['usr-id']}>SKU: #{product._id.substring(18, 24).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                                                {product.supplier?.company_name || product.supplier?.first_name || 'Global'}
                                            </td>
                                            <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                                {product.category?.title || 'General'}
                                            </td>
                                            <td>
                                                <div className={styles['usr-status-active']} style={{
                                                    background: product.status === 'active' ? '#f0fdf4' : '#fef2f2',
                                                    color: product.status === 'active' ? '#16a34a' : '#dc2626'
                                                }}>
                                                    <span className={styles['dot']} style={{
                                                        background: product.status === 'active' ? '#16a34a' : '#dc2626'
                                                    }}></span>
                                                    {product.status}
                                                </div>
                                            </td>
                                            <td>
                                                {approvalSt === 'pending' ? (
                                                    <button onClick={() => handleApprove(product._id)} style={{ padding: '4px 12px', borderRadius: '20px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}>
                                                        Approve
                                                    </button>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase',
                                                        background: approvalSt === 'approved' ? '#f0fdf4' : '#fef2f2',
                                                        color: approvalSt === 'approved' ? '#16a34a' : '#dc2626'
                                                    }}>
                                                        {approvalSt}
                                                    </span>
                                                )}
                                            </td>
                                            {(canEdit || canDelete) && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                        {canEdit && (
                                                            <button className={styles['usr-icon-btn']} title="Edit product" onClick={() => { setEditingProduct(product); setFormMode('edit'); }}>
                                                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`} title="Delete product" onClick={() => handleDelete(product._id)}>
                                                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles['usr-pagination-bar']}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Showing Page {currentPage} of {totalPages} ({filteredProducts.length} total products)
                        </span>
                        <div className={styles['usr-pagination-pages']}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p: number) => p - 1)} className={styles['usr-page-arrow']}>
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
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p: number) => p + 1)} className={styles['usr-page-arrow']}>
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProducts;

