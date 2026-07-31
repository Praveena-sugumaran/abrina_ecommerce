import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';

const HomeCategories = ({ config }: { config?: any }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useAuth();
    const sliderRef = useRef<HTMLDivElement>(null);
    const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catRes = await api.get('/categories');
                setCategories(catRes.data.slice(0, 10));
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const scrollNext = () => {
        if (sliderRef.current) {
            const container = sliderRef.current;
            const cardWidth = container.firstElementChild?.clientWidth || 120;
            const gap = 16;
            container.scrollBy({ left: (cardWidth + gap) * 2, behavior: 'smooth' });
        }
    };

    const scrollPrev = () => {
        if (sliderRef.current) {
            const container = sliderRef.current;
            const cardWidth = container.firstElementChild?.clientWidth || 120;
            const gap = 16;
            container.scrollBy({ left: -(cardWidth + gap) * 2, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="home-categories-section">
                <div className="container" style={{ padding: '0 0 20px' }}>
                    <div className="hc-skeleton-header">
                        <div className="hc-skeleton-title" />
                        <div className="hc-skeleton-subtitle" />
                    </div>
                    <div className="hc-skeleton-container">
                        <div className="hc-skeleton-grid">
                            {Array(10).fill(0).map((_, i) => (
                                <div key={i} className="hc-skeleton-card" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="home-categories-section">
            <div className="container">
                <div className="hc-header">
                    <div className="hc-header-left">
                        <h2 className="hc-title">{config?.title || t('browse_categories') || 'Browse Categories'}</h2>
                        <p className="hc-subtitle">{config?.subtitle || t('explore_thousands_products') || 'Explore thousands of products by category'}</p>
                    </div>
                    <Link href="/categories" className="hc-view-all">
                        {t('view_all_categories')} &rarr;
                    </Link>
                </div>

                <div className="hc-slider-container">
                    <button
                        onClick={scrollPrev}
                        className="hc-swiper-nav hc-swiper-prev"
                        aria-label="Previous category"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={scrollNext}
                        className="hc-swiper-nav hc-swiper-next"
                        aria-label="Next category"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {categories.length > 0 && (
                        <div className="hc-slider-track" ref={sliderRef}>
                            {categories.map((cat, idx) => (
                                <Link
                                    key={`${cat._id}-${idx}`}
                                    href={cat.children && cat.children.length > 0 ? `/categories/${cat.slug || cat._id}` : `/search?category_id=${cat.slug || cat._id}`}
                                    className="hc-card"
                                >
                                    <div className="hc-card-img-wrap">
                                        <img
                                            src={getImgUrl(cat.image)}
                                            alt={cat.title}
                                            className="hc-card-img"
                                            loading="lazy"
                                            onError={e => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=' + encodeURIComponent(cat.title);
                                            }}
                                        />
                                    </div>
                                    <div className="hc-card-info">
                                        <h3 className="hc-card-name">{cat.title}</h3>
                                        <p className="hc-card-count">
                                            {typeof cat.product_count === 'number' ? cat.product_count.toLocaleString() : '0'} {t('products') || 'Products'}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default HomeCategories;

