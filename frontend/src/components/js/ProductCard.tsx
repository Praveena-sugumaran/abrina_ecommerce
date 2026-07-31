'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import { toggleWishlist } from '@/services/wishlistApi';
import styles from './ProductCard.module.css';

interface ProductCardProps {
    product: any;
    onQuickView?: (product: any) => void;
    rank?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, rank }) => {
    const { convertPrice, user, openLogin, siteSettings } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(() => {
        return user?.wishlist?.includes(product._id) || false;
    });
    const [wishlistLoading, setWishlistLoading] = useState(false);

    React.useEffect(() => {
        if (user && user.wishlist) {
            setIsWishlisted(user.wishlist.includes(product._id));
        } else {
            setIsWishlisted(false);
        }
    }, [user, product._id]);

    const mainImage = product.images?.[0] || product.main_image || '';
    const ratingValue = typeof product.rating === 'number' ? product.rating : 5;
    const ratingCount = typeof product.numReviews === 'number' ? product.numReviews : 0;
    const soldCount = typeof product.numOrders === 'number' ? product.numOrders : 0;

    // Calculate discount percent dynamically based on price tiers or main price
    const originalPrice = product.oldPrice || product.price_tiers?.[0]?.oldPrice || (product.main_price ? Math.round(product.main_price * 1.4) : null);
    const currentPrice = product.main_price || product.price_tiers?.[0]?.price || product.price || 0;
    const discountPct = originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : null;

    const handleWishlistClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            openLogin();
            return;
        }
        if (wishlistLoading) return;
        setWishlistLoading(true);
        try {
            const { data } = await toggleWishlist(product._id);
            setIsWishlisted(data.isLiked);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('wishlistUpdated'));
            }
        } catch (err) {
            console.error('Error toggling wishlist:', err);
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleQuickViewClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onQuickView) {
            onQuickView(product);
        }
    };

    const formattedPrice = convertPrice ? convertPrice(currentPrice).formatted : `$${currentPrice}`;
    const formattedOldPrice = originalPrice && convertPrice ? convertPrice(originalPrice).formatted : originalPrice ? `$${originalPrice}` : null;

    return (
        <div className={styles.productCard}>
            {/* Rank Badge */}
            {rank !== undefined && (
                <div className={`${styles.rankBadge} ${styles[`rank-${rank}`]}`}>
                    #{rank}
                </div>
            )}

            {/* Image Wrap */}
            <div className={styles.imgContainer}>
                <Link href={`/product/${product.slug || product._id}`} className={styles.imgLink}>
                    <img
                        src={getImgUrl(mainImage)}
                        alt={product.name}
                        className={styles.productImg}
                        loading="lazy"
                        onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/300x300?text=' + encodeURIComponent(product.name || 'Product');
                        }}
                    />
                </Link>

                {/* Discount Badge */}
                {discountPct && discountPct > 0 && (
                    <div className={`${styles.discountBadge} ${rank !== undefined ? styles.hasRank : ''}`}>
                        -{discountPct}%
                    </div>
                )}

                {/* Wishlist Button */}
                <button
                    className={`${styles.wishlistBtn} ${isWishlisted ? styles.active : ''}`}
                    onClick={handleWishlistClick}
                    disabled={wishlistLoading}
                    aria-label="Add to wishlist"
                >
                    <svg width="15" height="15" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

                {/* Quick View overlay */}
                {onQuickView && (
                    <button
                        className={styles.quickViewBtn}
                        onClick={handleQuickViewClick}
                        aria-label="Quick view"
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Quick View
                    </button>
                )}
            </div>

            {/* Info Section */}
            <div className={styles.infoContainer}>
                <Link href={`/product/${product.slug || product._id}`} className={styles.titleLink}>
                    <h4 className={styles.productName} title={product.name}>
                        {product.name}
                    </h4>
                </Link>

                {/* Rating Row */}
                <div className={styles.ratingRow}>
                    <div className={styles.stars}>
                        {Array(5).fill(0).map((_, i) => (
                            <span key={i} className={i < Math.round(ratingValue) ? styles.starFilled : styles.starEmpty}>★</span>
                        ))}
                    </div>
                    <span className={styles.ratingCount}>({ratingCount})</span>
                </div>

                {/* Price and Sold stats */}
                <div className={styles.priceRow}>
                    <div className={styles.prices}>
                        <span className={styles.currentPrice}>{formattedPrice}</span>
                        {formattedOldPrice && (
                            <span className={styles.oldPrice}>{formattedOldPrice}</span>
                        )}
                    </div>
                    <span className={styles.soldLabel}>{soldCount >= 1000 ? `${(soldCount/1000).toFixed(1)}k` : soldCount} sold</span>
                </div>

                {/* MOQ Tag */}
                {siteSettings?.rfq_enabled !== false && product.moq && product.moq > 1 && (
                    <div className={styles.moqRow}>
                        <span>MOQ: {product.moq} pieces</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
