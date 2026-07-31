'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './BuyerLiveWatch.module.css';

interface Product {
    _id: string;
    name: string;
    main_image: string;
    main_price: number;
}

interface Stream {
    _id: string;
    supplier_id: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
        profile_image?: string;
    };
    title: string;
    description: string;
    status: 'upcoming' | 'live' | 'ended';
    playback_url?: string;
    stream_provider?: string;
    viewer_count: number;
    peak_viewers: number;
    recording_url?: string;
    products?: Product[];
    pinned_product?: Product;
}

interface ChatMessage {
    _id?: string;
    senderId?: string;
    senderName: string;
    content: string;
    translation?: string;
    timestamp?: Date;
    isAlert?: boolean;
    text?: string;
    replyToMessageId?: string;
    replyToUserName?: string;
    replyToContent?: string;
}

interface LivePoll {
    question: string;
    options: { text: string; votes: number }[];
}

export default function BuyerLiveWatch({ streamId }: { streamId: string }) {
    const router = useRouter();
    const { user, siteSettings, t, openLogin } = useAuth();
    const { showToast } = useToast();
    const socketRef = useRef<any>(null);
    const zegoContainerRef = useRef<HTMLDivElement>(null);
    const zegoInstanceRef = useRef<any>(null);
    const zegoInitSessionRef = useRef<number>(0);

    if (siteSettings?.live_stream_enabled === false) {
        return (
            <div className={styles['watch-container']}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px',
                    border: '1px solid #fee2e2', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)', margin: '40px auto', maxWidth: '600px'
                }}>
                    <span style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 12px 0' }}>
                        Live Stream Offline
                    </h2>
                    <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0', maxWidth: '440px' }}>
                        This live stream is unavailable because live streaming services have been disabled globally by the platform administrator.
                    </p>
                    <button 
                        onClick={() => router.push('/live')}
                        style={{
                            padding: '12px 30px', background: '#ff6a00', color: '#fff', border: 'none',
                            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Stream & Media States
    const [stream, setStream] = useState<Stream | null>(null);
    const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
    const [viewerCount, setViewerCount] = useState(0);

    // Chat States
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('English');
    const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Revamped Design States
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
        '🌹': 0,
        '💖': 0,
        '🔥': 0,
        '🎸': 0,
        '🧁': 0,
        '🎁': 0
    });
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; char: string; left: number }[]>([]);
    const nextEmojiIdRef = useRef(0);

    const triggerFloatingEmoji = (emoji: string) => {
        const id = nextEmojiIdRef.current++;
        const left = 20 + Math.random() * 60;
        setFloatingEmojis(prev => [...prev, { id, char: emoji, left }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(item => item.id !== id));
        }, 2000);
    };

    const handleSendReaction = (emoji: string) => {
        setReactionCounts(prev => ({
            ...prev,
            [emoji]: (prev[emoji] || 0) + 1
        }));
        triggerFloatingEmoji(emoji);
        if (socketRef.current) {
            socketRef.current.emit('sendReaction', {
                streamId: stream?._id || streamId,
                reactionType: emoji
            });
        }
    };

    // Interaction States
    const [poll, setPoll] = useState<LivePoll | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [handRaised, setHandRaised] = useState(false);

    // Quote Modal States
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteMsg, setQuoteMsg] = useState('');
    const [quoteQty, setQuoteQty] = useState(100);
    const [quoteUnit, setQuoteUnit] = useState('pieces');
    const [submittingQuote, setSubmittingQuote] = useState(false);
    const [quotePrice, setQuotePrice] = useState<number>(0);
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [quoteNotes, setQuoteNotes] = useState<string>('');

    // Connection & Tabbed States
    const [isConnecting, setIsConnecting] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'polls' | 'products'>('chat');
    const [peakViewerCount, setPeakViewerCount] = useState(0);

    // Load initial stream details & message history
    useEffect(() => {
        const fetchStreamAndHistory = async () => {
            try {
                const sRes = await api.get(`/live-streams/${streamId}`);
                setStream(sRes.data);
                setViewerCount(sRes.data?.viewer_count || 0);
                if (sRes.data?.pinned_product) {
                    setPinnedProduct(sRes.data.pinned_product);
                }
                if (sRes.data?.active_poll) {
                    setPoll(sRes.data.active_poll);
                }

                try {
                    const mRes = await api.get(`/live-streams/${streamId}/messages`);
                    const history = (mRes.data || []).map((m: any) => ({
                        _id: m._id,
                        senderId: m.user_id,
                        senderName: m.user_name,
                        content: m.message,
                        translation: m.translated_message,
                        timestamp: m.createdAt,
                        replyToMessageId: m.reply_to_message_id,
                        replyToUserName: m.reply_to_user_name,
                        replyToContent: m.reply_to_content
                    }));
                    setMessages(history);
                } catch (msgErr) {
                    console.warn('Failed to load message history:', msgErr);
                }
            } catch (err) {
                console.error('Failed to load stream details:', err);
                showToast('Failed to load stream details.', 'error');
            }
        };

        if (streamId) {
            fetchStreamAndHistory();
        }
    }, [streamId]);

    // Socket Connection
    useEffect(() => {
        if (!streamId || !stream) return;

        let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
                socketUrl = apiUrl.replace('/api', '');
            } else if (typeof window !== 'undefined') {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (!isLocal) {
                    socketUrl = window.location.origin;
                } else {
                    socketUrl = (apiUrl && apiUrl.startsWith('http')) ? apiUrl.replace('/api', '') : 'http://localhost:5011';
                }
            } else {
                socketUrl = 'http://localhost:5011';
            }
        }

        const socket = io(socketUrl, {
            transports: ['polling', 'websocket'],
            withCredentials: true
        });
        socketRef.current = socket;
        if (typeof window !== 'undefined') {
            (window as any).socket = socket;
        }

        setIsConnecting(true);
        setConnectionError(null);

        socket.on('connect', () => {
            setIsConnected(true);
            setIsConnecting(false);
            setConnectionError(null);
            showToast('Connected to live chat stream room.', 'info');
        });

        socket.on('disconnect', (reason: string) => {
            setIsConnected(false);
            setConnectionError('Connection lost. Reconnecting...');
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });

        socket.on('connect_error', () => {
            setIsConnecting(false);
            setIsConnected(false);
            setConnectionError('Connection error. Retrying to establish live chat...');
        });

        socket.emit('joinStream', stream._id);
        
        socket.off('streamMessageReceived');
        socket.on('streamMessageReceived', (msg: ChatMessage) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.off('reactionReceived');
        socket.on('reactionReceived', (data: { reactionType: string }) => {
            const emoji = data.reactionType;
            setReactionCounts(prev => ({
                ...prev,
                [emoji]: (prev[emoji] || 0) + 1
            }));
            triggerFloatingEmoji(emoji);
        });

        socket.off('streamStatsUpdate');
        socket.on('streamStatsUpdate', (stats: { viewer_count: number; peak_viewers?: number }) => {
            setViewerCount(stats.viewer_count);
            if (stats.peak_viewers !== undefined) {
                setPeakViewerCount(stats.peak_viewers);
            }
        });

        socket.off('productPinned');
        socket.on('productPinned', (product: Product | null) => {
            setPinnedProduct(product);
            if (product) {
                showToast(`New featured product pinned: ${product.name}!`, 'info');
            }
        });

        socket.off('pollStarted');
        socket.on('pollStarted', (pollData: LivePoll) => {
            setPoll(pollData);
            setHasVoted(false);
            showToast('Supplier started a live poll!', 'info');
        });

        socket.off('pollVoteCast');
        socket.on('pollVoteCast', (updatedPoll: LivePoll) => {
            setPoll(updatedPoll);
        });

        socket.off('streamStatusChanged');
        socket.on('streamStatusChanged', (data: { streamId: string; status: 'upcoming' | 'live' | 'ended' }) => {
            if (data.streamId === stream._id) {
                setStream(prev => prev ? { ...prev, status: data.status } : null);
                showToast(`Stream status updated to ${data.status}!`, 'info');
            }
        });

        socket.off('streamTypingUpdated');
        socket.on('streamTypingUpdated', (data: { senderName: string; isTyping: boolean }) => {
            if (data.isTyping) {
                setTypingUser(data.senderName);
            } else {
                setTypingUser(null);
            }
        });

        return () => {
            socket.emit('leaveStream', stream._id);
            socket.off('streamMessageReceived');
            socket.off('reactionReceived');
            socket.off('streamStatsUpdate');
            socket.off('productPinned');
            socket.off('pollStarted');
            socket.off('pollVoteCast');
            socket.off('streamStatusChanged');
            socket.off('streamTypingUpdated');
            socket.disconnect();
        };
    }, [streamId, stream?.status]);

    // ZegoCloud Audience Player Setup
    const initZegoAudience = async (streamId: string, zegoContainer: HTMLDivElement) => {
        const mySessionId = ++zegoInitSessionRef.current;
        setIsConnecting(true);
        setConnectionError(null);
        try {
            const appID = Number(siteSettings?.zego_app_id);
            const serverSecret = siteSettings?.zego_server_secret;
            if (!appID || !serverSecret) {
                showToast('ZegoCloud configurations are missing in Site Settings.', 'error');
                setIsConnecting(false);
                setConnectionError('Configuration missing.');
                return;
            }

            const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');

            if (mySessionId !== zegoInitSessionRef.current) {
                console.log('Zego audience initialization aborted due to new session.');
                return;
            }

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID,
                serverSecret,
                streamId,
                user?._id || `guest_${Date.now()}`,
                user ? `${user.first_name} ${user.last_name}` : 'Guest Viewer'
            );

            const zp = ZegoUIKitPrebuilt.create(kitToken);
            zegoInstanceRef.current = zp;

            // Debug logs to capture WebRTC / Zego events in client browser console
            try {
                let zg = (zp as any).express || null;
                if (!zg && typeof zp.instance === 'function') {
                    zg = zp.instance();
                } else if (!zg && typeof (zp as any).getZegoExpressEngine === 'function') {
                    zg = (zp as any).getZegoExpressEngine();
                }

                if (zg) {
                    console.log('🔍 ZegoExpressEngine instance accessed successfully.');
                    if (typeof window !== 'undefined') {
                        (window as any).zg = zg;
                    }
                    zg.on('publisherStateUpdate', (streamID: string, state: number, errorCode: number, extendedData: any) => {
                        console.log(`[Zego Debug] publisherStateUpdate - StreamID: ${streamID}, State: ${state}, ErrorCode: ${errorCode}`, extendedData);
                    });
                    zg.on('playerStateUpdate', (streamID: string, state: number, errorCode: number, extendedData: any) => {
                        console.log(`[Zego Debug] playerStateUpdate - StreamID: ${streamID}, State: ${state}, ErrorCode: ${errorCode}`, extendedData);
                    });
                    zg.on('roomStateUpdate', (roomID: string, state: number, errorCode: number, extendedData: any) => {
                        console.log(`[Zego Debug] roomStateUpdate - RoomID: ${roomID}, State: ${state}, ErrorCode: ${errorCode}`, extendedData);
                    });
                    zg.on('roomStreamUpdate', (roomID: string, updateType: string, streamList: any[], extendedData: any) => {
                        console.log(`[Zego Debug] roomStreamUpdate - RoomID: ${roomID}, UpdateType: ${updateType}`, streamList, extendedData);
                    });
                } else {
                    console.warn('⚠️ Could not access underlying ZegoExpressEngine instance.');
                }
            } catch (dbgErr) {
                console.warn('⚠️ Zego debug listeners setup failed:', dbgErr);
            }

            zp.joinRoom({
                container: zegoContainer,
                scenario: {
                    mode: ZegoUIKitPrebuilt.LiveStreaming,
                    config: {
                        role: ZegoUIKitPrebuilt.Audience,
                    },
                },
                showPreJoinView: false,
                showTextChat: false, // Native chat disabled
                showUserList: false, // Native user overlay disabled
                showRoomDetailsButton: false,
            });
            setIsConnected(true);
            setIsConnecting(false);
        } catch (err: any) {
            console.error('Zego audience initialization error:', err);
            showToast('Failed to initialize ZegoCloud live stream player.', 'error');
            setIsConnecting(false);
            setConnectionError('Initialization error.');
        }
    };

    useEffect(() => {
        if (stream && stream.status === 'live' && stream.stream_provider === 'zegocloud' && zegoContainerRef.current) {
            initZegoAudience(stream._id, zegoContainerRef.current);
        }
        return () => {
            zegoInitSessionRef.current++; // Invalidate active session
            if (zegoInstanceRef.current) {
                try {
                    zegoInstanceRef.current.destroy();
                } catch (e) {}
                zegoInstanceRef.current = null;
            }
        };
    }, [stream?._id, stream?.status, stream?.stream_provider, zegoContainerRef.current]);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send chat message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        if (!user) {
            showToast('Please log in as a buyer to participate in the chat.', 'error');
            openLogin({ mode: 'login', role: 'buyer' });
            return;
        }

        if (socketRef.current) {
            // Stop typing indicator on send
            socketRef.current.emit('typingInStream', {
                streamId: stream?._id || streamId,
                senderName: `${user.first_name}`,
                isTyping: false
            });

            socketRef.current.emit('sendStreamMessage', {
                streamId: stream?._id || streamId,
                senderId: user._id,
                senderName: `${user.first_name} ${user.last_name}`,
                content: chatInput,
                targetLanguage: autoTranslateEnabled ? targetLanguage : null,
                replyToMessageId: replyingTo?._id || null,
                replyToUserName: replyingTo?.senderName || null,
                replyToContent: replyingTo?.content || null
            });
            setChatInput('');
            setReplyingTo(null);
        }
    };

    // Chat typing logic
    const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
        if (!socketRef.current || !user) return;

        socketRef.current.emit('typingInStream', {
            streamId: stream?._id || streamId,
            senderName: `${user.first_name}`,
            isTyping: true
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socketRef.current && user) {
                socketRef.current.emit('typingInStream', {
                    streamId: stream?._id || streamId,
                    senderName: `${user.first_name}`,
                    isTyping: false
                });
            }
        }, 3000);
    };

    // Cast Poll Vote
    const handleCastVote = (optionIndex: number) => {
        if (hasVoted || !poll) return;

        const updatedOptions = [...poll.options];
        updatedOptions[optionIndex].votes += 1;
        
        const updatedPoll = { ...poll, options: updatedOptions };
        setPoll(updatedPoll);
        setHasVoted(true);

        if (socketRef.current) {
            socketRef.current.emit('pollVoteCast', { streamId: stream?._id || streamId, optionIndex });
        }
        showToast('Vote cast successfully!', 'success');
    };

    // Raise Hand
    const handleRaiseHand = async () => {
        if (!user) {
            showToast('Please log in as a buyer to raise your hand.', 'error');
            openLogin({ mode: 'login', role: 'buyer' });
            return;
        }
        try {
            await api.post(`/live-streams/${stream?._id || streamId}/raise-hand`);
            setHandRaised(true);
            showToast('You raised your hand! The host has been notified.', 'success');
            
            setTimeout(() => {
                setHandRaised(false);
            }, 15000);
        } catch (err) {
            console.error('Raise hand error:', err);
        }
    };

    // Submit Live Quote Request
    const handleSubmitQuoteRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinnedProduct) return;

        if (!user) {
            showToast('Please log in as a buyer to request a quote.', 'error');
            openLogin({ mode: 'login', role: 'buyer' });
            return;
        }
        setSubmittingQuote(true);

        const customMessage = `${quoteMsg}. Target Price: ${quotePrice} USD. Expected Delivery: ${deliveryDate}. Notes: ${quoteNotes}`;

        try {
            await api.post(`/live-streams/${stream?._id || streamId}/quote`, {
                productId: pinnedProduct._id,
                message: customMessage,
                quantity: quoteQty,
                unit: quoteUnit
            });
            showToast('Quote request submitted directly to host!', 'success');
            setShowQuoteModal(false);
            setQuoteMsg('');
            setQuotePrice(0);
            setDeliveryDate('');
            setQuoteNotes('');
        } catch (err: any) {
            console.error('Failed to submit stream quote:', err);
            showToast(err.response?.data?.message || 'Failed to submit quote request.', 'error');
        } finally {
            setSubmittingQuote(false);
        }
    };

    if (!stream) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <h3>Loading Stream workspace...</h3>
            </div>
        );
    }

    const sup = stream.supplier_id || {};

    return (
        <div className={styles['live-viewport-container']}>
            {/* Left Column: Video Stream */}
            <div className={styles['center-video-panel']}>
                {/* Zego Container (Always Mounted to prevent Zego destroy crash) */}
                <div 
                    ref={zegoContainerRef}
                    style={{ 
                        display: (stream.status === 'live' && stream.stream_provider === 'zegocloud') ? 'block' : 'none',
                        width: '100%', 
                        height: '100%', 
                        border: 'none', 
                        background: '#000000' 
                    }}
                />

                {isConnecting && stream.status === 'live' && (
                    <div className={styles['video-placeholder-state']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: '#111' }}>
                        <div className={styles['spinner']} />
                        <h3>Connecting to live stream...</h3>
                    </div>
                )}

                {connectionError ? (
                    <div className={styles['video-placeholder-state']}>
                        <span style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</span>
                        <h3>Connection Error</h3>
                        <p>{connectionError}</p>
                        <button 
                            onClick={() => {
                                if (stream && zegoContainerRef.current) {
                                    initZegoAudience(stream._id, zegoContainerRef.current);
                                }
                            }}
                            className={styles['retry-btn']}
                        >
                            Try Reconnecting
                        </button>
                    </div>
                ) : stream.status === 'live' ? (
                    stream.stream_provider !== 'zegocloud' && (
                        <div className={styles['video-wrapper-inner']} style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video 
                                src={(!stream.playback_url || stream.playback_url.includes('.m3u8') || stream.playback_url.includes('localhost:8080')) 
                                    ? "https://assets.mixkit.co/videos/preview/mixkit-working-in-a-warehouse-40019-large.mp4" 
                                    : stream.playback_url}
                                autoPlay
                                loop
                                muted={isMuted}
                                playsInline
                                controls
                                className={styles['video-element']}
                            />
                        </div>
                    )
                ) : isConnecting ? (
                    <div className={styles['video-placeholder-state']}>
                        <div className={styles['spinner']} />
                        <h3>Connecting to live stream...</h3>
                    </div>
                ) : stream.status === 'ended' ? (
                    <div className={styles['video-placeholder-state']}>
                        <span style={{ fontSize: '48px', marginBottom: '16px' }}>📴</span>
                        <h3>Live Session Ended</h3>
                        <p>Thank you for attending this live showroom show.</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button onClick={() => setShowCatalogDrawer(true)} className={styles['catalog-btn']}>
                                View Products
                            </button>
                            <button onClick={() => router.push('/live')} className={styles['back-dashboard-btn']}>
                                Back to Streams
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles['video-placeholder-state']}>
                        <span style={{ fontSize: '48px', marginBottom: '16px' }}>🕒</span>
                        <h3>Scheduled Live Session</h3>
                        <p>Starts on: {new Date((stream as any).start_time || Date.now()).toLocaleString()}</p>
                    </div>
                )}

                {/* Floating Emojis Render Area */}
                <div className={styles['floating-emojis-container']}>
                    {floatingEmojis.map(emoji => (
                        <span 
                            key={emoji.id} 
                            className={styles['floating-emoji']}
                            style={{ left: `${emoji.left}%` }}
                        >
                            {emoji.char}
                        </span>
                    ))}
                </div>

                {/* Center Panel Bottom Supplier Overlay */}
                {stream.status === 'live' && (
                    <div className={styles['supplier-overlay']}>
                        <div className={styles['supplier-avatar']}>
                            {sup.profile_image ? (
                                <img src={sup.profile_image} alt="Supplier avatar" />
                            ) : (
                                <span>{(sup.company_name || sup.first_name || 'S')[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className={styles['supplier-meta']}>
                            <div className={styles['supplier-name']}>
                                @{sup.company_name ? sup.company_name.toLowerCase().replace(/\s+/g, '') : `${sup.first_name?.toLowerCase() || 'supplier'}`}
                            </div>
                            <div className={styles['supplier-live-status']}>
                                <span className={styles['live-dot']} />
                                LIVE • {viewerCount} viewers
                            </div>
                        </div>
                        <button 
                            className={styles['supplier-chat-trigger-btn']}
                            onClick={() => setShowChat(!showChat)}
                            title="Toggle Chat"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Sleek Floating Pinned Product Card */}
                {pinnedProduct && (
                    <div className={styles['floating-pinned-card']}>
                        <img src={pinnedProduct.main_image} alt={pinnedProduct.name} />
                        <div className={styles['pinned-card-details']}>
                            <h5>{pinnedProduct.name}</h5>
                            <span>Showcase Price: ${pinnedProduct.main_price}</span>
                        </div>
                        <button 
                            onClick={() => setShowQuoteModal(true)}
                            className={styles['pinned-card-quote-btn']}
                        >
                            Get Quote
                        </button>
                    </div>
                )}

                {/* Floating Active Poll Panel */}
                {poll && poll.question && poll.options && poll.options.length > 0 && (
                    <div className={styles['floating-poll-card']}>
                        <h5>Live Poll: {poll.question}</h5>
                        {(() => {
                            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                            return (
                                <div className={styles['poll-options-stack']}>
                                    {poll.options.map((opt, index) => {
                                        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                        return (
                                            <div key={index} className={styles['poll-option-wrapper']}>
                                                <button 
                                                    onClick={() => handleCastVote(index)}
                                                    disabled={hasVoted}
                                                    className={styles['poll-vote-option']}
                                                >
                                                    <span>{opt.text}</span>
                                                    <strong>{opt.votes} ({pct}%)</strong>
                                                </button>
                                                <div className={styles['poll-pct-track']}>
                                                    <div className={styles['poll-pct-fill']} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                        {hasVoted && <p className={styles['poll-thanks']}>Thanks for voting!</p>}
                    </div>
                )}
            </div>

            {/* Right Column: Chat and Info (White background) */}
            <div className={`${styles['side-panel']} ${styles['right-panel']} ${showChat ? '' : styles['hidden-panel']}`}>
                {/* Top Controls: Back, Viewer Count, Raise Hand, Stream Info */}
                <div className={styles['top-controls-left']}>
                    <button 
                        onClick={() => router.push('/live')}
                        className={styles['circle-btn']}
                        title="Back to Streams"
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <div className={styles['viewer-pill']}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>{viewerCount}</span>
                    </div>
                    {/* Raise Hand trigger */}
                    {stream.status === 'live' && (
                        <button 
                            onClick={handleRaiseHand}
                            disabled={handRaised}
                            className={`${styles['circle-btn']} ${handRaised ? styles['hand-active'] : ''}`}
                            title={handRaised ? "Hand Raised" : "Raise Hand to speak"}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5" />
                                <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v6" />
                                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8.5" />
                                <path d="M6 14v1.5A5.5 5.5 0 0 0 11.5 21h3a5.5 5.5 0 0 0 5.5-5.5v-3.5a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                            </svg>
                        </button>
                    )}
                    {/* Info Toggle Button */}
                    <button 
                        onClick={() => setShowInfoModal(!showInfoModal)}
                        className={`${styles['circle-btn']} ${showInfoModal ? styles['active-btn'] : ''}`}
                        title="About this Stream"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </button>

                    {/* Catalog Drawer Trigger (Shopping Bag) */}
                    <button 
                        onClick={() => setShowCatalogDrawer(!showCatalogDrawer)}
                        className={`${styles['circle-btn']} ${showCatalogDrawer ? styles['active-btn'] : ''}`}
                        title="Showcase Catalog"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                    </button>
                </div>

                {/* Floating Info Details popup */}
                {showInfoModal && (
                    <div className={styles['info-modal-card']}>
                        <h4>About this show</h4>
                        <p>{stream.description || 'No description provided.'}</p>
                    </div>
                )}

                {/* Chat Message Scrolling List */}
                <div className={styles['chat-messages-scroll']}>
                    {messages.map((msg, index) => {
                        if (msg.isAlert) {
                            return (
                                <div key={index} className={styles['chat-alert']}>
                                    {msg.text}
                                </div>
                            );
                        }
                        return (
                            <div 
                                key={index} 
                                className={`${styles['chat-bubble']} ${msg.senderId === user?._id ? styles['own-bubble'] : ''}`}
                            >
                                <button 
                                    type="button" 
                                    onClick={() => setReplyingTo(msg)}
                                    className={styles['chat-reply-icon']}
                                    title="Reply"
                                >
                                    ↩️
                                </button>
                                {msg.replyToContent && (
                                    <div className={styles['chat-reply-quote']}>
                                        <small>{msg.replyToUserName}</small>
                                        <div className={styles['chat-reply-quote-text']}>{msg.replyToContent}</div>
                                    </div>
                                )}
                                <span className={styles['chat-sender']}>{msg.senderName}</span>
                                <div className={styles['chat-text']}>{msg.content}</div>
                                {autoTranslateEnabled && msg.translation && (
                                    <div className={styles['chat-translation']}>
                                        {msg.translation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {typingUser && (
                    <div className={styles['typing-text-indicator']}>
                        {typingUser} is typing...
                    </div>
                )}

                {/* Replying state banner */}
                {replyingTo && (
                    <div className={styles['reply-active-banner']}>
                        <span>Replying to {replyingTo.senderName}</span>
                        <button onClick={() => setReplyingTo(null)}>✕</button>
                    </div>
                )}

                {/* Chat Input Field Container */}
                {stream.status === 'live' && (
                    <form onSubmit={handleSendMessage} className={styles['chat-input-pill-form']}>

                        
                        <input 
                            type="text"
                            value={chatInput}
                            onChange={handleChatInputChange}
                            placeholder="Say something..."
                            className={styles['chat-input-pill']}
                        />
                        <button type="submit" className={styles['chat-submit-btn']} title="Send Message">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </form>
                )}
            </div>

            {/* Showcase Catalog Slide-out Drawer */}
            {showCatalogDrawer && (
                <div className={styles['drawer-overlay']} onClick={() => setShowCatalogDrawer(false)}>
                    <div className={styles['drawer-content']} onClick={e => e.stopPropagation()}>
                        <div className={styles['drawer-header']}>
                            <h3>Showroom Catalog ({stream.products?.length || 0} Items)</h3>
                            <button onClick={() => setShowCatalogDrawer(false)}>✕</button>
                        </div>
                        <div className={styles['drawer-list']}>
                            {stream.products && stream.products.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No products in showroom.</p>
                            ) : (
                                stream.products?.map(p => {
                                    const isPinned = pinnedProduct?._id === p._id;
                                    return (
                                        <div 
                                            key={p._id}
                                            className={`${styles['drawer-product-card']} ${isPinned ? styles['card-pinned-outline'] : ''}`}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <img src={p.main_image} alt={p.name} />
                                                {isPinned && <span className={styles['pinned-card-badge']}>PINNED</span>}
                                            </div>
                                            <div className={styles['drawer-prod-info']}>
                                                <h4>{p.name}</h4>
                                                <span className={styles['drawer-price']}>${p.main_price}</span>
                                            </div>
                                            <div className={styles['drawer-actions']}>
                                                <button 
                                                    onClick={() => {
                                                        setPinnedProduct(p);
                                                        setShowQuoteModal(true);
                                                    }}
                                                    className={styles['drawer-btn-primary']}
                                                >
                                                    Inquire / Get Quote
                                                </button>
                                                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                                    <button 
                                                        onClick={() => showToast(`Sample request submitted for ${p.name}!`, 'success')}
                                                        className={styles['drawer-btn-secondary']}
                                                    >
                                                        Request Sample
                                                    </button>
                                                    <button 
                                                        onClick={() => router.push(`/products/${p._id}`)}
                                                        className={styles['drawer-btn-secondary']}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Request Modal */}
            {showQuoteModal && pinnedProduct && (
                <div className={styles['modal-overlay']}>
                    <div className={styles['modal-content']}>
                        <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: '0 0 20px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Request Quote for {pinnedProduct.name}</h3>
                        <form onSubmit={handleSubmitQuoteRequest}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#4b5563' }}>Target Quantity</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="number"
                                        value={quoteQty}
                                        onChange={(e) => setQuoteQty(Number(e.target.value))}
                                        style={{ width: '60%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                                        required
                                    />
                                    <input 
                                        type="text"
                                        value={quoteUnit}
                                        onChange={(e) => setQuoteUnit(e.target.value)}
                                        style={{ width: '40%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                                        placeholder="units / pieces"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#4b5563' }}>Target Price (USD per unit)</label>
                                <input 
                                    type="number"
                                    value={quotePrice}
                                    onChange={(e) => setQuotePrice(Number(e.target.value))}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                                    placeholder="e.g. 5.50"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#4b5563' }}>Required Delivery Date</label>
                                <input 
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#4b5563' }}>Inquiry message</label>
                                <textarea 
                                    value={quoteMsg}
                                    onChange={(e) => setQuoteMsg(e.target.value)}
                                    placeholder="Provide specifications, shipping details..."
                                    style={{ width: '100%', height: '70px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#4b5563' }}>Notes & Additional Specifications</label>
                                <textarea 
                                    value={quoteNotes}
                                    onChange={(e) => setQuoteNotes(e.target.value)}
                                    placeholder="e.g. customized logos, packaging boxes requirement..."
                                    style={{ width: '100%', height: '50px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div className={styles['modal-actions']}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowQuoteModal(false)}
                                    className={styles['btn-secondary']}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submittingQuote}
                                    className={styles['btn-quote']}
                                >
                                    {submittingQuote ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
