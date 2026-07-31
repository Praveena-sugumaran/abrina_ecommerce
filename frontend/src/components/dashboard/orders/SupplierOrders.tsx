import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupplierOrders, updateOrderStatus } from '@/services/orderApi';
import { useAuth } from '@/context/AuthContext';
import AlertModal from '../AlertModal';
import styles from './SupplierOrders.module.css';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

const PaymentBadge = ({ status, method }: { status: string; method?: string }) => {
    const cls =
        (status === 'paid' ? 'paid' :
            status === 'partially_paid' ? 'partially_paid' :
                status === 'disputed' ? 'disputed' :
                    status === 'refunded' ? 'refunded' : 'unpaid') as 'paid' | 'partially_paid' | 'disputed' | 'refunded' | 'unpaid';

    let displayStatus = status || 'unpaid';
    if (displayStatus === 'partially_paid') displayStatus = 'Partially Paid';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div className={`${styles['payment-badge']} ${styles[cls] || ''}`}>
                {displayStatus.toUpperCase()}
            </div>
            {method && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{method}</span>}
        </div>
    );
};

const OrderStatusPill = ({ status }: { status: string }) => {
    const cls = (['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(status) ? status : 'pending') as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
    const labels = { pending: 'New Request', confirmed: 'Confirmed', processing: 'Processing', shipped: 'In Transit', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
    
    let cssCls = cls as string;
    if (cls === 'pending') cssCls = 'confirming';
    if (cls === 'confirmed') cssCls = 'preparing';
    if (cls === 'out_for_delivery') cssCls = 'shipped';

    return <div className={`${styles['status-pill']} ${styles[cssCls] || ''}`}>{labels[cls] || status}</div>;
};

const SupplierOrders = () => {
    const navigate = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { convertPrice } = useAuth();
    const [filterStatus, setFilterStatus] = useState('All Orders');
    const [keyword, setKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [updatingOrderId, setUpdatingOrderId] = useState<any>(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });
    const [editOrderData, setEditOrderData] = useState<any>(null);
    const [isExchangeMode, setIsExchangeMode] = useState(false);

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            const { data } = await getSupplierOrders();
            setOrders(data);
        } catch (err) {
            setError((err as any).response?.data?.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: any, newStatus: any) => {
        setUpdatingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, { status: newStatus });
            setOrders(orders.map((o: any) => o._id === orderId ? { ...o, status: newStatus } : o));
            setAlertModal({ isOpen: true, message: `Order status updated to ${newStatus}`, title: 'Update Successful' });
        } catch (err) {
            setAlertModal({ isOpen: true, message: (err as any).response?.data?.message || 'Failed to update order status', title: 'Update Error' });
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handlePrintLabel = async (orderId: string) => {
        try {
            const { data } = await api.get(`/orders/${orderId}/shipping-label`);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(data);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }
        } catch (err) {
            setAlertModal({ isOpen: true, message: 'Failed to fetch shipping label', title: 'Print Error' });
        }
    };

    const handleSaveTracking = async (e: React.FormEvent, orderId: any) => {
        e.preventDefault();
        if (!editOrderData) return;
        setUpdatingOrderId(orderId);
        try {
            if (isExchangeMode) {
                await api.put(`/orders/${orderId}/exchange-tracking`, {
                    carrier: editOrderData.shipping_company,
                    tracking_number: editOrderData.tracking_number
                });
                setOrders(orders.map((o: any) => o._id === orderId ? {
                    ...o,
                    exchange_details: {
                        ...o.exchange_details,
                        status: 'shipped',
                        carrier: editOrderData.shipping_company,
                        tracking_number: editOrderData.tracking_number
                    }
                } : o));
                setEditOrderData(null);
                setIsExchangeMode(false);
                setAlertModal({ isOpen: true, message: 'Exchange replacement tracking updated successfully!', title: 'Exchange Shipped' });
            } else {
                await updateOrderStatus(orderId, {
                    tracking_number: editOrderData.tracking_number,
                    shipping_company: editOrderData.shipping_company,
                    status: 'shipped'
                });
                setOrders(orders.map((o: any) => o._id === orderId ? {
                    ...o,
                    tracking_number: editOrderData.tracking_number,
                    shipping_company: editOrderData.shipping_company,
                    status: 'shipped'
                } : o));
                setEditOrderData(null);
                setAlertModal({ isOpen: true, message: 'Tracking information saved successfully!', title: 'Shipping Updated' });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, message: (err as any).response?.data?.message || 'Failed to save tracking info', title: 'Update Error' });
        } finally {
            setUpdatingOrderId(null);
        }
    };

    // Filter by tab status
    const tabFilteredOrders = filterStatus === 'All Orders'
        ? orders
        : orders.filter(order => {
            if (filterStatus === 'New Requests') return order.status === 'pending';
            if (filterStatus === 'To Ship') return order.status === 'confirmed' || order.status === 'processing';
            if (filterStatus === 'In Transit') return order.status === 'shipped' || order.status === 'out_for_delivery';
            if (filterStatus === 'Delivered') return order.status === 'delivered';
            if (filterStatus === 'Completed') return order.payment_status === 'paid' && order.status === 'delivered';
            return true;
        });

    // Filter by search keyword
    const searchFilteredOrders = tabFilteredOrders.filter(order => {
        if (!keyword) return true;
        const kw = keyword.toLowerCase();
        const orderIdMatch = order._id?.toLowerCase().includes(kw);
        const buyerNameMatch = order.buyer_id
            ? `${order.buyer_id.first_name} ${order.buyer_id.last_name}`.toLowerCase().includes(kw)
            : false;
        return orderIdMatch || buyerNameMatch;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', gap: '15px' }}>
                <div className="spinner-circle"></div>
            </div>
        );
    }
    if (error) return <div style={{ color: 'red', padding: 20 }}>{error}</div>;

    const tabs = ['All Orders', 'New Requests', 'To Ship', 'In Transit', 'Delivered', 'Completed'];

    return (
        <div className={styles['my-orders-container']}>
            
            {/* ── Header ── */}
            <div className={styles['orders-page-header']}>
                <div className={styles['orders-page-title-group']}>
                    <div className={styles['orders-page-icon']}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 className={styles['orders-page-title']}>Order Management</h2>
                        <p className={styles['orders-page-subtitle']}>{orders.length} total order{orders.length !== 1 ? 's' : ''} received</p>
                    </div>
                </div>

                <div className={styles['header-metrics']}>
                    <div className={`${styles['metric-box']} ${styles['total']}`}>
                        <div className={styles['metric-icon']}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <div>
                            <div className={styles['metric-val']}>{orders.length}</div>
                            <div className={styles['metric-label']}>Total Orders</div>
                        </div>
                    </div>
                    <div className={`${styles['metric-box']} ${styles['paid']}`}>
                        <div className={styles['metric-icon']}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div>
                            <div className={styles['metric-val']}>{orders.filter(o => o.payment_status === 'paid').length}</div>
                            <div className={styles['metric-label']}>Paid</div>
                        </div>
                    </div>
                    <div className={`${styles['metric-box']} ${styles['active']}`}>
                        <div className={styles['metric-icon']}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                        </div>
                        <div>
                            <div className={styles['metric-val']}>{orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}</div>
                            <div className={styles['metric-label']}>Active</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className={styles['order-tabs-scroll']}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`${styles['order-tab']} ${filterStatus === tab ? styles['active'] : ''}`}
                        onClick={() => { setFilterStatus(tab); setKeyword(''); setCurrentPage(1); }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── Filters Bar ── */}
            <div className={styles['filters-bar']}>
                <div className={styles['search-box']}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        placeholder="Search by Order ID or Buyer Name..."
                        value={keyword}
                        onChange={e => { setKeyword(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className={styles['filter-dropdowns']}>
                    <select className={styles['filter-select']}>
                        <option>All Status</option>
                        <option>Paid</option>
                        <option>Unpaid</option>
                    </select>
                    <select className={styles['filter-select']}>
                        <option>All Dates</option>
                        <option>Last 30 Days</option>
                        <option>Last 3 Months</option>
                    </select>
                    <select className={styles['filter-select']}>
                        <option>Sort by</option>
                        <option>Newest First</option>
                        <option>Oldest First</option>
                    </select>
                </div>
            </div>

            {/* ── Order List ── */}
            {(() => {
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                const currentOrders = searchFilteredOrders.slice(indexOfFirstItem, indexOfLastItem);
                const totalPages = Math.ceil(searchFilteredOrders.length / itemsPerPage);

                if (searchFilteredOrders.length === 0) {
                    return (
                        <div className={styles['order-empty-state']}>
                            <svg className={styles['empty-order-icon']} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                <rect x="9" y="3" width="6" height="4" rx="2" />
                                <circle cx="12" cy="14" r="3" />
                            </svg>
                            <h3 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>No orders found</h3>
                            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 500, maxWidth: '300px', margin: '0 auto' }}>We couldn't find any orders matching your current filter.</p>
                        </div>
                    );
                }

                return (
                    <>
                        <div className={styles['order-list']}>
                            {currentOrders.map(order => (
                        <div key={order._id} className={styles['order-card']}>
                            
                            {/* Column 1: ID & Status */}
                            <div className={styles['col-id']}>
                                <div className={styles['col-label']}>ORDER ID</div>
                                <div className={styles['id-value']}>#{order._id?.slice(-12).toUpperCase()}</div>
                                <div className={styles['date-value']}>
                                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}<br/>
                                    {new Date(order.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <PaymentBadge status={order.payment_status} method={order.payment_method} />
                            </div>

                            {/* Column 2: Product & Buyer Info */}
                            <div className={styles['col-product']}>
                                {order.order_items.length > 0 && (
                                    <>
                                        <div className={styles['product-img']}>
                                            <img src={getImgUrl(order.order_items[0].image)} alt={order.order_items[0].name} />
                                        </div>
                                        <div className={styles['product-info']}>
                                            <div className={styles['product-name']}>{order.order_items[0].name}</div>
                                            <div className={styles['product-price']}>{convertPrice(order.order_items[0].price).formatted} × {order.order_items[0].quantity}</div>
                                            {order.buyer_id && (
                                                <div className={styles['supplier-name']}>
                                                    Buyer: {order.buyer_id.first_name} {order.buyer_id.last_name}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Column 3: Total */}
                            <div className={styles['col-total']}>
                                <div className={styles['col-label']}>ORDER TOTAL</div>
                                <div className={styles['total-amount']}>{convertPrice(order.total_amount).formatted}</div>
                                <div className={styles['item-count']}>
                                    {order.order_items.length} Item{order.order_items.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Column 4: Status & Details */}
                            <div className={styles['col-status']}>
                                <div className={styles['col-label']}>STATUS</div>
                                <OrderStatusPill status={order.status} />
                            </div>

                            {/* Column 5: Actions */}
                            <div className={styles['col-actions']}>
                                
                                <button
                                    className={`${styles['btn-action']} ${styles['btn-blue']}`}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/supplier/dashboard') ? '/supplier/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/orders/${order._id}`);
                                    }}
                                >
                                    View Details →
                                </button>
                                
                                {order.status === 'pending' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id || order.payment_status !== 'paid'}
                                        onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                    >
                                        {updatingOrderId === order._id ? 'Updating…' : 'Accept Order'}
                                    </button>
                                )}

                                {order.status === 'confirmed' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id}
                                        onClick={() => handleUpdateStatus(order._id, 'processing')}
                                    >
                                        {updatingOrderId === order._id ? 'Updating…' : 'Start Processing'}
                                    </button>
                                )}

                                {(order.status === 'confirmed' || order.status === 'processing') && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id}
                                        onClick={() => setEditOrderData({ ...order })}
                                    >
                                        Mark as Shipped
                                    </button>
                                )}

                                {order.status === 'shipped' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id}
                                        onClick={() => handleUpdateStatus(order._id, 'out_for_delivery')}
                                    >
                                        {updatingOrderId === order._id ? 'Updating…' : 'Out for Delivery'}
                                    </button>
                                )}

                                {(order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id}
                                        onClick={() => handleUpdateStatus(order._id, 'delivered')}
                                    >
                                        {updatingOrderId === order._id ? 'Updating…' : 'Mark Delivered'}
                                    </button>
                                )}

                                {order.exchange_details && order.exchange_details.status === 'approved' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        disabled={updatingOrderId === order._id}
                                        onClick={() => { setEditOrderData({ ...order, shipping_company: '', tracking_number: '' }); setIsExchangeMode(true); }}
                                    >
                                        Ship Replacement
                                    </button>
                                )}

                                <button
                                    className={styles['btn-action']}
                                    onClick={() => handlePrintLabel(order._id)}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <path d="M7 8h10M7 12h10M7 16h6" />
                                    </svg>
                                    Print Label
                                </button>
                                
                                <button
                                    className={styles['btn-action']}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/supplier/dashboard') ? '/supplier/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/invoice/${order._id}`);
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Invoice
                                </button>
                            </div>
                        </div>
                    ))}
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                >
                                    Previous
                                </button>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Page {currentPage} of {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* Tracking / Shipping Modal */}
            {editOrderData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🚚</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Shipping Details</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Enter tracking info for Order #{String(editOrderData._id).slice(-8).toUpperCase()}</p>
                            </div>
                        </div>

                        <form onSubmit={(e) => handleSaveTracking(e, editOrderData._id)}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Courier Service</label>
                                <input
                                    type="text"
                                    placeholder="e.g. DHL, FedEx, UPS"
                                    required
                                    value={editOrderData.shipping_company || ''}
                                    onChange={e => setEditOrderData({ ...editOrderData, shipping_company: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc' }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter the tracking ID"
                                    required
                                    value={editOrderData.tracking_number || ''}
                                    onChange={e => setEditOrderData({ ...editOrderData, tracking_number: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditOrderData(null)}
                                    style={{ padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingOrderId === editOrderData._id}
                                    style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)', transition: 'all 0.2s' }}
                                >
                                    {updatingOrderId === editOrderData._id ? 'Saving…' : 'Confirm Shipment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                message={alertModal.message}
                title={alertModal.title}
            />
        </div>
    );
};

export default SupplierOrders;
