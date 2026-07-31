import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';


const FeaturedSelections = ({ config }: { config?: any }) => {
    const navigate = useRouter();
    const [topDeals, setTopDeals] = useState<any[]>([]);
    const [topRanking, setTopRanking] = useState<any[]>([]);
    const [newArrivals, setNewArrivals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { convertPrice, t, user, openLogin, selectedCountry, siteSettings } = useAuth();

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const uCountry = selectedCountry || 'IN';
                const [dealsRes, rankingRes, arrivalsRes] = await Promise.all([
                    api.get(`/products?section=Top Deals&limit=6&t=${Date.now()}&user_country=${uCountry}`),
                    api.get(`/products?section=Top Ranking&limit=4&t=${Date.now()}&user_country=${uCountry}`),
                    api.get(`/products?section=New Arrivals&limit=4&t=${Date.now()}&user_country=${uCountry}`)
                ]);

                setTopDeals(dealsRes.data.products || []);
                setTopRanking(rankingRes.data.products || []);
                setNewArrivals(arrivalsRes.data.products || []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching featured sections:', error);
                setLoading(false);
            }
        };

        fetchSections();
    }, [selectedCountry]);

    const handleViewMore = (section: 'Top Deals' | 'New Arrivals' | 'Top Ranking') => {
        const routeMap = {
            'Top Deals': 'top-deals',
            'New Arrivals': 'new-arrivals',
            'Top Ranking': 'top-ranking'
        };
        const sectionId = routeMap[section];
        navigate.push(`/section/${sectionId}`);
    };

    if (loading) {
        return (
            <div className="fs2-wrapper container skeleton-pulsing">
                {/* Top Deals Skeleton */}
                <div className="fs2-panel">
                    <div className="fs2-panel-header">
                        <div className="fs2-sk-bar" style={{ width: '160px', height: '22px', marginBottom: '6px' }} />
                        <div className="fs2-sk-bar" style={{ width: '240px', height: '13px' }} />
                    </div>
                    <div className="fs2-deals-grid">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="fs2-sk-card">
                                <div className="fs2-sk-img" />
                                <div style={{ padding: '8px 10px' }}>
                                    <div className="fs2-sk-bar" style={{ width: '70%', height: '11px', marginBottom: '6px' }} />
                                    <div className="fs2-sk-bar" style={{ width: '45%', height: '14px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Dual Skeleton */}
                <div className="fs2-dual-row">
                    {[0, 1].map(i => (
                        <div key={i} className="fs2-panel">
                            <div className="fs2-panel-header">
                                <div className="fs2-sk-bar" style={{ width: '130px', height: '20px', marginBottom: '6px' }} />
                                <div className="fs2-sk-bar" style={{ width: '200px', height: '12px' }} />
                            </div>
                            <div className="fs2-mini-grid">
                                {Array(4).fill(0).map((_, j) => (
                                    <div key={j} className="fs2-sk-card">
                                        <div className="fs2-sk-img" />
                                        <div style={{ padding: '8px 10px' }}>
                                            <div className="fs2-sk-bar" style={{ width: '60%', height: '14px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <style>{`
                    .skeleton-pulsing .fs2-sk-bar,
                    .skeleton-pulsing .fs2-sk-img {
                        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%) !important;
                        background-size: 200% 100% !important;
                        animation: fs2-shimmer 1.5s infinite linear !important;
                        border-radius: 6px;
                        display: block;
                    }
                    @keyframes fs2-shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    // Product Card (small)
    const DealCard = ({ product }: { product: any }) => {
        const price = product.price_tiers?.length > 0
            ? convertPrice(product.price_tiers[0].price).formatted
            : convertPrice(product.main_price || 0).formatted;
        return (
            <Link href={`/product/${product.slug || product._id}`} className="fs2-deal-card">
                <div className="fs2-deal-img-wrap">
                    <img
                        src={getImgUrl(product.images?.[0] || product.main_image)}
                        alt={product.name}
                        className="fs2-deal-img"
                        loading="lazy"
                    />
                </div>
                <div className="fs2-deal-info">
                    <div className="fs2-deal-name">{product.name}</div>
                    <div className="fs2-deal-price">{price}</div>
                    {siteSettings?.rfq_enabled !== false && (
                        <div className="fs2-deal-moq">MOQ: {product.moq || 1}</div>
                    )}
                </div>
            </Link>
        );
    };

    // Mini card (ranking/arrivals)
    const MiniCard = ({ product }: { product: any }) => {
        const price = product.price_tiers?.length > 0
            ? convertPrice(product.price_tiers[0].price).formatted
            : convertPrice(product.main_price || 0).formatted;
        return (
            <Link href={`/product/${product.slug || product._id}`} className="fs2-mini-card">
                <div className="fs2-mini-img-wrap">
                    <img
                        src={getImgUrl(product.images?.[0] || product.main_image)}
                        alt={product.name}
                        loading="lazy"
                    />
                </div>
                <div className="fs2-mini-info">
                    <div className="fs2-mini-price">{price}</div>
                    {siteSettings?.rfq_enabled !== false && (
                        <div className="fs2-mini-moq">MOQ: {product.moq || 1}</div>
                    )}
                </div>
            </Link>
        );
    };

    return (
        <div className="fs2-wrapper container">
            {/* ── Top Deals Section ── */}
            <div className="fs2-panel">
                <div className="fs2-panel-header">
                    <div className="fs2-header-left">
                        <div className="fs2-eyebrow">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Hot Right Now
                        </div>
                        <h2 className="fs2-section-title">{t('top_deals') || 'Top Deals'}</h2>
                        <p className="fs2-section-sub">Score the lowest prices on {siteSettings?.site_name || 'our platform'}</p>
                    </div>
                    <button className="fs2-view-btn" onClick={() => handleViewMore('Top Deals')}>
                        View All
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
                <div className="fs2-deals-grid">
                    {topDeals.map((product: any) => (
                        <DealCard key={product._id} product={product} />
                    ))}
                    {topDeals.length === 0 && Array(6).fill(0).map((_, i) => (
                        <div key={i} className="fs2-sk-card" style={{ aspectRatio: '0.85', background: '#f0f2f8', borderRadius: '12px' }} />
                    ))}
                </div>
            </div>

            {/* ── Dual: Top Ranking + New Arrivals ── */}
            <div className="fs2-dual-row">
                {/* Top Ranking */}
                <div className="fs2-panel">
                    <div className="fs2-panel-header">
                        <div className="fs2-header-left">
                            <h2 className="fs2-section-title">{t('top_ranking') || 'Top Ranking'}</h2>
                            <p className="fs2-section-sub">Market leaders based on volume</p>
                        </div>
                        <button className="fs2-view-btn" onClick={() => handleViewMore('Top Ranking')}>
                            View All
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                    <div className="fs2-mini-grid">
                        {topRanking.map((product: any) => (
                            <MiniCard key={product._id} product={product} />
                        ))}
                    </div>
                </div>

                {/* New Arrivals */}
                <div className="fs2-panel">
                    <div className="fs2-panel-header">
                        <div className="fs2-header-left">
                            <h2 className="fs2-section-title">{t('new_arrivals') || 'New Arrivals'}</h2>
                            <p className="fs2-section-sub">Freshly sourced inventory</p>
                        </div>
                        <button className="fs2-view-btn" onClick={() => handleViewMore('New Arrivals')}>
                            View All
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                    <div className="fs2-mini-grid">
                        {newArrivals.map((product: any) => (
                            <MiniCard key={product._id} product={product} />
                        ))}
                    </div>
                </div>
            </div>


            {/* ── RFQ Sourcing Banner ── */}
            {siteSettings?.rfq_enabled !== false && (
                <div className="fs2-rfq-banner">
                    <div className="fs2-rfq-left">
                        <div className="fs2-rfq-eyebrow">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            {t('request_for_quotation') || 'Request for Quotation'}
                        </div>
                        <h2 className="fs2-rfq-title">{t('source_smarter_quotes') || 'Source Smarter — Get Quotes in 24 Hours'}</h2>
                        <p className="fs2-rfq-desc">{t('post_once_rfq_desc') || 'Post once. Receive multiple competitive quotes from verified global suppliers.'}</p>
                        <div className="fs2-rfq-stats">
                            <span className="fs2-rfq-stat-pill"><strong>200K+</strong> {t('suppliers') || 'Suppliers'}</span>
                            <span className="fs2-rfq-dot">•</span>
                            <span className="fs2-rfq-stat-pill"><strong>24hr</strong> {t('response') || 'Response'}</span>
                        </div>
                    </div>
                    <Link
                        href={user ? "/rfq/post" : "#"}
                        className="fs2-rfq-btn"
                        onClick={(e) => {
                            if (!user) { e.preventDefault(); openLogin(); }
                        }}
                    >
                        {t('submit_rfq') || 'Post an RFQ'}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default FeaturedSelections;
