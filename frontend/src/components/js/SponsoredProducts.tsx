'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './SponsoredProducts.module.css';

const SponsoredProducts = ({ config }: { config?: any }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { convertPrice, selectedCountry, siteSettings } = useAuth();

    useEffect(() => {
        const fetchSponsored = async () => {
            try {
                const res = await api.get(`/ads/public/sponsored?t=${Date.now()}`);
                setProducts(res.data || []);
            } catch (err) {
                console.error('Error fetching sponsored products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSponsored();
    }, [selectedCountry]);

    const handleAdClick = (adCampaignId: string) => {
        if (adCampaignId) {
            api.post(`/ads/click/${adCampaignId}`).catch(err => {
                console.error('Error tracking ad click:', err);
            });
        }
    };

    if (!loading && products.length === 0) return null;

    return (
        <section className={`${styles.sponsoredSection} container`}>
            <div className={styles.sponsoredInner}>
                <div className={styles.sponsoredCard_wrapper}>
                    {/* Header */}
                    <div className={styles.sponsoredHeader}>
                        <div className={styles.sponsoredTitleGroup}>
                            <div className={styles.sponsoredEyebrow}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Promoted
                            </div>
                            <h2 className={styles.sponsoredTitle}>Sponsored Products</h2>
                            <p className={styles.sponsoredSubtitle}>Premium recommendations from verified industry supplier campaigns</p>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className={styles.sponsoredGrid}>
                        {loading
                            ? Array(5).fill(0).map((_, i) => (
                                <div key={i} className={`${styles.sponsoredCard} ${styles.skeleton}`}>
                                    <div className={styles.skeletonImg} />
                                    <div className={styles.skeletonBody}>
                                        <div className={styles.skeletonLine} style={{ width: '70%', height: '11px' }} />
                                        <div className={styles.skeletonLine} style={{ width: '45%', height: '10px' }} />
                                    </div>
                                </div>
                            ))
                            : products.map((product) => {
                                const priceStr =
                                    product.price_tiers?.length > 0
                                        ? convertPrice(product.price_tiers[0].price).formatted
                                        : convertPrice(product.main_price || 0).formatted;

                                return (
                                    <Link
                                        key={product._id}
                                        href={`/product/${product.slug || product._id}`}
                                        className={styles.sponsoredCard}
                                        onClick={() => handleAdClick(product.adCampaignId)}
                                    >
                                        <div className={styles.sponsoredBadge}>
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                            Sponsored
                                        </div>
                                        <div className={styles.imgWrapper}>
                                            <img
                                                src={getImgUrl(product.images?.[0] || product.main_image)}
                                                alt={product.name}
                                                className={styles.productImg}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <p className={styles.productName}>{product.name}</p>
                                            <div className={styles.priceRow}>
                                                <span className={styles.price}>{priceStr}</span>
                                                {siteSettings?.rfq_enabled !== false && (
                                                    <span className={styles.moq}>MOQ: {product.moq || 1}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SponsoredProducts;
