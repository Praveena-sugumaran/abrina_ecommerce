import React, { useState, useEffect } from 'react';
import { getRFQs } from '@/services/rfqApi';
import api from '@/services/axiosConfig';
import styles from './RFQMarket.module.css';
import { useAuth } from '@/context/AuthContext';

const RFQMarket = () => {
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRFQ, setSelectedRFQ] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [quoteError, setQuoteError] = useState('');
    const [quoteSuccess, setQuoteSuccess] = useState('');
    const { user } = useAuth();
 
    // Form fields
    const [priceOffered, setPriceOffered] = useState('');
    const [deliveryDays, setDeliveryDays] = useState('');
    const [note, setNote] = useState('');

    const handleUnlockLead = async () => {
        if (!selectedRFQ) return;
        setSubmitting(true);
        setQuoteError('');
        setQuoteSuccess('');
        try {
            const { data } = await api.post(`/rfq/${selectedRFQ._id}/purchase-lead`);
            setQuoteSuccess('Lead unlocked successfully!');
            setSelectedRFQ((prev: any) => ({
                ...prev,
                purchased_suppliers: data.purchased_suppliers
            }));
            if (user) {
                user.wallet_balance = data.wallet_balance;
            }
            setTimeout(() => {
                setQuoteSuccess('');
            }, 1500);
        } catch (err: any) {
            setQuoteError(err.response?.data?.message || 'Failed to unlock lead');
        } finally {
            setSubmitting(false);
        }
    };


    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<any[]>([]);
    const [massQuoteModal, setMassQuoteModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSelection = (id: any) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch supplier's product categories
                const { data: prodData } = await api.get('/products/my/products?limit=1000');
                const catIds = new Set();
                (prodData.products || []).forEach((p: any) => {
                    const cid = p.category?._id || p.category;
                    if (cid) catIds.add(String(cid));
                });
                const myCats = Array.from(catIds);

                // 2. Fetch all active RFQs
                const { data: rfqData } = await getRFQs({});

                // 3. Filter to matching categories only
                const filtered = rfqData.filter((rfq: any) => {
                    const rfqCatId = rfq.category?._id || rfq.category;
                    return catIds.has(String(rfqCatId));
                });

                setRfqs(filtered);
            } catch (err: any) {
                console.error('Error fetching RFQ data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRFQ) return;
        setSubmitting(true);
        setQuoteError('');
        setQuoteSuccess('');

        try {
            const quoteData = {
                price_offered: parseFloat(priceOffered),
                currency: selectedRFQ.currency || 'USD',
                estimated_delivery_days: parseInt(deliveryDays),
                note,
                valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days default
            };

            await api.post(`/rfq/${selectedRFQ._id}/quote`, quoteData);
            setQuoteSuccess('Quote submitted successfully!');
            setTimeout(() => {
                setSelectedRFQ(null);
                setQuoteSuccess('');
                setPriceOffered('');
                setDeliveryDays('');
                setNote('');
                // Optionally refresh or remove the RFQ from list if single quote allowed
            }, 2000);
        } catch (err: any) {
            setQuoteError(err.response?.data?.message || 'Failed to submit quote');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMassQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setQuoteError('');
        setQuoteSuccess('');

        try {
            const quoteData = {
                price_offered: parseFloat(priceOffered),
                currency: 'USD',
                estimated_delivery_days: parseInt(deliveryDays),
                note,
                valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            };

            await Promise.all(selectedIds.map((id: any) => api.post(`/rfq/${id}/quote`, quoteData)));

            setQuoteSuccess(`Successfully sent ${selectedIds.length} quotes!`);
            setTimeout(() => {
                setMassQuoteModal(false);
                setSelectedIds([]);
                setQuoteSuccess('');
                setPriceOffered('');
                setDeliveryDays('');
                setNote('');
            }, 2500);
        } catch (err: any) {
            setQuoteError('Failed to send some quotes. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles['rfq-market-container']}>
            <div className={styles['rfq-market-header']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', margin: 0 }}>RFQ Market</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Respond to buyer requests matching your product categories.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles['rfq-filter-toggle']} style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                        <button
                            onClick={() => setSelectedIds([])}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        >New Requests Only</button>
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setMassQuoteModal(true)}
                            style={{ background: 'var(--primary-color)', color: '#fff', padding: '10px 20px', borderRadius: '25px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 46, 103, 0.2)' }}
                        >
                            Batch Quote ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={styles['rfq-loading']}>Searching for opportunities...</div>
            ) : (
                <div className={styles['rfq-list']}>
                    {rfqs.length === 0 ? (
                        <div className={styles['rfq-empty']}>
                            <h3>No matching RFQs found</h3>
                            <p>We only show RFQs that match your current product categories. Try adding more products to your store to see more opportunities.</p>
                        </div>
                    ) : (
                        rfqs.map(rfq => (
                            <div key={rfq._id} className={`${styles['rfq-card']} ${selectedIds.includes(rfq._id) ? styles['selected'] : ''}`} style={{ position: 'relative', paddingLeft: '50px' }}>
                                <div style={{ position: 'absolute', top: '24px', left: '20px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(rfq._id)}
                                        onChange={() => toggleSelection(rfq._id)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                                    />
                                </div>
                                <div className={styles['rfq-card-main']}>
                                    <div className={styles['rfq-card-left']}>
                                        <div className={styles['rfq-category-tag']}>{rfq.category?.title}</div>
                                        <h3 className={styles['rfq-item-title']}>{rfq.title}</h3>
                                        <p className={styles['rfq-description-preview']}>{rfq.description.substring(0, 150)}...</p>
                                    </div>
                                    <div className={styles['rfq-card-right']}>
                                        <div className={styles['rfq-stat']}>
                                            <span className={styles['stat-label']}>Quantity:</span>
                                            <span className={styles['stat-value']}>{rfq.quantity} {rfq.unit}</span>
                                        </div>
                                        <div className={styles['rfq-stat']}>
                                            <span className={styles['stat-label']}>Target:</span>
                                            <span className={styles['stat-value']}>{rfq.target_price ? `${rfq.currency} ${rfq.target_price}` : 'Negotiable'}</span>
                                        </div>
                                        {rfq.hasQuoted ? (
                                            <button className={styles['rfq-quote-btn']} disabled style={{ background: '#ccc', color: '#666', cursor: 'not-allowed' }}>Already Quoted</button>
                                        ) : (
                                            <button className={styles['rfq-quote-btn']} onClick={() => setSelectedRFQ(rfq)}>Submit Quote</button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles['rfq-card-footer']}>
                                    <span className={styles['rfq-buyer-info']}>Buyer from {rfq.buyer?.country_code || 'Global'}</span>
                                    <span className={styles['rfq-time']}>Posted {new Date(rfq.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Quote Modal */}
            {selectedRFQ && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: isMobile ? '0' : '12px', width: '100%', maxWidth: '500px', minHeight: isMobile ? '100vh' : 'auto', overflowY: 'auto', padding: isMobile ? '24px 24px 100px' : '24px', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', margin: isMobile ? '0' : 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Submit Quote</h3>
                            <button type="button" onClick={() => setSelectedRFQ(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '4px' }}>×</button>
                        </div>

                        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#666' }}>Requesting for:</p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedRFQ.title}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Qty: {selectedRFQ.quantity} {selectedRFQ.unit}</p>
                        </div>

                        {!(selectedRFQ.purchased_suppliers?.includes(user?._id) || (user?.subscription_plan && (user.subscription_plan.max_rfq_responses === -1 || user.subscription_plan.name?.toLowerCase().includes('premium') || user.subscription_plan.name?.toLowerCase().includes('gold') || user.subscription_plan.name?.toLowerCase().includes('enterprise')))) ? (
                            <div style={{ textAlign: 'center', padding: '12px 0 0 0' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
                                <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Sourcing Lead is Locked</h4>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: '1.5' }}>
                                    Unlock buyer contact details and quote permissions using your wallet balance.
                                </p>
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Lead Cost:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--clr-accent, #ff6600)' }}>${(selectedRFQ.lead_price || 5.00).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Your Wallet Balance:</span>
                                        <span style={{ fontWeight: 'bold', color: (user?.wallet_balance || 0) >= (selectedRFQ.lead_price || 5.00) ? '#10b981' : '#ef4444' }}>
                                            ${(user?.wallet_balance || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {quoteError && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fee2e2' }}>{quoteError}</div>}
                                {quoteSuccess && <div style={{ color: '#059669', background: '#ecfdf5', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #d1fae5' }}>{quoteSuccess}</div>}

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRFQ(null)}
                                        style={{ flex: 1, padding: '11px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting || (user?.wallet_balance || 0) < (selectedRFQ.lead_price || 5.00)}
                                        onClick={handleUnlockLead}
                                        style={{
                                            flex: 1, padding: '11px', borderRadius: '6px', border: 'none',
                                            background: 'var(--primary-color, #ff6600)', color: '#fff',
                                            cursor: (submitting || (user?.wallet_balance || 0) < (selectedRFQ.lead_price || 5.00)) ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold', fontSize: '13px',
                                            opacity: (submitting || (user?.wallet_balance || 0) < (selectedRFQ.lead_price || 5.00)) ? 0.7 : 1
                                        }}
                                    >
                                        {submitting ? 'Unlocking...' : `Unlock Lead ($${(selectedRFQ.lead_price || 5.00).toFixed(2)})`}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {quoteError && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fee2e2' }}>{quoteError}</div>}
                                {quoteSuccess && <div style={{ color: '#059669', background: '#ecfdf5', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #d1fae5' }}>{quoteSuccess}</div>}

                                <form onSubmit={handleQuoteSubmit}>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 140px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Your Price ({selectedRFQ.currency || 'USD'})</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                                                value={priceOffered}
                                                onChange={e => setPriceOffered(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ flex: '1 1 140px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Est. Delivery (Days)</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="7"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                                                value={deliveryDays}
                                                onChange={e => setDeliveryDays(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Message for Buyer</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Add notes about quality, warranty or shipping details..."
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRFQ(null)}
                                            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || !!quoteSuccess}
                                            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: 'var(--primary-color)', color: '#fff', cursor: (submitting || quoteSuccess) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (submitting || quoteSuccess) ? 0.7 : 1 }}
                                        >
                                            {submitting ? 'Submitting...' : 'Send Quote'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Mass Quote Modal */}
            {massQuoteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: isMobile ? '0' : '12px', width: '100%', maxWidth: '500px', minHeight: isMobile ? '100vh' : 'auto', overflowY: 'auto', padding: isMobile ? '24px 24px 100px' : '24px', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', margin: isMobile ? '0' : 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Batch Submit Quote</h3>
                            <button type="button" onClick={() => setMassQuoteModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '4px' }}>×</button>
                        </div>

                        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--primary-color)' }}>You are quoting for {selectedIds.length} items</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Standard pricing and delivery terms will be applied to all.</p>
                        </div>

                        {quoteError && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fee2e2' }}>{quoteError}</div>}
                        {quoteSuccess && <div style={{ color: '#059669', background: '#ecfdf5', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #d1fae5' }}>{quoteSuccess}</div>}

                        <form onSubmit={handleMassQuoteSubmit}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 140px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Base Price (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                                        value={priceOffered}
                                        onChange={e => setPriceOffered(e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: '1 1 140px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Est. Delivery (Days)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="7"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                                        value={deliveryDays}
                                        onChange={e => setDeliveryDays(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Standard Message</label>
                                <textarea
                                    rows={3}
                                    placeholder="Add notes about quality, warranty or shipping details..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setMassQuoteModal(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !!quoteSuccess}
                                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: '#d94f00', color: '#fff', cursor: (submitting || quoteSuccess) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (submitting || quoteSuccess) ? 0.7 : 1 }}
                                >
                                    {submitting ? 'Sending Batch...' : 'Send Mass Quotes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQMarket;
