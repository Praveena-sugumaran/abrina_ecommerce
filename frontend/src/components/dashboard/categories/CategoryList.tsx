import React, { useState, useEffect } from 'react';
import { fetchCategories, deleteCategory } from '@/services/categoryApi';
import api from '@/services/axiosConfig';
import styles from '@/app/pages/admin/AdminLayout.module.css';
import { getImgUrl } from '@/utils/imageConfig';

interface Category {
    _id: string;
    title: string;
    slug?: string;
    status?: string;
    image?: string;
    order?: number;
    children?: Category[];
}

const CategoryList = ({ onAdd, onEdit }: { onAdd: (parentId?: string | null) => void; onEdit: (cat: Category) => void }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [activeParent, setActiveParent] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        load();
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(data.pagination_limit);
            } catch (err) {}
        };
        fetchSettings();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await fetchCategories();
            setCategories(data);
        } catch (err) {
            setError('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCategory(id);
            setConfirmDelete(null);
            load();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleExportCSV = () => {
        if (!visibleCategories.length) return;
        const headers = ["Category Title", "Slug", "Status", "Subcategories Count", "Sort Order"];
        const rows = visibleCategories.map(c => [
            `"${c.title.replace(/"/g, '""')}"`,
            `"${c.slug || ''}"`,
            `"${c.status || 'active'}"`,
            `"${c.children?.length || 0}"`,
            `"${c.order || 0}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getVisibleCategories = () => {
        if (searchTerm) {
            const flatten = (items: Category[]): Category[] => {
                let res: Category[] = [];
                items.forEach(item => {
                    if (item.title.toLowerCase().includes(searchTerm.toLowerCase())) res.push(item);
                    if (item.children) res = [...res, ...flatten(item.children)];
                });
                return res;
            };
            return flatten(categories);
        }
        if (activeParent) return activeParent.children || [];
        return categories;
    };

    const visibleCategories = getVisibleCategories();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCategories = visibleCategories.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(visibleCategories.length / itemsPerPage);

    const handleViewSubcategories = (cat: Category) => { setActiveParent(cat); setCurrentPage(1); };
    const handleGoBack = () => {
        if (!activeParent) return;
        const findParent = (items: Category[], targetId: string): Category | null => {
            for (let item of items) {
                if (item.children?.some((c: Category) => c._id === targetId)) return item;
                if (item.children) { const found = findParent(item.children, targetId); if (found) return found; }
            }
            return null;
        };
        setActiveParent(findParent(categories, activeParent._id));
        setCurrentPage(1);
    };

    const stats = [
        {
            label: 'Total Categories',
            value: categories.length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
            ),
            bg: '#eff6ff',
            color: '#2563eb'
        },
        {
            label: 'Active',
            value: categories.filter(c => c.status === 'active').length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            ),
            bg: '#f0fdf4',
            color: '#16a34a'
        },
        {
            label: 'Inactive',
            value: categories.filter(c => c.status !== 'active').length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="10" y1="15" x2="10" y2="9"/>
                    <line x1="14" y1="15" x2="14" y2="9"/>
                </svg>
            ),
            bg: '#fef2f2',
            color: '#dc2626'
        },
        {
            label: 'With Subcategories',
            value: categories.filter(c => (c.children?.length || 0) > 0).length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                </svg>
            ),
            bg: '#fff7ed',
            color: '#ea580c'
        },
    ];

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Category Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Categories</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <button className={styles['usr-add-btn']} onClick={() => onAdd(activeParent?._id)}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                        Add Category
                    </button>
                </div>
            </div>

            {/* Stats Row */}
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

            {/* Breadcrumb / Back nav */}
            {activeParent && (
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={handleGoBack} className={styles['usr-btn-reset']} style={{ padding: '6px 14px', borderRadius: '10px' }}>
                        ‹ Back to All
                    </button>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>›</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{activeParent.title}</span>
                    <span style={{ fontSize: '12px', background: '#eff6ff', borderRadius: '20px', padding: '2px 10px', fontWeight: 700, color: '#2563eb' }}>
                        {activeParent.children?.length || 0} subcategories
                    </span>
                </div>
            )}

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
                            placeholder="Search categories by name..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className={styles['usr-btn-reset']}>
                            Clear Search
                        </button>
                    )}
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {visibleCategories.length} {activeParent ? `subcategories in "${activeParent.title}"` : 'categories'}
                </div>

                {error && <div style={{ margin: '16px 20px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>{error}</div>}

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Slug</th>
                                <th>Status</th>
                                <th>Subcategories</th>
                                <th>Sort Order</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading categories...</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                        No categories found{searchTerm ? ` for "${searchTerm}"` : ''}.
                                    </td>
                                </tr>
                            ) : (
                                currentCategories.map(cat => (
                                    <tr key={cat._id}>
                                        {/* Category name + image */}
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']} style={{ background: '#f8fafc', color: '#475569', overflow: 'hidden' }}>
                                                    {cat.image ? (
                                                        <img src={getImgUrl(cat.image)} alt={cat.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                                                    ) : (
                                                        <span>🗂️</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{cat.title}</div>
                                                    <div className={styles['usr-id']}>#{cat._id?.substring(18, 24).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>/{cat.slug}</td>
                                        <td>
                                            <div className={cat.status === 'inactive' ? styles['usr-status-inactive'] : styles['usr-status-active']}>
                                                <span className={styles['dot']}></span>
                                                {cat.status || 'active'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.76rem', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb' }}>
                                                    {cat.children?.length || 0}
                                                </span>
                                                {(cat.children && cat.children.length > 0) && (
                                                    <button
                                                        onClick={() => handleViewSubcategories(cat)}
                                                        style={{ padding: '3px 9px', borderRadius: '8px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                                                    >
                                                        View
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.84rem' }}>{cat.order || 0}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                {/* Edit Icon */}
                                                <button onClick={() => onEdit(cat)} className={styles['usr-icon-btn']} title="Edit Category">
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                </button>
                                                {/* Delete Icon */}
                                                <button onClick={() => setConfirmDelete(cat._id)} className={styles['usr-icon-btn-delete']} title="Delete Category">
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <polyline points="3 6 5 6 21 6"/>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles['usr-pagination-bar']}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Showing Page {currentPage} of {totalPages} ({visibleCategories.length} categories)
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

            {/* Delete Confirm Modal */}
            {confirmDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Delete Category?</h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '24px' }}>
                            This action permanently removes the category. Subcategories may become orphaned.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 18px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '8px 18px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Confirm Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryList;
