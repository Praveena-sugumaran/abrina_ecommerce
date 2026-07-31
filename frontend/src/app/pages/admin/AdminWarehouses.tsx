'use client';
import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface Manager {
    _id: string;
    name: string;
    email: string;
}

interface WarehouseItem {
    _id: string;
    name: string;
    code: string;
    address: string;
    warehouse_type: 'Main' | 'Regional' | 'Retail' | 'Dropship' | 'Returns';
    low_stock_threshold: number;
    contact_email?: string;
    contact_phone?: string;
    assigned_managers: Manager[];
    status: 'active' | 'inactive';
    createdAt: string;
}

interface SubAdmin {
    _id: string;
    name: string;
    email: string;
}

const PHONE_CODES = [
    { code: '+91', country: 'IN' },
    { code: '+1', country: 'US/CA' },
    { code: '+44', country: 'UK' },
    { code: '+86', country: 'CN' },
    { code: '+61', country: 'AU' },
    { code: '+971', country: 'AE' },
    { code: '+65', country: 'SG' },
    { code: '+49', country: 'DE' },
    { code: '+33', country: 'FR' },
    { code: '+81', country: 'JP' },
];

const AdminWarehouses: React.FC = () => {
    const { t, user } = useAuth();
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [managers, setManagers] = useState<SubAdmin[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Form fields
    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [type, setType] = useState<'Main' | 'Regional' | 'Retail' | 'Dropship' | 'Returns'>('Main');
    const [threshold, setThreshold] = useState<number>(10);
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [phoneCode, setPhoneCode] = useState<string>('+91');
    const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
    const [status, setStatus] = useState<'active' | 'inactive'>('active');

    // Metrics
    const [metrics, setMetrics] = useState({
        totalCount: 0,
        activeCount: 0,
        totalStock: 0,
        lowStockItems: 0
    });

    const [formError, setFormError] = useState<string>('');
    const [pageError, setPageError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Permissions
    const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];

    const canCreate = isSuperAdmin || userPerms.includes('warehouses.create');
    const canEdit = isSuperAdmin || userPerms.includes('warehouses.edit');
    const canDelete = isSuperAdmin; // Soft-deactivate (Super Admin only)

    const fetchWarehouses = async () => {
        setLoading(true);
        setPageError('');
        try {
            const res = await api.get('/warehouses', {
                params: { search, status: statusFilter, page, limit }
            });
            setWarehouses(res.data.warehouses || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch warehouses');
        } finally {
            setLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await api.get('/admin/sub-admins', { params: { limit: 100 } });
            setManagers(res.data.subAdmins || []);
        } catch (err) {
            console.error('Error fetching sub-admins for managers', err);
        }
    };

    const fetchMetrics = async () => {
        try {
            const [wRes, iRes] = await Promise.all([
                api.get('/warehouses', { params: { limit: 1000 } }),
                api.get('/warehouses/inventory', { params: { limit: 1000 } })
            ]);

            const list = wRes.data.warehouses || [];
            const activeList = list.filter((w: any) => w.status === 'active');
            const invList = iRes.data.inventory || [];

            const totalStock = invList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            const lowStockCount = invList.filter((item: any) => {
                const limit = item.warehouse_id?.low_stock_threshold || 10;
                return item.quantity <= limit;
            }).length;

            setMetrics({
                totalCount: list.length,
                activeCount: activeList.length,
                totalStock,
                lowStockItems: lowStockCount
            });
        } catch (err) {
            console.error('Error fetching dashboard warehouse metrics', err);
        }
    };

    useEffect(() => {
        fetchWarehouses();
        fetchMetrics();
    }, [page, search, statusFilter]);

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingWarehouse(null);
        setName('');
        setCode('');
        setAddress('');
        setType('Main');
        setThreshold(10);
        setEmail('');
        setPhone('');
        setPhoneCode('+91');
        setSelectedManagers([]);
        setStatus('active');
        setFormError('');
        setModalOpen(true);
    };

    const handleOpenEditModal = (wh: WarehouseItem) => {
        setEditingWarehouse(wh);
        setName(wh.name);
        setCode(wh.code);
        setAddress(wh.address);
        setType(wh.warehouse_type);
        setThreshold(wh.low_stock_threshold);
        setEmail(wh.contact_email || '');
        
        // Parse contact phone code and national number
        const rawPhone = (wh.contact_phone || '').trim();
        let matched = false;
        for (const p of PHONE_CODES) {
            if (rawPhone.startsWith(p.code)) {
                setPhoneCode(p.code);
                setPhone(rawPhone.slice(p.code.length).trim());
                matched = true;
                break;
            }
        }
        if (!matched) {
            if (rawPhone.startsWith('+')) {
                const spaceIdx = rawPhone.indexOf(' ');
                if (spaceIdx > 0) {
                    setPhoneCode(rawPhone.slice(0, spaceIdx));
                    setPhone(rawPhone.slice(spaceIdx + 1).trim());
                } else {
                    setPhoneCode(rawPhone.slice(0, 3));
                    setPhone(rawPhone.slice(3).trim());
                }
            } else {
                setPhoneCode('+91');
                setPhone(rawPhone);
            }
        }
        
        setSelectedManagers(wh.assigned_managers.map(m => m._id));
        setStatus(wh.status);
        setFormError('');
        setModalOpen(true);
    };

    const handleToggleManager = (id: string) => {
        if (selectedManagers.includes(id)) {
            setSelectedManagers(selectedManagers.filter(m => m !== id));
        } else {
            setSelectedManagers([...selectedManagers, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !code.trim() || !address.trim() || !email.trim() || !phone.trim()) {
            setFormError('Name, Code, Address, Contact Email, and Contact Phone are required');
            return;
        }

        // Validate national phone number digits
        const digitsOnly = phone.trim().replace(/[\s\-\(\)]/g, '');
        if (!/^\d{7,12}$/.test(digitsOnly)) {
            setFormError('Contact phone must be a valid number between 7 and 12 digits (excluding country code)');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            const combinedPhone = `${phoneCode} ${digitsOnly}`;
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                address: address.trim(),
                warehouse_type: type,
                low_stock_threshold: threshold,
                contact_email: email.trim(),
                contact_phone: combinedPhone,
                assigned_managers: selectedManagers,
                status
            };

            if (editingWarehouse) {
                await api.put(`/warehouses/${editingWarehouse._id}`, payload);
                setSuccessMessage('Warehouse updated successfully!');
            } else {
                await api.post('/warehouses', payload);
                setSuccessMessage('Warehouse created successfully!');
            }

            setModalOpen(false);
            fetchWarehouses();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Error processing request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to deactivate this warehouse? Historical data will be preserved.')) return;
        setPageError('');
        try {
            await api.delete(`/warehouses/${id}`);
            setSuccessMessage('Warehouse deactivated successfully!');
            fetchWarehouses();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to deactivate warehouse');
        }
    };

    const pages = Math.ceil(total / limit);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 32px 100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main, #0d2e67)', margin: 0 }}>
                        Warehouse Management
                    </h1>
                    <p style={{ color: 'var(--admin-text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Configure B2B warehouse inventory locations, map scoped managers, and review global stock threshold stats.
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={handleOpenCreateModal}
                        style={{
                            background: 'var(--primary-color, #0d2e67)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(13,46,103,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>+</span> Add Warehouse
                    </button>
                )}
            </div>

            {/* Metrics cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Total Warehouses</div>
                    <div className="admin-stat-card-value">{metrics.totalCount}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Active Locations</div>
                    <div className="admin-stat-card-value" style={{ color: '#10b981' }}>{metrics.activeCount}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Total Inventory Stock</div>
                    <div className="admin-stat-card-value" style={{ color: 'var(--primary-color)' }}>{metrics.totalStock}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Low Stock Items</div>
                    <div className="admin-stat-card-value" style={{ color: metrics.lowStockItems > 0 ? '#ef4444' : '#64748b' }}>
                        {metrics.lowStockItems}
                    </div>
                </div>
            </div>

            {successMessage && (
                <div style={{ padding: '16px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '700', fontSize: '14px' }}>
                    {successMessage}
                </div>
            )}

            {pageError && (
                <div style={{ padding: '16px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: '700', fontSize: '14px' }}>
                    {pageError}
                </div>
            )}

            {/* Filters */}
            <div style={{
                background: 'var(--admin-card-bg, #ffffff)',
                border: '1px solid var(--admin-border, #e2e8f0)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <input
                        type="text"
                        placeholder="Search warehouses by name or code..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        style={{
                            width: '100%',
                            height: '44px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--admin-border, #e2e8f0)',
                            padding: '0 16px',
                            fontSize: '14px',
                            outline: 'none',
                            color: 'var(--admin-text-secondary, #334155)',
                            background: 'var(--admin-bg, #f8fafc)'
                        }}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{
                        height: '44px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--admin-border, #e2e8f0)',
                        padding: '0 12px',
                        fontSize: '14px',
                        outline: 'none',
                        background: '#fff',
                        cursor: 'pointer',
                        minWidth: '150px'
                    }}
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            {/* Table card */}
            <div className="admin-panel-card-premium" style={{ background: 'var(--admin-card-bg, #ffffff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #e2e8f0',
                            borderTop: '3px solid var(--primary-color, #ff6a00)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Loading warehouses...</span>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-bg, #f8fafc)' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Warehouse Details</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Location & Type</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Assigned Managers</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Low Stock Limit</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Status</th>
                                    {(canEdit || canDelete) && (
                                        <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.length > 0 ? warehouses.map((wh) => (
                                    <tr key={wh._id} style={{ borderBottom: '1px solid var(--admin-border-subtle, #f0f4ff)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)', fontSize: '14px' }}>{wh.name}</div>
                                            <div style={{ fontSize: '11px', color: '#8898b3', marginTop: '2px', fontWeight: '700' }}>CODE: {wh.code}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary, #334155)', fontWeight: '600' }}>{wh.address}</div>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                display: 'inline-block',
                                                marginTop: '4px',
                                                textTransform: 'uppercase'
                                            }}>{wh.warehouse_type} Type</span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary, #334155)' }}>
                                                {wh.assigned_managers && wh.assigned_managers.length > 0 ? (
                                                    wh.assigned_managers.map(m => m.name).join(', ')
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)' }}>
                                                {wh.low_stock_threshold} units
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span className={`admin-badge ${wh.status === 'active' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {wh.status}
                                            </span>
                                        </td>
                                        {(canEdit || canDelete) && (
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleOpenEditModal(wh)}
                                                            className="admin-action-btn-edit"
                                                            title="Edit Warehouse"
                                                            style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: 'transparent' }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {canDelete && wh.status === 'active' && (
                                                        <button
                                                            onClick={() => handleDelete(wh._id)}
                                                            className="admin-action-btn-delete"
                                                            title="Deactivate Warehouse"
                                                            style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: 'transparent' }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                            No warehouses configured yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border, #e2e8f0)' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Showing Page {page} of {pages} ({total} total warehouses)
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontWeight: '600', fontSize: '12px' }}
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === pages}
                                onClick={() => setPage(page + 1)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.5 : 1, fontWeight: '600', fontSize: '12px' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
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
                        maxWidth: '700px',
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
                                {editingWarehouse ? 'Edit Warehouse details' : 'Add Warehouse location'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formError && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                                        {formError}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Warehouse Name *</label>
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chennai Central WH" style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Warehouse Code *</label>
                                        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WH-CHE01" style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }} required disabled={!!editingWarehouse} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Warehouse Type</label>
                                        <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}>
                                            <option value="Main">Main</option>
                                            <option value="Regional">Regional</option>
                                            <option value="Retail">Retail</option>
                                            <option value="Dropship">Dropship</option>
                                            <option value="Returns">Returns</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Low Stock Warning Limit *</label>
                                        <input type="number" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))} style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }} required />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Street Address *</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12th Avenue, Industrial Estate, Chennai" style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }} required />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Contact Email *</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="chennaiwh@company.com" style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Contact Phone *</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select 
                                                value={phoneCode} 
                                                onChange={(e) => setPhoneCode(e.target.value)} 
                                                style={{ 
                                                    width: '100px', 
                                                    height: '42px', 
                                                    borderRadius: '10px', 
                                                    border: '1.5px solid var(--admin-border, #e2e8f0)', 
                                                    padding: '0 8px', 
                                                    fontSize: '14px', 
                                                    outline: 'none', 
                                                    background: '#fff', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                {PHONE_CODES.map(p => (
                                                    <option key={p.code} value={p.code}>{p.country} ({p.code})</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="text" 
                                                value={phone} 
                                                onChange={(e) => setPhone(e.target.value)} 
                                                placeholder="9876543210" 
                                                style={{ 
                                                    flex: 1, 
                                                    height: '42px', 
                                                    borderRadius: '10px', 
                                                    border: '1.5px solid var(--admin-border, #e2e8f0)', 
                                                    padding: '0 12px', 
                                                    fontSize: '14px', 
                                                    outline: 'none' 
                                                }} 
                                                required 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {editingWarehouse && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Status</label>
                                        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--admin-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--admin-bg, #f8fafc)' }}>
                                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary-color, #0d2e67)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? 'Saving...' : editingWarehouse ? 'Save Changes' : 'Add Warehouse'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWarehouses;
