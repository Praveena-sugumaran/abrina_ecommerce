import React, { useState } from 'react';
import Link from 'next/link';

import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';

const AppPromoSection = ({ config }: { config?: any }) => {
    const { t } = useAuth();
    const [imgError, setImgError] = useState(false);
    return (
        <section className="app-promo-section">
            <div className="container">
                <div className="app-promo-inner">
                    {/* Left content */}
                    <div className="app-promo-content">
                        <div className="app-promo-tag">{t('mobile_app') || 'Mobile App'}</div>
                        <h2 className="app-promo-title">
                            {config?.title ? config.title : (
                                <>{t('trade_on_the_go') || 'Trade on the Go with Our'} <span className="app-highlight">{t('mobile_app') || 'Mobile App'}</span></>
                            )}
                        </h2>
                        <p className="app-promo-desc">
                            {config?.subtitle || t('app_promo_desc_fallback') || 'Source products, manage orders, chat with suppliers, and track shipments — all from the palm of your hand.'}
                        </p>

                        <div className="app-features">
                            {(config?.data?.features || [
                                { label: t('rt_notifications') || 'Real-time notifications', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
                                { label: t('instant_chat') || 'Instant supplier chat', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
                                { label: t('order_tracking') || 'Order tracking', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                                { label: t('ai_image_search') || 'AI image search', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> }
                            ]).map((f: any, i: number) => (
                                <div key={i} className="app-feature">
                                    <span>{f.icon}</span>
                                    <span>{f.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="app-store-btns">
                            <a
                                href={config?.data?.appStoreLink || '#'}
                                target={config?.data?.appStoreLink ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className="store-btn store-ios"
                                aria-label="Download on App Store"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                </svg>
                                <div className="store-text">
                                    <span className="store-sub">{t('download_on_the') || 'Download on the'}</span>
                                    <span className="store-main">App Store</span>
                                </div>
                            </a>
                            <a
                                href={config?.data?.googlePlayLink || '#'}
                                target={config?.data?.googlePlayLink ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className="store-btn store-android"
                                aria-label="Get it on Google Play"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.581c.57.33.92.96.92 1.647s-.35 1.317-.92 1.647L15.388 15.8l-2.303-2.303 2.303-2.303 2.31 1.432zM5.864 2.658L16.8 9.002l-2.302 2.302-8.635-8.646z" />
                                </svg>
                                <div className="store-text">
                                    <span className="store-sub">{t('get_it_on') || 'Get it on'}</span>
                                    <span className="store-main">Google Play</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Right: QR + phone mockup / Custom Image */}
                    <div className="app-promo-visual">
                        {config?.data?.image && !imgError ? (
                            <img
                                src={getImgUrl(config.data.image)}
                                alt="Mobile App Thumbnail"
                                className="app-promo-custom-img"
                                style={{ width: '260px', borderRadius: '32px', zIndex: 2, height: 'auto', objectFit: 'contain', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="app-phone-mockup">
                                <div className="phone-screen">
                                    <div className="phone-screen-inner">
                                        <div className="mock-header">
                                            <span className="mock-logo">AliExpress</span>
                                        </div>
                                        <div className="mock-search"></div>
                                        <div className="mock-products">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="mock-product-card">
                                                    <div className="mock-product-img" />
                                                    <div className="mock-product-info">
                                                        <div className="mock-bar" />
                                                        <div className="mock-bar short" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="phone-notch" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AppPromoSection;
