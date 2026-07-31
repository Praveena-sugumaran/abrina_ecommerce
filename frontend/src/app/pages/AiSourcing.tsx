'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useVoiceSearch } from '@/context/VoiceSearchContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AiSourcing.module.css';

// ─── Interfaces ────────────────────────────────────────────────
interface AiFeature {
    icon: React.ReactNode;
    title: string;
    desc: string;
    color: string;
}

interface AiStat {
    icon: React.ReactNode;
    value: string;
    label: string;
}

interface AiHistoryItem {
    _id: string;
    query_text: string;
    createdAt: string;
    results_count?: number;
    status?: string;
}

interface AiProduct {
    _id: string;
    slug?: string;
    name: string;
    images?: string[];
    main_image?: string;
    main_price: number | string;
    unit?: string;
    moq?: number;
}

interface AiSupplier {
    _id: string;
    user_id?: string;
    company_name: string;
    logo?: string;
    business_type?: string;
    country?: string;
    years_in_business?: number;
    rating?: number;
}

interface AiInsight {
    title: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
}

interface AiResults {
    products: AiProduct[];
    suppliers: AiSupplier[];
    insights: AiInsight[];
    summary: string;
}

interface AiLimitInfo {
    usage: number;
    limit: number;
    plan: string;
}

// ─── Feature Cards Data ─────────────────────────────────────────
const AI_FEATURES: AiFeature[] = [
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
        ),
        title: 'Verified Manufacturer Search',
        desc: 'Find certified suppliers with AI-powered matching across 200K+ verified manufacturers globally.',
        color: 'navy',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
            </svg>
        ),
        title: 'Design with AI',
        desc: 'Generate product specs, custom designs, and technical requirements with intelligent assistance.',
        color: 'purple',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
        ),
        title: 'Product Search',
        desc: 'Discover products across 50M+ listings with semantic search that understands context and intent.',
        color: 'teal',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
        title: 'Analyze Bestsellers',
        desc: 'Get deep market insights, price trends, and demand forecasting for any product category.',
        color: 'blue',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        title: 'Evaluate Suppliers',
        desc: 'AI-driven supplier scoring using real trade data, reviews, certifications, and compliance records.',
        color: 'orange',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
        title: 'Market Intelligence',
        desc: 'Real-time competitive analysis, pricing benchmarks, and emerging trend detection worldwide.',
        color: 'green',
    },
];

// ─── Stats Data ─────────────────────────────────────────────────
const AI_STATS: AiStat[] = [
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
        value: '50M+',
        label: 'Products indexed',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        value: '200K+',
        label: 'Verified suppliers',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
        ),
        value: '< 2s',
        label: 'Avg AI response',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
        value: '99.2%',
        label: 'Accuracy rate',
    },
];

// ─── Action Pills ────────────────────────────────────────────────
const ACTION_PILLS = [
    'Verified manufacturer search',
    'Design with AI',
    'Product search',
    'Analyze bestsellers',
    'Evaluate Suppliers',
    'Find trending products',
];

// ─── Recent Chat Item ────────────────────────────────────────────
const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffMs = now - date;
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD === 1) return 'Yesterday';
    return `${diffD} days ago`;
};

// ─── Main Component ──────────────────────────────────────────────
const AiSourcing = () => {
    const { user } = useAuth();
    const { startListening } = useVoiceSearch();
    const navigate = useRouter();
    const textareaRef = useRef(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [view, setView] = useState('home'); // home | results | history
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AiResults>({ products: [], suppliers: [], insights: [], summary: '' });
    const [history, setHistory] = useState<AiHistoryItem[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [limitInfo, setLimitInfo] = useState<AiLimitInfo | null>(null);
    const [showLimitBanner, setShowLimitBanner] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachment(e.target.files[0]);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/ai/history');
            setHistory(data);
        } catch (err) {
            console.error('Failed to fetch AI history', err);
        }
    };

    const fetchUsage = async () => {
        try {
            const { data } = await api.get('/ai/usage');
            setLimitInfo({ usage: data.usage, limit: data.limit, plan: data.plan_name });
            if (data.usage >= data.limit && data.limit !== -1) setShowLimitBanner(true);
        } catch (err) {
            console.error('Failed to fetch AI usage', err);
        }
    };

    useEffect(() => {
        if (view === 'history') fetchHistory();
        if (user) fetchUsage();
    }, [view, user]);

    // Also fetch history on mount to populate sidebar
    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);

    const handleSearch = async (e: React.FormEvent | null = null, forcedInput: string | null = null) => {
        if (e) e.preventDefault();
        const query = forcedInput || input;
        if (!query.trim() && !attachment) return;

        setLoading(true);
        setView('results');
        try {
            let finalQuery = query;
            if (attachment) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', attachment);
                const uploadRes = await api.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data?.url) {
                    const queryText = query.trim() || "Analyze this attached file";
                    finalQuery = `${queryText} (Attachment: ${window.location.origin}${uploadRes.data.url})`;
                }
                setUploading(false);
            }

            const { data } = await api.post('/ai/search', { query: finalQuery });
            setResults(data);
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            if (data.usage !== undefined) {
                setLimitInfo({ usage: data.usage, limit: data.limit, plan: data.plan_name });
                if (data.usage >= data.limit && data.limit !== -1) setShowLimitBanner(true);
            }
            fetchHistory();
        } catch (err: any) {
            console.error('AI Search Error:', err);
            if (err.response?.status === 403) {
                const info = err.response.data;
                setLimitInfo({ usage: info.usage, limit: info.limit, plan: info.current_plan });
                setShowLimitBanner(true);
            } else {
                alert('An error occurred during AI sourcing. Please try again.');
            }
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleNewChat = () => {
        setInput('');
        setResults({ products: [], suppliers: [], insights: [], summary: '' });
        setView('home');
        setDrawerOpen(false);
    };

    // ─── Sidebar ──────────────────────────────────────────────
    const renderSidebar = () => (
        <aside className={styles['ais-sidebar']}>
            <div className={styles['ais-sidebar-top']}>
                <button className={styles['ais-new-chat-btn']} onClick={handleNewChat}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New AI Chat
                </button>
            </div>

            {history.length > 0 && (
                <div className={styles['ais-recent-section']}>
                    <p className={styles['ais-recent-label']}>Recent chats</p>
                    <ul className={styles['ais-chat-list']}>
                        {history.slice(0, 10).map((item) => (
                            <li
                                key={item._id}
                                className={`${styles['ais-chat-item']} ${input === item.query_text ? styles['active'] : ''}`}
                                onClick={() => { setInput(item.query_text); handleSearch(null, item.query_text); setDrawerOpen(false); }}
                            >
                                <div className={styles['ais-chat-icon']}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div className={styles['ais-chat-meta']}>
                                    <span className={styles['ais-chat-query']}>{item.query_text?.length > 35 ? item.query_text.substring(0, 35) + '...' : item.query_text}</span>
                                    <span className={styles['ais-chat-time']}>{formatTimeAgo(item.createdAt)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={styles['ais-sidebar-footer']}>
                <div
                    className={styles['ais-user-pill']}
                    onClick={() => navigate.push(
                        (user?.roles?.includes('supplier') || user?.role === 'supplier')
                            ? '/supplier/dashboard'
                            : '/dashboard'
                    )}
                >
                    <div className={styles['ais-avatar']}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div className={styles['ais-user-info']}>
                        <span className={styles['ais-user-name']}>{user?.name || 'Guest User'}</span>
                        <span className={styles['ais-user-plan']}>{limitInfo?.plan || 'Free Plan'}</span>
                    </div>
                </div>
            </div>
        </aside>
    );

    // ─── Limit Banner ─────────────────────────────────────────
    const renderLimitBanner = () => {
        if (!showLimitBanner || !limitInfo) return null;
        return (
            <div className={styles['ais-limit-banner']}>
                <div className={styles['ais-limit-inner']}>
                    <div className={styles['ais-limit-text']}>
                        <h3>You've reached the {limitInfo.plan} plan limit ({limitInfo.usage}/{limitInfo.limit})</h3>
                        <p>Upgrade with a free trial to unlock more tasks. Cancel anytime.</p>
                    </div>
                    <button className={styles['ais-limit-upgrade']} onClick={() => navigate.push('/dashboard/subscription')}>
                        Start free trial
                    </button>
                    <button className={styles['ais-limit-close']} onClick={() => setShowLimitBanner(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        );
    };

    // ─── Home View ────────────────────────────────────────────
    const renderHome = () => (
        <section className={styles['ais-hero']}>
            <div className={styles['ais-badge-new']}>Beta</div>
            <h1 className={styles['ais-hero-title']}>
                All tasks in one ask, <br />
                <span className={styles['ais-title-accent']}>Smart sourcing with AI</span>
            </h1>

            <p className={styles['ais-hero-subtitle']}>
                Find suppliers, analyze markets, evaluate products — all through natural<br />
                conversation with our AI sourcing assistant.
            </p>

            {renderLimitBanner()}

            {/* Search Box */}
            <div className={styles['ais-search-wrap']}>
                <form className={styles['ais-search-form']} onSubmit={handleSearch}>
                    <textarea
                        ref={textareaRef}
                        className={styles['ais-search-textarea']}
                        placeholder="Describe your needs... e.g. 'Find verified wireless headphone manufacturers in China under $15 MOQ 100pcs'"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSearch();
                            }
                        }}
                        rows={4}
                    />

                    {/* File Attachment Status Bar */}
                    {attachment && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: '#f8fafc', margin: '0 10px 10px 10px', borderRadius: '12px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                📄 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setAttachment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: 0 }}
                                title="Remove attachment"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className={styles['ais-search-bar-footer']}>
                        <div className={styles['ais-attach-btn']} onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }} title="Attach specs, images, or RFQ documents">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span className={styles['ais-attach-text']}>{uploading ? 'Uploading...' : 'Attach product specs, images, or RFQ documents'}</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        />
                        <button
                            type="button"
                            className={styles['ais-mic-btn']}
                            onClick={() => startListening((text) => {
                                setInput(text);
                                handleSearch(null, text);
                            })}
                            title="Voice Search"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </button>
                        <button
                            type="submit"
                            className={`${styles['ais-send-btn']} ${(input.trim() || attachment) ? styles['active'] : ''}`}
                            disabled={(!input.trim() && !attachment) || uploading}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </form>

                {/* Action Pills */}
                <div className={styles['ais-pills']}>
                    {ACTION_PILLS.map((pill) => (
                        <button
                            key={pill}
                            className={styles['ais-pill']}
                            onClick={() => { setInput(pill); handleSearch(null, pill); }}
                        >
                            {pill}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Row */}
            <div className={styles['ais-stats-row']}>
                {AI_STATS.map((stat, i) => (
                    <div className={styles['ais-stat-card']} key={i}>
                        <div className={styles['ais-stat-icon']}>{stat.icon}</div>
                        <div className={styles['ais-stat-value']}>{stat.value}</div>
                        <div className={styles['ais-stat-label']}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* What AI Can Do */}
            <div className={styles['ais-features-section']}>
                <p className={styles['ais-features-label']}>What AI can do for you</p>
                <div className={styles['ais-features-grid']}>
                    {AI_FEATURES.map((feat, i) => (
                        <div className={styles['ais-feature-card']} key={i}>
                            <div className={styles['ais-feat-icon']}>{feat.icon}</div>
                            <h3 className={styles['ais-feat-title']}>{feat.title}</h3>
                            <p className={styles['ais-feat-desc']}>{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Security Banner */}
            <div className={styles['ais-security-banner']}>
                <div className={styles['ais-security-icon']}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <div className={styles['ais-security-text']}>
                    <strong>Enterprise-Grade Security &amp; Privacy</strong>
                    <p>Your queries and business data are encrypted and never shared with third parties. SOC 2 Type II compliant.</p>
                </div>
                <div className={styles['ais-security-badges']}>
                    <span className={styles['ais-sec-badge']}>SOC 2<br /><small>Compliant</small></span>
                    <span className={styles['ais-sec-badge']}>ISO 27001<br /><small>Certified</small></span>
                    <span className={styles['ais-sec-badge']}>GDPR<br /><small>Ready</small></span>
                </div>
            </div>
        </section>
    );

    // ─── Results View ─────────────────────────────────────────
    const renderResults = () => (
        <div className={styles['ais-results-page']}>
            {/* Compact search bar */}
            <div className={styles['ais-compact-bar']}>
                <span className={styles['ais-sparkle']}>✦</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ask anything about sourcing..."
                />
                <button className={styles['ais-compact-send']} onClick={handleSearch}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                </button>
            </div>

            {renderLimitBanner()}

            {loading ? (
                <div className={styles['ais-loading']}>
                    <div className={styles['ais-spinner']} />
                    <p>AI is processing your sourcing request...</p>
                </div>
            ) : (
                <div className={styles['ais-results-inner']}>
                    {results.summary && (
                        <div className={styles['ais-summary-card']}>
                            <span className={styles['ais-summary-icon']}>✦</span>
                            <p>{results.summary}</p>
                        </div>
                    )}

                    {results.products?.length > 0 && (
                        <div className={styles['ais-result-section']}>
                            <h2 className={styles['ais-section-title']}>Matching Products</h2>
                            <div className={styles['ais-products-grid']}>
                                {results.products.map((prod) => (
                                    <div key={prod._id} className={styles['ais-product-card']} onClick={() => prod._id && navigate.push(`/product/${prod.slug || prod._id}`)}>
                                        <div className={styles['ais-prod-img-wrap']}>
                                            <img
                                                src={getImgUrl(prod.images?.[0] || prod.main_image)}
                                                alt={prod.name}
                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400?text=Product')}
                                            />
                                            <div className={styles['ais-prod-badge']}>Top Match</div>
                                        </div>
                                        <div className={styles['ais-prod-body']}>
                                            <h3 className={styles['ais-prod-name']}>{prod.name}</h3>
                                            <div className={styles['ais-prod-price']}>
                                                <span className={styles['ais-price-currency']}>$</span>
                                                <span className={styles['ais-price-amount']}>{prod.main_price}</span>
                                                <span className={styles['ais-price-unit']}>/{prod.unit || 'pc'}</span>
                                            </div>
                                            <div className={styles['ais-prod-moq']}>Min. Order: {prod.moq || 1} {prod.unit || 'pcs'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.suppliers?.length > 0 && (
                        <div className={styles['ais-result-section']}>
                            <h2 className={styles['ais-section-title']}>Verified Suppliers</h2>
                            <div className={styles['ais-suppliers-grid']}>
                                {results.suppliers.map((sup) => (
                                    <div key={sup._id} className={styles['ais-supplier-card']} onClick={() => sup.user_id && navigate.push(`/supplier/${sup.user_id}`)}>
                                        <div className={styles['ais-sup-logo']}>
                                            <img
                                                src={getImgUrl(sup.logo)}
                                                alt={sup.company_name}
                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=Logo')}
                                            />
                                        </div>
                                        <div className={styles['ais-sup-info']}>
                                            <div className={styles['ais-sup-header']}>
                                                <h4>{sup.company_name}</h4>
                                                <span className={styles['ais-verified-badge']}>✓ Verified</span>
                                            </div>
                                            <p className={styles['ais-sup-meta']}>{sup.business_type} · {sup.country} · {sup.years_in_business || 5} YRS</p>
                                            <div className={styles['ais-sup-stats']}>
                                                <span>⭐ {sup.rating || 4.8}</span>
                                                <span>💬 24h Response</span>
                                            </div>
                                        </div>
                                        <button className={styles['ais-contact-btn']}>Inquiry Now</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.insights?.length > 0 && (
                        <div className={styles['ais-result-section']}>
                            <h2 className={styles['ais-section-title']}>Market Insights</h2>
                            <div className={styles['ais-insights-grid']}>
                                {results.insights.map((insight, idx) => (
                                    <div key={idx} className={styles['ais-insight-card']}>
                                        <span className={styles['ais-insight-label']}>{insight.title}</span>
                                        <span className={styles['ais-insight-value']}>{insight.value}</span>
                                        <span className={`${styles['ais-trend']} ${styles[insight.trend]}`}>{insight.trend === 'up' ? '↑' : '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // ─── History View ─────────────────────────────────────────
    const renderHistory = () => (
        <div className={styles['ais-history-page']}>
            <div className={styles['ais-history-header']}>
                <h2>Search History</h2>
                <button className={styles['ais-btn-new']} onClick={() => setView('home')}>New Search</button>
            </div>
            {history.length > 0 ? (
                <div className={styles['ais-history-list']}>
                    {history.map((item) => (
                        <div
                            key={item._id}
                            className={styles['ais-history-item']}
                            onClick={() => { setInput(item.query_text); handleSearch(null, item.query_text); }}
                        >
                            <div className={styles['ais-history-icon']}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                </svg>
                            </div>
                            <div className={styles['ais-history-content']}>
                                <p className={styles['ais-history-query']}>{item.query_text}</p>
                                <p className={styles['ais-history-meta']}>{new Date(item.createdAt).toLocaleString()} · {item.results_count} results</p>
                            </div>
                            <div className={styles['ais-history-status']}>{item.status}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles['ais-empty-history']}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                    <p>No history yet</p>
                    <button className={styles['ais-btn-new']} onClick={() => setView('home')}>Back to search</button>
                </div>
            )}
        </div>
    );

    // ─── Root Render ──────────────────────────────────────────
    return (
        <div className={`${styles['ais-wrapper']} ${drawerOpen ? styles['drawer-open'] : ''}`}>
            {/* Decorative background elements */}
            <div className={styles['ais-blob-1']} />
            <div className={styles['ais-blob-2']} />

            {/* Mobile overlay */}
            {drawerOpen && <div className={styles['ais-drawer-overlay']} onClick={() => setDrawerOpen(false)} />}

            {/* Sidebar */}
            <div className={`${styles['ais-sidebar-container']} ${drawerOpen ? styles['open'] : ''}`}>
                {renderSidebar()}
            </div>

            {/* Main */}
            <main className={styles['ais-main']}>
                {/* Mobile-only hamburger bar */}
                <div className={styles['ais-mobile-bar']}>
                    <button
                        className={styles['ais-hamburger']}
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open chat history"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <span className={styles['ais-mobile-bar-label']}>AI Mode</span>
                    <button className={styles['ais-mobile-new-chat']} onClick={handleNewChat}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        New AI Chat
                    </button>
                </div>

                {/* Content */}
                <div className={styles['ais-content']}>
                    {view === 'home' && renderHome()}
                    {view === 'results' && renderResults()}
                    {view === 'history' && renderHistory()}
                </div>
            </main>
        </div>
    );
};

export default AiSourcing;
