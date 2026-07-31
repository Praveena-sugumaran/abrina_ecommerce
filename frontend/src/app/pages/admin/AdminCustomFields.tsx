'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface CustomField {
    _id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    minLength?: number | null;
    maxLength?: number | null;
    options: string[];
    categories: { _id: string; title: string }[];
    isRequired: boolean;
    icon: string;
    order: number;
    status?: 'active' | 'inactive';
}

const AdminCustomFields = () => {
    const { showToast } = useToast();
    const router = useRouter();

    const [fields, setFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await api.get('/custom-fields');
            setFields(res.data || []);
        } catch {
            showToast('Failed to load custom fields', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(data.pagination_limit);
            } catch (err) {}
        };
        fetchSettings();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/custom-fields/${id}`);
            showToast('Custom field deleted successfully', 'success');
            setDeleteConfirmId(null);
            fetchFields();
        } catch {
            showToast('Failed to delete custom field', 'error');
        }
    };

    const getVisibleFields = () => {
        if (searchTerm) {
            return fields.filter(field => field.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return fields;
    };

    const visibleFields = getVisibleFields();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentFields = visibleFields.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(visibleFields.length / itemsPerPage);

    const handleExportCSV = () => {
        if (!visibleFields.length) return;
        const headers = ["Field Name", "Type", "Required", "Status", "Categories", "Options Count", "Order"];
        const rows = visibleFields.map(f => [
            `"${f.name.replace(/"/g, '""')}"`,
            `"${f.type}"`,
            `"${f.isRequired ? 'Yes' : 'No'}"`,
            `"${f.status || 'active'}"`,
            `"${f.categories ? f.categories.map(c => c.title).join('; ') : ''}"`,
            `"${f.options ? f.options.length : 0}"`,
            `"${f.order || 0}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `custom_fields_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const stats = [
        {
            label: 'Total Custom Fields',
            value: fields.length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
            ),
            bg: '#eff6ff',
            color: '#2563eb'
        },
        {
            label: 'Active Fields',
            value: fields.filter(f => f.status === 'active' || !f.status).length,
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
            label: 'Inactive Fields',
            value: fields.filter(f => f.status === 'inactive').length,
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
            label: 'Required Fields',
            value: fields.filter(f => f.isRequired).length,
            icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
                    <h1 className={styles['usr-page-title']}>Custom Fields</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Custom Fields</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <Link
                        href="/admin/custom-fields/create"
                        className={styles['usr-add-btn']}
                        style={{ textDecoration: 'none' }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                        </svg>
                        Create Custom Field
                    </Link>
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
                            placeholder="Search custom fields by name..."
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
                    Showing {visibleFields.length} custom fields
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>Field Name</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Status</th>
                                <th>Categories</th>
                                <th>Options</th>
                                <th>Order</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', border: '3.5px solid #e2e8f0',
                                                borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Loading custom fields...</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentFields.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                        No custom fields found{searchTerm ? ` for "${searchTerm}"` : ''}.
                                    </td>
                                </tr>
                            ) : (
                                currentFields.map(field => (
                                    <tr key={field._id}>
                                        {/* Field Name */}
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']} style={{ background: '#f8fafc', color: '#475569' }}>
                                                    {field.type === 'text' ? '📝' : field.type === 'number' ? '🔢' : field.type === 'select' ? '📇' : '📄'}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{field.name}</div>
                                                    <div className={styles['usr-id']}>#{field._id?.substring(18, 24).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.76rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' }}>
                                                {field.type}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                                                background: field.isRequired ? '#fef2f2' : '#f0fdf4',
                                                color: field.isRequired ? '#dc2626' : '#16a34a'
                                            }}>
                                                ● {field.isRequired ? 'YES' : 'NO'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={field.status === 'inactive' ? styles['usr-status-inactive'] : styles['usr-status-active']}>
                                                <span className={styles['dot']}></span>
                                                {field.status || 'active'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                                                {field.categories && field.categories.length > 0 ? field.categories.slice(0, 3).map(c => (
                                                    <span key={c._id} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce' }}>
                                                        {c.title}
                                                    </span>
                                                )) : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>}
                                                {field.categories && field.categories.length > 3 && (
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>+{field.categories.length - 3} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {field.type === 'select' ? (
                                                <span style={{ fontSize: '0.76rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb' }}>
                                                    {field.options ? field.options.length : 0} options
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.84rem' }}>
                                            {field.order || 0}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                {/* Edit Icon */}
                                                <button
                                                    onClick={() => router.push(`/admin/custom-fields/create?id=${field._id}`)}
                                                    className={styles['usr-icon-btn']}
                                                    title="Edit Field"
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                </button>
                                                {/* Delete Icon */}
                                                <button
                                                    onClick={() => setDeleteConfirmId(field._id)}
                                                    className={styles['usr-icon-btn-delete']}
                                                    title="Delete Field"
                                                >
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
                            Showing Page {currentPage} of {totalPages} ({visibleFields.length} custom fields)
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
            {deleteConfirmId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Delete Custom Field?</h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '24px' }}>
                            This action permanently removes this custom field. Existing products using this field will no longer display its value.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '8px 18px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '8px 18px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Confirm Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCustomFields;
