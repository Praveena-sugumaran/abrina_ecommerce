'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from '@/app/pages/tender/Tender.module.css';

const TenderMarket = ({ isBuyerView = false }: { isBuyerView?: boolean }) => {
    const { user, convertPrice } = useAuth();
    const [tenders, setTenders] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/categories?flat=true')
            .then(({ data }) => setCategories(data))
            .catch(() => { });
    }, []);

    const fetchTenders = async () => {
        setLoading(true);
        try {
            let url = '/tenders?status=active';
            if (isBuyerView) {
                url = '/tenders?my_tenders=true';
            } else if (selectedCategory) {
                url += `&category=${selectedCategory}`;
            }
            const { data } = await api.get(url);
            setTenders(data.data || []);
        } catch (err) {
            setError('Failed to fetch tenders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenders();
    }, [selectedCategory, isBuyerView]);

    const getStatusColor = (status: string) => {
        const colors: any = {
            active: '#10b981',
            ended: '#f59e0b',
            awarded: '#3b82f6',
            draft: '#64748b'
        };
        return colors[status?.toLowerCase()] || '#64748b';
    };

    return (
        <div className={styles['tender-form-card']} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#1a2b4b' }}>
                        {isBuyerView ? 'My Sourcing Tenders' : 'Reverse Auction Tenders'}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                        {isBuyerView ? 'Manage your open bidding and award contracts.' : 'Compete with lowest bids to win wholesale orders.'}
                    </p>
                </div>
                {isBuyerView && (
                    <Link href="/tenders/post" className={styles['tender-btn-submit']} style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>
                        + Create Tender
                    </Link>
                )}
            </div>

            {!isBuyerView && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.title}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading tenders...</div>
            ) : error ? (
                <div className={styles['tender-alert-error']}>{error}</div>
            ) : tenders.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                    No active tenders found.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles['bid-table']}>
                        <thead>
                            <tr>
                                <th>Procurement Item</th>
                                <th>Category</th>
                                <th>Target Quantity</th>
                                <th>Start Price</th>
                                <th>Current Lowest Bid</th>
                                <th>Status</th>
                                <th>Time Remaining</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenders.map(t => {
                                const end = new Date(t.end_time).getTime();
                                const now = new Date().getTime();
                                const distance = end - now;
                                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const timeLeft = distance > 0 ? `${days}d ${hours}h` : 'Expired';

                                return (
                                    <tr key={t._id}>
                                        <td>
                                            <strong style={{ color: '#0f172a' }}>{t.title}</strong>
                                        </td>
                                        <td>{t.category?.title}</td>
                                        <td>{t.quantity} {t.unit}</td>
                                        <td>{convertPrice ? convertPrice(t.start_price).formatted : `$${t.start_price}`}</td>
                                        <td style={{ color: '#ff6600', fontWeight: 'bold' }}>
                                            {t.current_lowest_bid !== undefined 
                                                ? (convertPrice ? convertPrice(t.current_lowest_bid).formatted : `$${t.current_lowest_bid}`)
                                                : (convertPrice ? convertPrice(t.start_price).formatted : `$${t.start_price}`)
                                            }
                                        </td>
                                        <td>
                                            <span style={{ 
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                background: `${getStatusColor(t.status)}18`,
                                                color: getStatusColor(t.status)
                                            }}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td>{timeLeft}</td>
                                        <td>
                                            <Link 
                                                href={isBuyerView ? `/dashboard/tenders-live/${t._id}` : `/supplier/dashboard/tenders-live/${t._id}`} 
                                                className={styles['tender-btn-submit']} 
                                                style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', display: 'inline-block' }}
                                            >
                                                {isBuyerView ? 'Manage live' : 'Bid Now'}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TenderMarket;
