import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';


const RFQSection = ({ config }: { config?: any }) => {
    const { user, openLogin, t } = useAuth();
    const navigate = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ productName: '', quantity: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleOpen = () => {
        if (!user) {
            openLogin();
            return;
        }
        setShowForm(true);
        setSubmitted(false);
        setError('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productName.trim()) { setError('Product name is required'); return; }
        setSubmitting(true);
        setError('');
        try {
            await api.post('/rfq', {
                product_name: formData.productName,
                quantity: formData.quantity,
                description: formData.description,
            });
            setSubmitted(true);
            setFormData({ productName: '', quantity: '', description: '' });
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to submit RFQ. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const defaultBenefits = [
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>,
            title: 'Compare Quotes',
            desc: 'Get competitive offers from multiple suppliers'
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
            title: 'Fast Response',
            desc: 'Suppliers respond within 24 hours'
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
            title: 'Secure & Private',
            desc: 'Your info is protected and confidential'
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
            title: 'Global Reach',
            desc: 'Access suppliers from 190+ countries'
        },
    ];

    const benefits = config?.data?.benefits || defaultBenefits;

    const defaultStats = [
        { num: '200K+', label: 'Active Suppliers' },
        { num: '24hr', label: 'Avg. Response' },
        { num: 'Paid', label: 'Subscription' },
        { num: '190+', label: 'Countries Covered' },
    ];

    const stats = config?.data?.stats || defaultStats;

    return (
        <section className="rfq-section">
            <div className="container">
                <div className="rfq-inner">
                    {/* Left Info */}
                    <div className="rfq-left">
                        <div className="rfq-badge">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            REQUEST FOR QUOTATION
                        </div>
                        <h2 className="rfq-main-title">
                            {config?.title || "Tell us what you need, we'll match you with suppliers"}
                        </h2>
                        <p className="rfq-desc">
                            {config?.subtitle || 'Receive multiple quotes, compare prices, and choose the best deal.'}
                        </p>

                        <div className="rfq-benefits">
                            {benefits.map((b: any, i: number) => (
                                <div key={i} className="rfq-benefit">
                                    {b.icon && <span className="rfq-benefit-icon">{b.icon}</span>}
                                    <div>
                                        <h4 className="rfq-benefit-title">{b.title}</h4>
                                        <p className="rfq-benefit-desc">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Stats Card */}
                    <div className="rfq-right">
                        {!showForm ? (
                            <div className="rfq-v2-card">
                                <h3 className="rfq-v2-title">Ready to get offers from the most suitable suppliers?</h3>
                                <div className="rfq-v2-stat-row">
                                    <div className="rfq-v2-stat">
                                        <strong>1</strong>
                                        <span>Request</span>
                                    </div>
                                    <div className="rfq-v2-stat-divider"></div>
                                    <div className="rfq-v2-stat">
                                        <strong>28M+</strong>
                                        <span>Suppliers</span>
                                    </div>
                                    <div className="rfq-v2-stat-divider"></div>
                                    <div className="rfq-v2-stat">
                                        <strong>24h</strong>
                                        <span>Response</span>
                                    </div>
                                </div>
                                <button className="rfq-v2-btn" onClick={() => {
                                    if (!user) { openLogin(); return; }
                                    navigate.push('/rfq/post');
                                }}>
                                    Post a request
                                </button>
                                <p className="rfq-v2-note">It's free and takes seconds!</p>
                            </div>
                        ) : (
                            <div className="rfq-form-card">
                                <button className="rfq-form-close" onClick={() => setShowForm(false)}>✕</button>
                                {submitted ? (
                                    <div className="rfq-success">
                                        <div className="rfq-success-icon" style={{
                                            fontSize: '48px',
                                            color: '#10b981',
                                            margin: '0 auto 16px',
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="60" height="60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3>RFQ Submitted!</h3>
                                        <p>Suppliers will respond to your request within 24 hours.</p>
                                        <Link href="/dashboard/rfq" className="rfq-view-btn">View My RFQs</Link>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="rfq-form-title">Quick RFQ</h3>
                                        <form className="rfq-form" onSubmit={handleSubmit}>
                                            <div className="rfq-field">
                                                <label>Product Name *</label>
                                                <input
                                                    type="text"
                                                    name="productName"
                                                    placeholder="e.g. Wireless Earbuds"
                                                    value={formData.productName}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                            <div className="rfq-field">
                                                <label>Quantity</label>
                                                <input
                                                    type="text"
                                                    name="quantity"
                                                    placeholder="e.g. 500 pieces"
                                                    value={formData.quantity}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="rfq-field">
                                                <label>Additional Details</label>
                                                <textarea
                                                    name="description"
                                                    placeholder="Specifications, materials, budget, delivery timeline..."
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    rows={4}
                                                />
                                            </div>
                                            {error && <p className="rfq-error">{error}</p>}
                                            <button type="submit" className="rfq-submit-btn" disabled={submitting}>
                                                {submitting ? 'Submitting...' : 'Submit RFQ'}
                                            </button>
                                        </form>
                                        <p className="rfq-disclaimer">
                                            For detailed RFQ, <Link href="/rfq/post">click here →</Link>
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RFQSection;
