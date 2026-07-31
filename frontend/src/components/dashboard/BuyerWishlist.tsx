import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWishlist, toggleWishlist } from '@/services/userApi';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './BuyerWishlist.module.css';

const BuyerWishlist = () => {
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<any>(null);
    const { convertPrice, siteSettings } = useAuth();
    const isB2C = siteSettings?.rfq_enabled === false;


    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            const { data } = await getWishlist();
            const formatted = data.map((item: any) => ({
                wishlist_id: item._id,
                ...(item.product_id || {})
            }));
            setWishlist(formatted);
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (productId: any) => {
        setRemoving(productId);
        try {
            await toggleWishlist(productId);
            setWishlist(prev => prev.filter(p => p._id !== productId));
        } catch (error) {
            console.error('Failed to remove from wishlist:', error);
        } finally {
            setRemoving(null);
        }
    };

    if (loading) {
        return (
            <div className={styles['wl-skeleton-grid']}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={styles['wl-skeleton-card']}>
                        <div className={styles['wl-skeleton-img']}></div>
                        <div className={styles['wl-skeleton-line'] + " " + styles['wl-skeleton-title']}></div>
                        <div className={styles['wl-skeleton-line'] + " " + styles['wl-skeleton-price']}></div>
                        <div className={styles['wl-skeleton-line'] + " " + styles['wl-skeleton-moq']}></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles['wl-container']}>
            <div className={styles['wl-header']}>
                <h2 className={styles['wl-page-title']}>
                    My Wishlist
                    <span className={styles['wl-count-badge']}>{wishlist.length}</span>
                </h2>
            </div>

            {wishlist.length === 0 ? (
                <div className={styles['wl-empty-state']}>
                    <div className={styles['wl-empty-icon']}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h3>Your wishlist is empty</h3>
                    <p>Save products you love to view them here anytime.</p>
                    <Link href="/" className={styles['wl-browse-btn']}>Browse Products</Link>
                </div>
            ) : (
                <div className={styles['wl-grid']}>
                    {wishlist.map((product: any) => {
                        const priceInfo = convertPrice(product.main_price);
                        const priceTiers = product.price_tiers;
                        const minPrice = priceTiers && priceTiers.length > 0
                            ? convertPrice(Math.min(...priceTiers.map((t: any) => t.price || product.main_price))).formatted
                            : null;
                        const maxPrice = priceTiers && priceTiers.length > 0
                            ? convertPrice(Math.max(...priceTiers.map((t: any) => t.price || product.main_price))).formatted
                            : null;
                        const displayPrice = minPrice && maxPrice && minPrice !== maxPrice && !isB2C
                            ? `${minPrice} - ${maxPrice}`
                            : priceInfo.formatted;


                        return (
                            <div key={product._id} className={styles['wl-card']}>
                                {/* Image area */}
                                <div className={styles['wl-img-wrapper']}>
                                    <Link href={`/product/${product.slug || product._id}`}>
                                        <img
                                            src={getImgUrl(product.images?.[0] || product.main_image)}
                                            alt={product.name}
                                            className={styles['wl-img']}
                                            onError={(e) => e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image'}
                                        />
                                    </Link>

                                    {/* Heart / Remove button overlay */}
                                    <button
                                        className={`${styles['wl-heart-btn']} ${removing === product._id ? styles['wl-heart-removing'] : ''}`}
                                        onClick={() => handleRemove(product._id)}
                                        title="Remove from wishlist"
                                        disabled={removing === product._id}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>

                                    {/* Quick view icon */}
                                    <Link href={`/product/${product.slug || product._id}`} className={styles['wl-quick-view-btn']} title="View product">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l5 5m-5-5a7 7 0 10-9.9-9.9 7 7 0 009.9 9.9z" />
                                        </svg>
                                    </Link>
                                </div>

                                {/* Product Info */}
                                <div className={styles['wl-info']}>
                                    <Link href={`/product/${product.slug || product._id}`} className={styles['wl-product-name']}>
                                        {product.name}
                                    </Link>
                                    <div className={styles['wl-price']}>{displayPrice}</div>
                                    {!isB2C && <div className={styles['wl-moq']}>Min. order: {product.moq || 1} {product.unit ? product.unit.toLowerCase() : 'piece'}{(product.moq || 1) > 1 ? 's' : ''}</div>}

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BuyerWishlist;
