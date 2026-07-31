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
    low_stock_threshold: number;
}

interface Product {
    _id: string;
    name: string;
    sku: string;
    main_image?: string;
    countInStock?: number;
}

interface InventoryItem {
    _id: string;
    warehouse_id: Warehouse | null;
    product_id: Product | null;
    quantity: number;
    reserved_quantity: number;
    updatedAt: string;
}

const AdminWarehouseInventory: React.FC = () => {
    const { t, user } = useAuth();
    
    // Core inventory state
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [loading, setLoading] = useState<boolean>(true);

    // Filters
    const [search, setSearch] = useState<string>('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);

    // Modals
    const [grnModalOpen, setGrnModalOpen] = useState<boolean>(false);
    const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // GRN Form State
    const [grnNumber, setGrnNumber] = useState<string>('');
    const [grnWarehouseId, setGrnWarehouseId] = useState<string>('');
    const [purchaseOrderRef, setPurchaseOrderRef] = useState<string>('');
    const [grnItems, setGrnItems] = useState<{ product_id: string; quantity_received: number }[]>([
        { product_id: '', quantity_received: 1 }
    ]);

    // Adjustment Form State
    const [adjWarehouseId, setAdjWarehouseId] = useState<string>('');
    const [adjProductId, setAdjProductId] = useState<string>('');
    const [adjType, setAdjType] = useState<'ADD' | 'SUBTRACT'>('ADD');
    const [adjQuantity, setAdjQuantity] = useState<number>(1);
    const [adjReason, setAdjReason] = useState<'DAMAGE' | 'LOST' | 'FOUND' | 'CORRECTION' | 'AUDIT'>('CORRECTION');

    // UI feedback
    const [formError, setFormError] = useState<string>('');
    const [pageError, setPageError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Metrics
    const [metrics, setMetrics] = useState({
        totalSkus: 0,
        totalQuantity: 0,
        totalReserved: 0,
        lowStockAlerts: 0
    });

    // Permission check
    const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
    const userPerms = user?.permissions || [];
    const canEdit = isSuperAdmin || userPerms.includes('warehouse.inventory.edit');

    const fetchInventory = async () => {
        setLoading(true);
        setPageError('');
        try {
            const res = await api.get('/warehouses/inventory', {
                params: {
                    warehouse_id: selectedWarehouseId,
                    search,
                    lowStock: lowStockFilter ? 'true' : 'false',
                    page,
                    limit
                }
            });
            setInventory(res.data.inventory || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch inventory status');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses', { params: { limit: 100 } });
            setWarehouses(res.data.warehouses || []);
        } catch (err) {
            console.error('Error fetching warehouses', err);
        }
    };

    const fetchProductsList = async () => {
        try {
            const res = await api.get('/admin/products', { params: { limit: 1000 } });
            setProducts(res.data || []);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/warehouses/inventory', { params: { limit: 1000 } });
            const list: InventoryItem[] = res.data.inventory || [];
            
            let totalQty = 0;
            let totalRes = 0;
            let lowCount = 0;

            list.forEach(item => {
                totalQty += item.quantity || 0;
                totalRes += item.reserved_quantity || 0;
                
                const threshold = item.warehouse_id?.low_stock_threshold || 10;
                if (item.quantity <= threshold) {
                    lowCount++;
                }
            });

            setMetrics({
                totalSkus: list.length,
                totalQuantity: totalQty,
                totalReserved: totalRes,
                lowStockAlerts: lowCount
            });
        } catch (err) {
            console.error('Error loading inventory metrics', err);
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchMetrics();
    }, [page, search, selectedWarehouseId, lowStockFilter]);

    useEffect(() => {
        fetchWarehouses();
        fetchProductsList();
    }, []);

    // GRN handlers
    const handleOpenGrnModal = () => {
        setGrnNumber('');
        setGrnWarehouseId(warehouses[0]?._id || '');
        setPurchaseOrderRef('');
        setGrnItems([{ product_id: '', quantity_received: 1 }]);
        setFormError('');
        setGrnModalOpen(true);
    };

    const handleAddGrnItem = () => {
        setGrnItems([...grnItems, { product_id: '', quantity_received: 1 }]);
    };

    const handleRemoveGrnItem = (index: number) => {
        if (grnItems.length === 1) return;
        setGrnItems(grnItems.filter((_, idx) => idx !== index));
    };

    const handleGrnItemChange = (index: number, field: string, value: string | number) => {
        const updated = grnItems.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setGrnItems(updated);
    };

    const handleGrnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grnNumber.trim() || !grnWarehouseId) {
            setFormError('GRN number and Warehouse are required');
            return;
        }

        const validItems = grnItems.filter(item => item.product_id && item.quantity_received > 0);
        if (validItems.length === 0) {
            setFormError('At least one product with quantity greater than 0 must be added');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await api.post('/warehouses/grn', {
                grn_number: grnNumber.trim(),
                warehouse_id: grnWarehouseId,
                purchase_order_reference: purchaseOrderRef.trim(),
                items: validItems
            });
            setSuccessMessage('Inbound GRN Intake successfully completed!');
            setGrnModalOpen(false);
            fetchInventory();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Failed to submit Goods Received Note');
        } finally {
            setSubmitting(false);
        }
    };

    // Adjustment handlers
    const handleOpenAdjustModal = () => {
        setAdjWarehouseId(warehouses[0]?._id || '');
        setAdjProductId('');
        setAdjType('ADD');
        setAdjQuantity(1);
        setAdjReason('CORRECTION');
        setFormError('');
        setAdjustModalOpen(true);
    };

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjWarehouseId || !adjProductId || adjQuantity <= 0) {
            setFormError('Please select Warehouse, Product and specify a quantity > 0');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await api.post('/warehouses/adjust', {
                warehouse_id: adjWarehouseId,
                product_id: adjProductId,
                adjustment_type: adjType,
                quantity: adjQuantity,
                reason: adjReason
            });
            setSuccessMessage('Inventory manual adjustment submitted successfully!');
            setAdjustModalOpen(false);
            fetchInventory();
            fetchMetrics();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Failed to submit inventory adjustment');
        } finally {
            setSubmitting(false);
        }
    };

    const pages = Math.ceil(total / limit);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 32px 100px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main, #0d2e67)', margin: 0 }}>
                        Inventory Status & Control
                    </h1>
                    <p style={{ color: 'var(--admin-text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Track stock levels, execute Inbound Goods Received Notes (GRN), and process manual corrections.
                    </p>
                </div>
                {canEdit && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleOpenGrnModal}
                            style={{
                                background: 'var(--primary-color, #0d2e67)',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 20px',
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
                            Inbound GRN
                        </button>
                        <button
                            onClick={handleOpenAdjustModal}
                            style={{
                                background: '#f59e0b',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(245,158,11,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Manual Adjust
                        </button>
                    </div>
                )}
            </div>

            {/* Metrics cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Unique Products in stock</div>
                    <div className="admin-stat-card-value">{metrics.totalSkus}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Total Warehouse Stock</div>
                    <div className="admin-stat-card-value" style={{ color: 'var(--primary-color)' }}>{metrics.totalQuantity}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Reserved for Active Orders</div>
                    <div className="admin-stat-card-value" style={{ color: '#f59e0b' }}>{metrics.totalReserved}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">Low Stock Alerts</div>
                    <div className="admin-stat-card-value" style={{ color: metrics.lowStockAlerts > 0 ? '#ef4444' : '#10b981' }}>
                        {metrics.lowStockAlerts}
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
                        placeholder="Search stock by product name..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        style={{
                            width: '100%',
                            height: '44px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--admin-border, #e2e8f0)',
                            padding: '0 16px 0 40px',
                            fontSize: '14px',
                            outline: 'none',
                            color: 'var(--admin-text-secondary, #334155)',
                            background: 'var(--admin-bg, #f8fafc)'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#94a3b8' }}>🔍</span>
                </div>

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
                        minWidth: '200px'
                    }}
                >
                    <option value="">All Warehouses</option>
                    {warehouses.map(wh => (
                        <option key={wh._id} value={wh._id}>
                            {wh.name} ({wh.code})
                        </option>
                    ))}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>
                    <input
                        type="checkbox"
                        checked={lowStockFilter}
                        onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
                        style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                    />
                    Show Low Stock Only
                </label>
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
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Product Details</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Warehouse Location</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Physical Stock</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Reserved Stock</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Available Stock</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Status Check</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.length > 0 ? inventory.map((item) => {
                                    const prod = item.product_id;
                                    const wh = item.warehouse_id;
                                    const available = item.quantity - (item.reserved_quantity || 0);
                                    const isLow = wh ? item.quantity <= wh.low_stock_threshold : item.quantity <= 10;
                                    
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
                                                    <span style={{ color: '#ef4444', fontSize: '13px' }}>Unlinked Product Reference</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                {wh ? (
                                                    <div>
                                                        <div style={{ fontWeight: '700', color: 'var(--admin-text-secondary, #334155)', fontSize: '13px' }}>{wh.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>CODE: {wh.code}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '13px' }}>Unlinked Warehouse Reference</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px', fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)', fontSize: '15px' }}>
                                                {item.quantity} units
                                            </td>
                                            <td style={{ padding: '16px 24px', fontWeight: '600', color: '#f59e0b', fontSize: '14px' }}>
                                                {item.reserved_quantity || 0} units
                                            </td>
                                            <td style={{ padding: '16px 24px', fontWeight: '700', color: available > 0 ? '#10b981' : '#dc2626', fontSize: '15px' }}>
                                                {available} units
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                {isLow ? (
                                                    <span className="admin-badge admin-badge-danger" style={{ display: 'inline-flex', gap: '4px' }}>
                                                        ⚠️ LOW STOCK
                                                    </span>
                                                ) : (
                                                    <span className="admin-badge admin-badge-success">
                                                        Healthy
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                            No inventory logs matching constraints found.
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
                            Showing Page {page} of {pages} ({total} unique item counts)
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

            {/* GRN Inbound Modal */}
            {grnModalOpen && (
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
                        maxWidth: '750px',
                        maxHeight: '90vh',
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
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Goods Received Note (GRN) Intake</h3>
                            <button onClick={() => setGrnModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleGrnSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formError && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                                        {formError}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>GRN Identifier Number *</label>
                                        <input
                                            type="text"
                                            value={grnNumber}
                                            onChange={(e) => setGrnNumber(e.target.value)}
                                            placeholder="e.g. GRN-1004"
                                            style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Target Warehouse *</label>
                                        <select
                                            value={grnWarehouseId}
                                            onChange={(e) => setGrnWarehouseId(e.target.value)}
                                            style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                            required
                                        >
                                            <option value="">Select Warehouse...</option>
                                            {warehouses.map(wh => (
                                                <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Purchase Order (PO) Reference</label>
                                    <input
                                        type="text"
                                        value={purchaseOrderRef}
                                        onChange={(e) => setPurchaseOrderRef(e.target.value)}
                                        placeholder="e.g. PO-778992"
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>

                                {/* Items list */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--admin-border, #e2e8f0)', paddingBottom: '6px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase' }}>Inbound Products</span>
                                        <button
                                            type="button"
                                            onClick={handleAddGrnItem}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            + Add Product
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {grnItems.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Product SKU *</label>
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(e) => handleGrnItemChange(idx, 'product_id', e.target.value)}
                                                        style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1.5px solid var(--admin-border)', padding: '0 8px', fontSize: '13.5px', outline: 'none', background: '#fff' }}
                                                        required
                                                    >
                                                        <option value="">Select Product...</option>
                                                        {products.map(p => (
                                                            <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ width: '130px' }}>
                                                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Quantity *</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity_received}
                                                        onChange={(e) => handleGrnItemChange(idx, 'quantity_received', parseInt(e.target.value) || 0)}
                                                        min={1}
                                                        style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1.5px solid var(--admin-border)', padding: '0 8px', fontSize: '13.5px', outline: 'none' }}
                                                        required
                                                    />
                                                </div>
                                                {grnItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveGrnItem(idx)}
                                                        style={{
                                                            height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #fee2e2',
                                                            background: '#fff', color: '#dc2626', cursor: 'pointer', fontWeight: '700',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--admin-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--admin-bg, #f8fafc)' }}>
                                <button type="button" onClick={() => setGrnModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary-color, #0d2e67)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? 'Registering Intake...' : 'Submit GRN Inbound'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Adjustment Modal */}
            {adjustModalOpen && (
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
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Manual Inventory Adjustment</h3>
                            <button onClick={() => setAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formError && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Warehouse *</label>
                                    <select
                                        value={adjWarehouseId}
                                        onChange={(e) => setAdjWarehouseId(e.target.value)}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="">Select Warehouse...</option>
                                        {warehouses.map(wh => (
                                            <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Product SKU *</label>
                                    <select
                                        value={adjProductId}
                                        onChange={(e) => setAdjProductId(e.target.value)}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="">Select Product...</option>
                                        {products.map(p => (
                                            <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Adjustment Action</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setAdjType('ADD')}
                                                style={{
                                                    flex: 1, height: '42px', borderRadius: '10px', border: adjType === 'ADD' ? '2px solid #10b981' : '1px solid var(--admin-border)',
                                                    background: adjType === 'ADD' ? '#dcfce7' : '#fff', color: adjType === 'ADD' ? '#15803d' : '#475569',
                                                    fontWeight: '700', cursor: 'pointer', fontSize: '13px'
                                                }}
                                            >
                                                Add Stock
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAdjType('SUBTRACT')}
                                                style={{
                                                    flex: 1, height: '42px', borderRadius: '10px', border: adjType === 'SUBTRACT' ? '2px solid #ef4444' : '1px solid var(--admin-border)',
                                                    background: adjType === 'SUBTRACT' ? '#fee2e2' : '#fff', color: adjType === 'SUBTRACT' ? '#b91c1c' : '#475569',
                                                    fontWeight: '700', cursor: 'pointer', fontSize: '13px'
                                                }}
                                            >
                                                Subtract
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Quantity *</label>
                                        <input
                                            type="number"
                                            value={adjQuantity}
                                            onChange={(e) => setAdjQuantity(parseInt(e.target.value) || 0)}
                                            min={1}
                                            style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '6px' }}>Adjustment Reason *</label>
                                    <select
                                        value={adjReason}
                                        onChange={(e) => setAdjReason(e.target.value as any)}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--admin-border, #e2e8f0)', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="CORRECTION">Correction (Manual Audit Sync)</option>
                                        <option value="DAMAGE">Damaged / Broken goods</option>
                                        <option value="LOST">Lost / Misplaced inventory</option>
                                        <option value="FOUND">Found stock in floor</option>
                                        <option value="AUDIT">Annual/Quarterly Fiscal Audit</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--admin-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--admin-bg, #f8fafc)' }}>
                                <button type="button" onClick={() => setAdjustModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary-color, #0d2e67)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? 'Applying Adjustment...' : 'Apply Stock Change'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWarehouseInventory;
