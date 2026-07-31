'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import styles from './Search.module.css';
import { toggleWishlist } from '@/services/wishlistApi';

import { getImgUrl } from '@/utils/imageConfig';
const LIMIT = 20;

// ─── Star Rating ───────────────────────────────────────────────
interface StarRatingProps {
    rating: number;
    size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 12 }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const fill = Math.min(1, Math.max(0, rating - (i - 1)));
        stars.push(<span key={i} className={styles['sr-star']} style={{ fontSize: size }}>{fill >= 1 ? '★' : fill > 0 ? '⭒' : '☆'}</span>);
    }
    return <span className={styles['sr-stars']}>{stars}</span>;
};

interface SupplierBadgeProps {
    supplierObj: any;
    showText?: boolean;
}

const SupplierBadge: React.FC<SupplierBadgeProps> = ({ supplierObj, showText = false }) => {
    if (!supplierObj) return null;
    const planInfo = supplierObj.user_id?.subscription_plan || supplierObj.subscription_plan_info || supplierObj.subscription_plan;
    const isVerified = supplierObj.is_verified || supplierObj.verification_status === 'verified' || supplierObj.user_id?.is_verified;
    const isPlanVerified = !!(planInfo?.has_verified_badge && isVerified);
    const bColor = planInfo?.badge_color || '#d97706';

    if (isPlanVerified) {
        return (
            <span className={styles['sr-verified-text-badge'] + " " + styles['fs-pro']} style={{ color: bColor, padding: '2px 4px', background: `${bColor}22`, borderRadius: '4px', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', textTransform: 'uppercase', lineHeight: 1 }}>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                VERIFIED PRO
            </span>
        );
    } else if (isVerified) {
        return (
            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', padding: showText ? '2px 0' : 0 }}>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                {showText && 'VERIFIED'}
            </span>
        );
    }
    return null;
};

interface SkeletonCardProps {
    viewMode?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode }) => (
    <div className={`${styles['sr-card-skeleton']} ${viewMode === 'list' ? styles['sr-list-skeleton'] : ''}`}>
        <div className={styles['sr-skel-img']} />
        <div className={styles['sr-skel-body']}>
            <div className={styles['sr-skel-line'] + " " + styles['w80']} />
            <div className={styles['sr-skel-line'] + " " + styles['w50']} />
            <div className={styles['sr-skel-line'] + " " + styles['w60']} />
            <div className={styles['sr-skel-line'] + " " + styles['w40']} />
        </div>
    </div>
);

interface ProductCardProps {
    product: any;
    convertPrice: (price: number) => { amount: string; symbol: string; formatted: string };
    isImageSearch?: boolean;
    onInquiry: (e: React.MouseEvent, product: any) => void;
    viewMode?: string;
    isCompared?: boolean;
    onCompareToggle?: (product: any) => void;
    isWishlisted?: boolean;
    onWishlistToggle?: (e: React.MouseEvent, product: any) => void;
}

const getProductSlug = (prod: any) => {
    if (prod?.slug) return prod.slug;
    if (prod?.name) {
        return prod.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    return prod?._id || '';
};

const ProductCard: React.FC<ProductCardProps> = ({ product, convertPrice, isImageSearch, onInquiry, viewMode, isCompared, onCompareToggle, isWishlisted, onWishlistToggle }) => {
    const { t, siteSettings } = useAuth();
    const basePrice = product.main_price || product.price_tiers?.[0]?.price || 0;
    const price = convertPrice(basePrice);
    const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
    const supplierObj = product.supplier_info || product.supplier;
    const reviewCount = product.num_reviews || product.numReviews || 0;
    const soldCount = product.sold_count || ((product._id?.charCodeAt(0) || 0) % 250 + 12) * 3;

    const handleAdClick = () => {
        if (product.isSponsored && product.adCampaignId) {
            api.post(`/ads/click/${product.adCampaignId}`).catch(err => {
                console.error('Error tracking ad click:', err);
            });
        }
    };

    if (viewMode === 'list') {
        return (
            <div className={`${styles['sr-list-item']} ${styles['alibaba-list-style']} ${product.isFeatured ? styles['sr-featured-list-item'] : ''}`}>
                {product.isFeatured && (
                    <div className={styles['sr-featured-list-badge']}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        Featured
                    </div>
                )}
                <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-list-img']} onClick={handleAdClick}>
                    {imgUrl ? <img src={imgUrl} alt={product.name} loading="lazy" /> : <div className={styles['sr-card-img-placeholder']}><svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></div>}
                    {(product.isSponsored || product.isPromoted || product.ppc_bid > 0) && (
                        <div className={styles['sr-ad-badge'] + " " + styles['list-ad']}>
                            {product.isSponsored ? 'Sponsored' : 'Ad'}
                        </div>
                    )}
                </Link>
                <div className={styles['sr-list-content']}>
                    <div className={styles['sr-list-main']}>
                        <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-list-title']} onClick={handleAdClick}>{product.name}</Link>
                        {product.key_attributes && product.key_attributes.length > 0 && (
                            <div className={styles['sr-list-attributes']}>
                                {product.key_attributes.slice(0, 3).map((attr: any, i: number) => (
                                    <span key={i} className={styles['sr-list-attr-pill']} title={`${attr.name}: ${attr.value}`}>{attr.value}</span>
                                ))}
                            </div>
                        )}
                        <div className={styles['sr-card-rating'] + " " + styles['style-list']}>
                            <StarRating rating={product.rating || 4.5} />
                            <span className={styles['sr-rating-val']}>{(product.rating || 4.5).toFixed(1)}</span>
                            {reviewCount > 0 && <span className={styles['sr-reviews-count']}>({reviewCount} reviews)</span>}
                        </div>
                        {supplierObj?.company_name && (
                            <div className={styles['sr-list-supplier-box']}>
                                <div className={styles['sr-card-supplier']}>
                                    <div className={styles['sr-supplier-left']}>
                                        <SupplierBadge supplierObj={supplierObj} />
                                        <Link href={`/supplier/${supplierObj._id}`} className={styles['sr-supplier-name'] + " " + styles['list-hover']}>{supplierObj.company_name}</Link>
                                    </div>
                                    <div className={styles['sr-supplier-tags']}>
                                        {supplierObj.country_code && <span className={styles['sr-supplier-country']}>
                                            <img src={`https://flagcdn.com/16x12/${supplierObj.country_code.toLowerCase()}.png`} alt={supplierObj.country_code} className={styles['sr-list-flag']} />
                                            {supplierObj.country_code}
                                        </span>}
                                        {supplierObj.years_experience && <span className={styles['sr-supplier-exp']}>{supplierObj.years_experience} yrs</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles['sr-list-right']}>
                        <div className={styles['sr-list-price-block']}>
                            <div className={styles['sr-card-price-row']}>
                                <span className={styles['sr-card-price']}>{price.formatted}</span>
                                <span className={styles['sr-card-unit']}>/ {product.unit || 'piece'}</span>
                            </div>
                            {siteSettings?.rfq_enabled !== false && product.moq && <div className={styles['sr-list-moq']}>{t('min_order_label') || 'Min. order'}: <strong>{product.moq}</strong> {product.unit || 'pieces'}</div>}
                        </div>
                        <div className={styles['sr-list-right-bottom']}>
                            {product.sample_available && (
                                <div className={styles['sr-list-sample-tag']}>Sample Available</div>
                            )}
                            <div className={styles['sr-list-actions-group']}>
                                <div className={styles['sr-compare-list-wrapper']}>
                                    <button 
                                        className={`${styles['sr-compare-list-btn']} ${isCompared ? styles['checked'] : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onCompareToggle?.(product);
                                        }}
                                        title={isCompared ? 'Remove from compare' : 'Add to compare'}
                                    >
                                        {isCompared ? (
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        ) : (
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4M8 13l-4 4 4 4M20 7H4M4 17h16"/></svg>
                                        )}
                                        {isCompared ? 'Compared' : 'Compare'}
                                    </button>
                                </div>
                                <button className={styles['sr-list-btn'] + " " + styles['primary-v2']} onClick={(e) => onInquiry(e, product)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>
                                    {t('contact_supplier') || 'Contact Supplier'}
                                </button>
                                <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-list-btn'] + " " + styles['secondary']} onClick={handleAdClick}>
                                    {t('view_details') || 'View Details'}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles['sr-product-card']} ${product.isFeatured ? styles['sr-featured-card'] : ''}`}>
            {/* Wishlist heart – top right */}
            <button
                className={`${styles['sr-card-wishlist-btn']} ${isWishlisted ? styles['wishlisted'] : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlistToggle?.(e, product); }}
                title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    fill={isWishlisted ? '#f43f5e' : 'none'}
                    stroke={isWishlisted ? '#f43f5e' : 'currentColor'}
                >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>

            {(product.isFeatured || product.isSponsored || product.isPromoted || product.ppc_bid > 0) && (
                <div className={styles['sr-badge-container']}>
                    {product.isFeatured && (
                        <div className={styles['sr-featured-badge-new']}>
                            ★ Featured
                        </div>
                    )}
                    {(product.isSponsored || product.isPromoted || product.ppc_bid > 0) && (
                        <div className={styles['sr-ad-badge-new']}>
                            Ad
                        </div>
                    )}
                </div>
            )}
            <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-card-img-link']} onClick={handleAdClick}>
                <div className={styles['sr-card-img-wrap']}>
                    {imgUrl ? <img src={imgUrl} alt={product.name} loading="lazy" /> : <div className={styles['sr-card-img-placeholder']}><svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></div>}
                </div>
            </Link>
            <div className={styles['sr-card-body']}>
                <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-card-title-link']} onClick={handleAdClick}>
                    <h3 className={styles['sr-card-title']}>{product.name}</h3>
                </Link>
                <div className={styles['sr-card-price-row']}>
                    <span className={styles['sr-card-price']}>{price.formatted}</span>
                    <span className={styles['sr-card-unit']}>/ {product.unit || 'piece'}</span>
                </div>
                
                <div className={styles['sr-card-stats-row-new']}>
                    <span className={styles['sr-card-rating-star-new']}>
                        <span className={styles['sr-card-star-gold']}>★</span>
                        {(product.rating || (3.5 + (product._id?.charCodeAt(0) || 0) % 15 * 0.1)).toFixed(1)}
                    </span>
                    <span className={styles['sr-card-sold-count-new']}>{soldCount} sold</span>
                </div>

                {product.free_shipping !== false && (
                    <div className={styles['sr-card-tags-row-new']}>
                        <span className={styles['sr-card-tag-free']}>Free shipping</span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface WorldwideCardProps {
    product: any;
    convertPrice: (price: number) => { amount: string; symbol: string; formatted: string };
    onInquiry: (e: React.MouseEvent, product: any) => void;
    isCompared?: boolean;
    onCompareToggle?: (product: any) => void;
    isWishlisted?: boolean;
    onWishlistToggle?: (e: React.MouseEvent, product: any) => void;
}

const WorldwideCard: React.FC<WorldwideCardProps> = ({ product, convertPrice, onInquiry, isCompared, onCompareToggle, isWishlisted, onWishlistToggle }) => {
    const { t, siteSettings } = useAuth();
    const basePrice = product.main_price || product.price_tiers?.[0]?.price || 0;
    const price = convertPrice(basePrice);
    const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
    const supplierObj = product.supplier_info || product.supplier;
    const reviewCount = product.num_reviews || product.numReviews || 0;

    const handleAdClick = () => {
        if (product.isSponsored && product.adCampaignId) {
            api.post(`/ads/click/${product.adCampaignId}`).catch(err => {
                console.error('Error tracking ad click:', err);
            });
        }
    };

    return (
        <div className={styles['sr-ww-card']} style={{ position: 'relative' }}>
            {/* Compare toggle – icon only */}
            <label 
                className={`${styles['sr-compare-checkbox-label']} ${isCompared ? styles['checked'] : ''}`}
                title={isCompared ? 'Remove from compare' : 'Add to compare'}
                onClick={(e) => { e.stopPropagation(); }}
            >
                <input 
                    type="checkbox" 
                    checked={isCompared || false} 
                    onChange={(e) => { e.stopPropagation(); onCompareToggle?.(product); }} 
                />
                {isCompared ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4M8 13l-4 4 4 4M20 7H4M4 17h16"/></svg>
                )}
            </label>
            {/* Wishlist heart – top right */}
            <button
                className={`${styles['sr-card-wishlist-btn']} ${isWishlisted ? styles['wishlisted'] : ''}`}
                onClick={(e) => onWishlistToggle?.(e, product)}
                title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                style={{ top: '8px', right: '8px' }}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    fill={isWishlisted ? '#f43f5e' : 'none'}
                    stroke={isWishlisted ? '#f43f5e' : 'currentColor'}
                >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
            <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-ww-img-link']} onClick={handleAdClick}>
                <div className={styles['sr-ww-img-wrap']}>
                    {imgUrl
                        ? <img src={imgUrl} alt={product.name} loading="lazy" />
                        : <div className={styles['sr-card-img-placeholder']}><svg width="32" height="32" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></div>
                    }
                    <div className={styles['sr-ww-badge-overlay']}>
                        {product.is_fast_shipping && <span className={styles['sr-ww-shipping-badge']}>Fast Shipping</span>}
                        {(product.isSponsored || product.isPromoted || product.ppc_bid > 0) && (
                            <span className={styles['sr-ad-badge']} style={{ position: 'static', display: 'inline-block', color: '#000', backgroundColor: 'rgba(255, 255, 255, 0.92)' }}>
                                {product.isSponsored ? 'Sponsored' : 'Ad'}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
            <div className={styles['sr-ww-body']}>
                <Link href={`/product/${getProductSlug(product)}`} className={styles['sr-ww-title']} onClick={handleAdClick}>{product.name}</Link>
                <div className={styles['sr-ww-price']}>{price.formatted} <span className={styles['sr-card-unit']}>/ {product.unit || 'pc'}</span></div>

                <div className={styles['sr-ww-meta-row']}>
                    {siteSettings?.rfq_enabled !== false && product.moq && <span className={styles['sr-ww-moq']}>{t('moq') || 'MOQ'}: {product.moq}</span>}
                    <div className={styles['sr-ww-rating']}>
                        <span className={styles['sr-ww-star']}>★</span>
                        <span>{product.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                </div>

                {supplierObj?.company_name && (
                    <div className={styles['sr-ww-supplier']}>
                        <div className={styles['sr-ww-sup-main']}>
                            <SupplierBadge supplierObj={supplierObj} />
                            <span className={styles['sr-ww-sup-name']}>{supplierObj.company_name}</span>
                        </div>
                        {supplierObj.country_code && <span className={styles['sr-ww-country']}>{supplierObj.country_code}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Supplier Card ─────────────────────────────────────────────
interface SupplierCardProps {
    supplier: any;
    convertPrice: (price: number) => { amount: string; symbol: string; formatted: string };
    onInquiry: (e: React.MouseEvent, product: any) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, convertPrice, onInquiry }) => {
    const { t } = useAuth();
    const displayProducts = supplier.products?.length > 0 ? supplier.products : [];
    const seed = supplier._id?.charCodeAt(0) || 12;
    const stats = {
        onTime: 90 + (seed % 10),
        reorder: 15 + (seed % 20),
        responseTime: seed % 4 + 1,
        revenue: (seed * 1.5).toFixed(1) + 'M+'
    };

    let yrsDisplay = 'New';
    if (supplier.createdAt) {
        const d = new Date(supplier.createdAt);
        const n = new Date();
        if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()) {
            yrsDisplay = 'New';
        } else {
            yrsDisplay = Math.max(1, n.getFullYear() - d.getFullYear()) + ' Yrs';
        }
    } else {
        yrsDisplay = (seed % 15 + 1) + ' Yrs';
    }
    const supplierId = supplier.user_id?._id || supplier.user_id;

    return (
        <div className={styles['sr-supplier-premium-card']}>
            <div className={styles['sr-spc-header']}>
                <div className={styles['sr-spc-main-info']}>
                    <div className={styles['sr-spc-logo']}>
                        {supplier.logo ? <img src={getImgUrl(supplier.logo)} alt="" /> : (supplier.company_name?.charAt(0) || 'S')}
                    </div>
                    <div className={styles['sr-spc-text']}>
                        <Link href={`/supplier/${supplierId}`} className={styles['sr-spc-name']}>
                            {supplier.company_name}
                        </Link>
                        <div className={styles['sr-spc-meta']}>
                            <span className={styles['sr-spc-loc']}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                {supplier.city || 'City'}, {supplier.country || 'Country'}
                            </span>
                            {supplier.business_type && <span className={styles['sr-spc-type']}>{supplier.business_type}</span>}
                            <span className={styles['sr-spc-rating']}>
                                <StarRating rating={supplier.avgRating || 4.5} size={11} />
                                {supplier.avgRating?.toFixed(1) || '4.5'}/5 ({supplier.reviewCount || (seed % 50 + 10)} reviews)
                            </span>
                        </div>
                        <div className={styles['sr-spc-badges']}>
                            <SupplierBadge supplierObj={supplier} showText={true} />
                            <span className={styles['sr-spc-badge']}>{yrsDisplay}</span>
                            {supplier.staff_size && <span className={styles['sr-spc-badge']}>{supplier.staff_size} staff</span>}
                            {supplier.factory_area && <span className={styles['sr-spc-badge']}>{supplier.factory_area} m²</span>}
                            {supplier.annual_revenue && <span className={styles['sr-spc-badge'] + " " + styles['b']}>{supplier.annual_revenue} revenue</span>}
                        </div>
                    </div>
                </div>
                <div className={styles['sr-spc-actions']}>
                    <Link href={`/supplier/${supplierId}`} className={styles['sr-spc-btn-dark']}>{t('company_profile') || 'View Profile'}</Link>
                </div>
            </div>

            {(supplier.capabilities?.length > 0 || supplier.certifications?.length > 0) && (
                <div className={styles['sr-spc-tags']}>
                    {(supplier.capabilities || []).map((cap: string) => <span key={cap} className={styles['sr-spc-tag']}>{cap}</span>)}
                    {(supplier.certifications || []).map((cert: string) => <span key={cert} className={styles['sr-spc-tag'] + " " + styles['cert']}>{cert}</span>)}
                </div>
            )}

            <div className={styles['sr-spc-body']}>
                <div className={styles['sr-spc-stats']}>
                    <div className={styles['sr-spc-stat']}>
                        <label>On-time delivery</label>
                        <strong>{stats.onTime}%</strong>
                    </div>
                    <div className={styles['sr-spc-stat']}>
                        <label>Reorder rate</label>
                        <strong>{stats.reorder}%</strong>
                    </div>
                    <div className={styles['sr-spc-stat']}>
                        <label>Response time</label>
                        <strong>≤{stats.responseTime}h</strong>
                    </div>
                    <div className={styles['sr-spc-stat']}>
                        <label>Online revenue</label>
                        <strong>₹{stats.revenue}</strong>
                    </div>
                </div>

                <div className={styles['sr-spc-gallery']}>
                    {displayProducts.slice(0, 4).map((prod: any, idx: number) => (
                        <Link key={idx} href={`/product/${getProductSlug(prod)}`} className={styles['sr-spc-gallery-item']} style={{ position: 'relative' }}>
                            <img src={getImgUrl(prod.images?.[0] || prod.main_image)} alt="" />
                            <div className={styles['sr-spc-gallery-price']}>
                                {convertPrice(prod.main_price).formatted}
                            </div>
                        </Link>
                    ))}
                    {displayProducts.length > 0 && (
                        <div className={styles['sr-spc-gallery-main']}>
                            <img src={getImgUrl(displayProducts[0]?.images?.[0] || displayProducts[0]?.main_image)} alt="" />
                            <div className={styles['sr-spc-gallery-play']}><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8 5v14l11-7z" /></svg></div>
                        </div>
                    )}
                </div>
            </div>

            {supplier.description && (
                <div className={styles['sr-spc-desc']}>
                    {supplier.description.length > 180 ? supplier.description.substring(0, 180) + '...' : supplier.description}
                </div>
            )}
            <div className={styles['sr-spc-footer']}>
                <svg width="12" height="12" fill="#f59e0b" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                Top sponsor listing
            </div>
        </div>
    );
};

// ─── Main Search Page ──────────────────────────────────────────
const Search = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<string>('grid'); // Default server state
    const [products, setProducts] = useState<any[]>([]);
    const [comparedProducts, setComparedProducts] = useState<any[]>([]);
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

    const handleCompareToggle = (product: any) => {
        setComparedProducts(prev => {
            const alreadyIn = prev.some(p => p._id === product._id);
            if (alreadyIn) return prev.filter(p => p._id !== product._id);
            if (prev.length >= 5) return prev; // max 5 items
            return [...prev, product];
        });
    };

    const isProductCompared = (product: any) => comparedProducts.some(p => p._id === product._id);

    const handleWishlistToggle = async (e: React.MouseEvent, product: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { openLogin(); return; }
        const id = product._id;
        setWishlistedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        try {
            await toggleWishlist(id);
        } catch {
            setWishlistedIds(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
            });
        }
    };

    const isWishlisted = (product: any) => wishlistedIds.has(product._id);

    // Hydration-safe localStorage retrieval
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedMode = localStorage.getItem('search_view_mode');
            if (savedMode) setViewMode(savedMode);
        }
    }, []);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [wwProducts, setWwProducts] = useState<any[]>([]);
    const [wwAttributes, setWwAttributes] = useState<any[]>([]);
    const [wwQuickFilters, setWwQuickFilters] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
    const [categoryCustomFields, setCategoryCustomFields] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [dynamicCountries, setDynamicCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeQuickFilter, setActiveQuickFilter] = useState('');
    const [activeAttr, setActiveAttr] = useState('');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };
    const isSectionOpen = (key: string, defaultOpen = true) =>
        collapsedSections[key] === undefined ? defaultOpen : !collapsedSections[key];
    const { user, openLogin, convertPrice, siteSettings, selectedCountry, t } = useAuth();
    const { openChat } = useChat();
    const location = usePathname();

    // URL-derived state
    const keyword = searchParams?.get('keyword') || '';
    const sortBy = searchParams?.get('sort_by') || '';
    const currentPage = parseInt(searchParams?.get('page') || '1');
    const isImageSearch = searchParams?.get('is_image_search') === 'true';
    const tab = searchParams?.get('tab') || 'products';

    const handleViewMode = (mode: string) => {
        setViewMode(mode);
        localStorage.setItem('search_view_mode', mode);
    };

    const setSearchParams = (params: URLSearchParams) => {
        router.push(`${location}?${params.toString()}`, { scroll: false });
    };

    const [localMinPrice, setLocalMinPrice] = useState(searchParams?.get('min_price') || '');
    const [localMaxPrice, setLocalMaxPrice] = useState(searchParams?.get('max_price') || '');
    const [localMoq, setLocalMoq] = useState(searchParams?.get('min_moq') || '');

    const [sidebarKeyword, setSidebarKeyword] = useState(searchParams?.get('keyword') || '');

    useEffect(() => {
        setSidebarKeyword(searchParams?.get('keyword') || '');
    }, [searchParams]);

    const handleSidebarSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const params = new URLSearchParams(searchParams || undefined);
        if (sidebarKeyword.trim()) {
            params.set('keyword', sidebarKeyword.trim());
        } else {
            params.delete('keyword');
        }
        params.set('page', '1');
        setSearchParams(params);
    };

    const getCategoryProductCount = (cat: any) => {
        if (!cat || !products) return 0;
        const getSubCategoryIds = (cId: string): string[] => {
            const ids = [cId];
            const children = allCategories.filter(c => {
                const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
                return pid === cId;
            });
            children.forEach(child => {
                ids.push(...getSubCategoryIds(child._id));
            });
            return ids;
        };

        const targetIds = getSubCategoryIds(cat._id);
        return products.filter(p => {
            const pCatId = typeof p.category === 'string' ? p.category : (p.category?._id || p.category_id);
            return targetIds.includes(pCatId);
        }).length;
    };

    const renderCategoryTree = () => {
        if (allCategories.length === 0) return null;

        const catId = searchParams?.get('category_id');
        const selectedCat = catId ? allCategories.find(c => c._id === catId || c.slug === catId) : null;

        // Active category path
        const path: any[] = [];
        let cur = selectedCat;
        while (cur) {
            path.unshift(cur);
            const pid = typeof cur.parent === 'string' ? cur.parent : cur.parent?._id;
            cur = pid ? allCategories.find(c => c._id === pid) : null;
        }

        // If no category selected, show root categories
        if (!selectedCat) {
            return (
                <ul className={styles['sf-cat-tree']}>
                    <li className={`${styles['sf-cat-item']} ${styles['sf-cat-all']} ${styles['active']}`}>
                        <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', '')}>
                            All Categories
                        </span>
                    </li>
                    {allCategories.filter(c => !c.parent).map(rootCat => {
                        const count = getCategoryProductCount(rootCat);
                        return (
                            <li key={rootCat._id} className={`${styles['sf-cat-item']} ${styles['depth-1']}`}>
                                <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', rootCat.slug || rootCat._id)}>
                                    {rootCat.title} {count > 0 && <span className={styles['sf-cat-count']}>({count})</span>}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            );
        }

        const rootCat = path[0];

        return (
            <ul className={styles['sf-cat-tree']}>
                <li className={`${styles['sf-cat-item']} ${styles['sf-cat-all']}`}>
                    <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', '')}>
                        All Categories
                    </span>
                </li>

                {/* Level 1: Root Category */}
                <li className={`${styles['sf-cat-item']} ${styles['depth-1']} ${path.length === 1 ? styles['active-parent'] : ''}`}>
                    <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', rootCat.slug || rootCat._id)}>
                        <span className={styles['sf-cat-toggle-icon']}>−</span>
                        {rootCat.title} {getCategoryProductCount(rootCat) > 0 && <span className={styles['sf-cat-count']}>({getCategoryProductCount(rootCat)})</span>}
                    </span>

                    {/* Level 2: Children of Root */}
                    <ul className={styles['sf-cat-sub-tree']}>
                        {allCategories.filter(c => {
                            const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
                            return pid === rootCat._id;
                        }).map(child => {
                            const childCount = getCategoryProductCount(child);
                            const isChildInPath = path.some(p => p._id === child._id);
                            const isChildActive = selectedCat._id === child._id;

                            return (
                                <li key={child._id} className={`${styles['sf-cat-item']} ${styles['depth-2']} ${isChildActive ? styles['active'] : ''}`}>
                                    <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', child.slug || child._id)}>
                                        {isChildInPath && path.length > 2 && <span className={styles['sf-cat-toggle-icon']}>−</span>}
                                        {child.title} {childCount > 0 && <span className={styles['sf-cat-count']}>({childCount})</span>}
                                    </span>

                                    {/* Level 3: Children of child if selected or in path */}
                                    {isChildInPath && path.length > 1 && (
                                        <ul className={styles['sf-cat-sub-tree']}>
                                            {allCategories.filter(c => {
                                                const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
                                                return pid === child._id;
                                            }).map(subChild => {
                                                const subChildCount = getCategoryProductCount(subChild);
                                                const isSubChildActive = selectedCat._id === subChild._id;

                                                return (
                                                    <li key={subChild._id} className={`${styles['sf-cat-item']} ${styles['depth-3']} ${isSubChildActive ? styles['active'] : ''}`}>
                                                        <span className={styles['sf-cat-link']} onClick={() => updateFilter('category_id', subChild.slug || subChild._id)}>
                                                            {subChild.title} {subChildCount > 0 && <span className={styles['sf-cat-count']}>({subChildCount})</span>}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </li>
            </ul>
        );
    };

    // Fetch categories & locations
    useEffect(() => {
        api.get('/categories').then(({ data }) => {
            setAllCategories(data);
            setFilteredCategories(data.filter((c: any) => !c.parent));
        }).catch(() => { });

        api.get('/company/locations').then(({ data }) => {
            setDynamicCountries(data);
        }).catch(() => { });
    }, []);

    // Helper to get breadcrumbs based on selected category
    const getBreadcrumbs = (catIdOrSlug: string | null) => {
        if (!catIdOrSlug || allCategories.length === 0) return [];
        const crumbs: any[] = [];
        const initialCat = allCategories.find(c => c._id === catIdOrSlug || c.slug === catIdOrSlug);
        let curId: string | null = initialCat ? initialCat._id : null;
        while (curId) {
            const cat = allCategories.find(c => c._id === curId);
            if (cat) {
                crumbs.unshift(cat);
                curId = typeof cat.parent === 'string' ? cat.parent : cat.parent?._id;
            } else {
                curId = null;
            }
        }
        return crumbs;
    };

    const breadcrumbs = getBreadcrumbs(searchParams?.get('category_id'));

    // Update related categories from results or selected category depth
    useEffect(() => {
        const catId = searchParams?.get('category_id');

        // PRODUCT-BASED SEARCH (keyword present): Show parent (root) categories
        if (keyword) {
            setFilteredCategories(allCategories.filter(c => !c.parent));
            return;
        }

        // CATEGORY-BASED SEARCH: show subcategories OR hide filter if none exist
        if (catId && allCategories.length > 0) {
            const current = allCategories.find(c => c._id === catId || c.slug === catId);
            if (current) {
                // Look for subcategories
                const children = allCategories.filter(c => {
                    const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
                    return pid === current._id;
                });

                if (children.length > 0) {
                    setFilteredCategories(children);
                    return;
                } else {
                    // IF NO SUBCATEGORY → REMOVE category filter completely from sidebar
                    setFilteredCategories([]);
                    return;
                }
            }
        }

        // Default Fallback or Generic results: show top-level parents
        setFilteredCategories(allCategories.filter(c => !c.parent));
    }, [allCategories, keyword, searchParams?.get('category_id')]);

    // Main fetch
    const fetchResults = useCallback(async () => {
        setLoading(true);
        setError(null);
        const imageFileFromWindow = typeof window !== 'undefined' ? (window as any).imageSearchFile : null;
        try {
            if (isImageSearch && imageFileFromWindow) {
                const formData = new FormData();
                formData.append('image', imageFileFromWindow);
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result);
                reader.readAsDataURL(imageFileFromWindow);
                const { data } = await api.post('/products/search-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setProducts(data.products || []);
                setTotal(data.products?.length || 0);
                setTotalPages(1);
                // Cleanup
                if (typeof window !== 'undefined') (window as any).imageSearchFile = null;
            } else {
                setImagePreview(null);
                const params = {
                    keyword: searchParams?.get('keyword'),
                    category_id: searchParams?.get('category_id'),
                    min_price: searchParams?.get('min_price'),
                    max_price: searchParams?.get('max_price'),
                    min_moq: searchParams?.get('min_moq'),
                    verified_only: searchParams?.get('verified_only'),
                    country: searchParams?.get('country'),
                    certifications: searchParams?.get('certifications'),
                    supplier_type: searchParams?.get('supplier_type'),
                    rating_min: searchParams?.get('rating_min'),
                    capabilities: searchParams?.get('capabilities'),
                    verified_pro: searchParams?.get('verified_pro'),
                    trade_assurance: searchParams?.get('trade_assurance'),
                    moq_under_5: searchParams?.get('moq_under_5'),
                    five_plus_years: searchParams?.get('five_plus_years'),
                    rating_45: searchParams?.get('rating_45'),
                    ce_cert: searchParams?.get('ce_cert'),
                    emc_cert: searchParams?.get('emc_cert'),
                    sort_by: searchParams?.get('sort_by'),
                    section: searchParams?.get('section'),
                    bulk: searchParams?.get('bulk'),
                    sample_available: searchParams?.get('sample_available'),
                    isFeatured: searchParams?.get('isFeatured'),
                    custom_filters: searchParams?.get('custom_filters'),
                    page: searchParams?.get('page') || 1,
                    limit: LIMIT,
                    user_country: selectedCountry || 'IN',
                };

                if (tab === 'suppliers') {
                    const { data } = await api.get('/company/search', { params });
                    setSuppliers(data.companies || []);
                    setTotal(data.total || 0);
                    setTotalPages(data.pages || Math.ceil((data.total || 0) / LIMIT));
                } else if (tab === 'worldwide') {
                    const wwParams = {
                        ...params,
                        attr: activeAttr || undefined,
                        quick_filter: activeQuickFilter || undefined,
                    };
                    const { data } = await api.get('/products/worldwide-search', { params: wwParams });
                    setWwProducts(data.products || []);
                    setTotal(data.total || 0);
                    setTotalPages(data.pages || Math.ceil((data.total || 0) / LIMIT));
                    setWwAttributes(data.attributes || []);
                    setWwQuickFilters(data.quickFilters || []);
                } else {
                    const { data } = await api.get('/products', { params });
                    setProducts(data.products || []);
                    setTotal(data.total || 0);
                    setTotalPages(data.pages || Math.ceil((data.total || 0) / LIMIT));
                }
            }
        } catch (err: any) {
            setError('Failed to load results. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [searchParams, tab, isImageSearch, activeAttr, activeQuickFilter, selectedCountry]);

    useEffect(() => { fetchResults(); }, [fetchResults]);

    useEffect(() => {
        const catId = searchParams?.get('category_id');
        if (!catId) {
            setCategoryCustomFields([]);
            return;
        }
        let resolvedId = catId;
        if (allCategories.length > 0) {
            const matched = allCategories.find(c => c._id === catId || c.slug === catId);
            if (matched) resolvedId = matched._id;
        }
        api.get(`/custom-fields/category/${resolvedId}`)
            .then(({ data }) => {
                const filtered = (data || []).filter((cf: any) => cf.showFilter && cf.status === 'active');
                setCategoryCustomFields(filtered);
            })
            .catch(() => setCategoryCustomFields([]));
    }, [searchParams?.get('category_id'), allCategories]);

    useEffect(() => {
        if (tab !== 'worldwide') { setActiveAttr(''); setActiveQuickFilter(''); }
        if (tab !== 'suppliers') setSuppliers([]);
        if (tab !== 'products') setProducts([]);
    }, [tab]);

    // Custom Dynamic Filters Helpers
    const getActiveCustomFilters = (): Record<string, string> => {
        const raw = searchParams?.get('custom_filters');
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    };

    const isCustomFilterActive = (key: string, value: string): boolean => {
        const filters = getActiveCustomFilters();
        const currentVal = filters[key];
        if (!currentVal) return false;
        const values = currentVal.split(',').map(v => v.trim());
        return values.includes(value);
    };

    const handleCustomFilterToggle = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams || undefined);
        const filters = getActiveCustomFilters();
        const currentVal = filters[key];

        if (currentVal) {
            let values = currentVal.split(',').map(v => v.trim()).filter(Boolean);
            if (values.includes(value)) {
                values = values.filter(v => v !== value);
            } else {
                values.push(value);
            }
            if (values.length > 0) {
                filters[key] = values.join(',');
            } else {
                delete filters[key];
            }
        } else {
            filters[key] = value;
        }

        if (Object.keys(filters).length > 0) {
            p.set('custom_filters', JSON.stringify(filters));
        } else {
            p.delete('custom_filters');
        }

        p.set('page', '1');
        setSearchParams(p);
    };

    // Prevent body scrolling when mobile filter drawer is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    const updateFilter = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams || undefined);

        // Handle Multi-select for certifications/capabilities if needed
        if (['certifications', 'capabilities'].includes(key)) {
            const current = p.get(key)?.split(',').filter(Boolean) || [];
            if (current.includes(value)) {
                const next = current.filter(v => v !== value);
                if (next.length) p.set(key, next.join(',')); else p.delete(key);
            } else {
                p.set(key, [...current, value].join(','));
            }
        } else {
            if (value) p.set(key, value); else p.delete(key);
        }

        p.set('page', '1');
        setSearchParams(p);
    };

    const removeFilter = (key: string, cfKey?: string, cfVal?: string) => {
        if (key === 'all') {
            const kw = searchParams?.get('keyword') || '';
            const t = searchParams?.get('tab') || 'products';
            const newParams: any = { tab: t };
            if (kw) newParams.keyword = kw;
            setSearchParams(new URLSearchParams(newParams));

            // Reset local states
            setLocalMinPrice('');
            setLocalMaxPrice('');
            setLocalMoq('');
        } else if (key.startsWith('cf_') && cfKey && cfVal) {
            handleCustomFilterToggle(cfKey, cfVal);
        } else {
            const p = new URLSearchParams(searchParams || undefined);
            p.delete(key);
            if (key === 'min_price') setLocalMinPrice('');
            if (key === 'max_price') setLocalMaxPrice('');
            if (key === 'min_moq') setLocalMoq('');
            p.set('page', '1');
            setSearchParams(p);
        }
    };

    const setTab = (t: string) => {
        const p = new URLSearchParams(searchParams || undefined);
        p.set('tab', t);
        p.set('page', '1');
        setSearchParams(p);
    };

    const goToPage = (pg: number) => {
        const p = new URLSearchParams(searchParams || undefined);
        p.set('page', pg.toString());
        setSearchParams(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const applySidebarPrice = () => {
        const p = new URLSearchParams(searchParams || undefined);
        if (localMinPrice) p.set('min_price', localMinPrice); else p.delete('min_price');
        if (localMaxPrice) p.set('max_price', localMaxPrice); else p.delete('max_price');
        p.set('page', '1');
        setSearchParams(p);
    };

    const applySidebarMoq = () => {
        const p = new URLSearchParams(searchParams || undefined);
        if (localMoq) p.set('min_moq', localMoq); else p.delete('min_moq');
        p.set('page', '1');
        setSearchParams(p);
    };

    const handleInquiry = (e: React.MouseEvent, product: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { openLogin(); return; }
        const sup = product.supplier_info || product.supplier;
        if (sup) openChat(sup, product);
    };

    const activeFilters: any[] = [];
    if (searchParams?.get('category_id')) activeFilters.push({ key: 'category_id', label: allCategories.find(c => c._id === searchParams?.get('category_id') || c.slug === searchParams?.get('category_id'))?.title || 'Category' });
    if (searchParams?.get('min_price')) activeFilters.push({ key: 'min_price', label: `Min $${searchParams?.get('min_price')}` });
    if (searchParams?.get('max_price')) activeFilters.push({ key: 'max_price', label: `Max $${searchParams?.get('max_price')}` });
    if (searchParams?.get('verified_only') === 'true') activeFilters.push({ key: 'verified_only', label: 'Verified' });
    if (searchParams?.get('verified_pro') === 'true') activeFilters.push({ key: 'verified_pro', label: 'Verified PRO' });
    if (searchParams?.get('trade_assurance') === 'true') activeFilters.push({ key: 'trade_assurance', label: 'Trade Assurance' });
    if (searchParams?.get('country')) activeFilters.push({ key: 'country', label: searchParams?.get('country') });
    if (searchParams?.get('min_moq')) activeFilters.push({ key: 'min_moq', label: `MOQ ≤${searchParams?.get('min_moq')}` });
    if (searchParams?.get('moq_under_5') === 'true') activeFilters.push({ key: 'moq_under_5', label: 'MOQ ≤ 5' });
    if (searchParams?.get('rating_min')) activeFilters.push({ key: 'rating_min', label: `${searchParams?.get('rating_min')}★+` });
    if (searchParams?.get('rating_45') === 'true') activeFilters.push({ key: 'rating_45', label: '4.5+ Rating' });
    if (searchParams?.get('fast_customization') === 'true') activeFilters.push({ key: 'fast_customization', label: 'Fast Customization' });
    if (searchParams?.get('bulk') === 'true') activeFilters.push({ key: 'bulk', label: 'Bulk Orders' });
    if (searchParams?.get('sample_available') === 'true') activeFilters.push({ key: 'sample_available', label: 'Free Samples' });

    // Multi-select tags
    const certs = searchParams?.get('certifications')?.split(',').filter(Boolean) || [];
    certs.forEach(c => activeFilters.push({ key: 'certifications', label: c, value: c }));

    const caps = searchParams?.get('capabilities')?.split(',').filter(Boolean) || [];
    caps.forEach(c => activeFilters.push({ key: 'capabilities', label: c, value: c }));

    const currentCustomFilters = getActiveCustomFilters();
    for (const [cfKey, cfVal] of Object.entries(currentCustomFilters)) {
        if (cfVal) {
            const values = cfVal.split(',').map(v => v.trim()).filter(Boolean);
            values.forEach(v => {
                activeFilters.push({
                    key: `cf_${cfKey}`,
                    label: `${cfKey}: ${v}`,
                    cfKey: cfKey,
                    cfVal: v
                });
            });
        }
    }



    const countries = [
        { code: 'CN', name: 'China' }, { code: 'IN', name: 'India' }, { code: 'US', name: 'United States' },
        { code: 'VN', name: 'Vietnam' }, { code: 'TR', name: 'Turkey' }, { code: 'IT', name: 'Italy' },
    ];

    // Current displayed items
    const displayItems = tab === 'suppliers' ? suppliers : tab === 'worldwide' ? wwProducts : products;

    const isCatSearch = !!searchParams?.get('category_id') && !keyword;
    const isKwSearch = !!keyword;

    const featuredSupplier = products?.[0]?.supplier_info || products?.[0]?.supplier;
    const featuredProducts = products?.slice(0, 3) || [];
    const activeCategoryObj = allCategories.find(c => c._id === searchParams?.get('category_id') || c.slug === searchParams?.get('category_id'));
    const dynamicAttrs = Array.from(new Set(products.map((p: any) => p.category?.title).filter(Boolean))).slice(0, 10);

    // Generate dynamic match stats dynamically instead of static values
    const supSeed = featuredSupplier?._id?.charCodeAt(0) || 12;
    const dynamicYear = featuredSupplier?.createdAt ? new Date(featuredSupplier.createdAt).getFullYear() : (2010 + (supSeed % 10));
    const dynamicOnTime = featuredSupplier?.on_time_rate || `${90 + (supSeed % 10)}%`;
    const dynamicResponse = featuredSupplier?.response_rate || featuredSupplier?.user_id?.response_rate || `${80 + (supSeed % 15)}%`;
    const dynamicRevenue = featuredSupplier?.annual_revenue || `$${(supSeed * 0.8 + 10).toFixed(0)}M+`;
    const dynamicSourcing = featuredSupplier?.years_experience || (featuredSupplier?.createdAt ? Math.max(1, new Date().getFullYear() - new Date(featuredSupplier.createdAt).getFullYear()) : (supSeed % 12 + 2));
    const dynamicStaff = featuredSupplier?.staff_size || `${50 + (supSeed % 5) * 50}+`;


    return (
        <div className={styles['sr-page']}>
            {sidebarOpen && <div className={styles['sr-sidebar-overlay']} onClick={() => setSidebarOpen(false)} />}
            <div className={styles['sr-layout-container']}>
                {/* 1. Breadcrumb Navigation (For Category Search Only) */}
                {isCatSearch && breadcrumbs.length > 0 && (
                    <div className={styles['sr-breadcrumbs-alibaba']}>
                        <Link href="/">{siteSettings?.site_name || 'B2B Marketplace'}</Link>
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb._id}>
                                <span className={styles['sr-crumb-sep']}>›</span>
                                <Link
                                    href={`/search?category_id=${crumb.slug || crumb._id}`}
                                    className={idx === breadcrumbs.length - 1 ? styles['last'] : ''}
                                >
                                    {crumb.title}
                                </Link>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <div className={`${styles['sr-layout-new']}`}>
                    {/* ─── LEFT SIDEBAR (Always Visible, AliExpress Style) ─── */}
                    <aside className={`${styles['sr-left-sidebar']} ${sidebarOpen ? styles['open'] : ''}`}>
                        {/* Mobile Sidebar Header */}
                        <div className={styles['sr-sidebar-header-mobile-new']}>
                            <span>Filters</span>
                            <button className={styles['sr-sidebar-close-btn-new']} onClick={() => setSidebarOpen(false)}>✕</button>
                        </div>

                        {/* Desktop Sidebar Header */}
                        <div className={styles['sf-sidebar-header-desktop']}>
                            <svg className={styles['sf-filter-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="21" x2="4" y2="14"></line>
                                <line x1="4" y1="10" x2="4" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12" y2="3"></line>
                                <line x1="20" y1="21" x2="20" y2="16"></line>
                                <line x1="20" y1="12" x2="20" y2="3"></line>
                                <line x1="1" y1="14" x2="7" y2="14"></line>
                                <line x1="9" y1="8" x2="15" y2="8"></line>
                                <line x1="17" y1="16" x2="23" y2="16"></line>
                            </svg>
                            <span>FILTERS</span>
                        </div>

                        {/* === Search Section === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('search_keyword')}
                            >
                                <span className={styles['sf-section-title']}>Search</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('search_keyword') ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('search_keyword') && (
                                <div className={styles['sf-section-body']}>
                                    <form onSubmit={handleSidebarSearch} className={styles['sf-search-box-row']}>
                                        <input
                                            type="text"
                                            placeholder="Search Keyword"
                                            value={sidebarKeyword}
                                            onChange={e => setSidebarKeyword(e.target.value)}
                                            className={styles['sf-search-input']}
                                        />
                                        <button type="submit" className={styles['sf-search-submit-btn']}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* === Categories Section === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('categories')}
                            >
                                <span className={styles['sf-section-title']}>Categories</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('categories') ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('categories') && (
                                <div className={styles['sf-section-body']}>
                                    {renderCategoryTree()}
                                </div>
                            )}
                        </div>

                        {/* === Deals & Discounts === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('delivery')}
                            >
                                <span className={styles['sf-section-title']}>Deals &amp; discounts</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('delivery') ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('delivery') && (
                                <div className={styles['sf-section-body']}>
                                    <label className={styles['sf-checkbox-row']}>
                                        <input
                                            type="checkbox"
                                            className={styles['sf-checkbox']}
                                            checked={searchParams?.get('free_shipping') === 'true'}
                                            onChange={() => updateFilter('free_shipping', searchParams?.get('free_shipping') === 'true' ? '' : 'true')}
                                        />
                                        <span className={styles['sf-checkbox-label']}>Free shipping</span>
                                    </label>
                                    <label className={styles['sf-checkbox-row']}>
                                        <input
                                            type="checkbox"
                                            className={styles['sf-checkbox']}
                                            checked={searchParams?.get('on_sale') === 'true'}
                                            onChange={() => updateFilter('on_sale', searchParams?.get('on_sale') === 'true' ? '' : 'true')}
                                        />
                                        <span className={styles['sf-checkbox-label']}>On sale</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* === Quality & Trust === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('rating')}
                            >
                                <span className={styles['sf-section-title']}>Quality &amp; trust</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('rating') ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('rating') && (
                                <div className={styles['sf-section-body']}>
                                    {[4, 3, 2].map(stars => (
                                        <label key={stars} className={styles['sf-checkbox-row']}>
                                            <input
                                                type="radio"
                                                name="rating_min"
                                                className={styles['sf-checkbox']}
                                                checked={searchParams?.get('rating_min') === String(stars)}
                                                onChange={() => updateFilter('rating_min', searchParams?.get('rating_min') === String(stars) ? '' : String(stars))}
                                            />
                                            <span className={styles['sf-stars-label']}>
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <svg key={i} className={i < stars ? styles['sf-star-filled'] : styles['sf-star-empty']} width="13" height="13" viewBox="0 0 24 24">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={i < stars ? '#f59e0b' : 'none'} stroke={i < stars ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5"/>
                                                    </svg>
                                                ))}
                                                <span>& up</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* === Price === */}
                        {tab !== 'suppliers' && (
                            <div className={styles['sf-section']}>
                                <button
                                    className={styles['sf-section-header']}
                                    onClick={() => toggleSection('price')}
                                >
                                    <span className={styles['sf-section-title']}>Price</span>
                                    <svg className={`${styles['sf-chevron']} ${isSectionOpen('price') ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                                </button>
                                {isSectionOpen('price') && (
                                    <div className={styles['sf-section-body']}>
                                        <div className={styles['sf-price-row']}>
                                            <input
                                                type="number"
                                                placeholder="Rs. Min."
                                                value={localMinPrice}
                                                onChange={e => setLocalMinPrice(e.target.value)}
                                                className={styles['sf-price-input']}
                                            />
                                            <span className={styles['sf-price-dash']}>-</span>
                                            <input
                                                type="number"
                                                placeholder="Rs. Max."
                                                value={localMaxPrice}
                                                onChange={e => setLocalMaxPrice(e.target.value)}
                                                className={styles['sf-price-input']}
                                            />
                                            <button className={styles['sf-price-ok']} onClick={applySidebarPrice}>OK</button>
                                        </div>
                                        {/* Price range presets */}
                                        {(() => {
                                            const minP = parseFloat(localMinPrice) || 0;
                                            const maxP = parseFloat(localMaxPrice) || 0;
                                            const hasProducts = products.length > 0;
                                            const prices = products.map((p: any) => p.main_price || 0).filter((v: number) => v > 0);
                                            const pMin = prices.length > 0 ? Math.min(...prices) : 0;
                                            const pMax = prices.length > 0 ? Math.max(...prices) : 10000;
                                            const range = pMax - pMin;
                                            const q = range / 5;
                                            const presets = hasProducts && range > 0 ? [
                                                { label: `Under ${Math.round(pMin + q)}`, max: Math.round(pMin + q), min: 0 },
                                                { label: `${Math.round(pMin + q)}–${Math.round(pMin + q * 2)}`, min: Math.round(pMin + q), max: Math.round(pMin + q * 2) },
                                                { label: `${Math.round(pMin + q * 2)}–${Math.round(pMin + q * 3)}`, min: Math.round(pMin + q * 2), max: Math.round(pMin + q * 3) },
                                                { label: `${Math.round(pMin + q * 3)}–${Math.round(pMax)}`, min: Math.round(pMin + q * 3), max: Math.round(pMax) },
                                                { label: `${Math.round(pMax)}–Over`, min: Math.round(pMax), max: 0 },
                                            ] : [];
                                            return presets.map((p, i) => (
                                                <label key={i} className={styles['sf-checkbox-row']}>
                                                    <input
                                                        type="radio"
                                                        name="price_preset"
                                                        className={styles['sf-checkbox']}
                                                        checked={parseFloat(localMinPrice || '0') === p.min && parseFloat(localMaxPrice || '0') === (p.max || 0)}
                                                        onChange={() => {
                                                            setLocalMinPrice(p.min > 0 ? String(p.min) : '');
                                                            setLocalMaxPrice(p.max > 0 ? String(p.max) : '');
                                                            const params = new URLSearchParams(searchParams || undefined);
                                                            if (p.min > 0) params.set('min_price', String(p.min)); else params.delete('min_price');
                                                            if (p.max > 0) params.set('max_price', String(p.max)); else params.delete('max_price');
                                                            params.set('page', '1');
                                                            setSearchParams(params);
                                                        }}
                                                    />
                                                    <span className={styles['sf-checkbox-label']}>{p.label}</span>
                                                </label>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}



                        {/* === Custom Field Filters (Category-based) === */}
                        {categoryCustomFields.map(cf => (
                            <div key={cf._id} className={styles['sf-section']}>
                                <button
                                    className={styles['sf-section-header']}
                                    onClick={() => toggleSection(`cf_${cf._id}`)}
                                >
                                    <span className={styles['sf-section-title']}>{cf.name}</span>
                                    <svg className={`${styles['sf-chevron']} ${isSectionOpen(`cf_${cf._id}`) ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                                </button>
                                {isSectionOpen(`cf_${cf._id}`) && (
                                    <div className={styles['sf-section-body']}>
                                        {cf.options && cf.options.map((opt: string) => {
                                            const isChecked = isCustomFilterActive(cf.name, opt);
                                            return (
                                                <label key={opt} className={styles['sf-checkbox-row']}>
                                                    <input
                                                        type="checkbox"
                                                        className={styles['sf-checkbox']}
                                                        checked={isChecked}
                                                        onChange={() => handleCustomFilterToggle(cf.name, opt)}
                                                    />
                                                    <span className={styles['sf-checkbox-label']}>{opt}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* === Supplier Type === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('supplier_type')}
                            >
                                <span className={styles['sf-section-title']}>Supplier type</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('supplier_type', false) ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('supplier_type', false) && (
                                <div className={styles['sf-section-body']}>
                                    <label className={styles['sf-checkbox-row']}>
                                        <input type="checkbox" className={styles['sf-checkbox']}
                                            checked={searchParams?.get('trade_assurance') === 'true'}
                                            onChange={() => updateFilter('trade_assurance', searchParams?.get('trade_assurance') === 'true' ? '' : 'true')} />
                                        <span className={styles['sf-checkbox-label']}>Trade Assurance</span>
                                    </label>
                                    <label className={styles['sf-checkbox-row']}>
                                        <input type="checkbox" className={styles['sf-checkbox']}
                                            checked={searchParams?.get('verified_only') === 'true'}
                                            onChange={() => updateFilter('verified_only', searchParams?.get('verified_only') === 'true' ? '' : 'true')} />
                                        <span className={styles['sf-checkbox-label']}>Verified Supplier</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* === Location === */}
                        <div className={styles['sf-section']}>
                            <button
                                className={styles['sf-section-header']}
                                onClick={() => toggleSection('location')}
                            >
                                <span className={styles['sf-section-title']}>Supplier location</span>
                                <svg className={`${styles['sf-chevron']} ${isSectionOpen('location', false) ? styles['open'] : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            {isSectionOpen('location', false) && (
                                <div className={styles['sf-section-body']}>
                                    {Array.from(new Set(['China', 'United States', 'India', 'Vietnam', 'Turkey', 'Italy', ...dynamicCountries].map(l => l.trim())))
                                        .filter((loc, i, self) => self.findIndex(l => l.toLowerCase() === loc.toLowerCase()) === i)
                                        .map(loc => (
                                            <label key={loc} className={styles['sf-checkbox-row']}>
                                                <input type="checkbox" className={styles['sf-checkbox']}
                                                    checked={searchParams?.get('country') === loc}
                                                    onChange={() => updateFilter('country', searchParams?.get('country') === loc ? '' : loc)} />
                                                <span className={styles['sf-checkbox-label']}>{loc}</span>
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>

                    </aside>

                    {/* ─── Main Content ─── */}
                    <main className={styles['sr-main-new']}>
                        {/* Sort + Results header bar */}
                        <div className={styles['sr-results-header']}>
                            <div className={styles['sr-results-count']}>
                                {isKwSearch ? (
                                    <span>Search results for "<strong>{keyword}</strong>" — <strong>{total.toLocaleString()}</strong> {total === 1 ? 'item' : 'items'}</span>
                                ) : (
                                    <span><strong>{activeCategoryObj?.title || 'Products'}</strong> — <strong>{total.toLocaleString()}</strong> {total === 1 ? 'item' : 'items'}</span>
                                )}
                            </div>
                            <div className={styles['sr-results-sort']}>
                                <button
                                    className={styles['sr-mobile-filter-btn']}
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    Filters
                                </button>
                                <span className={styles['sr-sort-label']}>Sort by:</span>
                                <button
                                    className={`${styles['sr-sort-btn-ae']} ${sortBy === '' ? styles['active'] : ''}`}
                                    onClick={() => updateFilter('sort_by', '')}
                                >
                                    Best Match
                                </button>
                                <button
                                    className={`${styles['sr-sort-btn-ae']} ${sortBy === 'ranking' ? styles['active'] : ''}`}
                                    onClick={() => updateFilter('sort_by', 'ranking')}
                                >
                                    Orders
                                </button>
                                <button
                                    className={`${styles['sr-sort-btn-ae']} ${sortBy === 'recent' ? styles['active'] : ''}`}
                                    onClick={() => updateFilter('sort_by', 'recent')}
                                >
                                    Newest
                                </button>
                                <button
                                    className={`${styles['sr-sort-btn-ae']} ${(sortBy === 'price_asc' || sortBy === 'price_desc') ? styles['active'] : ''}`}
                                    onClick={() => {
                                        const nextSort = sortBy === 'price_asc' ? 'price_desc' : 'price_asc';
                                        updateFilter('sort_by', nextSort);
                                    }}
                                >
                                    Price
                                    <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                        {sortBy === 'price_asc' ? ' ▲' : sortBy === 'price_desc' ? ' ▼' : ' ▲▼'}
                                    </span>
                                </button>
                                {tab !== 'suppliers' && (
                                    <div className={styles['sr-view-toggle']}>
                                        <button className={`${styles['sr-view-btn-new']} ${viewMode === 'grid' ? styles['active'] : ''}`} onClick={() => handleViewMode('grid')} title="Grid View">
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 3h7v7H3zm11 0h7v7h-7zm-11 11h7v7H3zm11 0h7v7h-7z" /></svg>
                                        </button>
                                        <button className={`${styles['sr-view-btn-new']} ${viewMode === 'list' ? styles['active'] : ''}`} onClick={() => handleViewMode('list')} title="List View">
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 4h18v2H3zm0 7h18v2H3zm0 7h18v2H3z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Filters chips */}
                        {activeFilters.length > 0 && (
                            <div className={styles['sr-active-filters-bar']}>
                                <span className={styles['sr-active-lbl']}>ACTIVE FILTERS:</span>
                                {activeFilters.map(f => (
                                    <button
                                        key={f.key + (f.value || '')}
                                        className={styles['sr-active-chip']}
                                        onClick={() => {
                                            if (f.key === 'certifications' || f.key === 'capabilities') {
                                                updateFilter(f.key, f.value);
                                            } else if (f.key.startsWith('cf_')) {
                                                removeFilter(f.key, f.cfKey, f.cfVal);
                                            } else {
                                                removeFilter(f.key);
                                            }
                                        }}
                                    >
                                        {f.label} <span>✕</span>
                                    </button>
                                ))}
                                <button className={styles['sr-clear-all-ae']} onClick={() => removeFilter('all')}>Clear All</button>
                            </div>
                        )}






                        {/* 3. Attributes Filter Bar (Product Search only) */}
                        {isKwSearch && tab === 'products' && dynamicAttrs.length > 0 && (
                            <div className={styles['sr-attribute-bar'] + " " + styles['alibaba-v3']}>
                                <span className={styles['sr-attr-label']}>Related Categories:</span>
                                <div className={styles['sr-attr-scroll']}>
                                    {dynamicAttrs.map(attr => (
                                        <button
                                            key={attr}
                                            className={`sr-attr-chip v3 ${activeAttr === attr ? 'active' : ''}`}
                                            onClick={() => setActiveAttr(activeAttr === attr ? '' : attr)}
                                        >
                                            {attr}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* 4. Quick Filter Bar (Product Search only) - HIDDEN BY USER REQUEST */}
                        {/* 
                        {isKwSearch && tab === 'products' && (
                            <div className={styles['sr-top-quick-filters'] + " " + styles['v3'] + " " + styles['d-none']}>
                                <span className={styles['sr-attr-label']}>Select by:</span>
                                <div className={styles['sr-qf-scroll']}>
                                    {[
                                        { key: 'trade_assurance', label: 'Trade Assurance' },
                                        { key: 'moq_under_5', label: 'MOQ ≤ 5' },
                                        { key: 'verified_only', label: 'Verified Supplier' },
                                        { key: 'five_plus_years', label: '5+ Years Supplier' },
                                        { key: 'rating_45', label: '4.5+ Supplier Rating' },
                                        { key: 'ce_cert', label: 'CE Certified' },
                                        { key: 'emc_cert', label: 'EMC Certified' }
                                    ].map(filter => (
                                        <button
                                            key={filter.key}
                                            className={`sr-quick-filter-pill v3 ${searchParams.get(filter.key) === 'true' ? 'active' : ''}`}
                                            onClick={() => updateFilter(filter.key, searchParams.get(filter.key) === 'true' ? '' : 'true')}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                                <button className={styles['sr-clear-all-link']} onClick={() => removeFilter('all')}>Clear all</button>
                            </div>
                        )}
                        */}



                        {/* Image search preview */}
                        {isImageSearch && imagePreview && (
                            <div className={styles['sr-img-search-preview']}>
                                <img src={imagePreview as string} alt="Search" />
                                <div>
                                    <p>Searching by image</p>
                                    <button onClick={() => removeFilter('is_image_search')}>Clear</button>
                                </div>
                            </div>
                        )}

                        {/* ─── WORLDWIDE TAB: Deep Search Header ─── */}
                        {tab === 'worldwide' && (wwAttributes.length > 0 || wwQuickFilters.length > 0) && (
                            <div className={styles['sr-deep-search-results']}>
                                <div className={styles['sr-ds-filter-body']}>
                                    {/* Attribute chips — dynamic from product names */}
                                    {wwAttributes.length > 0 && (
                                        <div className={styles['sr-ds-f-row']}>
                                            <span className={styles['sr-ds-f-label']}>Attributes</span>
                                            <div className={styles['sr-ds-switch-group']}>
                                                {wwAttributes.map(a => {
                                                    const attrWord = a.split(' ').slice(1).join(' ');
                                                    return (
                                                        <button
                                                            key={a}
                                                            className={`${styles['sr-ds-chip']} ${activeAttr === attrWord ? styles['active'] : ''}`}
                                                            onClick={() => setActiveAttr(activeAttr === attrWord ? '' : attrWord)}
                                                        >
                                                            {a}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick filter chips — dynamic */}
                                    {wwQuickFilters.length > 0 && (
                                        <div className={styles['sr-ds-f-row']}>
                                            <span className={styles['sr-ds-f-label']}>Select by</span>
                                            <div className={styles['sr-ds-switch-group']}>
                                                {wwQuickFilters.map(qf => (
                                                    <button
                                                        key={qf.key}
                                                        className={`${styles['sr-ds-chip']} ${styles['outline']} ${activeQuickFilter === qf.key ? styles['active'] : ''}`}
                                                        onClick={() => setActiveQuickFilter(activeQuickFilter === qf.key ? '' : qf.key)}
                                                    >
                                                        {qf.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {(activeAttr || activeQuickFilter || searchParams.get('country')) && (
                                                <button className={styles['sr-ds-clear']} onClick={() => { setActiveAttr(''); setActiveQuickFilter(''); removeFilter('country'); }}>Clear all</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sort Bar removed - unified inline above */}

                        {/* Results */}
                        {loading ? (
                            <div className={tab === 'suppliers' ? styles['sr-suppliers-list'] : tab === 'worldwide' ? styles['sr-ww-grid'] : `${styles['sr-grid']} ${viewMode === 'list' ? styles['sr-list-mode'] : ''}`}>
                                {[...Array(tab === 'worldwide' ? 10 : 8)].map((_, i) => <SkeletonCard key={i} viewMode={tab === 'suppliers' ? 'grid' : viewMode} />)}
                            </div>
                        ) : error ? (
                            <div className={styles['sr-empty']}>
                                <div className={styles['sr-empty-icon']}>⚠️</div>
                                <h2>{error}</h2>
                                <button className={styles['sr-empty-btn']} onClick={fetchResults}>Retry</button>
                            </div>
                        ) : displayItems.length === 0 ? (
                            <div className={styles['sr-empty']}>
                                <div className={styles['sr-empty-icon']}>🔍</div>
                                <h2>No results found</h2>
                                <p>Try different keywords or adjust your filters.</p>
                                <button className={styles['sr-empty-btn']} onClick={() => removeFilter('all')}>Clear Filters</button>
                            </div>
                        ) : (
                            <>
                                {tab === 'suppliers' && (
                                    <div className={styles['sr-suppliers-list']}>
                                        {suppliers.map(item => (
                                            <SupplierCard key={item._id} supplier={item} convertPrice={convertPrice} onInquiry={handleInquiry} />
                                        ))}
                                    </div>
                                )}

                                {tab === 'worldwide' && (
                                    <div className={styles['sr-ww-grid']}>
                                        {wwProducts.map(item => (
                                            <WorldwideCard key={item._id} product={item} convertPrice={convertPrice} onInquiry={handleInquiry} isCompared={isProductCompared(item)} onCompareToggle={handleCompareToggle} isWishlisted={isWishlisted(item)} onWishlistToggle={handleWishlistToggle} />
                                        ))}
                                    </div>
                                )}

                                {tab === 'products' && (
                                    <div className={`${styles['sr-grid']} ${viewMode === 'list' ? styles['sr-list-mode'] : ''}`}>
                                        {products.map(item => (
                                            <ProductCard key={item._id} product={item} convertPrice={convertPrice} isImageSearch={isImageSearch} onInquiry={handleInquiry} viewMode={viewMode} isCompared={isProductCompared(item)} onCompareToggle={handleCompareToggle} isWishlisted={isWishlisted(item)} onWishlistToggle={handleWishlistToggle} />
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages >= 1 && (
                                    <div className={styles['sr-pagination']}>
                                        <button className={styles['sr-page-btn']} disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                                            ‹ Prev
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                            let pg;
                                            if (totalPages <= 7) pg = i + 1;
                                            else if (currentPage <= 4) pg = i + 1;
                                            else if (currentPage >= totalPages - 3) pg = totalPages - 6 + i;
                                            else pg = currentPage - 3 + i;
                                            return (
                                                <button key={pg} className={`${styles['sr-page-btn']} ${currentPage === pg ? styles['active'] : ''}`} onClick={() => goToPage(pg)}>
                                                    {pg}
                                                </button>
                                            );
                                        })}
                                        <button className={styles['sr-page-btn']} disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
                                            Next ›
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div> {/* sr-layout-new */}
            </div> {/* sr-layout-container */}


            {/* ─── Compare Tray ─── */}
            {comparedProducts.length > 0 && (
                <div className={styles['sr-compare-tray']}>
                    <div className={styles['sr-compare-tray-inner']}>
                        <div className={styles['sr-compare-tray-left']}>
                            <div className={styles['sr-compare-tray-title']}>
                                Compare <span>{comparedProducts.length}</span>/{5} Products
                            </div>
                            <div className={styles['sr-compare-tray-items']}>
                                {comparedProducts.map(prod => (
                                    <div key={prod._id} className={styles['sr-compare-tray-item']}>
                                        {(prod.images?.[0] || prod.main_image)
                                            ? <img src={getImgUrl(prod.images?.[0] || prod.main_image)} alt={prod.name} />
                                            : <svg width="24" height="24" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                        }
                                        <button
                                            className={styles['sr-compare-tray-item-remove']}
                                            onClick={() => handleCompareToggle(prod)}
                                            title="Remove"
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles['sr-compare-tray-actions']}>
                            <button
                                className={styles['sr-compare-tray-btn-clear']}
                                onClick={() => setComparedProducts([])}
                            >Clear All</button>
                            <button
                                className={styles['sr-compare-tray-btn-compare']}
                                onClick={() => setCompareModalOpen(true)}
                                disabled={comparedProducts.length < 2}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><rect x="2" y="3" width="6" height="18" rx="1" /><rect x="16" y="3" width="6" height="18" rx="1" /><path d="M12 8v8M9 11l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Compare Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Compare Modal ─── */}
            {compareModalOpen && (
                <div className={styles['sr-compare-modal-overlay']} onClick={(e) => { if (e.target === e.currentTarget) setCompareModalOpen(false); }}>
                    <div className={styles['sr-compare-modal']}>
                        {/* Header */}
                        <div className={styles['sr-compare-modal-header']}>
                            <div className={styles['sr-compare-modal-title']}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="7" height="18" rx="1"/><rect x="15" y="3" width="7" height="18" rx="1"/></svg>
                                <h2>Product Comparison</h2>
                                <span>{comparedProducts.length} items</span>
                            </div>
                            <button className={styles['sr-compare-modal-close']} onClick={() => setCompareModalOpen(false)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className={styles['sr-compare-modal-body']}>
                            <div className={styles['sr-compare-matrix-table-wrapper']}>
                                <table className={styles['sr-compare-matrix-table']}>
                                    <thead>
                                        <tr>
                                            <th className={styles['sr-compare-matrix-th-label'] + ' ' + styles['sr-compare-criteria-header']}>
                                                <span>Criteria</span>
                                            </th>
                                            {comparedProducts.map(prod => (
                                                <th key={prod._id} className={styles['sr-compare-col-header']}>
                                                    <div className={styles['sr-compare-prod-card']}>
                                                        <div className={styles['sr-compare-prod-img-wrap']}>
                                                            {(prod.images?.[0] || prod.main_image)
                                                                ? <img src={getImgUrl(prod.images?.[0] || prod.main_image)} alt={prod.name} />
                                                                : <svg width="36" height="36" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                                            }
                                                        </div>
                                                        <p className={styles['sr-compare-prod-name']}>{prod.name}</p>
                                                        <button className={styles['sr-compare-prod-remove-btn']} onClick={() => handleCompareToggle(prod)}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                            Remove
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Price Row */}
                                        <tr className={styles['sr-compare-row-alt']}>
                                            <td className={styles['sr-compare-matrix-th-label']}>
                                                <div className={styles['sr-compare-row-label']}>
                                                    <div className={styles['sr-compare-row-icon']}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                    </div>
                                                    Unit Price
                                                </div>
                                            </td>
                                            {comparedProducts.map(prod => {
                                                const bp = prod.main_price || prod.price_tiers?.[0]?.price || 0;
                                                const p = convertPrice(bp);
                                                return (
                                                    <td key={prod._id}>
                                                        <span className={styles['sr-compare-price-val']}>{p.formatted}</span>
                                                        <span className={styles['sr-compare-price-unit']}> / {prod.unit || 'piece'}</span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {/* MOQ Row */}
                                        {siteSettings?.rfq_enabled !== false && (
                                            <tr>
                                                <td className={styles['sr-compare-matrix-th-label']}>
                                                    <div className={styles['sr-compare-row-label']}>
                                                        <div className={styles['sr-compare-row-icon']}>
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10H3M21 6H3M21 14H3M21 18H3"/></svg>
                                                        </div>
                                                        Min. Order
                                                    </div>
                                                </td>
                                                {comparedProducts.map(prod => (
                                                    <td key={prod._id}>
                                                        {prod.moq
                                                            ? <span className={styles['sr-compare-moq-val']}>{prod.moq} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '12px' }}>{prod.unit || 'pcs'}</span></span>
                                                            : <span className={styles['sr-compare-null']}>—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                        {/* Rating Row */}
                                        <tr className={styles['sr-compare-row-alt']}>
                                            <td className={styles['sr-compare-matrix-th-label']}>
                                                <div className={styles['sr-compare-row-label']}>
                                                    <div className={styles['sr-compare-row-icon']}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                                    </div>
                                                    Rating
                                                </div>
                                            </td>
                                            {comparedProducts.map(prod => (
                                                <td key={prod._id}>
                                                    <div className={styles['sr-compare-rating-row']}>
                                                        {[1,2,3,4,5].map(s => (
                                                            <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={(prod.rating || 4.5) >= s ? '#fbbf24' : '#e2e8f0'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                                        ))}
                                                        <span className={styles['sr-compare-rating-val']}>{(prod.rating || 4.5).toFixed(1)}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Supplier Row */}
                                        <tr>
                                            <td className={styles['sr-compare-matrix-th-label']}>
                                                <div className={styles['sr-compare-row-label']}>
                                                    <div className={styles['sr-compare-row-icon']}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                    </div>
                                                    Seller
                                                </div>
                                            </td>
                                            {comparedProducts.map(prod => {
                                                const sup = prod.supplier_info || prod.supplier;
                                                return (
                                                    <td key={prod._id}>
                                                        {sup ? (
                                                            <div className={styles['sr-compare-supplier-box']}>
                                                                <Link href={`/supplier/${sup._id || sup.user_id?._id || sup.user_id}`} className={styles['sr-compare-supplier-name']}>{sup.company_name || '—'}</Link>
                                                                <div className={styles['sr-compare-supplier-meta']}>
                                                                    {sup.country_code && (
                                                                        <>
                                                                            <img src={`https://flagcdn.com/16x12/${sup.country_code.toLowerCase()}.png`} alt={sup.country_code} className={styles['sr-compare-supplier-flag']} />
                                                                            <span className={styles['sr-compare-supplier-country']}>{sup.country_code}</span>
                                                                        </>
                                                                    )}
                                                                    {sup.years_experience && <span className={styles['sr-compare-supplier-years']}>{sup.years_experience} yrs</span>}
                                                                </div>
                                                            </div>
                                                        ) : <span className={styles['sr-compare-null']}>—</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {/* Key Attributes Row */}
                                        <tr className={styles['sr-compare-row-alt']}>
                                            <td className={styles['sr-compare-matrix-th-label']}>
                                                <div className={styles['sr-compare-row-label']}>
                                                    <div className={styles['sr-compare-row-icon']}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                                    </div>
                                                    Key Specs
                                                </div>
                                            </td>
                                            {comparedProducts.map(prod => (
                                                <td key={prod._id}>
                                                    {prod.key_attributes?.length > 0 ? (
                                                        <div className={styles['sr-compare-attr-pills']}>
                                                            {prod.key_attributes.slice(0, 4).map((attr: any, i: number) => (
                                                                <span key={i} className={styles['sr-compare-attr-pill']} title={attr.name}>{attr.value}</span>
                                                            ))}
                                                        </div>
                                                    ) : <span className={styles['sr-compare-null']}>—</span>}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Actions Row */}
                                        <tr className={styles['sr-compare-actions-row']}>
                                            <td className={styles['sr-compare-matrix-th-label']}>
                                                <div className={styles['sr-compare-row-label']}>Actions</div>
                                            </td>
                                            {comparedProducts.map(prod => (
                                                <td key={prod._id}>
                                                    <div className={styles['sr-compare-action-group']}>
                                                        <Link href={`/product/${getProductSlug(prod)}`} className={styles['sr-compare-btn-details']}>View Details</Link>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
