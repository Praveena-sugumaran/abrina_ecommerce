'use client';
import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

interface Warehouse {
    _id: string;
    name: string;
    code: string;
}

interface Product {
    _id: string;
    name: string;
    sku: string;
    main_image?: string;
}

interface TransferItem {
    _id: string;
    from_warehouse: Warehouse | null;
    to_warehouse: Warehouse | null;
    product: Product | null;
    quantity: number;
    status: 'Draft' | 'Pending Approval' | 'Approved' | 'In Transit' | 'Received' | 'Cancelled';
    transfer_date: string;
    notes?: string;
    createdAt: string;
}

const statusBadgeStyles = {
    'Draft': { background: '#f1f5f9', color: '#475569' },
    'Pending Approval': { background: '#fef9c3', color: '#854d0e' },
    'Approved': { background: '#dbeafe', color: '#1e40af' },
    'In Transit': { background: '#ffedd5', color: '#c2410c' },
    'Received': { background: '#dcfce7', color: '#166534' },
    'Cancelled': { background: '#fee2e2', color: '#991b1b' }
};

const AdminWarehouseTransfers: React.FC = () => {
    const { t, user } = useAuth();

    // Data lists
    const [transfers, setTransfers] = useState<TransferItem[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

    // Modal Form
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string>( '');
    const [pageError, setPageError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Form inputs
    const [fromWarehouse, setFromWarehouse] = useState<string>('');
    const [toWarehouse, setToWarehouse] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState<string>('');
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    const [sourceInventory, setSourceInventory] = useState<any[]>([]);

    // Metrics
    const [metrics, setMetrics] = useState({
        totalCount: 0,
        pendingCount: 0,
        transitCount: 0,
        completedCount: 0
    });

    // Permissions
    const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];
    
    const canCreate = isSuperAdmin || userPerms.includes('warehouse.transfer.create');
    const canApprove = isSuperAdmin || userPerms.includes('warehouse.transfer.approve');

    const fetchTransfers = async () => {
        setLoading(true);
        setPageError('');
        try {
            const res = await api.get('/warehouses/transfers', {
                params: {
                    status: statusFilter,
                    warehouse_id: selectedWarehouseId,
                    page,
                    limit
                }
            });
            setTransfers(res.data.transfers || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch stock transfers');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses', { params: { limit: 100, all: 'true', status: 'active' } });
            setWarehouses(res.data.warehouses || []);
        } catch (err) {
            console.error('Error fetching warehouses', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/admin/products', { params: { limit: 1000 } });
            setProducts(res.data || []);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/warehouses/transfers', { params: { limit: 1000 } });
            const list: TransferItem[] = res.data.transfers || [];
            
            setMetrics({
                totalCount: list.length,
                pendingCount: list.filter(t => t.status === 'Pending Approval').length,
                transitCount: list.filter(t => t.status === 'In Transit').length,
                completedCount: list.filter(t => t.status === 'Received').length
            });
        } catch (err) {
            console.error('Error loading transfer metrics', err);
        }
    };

    useEffect(() => {
        fetchTransfers();
        fetchMetrics();
    }, [page, statusFilter, selectedWarehouseId]);

    useEffect(() => {
        fetchWarehouses();
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!fromWarehouse) {
            setSourceInventory([]);
            setAvailableStock(null);
            return;
        }

        const fetchSourceInventory = async () => {
            try {
                const res = await api.get('/warehouses/inventory', {
                    params: { warehouse_id: fromWarehouse, limit: 1000 }
                });
                setSourceInventory(res.data.inventory || []);
            } catch (err) {
                console.error('Error fetching source warehouse inventory', err);
                setSourceInventory([]);
            }
        };

        fetchSourceInventory();
    }, [fromWarehouse]);

    useEffect(() => {
        if (!selectedProductId || sourceInventory.length === 0) {
            setAvailableStock(null);
            return;
        }
        const match = sourceInventory.find(item => item.product_id?._id === selectedProductId);
        if (match) {
            setAvailableStock(match.quantity - (match.reserved_quantity || 0));
        } else {
            setAvailableStock(0);
        }
    }, [selectedProductId, sourceInventory]);

    const handleOpenModal = () => {
        setFromWarehouse(warehouses[0]?._id || '');
        setToWarehouse(warehouses[1]?._id || '');
        setSelectedProductId('');
        setQuantity(1);
        setNotes('');
        setFormError('');
        setModalOpen(true);
    };

    const handleSourceWarehouseChange = (val: string) => {
        setFromWarehouse(val);
        setSelectedProductId('');
        setAvailableStock(null);
        if (toWarehouse === val) {
            setToWarehouse('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromWarehouse || !toWarehouse || !selectedProductId || quantity <= 0) {
            setFormError('All fields must be filled and quantity must be positive');
            return;
        }

        if (fromWarehouse === toWarehouse) {
            setFormError('Source and Destination warehouse locations cannot be identical');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await api.post('/warehouses/transfers', {
                from_warehouse: fromWarehouse,
                to_warehouse: toWarehouse,
                product: selectedProductId,
                quantity,
                notes: notes.trim()
            });

            setSuccessMessage('Stock transfer request registered successfully!');
            setModalOpen(false);
            fetchTransfers();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Failed to submit transfer request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setPageError('');
        try {
            await api.put(`/warehouses/transfers/${id}/status`, { status: newStatus });
            setSuccessMessage(`Transfer status successfully transitioned to "${newStatus}"!`);
            fetchTransfers();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err: any) {
            setPageError(err.response?.data?.message || `Failed to transition state to ${newStatus}`);
        }
    };

    const pages = Math.ceil(total / limit);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 32px 100px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main, #0d2e67)', margin: 0 }}>
                        Internal Stock Transfers
                    </h1>
                    <p style={{ color: 'var(--admin-text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Manage inventory reallocations across different B2B warehouse locations.
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={handleOpenModal}
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
                        Request Stock Transfer
                    </button>
                )}
            </div>

            {/* Metrics cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Total Transfers Logged</div>
                    <div className="admin-stat-card-value">{metrics.totalCount}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Pending Approval</div>
                    <div className="admin-stat-card-value" style={{ color: '#f59e0b' }}>{metrics.pendingCount}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Currently In Transit</div>
                    <div className="admin-stat-card-value" style={{ color: '#ffedd5', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{metrics.transitCount}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Completed Received</div>
                    <div className="admin-stat-card-value" style={{ color: '#10b981' }}>{metrics.completedCount}</div>
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
                <select
                    value={selectedWarehouseId}
                    onChange={(e) => { setSelectedWarehouseId(e.target.value); setPage(1); }}
                    style={{
                        height: '44px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--admin-border, #e2e8f0)',
                        padding: '0 12px',
                        fontSize: '14px',
                        outline: 'none',
                        background: '#fff',
                        cursor: 'pointer',
                        minWidth: '220px'
                    }}
                >
                    <option value="">Filter by Warehouse (All)</option>
                    {warehouses.map(wh => (
                        <option key={wh._id} value={wh._id}>
                            {wh.name} ({wh.code})
                        </option>
                    ))}
                </select>

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
                        minWidth: '180px'
                    }}
                >
                    <option value="">Filter by Status (All)</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            {/* Table card */}
            <div className="admin-panel-card-premium" style={{ background: 'var(--admin-card-bg, #ffffff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                        <div className="admin-loading-spinner" />
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-bg, #f8fafc)' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Product</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Route Route</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Quantity</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Created On</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Status Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.length > 0 ? transfers.map((item) => {
                                    const prod = item.product;
                                    const fWh = item.from_warehouse;
                                    const tWh = item.to_warehouse;
                                    const badge = statusBadgeStyles[item.status] || { background: '#cbd5e1', color: '#334155' };

                                    return (
                                        <tr key={item._id} style={{ borderBottom: '1px solid var(--admin-border-subtle, #f0f4ff)' }}>
                                            <td style={{ padding: '16px 24px' }}>
                                                {prod ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <img
                                                            src={getImgUrl(prod.main_image)}
                                                            alt={prod.name}
                                                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                                                            onError={(e: any) => { e.target.src = 'https://placehold.co/40x40?text=📦'; }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)', fontSize: '14px' }}>{prod.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#8898b3', marginTop: '2px', fontWeight: '700' }}>SKU: {prod.sku || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '13px' }}>Product Deleted</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary, #334155)', fontWeight: '600' }}>
                                                        From: {fWh ? `${fWh.name} (${fWh.code})` : 'Deleted'}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary, #334155)', fontWeight: '600' }}>
                                                        To: {tWh ? `${tWh.name} (${tWh.code})` : 'Deleted'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)', fontSize: '14px' }}>
                                                {item.quantity} units
                                            </td>
                                            <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                                                {new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span className="admin-badge" style={{ ...badge }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    {/* Draft actions */}
                                                    {item.status === 'Draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Pending Approval')}
                                                                className="admin-action-btn-edit"
                                                            >
                                                                Submit for Approval
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Cancelled')}
                                                                className="admin-action-btn-delete"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Pending Approval actions */}
                                                    {item.status === 'Pending Approval' && (
                                                        <>
                                                            {canApprove && (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item._id, 'Approved')}
                                                                    style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#dbeafe', color: '#1e40af', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Cancelled')}
                                                                className="admin-action-btn-delete"
                                                            >
                                                                Reject/Cancel
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Approved actions */}
                                                    {item.status === 'Approved' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'In Transit')}
                                                                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#ffedd5', color: '#c2410c', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                                            >
                                                                Mark In Transit
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Cancelled')}
                                                                className="admin-action-btn-delete"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* In Transit actions */}
                                                    {item.status === 'In Transit' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Received')}
                                                                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                                            >
                                                                Confirm Received
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item._id, 'Cancelled')}
                                                                className="admin-action-btn-delete"
                                                            >
                                                                Revert / Cancel
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Completed states */}
                                                    {(item.status === 'Received' || item.status === 'Cancelled') && (
                                                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Archived</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                            No stock transfer requests recorded.
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
                            Showing Page {page} of {pages} ({total} total transfers)
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

            {/* Modal for creating a new request */}
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
                        maxWidth: '600px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            background: 'var(--primary-color, #0d2e67)',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Request Internal Stock Transfer</h3>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {warehouses.length < 2 && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '700', fontSize: '13px' }}>
                                        ⚠️ At least two active warehouses must exist in the system to initiate stock transfers.
                                    </div>
                                )}

                                {formError && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                                        {formError}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Source Warehouse *</label>
                                        <select
                                            value={fromWarehouse}
                                            onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                                            style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                            required
                                            disabled={warehouses.length < 2}
                                        >
                                            <option value="">Select Source...</option>
                                            {warehouses.map(wh => (
                                                <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Destination Warehouse *</label>
                                        <select
                                            value={toWarehouse}
                                            onChange={(e) => setToWarehouse(e.target.value)}
                                            style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                            required
                                            disabled={warehouses.length < 2}
                                        >
                                            <option value="">Select Destination...</option>
                                            {warehouses
                                                .filter(wh => wh._id !== fromWarehouse)
                                                .map(wh => (
                                                    <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Product *</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                        required
                                        disabled={warehouses.length < 2 || !fromWarehouse}
                                    >
                                        <option value="">Select Product...</option>
                                        {sourceInventory
                                            .filter(item => item.product_id && (item.quantity - (item.reserved_quantity || 0)) > 0)
                                            .map(item => {
                                                const p = item.product_id;
                                                const av = item.quantity - (item.reserved_quantity || 0);
                                                return (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name} (SKU: {p.sku || 'N/A'}) - Available: {av} units
                                                    </option>
                                                );
                                            })
                                        }
                                    </select>
                                    {availableStock !== null && (
                                        <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '6px', color: availableStock > 0 ? '#10b981' : '#ef4444' }}>
                                            🟢 Selected product available stock: {availableStock} units
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Quantity to Transfer *</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        min={1}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }}
                                        required
                                        disabled={warehouses.length < 2}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Transfer Notes / Instructions</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add shipping method or reference information..."
                                        style={{ width: '100%', minHeight: '80px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                        disabled={warehouses.length < 2}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--admin-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--admin-bg, #f8fafc)' }}>
                                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={submitting || warehouses.length < 2} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: warehouses.length < 2 ? '#cbd5e1' : 'var(--primary-color, #0d2e67)', fontWeight: '700', fontSize: '13px', cursor: warehouses.length < 2 ? 'not-allowed' : 'pointer', color: warehouses.length < 2 ? '#94a3b8' : '#fff', opacity: submitting || warehouses.length < 2 ? 0.7 : 1 }}>
                                    {submitting ? 'Registering request...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWarehouseTransfers;
