import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import '../css/Footer.css';

interface FooterLink {
    title: string;
    url: string;
}

interface FooterSection {
    _id: string;
    label: string;
    links: FooterLink[];
}

const Footer = () => {
    const { t, siteSettings } = useAuth();
    const location = usePathname();
    const [sections, setSections] = useState<FooterSection[]>([]);

    useEffect(() => {
        const fetchFooter = async () => {
            try {
                const { data } = await api.get('/common/footer-sections');
                if (data && data.length > 0) {
                    setSections(data);
                }
            } catch (err) {
                console.error('Failed to load dynamic footer', err);
            }
        };
        fetchFooter();
    }, []);

    const isDashboard = location === '/dashboard' ||
        location.startsWith('/supplier/dashboard') ||
        location.startsWith('/admin') ||
        location.startsWith('/buyer/dashboard');

    if (isDashboard) {
        return null;
    }

    // Dynamic Helper to parse link titles and return correct theme icon
    const getLinkIcon = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('ship') || t.includes('deliver') || t.includes('track') || t.includes('logistics') || t.includes('policy')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4l-3-3h-4v7z" />
                </svg>
            );
        }
        if (t.includes('faq') || t.includes('question') || t.includes('help') || t.includes('guide')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        }
        if (t.includes('support') || t.includes('headset') || t.includes('center') || t.includes('service')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
            );
        }
        if (t.includes('collection') || t.includes('category') || t.includes('all') || t.includes('shop') || t.includes('product')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            );
        }
        if (t.includes('best') || t.includes('seller') || t.includes('popular') || t.includes('hot')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
                </svg>
            );
        }
        if (t.includes('new') || t.includes('arrival') || t.includes('fresh') || t.includes('latest')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            );
        }
        if (t.includes('about') || t.includes('company') || t.includes('team') || t.includes('corporate') || t.includes('us')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            );
        }
        if (t.includes('career') || t.includes('job') || t.includes('work') || t.includes('hire') || t.includes('agent')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            );
        }
        if (t.includes('contact') || t.includes('mail') || t.includes('envelope') || t.includes('message')) {
            return (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            );
        }
        return (
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '8px', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        );
    };

    return (
        <footer className="footer-section">
            <div className="container">
                <div className="footer-container">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <div className="logo">
                            <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
                                {(siteSettings?.logo_dark || siteSettings?.logo_light) ? (
                                    <img 
                                        src={getImgUrl(siteSettings.logo_dark || siteSettings.logo_light)} 
                                        alt={siteSettings?.site_name} 
                                        style={{ maxHeight: '40px', objectFit: 'contain' }} 
                                    />
                                ) : (
                                    <>
                                        <div className="logo-icon">{siteSettings?.site_name?.charAt(0) || 'A'}</div>
                                        <span className="logo-text-large" style={{ color: '#ffffff' }}>{siteSettings?.site_name || 'AliExpress Next'}</span>
                                    </>
                                )}
                            </Link>
                        </div>
                        <div className="brand-desc">
                            <p>
                                {siteSettings?.footer_description ||
                                    "A global curated marketplace dedicated to superior craftsmanship and innovative design."}
                            </p>
                        </div>
                        <div className="footer-social-links">
                            {siteSettings?.facebook_url && (
                                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                            )}
                            {siteSettings?.twitter_url && (
                                <a href={siteSettings.twitter_url} target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <i className="fab fa-twitter"></i>
                                </a>
                            )}
                            {siteSettings?.linkedin_url && (
                                <a href={siteSettings.linkedin_url} target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                            )}
                            {siteSettings?.youtube_url && (
                                <a href={siteSettings.youtube_url} target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <i className="fab fa-youtube"></i>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Link Columns */}
                    {sections.map(section => (
                        <div key={section._id} className="footer-column">
                            <h4>{section.label}</h4>
                            <ul>
                                {section.links.map((link, idx) => (
                                    <li key={idx}>
                                        <Link href={link.url} style={{ display: 'flex', alignItems: 'center' }}>
                                            {getLinkIcon(link.title)}
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Newsletter Subscription Column */}
                    <div className="footer-column newsletter-col" style={{ minWidth: '240px' }}>
                        <h4>NEWSLETTER</h4>
                        <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                            Subscribe to receive flash sale notifications, coupons, and trends.
                        </p>
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                                if (!emailInput.value) return;
                                try {
                                    const button = form.querySelector('button') as HTMLButtonElement;
                                    button.disabled = true;
                                    button.innerText = 'Subscribing...';
                                    const { data } = await api.post('/newsletter/subscribe', { email: emailInput.value });
                                    if (data.success) {
                                        emailInput.value = '';
                                        alert('Thank you for subscribing!');
                                    }
                                } catch (err) {
                                    alert('Failed to subscribe. Please try again.');
                                } finally {
                                    const button = form.querySelector('button') as HTMLButtonElement;
                                    button.disabled = false;
                                    button.innerHTML = 'Subscribe <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';
                                }
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                        >
                            <div style={{ position: 'relative', width: '100%' }}>
                                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <input 
                                    type="email" 
                                    name="email" 
                                    placeholder="Your email address" 
                                    required 
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 36px',
                                        borderRadius: '6px',
                                        border: '1px solid #1e293b',
                                        background: '#090d16',
                                        color: '#fff',
                                        fontSize: '13.5px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }} 
                                />
                            </div>
                            <button 
                                type="submit" 
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#ff5500',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Subscribe 
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secure payments. Trusted worldwide.</span>
                    </div>

                    <div className="copyright">
                        {siteSettings?.copyright || `© ${new Date().getFullYear()} ${siteSettings?.site_name || 'B2B'}. All rights reserved.`}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay'].map((provider) => (
                            <div 
                                key={provider} 
                                style={{
                                    border: '1px solid #1e293b',
                                    borderRadius: '4px',
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    background: '#090d16',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {provider === 'Apple Pay' ? ' Pay' : provider === 'Google Pay' ? 'G Pay' : provider}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
