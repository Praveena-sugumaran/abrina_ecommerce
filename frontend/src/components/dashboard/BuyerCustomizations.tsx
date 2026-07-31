import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';

interface CustomizationRequest {
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
    customization_type: string;
    quantity: number;
    customization_details: string;
    reference_file?: string;
    expected_delivery_date: string;
    budget_range: string;
    status: 'pending' | 'reviewed' | 'quoted' | 'approved' | 'rejected' | 'completed';
    supplier_note?: string;
    quotation_price?: number;
    quotation_file?: string;
    createdAt: string;
}

const BuyerCustomizations = () => {
    const [requests, setRequests] = useState<CustomizationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useRouter();
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/customizations');
            setRequests(data);
        } catch (err: any) {
            console.error('Failed to load customization requests:', err);
            showToast('Failed to load customization requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: '#fffbeb', text: '#b45309', border: '#fef3c7' }; // Amber
            case 'reviewed': return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' }; // Blue
            case 'quoted': return { bg: '#faf5ff', text: '#6b21a8', border: '#f3e8ff' }; // Purple
            case 'approved': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }; // Green
            case 'rejected': return { bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' }; // Red
            case 'completed': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }; // Green (Success)
            default: return { bg: '#f8fafc', text: '#64748b', border: '#f1f5f9' };
        }
    };

    const handleContinueDiscussion = (supplierId: string) => {
        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
        navigate.push(`${baseRoute}/messages?userId=${supplierId}`);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await api.put(`/customizations/${id}`, { status: newStatus });
            showToast(`Status updated to ${newStatus}`, 'success');
            fetchRequests();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update status', 'error');
        }
    };

    const handleStartOrder = (req: CustomizationRequest) => {
        const checkoutState = {
            product: req.product,
            bookingDetails: {
                quantity: req.quantity,
                unitPrice: req.quotation_price || 0,
                totalPrice: (req.quotation_price || 0) * req.quantity,
                shippingFee: 0, // Should probably be negotiated or added later
                customizationId: req._id
            }
        };

        if (typeof window !== 'undefined') {
            (window as any).checkoutState = checkoutState;
            navigate.push('/checkout');
        }
    };

    const formatFileUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
    };

    return (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', minHeight: 'calc(100vh - 120px)', paddingBottom: '80px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Customization Requests</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Track your modified product requests, review supplier quotes, and finalize orders.</p>
                </div>
                <button
                    onClick={fetchRequests}
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
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading specification data...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Customization Requests</h4>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>When you submit a design modification or logo branding specification request on a product details page, it will appear here.</p>
                    <button onClick={() => navigate.push('/search')} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Browse Products</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {requests.map((req) => {
                        const statusColors = getStatusColor(req.status);
                        const supplierName = req.supplier?.company_name || `${req.supplier?.first_name || ''} ${req.supplier?.last_name || ''}`.trim() || 'Supplier';

                        return (
                            <div key={req._id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>
                                {/* Request Header Banner */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Req ID: {req._id.substring(req._id.length - 8).toUpperCase()}</span>
                                        <span style={{ color: '#cbd5e1' }}>•</span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
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
                                        {req.status}
                                    </span>
                                </div>

                                {/* Main Details Section */}
                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '20px' }}>
                                    <img
                                        src={getImgUrl(req.product?.main_image)}
                                        alt={req.product?.name}
                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee' }}
                                    />
                                    <div>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }} onClick={() => navigate.push(`/product/${req.product?.slug || req.product?._id}`)}>
                                            {req.product?.name}
                                        </h3>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>Supplier: <strong style={{ color: '#334155' }}>{supplierName}</strong></p>

                                        {/* Spec Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
                                            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Customization Type</div>
                                                <div style={{ fontWeight: 700 }}>{req.customization_type}</div>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Requested Qty</div>
                                                <div style={{ fontWeight: 700 }}>{req.quantity} pcs</div>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Target Budget</div>
                                                <div style={{ fontWeight: 700 }}>{req.budget_range}</div>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Delivery Date</div>
                                                <div style={{ fontWeight: 700 }}>{new Date(req.expected_delivery_date).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>Buyer Specification Notes:</h4>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, background: '#fdfdfd', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px' }}>{req.customization_details}</p>
                                        </div>

                                        {req.reference_file && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <a
                                                    href={formatFileUrl(req.reference_file)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 700, textDecoration: 'none', background: 'rgba(13, 46, 103, 0.05)', padding: '6px 12px', borderRadius: '6px' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                                    </svg>
                                                    View Attached Specifications File
                                                </a>
                                            </div>
                                        )}

                                        {/* Supplier Quotation Block (Conditional) */}
                                        {(req.supplier_note || req.quotation_price || req.quotation_file) && (
                                            <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                    <span>Supplier Quotation & Response</span>
                                                </h4>
                                                {req.quotation_price && (
                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d', marginBottom: '8px' }}>
                                                        Quoted Unit Price: <span style={{ color: '#16a34a', fontSize: '1.15rem' }}>${req.quotation_price}</span> / piece
                                                    </div>
                                                )}
                                                {req.supplier_note && (
                                                    <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#14532d', lineHeight: '1.5', background: '#ffffff', padding: '10px', borderRadius: '6px' }}>
                                                        <strong>Supplier Note:</strong> {req.supplier_note}
                                                    </p>
                                                )}
                                                {req.quotation_file && (
                                                    <a
                                                        href={formatFileUrl(req.quotation_file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#15803d', fontWeight: 700, textDecoration: 'none', background: '#dcfce7', padding: '6px 12px', borderRadius: '6px' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                                        </svg>
                                                        Download official quote PDF
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Continue Discussion button */}
                                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => handleContinueDiscussion(req.supplier._id)}
                                                style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                                            >
                                                Continue Discussion
                                            </button>

                                            {req.status === 'quoted' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(req._id, 'approved')}
                                                        style={{ background: '#f0fdf4', color: '#166534', border: '1.5px solid #bbf7d0', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Approve Quotation
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(req._id, 'rejected')}
                                                        style={{ background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fecaca', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            {req.status === 'approved' && (
                                                <button
                                                    onClick={() => handleStartOrder(req)}
                                                    style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    Start Order
                                                </button>
                                            )}
                                            {req.status === 'completed' && (
                                                <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 700, padding: '10px 0' }}>
                                                    Payment Confirmed - Order in Progress
                                                </div>
                                            )}
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

export default BuyerCustomizations;
