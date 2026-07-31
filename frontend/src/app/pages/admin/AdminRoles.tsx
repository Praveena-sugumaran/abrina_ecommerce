import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface RoleItem {
    _id: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    permissions: string[];
    permissionsCount: number;
    createdAt: string;
}

interface PermissionItem {
    _id: string;
    module_name: string;
    permission_name: string;
    slug: string;
}

const AdminRoles: React.FC = () => {
    const { t, user } = useAuth();
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [search, setSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Form fields
    const [roleName, setRoleName] = useState<string>('');
    const [roleDesc, setRoleDesc] = useState<string>('');
    const [roleStatus, setRoleStatus] = useState<'active' | 'inactive'>('active');
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    
    const [formError, setFormError] = useState<string>('');
    const [pageError, setPageError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Query permissions for user authorization
    const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];
    
    const canCreate = isSuperAdmin || userPerms.includes('roles.create');
    const canEdit = isSuperAdmin || userPerms.includes('roles.edit');
    const canDelete = isSuperAdmin || userPerms.includes('roles.delete');

    const fetchRoles = async () => {
        setLoading(true);
        setPageError('');
        try {
            const res = await api.get('/admin/roles', {
                params: { search, page, limit }
            });
            setRoles(res.data.roles || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch roles');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const res = await api.get('/admin/permissions');
            setPermissions(res.data || []);
        } catch (err) {
            console.error('Error fetching permissions', err);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [page, search]);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingRole(null);
        setRoleName('');
        setRoleDesc('');
        setRoleStatus('active');
        setSelectedPerms([]);
        setFormError('');
        setModalOpen(true);
    };

    const handleOpenEditModal = (role: RoleItem) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRoleDesc(role.description || '');
        setRoleStatus(role.status);
        setSelectedPerms(role.permissions || []);
        setFormError('');
        setModalOpen(true);
    };

    const handleTogglePermission = (slug: string) => {
        if (selectedPerms.includes(slug)) {
            setSelectedPerms(selectedPerms.filter(p => p !== slug));
        } else {
            setSelectedPerms([...selectedPerms, slug]);
        }
    };

    const handleToggleModule = (moduleName: string, moduleSlugs: string[]) => {
        const allSelected = moduleSlugs.every(slug => selectedPerms.includes(slug));
        if (allSelected) {
            setSelectedPerms(selectedPerms.filter(slug => !moduleSlugs.includes(slug)));
        } else {
            const toAdd = moduleSlugs.filter(slug => !selectedPerms.includes(slug));
            setSelectedPerms([...selectedPerms, ...toAdd]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleName.trim()) {
            setFormError('Role Name is required');
            return;
        }
        setSubmitting(true);
        setFormError('');
        try {
            const payload = {
                name: roleName.trim(),
                description: roleDesc.trim(),
                status: roleStatus,
                permissions: selectedPerms
            };

            if (editingRole) {
                await api.put(`/admin/roles/${editingRole._id}`, payload);
                setSuccessMessage('Role updated successfully!');
            } else {
                await api.post('/admin/roles', payload);
                setSuccessMessage('Role created successfully!');
            }

            setModalOpen(false);
            fetchRoles();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Error processing request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        setPageError('');
        try {
            await api.delete(`/admin/roles/${id}`);
            setSuccessMessage('Role deleted successfully!');
            fetchRoles();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to delete role');
        }
    };

    // Group system permissions by module
    const groupedPermissions = permissions.reduce((acc, curr) => {
        if (!acc[curr.module_name]) {
            acc[curr.module_name] = [];
        }
        acc[curr.module_name].push(curr);
        return acc;
    }, {} as Record<string, PermissionItem[]>);

    const pages = Math.ceil(total / limit);

    const handleExportCSV = () => {
        if (!roles.length) return;
        const headers = ["Role Name", "Description", "Type", "Permissions Count", "Assigned Users Count"];
        const rows = roles.map(r => [
            `"${r.name}"`,
            `"${(r.description || '').replace(/"/g, '""')}"`,
            `"${r.is_system ? 'System Role' : 'Custom Role'}"`,
            `"${r.permissions ? r.permissions.length : 0}"`,
            `"${r.userCount || 0}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `roles_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Role Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Roles & Permissions</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    {canCreate && (
                        <button className={styles['usr-add-btn']} onClick={handleOpenCreateModal}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Create Custom Role
                        </button>
                    )}
                </div>
            </div>

            {successMessage && (
                <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#e8f5e9', color: '#16a34a', fontWeight: '700', fontSize: '0.86rem' }}>
                    {successMessage}
                </div>
            )}

            {pageError && (
                <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>
                    {pageError}
                </div>
            )}

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Search Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search roles by name or description..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {roles.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} custom roles
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                            Fetching role configurations...
                        </div>
                    ) : (
                        <table className={styles['usr-table']}>
                            <thead>
                                <tr>
                                    <th>Role Name</th>
                                    <th>Description</th>
                                    <th>Permissions</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    {(canEdit || canDelete) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {roles.length > 0 ? roles.map((role) => (
                                    <tr key={role._id}>
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']} style={{ background: '#eff6ff', color: '#2563eb' }}>
                                                    {role.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{role.name}</div>
                                                    <div className={styles['usr-id']}>ID: {role._id.slice(-6).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.84rem', maxWidth: '280px' }}>
                                            {role.description || 'No description provided'}
                                        </td>
                                        <td>
                                            <span className={styles['usr-type-badge']} style={{ background: '#f3e8ff', color: '#9333ea', fontWeight: 800 }}>
                                                {role.permissionsCount} Permissions
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles['usr-status-active']}>
                                                <span className={styles['dot']}></span>
                                                {role.status}
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {new Date(role.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        {(canEdit || canDelete) && (
                                            <td>
                                                <div className={styles['usr-actions-cell']}>
                                                    {canEdit && (
                                                        <button className={styles['usr-icon-btn']} title="Edit role" onClick={() => handleOpenEditModal(role)}>
                                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`} title="Delete role" onClick={() => handleDelete(role._id)}>
                                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                            No custom roles configured yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className={styles['usr-pagination-bar']}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Showing Page {page} of {pages} ({total} total roles)
                        </span>
                        <div className={styles['usr-pagination-pages']}>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles['usr-page-arrow']}>
                                ‹
                            </button>
                            {Array.from({ length: pages }).map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles['usr-page-num']} ${page === idx + 1 ? styles['usr-active'] : ''}`}
                                    onClick={() => setPage(idx + 1)}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className={styles['usr-page-arrow']}>
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Role Modal */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--admin-card-bg, #ffffff)',
                        border: '1px solid var(--admin-border, #e2e8f0)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            background: 'var(--primary-color, #0d2e67)',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {editingRole ? 'Edit Role Permissions' : 'Create Custom Role'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {formError && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                                        {formError}
                                    </div>
                                )}

                                {/* Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Role Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={roleName}
                                            onChange={(e) => setRoleName(e.target.value)}
                                            placeholder="e.g. Marketing Manager"
                                            style={{
                                                width: '100%', height: '42px', borderRadius: '10px',
                                                border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px',
                                                fontSize: '14px', outline: 'none'
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Status
                                        </label>
                                        <select
                                            value={roleStatus}
                                            onChange={(e) => setRoleStatus(e.target.value as 'active' | 'inactive')}
                                            style={{
                                                width: '100%', height: '42px', borderRadius: '10px',
                                                border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px',
                                                fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer'
                                            }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={roleDesc}
                                        onChange={(e) => setRoleDesc(e.target.value)}
                                        placeholder="Briefly explain scope of this role..."
                                        style={{
                                            width: '100%', height: '60px', borderRadius: '10px',
                                            border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '8px 12px',
                                            fontSize: '14px', outline: 'none', resize: 'none'
                                        }}
                                    />
                                </div>

                                {/* Permissions checklist */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1.5px solid var(--admin-border, #e2e8f0)', paddingBottom: '6px' }}>
                                        Configure Permissions *
                                    </label>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {Object.keys(groupedPermissions).map(moduleName => {
                                            const moduleSlugs = groupedPermissions[moduleName].map(p => p.slug);
                                            const isAllSelected = moduleSlugs.every(slug => selectedPerms.includes(slug));
                                            
                                            return (
                                                <div
                                                    key={moduleName}
                                                    style={{
                                                        background: 'var(--admin-bg, #f8fafc)',
                                                        border: '1px solid var(--admin-border-subtle, #f0f4ff)',
                                                        borderRadius: '16px',
                                                        padding: '16px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary-color, #0d2e67)' }}>
                                                            {moduleName}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleModule(moduleName, moduleSlugs)}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#ff6600',
                                                                fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: 0
                                                            }}
                                                        >
                                                            {isAllSelected ? 'Deselect All' : 'Select All'}
                                                        </button>
                                                    </div>
                                                    
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                        {groupedPermissions[moduleName].map(perm => {
                                                            const isChecked = selectedPerms.includes(perm.slug);
                                                            return (
                                                                <label
                                                                    key={perm._id}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                                        cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                                                                        background: isChecked ? 'rgba(255, 102, 0, 0.05)' : 'transparent',
                                                                        border: isChecked ? '1px solid rgba(255, 102, 0, 0.2)' : '1px solid transparent',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => handleTogglePermission(perm.slug)}
                                                                        style={{ cursor: 'pointer', accentColor: 'var(--primary-color, #0d2e67)' }}
                                                                    />
                                                                    <span style={{ fontSize: '12.5px', fontWeight: isChecked ? '700' : '500', color: isChecked ? 'var(--admin-text-main, #0d2e67)' : '#475569' }}>
                                                                        {perm.permission_name}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--admin-border, #e2e8f0)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                background: 'var(--admin-bg, #f8fafc)'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    style={{
                                        padding: '10px 20px', borderRadius: '10px',
                                        border: '1px solid #cbd5e1', background: '#fff',
                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 24px', borderRadius: '10px',
                                        border: 'none', background: 'var(--primary-color, #0d2e67)',
                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#fff',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoles;
