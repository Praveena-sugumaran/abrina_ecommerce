import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';
import { io } from 'socket.io-client';

interface Notification {
    _id: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
    role: string;
    type?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, currentRole } = useAuth();
    const { socket } = useChat();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await api.get(`/notifications?role=${currentRole}`);
            const sortedData = (data as Notification[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotifications(sortedData);
            setUnreadCount(sortedData.filter(n => !n.isRead).length);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [user, currentRole]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Request browser notification permission
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (window.Notification.permission === 'default') {
                    window.Notification.requestPermission();
                }
            }
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, fetchNotifications]);

    useEffect(() => {
        if (!socket) return;

        socket.on('notificationReceived', (notification: any) => {
            // If it's a chat notification, we always want to show it regardless of current role
            const isChat = notification.type === 'chat';
            if (!isChat && notification.role && notification.role !== currentRole) return;
            
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === "granted") {
                new window.Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }
        });

        return () => {
            socket.off('notificationReceived');
        };
    }, [socket, currentRole]);

    // Note: We intentionally do not auto-request browser notification permission.
    // Permission should be triggered by an explicit user action to avoid browser UX issues.

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put(`/notifications/read-all?role=${currentRole}`);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, fetchNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
