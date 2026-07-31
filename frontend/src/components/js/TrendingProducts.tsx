import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';

const TrendingProducts = ({ config }: { config: any }) => {
    const [trending, setTrending] = useState<any[]>([]);
    const [newArrivals, setNewArrivals] = useState<any[]>([]);
    const [topRanking, setTopRanking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { convertPrice, t, selectedCountry, siteSettings } = useAuth();
    const navigate = useRouter();

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const uCountry = selectedCountry || '';
                const [rTrending, rNew, rTop] = await Promise.all([
                    api.get(`/products?section=Top Deals&limit=6&user_country=${uCountry}&t=${Date.now()}`),
                    api.get(`/products?section=New Arrivals&limit=4&user_country=${uCountry}&t=${Date.now()}`),
                    api.get(`/products?section=Top Ranking&limit=4&user_country=${uCountry}&t=${Date.now()}`)
                ]);
                setTrending(rTrending.data.products || []);
                setNewArrivals(rNew.data.products || []);
                setTopRanking(rTop.data.products || []);
            } catch (err) {
                console.error('Error fetching trending products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [selectedCountry]);

    const handleViewMore = (section: string) => {
        navigate.push(`/section/${section.toLowerCase().replace(/\s+/g, '-')}`);
    };

    const ProductCard = ({ product }: { product: any }) => (
        <Link href={`/product/${product.slug || product._id}`} className="tp-card">
            <div className="tp-img-wrap">
                <img 
                    src={getImgUrl(product.images?.[0] || product.main_image)} 
                    alt={product.name} 
                    loading="lazy"
                    onError={e => (e.target as HTMLImageElement).src = 'https://placehold.co/300'} 
                />
            </div>
            <div className="tp-info">
                <h4 className="tp-name">{product.name}</h4>
                <div className="tp-price">
                    {convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0).formatted}
                </div>
                {siteSettings?.rfq_enabled !== false && (
                    <div className="tp-meta">
                        <span className="tp-moq">MOQ: {product.moq || 1}</span>
                    </div>
                )}
            </div>
        </Link>
    );

    return (
        <section className="trending-premium-section">
            <div className="container">
                {/* 1. Top Deals - Full Width */}
                <div className="tp-block tp-full">
                    <div className="tp-header" onClick={() => handleViewMore('Top Deals')}>
                        <div className="tp-header-text">
                            <h2 className="tp-title">Top Deals</h2>
                            <p className="tp-subtitle">Score the lowest prices on {siteSettings?.site_name || 'AliExpress Next'}.com</p>
                        </div>
                        <button className="tp-arrow-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                    <div className="tp-grid-6">
                        {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="tp-skeleton" />) : 
                         trending.map(p => <ProductCard key={p._id} product={p} />)}
                    </div>
                </div>

                <div className="tp-split-row">
                    {/* 2. Top Ranking */}
                    <div className="tp-block tp-half">
                        <div className="tp-header" onClick={() => handleViewMore('Top Ranking')}>
                            <div className="tp-header-text">
                                <h2 className="tp-title">Top Ranking</h2>
                                <p className="tp-subtitle">Market leaders based on volume</p>
                            </div>
                            <button className="tp-arrow-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                        <div className="tp-grid-4">
                            {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="tp-skeleton" />) : 
                             topRanking.map(p => <ProductCard key={p._id} product={p} />)}
                        </div>
                    </div>

                    {/* 3. New Arrivals */}
                    <div className="tp-block tp-half">
                        <div className="tp-header" onClick={() => handleViewMore('New Arrivals')}>
                            <div className="tp-header-text">
                                <h2 className="tp-title">New Arrivals</h2>
                                <p className="tp-subtitle">Freshly sourced inventory</p>
                            </div>
                            <button className="tp-arrow-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                        <div className="tp-grid-4">
                            {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="tp-skeleton" />) : 
                             newArrivals.map(p => <ProductCard key={p._id} product={p} />)}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrendingProducts;
