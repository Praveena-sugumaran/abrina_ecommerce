import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';

interface SlideCta {
    label: string;
    link: string;
    needsAuth?: boolean;
    variant?: string;
}

interface Slide {
    id: string | number;
    tag: string;
    title: string;
    subtitle: string;
    cta1: SlideCta;
    cta2: SlideCta;
    accent: string;
    gradFrom: string;
    gradMid: string;
    gradTo: string;
    shape1: string;
    shape2: string;
    statLabel: string;
    image?: string;
    mobileImage?: string;
    textAlignment?: 'left' | 'center' | 'right';
    discountText?: string;
    campaignId?: string | any;
    featuresText?: string;
    translations?: any;
    textColor?: 'light' | 'dark';
    products?: any[];
}

interface Category {
    _id: string;
    title: string;
    image: string;
    slug?: string;
    children?: Category[];
}

const HeroBanner = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    const [megaOpen, setMegaOpen] = useState(false);
    const [slide, setSlide] = useState(0);
    const [animating, setAnimating] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { t, user, openLogin, switchRole, siteSettings, language, convertPrice } = useAuth();
    const navigate = useRouter();

    const isSupplier = user?.roles?.includes('supplier') || user?.role === 'supplier';

    const FALLBACK_SLIDES: Slide[] = [
        {
            id: 1,
            tag: t('trusted_by_countries') || 'Trusted by 190+ Countries',
            title: t('hero_slide1_title') || 'Global Online\nMarketplace',
            subtitle: t('hero_slide1_subtitle') || 'Connect with millions of products from verified stores worldwide and shop your favorites.',
            cta1: { label: t('get_quotes_now') || 'Get Quotes Now', link: '/rfq/post', needsAuth: true, variant: 'primary' },
            cta2: {
                label: isSupplier ? 'Seller Dashboard' : (t('start_selling') || 'Start Selling'),
                link: isSupplier ? '/dashboard' : '/become-supplier',
                variant: 'outline'
            },
            accent: '#ff6600',
            gradFrom: '#0a1f4e',
            gradMid: '#2563eb',
            gradTo: '#14408a',
            shape1: '#3b82f6',
            shape2: '#ff6600',
            statLabel: t('hero_stat_products') || '40M+ Products',
            textAlignment: 'left',
            products: []
        },
        {
            id: 2,
            tag: 'MEGA SUMMER SALE',
            title: 'Up to 70% OFF\nOn All Electronics',
            subtitle: 'Get factory-direct prices from verified premium manufacturers. Limited-time offer.',
            cta1: { label: 'Shop Now', link: '/search?category=Electronics', variant: 'primary' },
            cta2: { label: 'Explore Deals', link: '/search?section=Top%20Deals', variant: 'outline' },
            accent: '#ff6b00',
            gradFrom: '#701a28',
            gradMid: '#db2777',
            gradTo: '#9d174d',
            shape1: '#f43f5e',
            shape2: '#fb7185',
            statLabel: 'Up to 70% OFF',
            textAlignment: 'left',
            products: []
        },
        {
            id: 3,
            tag: 'VERIFIED SUPPLIERS DIRECT',
            title: 'Connect Directly\nWith Manufacturers',
            subtitle: 'Secure payments, buyer protection, fast express tracking, and verified factory profiles.',
            cta1: { label: 'Browse Products', link: '/search', variant: 'primary' },
            cta2: { label: 'Submit RFQ', link: '/rfq/post', needsAuth: true, variant: 'outline' },
            accent: '#10b981',
            gradFrom: '#064e3b',
            gradMid: '#059669',
            gradTo: '#047857',
            shape1: '#34d399',
            shape2: '#6ee7b7',
            statLabel: '100% Verified',
            textAlignment: 'left',
            products: []
        }
    ];

    const DYNAMIC_SIDE_LINKS = [
        {
            icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
            title: isSupplier ? (t('seller_dashboard') || 'Seller Dashboard') : (t('start_selling') || 'Start Selling'),
            sub: isSupplier ? (t('manage_your_shop') || 'Manage your shop') : (t('reach_global_buyers') || 'Reach global buyers'),
            link: isSupplier ? '/dashboard' : '/become-supplier',
            cls: 'side-orange'
        },
        {
            icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
            title: t('buyer_protection') || 'Buyer Protection', sub: t('shop_with_confidence') || 'Shop with confidence', link: '/buyer-protection', cls: 'side-blue'
        },
        {
            icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
            title: t('top_ranking') || 'Top Ranking', sub: t('best_sellers_today') || 'Best sellers today', link: '/section/top-ranking', cls: 'side-gold'
        },
        {
            icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
            title: t('ai_sourcing') || 'AI Sourcing', sub: t('smart_discovery') || 'Smart discovery', link: '/ai-sourcing', cls: 'side-purple'
        },
    ];

    const DYNAMIC_STATS = [
        { num: '40M+', label: t('products') || 'Products' },
        { num: '200K+', label: t('suppliers') || 'Suppliers' },
        { num: '190+', label: t('countries') || 'Countries' },
        { num: '24hr', label: t('response') || 'Response' },
    ];

    const [slidesData, setSlidesData] = useState<Slide[]>(FALLBACK_SLIDES);
    const [loadingSlides, setLoadingSlides] = useState(true);
    const [activeCampaign, setActiveCampaign] = useState<any>(null);
    const [coupons, setCoupons] = useState<any[]>([]);

    // Countdown state
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: true });

    /* fetch generic data */
    useEffect(() => {
        Promise.all([
            api.get('/categories'),
            api.get('/hero-slides'),
            api.get('/coupons/public'),
            api.get('/sale-campaigns/active')
        ]).then(([catRes, slideRes, couponRes, campaignRes]) => {
            const cData = catRes.data;
            setCategories(cData);
            if (cData[0]) setActiveCategory(cData[0]);

            // Save campaign and coupons
            setActiveCampaign(campaignRes.data || null);
            setCoupons((couponRes.data || []).slice(0, 5)); // display limit 5 coupons

            const sData = slideRes.data;
            if (sData && sData.length > 0) {
                // Map backend schema to frontend format
                const mapped: Slide[] = sData.map((s: any) => ({
                    id: s._id,
                    tag: s.tag,
                    title: s.title,
                    subtitle: s.subtitle,
                    cta1: { label: s.cta1_label, link: s.cta1_link, needsAuth: s.cta1_needsAuth, variant: s.cta1_variant || 'primary' },
                    cta2: {
                        label: (isSupplier && s.cta2_link === '/become-supplier') ? 'Seller Dashboard' : s.cta2_label,
                        link: (isSupplier && s.cta2_link === '/become-supplier') ? '/dashboard' : s.cta2_link,
                        variant: s.cta2_variant || 'outline'
                    },
                    accent: s.accent, gradFrom: s.gradFrom, gradMid: s.gradMid, gradTo: s.gradTo,
                    shape1: s.shape1, shape2: s.shape2, statLabel: s.statLabel,
                    image: s.image,
                    mobileImage: s.mobileImage,
                    textAlignment: s.textAlignment || 'left',
                    discountText: s.discountText || '',
                    campaignId: s.campaignId,
                    featuresText: s.featuresText || '',
                    translations: s.translations || {},
                    textColor: s.textColor || 'light',
                    products: s.products || []
                }));
                setSlidesData(mapped);
            }
        }).catch(err => console.error('Error fetching hero data:', err))
            .finally(() => setLoadingSlides(false));
    }, [isSupplier]);

    // Countdown Timer logic
    useEffect(() => {
        if (!activeCampaign) return;
        const targetDate = new Date(activeCampaign.endDate);
        if (isNaN(targetDate.getTime())) return; // NaN protection

        const updateTimer = () => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeLeft({ d, h, m, s, expired: false });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeCampaign]);

    /* auto-advance slides */
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSlide(s => (s + 1) % slidesData.length);
        }, 5500);
    }, [slidesData.length]);

    useEffect(() => {
        if (!loadingSlides) startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startTimer, loadingSlides]);

    const goTo = useCallback((indexOrFn: number | ((prev: number) => number)) => {
        if (animating) return;
        setAnimating(true);
        setSlide(indexOrFn);
        setTimeout(() => setAnimating(false), 600);
        startTimer();
    }, [animating, startTimer]);

    // Track Impressions
    useEffect(() => {
        if (!loadingSlides && slidesData[slide]) {
            const curSlide = slidesData[slide];
            if (curSlide.id) {
                api.post(`/hero-slides/${curSlide.id}/track`, { type: 'impression' }).catch(() => { });
            }
        }
    }, [slide, loadingSlides, slidesData]);

    const handleCta = (slideId: string | number, cta: SlideCta, e: React.MouseEvent) => {
        if (slideId) {
            api.post(`/hero-slides/${slideId}/track`, { type: 'click' }).catch(() => { });
        }
        if (cta.needsAuth && !user) { e.preventDefault(); openLogin(); }
        if (isSupplier && cta.link === '/dashboard') {
            switchRole('supplier');
        }
    };

    const handleSideLink = (item: any, e: React.MouseEvent) => {
        if (item.needsAuth && !user) { e.preventDefault(); openLogin(); }
        if (isSupplier && item.link === '/dashboard') {
            switchRole('supplier');
        }
    };

    const getSlideText = (s: Slide, field: 'title' | 'subtitle' | 'tag' | 'discountText' | 'cta1_label' | 'cta2_label', defaultValue: string) => {
        if (s.translations?.[language]?.[field]) {
            return s.translations[language][field];
        }
        return defaultValue;
    };

    const getButtonClass = (variant?: string) => {
        if (variant === 'outline') return 'hb-btn-ghost';
        if (variant === 'secondary') return 'hb-btn-secondary';
        return 'hb-btn-primary';
    };

    const renderTag = (text: string) => {
        if (!text) return null;
        return (
            <div className="hb-tag-pill">
                <span className="hb-tag-text">{text}</span>
            </div>
        );
    };

    const renderFeatureIcon = (feature: string) => {
        const f = feature.trim().toLowerCase();
        if (f.includes('free ship') || f.includes('shipping')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
                    <rect x="9" y="11" width="14" height="10" rx="1" />
                    <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                </svg>
            );
        }
        if (f.includes('secure') || f.includes('safe') || f.includes('protection')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            );
        }
        if (f.includes('return') || f.includes('refund')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            );
        }
        if (f.includes('discount') || f.includes('sale') || f.includes('off')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
            );
        }
        return (
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
    };

    const cur = slidesData[slide] || slidesData[0];

    const cta1Link = (cur.cta1?.link === '/rfq/post' && siteSettings?.rfq_enabled === false) ? '/search' : cur.cta1?.link;
    const cta1Label = (cur.cta1?.link === '/rfq/post' && siteSettings?.rfq_enabled === false) ? (t('browse_products') || 'Browse Products') : getSlideText(cur, 'cta1_label', cur.cta1?.label);
    const cta1NeedsAuth = (cur.cta1?.link === '/rfq/post' && siteSettings?.rfq_enabled === false) ? false : cur.cta1?.needsAuth;

    const cta2Link = (cur.cta2?.link === '/rfq/post' && siteSettings?.rfq_enabled === false) ? '/search' : cur.cta2?.link;
    const cta2Label = (cur.cta2?.link === '/rfq/post' && siteSettings?.rfq_enabled === false) ? (t('browse_products') || 'Browse Products') : getSlideText(cur, 'cta2_label', cur.cta2?.label);

    const linkedCampaignId = cur.campaignId?._id || cur.campaignId;
    const isSaleLayout = activeCampaign && linkedCampaignId === activeCampaign._id;

    if (loadingSlides) {
        return (
            <section className="hero-banner-section">
                <div className="container">
                    <div className="hb-skeleton-root">
                        <div className="hb-skeleton-sidebar">
                            <div className="hb-skeleton-item" style={{ width: '40%', height: '32px', marginBottom: '24px' } as React.CSSProperties} />
                            {Array(8).fill(0).map((_, i) => (
                                <div key={i} className="hb-skeleton-item" />
                            ))}
                        </div>
                        <div className="hb-skeleton-main">
                            <div className="hb-skeleton-tag" />
                            <div className="hb-skeleton-title" />
                            <div className="hb-skeleton-title" style={{ width: '60%' } as React.CSSProperties} />
                            <div className="hb-skeleton-text" />
                            <div className="hb-skeleton-text" style={{ width: '70%' } as React.CSSProperties} />
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                <div className="hb-skeleton-btn" />
                                <div className="hb-skeleton-btn" style={{ width: '120px' } as React.CSSProperties} />
                            </div>
                        </div>
                        <div className="hb-skeleton-right">
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="hb-skeleton-ql" />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="hero-banner-section">
            <div className="container">
                <div className="hb-root">
                    {/* ═══ LEFT CATEGORIES MENU (hidden) ═══ */}
                    <nav
                        className="hb-sidebar"
                        onMouseLeave={() => { setMegaOpen(false); }}
                    >
                        <div className="hb-sidebar-head">
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span>{t('all_categories') || 'All Categories'}</span>
                        </div>

                        <ul className="hb-cat-list">
                            {categories.map(cat => (
                                <li
                                    key={cat._id}
                                    className={`hb-cat-item ${activeCategory?._id === cat._id ? 'hb-cat-active' : ''}`}
                                    onMouseEnter={() => { setActiveCategory(cat); setMegaOpen(true); }}
                                    onClick={() => navigate.push(cat.children && cat.children.length > 0 ? `/categories/${cat.slug || cat._id}` : `/search?category_id=${cat.slug || cat._id}`)}
                                >
                                    <span className="hb-cat-thumb">
                                        <img
                                            src={getImgUrl(cat.image)}
                                            alt={cat.title}
                                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png'}
                                        />
                                    </span>
                                    <span className="hb-cat-name">{cat.title}</span>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* ═══ MAIN HERO SLIDER ═══ */}
                    <div className={`hb-hero ${isSaleLayout ? 'hb-sale-theme' : ''}`} style={{
                        '--grad-from': cur.gradFrom,
                        '--grad-mid': cur.gradMid,
                        '--grad-to': cur.gradTo,
                        '--accent': cur.accent,
                        '--shape1': cur.shape1,
                        '--shape2': cur.shape2,
                    } as React.CSSProperties}>
                        {/* Decorative background layers */}
                        <div className="hb-bg-blob blob-tl" />
                        <div className="hb-bg-blob blob-br" />

                        {/* Dynamic responsive image support */}
                        {cur.image && (
                            <div
                                className="hb-bg-image"
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    zIndex: 1, overflow: 'hidden'
                                }}
                            >
                                <picture>
                                    {cur.mobileImage && <source media="(max-width: 767px)" srcSet={getImgUrl(cur.mobileImage)} />}
                                    <img
                                        src={getImgUrl(cur.image)}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSaleLayout ? 0.85 : 1.0 }}
                                    />
                                </picture>
                            </div>
                        )}

                        <div className="hb-bg-grid" />
                        <div className="hb-bg-glow glow-top" />
                        <div className="hb-bg-glow glow-bottom" />

                        {/* Floating circular discount badge on the right */}
                        {cur.discountText && !isSaleLayout && (
                            <div className={`hb-discount-badge ${cur.products && cur.products.length > 0 ? 'hb-has-products' : ''}`}>
                                <div className="hb-badge-circle-outer">
                                    <div className="hb-badge-circle-inner">
                                        <span className="hb-badge-up-to">{t('up_to') || 'UP TO'}</span>
                                        <span className="hb-badge-percent">{cur.discountText.replace(/[^0-9%]/g, '') || '70%'}</span>
                                        <span className="hb-badge-off">{t('off') || 'OFF'}</span>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* Tilted Polaroid Product Cards (Dynamic Banner Product Showcase) */}
                        {cur.products && cur.products.length > 0 && (
                            <div className="hb-products-showcase">
                                {cur.products.slice(0, 3).map((p: any, idx: number) => {
                                    const img = p.images?.[0] ? getImgUrl(p.images[0]) : '';
                                    return (
                                        <Link
                                            key={p._id}
                                            href={`/product/${p._id}`}
                                            className={`hb-product-card hb-product-card-${idx}`}
                                        >
                                            <div className="hb-product-card-img-wrapper">
                                                {img ? (
                                                    <img src={img} alt={p.name} />
                                                ) : (
                                                    <span style={{ fontSize: '24px' }}>📦</span>
                                                )}
                                            </div>
                                            <div className="hb-product-card-info">
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span className="hb-product-card-price">
                                                        {convertPrice ? convertPrice(p.main_price || 0).formatted : `$${p.main_price}`}
                                                    </span>
                                                    {p.oldPrice && p.oldPrice > p.main_price && (
                                                        <span className="hb-product-card-old-price">
                                                            {convertPrice ? convertPrice(p.oldPrice).formatted : `$${p.oldPrice}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Slide content - aligns left/center/right depending on setting */}
                        <div className={`hb-slide-content hb-align-${(cur.products && cur.products.length > 0) ? 'left' : (cur.textAlignment || 'left')} ${cur.textColor === 'dark' ? 'hb-dark-text-theme' : ''} ${animating ? 'hb-slide-exit' : 'hb-slide-enter'}`}>

                            {/* SALE CAMPAIGN COUNTDOWN LAYOUT */}
                            {isSaleLayout ? (
                                <>
                                    <div className="hb-sale-info">
                                        {renderTag(getSlideText(cur, 'tag', cur.tag))}

                                        {/* Countdown Display */}
                                        <div className="hb-countdown-container">
                                            <span className="hb-countdown-label">{t('sale_ends') || 'Sale Ends:'}</span>
                                            {timeLeft.expired ? (
                                                <span className="hb-campaign-ended">{t('campaign_ended') || 'Campaign Ended'}</span>
                                            ) : (
                                                <div className="hb-timer-boxes">
                                                    <span className="hb-time-val">{timeLeft.d}d</span>
                                                    <span className="hb-time-divider">:</span>
                                                    <span className="hb-time-val">{String(timeLeft.h).padStart(2, '0')}h</span>
                                                    <span className="hb-time-divider">:</span>
                                                    <span className="hb-time-val">{String(timeLeft.m).padStart(2, '0')}m</span>
                                                    <span className="hb-time-divider">:</span>
                                                    <span className="hb-time-val">{String(timeLeft.s).padStart(2, '0')}s</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Big Heading Discount */}
                                    <h1 className="hb-title">
                                        {getSlideText(cur, 'title', cur.title)}
                                        {cur.discountText && (
                                            <span className="hb-sale-discount-title">
                                                {getSlideText(cur, 'discountText', cur.discountText)}
                                            </span>
                                        )}
                                    </h1>

                                    {/* Coupon display list */}
                                    {coupons.length > 0 && (
                                        <div className="hb-coupons-grid">
                                            {coupons.map((coupon: any) => (
                                                <div key={coupon._id} className="hb-coupon-item-card">
                                                    <div className="hb-coupon-value">
                                                        {coupon.discount_type === 'percentage'
                                                            ? `${coupon.discount_value}% OFF`
                                                            : `$${coupon.discount_value} OFF`}
                                                    </div>
                                                    <div className="hb-coupon-min-order">{t('orders_over') || 'Orders'} {convertPrice ? convertPrice(coupon.min_order_amount || 0).formatted : `$${coupon.min_order_amount}`}+</div>
                                                    <div className="hb-coupon-code-badge">Code:{coupon.code}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* STANDARD SLIDE LAYOUT */
                                <>
                                    {renderTag(getSlideText(cur, 'tag', cur.tag))}

                                    <h1 className="hb-title">
                                        {getSlideText(cur, 'title', cur.title).split('\n').map((line: string, i: number) => (
                                            <span key={i} className={i === 1 ? 'hb-title-accent' : ''}>
                                                {line}{i === 0 && <br />}
                                            </span>
                                        ))}
                                    </h1>

                                    <p className="hb-subtitle">{getSlideText(cur, 'subtitle', cur.subtitle)}</p>

                                    {/* Comma-separated features highlights list */}
                                    {cur.featuresText && (
                                        <div className="hb-slide-features-row">
                                            {cur.featuresText.split(',').map((f, idx) => (
                                                <span key={idx} className="hb-feature-tag-item">
                                                    {renderFeatureIcon(f)}
                                                    <span>{f.trim()}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="hb-actions">
                                        <Link
                                            href={cta1Link}
                                            className={getButtonClass(cur.cta1?.variant)}
                                            onClick={e => handleCta(cur.id, { label: cta1Label, link: cta1Link, needsAuth: cta1NeedsAuth }, e)}
                                        >
                                            {cta1Label}
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </Link>
                                        <Link
                                            href={cta2Link}
                                            className={getButtonClass(cur.cta2?.variant)}
                                            onClick={e => handleCta(cur.id, { label: cta2Label, link: cta2Link }, e)}
                                        >
                                            {cta2Label}
                                        </Link>
                                    </div>

                                </>
                            )}
                        </div>

                        {/* Slide Controls */}
                        <div className="hb-controls">
                            <button className="hb-arrow hb-prev" onClick={() => goTo((slide - 1 + slidesData.length) % slidesData.length)}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="hb-dots">
                                {slidesData.map((_, i) => (
                                    <button key={i} className={`hb-dot ${i === slide ? 'hb-dot-active' : ''}`} onClick={() => goTo(i)} />
                                ))}
                            </div>
                            <button className="hb-arrow hb-next" onClick={() => goTo((slide + 1) % slidesData.length)}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Slide progress bar */}
                        <div className="hb-progress-bar">
                            <div key={slide} className="hb-progress-fill" style={{ '--accent': cur.accent } as React.CSSProperties} />
                        </div>
                    </div>

                    {/* ═══ RIGHT QUICK LINKS ═══ */}
                    <div className="hb-quicklinks">
                        {DYNAMIC_SIDE_LINKS.map((item, i) => (
                            <Link
                                key={i}
                                href={item.link}
                                className={`hb-ql-card ${item.cls}`}
                                onClick={e => handleSideLink(item, e)}
                            >
                                <span className="hb-ql-icon">{item.icon}</span>
                                <div className="hb-ql-text">
                                    <span className="hb-ql-title">{item.title}</span>
                                    <span className="hb-ql-sub">{item.sub}</span>
                                </div>
                                <svg className="hb-ql-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 18l6-6-6-6" />
                                </svg>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ═══ BENEFITS BAR UNDER BANNER ═══ */}
                <div className="hb-benefits-bar">
                    <div className="hb-benefit-item">
                        <span className="hb-benefit-icon shipping">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                        </span>
                        <div className="hb-benefit-text">
                            <h4 className="hb-benefit-title">{t('benefit_free_shipping') || 'Free Shipping'}</h4>
                            <p className="hb-benefit-subtitle">{t('benefit_free_shipping_sub') || 'On qualifying orders'}</p>
                        </div>
                    </div>
                    <div className="hb-benefit-item">
                        <span className="hb-benefit-icon returns">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </span>
                        <div className="hb-benefit-text">
                            <h4 className="hb-benefit-title">{t('benefit_returns') || '30-Day Returns'}</h4>
                            <p className="hb-benefit-subtitle">{t('benefit_returns_sub') || 'Easy returns & refunds'}</p>
                        </div>
                    </div>
                    <div className="hb-benefit-item">
                        <span className="hb-benefit-icon payments">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        </span>
                        <div className="hb-benefit-text">
                            <h4 className="hb-benefit-title">{t('benefit_secure_payments') || 'Secure Payments'}</h4>
                            <p className="hb-benefit-subtitle">{t('benefit_secure_payments_sub') || '100% protected payments'}</p>
                        </div>
                    </div>
                    <div className="hb-benefit-item">
                        <span className="hb-benefit-icon support">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                            </svg>
                        </span>
                        <div className="hb-benefit-text">
                            <h4 className="hb-benefit-title">{t('benefit_support') || '24/7 Support'}</h4>
                            <p className="hb-benefit-subtitle">{t('benefit_support_sub') || "We're here to help"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroBanner;

