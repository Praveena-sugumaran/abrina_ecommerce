import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

const AdminNotifications = () => {
    const { t } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                // Filter for admin specific or just all for this page
                setNotifications(data);
            } catch (err) {
                console.error('Failed to fetch system notifications', err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (err) {
            console.error('Failed to mark all notifications as read', err);
        }
    };

    if (loading) return (
        <div className="admin-page">
            <div className="admin-loading-text">{t('syncing_alerts') || 'Syncing system alerts...'}</div>
        </div>
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('system_alerts') || 'Security & System Alerts'}</h1>
                    <p className="admin-page-subtitle">{t('system_alerts_desc') || 'Monitor system health, user security events, and platform activities'}</p>
                </div>
                <div className="admin-page-actions">
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={markAllRead}
                            className="admin-btn admin-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 10-10M2 12l5 5 2-2" /></svg>
                            {t('mark_all_read') || 'Mark All Read'}
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-nav-hover)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-main)', textTransform: 'uppercase' }}>{t('live_system_monitor') || 'Live System Monitor'}</span>
                    </div>
                </div>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">{t('total_notifications') || 'Total Notifications'}</div>
                    <div className="admin-stat-card-value">{notifications.length}</div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">{t('unread_alerts') || 'Unread Alerts'}</div>
                    <div className="admin-stat-card-value" style={{ color: '#ef4444' }}>
                        {notifications.filter(n => !n.isRead).length}
                    </div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">{t('critical_events') || 'Critical Events'}</div>
                    <div className="admin-stat-card-value">
                        {notifications.filter(n => n.type === 'Security' || n.type === 'Critical').length}
                    </div>
                </div>
                <div className="admin-stat-premium">
                    <div className="admin-stat-card-label">{t('last_sync') || 'Last Sync'}</div>
                    <div className="admin-stat-card-value" style={{ fontSize: '16px', paddingTop: '8px' }}>
                        {notifications.length > 0 ? new Date(notifications[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>{t('alert_status') || 'Alert Status'}</th>
                                <th style={{ width: '180px' }}>{t('timestamp') || 'Timestamp'}</th>
                                <th style={{ width: '120px' }}>{t('category') || 'Category'}</th>
                                <th>{t('event_details') || 'Event Details'}</th>
                                <th style={{ width: '120px', textAlign: 'right' }}>{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map(notification => (
                                <tr key={notification._id} style={{ background: !notification.isRead ? 'rgba(37, 99, 235, 0.03)' : 'transparent' }}>
                                    <td>
                                        <span className={`admin-badge ${!notification.isRead ? 'admin-badge-info' : 'admin-badge-neutral'}`} style={{ fontSize: '10px', width: '100%', justifyContent: 'center' }}>
                                            {!notification.isRead ? (t('unread_status') || '● Unread') : (t('read_status') || '✓ Read')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '13px' }}>
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${notification.isRead ? 'admin-badge-neutral' : 'admin-badge-info'}`} style={{ fontSize: '10px' }}>
                                            {t(notification.type) || notification.type || 'System'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 800, color: 'var(--admin-text-main)', fontSize: '14px' }}>
                                            {notification.title}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>
                                            {notification.message}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification._id)}
                                                className="admin-action-btn-edit"
                                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                            >
                                                {t('mark_read') || 'Mark Read'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {notifications.length === 0 && (
                    <div className="admin-card-body">
                        <div className="admin-empty-state">
                            <div className="admin-empty-state-icon">🔔</div>
                            <h3>{t('all_clear') || 'All clear!'}</h3>
                            <p>{t('no_notifications_desc') || 'No system notifications or alerts at this time.'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminNotifications;
