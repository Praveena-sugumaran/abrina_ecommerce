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
    };
    buyer: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
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

const SupplierEnquiries = () => {
    const [enquiries, setEnquiries] = useState<ProductEnquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Replying state
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [submittingReply, setSubmittingReply] = useState(false);

    const navigate = useRouter();
    const { showToast } = useToast();
    const isMobile = useIsMobile(860);

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/product-enquiries?role=supplier');
            setEnquiries(data);
        } catch (err: any) {
            console.error('Failed to load supplier product enquiries:', err);
            showToast('Failed to load product enquiries', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const handleSendReply = async (e: React.FormEvent, id: string) => {
        e.preventDefault();
        setSubmittingReply(true);
        try {
            await api.post(`/product-enquiries/${id}/reply`, {
                replyMessage: replyText
            });

            showToast('Reply submitted successfully!', 'success');
            setReplyingId(null);
            setReplyText('');
            fetchEnquiries();
        } catch (err: any) {
            console.error('Failed to submit reply:', err);
            showToast(err.response?.data?.message || 'Failed to send reply', 'error');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleCloseEnquiry = async (id: string) => {
        try {
            await api.put(`/product-enquiries/${id}/close`);
            showToast('Enquiry closed successfully', 'success');
            fetchEnquiries();
        } catch (err: any) {
            showToast('Failed to close enquiry', 'error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'unread': return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' }; // Blue
            case 'replied': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }; // Green
            case 'closed': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }; // Grey
            default: return { bg: '#f8fafc', text: '#64748b', border: '#f1f5f9' };
        }
    };

    const handleContinueDiscussion = (buyerId: string) => {
        const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/supplier/dashboard') ? '/supplier/dashboard' : '/dashboard';
        navigate.push(`${baseRoute}/messages?userId=${buyerId}`);
    };

    const formatFileUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
    };

    const filteredEnquiries = enquiries.filter(enq => {
        if (filterStatus === 'All') return true;
        return enq.status.toLowerCase() === filterStatus.toLowerCase();
    });

    return (
        <div style={{ background: '#ffffff', borderRadius: isMobile ? '12px' : '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '28px', minHeight: 'calc(100vh - 120px)', paddingBottom: '80px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflowX: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Buyer Product Enquiries</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Reply to general inquiries regarding logistics, shipping times, packaging customization, materials, or custom deal requests.</p>
                </div>
                <button 
                    onClick={fetchEnquiries} 
                    style={{ background: '#f1f5f9', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '24px' }}>
                {['All', 'Unread', 'Replied', 'Closed'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{
                            padding: '8px 16px',
                            border: '1.5px solid',
                            borderColor: filterStatus === s ? 'var(--primary-color)' : '#cbd5e1',
                            borderRadius: '20px',
                            background: filterStatus === s ? 'var(--primary-color)' : '#fff',
                            color: filterStatus === s ? '#fff' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.825rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0', color: '#64748b', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading product enquiries...</span>
                </div>
            ) : filteredEnquiries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Enquiries Under This Status</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>When buyers send general inquiries about your items, you will see those communications list here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {filteredEnquiries.map((enq) => {
                        const statusColors = getStatusColor(enq.status);
                        const buyerLabel = enq.buyer?.company_name || `${enq.buyer?.first_name || ''} ${enq.buyer?.last_name || ''}`.trim() || 'Direct Buyer';

                        return (
                            <div key={enq._id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                                {/* Header Banner */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Enquiry ID: {enq._id.substring(enq._id.length - 8).toUpperCase()}</span>
                                        <span style={{ color: '#cbd5e1' }}>•</span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Received: {new Date(enq.createdAt).toLocaleDateString()}</span>
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

                                {/* Main Details */}
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
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                            {enq.product?.name || 'General Supplier Inquiry'}
                                        </h3>

                                        {/* Buyer details card */}
                                        <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', margin: '10px 0 16px 0', fontSize: '0.825rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Buyer Partner: {buyerLabel}</div>
                                            <div style={{ color: '#475569' }}>Name: {enq.buyer_name} | Phone: {enq.buyer_phone} | Email: {enq.buyer_email}</div>
                                        </div>

                                        {/* Brief summary row */}
                                        <div style={{ display: 'flex', gap: isMobile ? '12px' : '24px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', width: 'fit-content', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.825rem', color: '#475569' }}>Interested Quantity: <strong>{enq.quantity} pieces</strong></span>
                                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.825rem', color: '#475569' }}>Destination Country: <strong>{enq.country}</strong></span>
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
                                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                                    </svg>
                                                    View Attached File
                                                </a>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                                            {enq.status === 'unread' && (
                                                <button 
                                                    onClick={() => setReplyingId(replyingId === enq._id ? null : enq._id)}
                                                    style={{ background: '#f0fdf4', color: '#166534', border: '1.5px solid #bbf7d0', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    {replyingId === enq._id ? 'Cancel Reply' : 'Send Reply'}
                                                </button>
                                            )}

                                            {enq.status !== 'closed' && (
                                                <button 
                                                    onClick={() => handleCloseEnquiry(enq._id)}
                                                    style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Close Enquiry
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => handleContinueDiscussion(enq.buyer._id)}
                                                style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Continue Discussion
                                            </button>
                                        </div>

                                        {/* Reply input form */}
                                        {replyingId === enq._id && (
                                            <form onSubmit={(e) => handleSendReply(e, enq._id)} style={{ border: '1.5px solid #bbf7d0', padding: '20px', borderRadius: '12px', background: '#f0fdf4', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#14532d' }}>Your Reply Message *</label>
                                                <textarea 
                                                    rows={4}
                                                    required
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    placeholder="Provide bulk price estimation, MOQ adjustments, delivery time details..."
                                                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #86efac' }}
                                                />
                                                <button 
                                                    type="submit" 
                                                    disabled={submittingReply}
                                                    style={{ background: '#166534', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    {submittingReply ? 'Sending Reply...' : 'Send Reply to Buyer'}
                                                </button>
                                            </form>
                                        )}

                                        {/* Sent Reply display */}
                                        {enq.supplier_reply && (
                                            <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1.5px dashed #bbf7d0', borderRadius: '12px' }}>
                                                <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem', marginBottom: '4px' }}>Your Sent Reply Note:</div>
                                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#14532d', lineHeight: '1.5', background: '#ffffff', padding: '10px', borderRadius: '6px' }}>
                                                    {enq.supplier_reply}
                                                </p>
                                            </div>
                                        )}

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

export default SupplierEnquiries;
