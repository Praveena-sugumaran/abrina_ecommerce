import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupplierOrders, updateOrderStatus } from '@/services/orderApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './DropshippingCenter.module.css';

const DropshippingCenter = () => {
    const navigate = useRouter();
    const { convertPrice } = useAuth();
    const { showToast } = useToast();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [editOrderData, setEditOrderData] = useState<any>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await getSupplierOrders();
            // Filter to only dropship orders
            const dropshipOrders = (data || []).filter((o: any) => o.is_dropship === true);
            setOrders(dropshipOrders);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch dropship orders');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setUpdatingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, { status: newStatus });
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            showToast(`Order status updated to ${newStatus}`, 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update order status', 'error');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleSaveTracking = async (e: React.FormEvent, orderId: string) => {
        e.preventDefault();
        if (!editOrderData) return;
        setUpdatingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, {
                tracking_number: editOrderData.tracking_number,
                shipping_company: editOrderData.shipping_company,
                status: 'shipped'
            });
            setOrders(prev => prev.map(o => o._id === orderId ? {
                ...o,
                tracking_number: editOrderData.tracking_number,
                shipping_company: editOrderData.shipping_company,
                status: 'shipped'
            } : o));
            showToast('Tracking details saved, order marked as shipped.', 'success');
            setEditOrderData(null);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update tracking details', 'error');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    // Calculate Stats
    const totalCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const processingCount = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length;
    const completedCount = orders.filter(o => o.status === 'delivered').length;

    // Filtered orders
    const filteredOrders = orders.filter(o => {
        const matchesStatus = filterStatus === 'All' || 
            (filterStatus === 'Pending' && o.status === 'pending') ||
            (filterStatus === 'Processing' && ['confirmed', 'processing'].includes(o.status)) ||
            (filterStatus === 'Shipped' && o.status === 'shipped') ||
            (filterStatus === 'Delivered' && o.status === 'delivered') ||
            (filterStatus === 'Cancelled' && o.status === 'cancelled');

        const orderIdStr = String(o._id).toLowerCase();
        const customerName = `${o.shipping_address?.fullName || ''} ${o.buyer_id?.first_name || ''} ${o.buyer_id?.last_name || ''}`.toLowerCase();
        const matchesSearch = searchQuery === '' || 
            orderIdStr.includes(searchQuery.toLowerCase()) || 
            customerName.includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Dropshipping Center</h1>
                    <p>
                        Manage and fulfill your dropship-flagged orders. Please comply with the blind shipping protocol: no platform invoices, logos, or flyers.
                    </p>
                </div>
            </div>

            {/* Premium Analytics Stats Row */}
            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <p className={styles.statLabel}>Total Dropship Orders</p>
                        <h3 className={styles.statValue}>{loading ? '—' : totalCount}</h3>
                    </div>
                </div>

                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <p className={styles.statLabel}>Dropship Revenue</p>
                        <h3 className={styles.statValue}>{loading ? '—' : convertPrice(totalRevenue).formatted}</h3>
                    </div>
                </div>

                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <p className={styles.statLabel}>Processing Shipments</p>
                        <h3 className={styles.statValue}>{loading ? '—' : processingCount}</h3>
                    </div>
                </div>

                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <p className={styles.statLabel}>Completed Orders</p>
                        <h3 className={styles.statValue}>{loading ? '—' : completedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className={styles.toolbar}>
                {/* Tabs */}
                <div className={styles.tabs}>
                    {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setFilterStatus(tab); setSearchQuery(''); }}
                            className={`${styles.tab} ${filterStatus === tab ? styles.active : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className={styles.searchWrap}>
                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        placeholder="Search order ID or buyer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </div>

            {/* Orders Table/List */}
            {loading ? (
                <div className={styles.spinnerWrap}>
                    <div className={styles.spinner}></div>
                    <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading dropship orders...</p>
                </div>
            ) : error ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '16px', color: '#b91c1c', fontSize: '14px', fontWeight: 600 }}>
                    {error}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap} style={{ color: '#94a3b8' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <h3>No Dropship Orders Found</h3>
                    <p>
                        When buyers choose "Enable Blind Dropshipping" at checkout, their orders will appear here.
                    </p>
                </div>
            ) : (
                <div className={styles.list}>
                    {filteredOrders.map((order) => {
                        const isBlind = order.is_dropship;
                        return (
                            <div key={order._id} className={styles.card}>
                                {/* Top metadata */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardHeaderLeft}>
                                        <span className={styles.idBadge}>
                                            #{String(order._id).slice(-12).toUpperCase()}
                                        </span>
                                        <span className={styles.dateText}>
                                            📅 {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        {isBlind && (
                                            <span className={styles.protocolBadge}>
                                                🛡️ Blind Shipment Required
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.cardHeaderRight}>
                                        <span className={`${styles.statusBadge} ${styles[order.status] || ''}`}>
                                            {order.status}
                                        </span>
                                        <span className={styles.priceText}>
                                            {convertPrice(order.total_amount || 0).formatted}
                                        </span>
                                    </div>
                                </div>

                                {/* Address and Instructions */}
                                <div className={styles.cardGrid}>
                                    <div className={styles.addressBlock}>
                                        <h4>Delivery Destination</h4>
                                        <div className={styles.addressDetails}>
                                            <p className={styles.addressName}>
                                                👤 {order.shipping_address?.fullName || `${order.buyer_id?.first_name || ''} ${order.buyer_id?.last_name || ''}`}
                                            </p>
                                            <p style={{ margin: '2px 0 0' }}>{order.shipping_address?.addressLine}</p>
                                            <p style={{ margin: 0 }}>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postalCode}</p>
                                            <p style={{ margin: 0, fontWeight: 700 }}>{order.shipping_address?.country}</p>
                                        </div>
                                    </div>

                                    {/* Dropshipping Alert Block */}
                                    <div className={styles.protocolAlert}>
                                        <div className={styles.alertBox}>
                                            <span className={styles.alertIcon}>⚠️</span>
                                            <span className={styles.alertText}>
                                                <strong>BLIND SHIPMENT PROTOCOL:</strong> Do not add platform flyers, store cards, price tags, or invoice documents. Package should contain only ordered goods.
                                            </span>
                                        </div>
                                        {order.dropship_note && (
                                            <div className={styles.noteBox}>
                                                <span className={styles.noteTitle}>Buyer Instructions:</span>
                                                <span className={styles.noteContent}>
                                                    "{order.dropship_note}"
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Products List */}
                                <div className={styles.itemsBlock}>
                                    <h4>Items List</h4>
                                    <div className={styles.itemsContainer}>
                                        {order.order_items?.map((item: any, idx: number) => (
                                            <div key={idx} className={styles.itemRow}>
                                                <div className={styles.itemLeft}>
                                                    <img
                                                        src={getImgUrl(item.image)}
                                                        alt={item.name}
                                                        className={styles.itemImage}
                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/100?text=📦'; }}
                                                    />
                                                    <div className={styles.itemMeta}>
                                                        <p className={styles.itemName}>{item.name}</p>
                                                        {item.variant && <p className={styles.itemVariant}>Variant: {item.variant}</p>}
                                                    </div>
                                                </div>
                                                <span className={styles.itemPrice}>
                                                    Qty: {item.quantity} x {convertPrice(item.price || 0).formatted}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions row */}
                                <div className={styles.actionsBar}>
                                    {/* Accept Order (pending) */}
                                    {order.status === 'pending' && (
                                        <button
                                            disabled={updatingOrderId === order._id || order.payment_status !== 'paid'}
                                            onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                            className={styles.btnPrimary}
                                            style={{
                                                background: order.payment_status === 'paid' ? '#10b981' : '#cbd5e1',
                                                cursor: order.payment_status === 'paid' ? 'pointer' : 'not-allowed',
                                                boxShadow: order.payment_status === 'paid' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                                            }}
                                        >
                                            {updatingOrderId === order._id ? 'Updating...' : (order.payment_status === 'paid' ? 'Accept & Confirm' : 'Awaiting Payment')}
                                        </button>
                                    )}

                                    {/* Start Processing (confirmed) */}
                                    {order.status === 'confirmed' && (
                                        <button
                                            disabled={updatingOrderId === order._id}
                                            onClick={() => handleUpdateStatus(order._id, 'processing')}
                                            className={styles.btnPrimary}
                                            style={{ background: '#0284c7', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)' }}
                                        >
                                            {updatingOrderId === order._id ? 'Updating...' : 'Start Processing'}
                                        </button>
                                    )}

                                    {/* Mark as Shipped (confirmed or processing) */}
                                    {(order.status === 'confirmed' || order.status === 'processing') && (
                                        <button
                                            disabled={updatingOrderId === order._id}
                                            onClick={() => setEditOrderData({ ...order })}
                                            className={styles.btnPrimary}
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                        >
                                            Ship & Add Tracking
                                        </button>
                                    )}

                                    {/* Mark as Out for Delivery (shipped) */}
                                    {order.status === 'shipped' && (
                                        <button
                                            disabled={updatingOrderId === order._id}
                                            onClick={() => handleUpdateStatus(order._id, 'out_for_delivery')}
                                            className={styles.btnPrimary}
                                            style={{ background: '#8b5cf6', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)' }}
                                        >
                                            {updatingOrderId === order._id ? 'Updating...' : 'Out for Delivery'}
                                        </button>
                                    )}

                                    {/* Mark as Delivered (shipped or out_for_delivery) */}
                                    {(order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                        <button
                                            disabled={updatingOrderId === order._id}
                                            onClick={() => handleUpdateStatus(order._id, 'delivered')}
                                            className={styles.btnPrimary}
                                            style={{ background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}
                                        >
                                            {updatingOrderId === order._id ? 'Updating...' : 'Confirm Delivery'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => navigate.push(`/supplier/dashboard/invoice/${order._id}`)}
                                        className={styles.btnGhost}
                                    >
                                        Invoice
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tracking Modal */}
            {editOrderData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Enter Tracking Information</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Fulfill Order #{String(editOrderData._id).slice(-8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setEditOrderData(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b', outline: 'none' }}>×</button>
                        </div>

                        <form onSubmit={(e) => handleSaveTracking(e, editOrderData._id)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Shipping Company / Carrier</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. FedEx, DHL, USPS"
                                    value={editOrderData.shipping_company || ''}
                                    onChange={e => setEditOrderData({ ...editOrderData, shipping_company: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Tracking Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. TRK123456789"
                                    value={editOrderData.tracking_number || ''}
                                    onChange={e => setEditOrderData({ ...editOrderData, tracking_number: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditOrderData(null)}
                                    className={styles.btnGhost}
                                    style={{ padding: '10px 16px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingOrderId === editOrderData._id}
                                    className={styles.btnPrimary}
                                    style={{ padding: '10px 16px', background: '#0f172a' }}
                                >
                                    {updatingOrderId === editOrderData._id ? 'Saving...' : 'Confirm Shipment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropshippingCenter;
