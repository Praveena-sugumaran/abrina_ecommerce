'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import styles from './SectionPage.module.css';

import { getImgUrl } from '@/utils/imageConfig';

// ─── Star Rating Component ──────────────────────────────────────────────────
const StarRating = ({ rating, size = 12 }: { rating: number; size?: number }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const fill = Math.min(1, Math.max(0, rating - (i - 1)));
        stars.push(
            <span key={i} className={styles['sp-star']} style={{ fontSize: size }}>
                {fill >= 1 ? '★' : fill > 0 ? '⭒' : '☆'}
            </span>
        );
    }
    return <span className={styles['sp-stars']}>{stars}</span>;
};

// ─── Supplier Badge Component ───────────────────────────────────────────────
const SupplierBadge = ({ supplierObj }: { supplierObj: any }) => {
    if (!supplierObj) return null;
    const planInfo = supplierObj.user_id?.subscription_plan || supplierObj.subscription_plan_info || supplierObj.subscription_plan;
    const isVerified = supplierObj.is_verified || supplierObj.verification_status === 'verified' || supplierObj.user_id?.is_verified;
    const isPlanVerified = !!(planInfo?.has_verified_badge && isVerified);
    const bColor = planInfo?.badge_color || '#d97706';

    if (isPlanVerified) {
        return (
            <span className={styles['sp-verified-badge-pro']} style={{ color: bColor, padding: '2px 4px', background: `${bColor}22`, borderRadius: '4px', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', textTransform: 'uppercase', lineHeight: 1 }}>
                <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                PRO
            </span>
        );
    } else if (isVerified) {
        return (
            <svg width="11" height="11" fill="var(--primary-color)" viewBox="0 0 24 24" className={styles['sp-verified-icon'] + " " + styles['flex-shrink-0']}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
        );
    }
    return null;
};

// ─── Skeleton Card ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className={styles['sp-card-skeleton']}>
        <div className={styles['sp-skel-img']} />
        <div className={styles['sp-skel-body']}>
            <div className={styles['sp-skel-line'] + " " + styles['w80']} />
            <div className={styles['sp-skel-line'] + " " + styles['w50']} />
            <div className={styles['sp-skel-line'] + " " + styles['w60']} />
        </div>
    </div>
);

// ─── Product Card ───────────────────────────────────────────────────────────
const ProductCard = ({ product, rank, mode, convertPrice, onAddToCart }: { product: any; rank?: number; mode: string; convertPrice: any; onAddToCart: any }) => {
    const { siteSettings } = useAuth();
    const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
    const price = convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0);
    const oldPrice = product.oldPrice > 0 ? convertPrice(product.oldPrice) : null;
    const supplierObj = product.supplier_info || product.supplier;

    const discountPct = oldPrice && product.oldPrice > 0
        ? Math.round(((product.oldPrice - (product.main_price || 0)) / product.oldPrice) * 100)
        : null;

    // Logic for NEW badge: Added in the last 7 days
    const isNewDate = product.createdAt ? (new Date().getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7 : false;
    const isNewArrival = isNewDate;

    return (
        <Link href={`/product/${product.slug || product._id}`} className={`${styles['sp-card']} ${styles[mode]}`}>
            <div className={styles['sp-card-img-wrap']}>
                {imgUrl ? (
                    <img src={imgUrl} alt={product.name} loading="lazy" />
                ) : (
                    <div className={styles['sp-card-img-placeholder']}>
                        <svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                    </div>
                )}

                {/* Rank Badge */}
                {rank && mode === 'ranking' && (
                    <div className={`${styles['sp-rank-badge']} ${rank <= 3 ? styles[`rank-top${rank}`] : styles['rank-other']}`}>
                        #{rank}
                    </div>
                )}

                {/* Discount Badge */}
                {discountPct && discountPct > 0 && mode !== 'ranking' && (
                    <div className={styles['sp-discount-badge']}>-{discountPct}%</div>
                )}

                {/* NEW Badge */}
                {isNewArrival && (
                    <div className={`${styles['sp-new-badge']} ${(rank && mode === 'ranking') ? styles['shifted-down'] : ''}`}>NEW</div>
                )}
            </div>

            <div className={styles['sp-card-body']}>
                <h3 className={styles['sp-card-title']}>{product.name}</h3>

                <div className={styles['sp-card-price-row']}>
                    <span className={styles['sp-card-price']}>{price.formatted}</span>
                    {oldPrice && <span className={styles['sp-card-old-price']}>{oldPrice.formatted}</span>}
                    <span className={styles['sp-card-unit']}>/{product.unit || 'pc'}</span>
                </div>

                {siteSettings?.rfq_enabled !== false && product.moq && (
                    <div className={styles['sp-card-moq']}>MOQ: <strong>{product.moq}</strong> pcs</div>
                )}

                {product.rating > 0 && (
                    <div className={styles['sp-card-rating-row']}>
                        <StarRating rating={product.rating} />
                        <span className={styles['sp-card-rating-val']}>{product.rating.toFixed(1)}</span>
                        {product.numReviews > 0 && <span className={styles['sp-card-reviews']}>({product.numReviews})</span>}
                    </div>
                )}

                {supplierObj?.company_name && (
                    <div className={styles['sp-card-supplier']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <SupplierBadge supplierObj={supplierObj} />
                        <span className={styles['sp-card-supplier-name']}>{supplierObj.company_name}</span>
                        {supplierObj.country_code && (
                            <span className={styles['sp-card-country']}>{supplierObj.country_code}</span>
                        )}
                    </div>
                )}

                <div className={styles['sp-card-footer']}>
                    <button 
                        className={styles['sp-cart-btn']} 
                        onClick={e => onAddToCart(e, product)}
                        style={product._isAdded ? { backgroundColor: '#059669', borderColor: '#059669', color: 'white' } : {}}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {product._isAdded ? '✓ Added' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </Link>
    );
};

// ─── Ranking List Item (for Top Rankings list view) ─────────────────────────
const RankingListItem = ({ product, rank, convertPrice, onAddToCart }: { product: any; rank: number; convertPrice: any; onAddToCart: any }) => {
    const { siteSettings } = useAuth();
    const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
    const price = convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0);
    const supplierObj = product.supplier_info || product.supplier;

    return (
        <Link href={`/product/${product.slug || product._id}`} className={styles['sp-rank-list-item']}>
            <div className={`${styles['sp-rank-number']} ${rank <= 3 ? styles[`rn-top${rank}`] : styles['rn-other']}`}>
                {rank <= 3 ? (
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                ) : rank}
            </div>
            <div className={styles['sp-rank-img-wrap']}>
                {imgUrl ? (
                    <img src={imgUrl} alt={product.name} loading="lazy" />
                ) : (
                    <div className={styles['sp-card-img-placeholder'] + " " + styles['sp-rank-img-placeholder']} />
                )}
            </div>
            <div className={styles['sp-rank-info']}>
                <h3 className={styles['sp-rank-title']}>{product.name}</h3>
                <div className={styles['sp-rank-meta']}>
                    {product.rating > 0 && (
                        <span className={styles['sp-rank-rating']}>
                            <StarRating rating={product.rating} size={11} />
                            <span>{product.rating.toFixed(1)}</span>
                        </span>
                    )}
                    {product.numOrders > 0 && (
                        <span className={styles['sp-rank-sold']}>{product.numOrders.toLocaleString()} sold</span>
                    )}
                </div>
                {supplierObj?.company_name && (
                    <div className={styles['sp-rank-supplier']}>{supplierObj.company_name}</div>
                )}
            </div>
            <div className={styles['sp-rank-price-col']}>
                <div className={styles['sp-rank-price']}>{price.formatted}</div>
                {siteSettings?.rfq_enabled !== false && product.moq && <div className={styles['sp-rank-moq']}>MOQ: {product.moq}</div>}
                <button 
                    className={styles['sp-cart-btn'] + " " + styles['sp-small'] + " " + styles['mt-2']} 
                    onClick={e => onAddToCart(e, product)}
                    style={product._isAdded ? { backgroundColor: '#059669', borderColor: '#059669', color: 'white' } : {}}
                >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {product._isAdded ? '✓ Added' : 'Add'}
                </button>
            </div>
        </Link>
    );
};

// ─── Main Section Page ───────────────────────────────────────────────────────
const SectionPage = () => {
    const params = useParams();
    const sectionId = params?.sectionId as string;
    const navigate = useRouter();
    const { user, openLogin, convertPrice } = useAuth();
    const { openChat } = useChat();
    const navRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

    const handleAddToCart = (e: React.MouseEvent, product: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            openLogin();
            return;
        }

        const cartItem = {
            productId: product._id,
            name: product.name,
            price: product.main_price || product.price_tiers?.[0]?.price || 0,
            image: product.images?.[0] || product.main_image,
            quantity: product.moq || 1,
            variants: {},
            supplier: product.supplier_info || product.supplier
        };

        const cart = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');
        const idx = cart.findIndex((i: any) => i.productId === cartItem.productId);
        if (idx > -1) {
            cart[idx].quantity += cartItem.quantity;
        } else {
            cart.push(cartItem);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));

        setAddedItems(prev => ({ ...prev, [product._id]: true }));
        setTimeout(() => {
            setAddedItems(prev => ({ ...prev, [product._id]: false }));
        }, 2000);
    };
    const [loadingMore, setLoadingMore] = useState(false);
    const [sortBy, setSortBy] = useState('ranking');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [filterOpen, setFilterOpen] = useState(false);
    const LIMIT = 24;

    // Page metadata
    const pageConfig = {
        'top-deals': {
            title: 'Top Deals',
            subtitle: 'Best prices & exclusive discounts from verified suppliers',
            icon: '🔥',
            gradient: 'linear-gradient(90deg, #e6004d 0%, #1d4ed8 100%)',
            pattern: true,
            sortOptions: [
                { key: 'ranking', label: 'Highest Discount' },
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'rating', label: 'Best Rated' },
                { key: 'recent', label: 'Latest Deals' },
            ],
            cardMode: 'deal',
        },
        'top-ranking': {
            title: 'Top Rankings',
            subtitle: 'Best-performing products based on sales & popularity',
            icon: '🏆',
            gradient: 'linear-gradient(135deg, var(--primary-color) 0%, #172554 50%, #1e3a8a 100%)',
            sortOptions: [
                { key: 'ranking', label: 'Top Ranked' },
                { key: 'rating', label: 'Best Reviewed' },
                { key: 'recent', label: 'Newest' },
                { key: 'price_asc', label: 'Lowest Price' },
            ],
            cardMode: 'ranking',
        },
        'new-arrivals': {
            title: 'New Arrivals',
            subtitle: 'Freshly listed products from global suppliers in the last 7 days',
            icon: '✨',
            gradient: 'linear-gradient(135deg, var(--primary-color) 0%, #0369a1 50%, #0ea5e9 100%)',
            sortOptions: [
                { key: 'recent', label: 'Newest First' },
                { key: 'ranking', label: 'Most Popular' },
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'rating', label: 'Best Rated' },
            ],
            cardMode: 'new',
        },
        'dollar-express': {
            title: 'Dollar Express',
            subtitle: 'High-quality wholesale items under $2',
            icon: '💵',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            sortOptions: [
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'ranking', label: 'Most Popular' },
                { key: 'rating', label: 'Best Rated' },
            ],
            cardMode: 'deal',
        },
        'welcome-deal': {
            title: 'Welcome Deal',
            subtitle: 'Exclusive super value deals for new buyers under $5',
            icon: '🎁',
            gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            sortOptions: [
                { key: 'ranking', label: 'Popularity' },
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'rating', label: 'Best Rated' },
            ],
            cardMode: 'deal',
        },
        'local-shipping': {
            title: 'Local Shipping',
            subtitle: 'Fast delivery items dispatched from your selected region',
            icon: '🚚',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            sortOptions: [
                { key: 'ranking', label: 'Popularity' },
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'rating', label: 'Best Rated' },
            ],
            cardMode: 'deal',
        },
        'super-deals': {
            title: 'Super Deals',
            subtitle: 'Limited time maximum discount wholesale deals',
            icon: '⚡',
            gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            sortOptions: [
                { key: 'ranking', label: 'Highest Discount' },
                { key: 'price_asc', label: 'Lowest Price' },
                { key: 'rating', label: 'Best Rated' },
            ],
            cardMode: 'deal',
        },
    };

    const config: any = pageConfig[sectionId as keyof typeof pageConfig] || {
        title: (sectionId as string)?.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        subtitle: '',
        icon: '🛍️',
        gradient: 'linear-gradient(135deg, var(--primary-color) 0%, #1e5799 100%)',
        sortOptions: [{ key: 'ranking', label: 'Popular' }],
        cardMode: 'deal',
    };

    const sectionMap = {
        'top-ranking': 'Top Ranking',
        'top-deals': 'Top Deals',
        'new-arrivals': 'New Arrivals',
        'dollar-express': 'Dollar Express',
        'welcome-deal': 'Welcome Deal',
        'local-shipping': 'Local Shipping',
        'super-deals': 'Super Deals',
    };

    // Fetch categories
    useEffect(() => {
        api.get('/categories')
            .then(({ data }) => {
                console.log("Categories data loaded:", data);
                setCategories(data || []);
            })
            .catch((err) => {
                console.error("Failed to load categories:", err);
            });
    }, []);

    // Main fetch
    const fetchProducts = useCallback(async (pg = 1, append = false) => {
        if (pg === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            const params: any = {
                section: sectionMap[sectionId as keyof typeof sectionMap] || config.title,
                category_id: selectedCategory || undefined,
                sort_by: sortBy,
                limit: LIMIT,
                page: pg,
            };
            if (sectionId === 'new-arrivals') {
                params.sort_by = sortBy === 'recent' || pg === 1 ? 'recent' : sortBy;
            }
            if (sectionId === 'local-shipping') {
                params.country = (typeof window !== 'undefined' ? localStorage.getItem('selected_country') : null) || 'IN';
            }
            const { data } = await api.get('/products', { params: { ...params, t: Date.now() } });
            const fetched = data.products || [];
            if (append) setProducts(prev => [...prev, ...fetched]);
            else setProducts(fetched);
            setHasMore(fetched.length === LIMIT);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [sectionId, selectedCategory, sortBy]);

    useEffect(() => {
        setPage(1);
        setProducts([]);
        setHasMore(true);
        fetchProducts(1, false);
    }, [fetchProducts]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, true);
    };

    const scrollNav = (dir: 'left' | 'right') => {
        navRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    };

    const isRankingPage = sectionId === 'top-ranking';

    return (
        <div className={styles['sp-wrapper']}>
            {/* ── Hero Banner ── */}
            <div className={`${styles['sp-hero']} ${config.pattern ? styles['has-pattern'] : ''}`} style={{ background: config.gradient }}>
                <div className={styles['sp-hero-content']}>
                    <div className={styles['sp-hero-icon-v2']}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><path d="M12 2c0 0-4.5 4.5-4.5 9.5 0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-5-4.5-9.5-4.5-9.5zm0 11.5c-1.1 0-2-.9-2-2 0-1.1.9-2 2-2s2 .9 2 2c0 1.1-.9 2-2 2z" opacity=".8"/><path d="M17.5 12c-1.1 0-2-.9-2-2 0-1.1.9-2 2-2s2 .9 2 2c0 1.1-.9 2-2 2zm-11 0c-1.1 0-2-.9-2-2 0-1.1.9-2 2-2s2 .9 2 2c0 1.1-.9 2-2 2z" opacity=".5"/></svg>
                    </div>
                    <div>
                        <h1 className={styles['sp-hero-title']}>{config.title}</h1>
                        <p className={styles['sp-hero-sub']}>{config.subtitle}</p>
                    </div>
                </div>
                <div className={styles['sp-hero-stats']}>
                    <div className={styles['sp-hero-stat']}>
                        <strong>{products.length}{hasMore ? '+' : ''}</strong>
                        <span>PRODUCTS</span>
                    </div>
                    <div className={styles['sp-hero-stat']}>
                        <strong>{categories.length}+</strong>
                        <span>CATEGORIES</span>
                    </div>
                </div>
            </div>

            {/* ── Category Nav ── */}
            <nav className={styles['sp-cat-nav']}>
                <button className={styles['sp-cat-nav-arrow']} onClick={() => scrollNav('left')}>‹</button>
                <div className={styles['sp-cat-nav-inner']} ref={navRef}>
                    <button
                        className={`${styles['sp-cat-pill']} ${!selectedCategory ? styles['active'] : ''}`}
                        onClick={() => { setSelectedCategory(null); setPage(1); }}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat._id}
                            className={`${styles['sp-cat-pill']} ${selectedCategory === cat._id ? styles['active'] : ''}`}
                            onClick={() => { setSelectedCategory(cat._id); setPage(1); }}
                        >
                            {cat.icon && <span style={{ marginRight: '6px' }}>{cat.icon}</span>}
                            {cat.title}
                        </button>
                    ))}
                </div>
                <button className={styles['sp-cat-nav-arrow']} onClick={() => scrollNav('right')}>›</button>
            </nav>

            {/* ── Toolbar ── */}
            <div className={styles['sp-toolbar']}>
                <div className={styles['sp-toolbar-left']}>
                    <span className={styles['sp-result-count']}>
                        {loading ? '...' : `${products.length}${hasMore ? '+' : ''} products`}
                        {selectedCategory && ' in selected category'}
                    </span>
                </div>
                <div className={styles['sp-toolbar-right']}>
                    {/* Sort */}
                    <div className={styles['sp-sort-group']}>
                        {config.sortOptions.map((opt: any) => (
                            <button
                                key={opt.key}
                                className={`${styles['sp-sort-btn']} ${sortBy === opt.key ? styles['active'] : ''}`}
                                onClick={() => { setSortBy(opt.key); setPage(1); }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* View toggle */}
                    <div className={styles['sp-view-toggle']}>
                        <button
                            className={`${styles['sp-view-btn']} ${viewMode === 'grid' ? styles['active'] : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid view"
                        >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
                                <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
                            </svg>
                        </button>
                        <button
                            className={`${styles['sp-view-btn']} ${viewMode === 'list' ? styles['active'] : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List view"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className={styles['sp-main']}>
                {loading ? (
                    <div className={`${styles['sp-grid']} ${styles[viewMode]}`}>
                        {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : products.length === 0 ? (
                    <div className={styles['sp-empty']}>
                        <div className={styles['sp-empty-icon']}>🔍</div>
                        <h2>No products found</h2>
                        <p>Try a different category or sort option.</p>
                        <button className={styles['sp-empty-btn']} onClick={() => { setSelectedCategory(null); setSortBy('ranking'); }}>
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Ranking List View (special layout for Top Rankings) */}
                        {isRankingPage && viewMode === 'list' ? (
                            <div className={styles['sp-ranking-list']}>
                                {/* Top 3 podium */}
                                {products.length >= 3 && (
                                    <div className={styles['sp-podium']}>
                                        {[products[1], products[0], products[2]].map((p, i) => {
                                            const podiumRank = i === 1 ? 1 : i === 0 ? 2 : 3;
                                            const imgUrl = getImgUrl(p.images?.[0] || p.main_image);
                                            const price = convertPrice(p.main_price || p.price_tiers?.[0]?.price || 0);
                                            return (
                                                <Link key={p._id} href={`/product/${p.slug || p._id}`} className={`${styles['sp-podium-item']} ${styles[`rank-${podiumRank}`]}`}>
                                                    <div className={styles['sp-podium-crown']}>{podiumRank === 1 ? '👑' : podiumRank === 2 ? '🥈' : '🥉'}</div>
                                                    <div className={styles['sp-podium-img']}>
                                                        {imgUrl ? <img src={imgUrl} alt={p.name} /> : <div className={styles['sp-card-img-placeholder']} />}
                                                    </div>
                                                    <div className={styles['sp-podium-rank']}>#{podiumRank}</div>
                                                    <h4 className={styles['sp-podium-name']}>{p.name}</h4>
                                                    <div className={styles['sp-podium-price']}>{price.formatted}</div>
                                                    <button 
                                                        className={styles['sp-cart-btn'] + " " + styles['sp-small'] + " " + styles['mt-3']} 
                                                        onClick={e => handleAddToCart(e, p)}
                                                        style={addedItems[p._id] ? { backgroundColor: '#059669', borderColor: '#059669', color: 'white' } : {}}
                                                    >
                                                        {addedItems[p._id] ? '✓ Added' : 'Add to Cart'}
                                                    </button>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Remaining list */}
                                <div className={styles['sp-rank-rest']}>
                                    {products.slice(3).map((p, i) => (
                                        <RankingListItem key={p._id} product={{ ...p, _isAdded: addedItems[p._id] }} rank={i + 4} convertPrice={convertPrice} onAddToCart={handleAddToCart} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`${styles['sp-grid']} ${styles[viewMode]}`}>
                                {products.map((p, i) => (
                                    <ProductCard
                                        key={p._id}
                                        product={{ ...p, _isAdded: addedItems[p._id] }}
                                        rank={i + 1}
                                        mode={config.cardMode}
                                        convertPrice={convertPrice}
                                        onAddToCart={handleAddToCart}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Load More */}
                        {hasMore && (
                            <div className={styles['sp-load-more-wrap']}>
                                <button
                                    className={styles['sp-load-more-btn']}
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <><span className={styles['sp-spinner']} /> Loading...</>
                                    ) : (
                                        'Load More Products'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SectionPage;
