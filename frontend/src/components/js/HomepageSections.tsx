'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import ProductCard from './ProductCard';
import styles from './HomepageSections.module.css';



// ─── Interfaces ───────────────────────────────────────────────────────────────
interface HomepageSectionsProps {
    sections?: any[];
    categoriesComponent?: React.ReactNode;
    showcaseComponent?: (onQuickView: (product: any) => void) => React.ReactNode;
    suppliersComponent?: React.ReactNode;
    couponsComponent?: React.ReactNode;
    rfqComponent?: React.ReactNode;
    whyChooseUsComponent?: React.ReactNode;
    appPromoComponent?: React.ReactNode;
    selectionsComponent?: React.ReactNode;
}

// ─── Inline Product Mini Card ─────────────────────────────────────────────────
const MiniProductCard = ({ product, convertPrice }: { product: any; convertPrice: any }) => {
    const price = convertPrice ? convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0).formatted : `$${product.main_price || 0}`;
    const img = getImgUrl(product.images?.[0] || product.main_image);
    return (
        <Link href={`/product/${product.slug || product._id}`} className={styles.miniCard}>
            <div className={styles.miniImgWrap}>
                <img src={img} alt={product.name} className={styles.miniImg} loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=No+Image'; }} />
            </div>
            <div className={styles.miniInfo}>
                <p className={styles.miniName}>{product.name}</p>
                <span className={styles.miniPrice}>{price}</span>
            </div>
        </Link>
    );
};

export const HomepageSections: React.FC<HomepageSectionsProps> = ({
    sections = [],
    categoriesComponent,
    showcaseComponent,
    suppliersComponent,
    couponsComponent,
    rfqComponent,
    whyChooseUsComponent,
    appPromoComponent,
    selectionsComponent
}) => {
    const { convertPrice, selectedCountry, siteSettings } = useAuth();
    const [dealsOfDay, setDealsOfDay] = useState<any[]>([]);
    const [flashSale, setFlashSale] = useState<any[]>([]);
    const [bestSellers, setBestSellers] = useState<any[]>([]);
    const [newArrivals, setNewArrivals] = useState<any[]>([]);
    const [topRanking, setTopRanking] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Quick View state
    const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
    const [qvQuantity, setQvQuantity] = useState(1);
    const [qvCartSuccess, setQvCartSuccess] = useState(false);
    const [qvImageIdx, setQvImageIdx] = useState(0);

    // Countdown timers
    const [dayTimer, setDayTimer] = useState({ h: 5, m: 47, s: 22 });
    const [flashTimer, setFlashTimer] = useState({ h: 1, m: 58, s: 33 });

    // Flash sale tab
    const [flashTab, setFlashTab] = useState<'flash' | 'new' | 'rank'>('flash');

    // Brands
    const brandSec = sections.find(s => s.id_name === 'shop_by_brand');
    const isBrandActive = brandSec ? brandSec.is_active : true;

    useEffect(() => {
        const fetchSections = async () => {
            setLoading(true);
            try {
                const uCountry = selectedCountry || 'IN';
                const [rDeals, rFlash, rBest, rNew, rRank] = await Promise.all([
                    api.get(`/products?section=Top Deals&limit=4&user_country=${uCountry}&t=${Date.now()}`),
                    api.get(`/products?section=Top Deals&limit=6&user_country=${uCountry}&offset=4&t=${Date.now()}`),
                    api.get(`/products?section=Top Ranking&limit=8&user_country=${uCountry}&t=${Date.now()}`),
                    api.get(`/products?section=New Arrivals&limit=8&user_country=${uCountry}&t=${Date.now()}`),
                    api.get(`/products?section=Top Ranking&limit=4&user_country=${uCountry}&t=${Date.now()}`)
                ]);
                setDealsOfDay(rDeals.data?.products || []);
                setFlashSale(rFlash.data?.products || []);
                setBestSellers(rBest.data?.products || []);
                setNewArrivals(rNew.data?.products || []);
                setTopRanking(rRank.data?.products || []);
            } catch (err) {
                console.error('Failed to load homepage sections:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSections();

        const stored = localStorage.getItem('recently_viewed_products');
        if (stored) {
            try { setRecentlyViewed(JSON.parse(stored).slice(0, 4)); } catch { /* */ }
        }
    }, [selectedCountry]);

    // Timers synced with Admin siteSettings
    useEffect(() => {
        const updateTimer = () => {
            if (siteSettings?.deals_timer_end_date) {
                const target = new Date(siteSettings.deals_timer_end_date).getTime();
                const now = Date.now();
                const diff = Math.max(0, Math.floor((target - now) / 1000));
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                setDayTimer({ h, m, s });
            } else {
                const cycleHours = siteSettings?.deals_timer_hours || 24;
                const now = new Date();
                const currentSecondsInCycle = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % (cycleHours * 3600);
                const remainingSeconds = (cycleHours * 3600) - currentSecondsInCycle;
                const h = Math.floor(remainingSeconds / 3600);
                const m = Math.floor((remainingSeconds % 3600) / 60);
                const s = remainingSeconds % 60;
                setDayTimer({ h, m, s });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleAddToCart = () => {
        if (!quickViewProduct) return;
        try {
            const price = quickViewProduct.main_price || quickViewProduct.price_tiers?.[0]?.price || 0;
            const img = quickViewProduct.images?.[0] || quickViewProduct.main_image || '';
            const cartItem = {
                productId: quickViewProduct._id,
                name: quickViewProduct.name,
                price: price,
                image: img,
                quantity: qvQuantity,
                variants: {},
                sku: quickViewProduct.sku || '',
                supplier: quickViewProduct.supplier || null
            };

            const cart = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');
            const idx = cart.findIndex((i: any) => i.productId === cartItem.productId && JSON.stringify(i.variants) === JSON.stringify(cartItem.variants));
            if (idx > -1) {
                cart[idx].quantity += qvQuantity;
            } else {
                cart.push(cartItem);
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated'));

            setQvCartSuccess(true);
            setTimeout(() => setQvCartSuccess(false), 2000);
        } catch (err) {
            console.error('Error adding to cart in quick view:', err);
        }
    };

    const pad = (n: number) => String(n).padStart(2, '0');

    // Which products to show in the tabbed flash section
    const tabProducts = flashTab === 'flash' ? flashSale : flashTab === 'new' ? newArrivals : topRanking;

    return (
        <div className={styles.sectionsContainer}>


            {/* ─── 1. DEALS OF THE DAY ─────────────────────────────────────────── */}
            <section className={styles.dealsSection}>
                <div className="container">
                    <div className={styles.dealsSectionHeader}>
                        <div className={styles.dealsTitleGroup}>
                            <div className={styles.dealsEyebrow}>
                                <span className={styles.eyebrowDot} />
                                LIMITED OFFER
                            </div>
                            <h2 className={styles.dealsSectionTitle}>Deals of the Day</h2>
                        </div>
                        <div className={styles.dealsTimerGroup}>
                            <span className={styles.timerLabel}>Ends in</span>
                            <div className={styles.timerBlocks}>
                                <div className={styles.timerBlock}>
                                    <span className={styles.timerNum}>{pad(dayTimer.h)}</span>
                                    <span className={styles.timerUnit}>HRS</span>
                                </div>
                                <span className={styles.timerColon}>:</span>
                                <div className={styles.timerBlock}>
                                    <span className={styles.timerNum}>{pad(dayTimer.m)}</span>
                                    <span className={styles.timerUnit}>MIN</span>
                                </div>
                                <span className={styles.timerColon}>:</span>
                                <div className={styles.timerBlock}>
                                    <span className={styles.timerNum}>{pad(dayTimer.s)}</span>
                                    <span className={styles.timerUnit}>SEC</span>
                                </div>
                            </div>
                        </div>
                        <Link href="/search?section=Top Deals" className={styles.seeAllBtn}>See All →</Link>
                    </div>

                    <div className={styles.dealsGrid}>
                        {loading
                            ? Array(4).fill(0).map((_, i) => <div key={i} className={styles.cardSkeleton} />)
                            : dealsOfDay.map(p => (
                                <ProductCard key={p._id} product={p} onQuickView={setQuickViewProduct} />
                            ))
                        }
                    </div>
                </div>
            </section>

            {/* ─── 2. BROWSE CATEGORIES ─────────────────────────────────────────── */}
            {categoriesComponent}

            {/* ─── 3. FEATURED / SHOWCASE PRODUCTS (Slider) ────────────────────── */}
            {showcaseComponent?.(setQuickViewProduct)}

            {/* ─── 4. FLASH SALE + TABBED SECTIONS ────────────────────────────── */}
            <section className={styles.flashSection}>
                <div className="container">
                    <div className={styles.flashLayout}>
                        {/* Left column: Flash Sale header + timer */}
                        <div className={styles.flashLeft}>
                            <div className={styles.flashBadge}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13 2L4.09 12.56l7.41-.66L10.09 22 19 11.44l-7.41.66L13 2z" />
                                </svg>
                                FLASH SALE
                            </div>
                            <div className={styles.flashTimerInline}>
                                <div className={styles.flashTimerBox}>{pad(flashTimer.h)}</div>
                                <span className={styles.flashTimerSep}>:</span>
                                <div className={styles.flashTimerBox}>{pad(flashTimer.m)}</div>
                                <span className={styles.flashTimerSep}>:</span>
                                <div className={styles.flashTimerBox}>{pad(flashTimer.s)}</div>
                            </div>
                            <p className={styles.flashLeftSub}>Don't miss these fire deals before they expire!</p>
                            <Link href="/search?section=Top Deals" className={styles.flashViewAll}>View All Sales →</Link>
                        </div>

                        {/* Right column: Tabbed products */}
                        <div className={styles.flashRight}>
                            <div className={styles.flashTabs}>
                                {(['flash', 'new', 'rank'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        className={`${styles.flashTab} ${flashTab === tab ? styles.flashTabActive : ''}`}
                                        onClick={() => setFlashTab(tab)}
                                    >
                                        {tab === 'flash' ? '🔥 Top Deals' : tab === 'new' ? '✨ New Arrivals' : '🏆 Top Ranking'}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.flashGrid}>
                                {loading
                                    ? Array(6).fill(0).map((_, i) => <div key={i} className={styles.flashSkeleton} />)
                                    : tabProducts.slice(0, 6).map(p => (
                                        <MiniProductCard key={p._id} product={p} convertPrice={convertPrice} />
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── 5. BEST SELLERS (ranked grid) ───────────────────────────────── */}
            <section className={styles.bestSellersSection}>
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <div>
                            <div className={styles.sectionEyebrow}>
                                <span className={styles.pulseDot} />
                                WEEKLY TOP SELLING
                            </div>
                            <h2 className={styles.sectionTitle}>🏆 Best Selling Products</h2>
                            <p className={styles.sectionSubtitle}>Highest transaction volumes & customer ratings this week</p>
                        </div>
                        <Link href="/section/top-ranking" className={styles.seeAllBtn}>View All →</Link>
                    </div>
                    <div className={styles.grid4}>
                        {loading
                            ? Array(4).fill(0).map((_, i) => <div key={i} className={styles.cardSkeleton} />)
                            : bestSellers.slice(0, 4).map((p, idx) => (
                                <ProductCard key={p._id} product={p} rank={idx + 1} onQuickView={setQuickViewProduct} />
                            ))
                        }
                    </div>
                    {/* Second row */}
                    {!loading && bestSellers.length > 4 && (
                        <div className={styles.grid4} style={{ marginTop: '24px' }}>
                            {bestSellers.slice(4, 8).map((p, idx) => (
                                <ProductCard key={p._id} product={p} rank={idx + 5} onQuickView={setQuickViewProduct} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── 6. NEW ARRIVALS — Alternating layout ────────────────────────── */}
            <section className={styles.newArrivalsSection}>
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <div>
                            <div className={styles.sectionEyebrow} style={{ color: '#0ea5e9' }}>
                                <span className={styles.pulseDot} style={{ background: '#0ea5e9' }} />
                                FRESHLY ADDED
                            </div>
                            <h2 className={styles.sectionTitle}>✨ New Arrivals</h2>
                            <p className={styles.sectionSubtitle}>The latest products just added to the platform</p>
                        </div>
                        <Link href="/section/new-arrivals" className={styles.seeAllBtn}>See All New →</Link>
                    </div>
                    <div className={styles.grid4}>
                        {loading
                            ? Array(4).fill(0).map((_, i) => <div key={i} className={styles.cardSkeleton} />)
                            : newArrivals.slice(0, 4).map(p => (
                                <ProductCard key={p._id} product={p} onQuickView={setQuickViewProduct} />
                            ))
                        }
                    </div>
                    {!loading && newArrivals.length > 4 && (
                        <div className={styles.grid4} style={{ marginTop: '24px' }}>
                            {newArrivals.slice(4, 8).map(p => (
                                <ProductCard key={p._id} product={p} onQuickView={setQuickViewProduct} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── 7. FEATURED SUPPLIERS ──────────────────────────────────────── */}
            {suppliersComponent}

            {/* ─── 8. ORIGINAL SECTIONS (FeaturedSelections, etc.) ──────────── */}
            {selectionsComponent}
            {rfqComponent}
            {whyChooseUsComponent}
            {appPromoComponent}

            {/* ─── 9. PROMO CODES ──────────────────────────────────────────────── */}
            {couponsComponent}

            {/* ─── 10. RECENTLY VIEWED ─────────────────────────────────────────── */}
            {recentlyViewed.length > 0 && (
                <section id="recently-viewed-section" className={styles.recentSection}>
                    <div className="container">
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>👁️ Recently Viewed</h2>
                                <p className={styles.sectionSubtitle}>Continue shopping where you left off</p>
                            </div>
                        </div>
                        <div className={styles.grid4}>
                            {recentlyViewed.map(p => (
                                <ProductCard key={p._id} product={p} onQuickView={setQuickViewProduct} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ─── QUICK VIEW MODAL ────────────────────────────────────────────── */}
            {quickViewProduct && (() => {
                const qvImages: string[] = (quickViewProduct.images?.length > 0
                    ? quickViewProduct.images
                    : (quickViewProduct.main_image ? [quickViewProduct.main_image] : []));
                const qvIdx = Math.min(qvImageIdx, Math.max(0, qvImages.length - 1));
                const handleClose = () => { setQuickViewProduct(null); setQvImageIdx(0); };
                return (
                <div className={styles.modalOverlay} onClick={handleClose}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={handleClose}>×</button>
                        <div className={styles.modalGrid}>
                            <div className={styles.modalGallery}>
                                {/* Main image */}
                                <div className={styles.modalSlider}>
                                    <img
                                        key={qvIdx}
                                        src={getImgUrl(qvImages[qvIdx])}
                                        alt={`${quickViewProduct.name} ${qvIdx + 1}`}
                                        className={styles.modalImg}
                                    />
                                    {qvImages.length > 1 && (
                                        <>
                                            <button
                                                className={`${styles.modalSliderBtn} ${styles.modalSliderPrev}`}
                                                onClick={() => setQvImageIdx(i => (i - 1 + qvImages.length) % qvImages.length)}
                                                aria-label="Previous image"
                                            >‹</button>
                                            <button
                                                className={`${styles.modalSliderBtn} ${styles.modalSliderNext}`}
                                                onClick={() => setQvImageIdx(i => (i + 1) % qvImages.length)}
                                                aria-label="Next image"
                                            >›</button>
                                        </>
                                    )}
                                </div>
                                {/* Thumbnail dots */}
                                {qvImages.length > 1 && (
                                    <div className={styles.modalThumbs}>
                                        {qvImages.map((img, i) => (
                                            <button
                                                key={i}
                                                className={`${styles.modalThumb} ${i === qvIdx ? styles.modalThumbActive : ''}`}
                                                onClick={() => setQvImageIdx(i)}
                                                aria-label={`View image ${i + 1}`}
                                            >
                                                <img src={getImgUrl(img)} alt="" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalInfo}>
                                <h3 className={styles.modalTitle}>{quickViewProduct.name}</h3>
                                <p className={styles.modalSupplier}>
                                    by {quickViewProduct.supplier?.company_name || 'Verified Seller'}
                                </p>
                                <div className={styles.modalPriceBlock}>
                                    <span className={styles.modalPrice}>
                                        {convertPrice ? convertPrice(quickViewProduct.main_price || 0).formatted : `$${quickViewProduct.main_price}`}
                                    </span>
                                </div>
                                <p className={styles.modalDesc}>
                                    {quickViewProduct.description?.replace(/<[^>]*>/g, '').slice(0, 200)}...
                                </p>
                                <div className={styles.modalActions}>
                                    <div className={styles.modalQtyWrap}>
                                        <button onClick={() => setQvQuantity(q => Math.max(1, q - 1))} className={styles.modalQtyBtn}>−</button>
                                        <span className={styles.modalQtyVal}>{qvQuantity}</span>
                                        <button onClick={() => setQvQuantity(q => q + 1)} className={styles.modalQtyBtn}>+</button>
                                    </div>
                                    <button
                                        onClick={handleAddToCart}
                                        className={`${styles.modalCartBtn} ${qvCartSuccess ? styles.cartSuccess : ''}`}
                                    >
                                        {qvCartSuccess ? '✓ Cart Added!' : 'Add to Cart'}
                                    </button>
                                </div>
                                <Link
                                    href={`/product/${quickViewProduct.slug || quickViewProduct._id}`}
                                    onClick={() => setQuickViewProduct(null)}
                                    className={styles.modalDetailsLink}
                                >
                                    View Full Details →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
};

export default HomepageSections;
