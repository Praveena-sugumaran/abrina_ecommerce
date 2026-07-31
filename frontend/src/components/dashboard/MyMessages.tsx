import React, { useEffect, useState, useRef } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import AlertModal from './AlertModal';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './MyMessages.module.css';
import { useSearchParams } from 'next/navigation';

const NAVY = 'var(--primary-color)';


interface Participant {
    _id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
}

interface Message {
    _id: string;
    senderId: any;
    receiverId: string;
    content: string;
    messageType: string;
    isRead: boolean;
    createdAt: string;
}

interface Conversation {
    _id: string;
    participants: Participant[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
    createdAt: string;
}

const formatConvTime = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    if (d.toDateString() === today) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/* Avatar circle — shows initials with navy bg */
const Avatar = ({ name = 'U', size = 46, style = {} }: { name?: string, size?: number, style?: React.CSSProperties }) => {
    const initials = name.trim().split(' ').map(w => w[0]?.toUpperCase()).slice(0, 2).join('');
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: NAVY,
            color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 900,
            fontSize: size * 0.36, flexShrink: 0,
            boxShadow: `0 2px 10px rgba(13,46,103,0.12)`,
            letterSpacing: '0.02em', ...style
        }}>
            {initials || 'U'}
        </div>
    );
};

const MyMessages = () => {
    const { conversations, fetchConversations, socket, markChatAsRead, unreadTotal } = useChat() as any;
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const targetUserId = searchParams.get('userId');

    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [activeChatUser, setActiveChatUser] = useState<Participant | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

    /* mobile: which "panel" is visible: 'list' | 'chat' */
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    /* Auto-select user from URL param */
    useEffect(() => {
        if (targetUserId && !activeChatUser) {
            const conv = (conversations && conversations.length > 0) 
                ? conversations.find((c: any) => {
                    const other = c.participants?.find((p: any) => String(p._id) === String(targetUserId));
                    return !!other;
                }) 
                : null;
            if (conv) {
                const other = conv.participants?.find((p: any) => String(p._id) === String(targetUserId));
                setActiveChatUser(other);
                setMobileView('chat');
            } else {
                // If conversation doesn't exist in the list, fetch user info to start a new chat
                const fetchUserInfo = async () => {
                    try {
                        const { data } = await api.get(`/auth/user-info/${targetUserId}`);
                        if (data) {
                            setActiveChatUser(data);
                            setMobileView('chat');
                        }
                    } catch (err) {
                        console.error('Failed to fetch target user info:', err);
                    }
                };
                fetchUserInfo();
            }
        }
    }, [targetUserId, conversations]);

    /* Load messages when active user changes */
    useEffect(() => {
        if (activeChatUser) {
            const load = async () => {
                try {
                    const role = user.role === 'supplier' || user.roles?.includes('supplier') ? 'supplier' : 'buyer';
                    const { data } = await api.get(`/chat/messages/${activeChatUser._id}?role=${role}`);
                    setMessages(data.messages);
                    markChatAsRead(data.conversationId, activeChatUser._id);
                } catch (err) { console.error('Failed to load chat history:', err); }
            };
            load();
        }
    }, [activeChatUser]);

    /* Socket listeners */
    useEffect(() => {
        if (!socket) return;
        const handleMessage = (msg: any) => {
            // Check if we are currently chatting with the person involved in this message
            const isRelevant = 
                (activeChatUser && String(msg.senderId) === String(activeChatUser._id)) ||
                (activeChatUser && String(msg.receiverId) === String(activeChatUser._id) && String(msg.senderId) === String(user._id));

            if (isRelevant) {
                setMessages(prev => {
                    // Avoid duplicates (e.g. if API response already added it)
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                
                // Mark as read if it's an incoming message
                if (String(msg.senderId) === String(activeChatUser._id)) {
                    const conv = conversations.find((c: any) => c.participants?.some((p: any) => String(p._id) === String(activeChatUser?._id)));
                    if (conv) markChatAsRead(conv._id, activeChatUser._id);
                }
            } else {
                // If it's for another chat, just refresh the list to show unread dot
                fetchConversations();
            }
        };

        const handleRead = ({ readerId }: any) => {
            if (activeChatUser && String(readerId) === String(activeChatUser._id)) {
                setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            }
            fetchConversations();
        };

        socket.on('messageReceived', handleMessage);
        socket.on('messagesRead', handleRead);
        
        return () => {
            socket.off('messageReceived', handleMessage);
            socket.off('messagesRead', handleRead);
        };
    }, [socket, activeChatUser, conversations]);

    /* Send message */
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeChatUser) return;

        const msgData = {
            receiverId: activeChatUser._id,
            content: newMessage,
            messageType: 'text',
            role: user?.role === 'supplier' ? 'supplier' : 'buyer'
        };

        try {
            const { data } = await api.post('/chat/messages', msgData);
            setMessages((prev: Message[]) => [...prev, data]);
            setNewMessage('');
            fetchConversations();
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            scrollToBottom();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send message');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChatUser) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('receiverId', activeChatUser._id);
        formData.append('role', user?.role === 'supplier' ? 'supplier' : 'buyer');

        try {
            // 1. Upload file
            const { data: uploadData } = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Send message with attachment
            const msgData = {
                receiverId: activeChatUser._id,
                content: uploadData.url,
                messageType: uploadData.type || 'image',
                attachments: [uploadData.url],
                role: user?.role === 'supplier' ? 'supplier' : 'buyer'
            };

            const { data } = await api.post('/chat/messages', msgData);
            setMessages((prev: Message[]) => [...prev, data]);
            fetchConversations();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send file');
        } finally {
            setUploading(false);
        }
    };

    const searchProducts = async (q: string) => {
        if (!q.trim()) {
            setProductResults([]);
            return;
        }
        try {
            const { data } = await api.get(`/products?search=${q}`);
            setProductResults(data.products || []);
        } catch (err) {
            console.error('Product search error:', err);
        }
    };

    const sendProduct = async (p: any) => {
        if (!activeChatUser) return;
        const msgData = {
            receiverId: activeChatUser._id,
            content: JSON.stringify(p),
            messageType: 'product',
            role: user?.role === 'supplier' ? 'supplier' : 'buyer'
        };

        try {
            const { data } = await api.post('/chat/messages', msgData);
            setMessages((prev: Message[]) => [...prev, data]);
            setIsProductSearchOpen(false);
            setProductSearch('');
            setProductResults([]);
            fetchConversations({ role: user?.role === 'supplier' ? 'supplier' : 'buyer' });
        } catch (err) {
            console.error('Send product error:', err);
        }
    };

    /* Open chat: also switch to chat panel on mobile. Accepts either a participant object or an id. */
    const openChat = async (participant: Participant | string) => {
        if (!participant) return;
        try {
            let userObj: any = participant;
            // If caller passed an id or a minimal object, fetch full user info
            if (typeof participant === 'string' || (participant as any)._id === undefined) {
                const id = typeof participant === 'string' ? participant : (participant as any);
                const { data } = await api.get(`/auth/user-info/${id}`);
                userObj = data || { _id: id };
            }
            setActiveChatUser(userObj);
            setMobileView('chat');
        } catch (err) {
            console.error('Failed to open chat for participant:', err);
        }
    };

    const goBackToList = () => setMobileView('list');

    useEffect(() => { fetchConversations(); }, []);

    /* Auto-select first conversation */
    useEffect(() => {
        if (!activeChatUser && conversations?.length > 0) {
            const first = conversations[0];
            const other = first.participants?.find((p: any) => String(p._id) !== String(user._id));
            if (other) setActiveChatUser(other);
        }
    }, [conversations, activeChatUser, user]);

    if (!user) return <div className={styles['p-4']}>Please log in to view messages.</div>;

    const filteredConversations = (conversations || []).filter((c: any) => {
        const matchesFilter = filter === 'Unread' ? c.unreadCount > 0 : true;
        if (!search.trim()) return matchesFilter;
        const other = c.participants?.find((p: any) => String(p._id) !== String(user._id));
        const name = `${other?.first_name} ${other?.last_name} ${other?.company_name || ''}`.toLowerCase();
        return matchesFilter && name.includes(search.toLowerCase());
    });

    /* ───── Sidebar (conversation list) ───── */
    const renderSidebarPanel = () => (
        <div className={styles['msg-sidebar']}>
            <div className={styles['msg-sidebar-header']}>
                <div className={styles['msg-sidebar-header-main']}>
                    <div className={styles['msg-sidebar-title-row']}>
                        <h2 className={styles['msg-sidebar-title']}>Chats</h2>
                        <div className={styles['msg-filter-tabs']}>
                            {['All', 'Unread'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`${styles['msg-filter-tab']} ${filter === f ? styles['active'] : ''}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search - Single Row */}
                    <div className={styles['msg-search-wrap']}>
                        <div className={styles['msg-search-input-container']}>
                            <svg className={styles['msg-search-icon-inline']} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="search"
                                className={styles['msg-search-input']}
                                placeholder="Search or start new chat"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {search && <button className={styles['msg-search-clear']} onClick={() => setSearch('')}>✕</button>}
                    </div>
                </div>
            </div>

            {/* Conversation list */}
            <div className={styles['msg-conv-list'] + " " + styles['custom-scrollbar']}>
                {filteredConversations.length === 0 ? (
                    <div className={styles['msg-no-convs']}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💬</div>
                        <p>No conversations yet</p>
                    </div>
                ) : filteredConversations.map((conv: any) => {
                    const other = conv.participants?.find((p: any) => String(p._id) !== String(user._id));
                    if (!other) return null;
                    const isActive = activeChatUser && String(activeChatUser._id) === String(other._id);
                    const hasUnread = conv.unreadCount > 0 && !isActive;
                    const fullName = `${other.first_name || ''} ${other.last_name || ''}`.trim();
                    const lastContent = conv.lastMessage?.content || 'New conversation';
                    const isProductMsg = lastContent.startsWith('{') && lastContent.includes('"name"');
                    let preview = isProductMsg ? '📦 Product shared' : lastContent;
                    
                    if (conv.lastMessage?.messageType === 'image') {
                        preview = '📷 Image';
                    } else if (conv.lastMessage?.messageType === 'file') {
                        preview = '📄 File';
                    }

                    const isLastFromMe = conv.lastMessage && String(conv.lastMessage.senderId?._id || conv.lastMessage.senderId) === String(user._id);
                    if (isLastFromMe && preview !== 'New conversation') {
                        preview = `You: ${preview}`;
                    }

                    return (
                        <div
                            key={conv._id}
                            onClick={() => openChat(other)}
                            className={`${styles['msg-conv-item']} ${isActive ? styles['active'] : ''} ${hasUnread ? styles['unread'] : ''}`}
                        >
                            <div className={styles['msg-avatar-wrap']}>
                                <Avatar name={fullName} size={48} />
                            </div>

                            {/* Info */}
                            <div className={styles['msg-conv-body']}>
                                <div className={styles['msg-conv-top']}>
                                    <span className={styles['msg-conv-name'] + (hasUnread ? " " + styles['bold'] : "")}>{fullName || 'Unknown'}</span>
                                    <span className={styles['msg-conv-time'] + (hasUnread ? " " + styles['active'] : "")}>{formatConvTime(conv.lastMessage?.createdAt)}</span>
                                </div>
                                <div className={styles['msg-conv-bottom']}>
                                    <p className={styles['msg-conv-preview'] + (hasUnread ? " " + styles['bold'] : "")}>
                                        {isLastFromMe && (
                                            <span className={styles['msg-status-icon']}>✓✓</span>
                                        )}
                                        {preview}
                                    </p>
                                    {hasUnread && (
                                        <span className={styles['msg-unread-badge-pill']}>{conv.unreadCount}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    /* ───── Chat panel ───── */
    const renderChatPanel = () => {
        const fullName = activeChatUser
            ? `${activeChatUser.first_name || ''} ${activeChatUser.last_name || ''}`.trim()
            : '';

        return (
            <div className={styles['msg-chat-main']}>
                {!activeChatUser ? (
                    <div className={styles['msg-empty-placeholder']}>
                        <div className={styles['msg-empty-icon-circle']}>
                            <svg width="40" height="40" fill="none" stroke={NAVY} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <h3>Smart Messenger</h3>
                        <p>Select a conversation to start chatting.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className={styles['msg-chat-header']}>
                            {/* Back button (mobile only) */}
                            <button className={styles['msg-back-btn']} onClick={goBackToList}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <Avatar name={fullName} size={40} />

                            <div className={styles['msg-chat-header-info']}>
                                <h4 className={styles['msg-chat-recipient-name']}>{fullName}</h4>
                                <div className={styles['msg-online-status']}>
                                    <span className={styles['msg-online-dot']} />
                                    <span className={styles['msg-online-text']}>Online</span>
                                </div>
                            </div>


                        </div>

                        {/* Messages */}
                        <div className={styles['msg-messages-area'] + " " + styles['custom-scrollbar']}>
                            {messages.length === 0 && (
                                <div className={styles['msg-no-messages']}>
                                    <p>Start a conversation with {fullName}</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isMeSender =
                                    String(msg.senderId?._id || msg.senderId) === String(user._id);
                                return (
                                    <div
                                        key={msg._id || idx}
                                        className={`${styles['msg-row']} ${isMeSender ? styles['me'] : styles['them']}`}
                                    >
                                        {/* Avatar for "them" */}
                                        {!isMeSender && (
                                            <Avatar name={fullName} size={30} style={{ alignSelf: 'flex-end', marginRight: 6, flexShrink: 0 }} />
                                        )}

                                        <div className={styles['msg-bubble-wrap']}>
                                            {/* Bubble */}
                                            <div className={`${styles['msg-bubble']} ${isMeSender ? styles['me'] : styles['them']}`}>
                                                {msg.messageType === 'image' ? (
                                                    <img
                                                        src={getImgUrl(msg.content)}
                                                        alt="attachment"
                                                        className={styles['msg-bubble-img']}
                                                        onClick={() => window.open(getImgUrl(msg.content), '_blank')}
                                                    />
                                                ) : msg.messageType === 'file' ? (
                                                    <a href={getImgUrl(msg.content)} target="_blank" rel="noreferrer" className={styles['msg-file-link']}>
                                                        <span className={styles['msg-file-icon']}>📄</span>
                                                        <div>
                                                            <div className={styles['msg-file-name']}>Document</div>
                                                            <div className={styles['msg-file-hint']}>Click to download</div>
                                                        </div>
                                                    </a>
                                                ) : msg.messageType === 'product' ? (() => {
                                                    try {
                                                        const p = JSON.parse(msg.content);
                                                        return (
                                                            <div className={styles['msg-product-card']}>
                                                                {getImgUrl(p.image) && (
                                                                    <img src={getImgUrl(p.image)} alt={p.name} className={styles['msg-product-img']} />
                                                                )}
                                                                <div className={styles['msg-product-info']}>
                                                                    <p className={styles['msg-product-name']}>{p.name}</p>
                                                                    <p className={styles['msg-product-price']}>${p.price}</p>
                                                                    <button
                                                                        onClick={() => window.open(`/product/${p.slug || p._id || p.id}`, '_blank')}
                                                                        className={styles['msg-product-btn']}
                                                                    >
                                                                        View Product
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    } catch { return <span>{msg.content}</span>; }
                                                })() : (
                                                    <span style={{ display: 'block' }}>{msg.content}</span>
                                                )}
                                            </div>

                                            {/* Meta: time + read receipt */}
                                            <div className={`${styles['msg-meta']} ${isMeSender ? styles['me'] : styles['them']}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMeSender && (
                                                    <span className={`${styles['msg-receipt']} ${msg.isRead ? styles['read'] : ''}`}>
                                                        {msg.isRead ? ' ✓✓' : ' ✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Product search panel */}
                        {isProductSearchOpen && (
                            <div className={styles['msg-product-search-panel']}>
                                <div className={styles['msg-product-search-header']}>
                                    <span className={styles['msg-product-search-label']}>📦 Share a Product</span>
                                    <button onClick={() => setIsProductSearchOpen(false)} className={styles['msg-product-close-btn']}>✕</button>
                                </div>
                                <form className={styles['msg-search-wrap']} style={{ margin: '8px 0' }} onSubmit={(e: any) => { e.preventDefault(); e.currentTarget.querySelector('input')?.blur(); }}>
                                    <svg className={styles['msg-search-icon']} width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="search"
                                        placeholder="Search products..."
                                        className={styles['msg-search-input']}
                                        value={productSearch}
                                        onChange={e => searchProducts(e.target.value)}
                                        autoFocus
                                    />
                                    {productSearch && (
                                        <button type="button" className={styles['msg-search-clear']} onClick={() => searchProducts('')}>✕</button>
                                    )}
                                </form>
                                {productResults.length > 0 && (
                                    <div className={styles['msg-product-results'] + " " + styles['custom-scrollbar']}>
                                        {productResults.map(p => (
                                            <div key={p._id} onClick={() => sendProduct(p)} className={styles['msg-product-mini']}>
                                                {getImgUrl(p.main_image) && (
                                                    <img src={getImgUrl(p.main_image)} alt={p.name} className={styles['msg-product-mini-img']} />
                                                )}
                                                <div className={styles['msg-product-mini-info']}>
                                                    <p className={styles['msg-product-mini-name']}>{p.name}</p>
                                                    <p className={styles['msg-product-mini-price']}>${p.main_price}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Input area */}
                        <div className={styles['msg-input-area']}>
                            <input type="file" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} />

                            <button className={styles['msg-input-action-btn']} onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>

                            <button className={styles['msg-input-action-btn']} onClick={() => setIsProductSearchOpen(!isProductSearchOpen)} title="Share product">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>

                            <div className={styles['msg-textarea-wrap']}>
                                <textarea
                                    ref={textareaRef}
                                    className={styles['msg-textarea']}
                                    value={newMessage}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    rows={1}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                                />
                            </div>

                            <button
                                className={`${styles['msg-send-btn']} ${newMessage.trim() ? styles['active'] : ''}`}
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                title="Send"
                            >
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            {/* ─── DESKTOP: side-by-side layout ─── */}
            <div className={styles['msg-desktop-layout']}>
                {renderSidebarPanel()}
                {renderChatPanel()}
            </div>

            {/* ─── MOBILE: single-panel sliding layout ─── */}
            <div className={styles['msg-mobile-layout']}>
                <div className={`${styles['msg-mobile-panel']} ${mobileView === 'list' ? styles['visible'] : styles['hidden']}`}>
                    {renderSidebarPanel()}
                </div>
                <div className={`${styles['msg-mobile-panel']} ${mobileView === 'chat' ? styles['visible'] : styles['hidden']}`}>
                    {renderChatPanel()}
                </div>
            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                message={alertModal.message}
                title={alertModal.title}
            />
        </>
    );
};

export default MyMessages;
