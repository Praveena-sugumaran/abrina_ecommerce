'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';


interface OrderItem {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    productId?: any;
}

interface Order {
    _id: string;
    status: string;
    payment_status: string;
    total_amount: number;
    tax_amount?: number;
    shipping_fee?: number;
    service_fee?: number;
    duty_fee?: number;
    shipping_address?: any;
    order_items?: OrderItem[];
    shipping_company?: string;
    tracking_number?: string;
    supplier_id?: {
        _id: string;
        first_name: string;
        last_name: string;
        email: string;
        company_name?: string;
        is_verified?: boolean;
        subscription_plan?: string;
    };
    buyer_id?: {
        first_name: string;
        last_name: string;
        email: string;
    };
    tax_info?: {
        name?: string;
    };
    gift_wrap?: {
        selected?: boolean;
        fee?: number;
    };
    gift_message?: string;
    discount_amount?: number;
    points_discount?: number;
    redeemed_points?: number;
    coupon_code?: string;
    gift_card_discount?: number;
    gift_card_code?: string;
}

const AdminOrderDetail = () => {
    const { t, convertPrice } = useAuth();
    const { showToast } = useToast();
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [supplierCompany, setSupplierCompany] = useState<any>(null);
    
    // Tracking States
    const [sc, setSc] = useState('');
    const [tn, setTn] = useState('');

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    const fetchOrderDetail = async () => {
        try {
            const { data } = await api.get(`/orders/admin/all`);
            const foundOrder = data.find((o: any) => o._id === id);
            setOrder(foundOrder);
            if (foundOrder) {
                setSc(foundOrder.shipping_company || '');
                setTn(foundOrder.tracking_number || '');
                if (foundOrder.supplier_id && foundOrder.supplier_id._id) {
                    try {
                        const { data: cData } = await api.get(`/company/supplier/${foundOrder.supplier_id._id}`);
                        setSupplierCompany(cData?.company);
                    } catch (err) { }
                }
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus?: string) => {
        if (!order) return;
        setUpdating(true);
        try {
            await api.put(`/orders/${id}/status`, { 
                status: newStatus || order.status,
                tracking_number: tn,
                shipping_company: sc
            });
            showToast('Order status updated', 'success');
            fetchOrderDetail();
        } catch (err) {
            showToast('Failed to update status', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return "admin-badge-success";
            case 'pending': return "admin-badge-warning";
            case 'shipped': return "admin-badge-info";
            case 'cancelled': return "admin-badge-danger";
            case 'delivered': return "admin-badge-neutral";
            default: return "admin-badge-neutral";
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return "admin-badge-success";
            case 'refunded': return "admin-badge-warning";
            case 'unpaid': return "admin-badge-danger";
            case 'disputed': return "admin-badge-danger";
            default: return "admin-badge-neutral";
        }
    };

    if (loading) return <div className={"admin-loading-text"}>Loading Order Details...</div>;
    if (!order) return <div className={styles['admin-alert'] + " " + styles['admin-alert-error'] + " " + styles['m-8']}>Order not found.</div>;

    const shippingAddress = order.shipping_address || {};
    const itemSubtotal = order.order_items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0;

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"}>
                <div>
                    <h1 className={"admin-page-title"}>Order Detail</h1>
                    <p className={"admin-page-subtitle"}>Order #{order._id}</p>
                </div>
                <div className={"admin-page-actions"}>
                    <button onClick={() => router.back()} className={styles['admin-back-btn']}>
                        ← Back to Orders
                    </button>
                </div>
            </div>

            <div className={styles['admin-order-detail-grid']}>
                
                {/* Left side: Items & Addresses */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div className={"admin-card"}>
                        <div className={"admin-card-header"}>
                            <h2>Order Items</h2>
                        </div>
                        <div className={"admin-card-body"} style={{ padding: '0' }}>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <table className={"admin-table"} style={{ minWidth: '600px' }}>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.order_items?.map((item: OrderItem, idx: number) => {
                                        const imgPath = item.image || item.productId?.image || null;
                                        const imgSrc = getImgUrl(imgPath);
                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {imgSrc ? (
                                                                <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onErrorCapture={(e: any) => e.target.style.display = 'none'} />
                                                            ) : (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                                                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                                                    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-admin-main" style={{ fontSize: '13px', fontWeight: 800, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {item.name}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 700 }}>SKU: {typeof item.productId === 'string' ? item.productId.substring(18, 24).toUpperCase() : item.productId?._id?.substring(18, 24).toUpperCase() || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                 <td className="text-admin-main" style={{ fontWeight: 800 }}>{convertPrice(item.price || 0).formatted}</td>
                                                 <td className="text-admin-main" style={{ fontWeight: 800 }}>{item.quantity}</td>
                                                 <td className="text-admin-main" style={{ textAlign: 'right', fontWeight: 900 }}>
                                                     {convertPrice((item.price || 0) * item.quantity).formatted}
                                                 </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Price Summary Breakdown */}
                            <div className={styles['admin-order-summary-box']}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                    <span>Subtotal</span>
                                    <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(itemSubtotal).formatted}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                    <span>Shipping Fee</span>
                                    <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(order.shipping_fee || 0).formatted}</span>
                                </div>
                                {(order.tax_amount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                        <span>Tax {order.tax_info?.name ? `(${order.tax_info.name})` : ''}</span>
                                        <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(order.tax_amount || 0).formatted}</span>
                                    </div>
                                )}
                                {(order.duty_fee || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                        <span>Import Duty</span>
                                        <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(order.duty_fee || 0).formatted}</span>
                                    </div>
                                )}
                                {(order.service_fee || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                        <span>Service Fee</span>
                                        <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(order.service_fee || 0).formatted}</span>
                                    </div>
                                )}
                                {order.gift_wrap?.selected && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                        <span>Gift Wrap Services</span>
                                        <span style={{ color: 'var(--admin-text-secondary)' }}>{convertPrice(order.gift_wrap.fee || 5.00).formatted}</span>
                                    </div>
                                )}
                                {(order.discount_amount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                                        <span>Coupon Discount ({order.coupon_code})</span>
                                        <span>-{convertPrice(order.discount_amount || 0).formatted}</span>
                                    </div>
                                )}
                                {(order.points_discount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                                        <span>Coins Discount ({order.redeemed_points} coins)</span>
                                        <span>-{convertPrice(order.points_discount || 0).formatted}</span>
                                    </div>
                                )}
                                {(order.gift_card_discount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '12px', fontWeight: 700, color: '#7c3aed' }}>
                                        <span>Gift Card ({order.gift_card_code})</span>
                                        <span>-{convertPrice(order.gift_card_discount || 0).formatted}</span>
                                    </div>
                                )}
                                <div className="text-admin-main" style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '14px', fontWeight: 900, borderTop: '1px dashed var(--admin-border)', paddingTop: '12px', marginTop: '4px' }}>
                                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Amount</span>
                                    <span className="text-admin-main" style={{ fontSize: '18px' }}>{convertPrice(order.total_amount || 0).formatted}</span>
                                </div>
                                {order.gift_message && (
                                    <div style={{ width: '250px', marginTop: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '11px', textAlign: 'left' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: '#b45309' }}>🎁 Gift Message:</p>
                                        <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: '#78350f' }}>"{order.gift_message}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles['admin-form-grid']}>
                        {/* Buyer / Customer Card */}
                        <div className={"admin-card"} style={{ border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
                            <div className={"admin-card-header"} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--admin-border-subtle)', background: 'color-mix(in srgb, #3b82f6 6%, var(--admin-card-bg))' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                    <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--admin-text-main)' }}>Buyer Details</h2>
                                </div>
                                <span className="admin-badge admin-badge-info" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: '800' }}>BUYER</span>
                            </div>
                            <div className={"admin-card-body"} style={{ padding: '20px' }}>
                                {/* Profile Avatar & Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px dashed var(--admin-border)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', flexShrink: 0 }}>
                                        {order.buyer_id?.first_name?.charAt(0).toUpperCase() || 'B'}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div className="text-admin-main" style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {order.buyer_id?.first_name} {order.buyer_id?.last_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 600, marginTop: '2px' }}>
                                            Customer Account
                                        </div>
                                    </div>
                                </div>

                                {/* Info Field Stack */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            Email Address
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', wordBreak: 'break-all' }}>
                                            {order.buyer_id?.email || 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                            Contact Phone
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                                            {shippingAddress?.phone || 'Not provided'}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                            Delivery Location
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)', lineHeight: '1.4' }}>
                                            {shippingAddress?.city ? `${shippingAddress.city}, ${shippingAddress.state || ''} ${shippingAddress.country || ''}` : 'See Shipping Address below'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seller / Supplier Card */}
                        <div className={"admin-card"} style={{ border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
                            <div className={"admin-card-header"} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--admin-border-subtle)', background: 'color-mix(in srgb, #ff6a00 6%, var(--admin-card-bg))' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffedd5', color: '#ff6a00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                                            <path d="M2 7h20" />
                                        </svg>
                                    </div>
                                    <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--admin-text-main)' }}>Seller Details</h2>
                                </div>
                                <span className="admin-badge admin-badge-success" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: '800' }}>
                                    ✓ VERIFIED SELLER
                                </span>
                            </div>
                            <div className={"admin-card-body"} style={{ padding: '20px' }}>
                                {/* Merchant Logo & Business Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px dashed var(--admin-border)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6a00 0%, #ea580c 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 12px rgba(255,106,0,0.25)', flexShrink: 0 }}>
                                        {(supplierCompany?.company_name || order.supplier_id?.company_name || order.supplier_id?.first_name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div className="text-admin-main" style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {supplierCompany?.company_name || order.supplier_id?.company_name || `${order.supplier_id?.first_name || ''} ${order.supplier_id?.last_name || ''}`.trim() || 'N/A'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>✓ Official B2B Supplier</span>
                                            {order.supplier_id?.subscription_plan && (
                                                <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '9px' }}>
                                                    {order.supplier_id.subscription_plan}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Items Stack */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            Contact Person
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                                            {order.supplier_id?.first_name} {order.supplier_id?.last_name}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            Merchant Email
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', wordBreak: 'break-all' }}>
                                            {order.supplier_id?.email || 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                                            Tax / Business ID
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                                            {supplierCompany?.tax_id || supplierCompany?.business_reg_number || 'B2B Registered Merchant'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={"admin-card"}>
                        <div className={"admin-card-header"}>
                            <h2>Shipping Address</h2>
                        </div>
                        <div className={"admin-card-body"}>
                            {shippingAddress.addressLine ? (
                                <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                                    <div className="text-admin-main" style={{ fontWeight: 800 }}>{shippingAddress.fullName}</div>
                                    {shippingAddress.phone && <div>Phone: {shippingAddress.phone}</div>}
                                    {shippingAddress.addressLine}<br />
                                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}<br />
                                    {shippingAddress.country}
                                </div>
                            ) : Object.keys(shippingAddress).length > 0 ? (
                                <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                                    {Object.values(shippingAddress).filter(Boolean).join(', ')}
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No shipping address provided.</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right side: Status & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div className={"admin-card"}>
                        <div className={"admin-card-header"}>
                            <h2>Status & Actions</h2>
                        </div>
                        <div className={"admin-card-body"}>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Order Status</div>
                                <span className={`${"admin-badge"} ${getStatusColor(order.status)}`} style={{ fontSize: '12px', padding: '6px 16px' }}>
                                    {order.status}
                                </span>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Payment Status</div>
                                <span className={`${"admin-badge"} ${getPaymentStatusColor(order.payment_status)}`} style={{ fontSize: '12px', padding: '6px 16px' }}>
                                    {order.payment_status}
                                </span>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tracking Info</div>
                                    <button 
                                        onClick={() => updateStatus()} 
                                        disabled={updating || (sc === order.shipping_company && tn === order.tracking_number)}
                                        className="text-admin-main"
                                        style={{ fontSize: '10px', background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: (sc === order.shipping_company && tn === order.tracking_number) ? 0 : 1, transition: 'opacity 0.2s', textDecoration: 'underline' }}
                                    >
                                        Save Info
                                    </button>
                                </div>
                                <div className={styles['admin-section-box']} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Carrier</div>
                                        <input 
                                            type="text" 
                                            className={styles['admin-form-input']} 
                                            value={sc} 
                                            onChange={e => setSc(e.target.value)} 
                                            placeholder="e.g. FedEx, UPS, DHL..." 
                                            style={{ padding: '8px 12px', fontSize: '12px' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Tracking Number</div>
                                        <input 
                                            type="text" 
                                            className={styles['admin-form-input']} 
                                            value={tn} 
                                            onChange={e => setTn(e.target.value)} 
                                            placeholder="Tracking Code" 
                                            style={{ padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--admin-border-subtle)', paddingTop: '24px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--admin-text-main)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', lineHeight: '1.4', paddingTop: '16px' }}>Update Status</div>
                                
                                <button
                                    onClick={() => updateStatus('confirmed')}
                                    disabled={updating || order.status === 'confirmed'}
                                    className={`${styles['admin-btn']} ${styles['admin-btn-success']}`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Mark as Confirmed
                                </button>

                                <button
                                    onClick={() => updateStatus('shipped')}
                                    disabled={updating || order.status === 'shipped'}
                                    className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Mark as Shipped
                                </button>

                                <button
                                    onClick={() => updateStatus('delivered')}
                                    disabled={updating || order.status === 'delivered'}
                                    className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Mark as Delivered
                                </button>

                                <button
                                    onClick={() => updateStatus('cancelled')}
                                    disabled={updating || order.status === 'cancelled'}
                                    className={`${styles['admin-btn']} ${styles['admin-btn-danger']}`}
                                    style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                                >
                                    Cancel Order
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminOrderDetail;
