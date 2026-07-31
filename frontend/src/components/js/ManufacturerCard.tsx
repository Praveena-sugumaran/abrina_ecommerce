


import React, { useRef } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import api from '@/services/axiosConfig';
import 'swiper/css';


/* ─── Star renderer ──────────────────────────────────────────── */
const Stars = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
        <span className="mc2-stars">
            {[...Array(5)].map((_, i) => (
                <span
                    key={i}
                    className={
                        i < full
                            ? 'mc2-star filled'
                            : i === full && half
                            ? 'mc2-star half'
                            : 'mc2-star'
                    }
                >
                    ★
                </span>
            ))}
        </span>
    );
};

/* ─── Main card ──────────────────────────────────────────────── */
const ManufacturerCard = ({ manufacturer }: { manufacturer: any }) => {
    const { openChat } = useChat();
    const { convertPrice, siteSettings } = useAuth();
    const isB2C = siteSettings?.rfq_enabled === false;
    const prevRef = useRef(null);

    const nextRef = useRef(null);

    const [followersCount, setFollowersCount] = React.useState(0);
    const [isFollowing, setIsFollowing] = React.useState(false);
    const { user, openLogin } = useAuth();

    React.useEffect(() => {
        if (manufacturer._id) {
            api.get(`/companies/${manufacturer._id}/follow-status`)
                .then(res => {
                    setFollowersCount(res.data.followerCount || 0);
                    setIsFollowing(res.data.isFollowing || false);
                })
                .catch(err => console.error('Error fetching follow status:', err));
        }
    }, [manufacturer._id, user]);

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!user) {
            openLogin();
            return;
        }
        try {
            const { data } = await api.post(`/companies/${manufacturer._id}/follow`);
            if (data.success) {
                setIsFollowing(data.isFollowing);
                setFollowersCount(data.followerCount);
            }
        } catch (err) {
            console.error('Error toggling follow:', err);
        }
    };

    /* ── derived fields ── */
    const name        = manufacturer.company_name || 'Unnamed Company';
    const logo        = manufacturer.logo;
    const description = manufacturer.description
        || 'Leading global partner for quality-assured manufacturing and distribution.';
    const products    = manufacturer.products || [];

    let isNewSupplier = false;
    let yearsExp = manufacturer.years_experience;
    const joinDate = manufacturer.createdAt || Date.now();
    const d = new Date(joinDate);
    const n = new Date();

    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()) {
        isNewSupplier = true;
    } else if (yearsExp === undefined) {
        yearsExp = Math.max(1, n.getFullYear() - d.getFullYear());
    }

    const supplierUserId = manufacturer.user_id?._id || manufacturer.user_id || manufacturer._id;

    const staffSize     = manufacturer.staff_size || '';
    const annualRevenue = manufacturer.annual_revenue || '';

    const isVerified     = manufacturer.verification_status === 'verified' || manufacturer.user_id?.is_verified;
    const isPlanVerified = !!(manufacturer.user_id?.subscription_plan?.has_verified_badge && isVerified);
    const isPremium      = manufacturer.user_id?.subscription_plan?.level >= 4
                         || manufacturer.user_id?.subscription_plan?.name === 'Premium';

    const avgRating   = typeof manufacturer.avgRating   === 'number' ? manufacturer.avgRating   : 0;
    const reviewCount = typeof manufacturer.reviewCount === 'number' ? manufacturer.reviewCount : 0;

    /* ── dynamic feature tags ── */
    const featureTags = [];
    if ((manufacturer.products_count > 0 || products.length > 0) && !isB2C) featureTags.push('Low MOQ');

    featureTags.push('On-time delivery 98%');
    if (manufacturer.capabilities?.length || manufacturer.certifications?.length)
        featureTags.push('Customization Available');
    if (featureTags.length < 3) featureTags.push('Quality Assured');

    /* ── chat handler ── */
    const handleChat = (e: React.MouseEvent) => {
        e.preventDefault();
        const sellerUser = manufacturer.user_id;
        if (sellerUser?._id) {
            openChat({
                _id: sellerUser._id,
                first_name: sellerUser.first_name || name,
                last_name:  sellerUser.last_name  || '',
                company_name: name,
            });
        }
    };

    return (
        <div className={`mc2-card${isPremium ? ' mc2-premium' : ''}`}>

            {/* ── LEFT: Logo + Company Info ───────────────────── */}
            <div className="mc2-left">
                <div className="mc2-logo-wrap">
                    {logo ? (
                        <img
                            src={getImgUrl(logo)}
                            alt={name}
                            className="mc2-logo-img"
                            onError={e => { (e.target as any).style.display = 'none'; ((e.target as any).nextSibling as any).style.display = 'flex'; }}
                        />
                    ) : null}
                    <div className="mc2-logo-placeholder" style={{ display: logo ? 'none' : 'flex' }}>
                        🏢
                    </div>
                </div>

                <Link href={`/supplier/${supplierUserId}`} className="mc2-company-name">
                    {name}
                </Link>

                {(isPlanVerified || isVerified) && (
                    <div className={`mc2-verified-badge${isPlanVerified ? ' mc2-pro' : ''}`}
                         style={isPlanVerified && manufacturer.user_id?.subscription_plan?.badge_color ? {
                             color: manufacturer.user_id.subscription_plan.badge_color,
                             borderColor: manufacturer.user_id.subscription_plan.badge_color,
                             backgroundColor: `${manufacturer.user_id.subscription_plan.badge_color}1a`
                         } : {}}>
                        <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 
                                     10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 
                                     1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        {isPlanVerified ? 'Verified Pro' : 'Verified'}
                    </div>
                )}

                <div className="mc2-meta-stats">
                    {isNewSupplier ? (
                        <span className="mc2-meta-item text-green-600 font-bold" style={{fontWeight: 600}}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: '2px'}}>
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                            </svg>
                            New
                        </span>
                    ) : (yearsExp > 0 && (
                        <span className="mc2-meta-item">
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                            </svg>
                            {yearsExp} Yrs
                        </span>
                    ))}
                    {staffSize && (
                        <span className="mc2-meta-item">
                            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 
                                         0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 
                                         2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 
                                         3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                            {staffSize}
                        </span>
                    )}
                    {annualRevenue && (
                        <span className="mc2-meta-item">
                            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 
                                         2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 
                                         1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 
                                         1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 
                                         2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 
                                         3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                            </svg>
                            {annualRevenue}
                        </span>
                    )}
                    <span className="mc2-meta-item text-orange-600 font-bold" style={{ color: 'var(--primary-color, #ff6600)', fontWeight: 600 }}>
                        <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '3px' }}>
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                        {followersCount} Followers
                    </span>
                </div>

                {avgRating > 0 && (
                    <div className="mc2-rating-row">
                        <span className="mc2-rating-val">{avgRating.toFixed(1)}</span>
                        <Stars rating={avgRating} />
                        <span className="mc2-review-count">({reviewCount} reviews)</span>
                    </div>
                )}
            </div>

            {/* ── CENTER: Description + Tags + Products Swiper ─── */}
            <div className="mc2-center">
                <p className="mc2-description">
                    <strong>Main Business:</strong>{' '}
                    {description.length > 160
                        ? description.slice(0, 160) + '…'
                        : description}
                </p>

                <div className="mc2-feature-tags">
                    {featureTags.map((tag, i) => (
                        <span key={i} className="mc2-feat-tag">
                            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mc2-products-swiper-wrap">
                    {products.length > 0 ? (
                        <>
                            <button ref={prevRef} className="mc2-nav-btn mc2-nav-prev" aria-label="Previous">
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <button ref={nextRef} className="mc2-nav-btn mc2-nav-next" aria-label="Next">
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                            <Swiper
                                modules={[Navigation]}
                                slidesPerView={3}
                                spaceBetween={8}
                                navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                                onSwiper={(swiper) => {
                                    setTimeout(() => {
                                        if (swiper.params?.navigation && typeof swiper.params.navigation === 'object') {
                                            (swiper.params.navigation as any).prevEl = prevRef.current;
                                            (swiper.params.navigation as any).nextEl = nextRef.current;
                                            swiper.navigation.destroy();
                                            swiper.navigation.init();
                                            swiper.navigation.update();
                                        }
                                    });
                                }}
                                className="mc2-swiper"
                            >
                            {products.map((product: any, idx: number) => (
                                <SwiperSlide key={product._id || idx}>
                                    <Link
                                        href={`/product/${product.slug || product._id}`}
                                        className="mc2-prod-slide"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <div className="mc2-prod-img-box">
                                            <img
                                                src={getImgUrl(
                                                    product.images?.[0] || product.main_image,
                                                    'https://placehold.co/120x120/f5f5f5/bbb?text=No+Image'
                                                )}
                                                alt={product.name || 'Product'}
                                                onError={e => {
                                                    (e.target as any).src = 'https://placehold.co/120x120/f5f5f5/bbb?text=No+Image';
                                                }}
                                            />
                                        </div>
                                        <div className="mc2-prod-price">
                                            {convertPrice(
                                                product.main_price
                                                || product.price_tiers?.[0]?.price
                                                || 0
                                            ).formatted}
                                        </div>
                                        {!isB2C && (
                                            <div className="mc2-prod-moq">
                                                Min. order: {product.moq || 1}{' '}
                                                {product.moq_unit || 'pieces'}
                                            </div>
                                        )}

                                    </Link>
                                </SwiperSlide>
                            ))}
                            </Swiper>
                        </>
                    ) : (
                        <div className="mc2-no-products">
                            <svg width="32" height="32" fill="none" stroke="#ddd" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                            </svg>
                            <span>No products listed yet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Action Buttons ────────────────────────── */}
            <div className="mc2-right">
                <button className="mc2-btn mc2-btn-chat" onClick={handleChat}>
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 
                                 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    Chat Now
                </button>
                <Link href={`/supplier/${supplierUserId}`} className="mc2-btn mc2-btn-contact">
                    Contact Supplier
                </Link>
                <button 
                    className={`mc2-btn ${isFollowing ? 'mc2-btn-following' : 'mc2-btn-follow'}`} 
                    onClick={handleFollow}
                    style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: isFollowing ? '#e2e8f0' : 'transparent',
                        color: isFollowing ? '#334155' : 'var(--primary-color, #ff6600)',
                        border: isFollowing ? '1px solid #cbd5e1' : '1px solid var(--primary-color, #ff6600)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%',
                        fontWeight: 600
                    }}
                >
                    {isFollowing ? (
                        <>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                            Following
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                            Follow
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ManufacturerCard;
