import React, { useState, useEffect, useCallback } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';

interface Session {
    _id: string;
    ip_address: string;
    device_type: string;
    os: string;
    browser: string;
    device_name: string;
    is_active: boolean;
    last_active: string;
    created_at: string;
    expires_at: string;
    is_current?: boolean;
}

const DeviceManagement: React.FC = () => {
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/sessions');
            setSessions(res.data || []);
        } catch (err: any) {
            showToast('Failed to load sessions', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const handleRevoke = async (sessionId: string) => {
        if (!window.confirm('Remove this device session? You will be logged out from that device.')) return;
        setRevoking(sessionId);
        try {
            await api.delete('/auth/sessions/' + sessionId);
            showToast('Session removed successfully', 'success');
            fetchSessions();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to remove session', 'error');
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeOthers = async () => {
        if (!window.confirm('Sign out of all other devices? You will remain signed in on this device.')) return;
        try {
            await api.delete('/auth/sessions/other');
            showToast('Signed out of all other devices', 'success');
            fetchSessions();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to sign out other sessions', 'error');
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        return Math.floor(hours / 24) + 'd ago';
    };

    const DeviceIcon = ({ type }: { type: string }) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mobile') || t.includes('phone'))
            return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    };

    const activeCount = sessions.filter(s => s.is_active && new Date(s.expires_at) > new Date()).length;
    const otherActiveSessions = sessions.filter(s => !s.is_current && s.is_active && new Date(s.expires_at) > new Date());

    return (
        <div style={{ maxWidth: '680px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>My Devices & Sessions</h2>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Manage devices where you are currently logged in. You have <strong>{activeCount}</strong> active session{activeCount !== 1 ? 's' : ''}.
                </p>
            </div>

            {otherActiveSessions.length > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                            You have {otherActiveSessions.length} other active session{otherActiveSessions.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <button onClick={handleRevokeOthers}
                        style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Sign Out All Others
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    Loading sessions...
                </div>
            ) : sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    <div style={{ fontWeight: 600 }}>No active sessions found</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sessions.map(session => {
                        const isExpired = !session.is_active || new Date(session.expires_at) < new Date();
                        return (
                            <div key={session._id} style={{
                                background: session.is_current ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#fff',
                                border: session.is_current ? '1.5px solid #86efac' : '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                opacity: isExpired ? 0.5 : 1
                            }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: session.is_current ? '#bbf7d0' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: session.is_current ? '#15803d' : '#6b7280', flexShrink: 0 }}>
                                    <DeviceIcon type={session.device_type} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>
                                            {session.device_name || session.device_type || 'Unknown Device'}
                                        </span>
                                        {session.is_current && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '20px' }}>
                                                THIS DEVICE
                                            </span>
                                        )}
                                        {isExpired && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#e5e7eb', color: '#6b7280', padding: '2px 8px', borderRadius: '20px' }}>
                                                EXPIRED
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>
                                        {session.browser} · {session.os} · {session.ip_address}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                        Last active: {timeAgo(session.last_active || session.created_at)}
                                    </div>
                                </div>
                                {!session.is_current && !isExpired && (
                                    <button onClick={() => handleRevoke(session._id)} disabled={revoking === session._id}
                                        style={{ padding: '7px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                        {revoking === session._id ? 'Removing...' : 'Remove'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DeviceManagement;
