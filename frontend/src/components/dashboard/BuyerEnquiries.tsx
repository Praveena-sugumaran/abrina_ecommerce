import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ProductEnquiry {
    _id: string;
    product: {
        _id: string;
        name: string;
        main_image: string;
        slug?: string;
    };
    supplier: {
        _id: string;
        company_name?: string;
        first_name?: string;
        last_name?: string;
    };
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string;
    subject: string;
    message: string;
    quantity: number;
    country: string;
    attachment?: string;
    status: 'unread' | 'replied' | 'closed';
    supplier_reply?: string;
    createdAt: string;
}

const BuyerEnquiries = () => {
    const [enquiries, setEnquiries] = useState<ProductEnquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useRouter();
    const { showToast } = useToast();
    const isMobile = useIsMobile(860);

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/product-enquiries?role=buyer');
            setEnquiries(data);
        } catch (err: any) {
            console.error('Failed to load general enquiries:', err);
            showToast('Failed to load product enquiries', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'unread': return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' }; // Blue
            case 'replied': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }; // Green
            case 'closed': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }; // Grey
            default: return { bg: '#f8fafc', text: '#64748b', border: '#f1f5f9' };
        }
    };

    const handleContinueDiscussion = (supplierId: string) => {
        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
        navigate.push(`${baseRoute}/messages?userId=${supplierId}`);
    };

    const formatFileUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
    };

    return (
        <div style={{ background: '#ffffff', borderRadius: isMobile ? '12px' : '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '28px', minHeight: 'calc(100vh - 120px)', paddingBottom: '80px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflowX: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Product Enquiries</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Manage your general questions regarding bulk prices, MOQs, shipping rates, and stock availability.</p>
                </div>
                <button
                    onClick={fetchEnquiries}
                    style={{ background: '#f1f5f9', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0', color: '#64748b', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading enquiries...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : enquiries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Enquiries Found</h4>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>When you ask a supplier general product questions, those communication threads will appear here.</p>
                    <button onClick={() => navigate.push('/search')} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Browse Products</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {enquiries.map((enq) => {
                        const statusColors = getStatusColor(enq.status);
                        const supplierName = enq.supplier?.company_name || `${enq.supplier?.first_name || ''} ${enq.supplier?.last_name || ''}`.trim() || 'Supplier';

                        return (
                            <div key={enq._id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>
                                {/* Header Banner */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Enquiry ID: {enq._id.substring(enq._id.length - 8).toUpperCase()}</span>
                                        <span style={{ color: '#cbd5e1' }}>•</span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Sent: {new Date(enq.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: statusColors.bg,
                                        color: statusColors.text,
                                        border: `1.5px solid ${statusColors.border}`
                                    }}>
                                        {enq.status}
                                    </span>
                                </div>

                                {/* Details Body */}
                                <div style={{ padding: isMobile ? '16px' : '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '20px' }}>
                                    {enq.product ? (
                                        <img
                                            src={getImgUrl(enq.product?.main_image)}
                                            alt={enq.product?.name}
                                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee' }}
                                        />
                                    ) : (
                                        <div style={{ width: '80px', height: '80px', borderRadius: '10px', border: '1px solid #eee', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🏢</div>
                                    )}
                                    <div>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', cursor: enq.product ? 'pointer' : 'default' }} onClick={() => enq.product && navigate.push(`/product/${enq.product?.slug || enq.product?._id}`)}>
                                            {enq.product?.name || 'General Supplier Inquiry'}
                                        </h3>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>To Supplier: <strong style={{ color: '#334155' }}>{supplierName}</strong></p>

                                        {/* Brief summary row */}
                                        <div style={{ display: 'flex', gap: isMobile ? '12px' : '24px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', width: 'fit-content', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.825rem', color: '#475569' }}>Qty: <strong>{enq.quantity} units</strong></span>
                                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.825rem', color: '#475569' }}>Region: <strong>{enq.country}</strong></span>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Subject: {enq.subject}</div>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, background: '#fdfdfd', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px' }}>{enq.message}</p>
                                        </div>

                                        {enq.attachment && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <a
                                                    href={formatFileUrl(enq.attachment)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 700, textDecoration: 'none', background: 'rgba(13, 46, 103, 0.05)', padding: '6px 12px', borderRadius: '6px' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                                    </svg>
                                                    View Attached File
                                                </a>
                                            </div>
                                        )}

                                        {/* Supplier reply text */}
                                        {enq.supplier_reply && (
                                            <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.875rem', fontWeight: 800, color: '#166534' }}>Supplier Response Note:</h4>
                                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#14532d', lineHeight: '1.5', background: '#ffffff', padding: '10px', borderRadius: '6px' }}>
                                                    {enq.supplier_reply}
                                                </p>
                                            </div>
                                        )}

                                        {/* Continue Discussion button */}
                                        <div style={{ marginTop: '20px' }}>
                                            <button
                                                onClick={() => handleContinueDiscussion(enq.supplier._id)}
                                                style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                Continue Discussion
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BuyerEnquiries;
