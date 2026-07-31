import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface RoleItem {
    _id: string;
    name: string;
    status: string;
    permissions?: string[];
}

interface WarehouseListItem {
    _id: string;
    name: string;
    code: string;
}

interface SubAdminItem {
    _id: string;
    name: string;
    email: string;
    role_id?: RoleItem;
    assignedWarehouses?: Array<string | { _id: string; name: string; code: string }>;
    status: 'active' | 'inactive';
    createdAt: string;
}

const AdminSubAdmins: React.FC = () => {
    const { t, user } = useAuth();
    const [subAdmins, setSubAdmins] = useState<SubAdminItem[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [search, setSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [editingAdmin, setEditingAdmin] = useState<SubAdminItem | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Form fields
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [roleId, setRoleId] = useState<string>('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [resetPassword, setResetPassword] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const [formError, setFormError] = useState<string>('');
    const [pageError, setPageError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Query permissions for user authorization
    const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];

    const canCreate = isSuperAdmin || userPerms.includes('users.create');
    const canEdit = isSuperAdmin || userPerms.includes('users.edit');
    const canDelete = isSuperAdmin || userPerms.includes('users.delete');

    const fetchSubAdmins = async () => {
        setLoading(true);
        setPageError('');
        try {
            const res = await api.get('/admin/sub-admins', {
                params: { search, page, limit }
            });
            setSubAdmins(res.data.subAdmins || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch sub-admins');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            // Fetch all active roles (limit high enough or query all)
            const res = await api.get('/admin/roles', { params: { limit: 100 } });
            setRoles((res.data.roles || []).filter((r: RoleItem) => r.status === 'active'));
        } catch (err) {
            console.error('Error fetching roles', err);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses', { params: { status: 'active', limit: 1000 } });
            setWarehouses(res.data.warehouses || []);
        } catch (err) {
            console.error('Error fetching active warehouses', err);
        }
    };

    useEffect(() => {
        fetchSubAdmins();
    }, [page, search]);

    useEffect(() => {
        fetchRoles();
        fetchWarehouses();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingAdmin(null);
        setName('');
        setEmail('');
        setPassword('');
        setRoleId('');
        setSelectedWarehouseId('');
        setStatus('active');
        setResetPassword(false);
        setShowPassword(false);
        setFormError('');
        setModalOpen(true);
    };

    const handleOpenEditModal = (admin: SubAdminItem) => {
        setEditingAdmin(admin);
        setName(admin.name);
        setEmail(admin.email);
        setPassword('');
        setRoleId(admin.role_id?._id || '');
        const firstWh = admin.assignedWarehouses?.[0];
        setSelectedWarehouseId(firstWh ? (typeof firstWh === 'string' ? firstWh : firstWh._id) : '');
        setStatus(admin.status);
        setResetPassword(false);
        setShowPassword(false);
        setFormError('');
        setModalOpen(true);
    };

    // Password strength logic
    const checkPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, text: 'No Password Entered', color: '#cbd5e1' };
        
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/\d/.test(pass)) score++;
        if (/[@$!%*?&]/.test(pass)) score++;

        if (score <= 2) return { score, text: 'Weak (Must contain uppercase, lowercase, number, special char)', color: '#ef4444' };
        if (score <= 4) return { score, text: 'Medium (Good, but add special symbols or numbers)', color: '#f59e0b' };
        return { score, text: 'Strong Password', color: '#10b981' };
    };

    const strength = checkPasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !roleId) {
            setFormError('Name, email, and role are required fields.');
            return;
        }

        const selectedRoleObj = roles.find(r => r._id === roleId);
        const showWarehouseDropdown = selectedRoleObj ? (
            selectedRoleObj.name.toLowerCase().includes('warehouse') ||
            (selectedRoleObj.permissions && selectedRoleObj.permissions.some(p => p.startsWith('warehouse')))
        ) : false;

        if (showWarehouseDropdown && !selectedWarehouseId) {
            setFormError('Please assign a warehouse for the Warehouse role.');
            return;
        }

        // Validate password if creating or resetting password
        if (!editingAdmin || (resetPassword && password)) {
            const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!pwRegex.test(password)) {
                setFormError('Password must be at least 8 characters, and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.');
                return;
            }
        }

        setSubmitting(true);
        setFormError('');
        try {
            const payload: any = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role_id: roleId,
                status,
                assignedWarehouses: showWarehouseDropdown && selectedWarehouseId ? [selectedWarehouseId] : []
            };

            if (!editingAdmin) {
                payload.password = password;
            } else if (resetPassword) {
                payload.resetPassword = true;
                payload.password = password;
            }

            if (editingAdmin) {
                await api.put(`/admin/sub-admins/${editingAdmin._id}`, payload);
                setSuccessMessage('Sub-Admin updated successfully!');
            } else {
                await api.post('/admin/sub-admins', payload);
                setSuccessMessage('Sub-Admin created successfully!');
            }

            setModalOpen(false);
            fetchSubAdmins();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Error processing request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this Sub-Admin?')) return;
        setPageError('');
        try {
            await api.delete(`/admin/sub-admins/${id}`);
            setSuccessMessage('Sub-Admin deleted successfully!');
            fetchSubAdmins();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to delete Sub-Admin');
        }
    };

    const selectedRoleObj = roles.find(r => r._id === roleId);
    const showWarehouseDropdown = selectedRoleObj ? (
        selectedRoleObj.name.toLowerCase().includes('warehouse') ||
        (selectedRoleObj.permissions && selectedRoleObj.permissions.some(p => p.startsWith('warehouse')))
    ) : false;

    const pages = Math.ceil(total / limit);

    const handleExportCSV = () => {
        if (!subAdmins.length) return;
        const headers = ["Sub-Admin Name", "Email Address", "Assigned Role", "Status", "Created Date"];
        const rows = subAdmins.map(a => [
            `"${a.name}"`,
            `"${a.email}"`,
            `"${a.role_id?.name || 'Unassigned'}"`,
            `"${a.status}"`,
            `"${new Date(a.createdAt).toLocaleDateString()}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sub_admins_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Sub-Admin Management</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Sub-Admin Users</span>
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
                            Add Sub-Admin
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
                            placeholder="Search sub-admins by name or email..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {subAdmins.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} sub-admin accounts
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                            Fetching sub-administrator accounts...
                        </div>
                    ) : (
                        <table className={styles['usr-table']}>
                            <thead>
                                <tr>
                                    <th>User Details</th>
                                    <th>Email Address</th>
                                    <th>Assigned Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    {(canEdit || canDelete) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {subAdmins.length > 0 ? subAdmins.map((admin) => (
                                    <tr key={admin._id}>
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']} style={{ background: '#ffedd5', color: '#ea580c' }}>
                                                    {admin.name?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{admin.name}</div>
                                                    <div className={styles['usr-id']}>ID: {admin._id.slice(-6).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: '#475569', fontSize: '0.84rem', fontWeight: 500 }}>
                                            {admin.email}
                                        </td>
                                        <td>
                                            <span className={styles['usr-type-badge']} style={{ background: '#fff7ed', color: '#ea580c', fontWeight: 800 }}>
                                                {admin.role_id?.name || 'Unassigned'}
                                            </span>
                                            {admin.assignedWarehouses && admin.assignedWarehouses.length > 0 && (
                                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', fontWeight: 600 }}>
                                                    {admin.assignedWarehouses.map((w: any) => typeof w === 'string' ? w : w.name).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles['usr-status-active']}>
                                                <span className={styles['dot']}></span>
                                                {admin.status}
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {new Date(admin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        {(canEdit || canDelete) && (
                                            <td>
                                                <div className={styles['usr-actions-cell']}>
                                                    {canEdit && (
                                                        <button className={styles['usr-icon-btn']} title="Edit sub-admin" onClick={() => handleOpenEditModal(admin)}>
                                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`} title="Delete sub-admin" onClick={() => handleDelete(admin._id)}>
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
                                            No sub-admins configured yet.
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
                            Showing Page {page} of {pages} ({total} total sub-admins)
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

            {/* Create / Edit Sub-Admin Modal */}
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
                        maxWidth: '550px',
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
                                {editingAdmin ? 'Edit Sub-Admin Details' : 'Add Sub-Admin User'}
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

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Sub-Admin Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Full Name"
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
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        style={{
                                            width: '100%', height: '42px', borderRadius: '10px',
                                            border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px',
                                            fontSize: '14px', outline: 'none'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Assign Role *
                                        </label>
                                        <select
                                            value={roleId}
                                            onChange={(e) => setRoleId(e.target.value)}
                                            style={{
                                                width: '100%', height: '42px', borderRadius: '10px',
                                                border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px',
                                                fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer'
                                            }}
                                            required
                                        >
                                            <option value="">-- Select Role --</option>
                                            {roles.map((role) => (
                                                <option key={role._id} value={role._id}>{role.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
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

                                {showWarehouseDropdown && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Assigned Warehouse *
                                        </label>
                                        <select
                                            value={selectedWarehouseId}
                                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                            style={{
                                                width: '100%', height: '42px', borderRadius: '10px',
                                                border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px',
                                                fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer'
                                            }}
                                            required
                                        >
                                            <option value="">-- Select Warehouse --</option>
                                            {warehouses.map((wh) => (
                                                <option key={wh._id} value={wh._id}>
                                                    {wh.name} ({wh.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Edit admin: Reset password check */}
                                {editingAdmin && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '8px 0' }}>
                                        <input
                                            type="checkbox"
                                            checked={resetPassword}
                                            onChange={(e) => {
                                                setResetPassword(e.target.checked);
                                                if (!e.target.checked) setPassword('');
                                            }}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-text-secondary, #334155)' }}>
                                            Reset Password for this Sub-Admin
                                        </span>
                                    </label>
                                )}

                                {/* Password field */}
                                {(!editingAdmin || resetPassword) && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Password *
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter password"
                                                style={{
                                                    width: '100%', height: '42px', borderRadius: '10px',
                                                    border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 40px 0 12px',
                                                    fontSize: '14px', outline: 'none'
                                                }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 0
                                                }}
                                            >
                                                {showPassword ? (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                                    </svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        
                                        {/* Strength meter */}
                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#e2e8f0' }}>
                                                <div style={{
                                                    width: `${(strength.score / 5) * 100}%`,
                                                    background: strength.color,
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '11px', color: strength.color, fontWeight: '700', marginTop: '4px', display: 'block' }}>
                                                {strength.text}
                                            </span>
                                        </div>
                                    </div>
                                )}
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
                                    {submitting ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Add Sub-Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubAdmins;
