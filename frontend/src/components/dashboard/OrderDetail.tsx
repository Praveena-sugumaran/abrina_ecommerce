import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import OrderTimeline from './OrderTimeline';
import styles from './OrderDetail.module.css';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '@/context/ToastContext';

const STATUS_MAP = {
    pending:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Pending' },
    confirmed: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Confirmed' },
    processing: { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', label: 'Processing' },
    shipped:   { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'In Transit' },
    out_for_delivery: { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', label: 'Out for Delivery' },
    delivered: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Delivered' },
    completed: { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: 'Completed' },
    cancelled: { color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', label: 'Cancelled' },
};

const OrderDetail = ({ role = 'buyer', orderId: propOrderId }: { role?: string; orderId?: any }) => {
    const params = useParams();
    const slug = params?.slug;
    
    // In [...slug] route, subtab might be the second element
    const orderId = propOrderId || params?.id || params?.subtab || (Array.isArray(slug) ? slug[1] : null);

    const navigate = useRouter();
    const searchParams = useSearchParams();
    const { convertPrice, user } = useAuth();
    const { showToast } = useToast();
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [balancePaying, setBalancePaying] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('stripe');
    const [enabledMethods, setEnabledMethods] = useState<any[]>([]);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await api.get(`/orders/${orderId}`);
                setOrder(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch order details');
            } finally {
                setLoading(false);
            }
        };
        if (orderId) fetchOrder();
    }, [orderId]);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const { data } = await api.get('/payment-methods/public');
                setEnabledMethods(data);
                if (data.length > 0) {
                    setSelectedMethod(data[0].provider);
                }
            } catch (err) {
                console.error('Failed to fetch payment methods', err);
            }
        };
        if (role === 'buyer') {
            fetchMethods();
        }
    }, [role]);

    const handlePrintLabel = async () => {
        try {
            const { data } = await api.get(`/orders/${orderId}/shipping-label`);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(data);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load shipping label.', 'error');
        }
    };

    useEffect(() => {
        if (order && order.is_split_payment && order.deposit_paid && !order.balance_paid && order.status?.toLowerCase() !== 'cancelled' && searchParams && searchParams.get('pay_balance') === 'true') {
            setShowPaymentModal(true);
        }
    }, [order, searchParams]);

    const handleConfirmDelivery = () => {
        if (order?.is_split_payment && !order?.balance_paid) {
            showToast('Please pay the remaining balance amount before confirming delivery.', 'warning', 'Payment Required');
            return;
        }
        setIsConfirmOpen(true);
    };

    const executeConfirmDelivery = async () => {
        try {
            await api.put(`/orders/${orderId}/confirm-delivery`);
            setOrder((prev: any) => prev ? { ...prev, status: 'delivered' } : null);
            showToast('Delivery confirmed successfully!', 'success', 'Success');
        } catch (err) {
            showToast((err as any).response?.data?.message || 'Failed to confirm delivery', 'error', 'Error');
        }
    };

    const handleDownloadDigitalFile = async (orderId: string, productId: string) => {
        try {
            const { data } = await api.post('/products/download-token', {
                order_id: orderId,
                product_id: productId
            });
            if (data?.downloadUrl) {
                const base = (api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api$/, '');
                const downloadLink = `${base}${data.downloadUrl}`;
                window.open(downloadLink, '_blank');
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to generate download link');
        }
    };

    const executeCancelOrder = async () => {
        try {
            await api.put(`/orders/${orderId}/cancel`);
            const { data } = await api.get(`/orders/${orderId}`);
            setOrder(data);
            showToast('Order cancelled successfully!', 'success', 'Success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to cancel order', 'error', 'Error');
        }
    };

    const handlePayBalance = async (selectedMethod: string) => {
        setBalancePaying(true);
        try {
            const { data } = await api.post(`/orders/${orderId}/pay-balance`, { paymentMethod: selectedMethod });
            if (data.url) {
                window.location.href = data.url;
            } else if (selectedMethod === 'razorpay') {
                if (data.is_mock) {
                    await api.post('/orders/verify-razorpay', {
                        razorpay_order_id: data.id,
                        razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 11),
                        razorpay_signature: 'mock_signature'
                    });
                    const updated = await api.get(`/orders/${orderId}`);
                    setOrder(updated.data);
                    showToast('Remaining balance paid successfully (Mock Sandbox)!', 'success', 'Success');
                    const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                    setTimeout(() => {
                        navigate.push(`${baseRoute}/orders`);
                    }, 1500);
                } else {
                    const options = {
                        key: data.key,
                        amount: data.amount,
                        currency: data.currency,
                        name: "B2B Marketplace",
                        description: "Final Balance Payment",
                        order_id: data.id,
                        handler: async function (response: any) {
                            try {
                                await api.post('/orders/verify-razorpay', {
                                    razorpay_order_id: response.razorpay_order_id || data.id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature
                                });
                                const updated = await api.get(`/orders/${orderId}`);
                                setOrder(updated.data);
                                showToast('Remaining balance paid successfully!', 'success', 'Success');
                                const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                setTimeout(() => {
                                    navigate.push(`${baseRoute}/orders`);
                                }, 1500);
                            } catch (err) {
                                showToast('Verification failed. Please contact support.', 'error', 'Error');
                            }
                        },
                        prefill: {
                            name: order.shipping_address?.fullName || '',
                            email: order.buyer_id?.email || '',
                            contact: order.shipping_address?.phone || ''
                        },
                        theme: {
                            color: "#ff6600"
                        }
                    };
                    if (!(window as any).Razorpay) {
                        const script = document.createElement('script');
                        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                        script.onload = () => {
                            const rzp = new (window as any).Razorpay(options);
                            rzp.open();
                        };
                        document.body.appendChild(script);
                    } else {
                        const rzp = new (window as any).Razorpay(options);
                        rzp.open();
                    }
                }
            }
        } catch (err: any) {
            console.error('Balance payment error:', err);
            showToast(err.response?.data?.message || 'Failed to initiate balance payment', 'error', 'Error');
        } finally {
            setBalancePaying(false);
        }
    };

    if (loading) return (
        <div style={{ padding: 60, textAlign: 'center', fontWeight: 700, color: '#0f172a', animation: 'pulse 1.4s ease infinite', fontFamily: 'Inter, sans-serif' }}>
            Loading Order Details…
        </div>
    );

    if (error) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{error}</p>
            <button onClick={() => navigate.back()} className={styles['od-action-btn'] + " " + styles['primary']}>← Back to Orders</button>
        </div>
    );

    if (!order) return <div style={{ padding: 40, textAlign: 'center' }}>Order not found</div>;

    const statusInfo = STATUS_MAP[(order.status || '').toLowerCase() as keyof typeof STATUS_MAP] || { color: '#64748b', bg: '#f3f4f6', border: '#e5e7eb', label: order.status };
    const totalAmount = Number(order.total_amount || 0);
    const taxAmount = Number(order.tax_amount || 0);
    const shippingFee = Number(order.shipping_fee || 0);
    const itemSubtotal = order.order_items?.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0;
    const subtotal = totalAmount - taxAmount - shippingFee;

    const getPaymentBadgeClass = (status: string) => {
        if (status === 'paid') return 'paid';
        if (status === 'partially_paid') return 'partially-paid';
        return 'unpaid';
    };

    return (
        <div className={styles['order-detail-page']}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 0' }}>

                {/* Pay Balance Notification Banner */}
                {role === 'buyer' && order.is_split_payment && order.deposit_paid && !order.balance_paid && order.status?.toLowerCase() !== 'cancelled' && (
                    <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: 16,
                        padding: '20px 24px',
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                background: '#1e40af',
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 20
                            }}>
                                💳
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a8a' }}>Partially Paid Order</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#1e40af' }}>
                                    You have secured this order with a 30% deposit. The remaining 70% balance ({convertPrice(order.balance_amount).formatted}) is due.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={balancePaying}
                            className={styles['od-action-btn'] + " " + styles['primary']}
                            style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
                        >
                            {balancePaying ? 'Redirecting...' : 'Pay Remaining Balance'}
                        </button>
                    </div>
                )}

                {/* ── Header ── */}
                <div className={styles['od-page-header']}>
                    <div>
                        <button onClick={() => navigate.back()} className={styles['od-back-btn']}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                            Back to Orders
                        </button>
                        <h1 className={styles['od-page-title']}>Order Details</h1>
                        <p className={styles['od-order-id']}>#{order._id?.slice(-16).toUpperCase()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/supplier/dashboard') ? '/supplier/dashboard' : '/dashboard';
                                navigate.push(`${baseRoute}/invoice/${orderId}`);
                            }}
                            className={styles['od-action-btn']}
                            style={{ background: 'white', color: '#374151', border: '1.5px solid #e2e8f0' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            View Invoice
                        </button>
                        {role === 'buyer' && ['pending', 'confirmed'].includes(order.status) && (
                            <button
                                onClick={() => setIsCancelConfirmOpen(true)}
                                className={styles['od-action-btn']}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }}
                            >
                                ✕ Cancel Order
                            </button>
                        )}
                        {role === 'buyer' && order.status === 'shipped' && (
                            <button 
                                onClick={handleConfirmDelivery}
                                className={styles['od-action-btn'] + " " + styles['primary']}
                            >
                                ✓ Confirm Delivery
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Top Metrics Grid ── */}
                <div className={styles['od-metrics-grid']}>
                    {/* Order Placed */}
                    <div className={styles['od-metric-card']}>
                        <div className={styles['od-metric-icon-wrap']} style={{ background: '#eff6ff' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div className={styles['od-metric-content']}>
                            <p className={styles['od-metric-title']}>Order Placed</p>
                            <p className={styles['od-metric-val']} style={{ fontSize: '13px' }}>
                                {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className={styles['od-metric-sub']}>
                                {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className={styles['od-metric-card']}>
                        <div className={styles['od-metric-icon-wrap']} style={{ background: '#ecfdf5' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="16"/>
                                <line x1="8" y1="12" x2="16" y2="12"/>
                            </svg>
                        </div>
                        <div className={styles['od-metric-content']}>
                            <p className={styles['od-metric-title']}>Payment Method</p>
                            <p className={styles['od-metric-val']}>{order.payment_provider ? order.payment_provider.charAt(0).toUpperCase() + order.payment_provider.slice(1) : 'Card'}</p>
                            <span className={styles['od-metric-sub']} style={{
                                display: 'inline-block',
                                background: order.payment_status === 'paid' ? '#dcfce7' : (order.payment_status === 'partially_paid' ? '#dbeafe' : '#fee2e2'),
                                color: order.payment_status === 'paid' ? '#16a34a' : (order.payment_status === 'partially_paid' ? '#2563eb' : '#dc2626'),
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                width: 'fit-content',
                                marginTop: '2px'
                            }}>
                                {order.payment_status ? order.payment_status.replace('_', ' ') : 'Unpaid'}
                            </span>
                        </div>
                    </div>

                    {/* Order Total */}
                    <div className={styles['od-metric-card']}>
                        <div className={styles['od-metric-icon-wrap']} style={{ background: '#fff7ed' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                        </div>
                        <div className={styles['od-metric-content']}>
                            <p className={styles['od-metric-title']}>Order Total</p>
                            <p className={styles['od-metric-val']}>{convertPrice(order.total_amount).formatted}</p>
                            <p className={styles['od-metric-sub']}>{order.order_items?.length || 0} Item{order.order_items?.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Current Status */}
                    <div className={styles['od-metric-card']}>
                        <div className={styles['od-metric-icon-wrap']} style={{ background: '#f5f3ff' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div className={styles['od-metric-content']}>
                            <p className={styles['od-metric-title']}>Current Status</p>
                            <p className={styles['od-metric-val']} style={{ color: statusInfo.color }}>{statusInfo.label.toUpperCase()}</p>
                            <p className={styles['od-metric-sub']}>
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Main Layout ── */}
                <div className={styles['od-detail-grid']}>

                    {/* ─── Left Column ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Timeline */}
                        <OrderTimeline timeline={order.timeline} currentStatus={order.status} />

                        {/* Order Items */}
                        <div className={styles['od-card']}>
                            <h3 className={styles['od-card-title']}>
                                <div className={styles['od-card-title-icon']} style={{ background: '#eff6ff' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5">
                                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                                    </svg>
                                </div>
                                Ordered Items
                                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                                    {order.order_items?.length} item{order.order_items?.length !== 1 ? 's' : ''}
                                </span>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {order.order_items?.map((item: any, idx: number) => (
                                    <div key={idx} className={styles['od-item-row']}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div className={styles['od-item-thumb']}>
                                                <img src={getImgUrl(item.image)} alt={item.name} />
                                            </div>
                                             <div>
                                                 <p className={styles['od-item-name']}>{item.name}</p>
                                                 <p className={styles['od-item-qty']}>Qty: {item.quantity}</p>
                                                 {role === 'buyer' && order.payment_status === 'paid' && item.product_id?.isDigital && (
                                                     <button
                                                         onClick={() => handleDownloadDigitalFile(order._id, item.product_id._id || item.product_id)}
                                                         style={{
                                                             marginTop: '6px',
                                                             padding: '4px 10px',
                                                             background: '#eff6ff',
                                                             border: '1px solid #bfdbfe',
                                                             color: '#1d4ed8',
                                                             borderRadius: '6px',
                                                             fontSize: '0.7rem',
                                                             fontWeight: 700,
                                                             cursor: 'pointer',
                                                             display: 'inline-flex',
                                                             alignItems: 'center',
                                                             gap: '6px'
                                                         }}
                                                     >
                                                         📥 Download Digital File
                                                     </button>
                                                 )}
                                             </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p className={styles['od-item-price']}>{convertPrice(item.price).formatted}</p>
                                            <p className={styles['od-item-price-label']}>Unit Price</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shipping & Logistics */}
                        <div className={styles['od-card']}>
                            <h3 className={styles['od-card-title']}>
                                <div className={styles['od-card-title-icon']} style={{ background: '#f0fdf4' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                        <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                                    </svg>
                                </div>
                                Shipping & Logistics
                            </h3>
                            <div className={styles['od-shipping-grid']}>
                                <div>
                                    <p className={styles['od-field-label']}>Delivery Address</p>
                                    {order.shipping_address ? (
                                        <div className={styles['od-field-value']}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                                                {order.shipping_address.fullName}
                                            </div>
                                            <div>{order.shipping_address.addressLine}</div>
                                            <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}</div>
                                            <div style={{ color: '#0f172a', fontWeight: 700 }}>{order.shipping_address.country}</div>
                                        </div>
                                    ) : (
                                        <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No address provided</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className={styles['od-tracking-box']}>
                                        <p className={styles['od-field-label']}>Carrier Service</p>
                                        <p className={styles['od-tracking-val']} style={{ fontFamily: 'Inter, sans-serif', letterSpacing: 'normal' }}>
                                            {order.shipping_company || 'Pending Fulfillment'}
                                        </p>
                                    </div>
                                    <div className={styles['od-tracking-box']}>
                                        <p className={styles['od-field-label']}>Tracking Number</p>
                                        <p className={styles['od-tracking-val']}>{order.tracking_number || 'Not Assigned'}</p>
                                    </div>
                                    {order.tracking_number && (user?.role === 'supplier' || user?.role === 'admin' || user?.roles?.includes('supplier') || user?.roles?.includes('admin')) && (
                                        <button 
                                            type="button" 
                                            onClick={handlePrintLabel} 
                                            style={{
                                                marginTop: '8px',
                                                padding: '10px 16px',
                                                background: '#ff6600',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 10px rgba(255,102,0,0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>🖨️</span> Print Shipping Label
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right Column ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Status + Summary */}
                        <div className={styles['od-summary-card']}>
                            <div className={styles['od-summary-status-banner']} style={{ background: statusInfo.bg, borderBottom: `2px solid ${statusInfo.border}` }}>
                                <p className={styles['od-summary-status-label']}>Current Status</p>
                                <p className={styles['od-summary-status-value']} style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                                <div style={{
                                    marginTop: 6,
                                    padding: '3px 14px',
                                    background: statusInfo.border,
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: statusInfo.color,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase'
                                }}>
                                    {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div className={styles['od-summary-body']}>
                                <div className={styles['od-summary-row']}>
                                    <span className={styles['od-summary-key']}>Payment</span>
                                    <span className={`payment-badge ${getPaymentBadgeClass(order.payment_status)}`} style={{ fontSize: 11, padding: '3px 10px' }}>
                                        {order.payment_status === 'partially_paid' ? 'PARTIALLY PAID' : order.payment_status?.toUpperCase()}
                                    </span>
                                </div>
                                <div className={styles['od-summary-row']}>
                                    <span className={styles['od-summary-key']}>Provider</span>
                                    <span className={styles['od-summary-val']}>{order.payment_provider || 'CARD'}</span>
                                </div>
                                <div className={styles['od-summary-row']}>
                                    <span className={styles['od-summary-key']}>Subtotal</span>
                                    <span className={styles['od-summary-val']}>{convertPrice(itemSubtotal).formatted}</span>
                                </div>
                                <div className={styles['od-summary-row']}>
                                    <span className={styles['od-summary-key']}>Shipping</span>
                                    <span className={styles['od-summary-val']}>{convertPrice(order.shipping_fee || 0).formatted}</span>
                                </div>
                                {order.tax_amount > 0 && (
                                    <div className={styles['od-summary-row']}>
                                        <span className={styles['od-summary-key']}>Tax</span>
                                        <span className={styles['od-summary-val']}>{convertPrice(order.tax_amount).formatted}</span>
                                    </div>
                                )}
                                {order.duty_fee > 0 && (
                                    <div className={styles['od-summary-row']}>
                                        <span className={styles['od-summary-key']}>Import Duty</span>
                                        <span className={styles['od-summary-val']}>{convertPrice(order.duty_fee).formatted}</span>
                                    </div>
                                )}
                                {order.service_fee > 0 && (
                                    <div className={styles['od-summary-row']}>
                                        <span className={styles['od-summary-key']}>Service Fee</span>
                                        <span className={styles['od-summary-val']}>{convertPrice(order.service_fee).formatted}</span>
                                    </div>
                                )}
                                {order.gift_wrap?.selected && (
                                    <div className={styles['od-summary-row']}>
                                        <span className={styles['od-summary-key']}>Gift Wrap Services</span>
                                        <span className={styles['od-summary-val']}>{convertPrice(order.gift_wrap.fee || 5.00).formatted}</span>
                                    </div>
                                )}
                                {order.discount_amount > 0 && (
                                    <div className={styles['od-summary-row']} style={{ color: '#dc2626' }}>
                                        <span className={styles['od-summary-key']} style={{ color: '#dc2626' }}>Coupon Discount ({order.coupon_code})</span>
                                        <span className={styles['od-summary-val']}>-{convertPrice(order.discount_amount).formatted}</span>
                                    </div>
                                )}
                                {order.points_discount > 0 && (
                                    <div className={styles['od-summary-row']} style={{ color: '#dc2626' }}>
                                        <span className={styles['od-summary-key']} style={{ color: '#dc2626' }}>Coins Discount ({order.redeemed_points} coins)</span>
                                        <span className={styles['od-summary-val']}>-{convertPrice(order.points_discount).formatted}</span>
                                    </div>
                                )}
                                {order.gift_card_discount > 0 && (
                                    <div className={styles['od-summary-row']} style={{ color: '#7c3aed', fontWeight: 600 }}>
                                        <span className={styles['od-summary-key']} style={{ color: '#7c3aed' }}>Gift Card ({order.gift_card_code})</span>
                                        <span className={styles['od-summary-val']}>-{convertPrice(order.gift_card_discount).formatted}</span>
                                    </div>
                                )}
                                {order.gift_message && (
                                    <div style={{ marginTop: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#b45309' }}>🎁 Gift Message:</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', fontStyle: 'italic', color: '#78350f' }}>"{order.gift_message}"</p>
                                    </div>
                                )}
                                {order.is_split_payment && (
                                    <>
                                        <div className={styles['od-summary-row']} style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
                                            <span className={styles['od-summary-key']}>30% Deposit Amount</span>
                                            <span className={styles['od-summary-val']}>{convertPrice(order.deposit_amount).formatted}</span>
                                        </div>
                                        <div className={styles['od-summary-row']}>
                                            <span className={styles['od-summary-key']}>Deposit Paid?</span>
                                            <span className={styles['od-summary-val']} style={{ color: order.deposit_paid ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                                {order.deposit_paid ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div className={styles['od-summary-row']}>
                                            <span className={styles['od-summary-key']}>70% Balance Amount</span>
                                            <span className={styles['od-summary-val']}>{convertPrice(order.balance_amount).formatted}</span>
                                        </div>
                                        <div className={styles['od-summary-row']}>
                                            <span className={styles['od-summary-key']}>Balance Paid?</span>
                                            <span className={styles['od-summary-val']} style={{ color: order.balance_paid ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                                {order.balance_paid ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {order.is_emi && order.emi_schedule_id && (() => {
                                    const nextDue = order.emi_schedule_id.installments.find((i: any) => i.status === 'pending' || i.status === 'overdue');
                                    const currentInstallment = nextDue || order.emi_schedule_id.installments[order.emi_schedule_id.installments.length - 1];

                                    return (
                                        <div style={{ marginTop: '16px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                                            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>EMI Payment Details</p>
                                            
                                            {/* Current Month Highlight */}
                                            {currentInstallment && (
                                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>This Month (Month {currentInstallment.number})</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{convertPrice(currentInstallment.amount).formatted}</span>
                                                        <span style={{ 
                                                            fontSize: '11px', 
                                                            padding: '2px 8px', 
                                                            borderRadius: '6px', 
                                                            background: currentInstallment.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                                            color: currentInstallment.status === 'paid' ? '#16a34a' : '#dc2626',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {currentInstallment.status === 'pending' ? 'unpaid' : currentInstallment.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>All Months Timeline</p>
                                            {order.emi_schedule_id.installments.map((inst: any, idx: number) => (
                                                <div key={idx} className={styles['od-summary-row']} style={{ marginBottom: '6px' }}>
                                                    <span className={styles['od-summary-key']}>Month {inst.number}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className={styles['od-summary-val']}>{convertPrice(inst.amount).formatted}</span>
                                                        <span style={{ 
                                                            fontSize: '10px', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px', 
                                                            background: inst.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                                            color: inst.status === 'paid' ? '#16a34a' : '#dc2626',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {inst.status === 'pending' ? 'unpaid' : inst.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div className={styles['od-total-row']}>
                                    <span className={styles['od-total-label']}>Total</span>
                                    <span className={styles['od-total-val']}>{convertPrice(order.total_amount).formatted}</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Info (Only show to buyer) */}
                        {role === 'buyer' && (
                            <div className={styles['od-supplier-card']}>
                                <p className={styles['od-supplier-label']}>Supplier Information <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', background: '#34d399', color: '#1e3a8a', borderRadius: '50%', marginLeft: '6px', fontSize: '10px' }}>✓</span></p>
                                <p className={styles['od-supplier-name']}>{order.supplier_id?.company_name || 'Verified Partner'}</p>
                                <p className={styles['od-supplier-tag']}>✓ Verified Global Supplier</p>

                                <div className={styles['od-supplier-features']}>
                                    <div className={styles['od-supplier-feature']}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                        </svg>
                                        <span>High Quality</span>
                                    </div>
                                    <div className={styles['od-supplier-feature']}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                        <span>On-time Delivery</span>
                                    </div>
                                    <div className={styles['od-supplier-feature']}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                        <span>Secure Payment</span>
                                    </div>
                                </div>

                                <button 
                                    className={styles['od-supplier-btn']}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/messages?chat_user=${order.supplier_id?._id}`);
                                    }}
                                >
                                    💬 Contact Supplier
                                </button>
                            </div>
                        )}

                        {/* Buyer Info (Only show to supplier) */}
                        {role === 'supplier' && (
                            <div className={styles['od-supplier-card']}>
                                <p className={styles['od-supplier-label']}>Buyer Information</p>
                                <p className={styles['od-supplier-name']}>
                                    {order.buyer_id?.first_name} {order.buyer_id?.last_name}
                                </p>
                                <p className={styles['od-supplier-tag']}>{order.buyer_id?.email}</p>

                                <div className={styles['od-supplier-features']}>
                                    <div className={styles['od-supplier-feature']}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                            <polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                        <span>Verified Buyer</span>
                                    </div>
                                    <div className={styles['od-supplier-feature']}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                        <span>Responsive</span>
                                    </div>
                                </div>

                                <button 
                                    className={styles['od-supplier-btn']}
                                    onClick={() => {
                                        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/supplier/dashboard') ? '/supplier/dashboard' : '/dashboard';
                                        navigate.push(`${baseRoute}/messages?chat_user=${order.buyer_id?._id}`);
                                    }}
                                >
                                    💬 Message Buyer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={executeConfirmDelivery}
                title="Confirm Delivery"
                message="Are you sure you want to confirm delivery? This will mark the order as delivered."
                confirmText="Confirm"
                cancelText="Cancel"
                variant="warning"
            />

            <ConfirmationModal
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={executeCancelOrder}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone."
                confirmText="Cancel Order"
                cancelText="Keep Order"
                variant="danger"
            />

            {/* Choose Payment Popup Modal */}
            {showPaymentModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <button onClick={() => setShowPaymentModal(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f8fafc', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '18px' }}>&times;</button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Choose Payment</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>Final Balance Payment</p>
                        </div>

                        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                            {(enabledMethods.length > 0 ? enabledMethods : [{ provider: 'stripe' }, { provider: 'razorpay' }]).map(m => (
                                <div
                                    key={m.provider}
                                    onClick={() => setSelectedMethod(m.provider)}
                                    style={{
                                        padding: '16px 20px',
                                        borderRadius: '16px',
                                        border: `2px solid ${selectedMethod === m.provider ? 'var(--primary-color, #ff6600)' : '#f1f5f9'}`,
                                        background: selectedMethod === m.provider ? '#f8faff' : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem', textTransform: 'capitalize' }}>{m.provider.replace('_', ' ')}</span>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selectedMethod === m.provider ? 'var(--primary-color, #ff6600)' : '#cbd5e1'}`, background: selectedMethod === m.provider ? 'var(--primary-color, #ff6600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {selectedMethod === m.provider && <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                handlePayBalance(selectedMethod);
                                setShowPaymentModal(false);
                            }}
                            disabled={balancePaying}
                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary-color, #ff6600)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', transition: 'all 0.2s' }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {balancePaying ? 'Redirecting...' : 'Proceed to Checkout'}
                        </button>
                    </div>
                </div>
            )}
            {/* CSS for payment badge inside this component */}
            <style>{`
                .payment-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; font-size: 11px; font-weight: 700; }
                .payment-badge.paid { background: #dcfce7; color: #15803d; }
                .payment-badge.partially-paid { background: #eff6ff; color: #1d4ed8; }
                .payment-badge.unpaid { background: #fff7ed; color: #c2410c; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default OrderDetail;
