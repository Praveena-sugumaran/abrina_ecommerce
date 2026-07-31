import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMyOrders } from '@/services/orderApi';
import { useAuth } from '@/context/AuthContext';
import ReviewModal from './ReviewModal';
import api from '@/services/axiosConfig';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';
import styles from './MyOrders.module.css';

import { getImgUrl } from '@/utils/imageConfig';

const PaymentBadge = ({ status }: { status: string }) => {
    const cls =
        (status === 'paid' ? 'paid' :
            status === 'partially_paid' ? 'partially_paid' :
                status === 'disputed' ? 'disputed' :
                    status === 'refunded' ? 'refunded' : 'unpaid') as 'paid' | 'partially_paid' | 'disputed' | 'refunded' | 'unpaid';

    let displayStatus = status || 'unpaid';
    if (displayStatus === 'partially_paid') displayStatus = 'Partially Paid';

    return (
        <div className={`${styles['payment-badge']} ${styles[cls] || ''}`}>
            {displayStatus.toUpperCase()}
        </div>
    );
};

const OrderStatusPill = ({ status }: { status: string }) => {
    const cls = (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : 'pending') as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    const labels = { pending: 'Confirming', confirmed: 'Preparing', processing: 'Processing', shipped: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' };
    
    // Map to CSS classes
    let cssCls = cls as string;
    if (cls === 'pending') cssCls = 'confirming';
    if (cls === 'confirmed') cssCls = 'preparing';

    return <div className={`${styles['status-pill']} ${styles[cssCls] || ''}`}>{labels[cls] || status}</div>;
};

const MyOrders = () => {
    const navigate = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { convertPrice } = useAuth();
    const [filterStatus, setFilterStatus] = useState('All Orders');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewProductData, setReviewProductData] = useState<any>(null);
    const [reviewOrderId, setReviewOrderId] = useState<any>(null);

    const [disputeModal, setDisputeModal] = useState(false);
    const [disputeOrder, setDisputeOrder] = useState<any>(null);
    const [disputeReason, setDisputeReason] = useState('Item not received');
    const [disputeDesc, setDisputeDesc] = useState('');
    const [disputeType, setDisputeType] = useState('refund');
    const [disputeLoading, setDisputeLoading] = useState(false);
    const [confirmingDelivery, setConfirmingDelivery] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });
    const [cancelOrderModal, setCancelOrderModal] = useState<{ isOpen: boolean; orderId: any }>({ isOpen: false, orderId: null });

    const openReviewModal = (product: any, orderId: any) => {
        setReviewProductData(product);
        setReviewOrderId(orderId);
        setReviewModalOpen(true);
    };

    const handleConfirmDelivery = async (orderId: any) => {
        setConfirmingDelivery(orderId);
        try {
            await api.put(`/orders/${orderId}/confirm-delivery`);
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'delivered' } : o));
            setAlertModal({ isOpen: true, message: 'Delivery confirmed successfully!', title: 'Success' });
        } catch (err) {
            setAlertModal({ isOpen: true, message: (err as any).response?.data?.message || 'Failed to confirm delivery', title: 'Error' });
        } finally {
            setConfirmingDelivery(null);
        }
    };

    const handleDownloadDigitalFile = async (orderId: string, productId: string) => {
        try {
            const { data } = await api.post('/products/download-token', {
                order_id: orderId,
                product_id: productId
            });
            if (data?.downloadUrl) {
                const downloadLink = `${api.defaults.baseURL || 'http://localhost:5000/api'}${data.downloadUrl}`;
                window.open(downloadLink, '_blank');
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to generate download link');
        }
    };

    const handleCancelOrderSubmit = async (orderId: any) => {
        try {
            await api.put(`/orders/${orderId}/cancel`);
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
            setAlertModal({ isOpen: true, message: 'Order cancelled successfully!', title: 'Success' });
        } catch (err) {
            setAlertModal({ isOpen: true, message: (err as any).response?.data?.message || 'Failed to cancel order', title: 'Error' });
        }
    };

    const handleOpenDisputeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disputeOrder) return;
        setDisputeLoading(true);
        try {
            await api.post('/disputes', { order_id: disputeOrder._id, reason: disputeReason, description: disputeDesc, type: disputeType });
            setOrders(prev => prev.map(o => o._id === disputeOrder._id ? { 
                ...o, 
                payment_status: 'disputed',
                exchange_details: disputeType === 'exchange' ? { is_exchanged: true, reason: disputeReason, status: 'pending' } : o.exchange_details
            } : o));
            setDisputeModal(false);
            setDisputeDesc('');
            setAlertModal({ isOpen: true, message: 'Dispute opened. Our team will review it shortly.', title: 'Dispute Status' });
        } catch (err) {
            setAlertModal({ isOpen: true, message: (err as any).response?.data?.message || 'Failed to open dispute', title: 'Error' });
        } finally {
            setDisputeLoading(false);
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await getMyOrders();
                setOrders(data);
            } catch (err) {
                setError((err as any).response?.data?.message || 'Failed to fetch orders');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order => {
        let matchStatus = true;
        if (filterStatus === 'Confirming') matchStatus = order.status === 'pending';
        else if (filterStatus === 'Unpaid') matchStatus = order.payment_status === 'unpaid';
        else if (filterStatus === 'Preparing to Ship') matchStatus = order.status === 'confirmed';
        else if (filterStatus === 'Delivering') matchStatus = order.status === 'shipped';
        else if (filterStatus === 'Refunds & After-sales') matchStatus = ['refunded', 'disputed'].includes(order.payment_status);
        else if (filterStatus === 'Cancelled') matchStatus = order.status === 'cancelled';
        
        let matchSearch = true;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const idMatch = order._id.toLowerCase().includes(query);
            const supplierMatch = order.supplier_id?.company_name?.toLowerCase().includes(query) || false;
            const itemMatch = order.order_items.some((item: any) => item.name.toLowerCase().includes(query));
            matchSearch = idMatch || supplierMatch || itemMatch;
        }

        return matchStatus && matchSearch;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', gap: '15px' }}>
                <div className="spinner-circle"></div>
            </div>
        );
    }
    if (error) return <div style={{ color: 'red', padding: 20 }}>{error}</div>;

    const tabs = ['All Orders', 'Confirming', 'Unpaid', 'Preparing to Ship', 'Delivering', 'Refunds & After-sales', 'Cancelled'];

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
                        <h2 className={styles['orders-page-title']}>My Orders</h2>
                        <p className={styles['orders-page-subtitle']}>{orders.length} order{orders.length !== 1 ? 's' : ''} in your account</p>
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
                            <div className={styles['metric-val']}>{orders.filter(o => o.status === 'shipped' || o.status === 'confirmed').length}</div>
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
                        onClick={() => { setFilterStatus(tab); setCurrentPage(1); }}
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
                        placeholder="Search by order ID, item or supplier..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
                const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

                if (filteredOrders.length === 0) {
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
                        <div className={styles['orders-list']}>
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
                                <PaymentBadge status={order.payment_status} />
                            </div>

                            {/* Column 2: Product */}
                            <div className={styles['col-product']}>
                                {order.order_items.length > 0 && (
                                    <>
                                        <div className={styles['product-img']}>
                                            <img src={getImgUrl(order.order_items[0].image)} alt={order.order_items[0].name} />
                                        </div>
                                        <div className={styles['product-info']}>
                                            <div className={styles['product-name']}>{order.order_items[0].name}</div>
                                            <div className={styles['product-price']}>{convertPrice(order.order_items[0].price).formatted} × {order.order_items[0].quantity}</div>
                                            {order.supplier_id && (
                                                <div className={styles['supplier-name']}>
                                                    Supplier: {order.supplier_id.company_name || `${order.supplier_id.first_name} ${order.supplier_id.last_name}`}
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

                            {/* Column 4: Status */}
                            <div className={styles['col-status']}>
                                <div className={styles['col-label']}>STATUS</div>
                                <OrderStatusPill status={order.status} />
                            </div>

                            {/* Column 5: Actions */}
                            <div className={styles['col-actions']}>
                                <button
                                    className={`${styles['btn-action']} ${styles['btn-blue']}`}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/orders/${order._id}`);
                                    }}
                                >
                                    View Details →
                                </button>
                                
                                <button
                                    className={styles['btn-action']}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/invoice/${order._id}`);
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Download Invoice
                                </button>

                                {order.payment_status === 'unpaid' && order.status?.toLowerCase() !== 'cancelled' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        onClick={() => {
                                            if (order.stripe_session_id) {
                                                setAlertModal({ isOpen: true, message: 'Please contact support to resume payment, or start a new order.', title: 'Payment Issue' });
                                            }
                                        }}
                                    >
                                        Pay Now
                                    </button>
                                )}

                                {order.status === 'shipped' && order.payment_status === 'paid' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                        onClick={() => setConfirmModal({ isOpen: true, orderId: order._id })}
                                        disabled={confirmingDelivery === order._id}
                                    >
                                        {confirmingDelivery === order._id ? 'Confirming…' : 'Confirm Delivery'}
                                    </button>
                                )}

                                {['pending', 'confirmed'].includes(order.status) && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-danger']}`}
                                        onClick={() => setCancelOrderModal({ isOpen: true, orderId: order._id })}
                                    >
                                        ✕ Cancel Order
                                    </button>
                                )}

                                {order.payment_status === 'paid' && !['disputed', 'refunded'].includes(order.payment_status) && !['pending', 'confirmed'].includes(order.status) && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-danger']}`}
                                        onClick={() => { setDisputeOrder(order); setDisputeModal(true); }}
                                    >
                                        Open Dispute
                                    </button>
                                )}

                                {order.payment_status === 'disputed' && (
                                    <button
                                        className={`${styles['btn-action']} ${styles['btn-dispute-active']}`}
                                        onClick={() => {
                                            const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                            navigate.push(`${baseRoute}/disputes`);
                                        }}
                                    >
                                        Dispute Open
                                    </button>
                                )}

                                {order.order_items.length > 0 && order.status === 'delivered' && (
                                    <button
                                        className={styles['btn-action']}
                                        onClick={() => openReviewModal(order.order_items[0], order._id)}
                                    >
                                        Leave Review
                                    </button>
                                )}
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

            {reviewProductData && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    product={reviewProductData}
                    orderId={reviewOrderId}
                />
            )}

            {/* Dispute Modal */}
            {disputeModal && disputeOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
                    <div className={styles['dispute-modal-inner']} style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <div style={{ width: 40, height: 40, background: '#fff1f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Open a Dispute</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                                    {disputeOrder.order_items[0]?.name || `Order #${String(disputeOrder._id).slice(-8).toUpperCase()}`}
                                </p>
                            </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />
                        <form onSubmit={handleOpenDisputeSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dispute Type</label>
                                <div style={{ display: 'flex', gap: '16px', margin: '4px 0 10px 0' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
                                        <input type="radio" name="dispute_type" value="refund" checked={disputeType === 'refund'} onChange={() => setDisputeType('refund')} style={{ accentColor: '#ff6600' }} />
                                        Refund
                                    </label>
                                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
                                        <input type="radio" name="dispute_type" value="exchange" checked={disputeType === 'exchange'} onChange={() => setDisputeType('exchange')} style={{ accentColor: '#ff6600' }} />
                                        Exchange Item
                                    </label>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
                                <select
                                    value={disputeReason}
                                    onChange={e => setDisputeReason(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                                >
                                    {['Item not received', 'Item not as described', 'Damaged item', 'Wrong item sent', 'Partial delivery', 'Quality issue', 'Other'].map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                <textarea
                                    required
                                    value={disputeDesc}
                                    onChange={e => setDisputeDesc(e.target.value)}
                                    rows={4}
                                    placeholder="Please describe the issue in detail..."
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#f8fafc' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setDisputeModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={disputeLoading} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                    {disputeLoading ? 'Submitting…' : 'Submit Dispute'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, orderId: null })}
                onConfirm={() => handleConfirmDelivery(confirmModal.orderId)}
                title="Confirm Receipt"
                message="Confirm that you have received this order?"
                confirmText="OK"
                cancelText="Cancel"
            />

            <ConfirmationModal
                isOpen={cancelOrderModal.isOpen}
                onClose={() => setCancelOrderModal({ isOpen: false, orderId: null })}
                onConfirm={() => handleCancelOrderSubmit(cancelOrderModal.orderId)}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone."
                confirmText="Cancel Order"
                cancelText="Keep Order"
                variant="danger"
            />

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                message={alertModal.message}
                title={alertModal.title}
            />
        </div>
    );
};

export default MyOrders;
