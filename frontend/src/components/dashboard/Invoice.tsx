import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './OrderDetail.module.css';

const Invoice = ({ orderData, orderId }: { orderData?: any; orderId?: any }) => {
    const params = useParams();
    const slug = params?.slug;
    const id = orderId || params?.id || (Array.isArray(slug) ? slug[1] : null);
    const [order, setOrder] = useState<any>(orderData || null);
    const { convertPrice, siteSettings } = useAuth();
    const navigate = useRouter();

    useEffect(() => {
        if (!order && id) {
            const fetchOrder = async () => {
                try {
                    const { data } = await api.get(`/orders/${id}`);
                    setOrder(data);
                } catch (err) {
                    console.error('Failed to fetch order for invoice:', err);
                }
            };
            fetchOrder();
        }
    }, [id, order]);

    const handleDownload = () => {
        if (typeof window !== 'undefined') {
            const element = document.getElementById('invoice-document');
            if (!element) return;

            const opt = {
                margin:       0,
                filename:     `invoice_${order._id?.slice(-8).toUpperCase()}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: 'avoid-all' }
            };

            const runDownload = () => {
                // @ts-ignore
                window.html2pdf().from(element).set(opt).save();
            };

            // @ts-ignore
            if (window.html2pdf) {
                runDownload();
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = runDownload;
                document.body.appendChild(script);
            }
        }
    };

    if (!order) return (
        <div style={{ padding: 60, textAlign: 'center', fontWeight: 700, color: '#1e40af', fontFamily: 'Inter, sans-serif', animation: 'pulse 1.4s ease infinite' }}>
            Generating Invoice…
        </div>
    );

    const payStyle = order.payment_status === 'paid'
        ? { color: '#15803d', bg: '#dcfce7' }
        : { color: '#c2410c', bg: '#fff7ed' };

    const subtotal = order.total_amount - (order.tax_amount || 0);

    return (
        <div className={styles['order-detail-page']} style={{ background: '#f1f5f9' }}>

            {/* ── Top Controls (no-print) ── */}
            <div className={styles['no-print']} style={{ maxWidth: 880, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <button
                    onClick={() => navigate.back()}
                    className={styles['od-back-btn']}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Close Invoice
                </button>
                 <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleDownload}
                        className={styles['od-action-btn'] + " " + styles['primary']}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download Invoice
                    </button>
                </div>
            </div>

            {/* ── Invoice Document ── */}
            <div id="invoice-document" className={styles['invoice-container'] + " " + styles['printable-area']}>

                {/* Invoice Header */}
                <div className={styles['invoice-header']}>
                    {/* Logo / Brand */}
                    <div>
                        {siteSettings?.logo_dark ? (
                            <img src={getImgUrl(siteSettings.logo_dark)} alt={siteSettings.site_name} style={{ height: 42 }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#f97316', fontSize: 36, fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>A</span>
                                <span style={{ color: '#1e3a8a', fontSize: 22, fontWeight: 900, letterSpacing: '-1px' }}>
                                    {siteSettings?.site_name || 'libaba.com'}
                                </span>
                            </div>
                        )}
                        <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                            {new Date(order.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* INVOICE Title */}
                    <div className={styles['invoice-title-block']} style={{ textAlign: 'right' }}>
                        <h1>INVOICE</h1>
                        <p className={styles['invoice-number']}>#{order._id?.slice(-16).toUpperCase()}</p>
                        <div style={{ marginTop: 10 }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '5px 16px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                background: payStyle.bg,
                                color: payStyle.color
                            }}>
                                {order.payment_status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Invoice Meta Grid */}
                <div className={styles['invoice-meta-grid']}>
                    {/* Billed To */}
                    <div className={styles['invoice-meta-section']}>
                        <h4>Billed To</h4>
                        <p className={styles['invoice-meta-name']}>
                            {order.shipping_address?.fullName || `${order.buyer_id?.first_name} ${order.buyer_id?.last_name}`}
                        </p>
                        <p className={styles['invoice-meta-email']}>{order.buyer_id?.email}</p>
                        {order.shipping_address && (
                            <div className={styles['invoice-meta-addr']}>
                                <div>{order.shipping_address.addressLine}</div>
                                <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}</div>
                                <div className={styles['country']}>{order.shipping_address.country}</div>
                                {order.shipping_address.phone && <div style={{ marginTop: 4, color: '#64748b' }}>{order.shipping_address.phone}</div>}
                            </div>
                        )}
                    </div>

                    {/* Seller */}
                    <div className={styles['invoice-meta-section']}>
                        <h4>Seller</h4>
                        <p className={styles['invoice-meta-name']}>{order.supplier_id?.company_name || 'Verified Supplier'}</p>
                        <p className={styles['invoice-meta-email']}>{order.supplier_id?.email}</p>
                        <span className={styles['invoice-verified-tag']}>✓ Verified Merchant</span>
                    </div>

                    {/* Order Details */}
                    <div className={styles['invoice-meta-section']}>
                        <h4>Order Details</h4>
                        <div>
                            <div className={styles['invoice-detail-row']}>
                                <span className={styles['invoice-detail-label']}>Date:</span>
                                <span className={styles['invoice-detail-value']}>
                                    {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className={styles['invoice-detail-row']}>
                                <span className={styles['invoice-detail-label']}>Status:</span>
                                <span className={styles['invoice-detail-value']} style={{ textTransform: 'capitalize', color: '#1e3a8a' }}>{order.status}</span>
                            </div>
                            <div className={styles['invoice-detail-row']}>
                                <span className={styles['invoice-detail-label']}>Payment:</span>
                                <span className={styles['invoice-detail-value']} style={{ color: payStyle.color, textTransform: 'capitalize' }}>{order.payment_status}</span>
                            </div>
                            <div className={styles['invoice-detail-row']}>
                                <span className={styles['invoice-detail-label']}>Carrier:</span>
                                <span className={styles['invoice-detail-value']}>{order.shipping_company || 'Pending'}</span>
                            </div>
                            {order.tracking_number && (
                                <div className={styles['invoice-detail-row']}>
                                    <span className={styles['invoice-detail-label']}>Tracking:</span>
                                    <span className={styles['invoice-detail-value']} style={{ fontFamily: 'Courier New', fontSize: 11 }}>{order.tracking_number}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className={styles['invoice-table']}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Item Description</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.order_items?.map((item: any, idx: number) => (
                            <tr key={idx}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div className={styles['invoice-item-thumb']}>
                                            <img src={getImgUrl(item.image)} alt={item.name} />
                                        </div>
                                        <div>
                                            <p className={styles['invoice-item-name']}>{item.name}</p>
                                            <p className={styles['invoice-item-sku']}>SKU: {item._id?.slice(-8).toUpperCase() || 'N/A'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#64748b' }}>
                                    {convertPrice(item.price).formatted}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e3a8a' }}>
                                    {convertPrice(item.price * item.quantity).formatted}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                <div className={styles['invoice-summary']}>
                    <div className={styles['invoice-summary-inner']}>
                        <div className={styles['invoice-summary-row']}>
                            <span>Subtotal</span>
                            <span>{convertPrice(subtotal).formatted}</span>
                        </div>
                        <div className={styles['invoice-summary-row']}>
                            <span>Tax</span>
                            <span>{convertPrice(order.tax_amount || 0).formatted}</span>
                        </div>
                        {order.shipping_fee > 0 && (
                            <div className={styles['invoice-summary-row']}>
                                <span>Shipping</span>
                                <span>{convertPrice(order.shipping_fee || 0).formatted}</span>
                            </div>
                        )}
                        <div className={styles['invoice-total-row']}>
                            <span className={styles['invoice-total-label']}>Total Due</span>
                            <span className={styles['invoice-total-val']}>{convertPrice(order.total_amount).formatted}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles['invoice-footer']}>
                    <div style={{
                        display: 'inline-block',
                        marginBottom: 14,
                        padding: '6px 18px',
                        background: '#f0fdf4',
                        borderRadius: 20,
                        border: '1px solid #bbf7d0',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#15803d',
                        textAlign: 'center'
                    }}>
                        ✓ Transaction Verified & Secured
                    </div>
                    <p>
                        Thank you for your business with {siteSettings?.site_name || 'us'}. If you have any questions about this invoice,
                        please contact our support team. This document serves as your official receipt.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
