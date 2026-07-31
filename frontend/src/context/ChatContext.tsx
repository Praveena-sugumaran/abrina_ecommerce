import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface Conversation {
    _id: string;
    participants: any[];
    lastMessage?: any;
    unreadCount?: number;
    updatedAt?: string;
    createdAt?: string;
}

interface ChatContextType {
    isChatOpen: boolean;
    activeChatUser: any;
    conversations: Conversation[];
    unreadTotal: number;
    socket: Socket | null;
    openChat: (chatUser: any, initialProduct?: any) => void;
    closeChat: () => void;
    fetchConversations: () => Promise<void>;
    markChatAsRead: (conversationId: string, senderId: string) => Promise<void>;
}

// The io client will use window.location if url is not provided, or we can use our frontend configured API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || (typeof window !== 'undefined' ? window.location.origin : '');

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeChatUser, setActiveChatUser] = useState<any>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);

    const fetchConversations = async () => {
        if (!user) return;
        try {
            const role = user.role === 'supplier' || user.roles?.includes('supplier') ? 'supplier' : 'buyer';
            const { data } = await api.get(`/chat/conversations?role=${role}`);
            if (data && Array.isArray(data)) {
                // Ensure participants array exists for frontend compatibility
                const mappedData = data.map(conv => {
                    const participants = [];
                    if (conv.buyer_id) participants.push(conv.buyer_id);
                    if (conv.supplier_id) participants.push(conv.supplier_id);
                    return { ...conv, participants };
                });
                
                const sortedData = mappedData.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                setConversations(sortedData);
                const total = sortedData.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
                setUnreadTotal(total);
            } else {
                setConversations([]);
                setUnreadTotal(0);
            }
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        }
    };

    useEffect(() => {
        if (!user) {
            setSocket(null);
            setConversations([]);
            setUnreadTotal(0);
            setIsChatOpen(false);
            return;
        }

        // Always fetch conversations via REST (once; keep socket for live updates)
        fetchConversations();

        const newSocket = io(BACKEND_URL, {
            transports: ['polling', 'websocket'],
            withCredentials: true
        });
        setSocket(newSocket);

        newSocket.emit('join', user._id);

        newSocket.on('messageReceived', (message) => {
            fetchConversations();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('newMessage', { detail: message }));
            }
        });

        newSocket.on('messagesRead', () => {
            fetchConversations();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chatReadUpdated'));
            }
        });

        newSocket.on('notificationReceived', (notification) => {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('notificationReceived', { detail: notification }));
            }
        });

        return () => {
            newSocket.off('messageReceived');
            newSocket.off('messagesRead');
            newSocket.off('notificationReceived');
            newSocket.disconnect();
        };
    }, [user?._id]);

    const markChatAsRead = async (conversationId: string, senderId: string) => {
        try {
            await api.put(`/chat/messages/${conversationId}/read`);
            if (socket) {
                socket.emit('markAsRead', { senderId, receiverId: user._id, conversationId });
            }
            fetchConversations();
        } catch (err) {
            console.error(err);
        }
    };

    const openChat = (chatUser: any, initialProduct = null) => {
        if (!user) {
            alert('Please login to chat');
            return;
        }
        setActiveChatUser(chatUser);
        setIsChatOpen(true);
        // Dispatch an event if we want the ChatPopup to pre-fill a product link
        if (initialProduct && typeof window !== 'undefined') {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('attachProductToChat', { detail: initialProduct }));
            }, 100);
        }
    };

    const closeChat = () => {
        setIsChatOpen(false);
        setActiveChatUser(null);
    };

    return (
        <ChatContext.Provider value={{
            isChatOpen,
            activeChatUser,
            conversations,
            unreadTotal,
            socket,
            openChat,
            closeChat,
            fetchConversations,
            markChatAsRead
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
