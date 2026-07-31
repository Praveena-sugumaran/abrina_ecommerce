import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useChat } from '@/context/ChatContext';
import styles from './RFQMarket.module.css'; // Reuse some styles or create new ones

const SupplierQuotes = () => {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { openChat } = useChat();

    // Negotiation State
    const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [negotiatePrice, setNegotiatePrice] = useState('');
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
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null as any, type: 'info' });

    const openConfirmModal = (title: string, message: string, onConfirm: any, type = 'info') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    const fetchMyQuotes = async () => {
        try {
            const { data } = await api.get('/rfq/my-quotes');
            setQuotes(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch your quotes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyQuotes();
    }, []);

    const handleNegotiateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/rfq/quote/${selectedQuote._id}/negotiate`, {
                price: parseFloat(negotiatePrice),
                note: negotiateNote
            });
            setIsNegotiateModalOpen(false);
            setNegotiatePrice('');
            setNegotiateNote('');
            fetchMyQuotes();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send counter-offer');
        }
    };

    const handleAcceptPrice = (quoteId: string) => {
        const quote = quotes.find(q => q._id === quoteId);
        openConfirmModal(
            'Accept Counter-Offer',
            `Are you sure you want to accept the buyer's price of ${quote?.currency} ${quote?.price_offered}?`,
            async () => {
                try {
                    await api.put(`/rfq/quote/${quoteId}/negotiate`, {
                        price: quote.price_offered,
                        note: 'I accept your counter-offer. Please proceed.'
                    });
                    fetchMyQuotes();
                } catch (err: any) {
                    alert(err.response?.data?.message || 'Failed to accept price');
                }
            },
            'success'
        );
    };

    if (loading) return <div className={styles['loading-spinner']}>Loading your quotes...</div>;
    if (error) return <div className={styles['alert-error']}>{error}</div>;

    return (
        <div className={styles['rfq-market-container']}>
            <div className={styles['rfq-market-header']}>
                <h2>My Submitted Quotes</h2>
            </div>

            {quotes.length === 0 ? (
                <div className={styles['empty-state']}>
                    <p>You haven't submitted any quotes yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {quotes.map(quote => (
                        <div key={quote._id} style={{
                            background: '#fff',
                            border: '1px solid #e8edf5',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 8px rgba(13,46,103,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0'
                        }}>
                            {/* Header: RFQ Title + Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RFQ Request</div>
                                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>{quote.rfq?.title}</div>
                                </div>
                                <span style={{
                                    padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                    letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0,
                                    background: quote.status === 'paid' ? '#f0fdf4' : quote.status === 'accepted' ? '#dcfce7' : quote.status === 'rejected' ? '#fee2e2' : quote.status === 'negotiating' ? '#eff6ff' : '#fef9c3',
                                    color: quote.status === 'paid' ? '#16a34a' : quote.status === 'accepted' ? '#166534' : quote.status === 'rejected' ? '#991b1b' : quote.status === 'negotiating' ? '#1d4ed8' : '#854d0e',
                                }}>
                                    {quote.status?.toUpperCase()}
                                </span>
                            </div>

                            {/* Price + Quantity row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e0e9ff', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Your Price</div>
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                                        {quote.currency} {quote.price_offered}
                                    </div>
                                </div>
                                <div style={{ width: '1px', height: '36px', background: '#c7d7f8' }} />
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Quantity</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {quote.rfq?.quantity} {quote.rfq?.unit}
                                    </div>
                                </div>
                                {quote.estimated_delivery_days && (
                                    <>
                                        <div style={{ width: '1px', height: '36px', background: '#c7d7f8' }} />
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Delivery</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{quote.estimated_delivery_days} days</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Note */}
                            {quote.note && (
                                <div style={{ fontSize: '13px', color: '#555', padding: '8px 12px', background: '#fffbf0', borderLeft: '3px solid #f59e0b', borderRadius: '0 6px 6px 0', marginBottom: '12px' }}>
                                    {quote.note}
                                </div>
                            )}

                            {/* Last offered by banner */}
                            {quote.status !== 'rejected' && quote.status !== 'accepted' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{
                                        fontSize: '12px', padding: '5px 12px', borderRadius: '6px', fontWeight: '600',
                                        background: quote.last_offered_by === 'buyer' ? '#fef3c7' : '#f0f9ff',
                                        color: quote.last_offered_by === 'buyer' ? '#92400e' : '#0369a1',
                                        border: `1px solid ${quote.last_offered_by === 'buyer' ? '#fde68a' : '#bae6fd'}`
                                    }}>
                                        {quote.last_offered_by === 'buyer' ? '⚡ Buyer responded — Action required' : 'Waiting for buyer response'}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {quote.status !== 'rejected' && (
                                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                    {(quote.status === 'pending' || quote.status === 'negotiating') && (
                                        <>
                                            {quote.last_offered_by === 'buyer' && (
                                                <button
                                                    style={{ flex: 1, padding: '9px', borderRadius: '7px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                    onClick={() => handleAcceptPrice(quote._id)}
                                                >Accept Price</button>
                                            )}
                                            {(quote.last_offered_by !== 'supplier' || quote.status === 'pending') ? (
                                                <button
                                                    style={{ flex: 1.3, padding: '9px', borderRadius: '7px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                    onClick={() => { setSelectedQuote(quote); setNegotiatePrice(quote.price_offered); setIsNegotiateModalOpen(true); }}
                                                >Negotiate</button>
                                            ) : (
                                                <div style={{ flex: 2, padding: '9px 12px', fontSize: '12px', color: '#6b7280', background: '#f9fafb', textAlign: 'center', borderRadius: '7px', border: '1px dashed #e5e7eb' }}>
                                                    Waiting for buyer…
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <button
                                        style={{ flex: 1, padding: '9px', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                                        onClick={() => openChat(typeof quote.rfq?.buyer === 'string' ? { _id: quote.rfq.buyer, first_name: 'Buyer' } : quote.rfq?.buyer)}
                                    >Chat Buyer</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Negotiation Modal (Supplier) */}
            {isNegotiateModalOpen && selectedQuote && (
                <div className={styles['rfq-modal-overlay']}>
                    <div className={styles['rfq-modal-content']} style={{ maxWidth: '400px' }}>
                        <h3>Counter-Offer to Buyer</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                            Buyer Offered: <strong>{selectedQuote.currency} {selectedQuote.price_offered}</strong>
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
                                <label>Your New Price ({selectedQuote.currency})</label>
                                <input
                                    type="number"
                                    value={negotiatePrice}
                                    onChange={(e) => setNegotiatePrice(e.target.value)}
                                    required
                                    step="0.01"
                                />
                            </div>
                            <div className={styles['rfq-form-group']}>
                                <label>Message to Buyer</label>
                                <textarea
                                    value={negotiateNote}
                                    onChange={(e) => setNegotiateNote(e.target.value)}
                                    placeholder="Add a note about this price..."
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
                                    if (confirmModal.onConfirm) {
                                        (confirmModal.onConfirm as () => void)();
                                    }
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

export default SupplierQuotes;
