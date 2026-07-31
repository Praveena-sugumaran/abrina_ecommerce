'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './SupplierLiveControl.module.css';

interface Product {
    _id: string;
    name: string;
    main_image: string;
    main_price: number;
}

interface ChatMessage {
    _id?: string;
    senderId?: string;
    senderName?: string;
    content?: string;
    translation?: string;
    timestamp?: Date;
    isAlert?: boolean;
    text?: string;
    replyToMessageId?: string;
    replyToUserName?: string;
    replyToContent?: string;
}

export default function SupplierLiveControl({ isStandalone = false }: { isStandalone?: boolean }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const streamIdParam = searchParams.get('id');
    const { user, currentRole, siteSettings, t } = useAuth();
    const { showToast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const socketRef = useRef<any>(null);

    // Custom cockpit AV and reply states
    const [micMuted, setMicMuted] = useState(false);
    const [videoMuted, setVideoMuted] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Auth & Role Verification
    useEffect(() => {
        if (siteSettings?.live_stream_enabled === false) return;
        if (user === undefined) return;
        if (!user) {
            showToast('Supplier login required to access cockpit.', 'error');
            router.push('/');
            return;
        }
        const isSupplier = currentRole === 'supplier' || user.role === 'supplier' || (user.roles && user.roles.includes('supplier'));
        if (!isSupplier) {
            showToast('Access Restricted: Supplier cockpit requires a supplier account.', 'error');
            router.push('/');
        }
    }, [user, currentRole, siteSettings]);

    if (user === undefined) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#666', fontWeight: 'bold' }}>
                Authenticating...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#666', fontWeight: 'bold' }}>
                Redirecting...
            </div>
        );
    }

    if (siteSettings?.live_stream_enabled === false) {
        return (
            <div className={styles['supplier-container']}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px',
                    border: '1px solid #fee2e2', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)', margin: '40px auto', maxWidth: '600px'
                }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 12px 0' }}>
                        Live Stream Creation Disabled
                    </h2>
                    <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0', maxWidth: '440px' }}>
                        The ability to host live streams has been disabled globally by the platform administrator. Please contact support if you require assistance.
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

    // Setup Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [myProducts, setMyProducts] = useState<Product[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [provider, setProvider] = useState<'mock' | 'zegocloud'>('zegocloud');
    const [myScheduledStreams, setMyScheduledStreams] = useState<any[]>([]);

    // Active Stream States
    const [activeStream, setActiveStream] = useState<any>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const zegoContainerRef = useRef<HTMLDivElement>(null);
    const zegoInstanceRef = useRef<any>(null);
    const zegoInitSessionRef = useRef<number>(0);
    const [chatInput, setChatInput] = useState('');
    const [peakViewerCount, setPeakViewerCount] = useState(0);

    // Pinning state
    const [pinnedProductId, setPinnedProductId] = useState<string | null>(null);

    // Poll states
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [activePoll, setActivePoll] = useState<any>(null);
    const [showPollModal, setShowPollModal] = useState(false);
    const [mobileTab, setMobileTab] = useState<'chat' | 'products'>('chat');

    // Load supplier's products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await api.get('/products');
                const productsList = Array.isArray(data) ? data : (data?.products || []);
                const filtered = productsList.filter((p: any) => {
                    const supId = p.supplier?._id || p.supplier;
                    return supId === user?._id;
                });
                setMyProducts(filtered);
            } catch (err) {
                console.error('Failed to load products:', err);
            }
        };
        if (user?._id) {
            fetchProducts();
        }
    }, [user]);

    // If we are on `/live/supplier` standalone page but there is no query stream ID, redirect back to dashboard
    useEffect(() => {
        if (isStandalone && !streamIdParam) {
            router.push('/supplier/dashboard/live-stream');
        }
    }, [isStandalone, streamIdParam]);

    // Load stream by ID if streamIdParam is present
    useEffect(() => {
        const loadStreamFromParam = async () => {
            if (!streamIdParam || !user?._id) return;
            try {
                const { data } = await api.get(`/live-streams/${streamIdParam}`);
                setActiveStream(data);
                setProvider(data.stream_provider || 'mock');
                setSelectedProductIds((data.products || []).map((p: any) => p._id || p));
                if (data.status === 'live') {
                    setIsBroadcasting(true);
                } else if (data.status === 'upcoming') {
                    // Automatically transition to live status and broadcast
                    try {
                        const { data: liveData } = await api.put(`/live-streams/${data._id}/status`, {
                            status: 'live'
                        });
                        await api.post(`/live-streams/${data._id}/join`);
                        setActiveStream(liveData);
                        setIsBroadcasting(true);
                        showToast('Live stream started automatically!', 'success');
                    } catch (liveErr: any) {
                        console.error('Failed to automatically start stream:', liveErr);
                        showToast('Failed to start live broadcast automatically.', 'error');
                    }
                }
            } catch (err) {
                console.error('Failed to load stream from query param:', err);
                showToast('Failed to load live stream cockpit.', 'error');
                router.push('/supplier/dashboard/live-stream');
            }
        };
        loadStreamFromParam();
    }, [streamIdParam, user]);

    // Check for existing active/upcoming streams on load (WITHOUT auto-entering cockpit)
    useEffect(() => {
        const checkExistingStream = async () => {
            if (!user?._id) return;
            try {
                const { data: streams } = await api.get('/live-streams');
                const supplierStreams = (streams || []).filter((s: any) => {
                    const supplierId = s.supplier_id?._id || s.supplier_id;
                    return supplierId === user._id && (s.status === 'live' || s.status === 'upcoming');
                });
                setMyScheduledStreams(supplierStreams);
            } catch (err) {
                console.error('Failed to load active stream:', err);
            }
        };
        checkExistingStream();
    }, [user]);

    // Initialize viewer count from active stream details
    useEffect(() => {
        if (activeStream) {
            setViewerCount(activeStream.viewer_count || 0);
        }
    }, [activeStream]);

    // Load chat history when activeStream is activated
    useEffect(() => {
        if (!activeStream) return;
        const fetchHistory = async () => {
            try {
                const { data } = await api.get(`/live-streams/${activeStream._id}/messages`);
                const history = (data || []).map((m: any) => ({
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
            } catch (err) {
                console.error('Failed to load chat history:', err);
            }
        };
        fetchHistory();
    }, [activeStream]);

    // Socket Setup on stream activation
    useEffect(() => {
        if (!activeStream) return;

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
                    socketUrl = (apiUrl && apiUrl.startsWith('http')) ? apiUrl.replace('/api', '') : 'http://localhost:5010';
                }
            } else {
                socketUrl = 'http://localhost:5010';
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

        socket.emit('joinStream', activeStream._id);

        socket.off('streamMessageReceived');
        socket.on('streamMessageReceived', (msg: ChatMessage) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.off('streamStatsUpdate');
        socket.on('streamStatsUpdate', (stats: { viewer_count: number; peak_viewers?: number }) => {
            setViewerCount(stats.viewer_count);
            if (stats.peak_viewers !== undefined) {
                setPeakViewerCount(stats.peak_viewers);
            }
        });

        socket.off('streamQuoteRequested');
        socket.on('streamQuoteRequested', (alert: { buyer_name: string; product_name: string; quantity: number; unit: string }) => {
            setMessages(prev => [
                ...prev,
                {
                    isAlert: true,
                    text: `Quote Request: ${alert.buyer_name} requested a quote for ${alert.product_name} (${alert.quantity} ${alert.unit})`
                }
            ]);
            showToast(`New quote request from ${alert.buyer_name}!`, 'info');
        });

        socket.off('handRaised');
        socket.on('handRaised', (data: { buyer_name: string; buyer_id: string }) => {
            setMessages(prev => [
                ...prev,
                {
                    isAlert: true,
                    text: `Q&A Request: ${data.buyer_name} raised their hand to speak!`
                }
            ]);
            showToast(`${data.buyer_name} raised their hand.`, 'info');
        });

        socket.off('pollVoteCast');
        socket.on('pollVoteCast', (updatedPoll: any) => {
            setActivePoll(updatedPoll);
        });

        return () => {
            socket.emit('leaveStream', activeStream._id);
            socket.off('streamMessageReceived');
            socket.off('streamStatsUpdate');
            socket.off('streamQuoteRequested');
            socket.off('handRaised');
            socket.off('pollVoteCast');
            socket.disconnect();
        };
    }, [activeStream]);

    // Local Preview Setup
    useEffect(() => {
        if (activeStream && provider === 'mock') {
            const startPreview = async () => {
                try {
                    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { width: 1280, height: 720 },
                            audio: false // Preview doesn't need microphone (avoids feedback loop)
                        });
                        setMediaStream(stream);
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                        }
                    }
                } catch (err) {
                    console.warn('Preview camera access failed:', err);
                }
            };
            startPreview();
        }
        return () => {
            stopMediaStream();
        };
    }, [activeStream, provider]);

    // ZegoCloud Host Room Setup
    const initZegoHost = async (streamId: string, zegoContainer: HTMLDivElement) => {
        const mySessionId = ++zegoInitSessionRef.current;
        try {
            const appID = Number(siteSettings?.zego_app_id);
            const serverSecret = siteSettings?.zego_server_secret;
            if (!appID || !serverSecret) {
                showToast('ZegoCloud configurations are missing in Site Settings.', 'error');
                return;
            }

            const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
            
            if (mySessionId !== zegoInitSessionRef.current) {
                console.log('Zego host initialization aborted due to new session.');
                return;
            }

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID,
                serverSecret,
                streamId,
                user?._id || `sup_${Date.now()}`,
                user ? `${user.first_name} ${user.last_name}` : 'Supplier Host'
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

            let hasCamera = true;
            let hasMic = true;
            try {
                if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    hasCamera = devices.some(device => device.kind === 'videoinput');
                    hasMic = devices.some(device => device.kind === 'audioinput');
                }
            } catch (e) {
                console.warn('Enumerate devices failed:', e);
            }

            zp.joinRoom({
                container: zegoContainer,
                scenario: {
                    mode: ZegoUIKitPrebuilt.LiveStreaming,
                    config: {
                        role: ZegoUIKitPrebuilt.Host,
                    },
                },
                showPreJoinView: false,
                showTextChat: false, // Native chat disabled
                showUserList: false, // Native user list disabled
                showRoomDetailsButton: false,
                showScreenSharingButton: true,
                turnOnCameraWhenJoining: true,
                turnOnMicrophoneWhenJoining: true,
                onLeaveRoom: () => {
                    handleStopBroadcast();
                }
            });
        } catch (err: any) {
            console.error('Zego host initialization error:', err);
            showToast('Failed to initialize ZegoCloud live stream.', 'error');
        }
    };

    useEffect(() => {
        let active = true;
        let timer: any = null;
        const container = zegoContainerRef.current;
        if (isBroadcasting && provider === 'zegocloud' && container) {
            timer = setTimeout(() => {
                if (active) {
                    initZegoHost(activeStream._id, container);
                }
            }, 500);
        }
        return () => {
            active = false;
            zegoInitSessionRef.current++; // Invalidate active session
            if (timer) clearTimeout(timer);
            if (zegoInstanceRef.current) {
                try {
                    zegoInstanceRef.current.destroy();
                } catch (e) {}
                zegoInstanceRef.current = null;
            }
        };
    }, [isBroadcasting, activeStream?._id, zegoContainerRef.current]);

    const stopMediaStream = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

    const toggleProduct = (productId: string) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    // Pin/Unpin product during live stream
    const handlePinProduct = async (productId: string) => {
        if (!activeStream) return;
        const nextPin = pinnedProductId === productId ? null : productId;
        try {
            await api.put(`/live-streams/${activeStream._id}/pin`, { productId: nextPin });
            setPinnedProductId(nextPin);
            showToast(nextPin ? 'Product pinned on stream!' : 'Product unpinned.', 'success');
        } catch (err) {
            console.error('Failed to pin product:', err);
            showToast('Failed to toggle product pin.', 'error');
        }
    };

    // Create Stream Record
    const handleCreateStream = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast('Please enter a stream title.', 'error');
            return;
        }

        try {
            const { data } = await api.post('/live-streams', {
                title,
                description,
                products: selectedProductIds,
                stream_provider: provider
            });
            showToast('Live stream workspace created! Redirecting to cockpit...', 'success');
            router.push(`/live/supplier?id=${data._id}`);
        } catch (err: any) {
            console.error('Failed to create stream:', err);
            showToast(err.response?.data?.message || 'Failed to initialize stream.', 'error');
        }
    };

    // Start Broadcasting
    const handleStartBroadcast = async () => {
        try {
            // Stop preview to release camera for Zego if provider is zegocloud
            if (provider === 'zegocloud') {
                stopMediaStream();
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                    videoRef.current.src = "";
                }
            }

            const { data } = await api.put(`/live-streams/${activeStream._id}/status`, {
                status: 'live'
            });
            
            await api.post(`/live-streams/${activeStream._id}/join`);

            setActiveStream(data);
            setIsBroadcasting(true);
            showToast('You are now LIVE!', 'success');
        } catch (err: any) {
            console.error('Broadcast start error:', err);
            const errMsg = err.response?.data?.message || err.message || 'Failed to start broadcast.';
            showToast(`Broadcast failed: ${errMsg}`, 'error');
        }
    };

    // Stop Broadcasting
    const handleStopBroadcast = async () => {
        try {
            stopMediaStream();
            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.src = "";
            }
            if (zegoInstanceRef.current) {
                try {
                    zegoInstanceRef.current.destroy();
                } catch (e) {}
                    zegoInstanceRef.current = null;
            }
            await api.post(`/live-streams/${activeStream._id}/leave`);

            await api.put(`/live-streams/${activeStream._id}/status`, {
                status: 'ended'
            });

            setMyScheduledStreams(prev => prev.filter(s => s._id !== activeStream._id));
            setActiveStream(null);
            setIsBroadcasting(false);
            setTitle('');
            setDescription('');
            setSelectedProductIds([]);
            showToast('Broadcast ended. Recording saved.', 'success');
            router.push('/supplier/dashboard/live-stream');
        } catch (err: any) {
            console.error('Failed to stop broadcast:', err);
            showToast('Error ending broadcast.', 'error');
        }
    };

    // Delete scheduled stream
    const handleDeleteStream = async (streamId: string) => {
        if (!window.confirm('Are you sure you want to delete this live stream show?')) {
            return;
        }
        try {
            await api.delete(`/live-streams/${streamId}`);
            setMyScheduledStreams(prev => prev.filter(s => s._id !== streamId));
            showToast('Live stream deleted successfully.', 'success');
        } catch (err: any) {
            console.error('Failed to delete stream:', err);
            showToast(err.response?.data?.message || 'Failed to delete live stream.', 'error');
        }
    };

    // Toggle Mic
    const toggleMic = () => {
        if (mediaStream) {
            mediaStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
        setMicMuted(!micMuted);
    };

    // Toggle Video
    const toggleVideo = () => {
        if (mediaStream) {
            mediaStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
        setVideoMuted(!videoMuted);
    };

    // Send chat message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        if (socketRef.current) {
            socketRef.current.emit('sendStreamMessage', {
                streamId: activeStream._id,
                senderId: user?._id,
                senderName: user ? `${user.first_name} ${user.last_name} (Host)` : 'Host',
                content: chatInput,
                replyToMessageId: replyingTo?._id || null,
                replyToUserName: replyingTo?.senderName || null,
                replyToContent: replyingTo?.content || null
            });
            setChatInput('');
            setReplyingTo(null);
        }
    };

    // Launch live poll
    const handleLaunchPoll = async (e: React.FormEvent) => {
        e.preventDefault();
        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (!pollQuestion.trim() || validOptions.length < 2) {
            showToast('Please fill out the question and at least 2 options.', 'error');
            return;
        }

        try {
            await api.post(`/live-streams/${activeStream._id}/poll`, {
                question: pollQuestion,
                options: validOptions
            });
            setActivePoll({
                question: pollQuestion,
                options: validOptions.map(opt => ({ text: opt, votes: 0 }))
            });
            setShowPollModal(false);
            setPollQuestion('');
            setPollOptions(['', '']);
            showToast('Live poll launched!', 'success');
        } catch (err) {
            console.error('Failed to launch poll:', err);
            showToast('Failed to launch live poll.', 'error');
        }
    };

    return (
        <div className={styles['supplier-container']}>
            {!activeStream ? (
                /* Setup & Stream Manager View */
                <div style={{ width: '100%' }}>
                    <button
                        onClick={() => router.push('/supplier/dashboard')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '6px', color: '#64748b', fontWeight: '700', fontSize: '14px', marginBottom: '20px'
                        }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to Supplier Hub
                    </button>
                    <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
                        {/* Setup Form */}
                        <div className={styles['setup-card']} style={{ flex: '1 1 500px', margin: 0 }}>
                            <h2>{t('setup_live_session') || 'Setup Live Stream'}</h2>
                            <form onSubmit={handleCreateStream}>
                                <div className={styles['form-group']}>
                                    <label>{t('session_title') || 'Stream Title'}</label>
                                    <input 
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className={styles['form-input']}
                                        placeholder="e.g. 2026 Eco-friendly Packaging Demos"
                                    />
                                </div>
                                <div className={styles['form-group']}>
                                    <label>{t('description') || 'Description'}</label>
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={styles['form-input']}
                                        placeholder="Introduce your factory, products, or process..."
                                        style={{ minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>

                                <div className={styles['form-group']}>
                                    <label>{t('pin_products') || 'Add Products to Catalog'}</label>
                                    {myProducts.length === 0 ? (
                                        <p style={{ fontSize: '12px', color: '#888' }}>No products found. Please upload items first.</p>
                                    ) : (
                                        <div className={styles['product-select-grid']}>
                                            {myProducts.map(p => {
                                                const isSelected = selectedProductIds.includes(p._id);
                                                return (
                                                    <div 
                                                        key={p._id}
                                                        onClick={() => toggleProduct(p._id)}
                                                        className={`${styles['product-option']} ${isSelected ? styles['selected'] : ''}`}
                                                    >
                                                        <img src={p.main_image} alt={p.name} />
                                                        <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%' }}>{p.name}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className={styles['start-btn']}>
                                    {t('initialize_stream') || 'Create Stream Workspace'}
                                </button>
                            </form>
                        </div>

                        {/* Scheduled Streams List */}
                        <div className={styles['scheduled-container']}>
                            <h2>Your Scheduled Live Shows</h2>
                            {myScheduledStreams.length === 0 ? (
                                <div className={styles['empty-state-scheduled']}>
                                    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: '#94a3b8' }}>
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span>No upcoming live shows scheduled. Use the form on the left to schedule or start a show!</span>
                                </div>
                            ) : (
                                <div className={styles['scheduled-list']}>
                                    {myScheduledStreams.map((s: any) => (
                                        <div key={s._id} className={`${styles['scheduled-card']} ${s.status === 'live' ? styles['live-card'] : styles['upcoming-card']}`}>
                                            <div className={styles['scheduled-info']}>
                                                <h4 className={styles['scheduled-title']}>{s.title}</h4>
                                                <div className={styles['scheduled-meta']}>
                                                    <span className={`${styles['status-badge']} ${s.status === 'live' ? styles['status-live'] : styles['status-upcoming']}`}>
                                                        {s.status === 'live' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginRight: '4px', animation: 'pulse-live 1.5s infinite' }} />}
                                                        {s.status === 'live' ? 'LIVE' : 'UPCOMING'}
                                                    </span>
                                                    <span className={styles['scheduled-time']}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                                        </svg>
                                                        {new Date(s.start_time).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles['scheduled-actions']}>
                                                <button
                                                    onClick={() => {
                                                        router.push(`/live/supplier?id=${s._id}`);
                                                    }}
                                                    className={styles['enter-btn']}
                                                >
                                                    Enter Cockpit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStream(s._id)}
                                                    className={styles['delete-btn-premium']}
                                                    title="Delete Show"
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Stream Control Room */
                <div>
                    <button
                        onClick={() => {
                            stopMediaStream();
                            setActiveStream(null);
                            setIsBroadcasting(false);
                            router.push('/supplier/dashboard/live-stream');
                        }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '6px', color: '#64748b', fontWeight: '700', fontSize: '14px', marginBottom: '15px'
                        }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to Stream Manager
                    </button>
                    <div className={styles['cockpit-header']}>
                        <div>
                            <h2 style={{ margin: 0 }}>Supplier Stream Cockpit</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#666' }}>Title: <strong>{activeStream.title}</strong></p>
                        </div>
                        <div className={styles['header-status']}>
                            <span className={`${styles['status-indicator']} ${isBroadcasting ? styles['status-live'] : styles['status-preview']}`}>
                                {isBroadcasting ? '● LIVE' : 'PRE-STREAM SETUP'}
                            </span>
                        </div>
                    </div>

                    {/* Cockpit Split Grid layout */}
                    <div className={styles['control-grid']}>
                        {/* Video Section */}
                        <div className={styles['video-section']}>
                            <div className={styles['video-container']}>
                                {/* Zego Container (Always Mounted to prevent Zego destroy crash) */}
                                <div 
                                    ref={zegoContainerRef}
                                    style={{ 
                                        display: (isBroadcasting && provider === 'zegocloud') ? 'block' : 'none',
                                        width: '100%', 
                                        height: '100%', 
                                        minHeight: '400px', 
                                        borderRadius: '12px', 
                                        overflow: 'hidden' 
                                    }}
                                />

                                {(!isBroadcasting || provider !== 'zegocloud') && (
                                    provider === 'zegocloud' ? (
                                        <div style={{
                                            width: '100%', height: '100%', minHeight: '400px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            background: '#111', color: '#fff', borderRadius: '12px', textAlign: 'center', padding: '20px'
                                        }}>
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                                                <path d="M23 7l-7 5 7 5V7z"></path>
                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                            </svg>
                                            <h3>ZegoCloud Live Showroom</h3>
                                            <p style={{ fontSize: '14px', color: '#aaa', maxWidth: '320px', margin: '4px 0 0 0' }}>Camera feed will initialize securely once you click "Start Broadcast" below.</p>
                                        </div>
                                    ) : (
                                        <video 
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className={styles['video-feed']}
                                        />
                                    )
                                )}

                                <div className={styles['stats-bar']}>
                                    <span>Live Viewers: {viewerCount}</span>
                                    {peakViewerCount > 0 && <span>Peak Viewers: {peakViewerCount}</span>}
                                    <span>Playback: {activeStream.playback_url ? 'Active' : 'Inactive'}</span>
                                </div>

                                {(!isBroadcasting || provider !== 'zegocloud') && (
                                    <div className={styles['control-bar']}>
                                        {/* Mic Toggle */}
                                        <button 
                                            type="button"
                                            onClick={toggleMic}
                                            className={`${styles['control-btn']} ${micMuted ? styles['btn-danger'] : styles['btn-secondary']}`}
                                            title={micMuted ? "Unmute Mic" : "Mute Mic"}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}
                                        >
                                            {micMuted ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                                </svg>
                                            )}
                                        </button>

                                        {/* Video Toggle */}
                                        <button 
                                            type="button"
                                            onClick={toggleVideo}
                                            className={`${styles['control-btn']} ${videoMuted ? styles['btn-danger'] : styles['btn-secondary']}`}
                                            title={videoMuted ? "Start Camera" : "Stop Camera"}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}
                                        >
                                            {videoMuted ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10l-3.55-2.77"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M23 7l-7 5 7 5V7z"></path>
                                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                                </svg>
                                            )}
                                        </button>

                                        {!isBroadcasting ? (
                                            <button 
                                                onClick={handleStartBroadcast}
                                                className={`${styles['control-btn']} ${styles['btn-success']}`}
                                            >
                                                Go Live
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={handleStopBroadcast}
                                                className={`${styles['control-btn']} ${styles['btn-danger']}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <span>End Stream</span>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Tab switcher */}
                        <div className={styles['mobile-tabs']}>
                            <button 
                                type="button"
                                className={`${styles['tab-btn']} ${mobileTab === 'chat' ? styles['active-tab'] : ''}`}
                                onClick={() => setMobileTab('chat')}
                            >
                                Chat & Q&A
                            </button>
                            <button 
                                type="button"
                                className={`${styles['tab-btn']} ${mobileTab === 'products' ? styles['active-tab'] : ''}`}
                                onClick={() => setMobileTab('products')}
                            >
                                Products & Polls
                            </button>
                        </div>

                        {/* Showcase Products Section */}
                        <div className={`${styles['products-section-wrap']} ${mobileTab === 'products' ? styles['mobile-visible'] : styles['mobile-hidden']}`}>
                            <div className={styles['products-section']}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0 }}>Showcase Products</h3>
                                    <button 
                                        onClick={() => setShowPollModal(true)}
                                        className={styles['control-btn']}
                                        style={{ background: '#ff6a00', color: '#fff' }}
                                    >
                                        Launch Poll
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                                    {myProducts.filter(p => selectedProductIds.includes(p._id)).map(p => {
                                        const isPinned = pinnedProductId === p._id;
                                        return (
                                            <div key={p._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: isPinned ? '#fff7ed' : '#fff' }}>
                                                <img src={p.main_image} alt={p.name} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} />
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', textAlign: 'center', marginBottom: '6px' }}>{p.name}</div>
                                                <button 
                                                    onClick={() => handlePinProduct(p._id)}
                                                    style={{ width: '100%', padding: '6px', fontSize: '10px', fontWeight: 'bold', background: isPinned ? '#ef4444' : '#ff6a00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    {isPinned ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                <path d="M21 10h-2V4h1V2H4v2h1v6H3v2h8v10l1 2 1-2V12h8v-2z"></path>
                                                            </svg>
                                                            Pinned
                                                        </span>
                                                    ) : (
                                                        'Pin Product'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Chat Panel & Active Polls */}
                        <div className={`${styles['chat-section-wrap']} ${mobileTab === 'chat' ? styles['mobile-visible'] : styles['mobile-hidden']}`}>
                            <div className={styles['chat-panel']}>
                                <div className={styles['panel-header']}>
                                    <span>Live Chat & Q&A Requests</span>
                                </div>

                                <div className={styles['chat-messages']}>
                                    {messages.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', marginTop: 'auto', marginBottom: 'auto' }}>
                                            No messages yet.
                                        </div>
                                    ) : (
                                        messages.map((msg, index) => {
                                            if (msg.isAlert) {
                                                return (
                                                    <div key={index} className={styles['alert-message']}>
                                                        {msg.text}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`${styles['msg-bubble']} ${msg.senderId === user?._id ? styles['own-message'] : ''}`}
                                                >
                                                    {/* Reply Trigger Icon */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setReplyingTo(msg)}
                                                        className={styles['reply-btn']}
                                                        title="Reply to message"
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="9 14 4 9 9 4"></polyline>
                                                            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                                        </svg>
                                                    </button>

                                                    {/* Nested Quote Block */}
                                                    {msg.replyToContent && (
                                                        <div className={styles['reply-quote']}>
                                                            <small>Replying to <strong>{msg.replyToUserName}</strong></small>
                                                            <div className={styles['reply-quote-content']}>{msg.replyToContent}</div>
                                                        </div>
                                                    )}

                                                    <strong>{msg.senderName}</strong>
                                                    <div>{msg.content}</div>
                                                    {msg.translation && (
                                                        <div className={styles['msg-translation']}>
                                                            {msg.translation}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {replyingTo && (
                                    <div className={styles['replying-container']}>
                                        <div className={styles['replying-text']}>
                                            Replying to <strong>{replyingTo.senderName}</strong>: {replyingTo.content}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setReplyingTo(null)}
                                            className={styles['cancel-reply-btn']}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {isBroadcasting && (
                                    <form onSubmit={handleSendMessage} className={styles['chat-input-area']}>
                                        <input 
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Type message to reply..."
                                            className={styles['chat-input']}
                                        />
                                        <button type="submit" className={styles['send-btn']}>
                                            Send
                                        </button>
                                    </form>
                                )}
                            </div>

                            {activePoll && (
                                <div className={styles['active-poll-card']}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Active Poll: {activePoll.question}</h4>
                                    {(() => {
                                        const totalVotes = activePoll.options.reduce((sum: number, opt: any) => sum + opt.votes, 0);
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {activePoll.options.map((opt: any, index: number) => {
                                                    const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                                    return (
                                                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                                <span>{opt.text}</span>
                                                                <strong style={{ color: '#ff6a00' }}>{opt.votes} votes ({pct}%)</strong>
                                                            </div>
                                                            <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ff6a00, #ff8433)', borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Poll Creation Modal */}
            {showPollModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="modal-overlay">
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', margin: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px 0' }}>Create Live Poll</h3>
                        <form onSubmit={handleLaunchPoll}>
                            <div className={styles['form-group']}>
                                <label>Poll Question</label>
                                <input 
                                    type="text" 
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    className={styles['form-input']}
                                    placeholder="Which feature do you prefer?"
                                    required
                                />
                            </div>
                            <div className={styles['form-group']}>
                                <label>Options</label>
                                {pollOptions.map((opt, index) => (
                                    <input 
                                        key={index}
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const nextOpts = [...pollOptions];
                                            nextOpts[index] = e.target.value;
                                            setPollOptions(nextOpts);
                                        }}
                                        className={styles['form-input']}
                                        placeholder={`Option ${index + 1}`}
                                        style={{ marginBottom: '8px' }}
                                        required
                                    />
                                ))}
                                <button 
                                    type="button" 
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    style={{ fontSize: '11px', color: '#ff6a00', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                                >
                                    + Add Option
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => { setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']); }}
                                    className={styles['control-btn']}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles['control-btn']}
                                    style={{ background: '#ff6a00', color: '#fff' }}
                                >
                                    Launch Poll
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
