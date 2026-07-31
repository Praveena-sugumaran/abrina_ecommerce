import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminEmailSettings.module.css';
import alStyles from './AdminLayout.module.css';
const AdminEmailSettings = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [settings, setSettings] = useState({
        MAIL_MAILER: '',
        MAIL_HOST: '',
        MAIL_PORT: '',
        MAIL_USERNAME: '',
        MAIL_PASSWORD: '',
        MAIL_ENCRYPTION: '',
        MAIL_FROM_ADDRESS: '',
        MAIL_FROM_NAME: ''
    });
    
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await api.get('/admin/email-settings');
                if (res.data) {
                    setSettings(res.data);
                }
            } catch (err) {
                console.error('Failed to load email settings:', err);
                setError('Failed to load settings. Please try again.');
            }
        };
        fetchInitialData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.put('/admin/email-settings', settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            showToast('Email settings updated successfully!', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to update email settings';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles['aes-container']}>
            <div className={styles['aes-header']}>
                <div className={styles['aes-title-box']}>
                    <h1>Email Configuration</h1>
                    <p>Manage SMTP, mail delivery, and authentication parameters globally.</p>
                </div>
            </div>

            {error && (
                <div className={`${alStyles['admin-alert']} ${alStyles['admin-alert-error']}`} style={{ marginBottom: '24px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                </div>
            )}
            
            {saved && (
                <div className={`${alStyles['admin-alert']} ${alStyles['admin-alert-success']}`} style={{ marginBottom: '24px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Email settings updated successfully and written to environment configuration.
                </div>
            )}

            <form onSubmit={handleSave} className={styles['aes-form']}>

                {/* Card 1: SMTP Settings */}
                <div className={styles['aes-card']}>
                    <div className={styles['aes-card-header']}>
                        <div className={styles['aes-card-icon']}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 20-7-4-3 5v-6l-3-2V2l200"/><path d="M21 2L10 13"/></svg>
                        </div>
                        <div className={styles['aes-card-title']}>
                            <h2>SMTP Server Settings</h2>
                            <p>Configure routing protocols and host endpoints.</p>
                        </div>
                    </div>
                    
                    <div className={styles['aes-card-body']}>
                        <div className={styles['aes-grid']}>
                            
                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Mail Mailer <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    </div>
                                    <input type="text" name="MAIL_MAILER" value={settings.MAIL_MAILER} onChange={handleInputChange} className={styles['aes-input']} placeholder="smtp" required />
                                </div>
                            </div>

                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Mail Host <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </div>
                                    <input type="text" name="MAIL_HOST" value={settings.MAIL_HOST} onChange={handleInputChange} className={styles['aes-input']} placeholder="smtp.gmail.com" required />
                                </div>
                            </div>

                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Mail Port <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="18" y2="8"/></svg>
                                    </div>
                                    <input type="number" name="MAIL_PORT" value={settings.MAIL_PORT} onChange={handleInputChange} className={styles['aes-input']} placeholder="587" required />
                                </div>
                            </div>

                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Encryption Protocol <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    </div>
                                    <input type="text" name="MAIL_ENCRYPTION" value={settings.MAIL_ENCRYPTION} onChange={handleInputChange} className={styles['aes-input']} placeholder="tls" />
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

                {/* Card 2: Auth and Sender */}
                <div className={styles['aes-card']}>
                    <div className={styles['aes-card-header']}>
                        <div className={styles['aes-card-icon']}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div className={styles['aes-card-title']}>
                            <h2>Authentication & Sender Identity</h2>
                            <p>Verify your credentials and set external mail appearances.</p>
                        </div>
                    </div>
                    
                    <div className={styles['aes-card-body']}>
                        <div className={styles['aes-grid']}>
                            
                            <div className={styles['aes-field'] + " " + styles['aes-full-width']}>
                                <label className={styles['aes-label']}>Mail Username (Email Address) <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    </div>
                                    <input type="email" name="MAIL_USERNAME" value={settings.MAIL_USERNAME} onChange={handleInputChange} className={styles['aes-input']} placeholder="example@gmail.com" required autoComplete="off" />
                                </div>
                            </div>

                            <div className={styles['aes-field'] + " " + styles['aes-full-width']}>
                                <label className={styles['aes-label']}>Mail Password (App Password) <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    </div>
                                    <input type="password" name="MAIL_PASSWORD" value={settings.MAIL_PASSWORD} onChange={handleInputChange} className={styles['aes-input']} placeholder="••••••••••••••••" required autoComplete="new-password" />
                                </div>
                                <div className={styles['aes-hint']}>For services like Gmail, generate a 16-character App Password. Your standard account password will not work.</div>
                            </div>

                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Sender Address (From) <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                    </div>
                                    <input type="email" name="MAIL_FROM_ADDRESS" value={settings.MAIL_FROM_ADDRESS} onChange={handleInputChange} className={styles['aes-input']} placeholder="no-reply@domain.com" required />
                                </div>
                            </div>

                            <div className={styles['aes-field']}>
                                <label className={styles['aes-label']}>Sender Name (From) <span>*</span></label>
                                <div className={styles['aes-input-wrapper']}>
                                    <div className={styles['aes-input-icon']}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </div>
                                    <input type="text" name="MAIL_FROM_NAME" value={settings.MAIL_FROM_NAME} onChange={handleInputChange} className={styles['aes-input']} placeholder="B2B Marketplace" required />
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

                <div className={alStyles['admin-card']} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '20px 24px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                        {saving ? 'Synchronizing with environment...' : 'Unsaved modifications detected'}
                    </span>
                    <button type="submit" disabled={saving} className={`${alStyles['admin-btn']} ${alStyles['admin-btn-primary']}`} style={{ padding: '10px 32px' }}>
                        {saving ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="admin-spinner-small" style={{ borderTopColor: '#fff', width: '16px', height: '16px' }}></div>
                                Saving...
                            </div>
                        ) : 'Apply Configuration'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default AdminEmailSettings;
