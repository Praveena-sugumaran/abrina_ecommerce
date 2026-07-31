'use client';
import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Supplier {
    first_name: string;
    last_name: string;
    company_name: string;
}

interface Coupon {
    _id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    max_discount_amount: number | null;
    end_date: string;
    supplier: Supplier | null;
}

interface HomeCouponsProps {
    coupons: Coupon[];
}

const PRIMARY = 'var(--primary-color)';
const GOLD = '#b8962e'; // kept for expiry warning only

const HomeCoupons = ({ coupons }: HomeCouponsProps) => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    const scrollNext = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: 360, behavior: 'smooth' });
        }
    };

    const scrollPrev = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: -360, behavior: 'smooth' });
        }
    };

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code).catch(() => {
            const el = document.createElement('textarea');
            el.value = code;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        });
        setCopiedId(id);
        showToast(`Promo code "${code}" copied!`, 'success');
        setTimeout(() => setCopiedId(null), 2500);
    };

    if (!coupons || coupons.length === 0) return null;

    return (
        <>
            <style>{`
                .hcv3-slider-container {
                    position: relative;
                    width: 100%;
                }
                .hcv3-grid {
                    display: flex;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    gap: 20px;
                    align-items: stretch;
                    padding: 8px 4px 20px 4px;
                    margin: 0 -4px;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE and Edge */
                    -webkit-overflow-scrolling: touch;
                }
                .hcv3-grid::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }
                .hcv3-card {
                    position: relative;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 20px 24px;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    height: auto;
                    align-self: stretch;
                    box-sizing: border-box;
                    overflow: visible !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                    flex: 0 0 340px;
                }
                .hcv3-card::before {
                    content: '';
                    position: absolute;
                    left: -9px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 18px;
                    height: 18px;
                    background: #ffffff;
                    border-radius: 50%;
                    border-right: 1px solid #e5e7eb;
                    box-shadow: inset -3px 0 5px rgba(15, 23, 42, 0.03);
                    z-index: 2;
                    transition: border-color 0.3s;
                }
                .hcv3-card::after {
                    content: '';
                    position: absolute;
                    right: -9px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 18px;
                    height: 18px;
                    background: #ffffff;
                    border-radius: 50%;
                    border-left: 1px solid #e5e7eb;
                    box-shadow: inset 3px 0 5px rgba(15, 23, 42, 0.03);
                    z-index: 2;
                    transition: border-color 0.3s;
                }
                .hcv3-card:hover {
                    box-shadow: 0 16px 36px -10px rgba(255, 102, 0, 0.12), 0 4px 12px rgba(15, 23, 42, 0.02) !important;
                    transform: translateY(-6px);
                    border-color: rgba(255, 102, 0, 0.25);
                }
                .hcv3-card:hover::before,
                .hcv3-card:hover::after {
                    border-color: rgba(255, 102, 0, 0.25);
                }
                .hcv3-card-placeholder {
                    background: #fafafa;
                    border: 1.5px dashed #e5e7eb;
                    border-radius: 12px;
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: auto;
                    align-self: stretch;
                    box-sizing: border-box;
                    gap: 10px;
                    box-shadow: none;
                    transition: all 0.3s ease;
                    flex: 0 0 340px;
                }
                .hcv3-card-placeholder:hover {
                    border-color: var(--primary-color);
                    background: #fff9f5;
                }
                .hcv3-divider {
                    border-top: 1.5px dashed #e5e7eb;
                    margin: 14px 0;
                    position: relative;
                }
                .hcv3-copy-btn {
                    transition: background 0.18s, transform 0.14s;
                }
                .hcv3-copy-btn:hover {
                    filter: brightness(1.1);
                }
                .hcv3-copy-btn:active {
                    transform: scale(0.96);
                }
                @keyframes hcv3-fadein {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .hcv3-card { animation: hcv3-fadein 0.4s ease both; }
                .hcv3-card:nth-child(1) { animation-delay: 0.05s; }
                .hcv3-card:nth-child(2) { animation-delay: 0.12s; }
                .hcv3-card:nth-child(3) { animation-delay: 0.19s; }
                
                .hcv3-swiper-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 10;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #4b5563;
                }
                .hcv3-swiper-nav:hover {
                    background: var(--primary-color);
                    color: #fff;
                    border-color: var(--primary-color);
                    box-shadow: 0 6px 20px rgba(255, 102, 0, 0.25);
                }
                .hcv3-swiper-prev {
                    left: -20px;
                }
                .hcv3-swiper-next {
                    right: -20px;
                }
                @media (max-width: 768px) {
                    .hcv3-swiper-nav {
                        display: none;
                    }
                    .hcv3-card, .hcv3-card-placeholder {
                        flex: 0 0 280px;
                    }
                }
            `}</style>

            <section style={{
                background: '#fff',
                padding: '40px 0 36px',
                borderTop: '1px solid #f3f4f6',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

                    {/* ── Header ── */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '28px',
                        flexWrap: 'wrap',
                        gap: '16px',
                    }}>
                        <div style={{ maxWidth: '560px' }}>
                            {/* Tag chip */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(13,46,103,0.07)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                marginBottom: '14px',
                            }}>
                                <span style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: PRIMARY,
                                    display: 'inline-block',
                                    flexShrink: 0,
                                }} />
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '1.4px',
                                    textTransform: 'uppercase',
                                    color: PRIMARY,
                                }}>
                                    Limited Time Priority Offers
                                </span>
                            </div>

                            {/* Heading */}
                            <h2 style={{
                                margin: '0 0 10px 0',
                                fontSize: '24px',
                                fontWeight: 800,
                                color: '#111827',
                                lineHeight: 1.2,
                                letterSpacing: '-0.02em',
                            }}>
                                Exclusive{' '}
                                <span style={{ color: PRIMARY }}>Promo Codes</span>
                                {' '}& Vouchers
                            </h2>

                            {/* Subtitle */}
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#6b7280',
                                lineHeight: 1.5,
                            }}>
                                Unlock preferential rates for your wholesale procurement.{' '}
                                Applied automatically or via manual entry at settlement.
                            </p>
                        </div>

                        {/* Active count badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(13,46,103,0.05)',
                            border: '1px solid rgba(13,46,103,0.12)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                        }}>
                            <span style={{
                                fontSize: '22px',
                                fontWeight: 800,
                                color: PRIMARY,
                                lineHeight: 1,
                            }}>{coupons.length}</span>
                            <div>
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: PRIMARY,
                                    lineHeight: 1.2,
                                }}>Active</div>
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: '#6b7280',
                                    lineHeight: 1.2,
                                }}>Privileges</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Cards Slider ── */}
                    <div className="hcv3-slider-container">
                        <button
                            onClick={scrollPrev}
                            className="hcv3-swiper-nav hcv3-swiper-prev"
                            aria-label="Previous coupon"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={scrollNext}
                            className="hcv3-swiper-nav hcv3-swiper-next"
                            aria-label="Next coupon"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <div className="hcv3-grid" ref={sliderRef}>
                        {coupons.map((coupon) => {
                            const isPercentage = coupon.discount_type === 'percentage';
                            const isGlobal = !coupon.supplier;
                            const isCopied = copiedId === coupon._id;
                            const daysLeft = Math.ceil((new Date(coupon.end_date).getTime() - Date.now()) / 86400000);
                            const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;

                            const supplierName = coupon.supplier?.company_name
                                || (coupon.supplier
                                    ? `${coupon.supplier.first_name} ${coupon.supplier.last_name}`.trim()
                                    : 'All Platform Suppliers');

                            const expiryStr = new Date(coupon.end_date).toLocaleDateString('en-US', {
                                month: 'short', day: '2-digit'
                            }).toUpperCase();

                            const discountLabel = isGlobal
                                ? 'GLOBAL DISCOUNT TIER'
                                : 'OFF PROCUREMENT TOTAL';

                            return (
                                <div
                                    key={coupon._id}
                                    className="hcv3-card"
                                >
                                    {/* Top: Type badge + Expiry */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}>
                                            <div style={{
                                                width: '2px',
                                                height: '13px',
                                                background: PRIMARY,
                                                borderRadius: '2px',
                                                flexShrink: 0,
                                            }} />
                                            <span style={{
                                                fontSize: '9.5px',
                                                fontWeight: 800,
                                                letterSpacing: '1.4px',
                                                textTransform: 'uppercase',
                                                color: '#374151',
                                            }}>
                                                {isGlobal ? 'Platform Wide' : 'Supplier Specific'}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '9.5px',
                                            fontWeight: 800,
                                            letterSpacing: '1.2px',
                                            textTransform: 'uppercase',
                                            color: isExpiringSoon ? '#dc2626' : '#b45309',
                                        }}>
                                            {isExpiringSoon ? `⚡ ${daysLeft}D LEFT` : `Expires: ${expiryStr}`}
                                        </span>
                                    </div>

                                    {/* Discount Value */}
                                    <div style={{
                                        fontSize: '36px',
                                        fontWeight: 900,
                                        color: '#111827',
                                        lineHeight: 1,
                                        letterSpacing: '-1px',
                                        marginBottom: '4px',
                                    }}>
                                        {isPercentage
                                            ? `${coupon.discount_value}%`
                                            : `$${coupon.discount_value}`}
                                    </div>
                                    <div style={{
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        letterSpacing: '1.4px',
                                        textTransform: 'uppercase',
                                        color: '#9ca3af',
                                        marginBottom: '10px',
                                    }}>
                                        {discountLabel}
                                    </div>

                                    {/* Dashed separator */}
                                    <div className="hcv3-divider" />

                                    {/* Supplier name */}
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#111827',
                                        marginBottom: '3px',
                                        lineHeight: 1.3,
                                    }}>
                                        {supplierName}
                                    </div>
                                    <div style={{
                                        fontSize: '11.5px',
                                        color: '#6b7280',
                                        marginBottom: '12px',
                                    }}>
                                        Minimum Order Value:{' '}
                                        <span style={{
                                            fontWeight: 600,
                                            color: '#374151',
                                        }}>
                                            ${coupon.min_order_amount.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Code + Copy */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '0',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '7px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            flex: 1,
                                            padding: '9px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            letterSpacing: '1.2px',
                                            textTransform: 'uppercase',
                                            color: '#374151',
                                            background: '#fafafa',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            userSelect: 'all',
                                        }}>
                                            {coupon.code}
                                        </div>
                                        <button
                                            className="hcv3-copy-btn"
                                            onClick={() => handleCopy(coupon.code, coupon._id)}
                                            style={{
                                                background: isCopied ? '#059669' : PRIMARY,
                                                color: '#fff',
                                                border: 'none',
                                                padding: '9px 16px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                letterSpacing: '0.8px',
                                                textTransform: 'uppercase',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {isCopied ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Placeholder card: "New Privileges Unlocking Soon" */}
                        <div
                            className="hcv3-card-placeholder"
                        >
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                border: `1.5px solid #d1d5db`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9ca3af',
                                fontSize: '22px',
                                fontWeight: 300,
                            }}>
                                +
                            </div>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '1.6px',
                                textTransform: 'uppercase',
                                color: '#9ca3af',
                                textAlign: 'center',
                            }}>
                                New Privileges<br />Unlocking Soon
                            </span>
                        </div>
                    </div>
                    </div>

                </div>
            </section>
        </>
    );
};

export default HomeCoupons;
