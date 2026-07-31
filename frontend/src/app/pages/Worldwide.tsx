'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './Worldwide.module.css';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import { getImgUrl, getFlagUrl } from '@/utils/imageConfig';

const ALL_REGION = {
    name: 'All', icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            <path d="M2 12h20"></path>
        </svg>
    )
};

interface CountryItem {
    name: string;
    icon?: React.ReactNode;
    flag?: string;
}

const Worldwide = () => {
    const { user, convertPrice, t, selectedCountry, siteSettings } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [dynamicHubs, setDynamicHubs] = useState<any[]>([]);
    const [activeCountry, setActiveCountry] = useState('All');
    const [countries, setCountries] = useState<CountryItem[]>([ALL_REGION]);
    const [loading, setLoading] = useState(true);

    // Fetch dynamic countries list on mount
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const { data } = await api.get('/worldwide/countries');
                if (data.success) {
                    setCountries([ALL_REGION, ...data.countries]);
                }
            } catch (err) { console.error('Error fetching countries:', err); }
        };
        fetchCountries();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let queryStr = '';
                if (activeCountry !== 'All') {
                    const found = countries.find(c => c.name === activeCountry);
                    if (found && found.flag) queryStr = `&country=${found.flag.toUpperCase()}`;
                }

                // 1. Fetch Top Rated Products for Automatic Ranking
                const { data } = await api.get(`/products?limit=40&sort_by=ranking${queryStr}&user_country=${selectedCountry || 'IN'}`);
                setProducts(data.products || []);

                // 2. Fetch Curated Worldwide Database Sections (Hubs & Ranks)
                const { data: curatedData } = await api.get(`/worldwide${queryStr ? '?' + queryStr.substring(1) : ''}`);

                setDynamicHubs(curatedData.hubs || []);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching products:', err);
                setLoading(false);
            }
        };
        fetchData();
    }, [activeCountry, selectedCountry, countries]);

    return (
        <div className={styles['worldwide-container']}>
            {/* 1. Country Selection Section */}
            <div className={styles['ww-nav-section']}>
                <div className={styles['ww-countries-swiper-wrapper'] + " " + styles['container']}>
                    {countries.length > 5 && (
                        <button className={`ww-country-nav-btn prev ${styles['ww-country-nav-btn']} ${styles['prev']}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                    )}
                    <Swiper
                        key={countries.length}
                        modules={[Navigation]}
                        loop={countries.length > 8}
                        spaceBetween={20}
                        slidesPerView={'auto'}
                        navigation={{
                            prevEl: '.ww-country-nav-btn.prev',
                            nextEl: '.ww-country-nav-btn.next',
                        }}
                        observer={true}
                        observeParents={true}
                        className={styles['ww-countries-swiper']}
                    >
                        {countries.map((c, idx) => (
                            <SwiperSlide key={idx} style={{ width: 'auto' }}>
                                <div
                                    className={`ww-country-item ${c.name === activeCountry ? 'active' : ''}`}
                                    onClick={() => setActiveCountry(c.name)}
                                >
                                    <div className={styles['ww-flag-circle']}>
                                        {c.flag ? (
                                            <img src={getFlagUrl(c.flag)} alt={c.name} />
                                        ) : (
                                            <span className={styles['ww-global-icon']}>{c.icon}</span>
                                        )}
                                    </div>
                                    <span>{c.name}</span>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    {countries.length > 5 && (
                        <button className={`ww-country-nav-btn next ${styles['ww-country-nav-btn']} ${styles['next']}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Global Industry Hubs Section */}
            {dynamicHubs.length > 0 && (
                <div className={styles['ww-section'] + " " + styles['container']}>
                    <h2 className={styles['ww-section-title']}>{activeCountry !== 'All' ? `${activeCountry} ${t('industry_hubs')}` : `Global ${t('industry_hubs')}`}</h2>
                    <div className={styles['ww-hubs-swiper-wrapper']}>
                        {dynamicHubs.length > 3 && (
                            <button className={`ww-hub-nav-btn prev ${styles['ww-hub-nav-btn']} ${styles['prev']}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                        )}

                        <Swiper
                            key={dynamicHubs.length} // Force re-mount when data arrives to bind navigation
                            modules={[Navigation]}
                            loop={dynamicHubs.length > 4}
                            spaceBetween={20}
                            slidesPerView={'auto'}
                            navigation={{
                                prevEl: '.ww-hub-nav-btn.prev',
                                nextEl: '.ww-hub-nav-btn.next',
                            }}
                            observer={true}
                            observeParents={true}
                            className={styles['ww-hubs-swiper']}
                        >
                            {dynamicHubs.map((hub, idx) => (
                                <SwiperSlide key={idx} className={styles['ww-hub-slide']}>
                                    <div className={styles['ww-hub-card']}>
                                        <div className={styles['ww-hub-main-box']}>
                                            <img src={getImgUrl(hub.image)} alt={hub.title} className={styles['ww-hub-bg']} />
                                            <div className={styles['ww-hub-overlay']}>
                                                <div className={styles['ww-hub-region']}>
                                                    {hub.flag !== 'us' && <img src={getFlagUrl(hub.flag)} alt={hub.country} />}
                                                    <span>{hub.country}</span>
                                                </div>
                                                <h3 className={styles['ww-hub-title']}>{hub.title}</h3>
                                                <p className={styles['ww-hub-desc']}>{hub.desc}</p>
                                            </div>
                                        </div>
                                        <div className={styles['ww-hub-side-images']}>
                                            {[hub.sideProduct1, hub.sideProduct2].map((prod, pIdx) => (
                                                prod ? (
                                                    <Link key={pIdx} href={`/product/${prod.slug || prod._id}`} className={styles['ww-hub-side-box']} style={{ textDecoration: 'none' }}>
                                                        <img src={getImgUrl(prod.main_image || prod.images?.[0])} alt="" />
                                                    </Link>
                                                ) : hub.sideImages?.[pIdx] ? (
                                                    <div key={pIdx} className={styles['ww-hub-side-box']}>
                                                        <img src={getImgUrl(hub.sideImages[pIdx])} alt="" />
                                                    </div>
                                                ) : (
                                                    <div key={pIdx} className={styles['ww-hub-side-box'] + " " + styles['ww-empty-side']}>
                                                        <span>100 × 150</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>

                        {dynamicHubs.length > 3 && (
                            <button className={`ww-hub-nav-btn next ${styles['ww-hub-nav-btn']} ${styles['next']}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            )}



            {/* 4. Product Inspiration Section (Unified Grid) */}
            {!loading && products.length > 0 && (
                <div className={styles['ww-section'] + " " + styles['container']} style={{ marginTop: '60px' }}>
                    <h2 className={styles['ww-section-title']}>{t('product_inspiration')}</h2>
                    <div className={styles['ww-inspiration-grid']}>
                        {products.map(product => (
                            <Link key={product._id} href={`/product/${product.slug || product._id}`} className={styles['ww-insp-card']}>
                                <div className={styles['ww-insp-img-box']}>
                                    <img src={getImgUrl(product.main_image || product.images?.[0])} alt={product.name} />
                                </div>
                                <div className={styles['ww-insp-info']}>
                                    <h5 className={styles['ww-insp-name']}>{product.name}</h5>
                                    <p className={styles['ww-insp-price']}>
                                        {product.price_tiers && product.price_tiers.length > 1 ? (
                                            `${convertPrice(Math.min(...product.price_tiers.map((t: any) => t.price))).formatted} - ${convertPrice(Math.max(...product.price_tiers.map((t: any) => t.price))).formatted}`
                                        ) : (
                                            convertPrice(product.main_price).formatted
                                        )}
                                    </p>
                                    {siteSettings?.rfq_enabled !== false && <p className={styles['ww-insp-moq']}>MOQ: {product.moq} {product.moq > 1 ? 'units' : 'unit'}</p>}
                                    <div className={styles['ww-insp-supplier']}>
                                        <span>1 yr · </span>
                                        {product.supplier_info?.country_code && (
                                            <img src={getFlagUrl(product.supplier_info.country_code)} alt="" />
                                        )}
                                        <span> {product.supplier_info?.country_code || 'IN'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Worldwide;
