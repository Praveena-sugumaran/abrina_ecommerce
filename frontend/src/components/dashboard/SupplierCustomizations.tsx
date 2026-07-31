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
    };
    buyer: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
        email?: string;
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
    status: 'pending' | 'reviewed' | 'quoted' | 'approved' | 'rejected';
    supplier_note?: string;
    quotation_price?: number;
    quotation_file?: string;
    createdAt: string;
}

const SupplierCustomizations = () => {
    const [requests, setRequests] = useState<CustomizationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    
    // Quoting state
    const [quotingId, setQuotingId] = useState<string | null>(null);
    const [quotePrice, setQuotePrice] = useState<string>('');
    const [quoteNote, setQuoteNote] = useState<string>('');
    const [quoteFile, setQuoteFile] = useState<File | null>(null);
    const [submittingQuote, setSubmittingQuote] = useState(false);

    const navigate = useRouter();
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/customizations');
            setRequests(data);
        } catch (err: any) {
            console.error('Failed to fetch supplier customizations:', err);
            showToast('Failed to load customization requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdateStatusOnly = async (id: string, newStatus: string) => {
        try {
            await api.put(`/customizations/${id}`, { status: newStatus });
            showToast(`Status updated to ${newStatus}`, 'success');
            fetchRequests();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update status', 'error');
        }
    };

    const handleQuoteSubmit = async (e: React.FormEvent, id: string) => {
        e.preventDefault();
        setSubmittingQuote(true);

        try {
            const data = new FormData();
            data.append('status', 'quoted');
            data.append('quotation_price', quotePrice);
            data.append('supplier_note', quoteNote);
            if (quoteFile) {
                data.append('quotation_file', quoteFile);
            }

            await api.put(`/customizations/${id}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            showToast('Quotation sent to buyer successfully!', 'success');
            setQuotingId(null);
            setQuotePrice('');
            setQuoteNote('');
            setQuoteFile(null);
            fetchRequests();
        } catch (err: any) {
            console.error('Quotation upload error:', err);
            showToast(err.response?.data?.message || 'Failed to submit quotation', 'error');
        } finally {
            setSubmittingQuote(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: '#fffbeb', text: '#b45309', border: '#fef3c7' }; // Amber
            case 'reviewed': return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' }; // Blue
            case 'quoted': return { bg: '#faf5ff', text: '#6b21a8', border: '#f3e8ff' }; // Purple
            case 'approved': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }; // Green
            case 'rejected': return { bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' }; // Red
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

    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'All') return true;
        return req.status.toLowerCase() === filterStatus.toLowerCase();
    });

    return (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', minHeight: 'calc(100vh - 120px)', paddingBottom: '80px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Buyer Customization Requests</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Review client specifications, send quotes, upload custom drawings, and discuss design changes.</p>
                </div>
                <button 
                    onClick={fetchRequests} 
                    style={{ background: '#f1f5f9', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '24px' }}>
                {['All', 'Pending', 'Reviewed', 'Quoted', 'Approved', 'Rejected'].map(s => (
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
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading incoming specs...</span>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Requests Under This Status</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>When buyers request modifications for your products, you will see those entries list here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {filteredRequests.map((req) => {
                        const statusColors = getStatusColor(req.status);
                        const buyerLabel = req.buyer?.company_name || `${req.buyer?.first_name || ''} ${req.buyer?.last_name || ''}`.trim() || 'Direct Buyer';

                        return (
                            <div key={req._id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                                {/* Header Banner */}
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

                                {/* Body content */}
                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '20px' }}>
                                    <img 
                                        src={getImgUrl(req.product?.main_image)} 
                                        alt={req.product?.name} 
                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee' }} 
                                    />
                                    <div>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                            {req.product?.name}
                                        </h3>
                                        
                                        {/* Buyer Info Card */}
                                        <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', margin: '10px 0 16px 0', fontSize: '0.825rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Client: {buyerLabel}</div>
                                            <div style={{ color: '#475569' }}>Name: {req.buyer_name} | Phone: {req.buyer_phone} | Email: {req.buyer_email}</div>
                                        </div>

                                        {/* Specs */}
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
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Buyer Budget</div>
                                                <div style={{ fontWeight: 700 }}>{req.budget_range}</div>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Expected Date</div>
                                                <div style={{ fontWeight: 700 }}>{new Date(req.expected_delivery_date).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>Client Modification Requirements:</h4>
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
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                                    </svg>
                                                    Download Reference / Specification File
                                                </a>
                                            </div>
                                        )}

                                        {/* Status Action Buttons */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                                            {req.status === 'pending' && (
                                                <button 
                                                    onClick={() => handleUpdateStatusOnly(req._id, 'reviewed')}
                                                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Mark as Reviewed
                                                </button>
                                            )}

                                            {(req.status === 'pending' || req.status === 'reviewed') && (
                                                <button 
                                                    onClick={() => setQuotingId(quotingId === req._id ? null : req._id)}
                                                    style={{ background: '#faf5ff', color: '#6b21a8', border: '1.5px solid #e9d5ff', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    {quotingId === req._id ? 'Cancel Quote' : 'Send Quotation / Quote Price'}
                                                </button>
                                            )}

                                            {req.status === 'reviewed' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatusOnly(req._id, 'approved')}
                                                        style={{ background: '#f0fdf4', color: '#166534', border: '1.5px solid #bbf7d0', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatusOnly(req._id, 'rejected')}
                                                        style={{ background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fecaca', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            <button 
                                                onClick={() => handleContinueDiscussion(req.buyer._id)}
                                                style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Continue Discussion
                                            </button>
                                        </div>

                                        {/* Expanded Quoting Form */}
                                        {quotingId === req._id && (
                                            <form onSubmit={(e) => handleQuoteSubmit(e, req._id)} style={{ border: '1.5px solid #e9d5ff', padding: '20px', borderRadius: '12px', background: '#faf5ff', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#6b21a8', fontWeight: 800 }}>Draft Quotation Details</h4>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Quoted Unit Price ($) *</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            required
                                                            value={quotePrice}
                                                            onChange={e => setQuotePrice(e.target.value)}
                                                            placeholder="e.g. 15.50"
                                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d8b4fe' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Official Quotation File (PDF / Image)</label>
                                                        <input 
                                                            type="file" 
                                                            onChange={e => setQuoteFile(e.target.files?.[0] || null)}
                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            style={{ fontSize: '0.8rem' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Quotation Note to Buyer *</label>
                                                    <textarea 
                                                        rows={3}
                                                        required
                                                        value={quoteNote}
                                                        onChange={e => setQuoteNote(e.target.value)}
                                                        placeholder="Add specifications, validity, MOQ details, setup fees..."
                                                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d8b4fe' }}
                                                    />
                                                </div>

                                                <button 
                                                    type="submit" 
                                                    disabled={submittingQuote}
                                                    style={{ background: '#6b21a8', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    {submittingQuote ? 'Sending Quotation...' : 'Submit Quotation to Buyer'}
                                                </button>
                                            </form>
                                        )}

                                        {/* Quoted Information Display (If Quoted) */}
                                        {req.status === 'quoted' && (
                                            <div style={{ marginTop: '20px', padding: '16px', background: '#faf5ff', border: '1.5px dashed #d8b4fe', borderRadius: '12px' }}>
                                                <div style={{ fontWeight: 800, color: '#6b21a8', fontSize: '0.85rem', marginBottom: '8px' }}>Quotation Submitted:</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#581c87', marginBottom: '4px' }}>Unit Price Offered: <span style={{ color: '#7e22ce' }}>${req.quotation_price}</span> / pc</div>
                                                {req.supplier_note && <div style={{ fontSize: '0.825rem', color: '#581c87', marginBottom: '8px' }}>Note: "{req.supplier_note}"</div>}
                                                {req.quotation_file && (
                                                    <a 
                                                        href={formatFileUrl(req.quotation_file)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 700, textDecoration: 'none' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                                        </svg>
                                                        View Quotation PDF Attachment
                                                    </a>
                                                )}
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

export default SupplierCustomizations;
