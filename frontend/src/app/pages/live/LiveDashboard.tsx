'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './LiveDashboard.module.css';

interface Stream {
    _id: string;
    supplier_id: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
        profile_image?: string;
        country_code?: string;
    };
    title: string;
    description: string;
    status: 'upcoming' | 'live' | 'ended';
    start_time: string;
    viewer_count: number;
    recording_url?: string;
    products?: any[];
    slug?: string;
}

export default function LiveDashboard() {
    const router = useRouter();
    const { user, currentRole, siteSettings, t } = useAuth();
    const { showToast } = useToast();
    const [streams, setStreams] = useState<Stream[]>([]);
    const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'ended'>('live');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (siteSettings?.live_stream_enabled === false) return;
        const fetchStreams = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/live-streams?status=${activeTab}`);
                setStreams(data || []);
            } catch (err: any) {
                console.error('Failed to load live streams:', err);
                showToast('Failed to load live sessions.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchStreams();
    }, [activeTab, siteSettings]);

    const isSupplier = currentRole === 'supplier' || user?.role === 'supplier';

    if (siteSettings?.live_stream_enabled === false) {
        return (
            <div className={styles['live-container']}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px',
                    border: '1px solid #fee2e2', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)', margin: '40px auto', maxWidth: '600px'
                }}>
                    <span style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 12px 0' }}>
                        Live Streaming Offline
                    </h2>
                    <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0', maxWidth: '440px' }}>
                        Live Streaming services are currently disabled by the platform administrator. Please check back later or explore other sections of the marketplace.
                    </p>
                    <button 
                        onClick={() => router.push('/')}
                        style={{
                            padding: '12px 30px', background: '#ff6a00', color: '#fff', border: 'none',
                            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['live-container']}>
            {/* Header */}
            <div className={styles['live-header']}>
                <div>
                    <h1>{t('live_shows') || 'B2B Live Streams'}</h1>
                    <p>{t('live_shows_desc') || 'Watch live product demonstrations, tour factory floors, and query suppliers instantly.'}</p>
                </div>
                {isSupplier && (
                    <button 
                        onClick={() => router.push('/live/supplier')}
                        className={styles['host-btn']}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7z"/>
                        </svg>
                        {t('host_stream') || 'Host a Stream'}
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className={styles['tabs']}>
                <button 
                    onClick={() => setActiveTab('live')}
                    className={`${styles['tab']} ${activeTab === 'live' ? styles['active'] : ''}`}
                >
                    {t('live_now') || 'Live Now'}
                </button>
                <button 
                    onClick={() => setActiveTab('upcoming')}
                    className={`${styles['tab']} ${activeTab === 'upcoming' ? styles['active'] : ''}`}
                >
                    {t('upcoming') || 'Scheduled'}
                </button>
                <button 
                    onClick={() => setActiveTab('ended')}
                    className={`${styles['tab']} ${activeTab === 'ended' ? styles['active'] : ''}`}
                >
                    {t('replays') || 'Replays & Re-watch'}
                </button>
            </div>

            {/* Streams Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--admin-text-secondary)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Loading live catalog...</div>
                </div>
            ) : streams.length === 0 ? (
                <div className={styles['empty-state']}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="2" y1="7" x2="7" y2="7" />
                        <line x1="2" y1="17" x2="7" y2="17" />
                        <line x1="17" y1="17" x2="22" y2="17" />
                        <line x1="17" y1="7" x2="22" y2="7" />
                    </svg>
                    <h3>{t('no_streams_found') || 'No Live Streamings Found'}</h3>
                    <p>{t('no_streams_found_desc') || 'Check back later or view our archived demo videos.'}</p>
                </div>
            ) : (
                <div className={styles['streams-grid']}>
                    {streams.map((stream) => {
                        const sup = stream.supplier_id || {};
                        const dateStr = new Date(stream.start_time).toLocaleString();

                        return (
                            <div key={stream._id} className={styles['stream-card']}>
                                {/* Thumbnail */}
                                <div className={styles['thumbnail-area']}>
                                    {stream.status === 'live' && (
                                        <span className={styles['live-badge']}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                                            Live
                                        </span>
                                    )}
                                    {stream.status === 'upcoming' && (
                                        <span className={styles['upcoming-badge']}>
                                            Upcoming
                                        </span>
                                    )}
                                    {stream.status === 'ended' && (
                                        <span className={styles['replay-badge']}>
                                            Replay
                                        </span>
                                    )}

                                    {stream.status === 'live' && (
                                        <span className={styles['viewer-badge']}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                            <span style={{ verticalAlign: 'middle' }}>{stream.viewer_count || 0} watching</span>
                                        </span>
                                    )}

                                    {/* Video/Preview Icon */}
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
                                        <polygon points="23 7 16 12 23 17 23 7" />
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                    </svg>
                                </div>

                                {/* Card Details */}
                                <div className={styles['card-content']}>
                                    <div className={styles['supplier-info']}>
                                        <div className={styles['supplier-details']}>
                                            <h4>{sup.company_name || `${sup.first_name} ${sup.last_name}`}</h4>
                                            <span className={styles['supplier-region']}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                </svg>
                                                <span style={{ verticalAlign: 'middle' }}>{sup.country_code ? `Region: ${sup.country_code.toUpperCase()}` : 'Global Supplier'}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className={styles['stream-title']}>{stream.title}</h3>
                                    <p className={styles['stream-desc']}>
                                        {stream.description || 'No description provided.'}
                                    </p>

                                    <div className={styles['card-footer']}>
                                        <span className={styles['product-count']}>
                                            {stream.products?.length || 0} pinned products
                                        </span>

                                        {stream.status === 'live' && (
                                            <button 
                                                onClick={() => router.push(`/live/watch/${stream.slug || stream._id}`)}
                                                className={styles['action-btn']}
                                            >
                                                {t('join_stream') || 'Watch Live'}
                                            </button>
                                        )}
                                        {stream.status === 'upcoming' && (
                                            <button 
                                                onClick={() => showToast('Scheduled reminder registered!', 'success')}
                                                className={`${styles['action-btn']} ${styles['secondary']}`}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '5px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                <span style={{ verticalAlign: 'middle' }}>{dateStr}</span>
                                            </button>
                                        )}
                                        {stream.status === 'ended' && (
                                            <button 
                                                onClick={() => router.push(`/live/watch/${stream.slug || stream._id}`)}
                                                className={`${styles['action-btn']} ${styles['secondary']}`}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '5px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                </svg>
                                                <span style={{ verticalAlign: 'middle' }}>Play Replay</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
