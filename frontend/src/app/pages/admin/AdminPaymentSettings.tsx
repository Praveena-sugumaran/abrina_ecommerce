import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

const PROVIDERS = [
    { id: 'stripe', name: 'Stripe', desc: 'Credit/Debit Card Payments', color: '#635BFF', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13.479 9.883c-2.516-.592-3.328-1.318-3.328-2.393 0-1.219 1.139-2.069 3.037-2.069 1.996 0 2.739.954 2.808 2.363h2.476c-.078-1.942-1.266-3.727-3.622-4.302V1h-3.237v2.439C9.57 3.99 7.5 5.556 7.5 8.061c0 2.969 2.451 4.447 6.021 5.133 2.765.617 3.322 1.523 3.322 2.577 0 .736-.529 1.91-3.037 1.91-2.312 0-3.219-1.033-3.346-2.364H7.985c.143 2.464 1.979 3.852 4.015 4.314V22h3.237v-2.433c2.036-.389 3.763-1.799 3.763-4.262 0-3.403-2.916-4.563-5.521-5.422z" /></svg> },
    { id: 'paypal', name: 'PayPal', desc: 'Accept PayPal and Cards', color: '#00457C', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.067 8.478c-.492-3.269-3.212-4.144-6.495-4.144H7.135a1.29 1.29 0 0 0-1.28 1.12L3.102 21.05a.43.43 0 0 0 .425.498h4.295c.27 0 .5-.2.536-.467l.805-5.074c.036-.226.228-.396.457-.396h2.247c3.957 0 6.666-1.583 7.33-6.196.115-.81.085-1.554-.13-2.227L20.067 8.478z" /></svg> },
    { id: 'razorpay', name: 'Razorpay', desc: 'India Payment Gateway', color: '#02042B', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M22 6L12 21 2 6l10-4 10 4z" /></svg> }
];

const AdminPaymentSettings = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('stripe');
    const [settings, setSettings] = useState({ enable: false, live_mode: false, public_key: '', secret_key: '', provider: 'stripe' });
    const [secretKeyMasked, setSecretKeyMasked] = useState('');
    const [editSecret, setEditSecret] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/admin/payment-settings?provider=${activeTab}`);
                setSettings({ enable: data.enable || false, live_mode: data.live_mode || false, public_key: data.public_key || '', secret_key: '', provider: data.provider || activeTab });
                setSecretKeyMasked(data.secret_key_masked || '');
                setEditSecret(false);
            } catch (err) { setError('Failed to load payment settings.'); }
            finally { setLoading(false); }
        };
        fetchSettings();
    }, [activeTab]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setSaved(false); setError('');
        try {
            const payload: any = { enable: settings.enable, live_mode: settings.live_mode, public_key: settings.public_key, provider: activeTab };
            if (editSecret && settings.secret_key) payload.secret_key = settings.secret_key;
            await api.put('/admin/payment-settings', payload);
            setSaved(true); setEditSecret(false); setTimeout(() => setSaved(false), 3000);
            showToast('Settings updated successfully!', 'success');
        } catch (err) { 
            setError('Failed to save settings. Please try again.'); 
            showToast('Failed to save settings.', 'error');
        }
        finally { setSaving(false); }
    };

    const currentProvider = PROVIDERS.find(p => p.id === activeTab) || PROVIDERS[0];
    const isManual = activeTab === 'bank_transfer' || activeTab === 'cod';
    const publicKeyLabel = activeTab === 'paypal' ? 'Client ID' : activeTab === 'razorpay' ? 'Key ID' : isManual ? 'Instruction Title' : 'Publishable Key';
    const secretKeyLabel = activeTab === 'paypal' ? 'Client Secret' : activeTab === 'razorpay' ? 'Key Secret' : isManual ? 'Details / Instructions' : 'Secret Key';

    return (
        <div className={"admin-page"} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#000000' }}>Payment Methods</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Configure secure gateways to accept payments from customers worldwide</p>
                </div>
            </div>

            {/* Provider Selection Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {PROVIDERS.map(provider => (
                    <div
                        key={provider.id}
                        onClick={() => setActiveTab(provider.id)}
                        style={{
                            cursor: 'pointer',
                            background: activeTab === provider.id ? '#ffffff' : 'var(--admin-card-bg)',
                            border: activeTab === provider.id ? `2.5px solid ${provider.color}` : '2px solid transparent',
                            borderRadius: '20px',
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '12px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: activeTab === provider.id ? `0 12px 24px ${provider.color}20` : '0 4px 6px rgba(0,0,0,0.02)',
                            opacity: activeTab === provider.id ? 1 : 0.6,
                            transform: activeTab === provider.id ? 'translateY(-4px)' : 'none'
                        }}
                    >
                        <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            background: provider.color, 
                            borderRadius: '14px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: `0 8px 16px ${provider.color}40`
                        }}>
                            {provider.icon}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--admin-text-main)' }}>{provider.name}</span>
                    </div>
                ))}
            </div>

            <div className={"admin-card"} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--admin-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
                {loading ? (
                    <div className={"admin-loading-text"} style={{ padding: '100px 0' }}>
                        <div className="admin-spinner" style={{ marginBottom: '16px' }}></div>
                        Fetching {currentProvider.name} settings...
                    </div>
                ) : (
                    <div style={{ padding: '40px' }}>
                        {error && <div className={styles['admin-alert'] + " " + styles['admin-alert-error']} style={{ borderRadius: '14px', marginBottom: '24px' }}>{error}</div>}
                        {saved && <div className={styles['admin-alert'] + " " + styles['admin-alert-success']} style={{ borderRadius: '14px', marginBottom: '24px' }}>✓ Settings updated successfully!</div>}

                        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                            {/* Form Side */}
                            <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>Configure {currentProvider.name}</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0 }}>Enter your API credentials to connect this gateway.</p>
                                </div>

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>{publicKeyLabel}</label>
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
                                        value={settings.public_key}
                                        onChange={e => setSettings(p => ({ ...p, public_key: e.target.value }))}
                                        placeholder={activeTab === 'stripe' ? (settings.live_mode ? 'pk_live_...' : 'pk_test_...') : `Enter ${publicKeyLabel}`}
                                    />
                                </div>

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>{secretKeyLabel}</label>
                                    {!editSecret && secretKeyMasked ? (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', fontSize: '14px', fontFamily: 'monospace', color: 'var(--admin-text-muted)', background: '#f8fafc' }}>
                                                •••••••••••••••••••••••• {secretKeyMasked.slice(-4)}
                                            </div>
                                            <button type="button" onClick={() => setEditSecret(true)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '12px 20px' }}>Change</button>
                                        </div>
                                    ) : isManual ? (
                                        <textarea
                                            className={styles['admin-form-textarea']}
                                            value={settings.secret_key}
                                            onChange={e => setSettings(p => ({ ...p, secret_key: e.target.value }))}
                                            placeholder={activeTab === 'bank_transfer' ? "e.g. Bank: JP Morgan, Account: 123456789, SWIFT: ..." : "e.g. Pay cash to our agent upon delivery."}
                                            style={{ minHeight: '140px', borderRadius: '14px', padding: '16px', fontSize: '14px', background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                                        />
                                    ) : (
                                        <input
                                            type="password"
                                            className={styles['admin-form-input']}
                                            style={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '14px', 
                                                padding: '14px 18px', 
                                                borderRadius: '14px',
                                                background: '#f8fafc',
                                                border: '1.5px solid #e2e8f0'
                                            }}
                                            value={settings.secret_key}
                                            onChange={e => setSettings(p => ({ ...p, secret_key: e.target.value }))}
                                            placeholder={activeTab === 'stripe' ? (settings.live_mode ? 'sk_live_...' : 'sk_test_...') : `Enter ${secretKeyLabel}`}
                                            autoFocus={editSecret}
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>Enable Gateway</div>
                                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>Allow customers to checkout via {currentProvider.name}</p>
                                        </div>
                                        <div
                                            className={`${styles['admin-toggle']} ${settings.enable ? styles['on'] : ''}`}
                                            onClick={() => setSettings(p => ({ ...p, enable: !p.enable }))}
                                        />
                                    </div>
                                    {!isManual && (
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '1px solid #f1f5f9', paddingLeft: '24px' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>Live Mode</div>
                                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: settings.live_mode ? '#dc2626' : 'var(--admin-text-muted)', fontWeight: settings.live_mode ? 700 : 400 }}>
                                                    {settings.live_mode ? 'Processing REAL payments' : 'Sandbox / Test environment'}
                                                </p>
                                            </div>
                                        <div
                                            className={`${styles['admin-toggle']} ${styles['danger']} ${settings.live_mode ? styles['on'] : ''}`}
                                            onClick={() => setSettings(p => ({ ...p, live_mode: !p.live_mode }))}
                                        />
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '12px' }}>
                                    <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} disabled={saving} style={{ padding: '16px 36px', fontSize: '15px' }}>
                                        {saving ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="admin-spinner-small" style={{ borderTopColor: '#fff' }}></div>
                                                Processing...
                                            </div>
                                        ) : 'Update Configuration'}
                                    </button>
                                </div>
                            </form>

                            {/* Sidebar Info */}
                            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: currentProvider.color + '08', border: `1px solid ${currentProvider.color}15`, borderRadius: '20px', padding: '24px' }}>
                                    <div style={{ width: '40px', height: '40px', background: currentProvider.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                        {React.cloneElement(currentProvider.icon, { width: 22, height: 22 })}
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--admin-text-main)', marginBottom: '8px' }}>{currentProvider.name}</h3>
                                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--admin-text-secondary)', marginBottom: 0 }}>{currentProvider.desc}. Ensure you have SSL enabled on your server to process cards securely.</p>
                                </div>

                                {activeTab === 'stripe' && !settings.live_mode && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '20px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#1e40af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '16px' }}>🧪</span> Test Credentials
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#3b82f6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ background: '#ffffff80', padding: '8px', borderRadius: '8px', fontFamily: 'monospace' }}>
                                                <div style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 700 }}>CARD NUMBER</div>
                                                4242 4242 4242 4242
                                            </div>
                                            <p style={{ margin: 0, opacity: 0.8, fontSize: '11px' }}>Use any future expiry and any 3-digit CVV for testing.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPaymentSettings;
