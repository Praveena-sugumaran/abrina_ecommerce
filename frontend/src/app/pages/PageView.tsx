'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/services/axiosConfig';

// Mapping slugs to icons for visual enhancement
const PAGE_ICONS = {
    'privacy-policy': '🔐',
    'terms-of-service': '📋',
    'terms-and-conditions': '📋',
    'about-us': '🏢',
    'about': '🏢',
    'contact-us': '📬',
    'contact': '📬',
    'refund-policy': '↩️',
    'shipping-policy': '🚚',
    'cookie-policy': '🍪',
    'disclaimer': '⚠️',
};

const PAGE_GRADIENTS = {
    'privacy-policy': 'linear-gradient(135deg, var(--primary-color) 0%, #1a4fa0 50%, #0ea5e9 100%)',
    'terms-of-service': 'linear-gradient(135deg, #1e3a5f 0%, var(--primary-color) 50%, #2563eb 100%)',
    'terms-and-conditions': 'linear-gradient(135deg, #1e3a5f 0%, var(--primary-color) 50%, #2563eb 100%)',
    'about-us': 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
    'about': 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
    'contact-us': 'linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #a855f7 100%)',
    'contact': 'linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #a855f7 100%)',
    'refund-policy': 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)',
    'shipping-policy': 'linear-gradient(135deg, #164e63 0%, #0e7490 50%, #06b6d4 100%)',
    'default': 'linear-gradient(135deg, var(--primary-color) 0%, #1a4fa0 50%, #3b82f6 100%)',
};

const LoadingProgressBar = ({ loading }) => {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let interval;
        if (loading) {
            setVisible(true);
            setProgress(0);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 30) return prev + 10;
                    if (prev < 60) return prev + 5;
                    if (prev < 90) return prev + 2;
                    if (prev < 98) return prev + 0.5;
                    return prev;
                });
            }, 150);
        } else {
            setProgress(100);
            const timer = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 600);
            return () => clearTimeout(timer);
        }
        return () => clearInterval(interval);
    }, [loading]);

    if (!visible) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999, background: 'transparent', pointerEvents: 'none' }}>
            <div style={{ 
                height: '100%', 
                width: `${progress}%`, 
                background: 'var(--primary-color)', 
                transition: progress === 100 ? 'width 0.4s ease-out, opacity 0.6s ease-in' : 'width 0.4s ease-out',
                opacity: progress === 100 ? 0 : 1,
                boxShadow: '0 0 8px rgba(13, 46, 103, 0.3)'
            }} />
        </div>
    );
};

const PageView = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [headings, setHeadings] = useState([]);
    const [activeHeading, setActiveHeading] = useState('');
    const contentRef = useRef(null);

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/cms/${slug}`);
                setPage(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [slug]);

    // Extract headings for Table of Contents
    useEffect(() => {
        if (page?.content && contentRef.current) {
            const h2s = contentRef.current.querySelectorAll('h2, h3');
            const items = Array.from(h2s).map((el, i) => {
                const id = `section-${i}`;
                el.id = id;
                return { id, text: el.textContent, tag: el.tagName };
            });
            setHeadings(items);
        }
    }, [page]);

    // Track active heading on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;
            const els = contentRef.current.querySelectorAll('h2, h3');
            let current = '';
            els.forEach(el => {
                if (window.scrollY >= el.offsetTop - 120) {
                    current = el.id;
                }
            });
            setActiveHeading(current);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const gradient = PAGE_GRADIENTS[slug] || PAGE_GRADIENTS['default'];
    const icon = PAGE_ICONS[slug] || '📄';

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 56, height: 56, border: '4px solid #e2e8f0',
                        borderTopColor: 'var(--primary-color)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: 14 }}>Loading page...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!page) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
                <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Page Not Found</h2>
                <p style={{ color: '#64748b', marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link href="/" style={{
                    background: 'var(--primary-color)', color: '#fff', padding: '12px 28px',
                    borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 15,
                    transition: 'opacity 0.2s'
                }}>
                    ← Return to Homepage
                </Link>
            </div>
        );
    }

    // Strip leading heading to avoid duplication with our hero
    let displayContent = page.content || '';
    displayContent = displayContent.replace(/^(\s*<h[1-2][^>]*>.*?<\/h[1-2]>)/i, '');

    const formattedDate = new Date(page.updatedAt || Date.now()).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    return (
        <div style={{ background: '#ffffff', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <LoadingProgressBar loading={loading} />

            {/* ── HERO HEADER ── */}
            <div style={{ background: gradient, position: 'relative', overflow: 'hidden', padding: '80px 24px 72px' }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -120, left: -60, width: 440, height: 440, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 40, left: '40%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 28, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        <Link href="/" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = '#fff'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
                        >Home</Link>
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>›</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>{page.title}</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15, margin: '0 0 16px' }}>
                        {page.title}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            Last updated: {formattedDate}
                        </span>
                        {headings.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                {headings.length} sections
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT LAYOUT ── */}
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: headings.length > 2 ? '1fr 280px' : '1fr', gap: 48, alignItems: 'start', paddingTop: 56, paddingBottom: 96 }}>

                {/* Content */}
                <main>
                    {/* The actual rich content rendered from the editor */}
                    <div ref={contentRef} className="pv-content" dangerouslySetInnerHTML={{ __html: displayContent }} />
                </main>

                {/* Sticky Table of Contents */}
                {headings.length > 2 && (
                    <aside style={{ position: 'sticky', top: 90 }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px' }}>
                            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Table of Contents</p>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {headings.map(h => (
                                    <a
                                        key={h.id}
                                        href={`#${h.id}`}
                                        onClick={e => {
                                            e.preventDefault();
                                            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        style={{
                                            display: 'block',
                                            padding: '7px 12px',
                                            borderRadius: 7,
                                            fontSize: h.tag === 'H3' ? 12.5 : 13.5,
                                            fontWeight: h.tag === 'H3' ? 500 : 700,
                                            paddingLeft: h.tag === 'H3' ? 24 : 12,
                                            textDecoration: 'none',
                                            transition: 'all 0.15s',
                                            color: activeHeading === h.id ? 'var(--primary-color)' : '#475569',
                                            background: activeHeading === h.id ? '#e0e8ff' : 'transparent',
                                            borderLeft: activeHeading === h.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                                        }}
                                    >
                                        {h.text}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        {/* Back to top button */}
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            style={{ width: '100%', marginTop: 12, padding: '10px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#1a4fa0'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-color)'}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                            Back to top
                        </button>
                    </aside>
                )}
            </div>

            {/* Cleaned up CSS to avoid overriding editor styles */}
            <style>{`
                .pv-content {
                    font-size: 1.0625rem;
                    line-height: 1.75;
                    color: #334155;
                }
                .pv-content h2, .pv-content h3 {
                    scroll-margin-top: 100px;
                }
                .pv-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                }
                @media (max-width: 768px) {
                    .pv-content { font-size: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default PageView;
