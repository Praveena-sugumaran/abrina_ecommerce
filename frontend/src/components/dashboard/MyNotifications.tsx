import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/context/NotificationContext';
import styles from './MyNotifications.module.css';

const getType = (type: any, styles: any) => {
    const config = {
        order: {
            label: 'Order Update',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
            ),
            avatarClass: `${styles['notif-wa-avatar']} ${styles['order-type']}`,
        },
        chat: {
            label: 'Message',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            avatarClass: `${styles['notif-wa-avatar']} ${styles['chat-type']}`,
        },
        alert: {
            label: 'Alert',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            ),
            avatarClass: `${styles['notif-wa-avatar']} ${styles['alert-type']}`,
        },
    };

    return (config as any)[type] || {
        label: 'Notification',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
        avatarClass: `${styles['notif-wa-avatar']} ${styles['default-type']}`,
    };
};

const formatTime = (date: string | Date) => {
    if (!date) return 'Recently';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();

    if (d.toDateString() === today) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getDateLabel = (date: string | Date) => {
    if (!date) return 'Recent';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recent';
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    if (d.toDateString() === today) return 'Today';
    if (d.toDateString() === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

const MyNotifications = () => {
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
    const [filter, setFilter] = useState('All');

    const filtered = notifications.filter(n =>
        filter === 'Unread' ? !n.isRead : true
    );

    // Group by date for date separators
    let lastDate: any = null;

    return (
        <div className={styles['notifications-wa-container']}>
            {/* Header */}
            <div className={styles['notifications-wa-header']}>
                <div>
                    <h2 className={styles['notifications-wa-title']}>Notifications</h2>
                    <p className={styles['notifications-wa-subtitle']}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </p>
                </div>
                <div className={styles['notifications-wa-actions']}>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['All', 'Unread'].map(f => (
                            <button
                                key={f}
                                className={`${styles['notif-filter-pill']} ${filter === f ? styles['active'] : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button
                        className={styles['notif-mark-all-btn']}
                        onClick={markAllRead}
                        type="button"
                    >
                        Mark all read
                    </button>
                </div>
            </div>

            {/* Notification list */}
            <div className={styles['notifications-wa-list']}>
                {filtered.length === 0 ? (
                    <div className={styles['notif-wa-empty']}>
                        <div className={styles['notif-wa-empty-icon']}>🔔</div>
                        <h3>All caught up!</h3>
                        <p>No {filter === 'Unread' ? 'unread ' : ''}notifications to show.</p>
                    </div>
                ) : (
                    filtered.map((n: any) => {
                        const typeInfo = getType(n.type, styles);
                        const createdAt = n.createdAt || n.created_at;
                        const dateLabel = getDateLabel(createdAt);
                        const showSep = dateLabel !== lastDate;
                        lastDate = dateLabel;

                        return (
                            <React.Fragment key={n._id}>
                                {/* Date separator */}
                                {showSep && (
                                    <div className={styles['notif-wa-date-sep']}>
                                        <span>{dateLabel}</span>
                                    </div>
                                )}

                                {/* Notification item */}
                                <div
                                    className={`${styles['notif-wa-item']} ${!n.isRead ? styles['unread'] : ''}`}
                                    onClick={() => {
                                        if (!n.isRead) markAsRead(n._id);
                                        if (n.link) {
                                            // Handle both absolute and relative links
                                            const url = n.link.replace(process.env.NEXT_PUBLIC_FRONTEND_URL || '', '');
                                            router.push(url);
                                        }
                                    }}
                                >
                                    {/* Avatar / icon */}
                                    <div className={typeInfo.avatarClass}>
                                        {typeInfo.icon}
                                    </div>

                                    {/* Content */}
                                    <div className={styles['notif-wa-body']}>
                                        <div className={styles['notif-wa-top']}>
                                            <span className={styles['notif-wa-name']}>{n.title || typeInfo.label}</span>
                                            <span className={styles['notif-wa-time']}>{formatTime(n.createdAt || n.created_at)}</span>
                                        </div>
                                        <p className={styles['notif-wa-msg']}>{n.message}</p>

                                    </div>

                                    {/* Unread indicator */}
                                    {!n.isRead && (
                                        <div className={styles['notif-wa-unread-dot']} title="Unread">1</div>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MyNotifications;
