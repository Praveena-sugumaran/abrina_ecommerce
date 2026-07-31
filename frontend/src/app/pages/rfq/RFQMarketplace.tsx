'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import styles from './RFQMarketplace.module.css';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

const RFQMarketplace = () => {
    const { user, isInitialized, openLogin, siteSettings } = useAuth();
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    // Modal state for submitting a quote
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRfq, setSelectedRfq] = useState<any>(null);
    const [quotePrice, setQuotePrice] = useState('');
    const [quoteNote, setQuoteNote] = useState('');
    const [quoteDeliveryDays, setQuoteDeliveryDays] = useState('');
    const [quoteValidUntil, setQuoteValidUntil] = useState('');

    useEffect(() => {
        fetchCategories();
        fetchRFQs();
    }, [selectedCategory]);

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/categories?flat=true');
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchRFQs = async () => {
        setLoading(true);
        try {
            const url = selectedCategory ? `/rfq?category=${selectedCategory}` : '/rfq';
            const { data } = await api.get(url);
            setRfqs(data);
        } catch (err) {
            setError('Failed to fetch RFQs');
        } finally {
            setLoading(false);
        }
    };

    const openQuoteModal = (rfq: any) => {
        if (!user) {
            toast.error('Please login as a supplier to submit a quote.');
            return;
        }
        if (user.role !== 'supplier' && !user.roles?.includes('supplier')) {
            toast.error('Only suppliers can submit quotes.');
            return;
        }

        setSelectedRfq(rfq);
        setQuotePrice('');
        setQuoteNote('');
        setQuoteDeliveryDays('');
        
        // Default valid until is 7 days from now
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setQuoteValidUntil(d.toISOString().split('T')[0]);

        setIsModalOpen(true);
    };

    const submitQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRfq) return;
        try {
            await api.post(`/rfq/${selectedRfq._id}/quote`, {
                price_offered: Number(quotePrice),
                currency: selectedRfq.currency,
                valid_until: quoteValidUntil,
                note: quoteNote,
                estimated_delivery_days: quoteDeliveryDays
            });
            toast.success('Quote submitted successfully!');
            setIsModalOpen(false);
            fetchRFQs(); // Refresh list to update "hasQuoted" status
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit quote');
        }
    };

    if (isInitialized && siteSettings?.rfq_enabled === false) {
        return (
            <div className={styles.marketplaceBg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', textAlign: 'center', maxWidth: '550px', padding: '50px 40px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '72px', marginBottom: '24px' }}>🛍️</div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px', color: '#111827', letterSpacing: '-0.025em' }}>Marketplace Disabled</h2>
                    <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '15px', lineHeight: '1.6', maxWidth: '400px' }}>
                        This store is currently operating in B2C (retail) mode. The RFQ (Request for Quotation) marketplace is deactivated.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '30px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', width: '100%', maxWidth: '320px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                        Return to Homepage
                    </button>
                </div>
            </div>
        );
    }

    if (isInitialized && !user) {
        return (
            <div className={styles.marketplaceBg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '500px', padding: '40px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ marginBottom: '12px', color: '#111827' }}>Login Required</h2>
                    <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
                        Please log in to view the RFQ Marketplace and submit quotes.
                    </p>
                    <button 
                        onClick={() => openLogin({ mode: 'login', role: 'buyer' })}
                        style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Log In / Register
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.marketplaceBg}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>RFQ Market</h1>
                        <p className={styles.subtitle}>Browse buyer requests and submit your best quotes.</p>
                    </div>
                    <div className={styles.filterGroup}>
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading RFQs...</div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : rfqs.length === 0 ? (
                    <div className={styles.empty}>No active RFQs found.</div>
                ) : (
                    <div className={styles.rfqList}>
                        {rfqs.map(rfq => (
                            <div key={rfq._id} className={`${styles.rfqCard} ${rfq.isPromoted ? styles.promoted : ''}`}>
                                {rfq.isPromoted && <div className={styles.promotedBadge}>🔥 Hot Request</div>}
                                <div className={styles.rfqCardHeader}>
                                    <h3 className={styles.rfqTitle}>{rfq.title}</h3>
                                    <span className={styles.rfqQuantity}>
                                        {rfq.quantity} {rfq.unit}
                                    </span>
                                </div>
                                <div className={styles.rfqMeta}>
                                    <span><strong>Category:</strong> {rfq.category?.title}</span>
                                    {rfq.target_price && (
                                        <span><strong>Target Price:</strong> {rfq.currency} {rfq.target_price}</span>
                                    )}
                                    <span><strong>Posted:</strong> {new Date(rfq.createdAt).toLocaleDateString()}</span>
                                    <span><strong>Expires:</strong> {new Date(rfq.expiry_date).toLocaleDateString()}</span>
                                </div>
                                <p className={styles.rfqDescription}>
                                    {rfq.description.length > 200 
                                        ? `${rfq.description.substring(0, 200)}...` 
                                        : rfq.description}
                                </p>
                                
                                {rfq.attachments && rfq.attachments.length > 0 && (
                                    <div className={styles.attachments}>
                                        <span>Attachments: {rfq.attachments.length}</span>
                                    </div>
                                )}

                                <div className={styles.rfqFooter}>
                                    <div className={styles.buyerInfo}>
                                        <div className={styles.avatar}>
                                            {rfq.buyer?.first_name?.charAt(0) || 'B'}
                                        </div>
                                        <div>
                                            <strong>{rfq.buyer?.first_name} {rfq.buyer?.last_name?.charAt(0)}.</strong>
                                            {rfq.buyer?.country_code && <span className={styles.country}>({rfq.buyer.country_code})</span>}
                                        </div>
                                    </div>
                                    <div>
                                        {rfq.hasQuoted ? (
                                            <button className={styles.quotedBtn} disabled>Quote Submitted ✓</button>
                                        ) : (
                                            <button 
                                                className={styles.quoteBtn} 
                                                onClick={() => openQuoteModal(rfq)}
                                            >
                                                Quote Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quote Modal */}
            {isModalOpen && selectedRfq && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Submit Quote for "{selectedRfq.title}"</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={submitQuote} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label>Target Quantity:</label>
                                <div><strong>{selectedRfq.quantity} {selectedRfq.unit}</strong></div>
                            </div>
                            
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label>Price Offered ({selectedRfq.currency}) *</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0"
                                        required 
                                        value={quotePrice}
                                        onChange={(e) => setQuotePrice(e.target.value)}
                                        placeholder="e.g. 5.50"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Est. Delivery Days</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={quoteDeliveryDays}
                                        onChange={(e) => setQuoteDeliveryDays(e.target.value)}
                                        placeholder="e.g. 15"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Quote Valid Until *</label>
                                <input 
                                    type="date" 
                                    required 
                                    min={new Date().toISOString().split('T')[0]}
                                    value={quoteValidUntil}
                                    onChange={(e) => setQuoteValidUntil(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Message to Buyer *</label>
                                <textarea 
                                    rows={4}
                                    required
                                    value={quoteNote}
                                    onChange={(e) => setQuoteNote(e.target.value)}
                                    placeholder="Describe your capabilities, materials, packaging, etc."
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className={styles.submitBtn}>Send Quote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQMarketplace;
