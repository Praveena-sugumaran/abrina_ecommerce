import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';

const FeaturedSuppliers = ({ config }: { config?: any }) => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useAuth();
    const navigate = useRouter();

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const { data } = await api.get('/company/search?limit=4&verified_only=true&t=' + Date.now());
                setSuppliers(data.companies || []);
            } catch (err) {
                console.error('Error fetching suppliers:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuppliers();
    }, []);

    const getInitials = (name: string) => {
        if (!name) return 'S';
        return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <section className="featured-suppliers-section" style={{ background: '#f8fafc' }}>
                <div className="container">
                    <div className="fs-skeletons">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="fs-skeleton" style={{ height: '340px', borderRadius: '16px', background: '#f1f5f9' }} />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="featured-suppliers-section" style={{ padding: '60px 0', background: '#fafbfc', fontFamily: 'Inter, sans-serif' }}>
            <div className="container">
                {/* Section Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }} className="fs-header-responsive">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff5500', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            {t('top_sellers') || 'Top Sellers'}
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                            Discover Our Top-Rated Sellers
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', maxWidth: '600px', lineHeight: 1.5 }}>
                            Partner with verified brands and trusted global stores delivering quality, reliability, and exceptional service.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => navigate.push('/?tab=suppliers')}
                        style={{
                            background: '#fff',
                            border: '1.5px solid #ff5500',
                            color: '#ff5500',
                            fontSize: '13px',
                            fontWeight: 700,
                            padding: '10px 24px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ff5500';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = '#ff5500';
                        }}
                    >
                        {t('view_all_sellers') || 'View All Sellers'} 
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                        </svg>
                    </button>
                </div>

                {/* Grid container */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                    {suppliers.map((supplier: any, idx: number) => {
                        const isFeatured = idx === 0; // First card is featured!
                        const plan = supplier.user_id?.subscription_plan;
                        const isVerified = supplier.verification_status === 'verified';
                        const isPro = !!(plan?.has_verified_badge && isVerified);
                        const countryName = supplier.user_id?.country || supplier.country || 'India';
                        const countryCode = supplier.user_id?.country_code || supplier.country_code || 'IN';

                        // Business tags
                        const businessTypeTags = supplier.business_type 
                            ? supplier.business_type.split(',').map((t: string) => t.trim())
                            : ['Manufacturer'];

                        return (
                            <Link
                                key={supplier._id}
                                href={`/supplier/${supplier.user_id?._id || supplier.user_id}`}
                                style={{
                                    background: isFeatured ? '#fff9f5' : '#ffffff',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
                                    padding: '24px 20px 20px 20px',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.25s ease'
                                }}
                                className="fs-card"
                            >
                                {/* Featured Pill Tab in top-left */}
                                {isFeatured && (
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        background: '#ff5500',
                                        color: '#fff',
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        padding: '4px 10px',
                                        borderBottomRightRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        Featured
                                    </div>
                                )}

                                {/* Main Header: logo + company + verified badge + location */}
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginTop: isFeatured ? '8px' : '0' }}>
                                    <div style={{ flexShrink: 0 }}>
                                        {supplier.logo ? (
                                            <img
                                                src={getImgUrl(supplier.logo)}
                                                alt={supplier.company_name}
                                                style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', background: '#f8fafc', border: '1px solid #f1f5f9' }}
                                                onError={e => {
                                                    (e.target as any).style.display = 'none';
                                                    ((e.target as any).nextSibling as any).style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            style={{
                                                display: supplier.logo ? 'none' : 'flex',
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #ff5500, #ff8c00)',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: '18px',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {getInitials(supplier.company_name)}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={supplier.company_name}>
                                            {supplier.company_name || 'Premium Seller'}
                                        </h4>

                                        {/* Verified status pill */}
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '50px', background: isPro ? '#fffbeb' : '#ecfdf5', border: isPro ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '6px' }}>
                                            <svg width="10" height="10" fill={isPro ? '#f59e0b' : '#10b981'} viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                            </svg>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: isPro ? '#b45309' : '#047857', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                                {isPro ? 'VERIFIED PRO' : 'VERIFIED'}
                                            </span>
                                        </div>

                                        {/* Country / Location with map pin */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '11.5px', fontWeight: 500 }}>
                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{countryCode}, {countryName}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags Row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px', minHeight: '22px' }}>
                                    {businessTypeTags.slice(0, 2).map((tag: string, tid: number) => (
                                        <span key={tid} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '16px 0' }} />

                                {/* Stats row: 3 columns */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', textAlign: 'center' }}>
                                    {/* Products */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', color: '#ff5500', marginBottom: '4px' }}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>Products</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                            {supplier.total_products || supplier.products_count || '0'}
                                        </div>
                                    </div>

                                    {/* Separator */}
                                    <div style={{ width: '1px', height: '24px', background: '#f1f5f9' }} />

                                    {/* Experience */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', color: '#ff5500', marginBottom: '4px' }}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>Experience</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                            {(() => {
                                                const joinDate = supplier.createdAt || supplier.user_id?.createdAt;
                                                if (joinDate) {
                                                    const d = new Date(joinDate);
                                                    const n = new Date();
                                                    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()) return 'New';
                                                }
                                                return supplier.years_experience ? `${supplier.years_experience} Yrs` : 'New';
                                            })()}
                                        </div>
                                    </div>

                                    {/* Separator */}
                                    <div style={{ width: '1px', height: '24px', background: '#f1f5f9' }} />

                                    {/* Response Rate */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', color: '#ff5500', marginBottom: '4px' }}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>Response Rate</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                            {supplier.response_rate ? `${supplier.response_rate}%` : '~95%'}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer View Profile Button */}
                                <div style={{ marginTop: 'auto' }}>
                                    <button
                                        style={{
                                            width: '100%',
                                            background: isFeatured ? 'var(--button-gradient, #ff5500)' : 'transparent',
                                            border: isFeatured ? 'none' : '1.5px solid var(--primary-color, #ff5500)',
                                            color: isFeatured ? '#fff' : 'var(--primary-color, #ff5500)',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        className={isFeatured ? "fs-profile-cta-featured btn-primary" : "fs-profile-cta-outline"}
                                    >
                                        {t('view_profile') || 'View Profile'}
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FeaturedSuppliers;
