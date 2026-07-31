import React, { useState, useEffect } from 'react';
import { getMyRFQs, getRFQQuotes } from '@/services/rfqApi';
import { useChat } from '@/context/ChatContext';
import api from '@/services/axiosConfig';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './MyRFQs.module.css';

interface RFQ {
    _id: string;
    title: string;
    status: string;
    quantity: number;
    unit: string;
    createdAt: string;
    expiry_date: string;
}

interface Quote {
    _id: string;
    rfq: string;
    price_offered: number;
    currency: string;
    status: string;
    estimated_delivery_days: number;
    note?: string;
    last_offered_by: string;
    negotiation_history: Array<{
        offered_by: string;
        price: number;
        note?: string;
        createdAt: string;
    }>;
    supplier: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
    };
}

const MyRFQs = () => {
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRfqId, setExpandedRfqId] = useState<string | null>(null);
    const [quotes, setQuotes] = useState<{ [key: string]: Quote[] }>({});
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const { openChat } = useChat();
    const navigate = useRouter();

    // Negotiation State
    const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [negotiatePrice, setNegotiatePrice] = useState<string | number>('');
    const [negotiateNote, setNegotiateNote] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const handleAiSuggest = async () => {
        if (!selectedQuote) return;
        setAiLoading(true);
        try {
            const { data } = await api.post('/ai/negotiation-helper', { quoteId: selectedQuote._id });
            if (data.success) {
                setNegotiatePrice(data.suggestedPrice.toString());
                setNegotiateNote(data.suggestedNote);
            }
        } catch (err: any) {
            console.error('Failed to get AI negotiation suggestion:', err);
            alert(err.response?.data?.message || 'Failed to get AI negotiation suggestion');
        } finally {
            setAiLoading(false);
        }
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => Promise<void>) | null;
        type: 'info' | 'success' | 'warning' | 'error' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info' });

    const openConfirmModal = (title: string, message: string, onConfirm: () => Promise<void>, type: 'info' | 'success' | 'warning' | 'error' | 'danger' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    const handleNegotiateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuote) return;
        try {
            await api.put(`/rfq/quote/${selectedQuote._id}/negotiate`, {
                price: typeof negotiatePrice === 'string' ? parseFloat(negotiatePrice) : negotiatePrice,
                note: negotiateNote
            });
            setIsNegotiateModalOpen(false);
            setNegotiatePrice('');
            setNegotiateNote('');
            // Refresh quotes for the current RFQ
            const { data } = await getRFQQuotes(selectedQuote.rfq);
            setQuotes(prev => ({ ...prev, [selectedQuote.rfq]: data }));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send counter-offer');
        }
    };

    useEffect(() => {
        const fetchRFQs = async () => {
            try {
                const { data } = await getMyRFQs();
                setRfqs(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch RFQs');
            } finally {
                setLoading(false);
            }
        };

        fetchRFQs();
    }, []);

    const toggleQuotes = async (rfqId: string) => {
        if (expandedRfqId === rfqId) {
            setExpandedRfqId(null);
            return;
        }

        setExpandedRfqId(rfqId);
        if (!quotes[rfqId]) {
            setLoadingQuotes(true);
            try {
                const { data } = await getRFQQuotes(rfqId);
                setQuotes(prev => ({ ...prev, [rfqId]: data }));
            } catch (err) {
                console.error('Failed to fetch quotes', err);
            } finally {
                setLoadingQuotes(false);
            }
        }
    };

    if (loading) return <div className={styles['loading-spinner']}>Loading RFQs...</div>;
    if (error) return <div className={styles['alert-error']}>{error}</div>;

    return (
        <div className={styles['my-rfqs-container']}>
            <div className={styles['my-rfqs-header']}>
                <h2>My Sourcing Requests (RFQ)</h2>
                <Link href="/rfq/post" className={styles['pm-btn-primary']} style={{ textDecoration: 'none', background: 'var(--primary-color)', color: '#fff', padding: '8px 16px', borderRadius: '4px' }}>
                    + Post New RFQ
                </Link>
            </div>

            {rfqs.length === 0 ? (
                <div className={styles['empty-state']}>
                    <p>You haven't posted any RFQs yet.</p>
                </div>
            ) : (
                <div className={styles['rfq-list']}>
                    {rfqs.map(rfq => (
                        <div key={rfq._id} className={styles['rfq-list-item']}>
                            <div className={styles['rfq-item-header']}>
                                <h3>{rfq.title}</h3>
                                <div className={`rfq-status ${rfq.status}`}>
                                    {rfq.status.toUpperCase()}
                                </div>
                            </div>

                            <div className={styles['rfq-item-details']}>
                                <div className={styles['detail-col']}>
                                    <span className={styles['detail-label']}>Quantity:</span>
                                    <span className={styles['detail-value']}>{rfq.quantity} {rfq.unit}</span>
                                </div>
                                <div className={styles['detail-col']}>
                                    <span className={styles['detail-label']}>Posted:</span>
                                    <span className={styles['detail-value']}>{new Date(rfq.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className={styles['detail-col']}>
                                    <span className={styles['detail-label']}>Expires:</span>
                                    <span className={styles['detail-value']}>{new Date(rfq.expiry_date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className={styles['rfq-item-actions']}>
                                <button
                                    className={styles['view-quotes-btn']}
                                    onClick={() => toggleQuotes(rfq._id)}
                                    style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                                >
                                    {expandedRfqId === rfq._id ? 'Hide Quotes' : 'View Quotes'}
                                </button>
                                {/* Future: Edit / Delete buttons can go here */}
                            </div>

                            {/* Quotes section */}
                            {expandedRfqId === rfq._id && (
                                <div className={styles['rfq-quotes-section']}>
                                    <h4>Received Quotes</h4>
                                    {loadingQuotes && !quotes[rfq._id] ? (
                                        <p>Loading quotes...</p>
                                    ) : quotes[rfq._id] && quotes[rfq._id].length > 0 ? (
                                        <div className={styles['quotes-grid']}>
                                            {quotes[rfq._id].map(quote => (
                                                <div key={quote._id} className={styles['quote-card']}>

                                                    {/* Header: Supplier + Status */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier</div>
                                                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>
                                                                {quote.supplier?.company_name || `${quote.supplier?.first_name} ${quote.supplier?.last_name}`}
                                                            </div>
                                                        </div>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                            letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0,
                                                            background: quote.status === 'paid' ? '#f0fdf4' : quote.status === 'accepted' ? '#dcfce7' : quote.status === 'rejected' ? '#fee2e2' : quote.status === 'negotiating' ? '#eff6ff' : '#fef9c3',
                                                            color: quote.status === 'paid' ? '#16a34a' : quote.status === 'accepted' ? '#166534' : quote.status === 'rejected' ? '#991b1b' : quote.status === 'negotiating' ? '#1d4ed8' : '#854d0e',
                                                        }}>
                                                            {quote.status?.toUpperCase() || 'PENDING'}
                                                        </span>
                                                    </div>

                                                    {/* Price + Delivery */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e0e9ff', marginBottom: '12px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Quoted Price</div>
                                                            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                                                                {quote.currency} {quote.price_offered}
                                                            </div>
                                                        </div>
                                                        <div style={{ width: '1px', height: '36px', background: '#c7d7f8' }} />
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Delivery</div>
                                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                                                {quote.estimated_delivery_days} days
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Supplier Note */}
                                                    {quote.note && (
                                                        <div style={{ fontSize: '13px', color: '#555', padding: '8px 12px', background: '#fffbf0', borderLeft: '3px solid #f59e0b', borderRadius: '0 6px 6px 0', marginBottom: '12px' }}>
                                                            {quote.note}
                                                        </div>
                                                    )}

                                                    {/* Negotiation History */}
                                                    {quote.negotiation_history && quote.negotiation_history.length > 0 && (
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                                                                Negotiation History
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {quote.negotiation_history.map((h: any, i: number) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexDirection: h.offered_by === 'buyer' ? 'row-reverse' : 'row' }}>
                                                                        <div style={{
                                                                            width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                                                            background: h.offered_by === 'buyer' ? '#dbeafe' : '#dcfce7',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: '11px', fontWeight: '800',
                                                                            color: h.offered_by === 'buyer' ? '#1d4ed8' : '#166534'
                                                                        }}>
                                                                            {h.offered_by === 'buyer' ? 'Y' : 'S'}
                                                                        </div>
                                                                        <div style={{
                                                                            background: h.offered_by === 'buyer' ? '#eff6ff' : '#f0fdf4',
                                                                            border: `1px solid ${h.offered_by === 'buyer' ? '#bfdbfe' : '#bbf7d0'}`,
                                                                            borderRadius: h.offered_by === 'buyer' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                                                            padding: '7px 12px', maxWidth: '75%'
                                                                        }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                <span style={{ fontSize: '13px', fontWeight: '700', color: h.offered_by === 'buyer' ? '#1d4ed8' : '#166534' }}>
                                                                                    {quote.currency} {h.price}
                                                                                </span>
                                                                                <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(0,0,0,0.05)', padding: '1px 7px', borderRadius: '10px' }}>
                                                                                    {h.offered_by === 'buyer' ? 'Counter-offer' : 'Quote'}
                                                                                </span>
                                                                            </div>
                                                                            {h.note && <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{h.note}</div>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                                        {(quote.status === 'pending' || quote.status === 'negotiating') && quote.last_offered_by !== 'buyer' && (
                                                            <>
                                                                <button
                                                                    style={{ flex: 1, padding: '9px', borderRadius: '7px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                                    onClick={() => openConfirmModal('Accept Quote', `Accept this quote for ${quote.currency} ${quote.price_offered}?`, async () => { try { await api.put(`/rfq/quote/${quote._id}/status`, { status: 'accepted' }); const { data } = await getRFQQuotes(rfq._id); setQuotes(prev => ({ ...prev, [rfq._id]: data })); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } }, 'success')}
                                                                >Accept</button>
                                                                <button
                                                                    style={{ flex: 1.3, padding: '9px', borderRadius: '7px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                                    onClick={() => { setSelectedQuote(quote); setNegotiatePrice(quote.price_offered); setIsNegotiateModalOpen(true); }}
                                                                >Negotiate</button>
                                                                <button
                                                                    style={{ flex: 1, padding: '9px', borderRadius: '7px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                                    onClick={() => openConfirmModal('Decline Quote', 'Are you sure you want to decline this quote?', async () => { try { await api.put(`/rfq/quote/${quote._id}/status`, { status: 'rejected' }); const { data } = await getRFQQuotes(rfq._id); setQuotes(prev => ({ ...prev, [rfq._id]: data })); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } }, 'danger')}
                                                                >Decline</button>
                                                            </>
                                                        )}
                                                        {quote.last_offered_by === 'buyer' && quote.status === 'negotiating' && (
                                                            <div style={{ flex: 3, padding: '9px 12px', fontSize: '12px', color: '#6b7280', background: '#f9fafb', textAlign: 'center', borderRadius: '7px', border: '1px dashed #e5e7eb' }}>
                                                                Waiting for supplier to respond…
                                                            </div>
                                                        )}
                                                        {quote.status === 'accepted' && (
                                                            <button
                                                                style={{ flex: 2, padding: '10px', borderRadius: '7px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                                onClick={() => {
                                                                    if (typeof window !== 'undefined') {
                                                                        (window as any).checkoutState = { isQuote: true, quote, rfq };
                                                                    }
                                                                    navigate.push('/checkout');
                                                                }}
                                                            >Proceed to Payment →</button>
                                                        )}
                                                        {quote.status !== 'rejected' && (
                                                            <button
                                                                style={{ flex: 1, padding: '9px', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                                                                onClick={() => openChat(quote.supplier)}
                                                            >Chat</button>
                                                        )}
                                                    </div>

                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f9fafc', borderRadius: '8px', border: '1px dashed #ddd' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
                                            <p style={{ margin: '0 0 6px', fontWeight: '600', color: '#333' }}>No quotes received yet</p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Matching suppliers have been notified. You'll receive quotes within 24–48 hours.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {/* Negotiation Modal */}
            {isNegotiateModalOpen && selectedQuote && (
                <div className={styles['rfq-modal-overlay']}>
                    <div className={styles['rfq-modal-content']} style={{ maxWidth: '400px' }}>
                        <h3>Negotiate Quote</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                            Current Price: <strong>{selectedQuote.currency} {selectedQuote.price_offered}</strong>
                        </p>
                        <form onSubmit={handleNegotiateSubmit}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                <button
                                    type="button"
                                    disabled={aiLoading}
                                    onClick={handleAiSuggest}
                                    style={{
                                        background: 'linear-gradient(135deg, #ff6600 0%, #ff9900 100%)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12.5px',
                                        fontWeight: 'bold',
                                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(255, 102, 0, 0.25)',
                                        opacity: aiLoading ? 0.7 : 1
                                    }}
                                >
                                    <span>{aiLoading ? 'Thinking...' : '✨ AI Suggest counter-offer'}</span>
                                </button>
                            </div>
                            <div className={styles['rfq-form-group']}>
                                <label>Your Counter Price ({selectedQuote.currency})</label>
                                <input
                                    type="number"
                                    value={negotiatePrice}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNegotiatePrice(e.target.value)}
                                    required
                                    step="0.01"
                                    placeholder="Enter your target price"
                                />
                            </div>
                            <div className={styles['rfq-form-group']}>
                                <label>Note to Supplier</label>
                                <textarea
                                    value={negotiateNote}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNegotiateNote(e.target.value)}
                                    placeholder="Briefly explain your proposal..."
                                    rows={3}
                                />
                            </div>
                            <div className={styles['rfq-modal-actions']}>
                                <button type="button" className={styles['rfq-cancel-btn']} onClick={() => setIsNegotiateModalOpen(false)}>Cancel</button>
                                <button type="submit" className={styles['rfq-submit-btn']}>Send Counter-Offer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className={styles['rfq-modal-overlay']}>
                    <div className={styles['rfq-modal-content']} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ color: confirmModal.type === 'danger' ? '#dc3545' : 'var(--primary-color)', marginBottom: '16px' }}>
                            {confirmModal.title}
                        </h3>
                        <p style={{ fontSize: '15px', color: '#444', marginBottom: '24px' }}>
                            {confirmModal.message}
                        </p>
                        <div className={styles['rfq-modal-actions']} style={{ justifyContent: 'center' }}>
                            <button type="button" className={styles['rfq-cancel-btn']} onClick={closeConfirmModal}>Cancel</button>
                            <button
                                type="button"
                                className={styles['rfq-submit-btn']}
                                style={{ background: confirmModal.type === 'danger' ? '#dc3545' : (confirmModal.type === 'success' ? '#28a745' : 'var(--primary-color)') }}
                                onClick={() => {
                                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                                    closeConfirmModal();
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyRFQs;
