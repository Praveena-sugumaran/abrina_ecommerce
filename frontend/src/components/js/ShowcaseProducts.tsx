'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import ProductCard from './ProductCard';
import styles from './ShowcaseProducts.module.css';

interface ShowcaseProductsProps {
    config?: any;
    onQuickView?: (product: any) => void;
}

const ShowcaseProducts: React.FC<ShowcaseProductsProps> = ({ config, onQuickView }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedCountry } = useAuth();

    const sliderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchCombined = async () => {
            try {
                // Fetch both in parallel
                const [sponsoredRes, featuredRes] = await Promise.all([
                    api.get(`/ads/public/sponsored?t=${Date.now()}`),
                    api.get(`/products?isFeatured=true&limit=15&t=${Date.now()}&user_country=${selectedCountry || 'IN'}`)
                ]);

                const sponsored = sponsoredRes.data || [];
                const featured = featuredRes.data.products || [];

                // Filter out duplicates (if any product is in both lists, prioritize the sponsored details)
                const sponsoredIds = new Set(sponsored.map((p: any) => p._id));
                const uniqueFeatured = featured.filter((p: any) => !sponsoredIds.has(p._id));

                // Combine them, putting sponsored products first, limit to 12 for the slider
                const combined = [...sponsored, ...uniqueFeatured].slice(0, 12);
                setProducts(combined);
            } catch (err) {
                console.error('Error fetching showcase products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCombined();
    }, [selectedCountry]);

    const scrollNext = () => {
        if (sliderRef.current) {
            const container = sliderRef.current;
            const cardWidth = container.firstElementChild?.clientWidth || 280;
            const gap = 20;
            container.scrollBy({ left: (cardWidth + gap) * 2, behavior: 'smooth' });
        }
    };

    const scrollPrev = () => {
        if (sliderRef.current) {
            const container = sliderRef.current;
            const cardWidth = container.firstElementChild?.clientWidth || 280;
            const gap = 20;
            container.scrollBy({ left: -(cardWidth + gap) * 2, behavior: 'smooth' });
        }
    };

    if (!loading && products.length === 0) return null;

    return (
        <section className={`${styles.showcaseSection} container`}>
            <div className={styles.showcaseInner}>
                <div className={styles.showcaseCard_wrapper}>
                    {/* Header */}
                    <div className={styles.showcaseHeader}>
                        <div className={styles.showcaseTitleGroup}>
                            <div className={styles.showcaseEyebrow}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Premium Recommendations
                            </div>
                            <h2 className={styles.showcaseTitle}>Featured & Sponsored Products</h2>
                            <p className={styles.showcaseSubtitle}>Top-selling listings and promoted supplier campaigns</p>
                        </div>
                        <Link href="/search?isFeatured=true" className={styles.viewAllBtn}>
                            View All
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {/* Swiper Slider Container */}
                    <div className={styles.sliderContainer}>
                        <button
                            onClick={scrollPrev}
                            className={styles.swiperNav}
                            style={{ left: '-18px' }}
                            aria-label="Previous product"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={scrollNext}
                            className={styles.swiperNav}
                            style={{ right: '-18px' }}
                            aria-label="Next product"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <div className={styles.sliderTrack} ref={sliderRef}>
                            {loading
                                ? Array(6).fill(0).map((_, i) => (
                                      <div key={i} className={styles.skeletonCard} />
                                  ))
                                : products.map(product => (
                                      <div key={product._id} className={styles.slideCardWrap}>
                                          <ProductCard
                                              product={product}
                                              onQuickView={onQuickView}
                                          />
                                      </div>
                                  ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ShowcaseProducts;
