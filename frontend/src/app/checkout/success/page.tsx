'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

interface OrderItem {
    _id: string;
    product_id: {
        _id: string;
        name: string;
        main_image?: string;
        isDigital?: boolean;
        digitalFile?: string;
    };
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

interface Order {
    _id: string;
    createdAt: string;
    total_amount: number;
    shipping_fee: number;
    tax_amount: number;
    payment_method: string;
    payment_status: string;
    status: string;
    order_items: OrderItem[];
    shipping_address: {
        fullName: string;
        phone: string;
        addressLine: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
}

export default function GuestCheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const sessionId = searchParams.get('session_id');
    const payPalToken = searchParams.get('token');
    const orderIdParam = searchParams.get('order_id');
    const statusParam = searchParams.get('status');

    const [verifying, setVerifying] = useState(true);
    const [verifyingError, setVerifyingError] = useState('');
    const [order, setOrder] = useState<Order | null>(null);
    const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const verifyAndLoadOrder = async () => {
            setVerifying(true);
            try {
                // 1. Run Verification if session references are present
                if (sessionId && statusParam === 'success') {
                    await api.post('/orders/verify-session', { sessionId });
                } else if (payPalToken && statusParam === 'success') {
                    // Pass a default mock amount if verifying a PayPal checkout
                    await api.post('/orders/verify-paypal', { orderId: payPalToken, amount: 0 });
                }

                // 2. Lookup order details
                let loadedOrder: Order | null = null;
                if (sessionId) {
                    const { data } = await api.get(`/orders/guest/lookup?session_id=${sessionId}`);
                    loadedOrder = data;
                } else if (payPalToken) {
                    const { data } = await api.get(`/orders/guest/lookup?token=${payPalToken}`);
                    loadedOrder = data;
                } else if (orderIdParam) {
                    const { data } = await api.get(`/orders/${orderIdParam}`);
                    loadedOrder = data;
                }

                if (loadedOrder) {
                    setOrder(loadedOrder);
                } else {
                    setVerifyingError('Could not locate your order reference. Please contact support.');
                }
            } catch (err: any) {
                console.error('Error verifying/loading order:', err);
                setVerifyingError(err.response?.data?.message || 'Failed to verify payment session.');
            } finally {
                setVerifying(false);
            }
        };

        verifyAndLoadOrder();
    }, [sessionId, payPalToken, orderIdParam, statusParam]);

    const handleDownload = async (productId: string, productName: string) => {
        setDownloadingIds(prev => ({ ...prev, [productId]: true }));
        try {
            const { data } = await api.post('/products/download-token', { 
                order_id: order?._id,
                product_id: productId,
                session_id: sessionId || undefined,
                token: payPalToken || undefined
            });
            if (data.token) {
                const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/download/${data.token}`;
                
                // Trigger browser download link
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', productName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err: any) {
            console.error('Download error:', err);
            alert('Failed to generate download token. Make sure the order is fully paid.');
        } finally {
            setDownloadingIds(prev => ({ ...prev, [productId]: false }));
        }
    };

    if (verifying) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '20px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #ff6600', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Confirming Payment...</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Please do not close this window while we secure your receipt.</p>
            </div>
        );
    }

    if (verifyingError) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#e11d48', marginTop: '16px' }}>Verification Issue</h3>
                <p style={{ color: '#64748b', maxWidth: '450px', marginTop: '8px', fontSize: '14px' }}>{verifyingError}</p>
                <Link href="/" style={{ marginTop: '24px', background: '#ff6600', color: '#fff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 800 }}>
                    Return to Homepage
                </Link>
            </div>
        );
    }

    const hasDigital = order?.order_items.some(item => item.product_id?.isDigital);

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#1e293b' }}>
            {/* Header section with Success Box */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.05)', marginBottom: '30px' }}>
                <span style={{ fontSize: '56px', display: 'block', marginBottom: '12px' }}>🎉</span>
                <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#166534', margin: '0 0 8px 0' }}>Order Placed Successfully!</h1>
                <p style={{ fontSize: '15px', color: '#14532d', margin: 0, fontWeight: 500 }}>
                    Thank you for your purchase. Your order ID is <strong style={{ fontFamily: 'monospace' }}>#{order?._id}</strong>.
                </p>
            </div>

            {/* Guest account credentials note */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '30px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>🔒</span>
                <div>
                    <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontWeight: 800, fontSize: '14px' }}>Temporary Account Created</h4>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '13px', lineHeight: 1.5 }}>
                        An account has been generated for your email <strong style={{ color: '#1d4ed8' }}>{order?.buyer_id?.email}</strong>. 
                        You can sign in using this email and request a password reset link to view shipping logs, manage profile settings, or retrieve download files at any time.
                    </p>
                </div>
            </div>

            {/* Display products table */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>Order Items</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {order?.order_items.map((item) => {
                        const imgUrl = getImgUrl(item.image || item.product_id?.main_image);
                        const isVirtual = item.product_id?.isDigital;
                        return (
                            <div key={item._id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                    {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '20px' }}>📦</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>{item.name || item.product_id?.name}</h4>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.quantity} • Price: ${item.price.toFixed(2)}</span>
                                    {isVirtual && (
                                        <span style={{ display: 'inline-block', marginLeft: '10px', padding: '2px 6px', background: '#eff6ff', color: '#2563eb', fontSize: '10px', fontWeight: 800, borderRadius: '4px', textTransform: 'uppercase' }}>
                                            Digital Download
                                        </span>
                                    )}
                                </div>
                                <div>
                                    {isVirtual ? (
                                        <button
                                            onClick={() => handleDownload(item.product_id._id, item.name || item.product_id.name)}
                                            disabled={downloadingIds[item.product_id._id] || order.payment_status !== 'paid'}
                                            style={{
                                                background: '#2563eb',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                fontWeight: 800,
                                                fontSize: '12px',
                                                cursor: order.payment_status === 'paid' ? 'pointer' : 'not-allowed',
                                                opacity: order.payment_status === 'paid' ? 1 : 0.6,
                                                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)'
                                            }}
                                        >
                                            {downloadingIds[item.product_id._id] ? 'Downloading...' : (order.payment_status === 'paid' ? 'Download File' : 'Pending Payment')}
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Total breakdowns */}
                <div style={{ marginTop: '20px', borderTop: '1.5px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', fontSize: '13px', color: '#64748b' }}>
                    <div>Tax Amount: <span style={{ fontWeight: 600, color: '#1e293b' }}>${order?.tax_amount.toFixed(2)}</span></div>
                    <div>Shipping: <span style={{ fontWeight: 600, color: '#1e293b' }}>${order?.shipping_fee.toFixed(2)}</span></div>
                    <div style={{ fontSize: '16px', fontWeight: 950, color: '#ff6600', marginTop: '4px' }}>
                        Total Paid: ${order?.total_amount.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Panel: Shipping Address & Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0' }}>Shipping Address</h4>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '14px' }}>{order?.shipping_address.fullName}</p>
                    <p style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '13px' }}>{order?.shipping_address.addressLine}</p>
                    <p style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '13px' }}>{order?.shipping_address.city}, {order?.shipping_address.state} {order?.shipping_address.postalCode}</p>
                    <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '13px' }}>{order?.shipping_address.country}</p>
                    <p style={{ margin: 0, color: '#475569', fontSize: '13px', fontWeight: 600 }}>Phone: {order?.shipping_address.phone}</p>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0' }}>Payment Summary</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div>Payment Method: <strong style={{ textTransform: 'capitalize' }}>{order?.payment_method}</strong></div>
                        <div>Payment Status: <strong style={{ color: order?.payment_status === 'paid' ? '#16a34a' : '#ea580c' }}>{order?.payment_status.toUpperCase()}</strong></div>
                        <div>Fulfillment Status: <strong style={{ color: '#ff6600', textTransform: 'uppercase' }}>{order?.status}</strong></div>
                        <div>Order Placed: <strong>{order ? new Date(order.createdAt).toLocaleString() : ''}</strong></div>
                    </div>
                </div>
            </div>

            {/* Bottom buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <Link href="/" style={{ textDecoration: 'none', background: '#ff6600', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: 800, fontSize: '14px', boxShadow: '0 4px 12px rgba(255,102,0,0.15)' }}>
                    Continue Shopping
                </Link>
                <Link href="/login" style={{ textDecoration: 'none', background: '#fff', border: '1.5px solid #ff6600', color: '#ff6600', padding: '14px 28px', borderRadius: '8px', fontWeight: 800, fontSize: '14px' }}>
                    Sign In to Account
                </Link>
            </div>
        </div>
    );
}
