import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import EmojiPicker, { Theme } from 'emoji-picker-react';


import { usePathname } from 'next/navigation';
import { getImgUrl } from '@/utils/imageConfig';

const ChatPopup = () => {
    const pathname = usePathname();
    const { isChatOpen, activeChatUser, closeChat, unreadTotal, fetchConversations, socket, markChatAsRead } = useChat();
    const { user, convertPrice } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [attachedProduct, setAttachedProduct] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        // We might want to keep it open for multiple emojis, or close it.
        // The user's screenshot shows a small grid, so maybe closing is fine.
        // But with a full picker, users might want to add multiple.
        // Let's close it for now as per previous behavior.
        setShowEmojiPicker(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            const { data } = await api.get(`/chat/messages/${activeChatUser._id}`);
            setMessages(data.messages);
            setConversationId(data.conversationId);
            setTimeout(scrollToBottom, 100);
            if (data.conversationId) {
                markChatAsRead(data.conversationId, activeChatUser._id);
            }
        } catch (err) {
            console.error('Failed to load chat history:', err);
        }
    };

    useEffect(() => {
        if (isChatOpen && activeChatUser) {
            loadMessages();
        }
    }, [isChatOpen, activeChatUser]);

    useEffect(() => {
        if (isChatOpen && typeof window !== 'undefined' && window.innerWidth <= 768) {
            closeChat();
        }
    }, [pathname]);

    useEffect(() => {
        const onNewMessage = (e: any) => {
            const msg = e.detail;
            if (String(msg.senderId) === String(activeChatUser?._id)) {
                setMessages(prev => [...prev, msg]);
                setTimeout(scrollToBottom, 100);
                if (conversationId) markChatAsRead(conversationId, activeChatUser._id);
            }
        };

        const onReadUpdate = () => {
            if (isChatOpen && activeChatUser) {
                api.get(`/chat/messages/${activeChatUser._id}`).then(({ data }) => {
                    setMessages(data.messages);
                });
            }
        };

        window.addEventListener('newMessage', onNewMessage);
        window.addEventListener('chatReadUpdated', onReadUpdate);
        return () => {
            window.removeEventListener('newMessage', onNewMessage);
            window.removeEventListener('chatReadUpdated', onReadUpdate);
        };
    }, [activeChatUser, conversationId, isChatOpen]);

    useEffect(() => {
        const handleAttachProduct = (e: any) => {
            if (!activeChatUser) return;
            const product = e.detail;
            setAttachedProduct({
                productId: product._id,
                name: product.name,
                price: product.main_price,
                image: product.images?.[0]
            });
            setNewMessage(`I'm interested in: ${product.name}`);
        };

        window.addEventListener('attachProductToChat', handleAttachProduct);
        return () => window.removeEventListener('attachProductToChat', handleAttachProduct);
    }, [activeChatUser]);

    const handleSend = async (e: any, type = 'text', contentOverride: string | null = null) => {
        if (e) e.preventDefault();
        const text = contentOverride || newMessage;
        if (!text.trim() && type === 'text') return;
        if (!activeChatUser) return;

        try {
            const payload: any = {
                receiverId: activeChatUser._id,
                content: text,
                messageType: type
            };
            if (attachedProduct && type === 'text') {
                payload.productDetails = attachedProduct;
            }

            const { data } = await api.post('/chat/messages', payload);
            if (socket) {
                socket.emit('sendMessage', {
                    receiverId: activeChatUser._id,
                    message: data
                });
            }
            setMessages((prev: any) => [...prev, data]);
            if (type === 'text') setNewMessage('');
            setAttachedProduct(null);
            setTimeout(scrollToBottom, 50);
            fetchConversations();
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleFileUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await api.post('/chat/upload', fd);
            handleSend(null, data.type, data.url);
        } catch (err) {
            console.error('File upload failed', err);
            alert('File upload failed. Please try again.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (!isChatOpen || !activeChatUser) return null;

    return (
        <div className="chat-popup-container">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-user">
                    <div className="chat-avatar">
                        {(activeChatUser.first_name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="chat-user-info">
                        <h4>{activeChatUser.first_name} {activeChatUser.last_name}</h4>
                        {activeChatUser.company_name && <span>{activeChatUser.company_name}</span>}
                    </div>
                </div>
                <div className="chat-actions">
                    <button onClick={closeChat} className="chat-close-btn">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12m0-12L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            <div className="chat-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>Keep chats and transactions on Alibaba.com to enjoy order protection. <a href="#">Learn more</a></span>
            </div>

            {/* Messages Body */}
            <div className="chat-body">
                {messages.map((msg, index) => {
                    const isMe = String(msg.senderId) === String(user._id);
                    return (
                        <div key={index} className={`chat-message-wrapper ${isMe ? 'message-sent' : 'message-received'}`}>
                            {!isMe && (
                                <div className="chat-msg-avatar">
                                    {(activeChatUser.first_name?.[0] || 'U').toUpperCase()}
                                </div>
                            )}
                            <div className="chat-msg-content">
                                {msg.productDetails && msg.productDetails.productId && (
                                    <div className="chat-product-attachment">
                                        <img src={getImgUrl(msg.productDetails.image)} alt="Product" />
                                        <div className="chat-product-info">
                                            <p className="chat-product-name line-clamp-2">{msg.productDetails.name}</p>
                                            <p className="chat-product-price font-bold text-orange-600">
                                                {convertPrice ? convertPrice(msg.productDetails.price).formatted : `$${msg.productDetails.price}`}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-them'}`} style={{ opacity: msg.content === 'Uploading...' ? 0.7 : 1 }}>
                                    {msg.messageType === 'image' ? (
                                        <img
                                            src={getImgUrl(msg.content)}
                                            alt="attachment"
                                            style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', display: 'block' }}
                                            onClick={() => window.open(getImgUrl(msg.content), '_blank')}
                                        />
                                    ) : msg.messageType === 'file' ? (
                                        <a href={getImgUrl(msg.content)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
                                            <div className="chat-doc-icon-wrap">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Document</div>
                                                <div style={{ fontSize: '11px', opacity: 0.8 }}>Click to download</div>
                                            </div>
                                        </a>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                                <div className="chat-timestamp" style={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '4px' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && (
                                        <span style={{ display: 'flex' }}>
                                            {msg.isRead ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l4.5 4.5L19 7M9 12l4.5 4.5L20 9" /></svg>
                                            ) : (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="chat-footer">
                <div className="chat-toolbar">

                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach File">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} title="Send Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                    <div className="emoji-picker-container" ref={emojiPickerRef}>
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </button>
                        {showEmojiPicker && (
                            <div className="emoji-picker-popup">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    autoFocusSearch={false}
                                    theme={Theme.LIGHT}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                    </div>
                    {uploading && <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>Uploading...</span>}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <input type="file" ref={imageInputRef} accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>
                {attachedProduct && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #eee', background: '#fafafa', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <img src={getImgUrl(attachedProduct.image)} alt="Attachment" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#333', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{attachedProduct.name}</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{convertPrice ? convertPrice(attachedProduct.price).formatted : `$${attachedProduct.price}`}</div>
                        </div>
                        <button type="button" onClick={() => { setAttachedProduct(null); setNewMessage(''); }} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px' }}>×</button>
                    </div>
                )}
                <div className="chat-input-area mt-2">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Please enter your message here"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="chat-send-btn">
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatPopup;
