import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import styles from './AiChatbotPopup.module.css';
import { getImgUrl } from '@/utils/imageConfig';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    products?: any[];
    suppliers?: any[];
    timestamp: Date;
}

const QUICK_PROMPTS = [
    "Find apparel suppliers with low MOQ",
    "List electronics products under $50",
    "Find verified home decor manufacturers"
];

const AiChatbotPopup = () => {
    const { user, openLogin, isInitialized, convertPrice } = useAuth();
    const { openChat } = useChat();
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    const [messages, setMessages] = useState<Message[]>([
        {
            sender: 'ai',
            text: "Hello! I am your AI Sourcing Assistant. Describe what you're looking for, and I will find matching wholesale products and suppliers for you.",
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Limits
    const [usage, setUsage] = useState({ count: 0, limit: 5 });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Fetch usage limits when popup is opened
    useEffect(() => {
        if (!user || !isOpen) return;

        const fetchUsage = async () => {
            try {
                const { data } = await api.get('/ai/usage');
                setUsage({ count: data.usage || 0, limit: data.limit || 5 });
            } catch (err) {
                console.error('Failed to fetch AI usage:', err);
            }
        };

        fetchUsage();
    }, [user, isOpen]);

    const handleSendMessage = async (textToSend?: string) => {
        const text = textToSend !== undefined ? textToSend : inputText;
        if (!text.trim() || loading) return;

        if (!user) {
            openLogin();
            return;
        }

        // Add user message to UI
        const newMsg: Message = { sender: 'user', text, timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);
        if (textToSend === undefined) setInputText('');
        setLoading(true);

        try {
            // Compile chat history from state
            const history = messages
                .filter(m => m.text)
                .map(m => ({
                    sender: m.sender,
                    text: m.text
                }));

            const { data } = await api.post('/ai/chatbot', {
                message: text,
                history
            });

            const replyMsg: Message = {
                sender: 'ai',
                text: data.reply,
                products: data.products || [],
                suppliers: data.suppliers || [],
                timestamp: new Date()
            };

            setMessages(prev => [...prev, replyMsg]);
            setUsage({ count: data.usage || 0, limit: data.limit || 5 });
        } catch (err: any) {
            console.error('Chatbot message send error:', err);
            const errorMsg = err.response?.data?.message || 'Sorry, I encountered an issue processing your request.';
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: errorMsg,
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                sender: 'ai',
                text: "Chat history cleared. How can I help you with your sourcing today?",
                timestamp: new Date()
            }
        ]);
    };

    const handleContactSupplier = (e: React.MouseEvent, supplier: any) => {
        e.preventDefault();
        e.stopPropagation();
        openChat(supplier);
    };

    if (!isInitialized) return null;

    return (
        <div className={styles['ai-chat-root']} ref={popupRef}>
            {/* FLOATING ACTION BUTTON (FAB) */}
            <div className={styles['ai-fab-container']}>
                <button 
                    className={`${styles['ai-fab']} ${isOpen ? styles['active'] : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    title="AI Sourcing Assistant"
                >
                    {isOpen ? (
                        <span className={styles['ai-close-icon']}>✕</span>
                    ) : (
                        <>
                            <svg className={styles['ai-sparkle-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                <path d="M12 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none" />
                            </svg>
                        </>
                    )}
                </button>
                {!isOpen && (
                    <div className={styles['ai-fab-tooltip']} onClick={() => setIsOpen(true)}>
                        Ask any question?
                    </div>
                )}
            </div>

            {/* CHAT POPUP WINDOW */}
            {isOpen && (
                <div className={styles['ai-popup-window']}>
                    {/* Header */}
                    <div className={styles['ai-header']}>
                        <div className={styles['ai-header-left']}>
                            <div className={styles['ai-logo']}>
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" /></svg>
                            </div>
                            <div>
                                <h3 className={styles['ai-title']}>AI Sourcing Assistant</h3>
                                <span className={styles['ai-online-status']}>
                                    <span className={styles['ai-online-dot']}>●</span> Online
                                </span>
                            </div>
                        </div>
                        <div className={styles['ai-header-right']}>
                            {messages.length > 1 && (
                                <button className={styles['ai-clear-btn']} onClick={handleClearChat} title="Clear history">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                            <button className={styles['ai-close-btn']} onClick={() => setIsOpen(false)} title="Minimize popup">✕</button>
                        </div>
                    </div>

                    {/* BODY PANEL: CHAT */}
                    <div className={styles['ai-chat-body']}>
                            <div className={styles['ai-message-list']}>
                                {messages.map((m, idx) => (
                                    <div key={idx} className={`${styles['ai-message-wrapper']} ${styles[m.sender]}`}>
                                        <div className={styles['ai-bubble']}>
                                            {m.text}
                                        </div>

                                        {/* Products recommendations attached to AI bubble */}
                                        {m.products && m.products.length > 0 && (
                                            <div className={styles['ai-attachment-list']}>
                                                <h4 className={styles['ai-attachment-header']}>Matching Products:</h4>
                                                <div className={styles['ai-grid-products']}>
                                                    {m.products.map((p) => {
                                                        const pSlug = p.slug || p._id;
                                                        return (
                                                            <div key={p._id} className={styles['ai-product-card']}>
                                                                <div className={styles['ai-prod-img-wrap']}>
                                                                    <img src={getImgUrl(p.images?.[0] || p.main_image)} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100'; }} />
                                                                </div>
                                                                <div className={styles['ai-prod-body']}>
                                                                    <h5 className={styles['ai-prod-title']} title={p.name}>{p.name}</h5>
                                                                    <div className={styles['ai-prod-meta']}>
                                                                        <span className={styles['ai-prod-price']}>{convertPrice(p.main_price || 0).formatted}</span>
                                                                        {p.moq && <span className={styles['ai-prod-moq']}>MOQ: {p.moq}</span>}
                                                                    </div>
                                                                    <button 
                                                                        className={styles['ai-card-btn']}
                                                                        onClick={() => {
                                                                            setIsOpen(false);
                                                                            router.push(`/product/${pSlug}`);
                                                                        }}
                                                                    >
                                                                        View Details
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suppliers recommendations attached to AI bubble */}
                                        {m.suppliers && m.suppliers.length > 0 && (
                                            <div className={styles['ai-attachment-list']}>
                                                <h4 className={styles['ai-attachment-header']}>Matching Suppliers:</h4>
                                                <div className={styles['ai-grid-suppliers']}>
                                                    {m.suppliers.map((s) => {
                                                        const sId = s.user_id?._id || s.user_id || s._id;
                                                        return (
                                                            <div key={s._id} className={styles['ai-supplier-card']}>
                                                                <div className={styles['ai-sup-info']}>
                                                                    <h5 className={styles['ai-sup-name']}>{s.company_name}</h5>
                                                                    <div className={styles['ai-sup-sub']}>{s.business_type} • {s.city || 'Global'}</div>
                                                                </div>
                                                                <div className={styles['ai-sup-actions']}>
                                                                    <button 
                                                                        className={styles['ai-card-btn']}
                                                                        onClick={() => {
                                                                            setIsOpen(false);
                                                                            router.push(`/supplier/${sId}`);
                                                                        }}
                                                                    >
                                                                        Profile
                                                                    </button>
                                                                    <button 
                                                                        className={styles['ai-card-btn'] + " " + styles['primary']}
                                                                        onClick={(e) => handleContactSupplier(e, s)}
                                                                    >
                                                                        Inquire
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className={`${styles['ai-message-wrapper']} ${styles['ai']}`}>
                                        <div className={styles['ai-bubble']}>
                                            <div className={styles['ai-typing']}>
                                                <span></span><span></span><span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick suggestions at start */}
                            {messages.length === 1 && !loading && (
                                <div className={styles['ai-quick-prompts']}>
                                    <span className={styles['ai-quick-title']}>Suggested queries:</span>
                                    <div className={styles['ai-prompt-chips']}>
                                        {QUICK_PROMPTS.map((p, i) => (
                                            <button 
                                                key={i} 
                                                className={styles['ai-prompt-chip']}
                                                onClick={() => handleSendMessage(p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Form Input Footer */}
                            {!user ? (
                                <div className={styles['ai-login-footer']}>
                                    <p>Please sign in to chat with our AI Assistant.</p>
                                    <button className={styles['ai-login-btn']} onClick={openLogin}>Sign In</button>
                                </div>
                            ) : (
                                <div className={styles['ai-input-footer']}>
                                    <div className={styles['ai-input-row']}>
                                        <input 
                                            type="text"
                                            className={styles['ai-input-field']}
                                            placeholder="Type a sourcing question..."
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSendMessage();
                                            }}
                                            disabled={loading}
                                        />
                                        <button 
                                            className={styles['ai-send-btn']}
                                            onClick={() => handleSendMessage()}
                                            disabled={loading || !inputText.trim()}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            )}
        </div>
    );
};

export default AiChatbotPopup;
