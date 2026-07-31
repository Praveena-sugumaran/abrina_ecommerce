'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './Tender.module.css';

const PostTender = () => {
    const navigate = useRouter();
    const { user, isInitialized, openLogin } = useAuth();

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('pieces');
    const [startPrice, setStartPrice] = useState('');
    const [minDecrement, setMinDecrement] = useState('10');
    const [endTime, setEndTime] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/categories?flat=true')
            .then(({ data }) => setCategories(data))
            .catch(() => { });

        // Set default end time to 2 days from now
        const d = new Date();
        d.setDate(d.getDate() + 2);
        setEndTime(d.toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM format
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/tenders', {
                title,
                description,
                category: categoryId,
                quantity: Number(quantity),
                unit,
                start_price: Number(startPrice),
                min_decrement: Number(minDecrement),
                end_time: new Date(endTime).toISOString()
            });
            navigate.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to publish tender');
        } finally {
            setLoading(false);
        }
    };

    if (isInitialized && !user) {
        return (
            <div className={styles['tender-page-bg']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className={styles['tender-form-card']} style={{ textAlign: 'center', maxWidth: '500px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ marginBottom: '12px', color: '#111827' }}>Login Required</h2>
                    <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
                        You must be a registered buyer or administrator to publish a Procurement Tender.
                    </p>
                    <button 
                        onClick={() => openLogin({ mode: 'login', role: 'buyer' })}
                        className={styles['tender-btn-submit']}
                        style={{ width: '100%', cursor: 'pointer' }}
                    >
                        Log In / Register
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['tender-page-bg']}>
            <div className={styles['tender-container']}>
                <div className={styles['tender-row']}>
                    <div className={styles['tender-col-7']} style={{ margin: '0 auto' }}>
                        <div className={styles['tender-form-card']}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px', color: '#111827' }}>Create Reverse Auction Tender</h2>
                            {error && <div className={styles['tender-alert-error']}>{error}</div>}
                            
                            <form onSubmit={handleSubmit}>
                                <div className={styles['tender-field-group']}>
                                    <label>Procurement Title *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Bulk cotton t-shirt procurement" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        required 
                                    />
                                </div>

                                <div className={styles['tender-field-group']}>
                                    <label>Product Category *</label>
                                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat._id}>{cat.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles['flex-row']}>
                                    <div className={styles['tender-field-group'] + " " + styles['flex-1']}>
                                        <label>Quantity *</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={quantity} 
                                            onChange={e => setQuantity(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className={styles['tender-field-group'] + " " + styles['flex-1']}>
                                        <label>Unit *</label>
                                        <select value={unit} onChange={e => setUnit(e.target.value)}>
                                            <option value="pieces">Pieces</option>
                                            <option value="sets">Sets</option>
                                            <option value="units">Units</option>
                                            <option value="tons">Tons</option>
                                            <option value="kg">KG</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles['flex-row']}>
                                    <div className={styles['tender-field-group'] + " " + styles['flex-1']}>
                                        <label>Starting Max Price (Floor) ($) *</label>
                                        <input 
                                            type="number" 
                                            placeholder="5000" 
                                            value={startPrice} 
                                            onChange={e => setStartPrice(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className={styles['tender-field-group'] + " " + styles['flex-1']}>
                                        <label>Minimum Decrement Step ($) *</label>
                                        <input 
                                            type="number" 
                                            placeholder="50" 
                                            value={minDecrement} 
                                            onChange={e => setMinDecrement(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className={styles['tender-field-group']}>
                                    <label>Auction End Date &amp; Time *</label>
                                    <input 
                                        type="datetime-local" 
                                        value={endTime} 
                                        onChange={e => setEndTime(e.target.value)} 
                                        required 
                                    />
                                </div>

                                <div className={styles['tender-field-group']}>
                                    <label>Detailed Specifications *</label>
                                    <textarea 
                                        rows={4} 
                                        placeholder="Describe the exact requirements, quality standards, certification needs..." 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        required 
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                    <button type="button" className={styles['tender-btn-cancel']} onClick={() => navigate.back()}>Cancel</button>
                                    <button type="submit" className={styles['tender-btn-submit']} disabled={loading}>
                                        {loading ? 'Publishing...' : 'Publish Tender'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostTender;
