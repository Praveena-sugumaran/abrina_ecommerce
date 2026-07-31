import React from 'react';
import { useAuth } from '@/context/AuthContext';


const WhyChooseUs = ({ config }: { config?: any }) => {
    const { siteSettings } = useAuth();
    const isB2C = siteSettings?.rfq_enabled === false;

    const defaultFeatures = [

        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
            title: 'Verified Suppliers',
            desc: 'Every supplier is vetted, verified, and certified before listing on our platform.',
            color: '#10b981',
            bg: '#ecfdf5',
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
            title: 'Secure Payments',
            desc: 'Trade Assurance protects every transaction with bank-grade payment security.',
            color: '#6366f1',
            bg: '#eef2ff',
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
            title: 'Worldwide Shipping',
            desc: 'We connect 190+ countries with reliable logistics and delivery tracking.',
            color: '#f59e0b',
            bg: '#fffbeb',
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
            title: 'AI-Powered Sourcing',
            desc: 'Smart AI helps you find the best products and prices in seconds.',
            color: 'var(--primary)',
            bg: 'var(--clr-primary-light)',
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
            title: '24/7 Support',
            desc: 'Our dedicated support team is available around the clock, any time zone.',
            color: '#ec4899',
            bg: '#fdf2f8',
        },
        {
            icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
            title: isB2C ? 'Order Flexibility' : 'MOQ Flexibility',
            desc: isB2C ? 'Buy exactly what you need with flexible options and fast delivery.' : 'Find suppliers who match your order quantities — from 1 piece to millions.',
            color: '#f97316',
            bg: '#fff7ed',
        },

    ];

    const defaultStats = [
        { num: '40M+', label: 'Products Listed' },
        { num: '200K+', label: 'Verified Suppliers' },
        { num: '5M+', label: 'Happy Buyers' },
        { num: '190+', label: 'Countries' },
        { num: '24/7', label: 'Support' }
    ];

    const displayFeatures = config?.data?.features?.length > 0 
        ? config.data.features.map((f: any, i: number) => ({ ...f, ...defaultFeatures[i] })) // Merge to keep icons/colors
        : defaultFeatures;

    const displayStats = config?.data?.stats?.length > 0
        ? config.data.stats
        : defaultStats;

    return (
        <section className="why-section">
            <div className="container">
                <div className="why-header">
                    <div className="why-eyebrow">✦ Why us</div>
                    <h2 className="why-title">{config?.title || <>Why <span>Choose Us</span></>}</h2>
                    <p className="why-subtitle">
                        {config?.subtitle || (isB2C ? 'The most trusted online marketplace built for convenience, efficiency, and growth' : 'The most trusted B2B marketplace built for global trade, efficiency, and growth')}
                    </p>

                </div>

                <div className="why-grid">
                    {displayFeatures.map((feature: any, i: number) => (
                        <div key={i} className="why-card">
                            <div
                                className="why-icon-wrap"
                                style={{ background: feature.bg, color: feature.color }}
                            >
                                <span className="why-icon">{feature.icon}</span>
                            </div>
                            <h3 className="why-card-title">{feature.title || defaultFeatures[i].title}</h3>
                            <p className="why-card-desc">{feature.desc || defaultFeatures[i].desc}</p>
                        </div>
                    ))}
                </div>

                {/* Trust badges bar */}
                <div className="why-trust-bar">
                    {displayStats.map((stat: any, i: number) => (
                        <React.Fragment key={i}>
                            <div className="trust-item">
                                <span className="trust-num">{stat.num}</span>
                                <span className="trust-label">{stat.label}</span>
                            </div>
                            {i < displayStats.length - 1 && <div className="trust-divider" />}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
