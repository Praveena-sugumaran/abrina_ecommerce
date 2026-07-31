'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './RFQ.module.css';

const STEPS = [
    { id: 1, label: 'Product name' },
    { id: 2, label: 'Quantity & Price' },
    { id: 3, label: 'Details' },
];

const HowToSidebar = () => (
    <aside className={styles['rfq-how-to']}>
        <div className={styles['rfq-how-to-header']}>
            <span className={styles['rfq-how-to-icon']}>RFQ</span>
            <h3>How to use RFQ</h3>
        </div>
        <div className={styles['rfq-steps']}>
            <div className={styles['rfq-step']}>
                <div className={styles['rfq-step-number']}>1</div>
                <div className={styles['rfq-step-content']}>
                    <strong>Describe your request</strong>
                    <p>Write your detailed requirements in this form and post it as an RFQ</p>
                </div>
            </div>
            <div className={styles['rfq-step']}>
                <div className={styles['rfq-step-number']}>2</div>
                <div className={styles['rfq-step-content']}>
                    <strong>Get accurate quotes</strong>
                    <p>Receive quotations from matching suppliers via message or email</p>
                </div>
            </div>
            <div className={styles['rfq-step']}>
                <div className={styles['rfq-step-number']}>3</div>
                <div className={styles['rfq-step-content']}>
                    <strong>Compare quotes in "My RFQs"</strong>
                    <p>Communicate with suppliers that meet your exact needs to finalize order details</p>
                </div>
            </div>
        </div>
        <div className={styles['rfq-how-to-tip']}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Suppliers typically respond within <b>24–48 hours</b> of posting.</span>
        </div>
    </aside>
);

const PostRFQ = () => {
    const navigate = useRouter();
    const { user, isInitialized, openLogin, siteSettings } = useAuth();

    // Step state
    const [step, setStep] = useState(1);

    // Product search state
    const [productSearch, setProductSearch] = useState('');
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('pieces');
    const [targetPrice, setTargetPrice] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [expiryDate, setExpiryDate] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Default expiry = 2 days from now
    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        setExpiryDate(d.toISOString().split('T')[0]);

        api.get('/categories?flat=true').then(({ data }) => setCategories(data)).catch(() => { });
        api.get('/products?limit=1000').then(({ data }) => setAllProducts(data.products || [])).catch(() => { });
    }, []);

    // Click outside to close suggestions
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearchChange = (val: string) => {
        setProductSearch(val);
        setTitle(val);
        if (val.trim().length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const q = val.toLowerCase();
        const filtered = allProducts
            .filter(p => p.name.toLowerCase().includes(q))
            .slice(0, 10);
        setSuggestions(filtered);
        setShowSuggestions(true);
    };

    const selectSuggestion = (prod: any) => {
        setProductSearch(prod.name);
        setTitle(prod.name);
        setCategoryId(prod.category?._id || prod.category || '');
        setShowSuggestions(false);
    };

    const clearSearch = () => {
        setProductSearch('');
        setTitle('');
        setCategoryId('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + attachments.length > 5) {
            alert('Maximum 5 images allowed');
            return;
        }

        setAttachments([...attachments, ...files]);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews([...previews, ...newPreviews]);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', categoryId);
            formData.append('quantity', quantity);
            formData.append('unit', unit);
            if (targetPrice) formData.append('target_price', targetPrice);
            formData.append('currency', currency);
            formData.append('expiry_date', expiryDate);
            attachments.forEach(f => formData.append('attachments', f));

            await api.post('/rfq', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            navigate.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to post RFQ');
        } finally {
            setLoading(false);
        }
    };

    if (isInitialized && siteSettings?.rfq_enabled === false) {
        return (
            <div className={styles['rfq-page-bg']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
                <div className={styles['rfq-form-card']} style={{ textAlign: 'center', maxWidth: '550px', padding: '50px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.06)', background: '#ffffff', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '72px', marginBottom: '24px' }}>🛍️</div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px', color: '#111827', letterSpacing: '-0.025em' }}>RFQ Features Disabled</h2>
                    <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '15px', lineHeight: '1.6', maxWidth: '400px' }}>
                        This store is currently operating in B2C (retail) mode. Standard retail purchasing is enabled. Wholesale Sourcing Requests (RFQ) are deactivated.
                    </p>
                    <button 
                        onClick={() => navigate.push('/search')}
                        className={styles['rfq-btn-submit']}
                        style={{ width: '100%', maxWidth: '320px', cursor: 'pointer', padding: '14px 28px', borderRadius: '30px', fontSize: '15px', fontWeight: '800', border: 'none', background: 'var(--primary-color)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                        Browse Retail Products
                    </button>
                </div>
            </div>
        );
    }

    if (isInitialized && !user) {
        return (
            <div className={styles['rfq-page-bg']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className={styles['rfq-form-card']} style={{ textAlign: 'center', maxWidth: '500px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ marginBottom: '12px', color: '#111827' }}>Login Required</h2>
                    <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
                        You must be a registered buyer or supplier to submit and view Requests for Quotation (RFQ).
                    </p>
                    <button 
                        onClick={() => openLogin({ mode: 'login', role: 'buyer' })}
                        className={styles['rfq-btn-submit']}
                        style={{ width: '100%', cursor: 'pointer' }}
                    >
                        Log In / Register
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['rfq-page-bg']}>
            <div className={styles['rfq-container']}>
                <div className={styles['rfq-row']}>
                    {/* Left col-7: Form Card */}
                    <div className={styles['rfq-col-7']}>
                        <div className={styles['rfq-form-card'] + " " + styles['rfq-step-card']}>

                            {/* Step Progress Bar */}
                            <div className={styles['rfq-progress-bar']}>
                                {STEPS.map((s, i) => (
                                    <React.Fragment key={s.id}>
                                        <div className={`${styles['rfq-progress-step']} ${step >= s.id ? styles['active'] : ''} ${step === s.id ? styles['current'] : ''}`}>
                                            <div className={styles['rfq-progress-circle']}>
                                                {step > s.id
                                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                    : s.id
                                                }
                                            </div>
                                            <span className={styles['rfq-progress-label']}>{s.label}</span>
                                        </div>
                                        {i < STEPS.length - 1 && <div className={`${styles['rfq-progress-line']} ${step > s.id ? styles['active'] : ''}`} />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {error && <div className={styles['rfq-alert-error']}>{error}</div>}

                            {/* ── STEP 1: Product Name ── */}
                            {step === 1 && (
                                <div className={styles['rfq-step-body']}>
                                    <h2 className={styles['rfq-step-title']}>Post your request</h2>
                                    <div className={styles['rfq-field-group']} ref={searchRef}>
                                        <label>* Product name</label>
                                        <div className={styles['rfq-search-wrap']}>
                                            <input
                                                type="text"
                                                className={`${styles['rfq-search-input']} ${showSuggestions && suggestions.length > 0 ? styles['has-suggestions'] : ''}`}
                                                value={productSearch}
                                                onChange={e => handleSearchChange(e.target.value)}
                                                onFocus={() => productSearch && setShowSuggestions(true)}
                                                placeholder="e.g. watch, shirt, electronics..."
                                                autoFocus
                                            />
                                            {productSearch && (
                                                <button type="button" className={styles['rfq-search-clear']} onClick={clearSearch}>⊗</button>
                                            )}
                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className={styles['rfq-suggestions']}>
                                                    {suggestions.map(prod => (
                                                        <div
                                                            key={prod._id}
                                                            className={styles['rfq-suggestion-item']}
                                                            onMouseDown={() => selectSuggestion(prod)}
                                                        >
                                                            {prod.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles['rfq-field-group']} style={{ marginTop: '20px' }}>
                                        <label>Category *</label>
                                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat._id} value={cat._id}>{cat.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles['rfq-step-actions']}>
                                        <button
                                            className={styles['rfq-btn-submit']}
                                            disabled={!title.trim() || !categoryId}
                                            onClick={() => setStep(2)}
                                        >
                                            Next: Quantity &amp; Price →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Quantity & Price ── */}
                            {step === 2 && (
                                <div className={styles['rfq-step-body']}>
                                    <h2 className={styles['rfq-step-title']}>Quantity &amp; Pricing</h2>
                                    <p className={styles['rfq-step-subtitle']}>For: <strong>{title}</strong></p>

                                    <div className={styles['rfq-row']}>
                                        <div className={styles['rfq-field-group'] + " " + styles['flex-1']}>
                                            <label>Quantity *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                placeholder="e.g. 100"
                                                required
                                            />
                                        </div>
                                        <div className={styles['rfq-field-group'] + " " + styles['flex-1']}>
                                            <label>Unit *</label>
                                            <select value={unit} onChange={e => setUnit(e.target.value)}>
                                                <option value="pieces">Pieces</option>
                                                <option value="sets">Sets</option>
                                                <option value="units">Units</option>
                                                <option value="kg">KG</option>
                                                <option value="tons">Tons</option>
                                                <option value="meters">Meters</option>
                                                <option value="boxes">Boxes</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles['rfq-row']}>
                                        <div className={styles['rfq-field-group'] + " " + styles['flex-1']}>
                                            <label>Target Price per Unit <span style={{ fontWeight: 400, color: '#999' }}>(Optional)</span></label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={targetPrice}
                                                onChange={e => setTargetPrice(e.target.value)}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className={styles['rfq-field-group'] + " " + styles['flex-1']}>
                                            <label>Currency</label>
                                            <select value={currency} onChange={e => setCurrency(e.target.value)}>
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="INR">INR (₹)</option>
                                                <option value="CNY">CNY (¥)</option>
                                                <option value="GBP">GBP (£)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles['rfq-field-group']}>
                                        <label>Expiry Date *</label>
                                        <input
                                            type="date"
                                            value={expiryDate}
                                            onChange={e => setExpiryDate(e.target.value)}
                                            required
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div className={styles['rfq-step-actions']}>
                                        <button className={styles['rfq-btn-cancel']} onClick={() => setStep(1)}>← Back</button>
                                        <button
                                            className={styles['rfq-btn-submit']}
                                            disabled={!quantity}
                                            onClick={() => setStep(3)}
                                        >
                                            Next: Details →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Details ── */}
                            {step === 3 && (
                                <div className={styles['rfq-step-body']}>
                                    <h2 className={styles['rfq-step-title']}>Product Details</h2>
                                    <p className={styles['rfq-step-subtitle']}>
                                        <strong>{title}</strong> — {quantity} {unit}
                                        {targetPrice && <> · Target {currency} {targetPrice}</>}
                                    </p>

                                    <div className={styles['rfq-field-group']}>
                                        <div className={styles['rfq-label-row']}>
                                            <label>Detailed Specifications *</label>
                                        </div>
                                        <textarea
                                            rows={5}
                                            placeholder="Describe colors, materials, sizes, certifications, packaging, etc."
                                            value={description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className={styles['rfq-field-group']}>
                                        <label>Product Images / Attachments <span style={{ fontWeight: 400, color: '#999' }}>(Optional)</span></label>
                                        <div className={styles['rfq-file-upload']}>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                id="rfq-attachments"
                                            />
                                            <label htmlFor="rfq-attachments" className={styles['rfq-file-label']}>
                                                <svg width="24" height="24" fill="none" stroke="var(--primary-color)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span>+ Add Images</span>
                                                <small>Max 5 images. Helps suppliers understand your needs.</small>
                                            </label>
                                        </div>
                                        {previews.length > 0 && (
                                            <div className={styles['rfq-preview-grid']}>
                                                {previews.map((url, idx) => (
                                                    <div key={idx} className={styles['rfq-preview-item']}>
                                                        <img src={url} alt="preview" />
                                                        <button type="button" onClick={() => {
                                                            setAttachments(attachments.filter((_, i) => i !== idx));
                                                            setPreviews(previews.filter((_, i) => i !== idx));
                                                        }}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles['rfq-step-actions']}>
                                        <button className={styles['rfq-btn-cancel']} onClick={() => setStep(2)}>← Back</button>
                                        <button
                                            className={styles['rfq-btn-submit']}
                                            disabled={!description.trim() || loading}
                                            onClick={handleSubmit}
                                        >
                                            {loading ? 'Posting...' : 'Post RFQ Now'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right col-5: Sidebar */}
                    <div className={styles['rfq-col-5']}>
                        <HowToSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostRFQ;
