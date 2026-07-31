'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

const FieldRow = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'flex-start', padding: '20px 0', borderBottom: '1px solid var(--admin-border)' }}>
        <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{label}</div>
            {hint && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '3px', lineHeight: '1.5' }}>{hint}</div>}
        </div>
        <div>{children}</div>
    </div>
);

const Toggle = ({ on, onToggle, labelOn, labelOff, danger }: { on: boolean; onToggle: () => void; labelOn: string; labelOff: string; danger?: boolean }) => (
    <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}
    >
        <div style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', background: on ? (danger ? '#dc2626' : 'var(--primary-color)') : 'var(--admin-border)', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: on ? 'calc(100% - 21px)' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
        </div>
        <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{on ? labelOn : labelOff}</div>
        </div>
    </div>
);

const AdminLiveStreamSettings = () => {
    const router = useRouter();
    const { refreshSiteSettings, t } = useAuth();
    const { showToast } = useToast();

    const [settings, setSettings] = useState({
        live_stream_enabled: true,
        zego_app_id: '',
        zego_app_sign: '',
        zego_server_secret: '',
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                setSettings(prev => ({
                    ...prev,
                    live_stream_enabled: data.live_stream_enabled !== undefined ? data.live_stream_enabled : true,
                    zego_app_id: data.zego_app_id || '',
                    zego_app_sign: data.zego_app_sign || '',
                    zego_server_secret: data.zego_server_secret || '',
                }));
            } catch (err) {
                console.error('Failed to load live streaming settings:', err);
            }
        };
        fetchInitialData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.put('/admin/site-settings', settings);
            refreshSiteSettings();
            setSaved(true);
            showToast('Live Streaming settings saved successfully', 'success');
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save settings');
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles['admin-page']}>
            {/* Header */}
            <div className={styles['admin-page-header']}>
                <div>
                    <h1 className={styles['admin-page-title']}>Live Streaming Settings</h1>
                    <p className={styles['admin-page-subtitle']}>Configure supplier live showrooms, webinars, and manage API keys for video delivery</p>
                </div>
            </div>

            {error && (
                <div className={`${styles['admin-alert']} ${styles['admin-alert-error']}`} style={{ marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className={styles['admin-card']} style={{ marginBottom: '24px' }}>
                    <div className={styles['admin-card-header']}>
                        <h2>Live Streaming Enable & Configuration</h2>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>Manage global streaming state and select ZegoCloud integration settings</span>
                    </div>
                    <div className={styles['admin-card-body']}>
                        <FieldRow label="Enable Live Streaming" hint="Toggle live stream broadcasts and virtual webinars globally on the platform">
                            <Toggle
                                on={settings.live_stream_enabled}
                                onToggle={() => setSettings(prev => ({ ...prev, live_stream_enabled: !prev.live_stream_enabled }))}
                                labelOn="Active — suppliers can host live product demonstrations and webinars"
                                labelOff="Inactive — live streaming is disabled globally on the marketplace"
                            />
                        </FieldRow>

                        {settings.live_stream_enabled && (
                            <div style={{ padding: '12px', color: 'var(--admin-text-muted)' }}>
                                Live streaming is currently active globally.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Save Bar ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '20px 24px', background: 'var(--admin-card-bg)', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                        {saving ? 'Saving changes...' : saved ? 'All changes saved' : 'You have unsaved changes'}
                    </span>
                    <button type="submit" disabled={saving} className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} style={{ padding: '10px 32px' }}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminLiveStreamSettings;
