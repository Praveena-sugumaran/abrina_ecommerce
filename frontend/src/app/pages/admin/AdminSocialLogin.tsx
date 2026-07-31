import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

const PROVIDERS = [
    {
        id: 'google', label: 'Google', color: '#EA4335',
        desc: 'Allow users to sign in with their Google workspace or personal accounts.',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#fff" d="M21.35 11.1h-9.17v2.73h6.51a5.56 5.56 0 0 1-2.42 3.65v3.01h3.91a8.87 8.87 0 0 0 2.68-6.66c0-.5-.04-.99-.12-1.45l-.39-1.28z" />
                <path fill="#fff" d="M12.18 20.24a8.56 8.56 0 0 1-5.46-1.97l-3.9 3.02A12.44 12.44 0 0 0 12.18 24c3.41 0 6.64-1.24 9.09-3.34l-3.91-3.01a7.84 7.84 0 0 1-5.18 2.59z" />
                <path fill="#fff" d="M2.82 21.29l3.9-3.02a8.58 8.58 0 0 1-.41-2.67V10.7L2.4 7.6A12.42 12.42 0 0 0 0 12.18c0 3.88.92 7.54 2.82 9.11z" />
                <path fill="#fff" d="M12.18 3.76c2.05 0 3.89.7 5.37 1.84l4.03-4.03C19.14.77 15.9 0 12.18 0 7.42 0 3.28 2.73 1.25 6.72l5.06 3.92a8.56 8.56 0 0 1 5.87-6.88z" />
            </svg>
        ),
        fields: [
            { key: 'client_id', label: 'Client ID', placeholder: '1234567890-abc.apps.googleusercontent.com' },
            { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...' },
        ]
    },
    {
        id: 'facebook', label: 'Facebook', color: '#1877F2',
        desc: 'Connect your Facebook App to enable seamless login for millions of users.',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
        fields: [
            { key: 'app_id', label: 'App ID', placeholder: '123456789012345' },
            { key: 'app_secret', label: 'App Secret', placeholder: 'abc123...' },
        ]
    },
    {
        id: 'linkedin', label: 'LinkedIn', color: '#0A66C2',
        desc: 'Best for professional B2B marketplaces. Requires LinkedIn API access.',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
        ),
        fields: [
            { key: 'client_id', label: 'Client ID', placeholder: '78abc123...' },
            { key: 'client_secret', label: 'Client Secret', placeholder: 'xyz456...' },
        ]
    }
];

const AdminSocialLogin = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('google');
    const [config, setConfig] = useState<any>({
        google: { enabled: false, client_id: '', client_secret: '' },
        facebook: { enabled: false, app_id: '', app_secret: '' },
        linkedin: { enabled: false, client_id: '', client_secret: '' }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await api.get('/admin/social-login');
                setConfig((prev: any) => ({ ...prev, ...data }));
            } catch (err) { setError('Failed to load settings. Please refresh.'); }
            finally { setLoading(false); }
        };
        fetchConfig();
    }, []);

    const current = config[activeTab] || {};
    const provider = PROVIDERS.find(p => p.id === activeTab) || PROVIDERS[0];

    const setField = (key: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [activeTab]: { ...prev[activeTab], [key]: value } }));
        setSaved(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            await api.put('/admin/social-login', config);
            setSaved(true); setTimeout(() => setSaved(false), 3000);
            showToast('Social login settings updated successfully!', 'success');
        } catch (err: any) { 
            const msg = err.response?.data?.message || 'Failed to save settings.';
            setError(msg);
            showToast(msg, 'error');
        }
        finally { setSaving(false); }
    };

    return (
        <div className={"admin-page"} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#000000' }}>Social Logins</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Configure third-party OAuth providers to simplify user registration</p>
                </div>
            </div>

            {/* Provider Cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {PROVIDERS.map(p => (
                    <div
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        style={{
                            cursor: 'pointer',
                            background: activeTab === p.id ? '#ffffff' : 'var(--admin-card-bg)',
                            border: activeTab === p.id ? `2.5px solid ${p.color}` : '2px solid transparent',
                            borderRadius: '20px',
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '12px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: activeTab === p.id ? `0 12px 24px ${p.color}20` : '0 4px 6px rgba(0,0,0,0.02)',
                            opacity: activeTab === p.id ? 1 : 0.6,
                            transform: activeTab === p.id ? 'translateY(-4px)' : 'none'
                        }}
                    >
                        <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            background: p.color, 
                            borderRadius: '14px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: `0 8px 16px ${p.color}40`
                        }}>
                            {p.icon}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--admin-text-main)' }}>{p.label}</span>
                    </div>
                ))}
            </div>

            <div className={"admin-card"} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--admin-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
                {loading ? (
                    <div className={"admin-loading-text"} style={{ padding: '100px 0' }}>
                        Fetching settings...
                    </div>
                ) : (
                    <div style={{ padding: '40px' }}>
                        {error && <div className={styles['admin-alert'] + " " + styles['admin-alert-error']} style={{ borderRadius: '14px', marginBottom: '24px' }}>{error}</div>}
                        {saved && <div className={styles['admin-alert'] + " " + styles['admin-alert-success']} style={{ borderRadius: '14px', marginBottom: '24px' }}>✓ Settings updated successfully!</div>}

                        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                            <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>Configure {provider.label} OAuth</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0 }}>Provide your API keys to enable "{provider.label}" as a login option.</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {provider.fields.map(f => (
                                        <div key={f.key} className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']} style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>{f.label}</label>
                                            <input
                                                type="text"
                                                className={styles['admin-form-input']}
                                                style={{ 
                                                    fontFamily: 'monospace', 
                                                    fontSize: '14px', 
                                                    padding: '14px 18px', 
                                                    borderRadius: '14px',
                                                    background: '#f8fafc',
                                                    border: '1.5px solid #e2e8f0'
                                                }}
                                                value={current[f.key] || ''}
                                                onChange={e => setField(f.key, e.target.value)}
                                                placeholder={f.placeholder}
                                                disabled={!current.enabled}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>Enable {provider.label} Login</div>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>Show the "{provider.label}" button on login and registration pages.</p>
                                    </div>
                                    <div
                                        className={`${styles['admin-toggle']} ${current.enabled ? styles['on'] : ''}`}
                                        onClick={() => setField('enabled', !current.enabled)}
                                    />
                                </div>

                                <div style={{ marginTop: '12px' }}>
                                    <button type="submit" className={"admin-btn" + " " + "admin-btn-primary"} disabled={saving} style={{ padding: '16px 36px', borderRadius: '16px', fontSize: '15px', fontWeight: 800, width: 'fit-content' }}>
                                        {saving ? 'Processing...' : 'Save Social Settings'}
                                    </button>
                                </div>
                            </form>

                            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: provider.color + '08', border: `1px solid ${provider.color}15`, borderRadius: '20px', padding: '24px' }}>
                                    <div style={{ width: '40px', height: '40px', background: provider.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                        {React.cloneElement(provider.icon as any, { width: 22, height: 22 })}
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--admin-text-main)', marginBottom: '8px' }}>{provider.label} Integration</h3>
                                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--admin-text-secondary)', marginBottom: 0 }}>
                                        {provider.desc} Ensure your callback URLs are properly whitelisted in the {provider.label} developer portal.
                                    </p>
                                </div>

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Redirect URI</div>
                                    <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {window.location.origin}/api/auth/{activeTab}/callback
                                    </div>
                                    <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#64748b' }}>Copy this into your OAuth provider settings.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSocialLogin;
