'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

const PRESET_COLORS = [
    { label: 'Ocean Blue', value: '#2563eb' },
    { label: 'Indigo', value: '#4f46e5' },
    { label: 'Violet', value: '#7c3aed' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Rose', value: '#e11d48' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Slate', value: '#475569' },
];

const DATE_FORMATS = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
    { value: 'D MMM YYYY', label: 'D MMM YYYY (31 Dec 2024)' },
];

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
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

const LogoUpload = ({ label, dark, preview, onFile, onClear, t }: { label: string; dark?: boolean; preview: string | null; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; t: any }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', border: '1px dashed var(--admin-border)', borderRadius: '10px', cursor: 'pointer', background: dark ? 'var(--admin-text-secondary)' : 'var(--admin-bg)', transition: 'border-color 0.15s' }}>
            {!preview ? (
                <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{t('click_to_upload') || 'Click to upload'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-color)' }}>{t('browse_files') || 'Browse files'}</span>
                </>
            ) : (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: dark ? 'transparent' : '#fff' }}>
                    <img src={getImgUrl(preview)} alt={label} style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} />
                    <span onClick={e => { e.preventDefault(); onClear(); }} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}>&#x2715;</span>
                </div>
            )}
            <input type="file" style={{ display: 'none' }} accept=".png,.svg,.jpg,.jpeg,.ico" onChange={onFile} />
        </label>
    </div>
);

const AdminSettings = () => {
    const router = useRouter();
    const { refreshSiteSettings, t, user } = useAuth();
    const tr = (key: string, fallback: string) => {
        const val = t(key);
        return (val && val !== key) ? val : fallback;
    };
    const { showToast, dismissToast } = useToast();

    const [showTestMailModal, setShowTestMailModal] = useState(false);
    const [testRecipientEmail, setTestRecipientEmail] = useState('');
    const [sendingTestMail, setSendingTestMail] = useState(false);
    const [testMailStatus, setTestMailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testRecipientEmail) {
            setTestMailStatus({ type: 'error', message: 'Please enter a recipient email address.' });
            return;
        }
        setSendingTestMail(true);
        setTestMailStatus(null);
        try {
            const res = await api.post('/admin/email-settings/test', { recipient_email: testRecipientEmail });
            if (res.data.success) {
                const msg = res.data.message || 'Test email sent successfully!';
                setTestMailStatus({ type: 'success', message: msg });
                showToast(msg, 'success');
            } else {
                const msg = res.data.message || 'Failed to send test email.';
                setTestMailStatus({ type: 'error', message: msg });
                showToast(msg, 'error');
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.message || 'Failed to send test email. Check your SMTP host, credentials, and port.';
            setTestMailStatus({ type: 'error', message: errMsg });
            showToast(errMsg, 'error');
        } finally {
            setSendingTestMail(false);
        }
    };

    const [settings, setSettings] = useState({
        site_name: '',
        seo_title: '',
        meta_description: '',
        keywords: '',
        primary_color: '#2563eb',
        secondary_color: '',
        pagination_limit: 10,
        maintenance_mode: false,
        enable_cron_reset: true,
        product_auto_approval: false,
        default_currency: '',
        default_language: '',
        date_format: 'DD/MM/YYYY',
        price_format: 'prefix',
        contact_email: '',
        contact_phone: '',
        address: '',
        ai_api_key: '',
        logo_dark: '',
        logo_light: '',
        favicon: '',
        footer_description: '',
        customer_login_banner: '',
        customer_login_text: 'Your data privacy is our priority',
        seller_login_banner: '',
        seller_login_text: 'A Trusted Platform\n\nA Professional Operations Team to Boost Your Sales Performance!',
        customer_register_banner: '',
        customer_register_text: 'Join millions of shoppers worldwide',
        seller_register_banner: '',
        seller_register_text: 'Start Selling Today\n\nReach millions of buyers and grow your business globally!',
        google_maps_enabled: false,
        google_maps_api_key: '',
        enable_recaptcha: false,
        recaptcha_site_key: '',
        recaptcha_secret_key: '',
        enable_mobile_verification: false,
        twilio_account_sid: '',
        twilio_auth_token: '',
        twilio_phone_number: '',
        chatbot_enabled: true,
        live_stream_enabled: true,
        rfq_enabled: false,
        agora_app_id: '',
        agora_app_certificate: '',
        aws_ivs_channel_type: 'STANDARD',
        aws_ivs_latency_mode: 'LOW',
        aws_ivs_access_key_id: '',
        aws_ivs_secret_access_key: '',
        aws_ivs_region: 'us-east-1',
        free_delivery_enabled: false,
        free_delivery_threshold: 0,
        first_time_platform_fee_free: false,
        first_time_booking_offer_enabled: false,
        first_time_booking_offer_price: 0,
        first_time_booking_offer_type: 'percentage',
        deals_timer_hours: 24,
        deals_timer_end_date: '',
    });

    const [languages, setLanguages] = useState<{ code: string; name: string; native_name: string }[]>([]);
    const [currencies, setCurrencies] = useState<{ code: string; name: string }[]>([]);
    const [darkLogoPreview, setDarkLogoPreview] = useState<string | null>(null);
    const [lightLogoPreview, setLightLogoPreview] = useState<string | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
    const [customerBannerPreview, setCustomerBannerPreview] = useState<string | null>(null);
    const [sellerBannerPreview, setSellerBannerPreview] = useState<string | null>(null);
    const [customerRegBannerPreview, setCustomerRegBannerPreview] = useState<string | null>(null);
    const [sellerRegBannerPreview, setSellerRegBannerPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [downloadingBackup, setDownloadingBackup] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [licenseDetails, setLicenseDetails] = useState({
        license_status: 'inactive',
        purchase_code: 'N/A',
        installation_id: 'N/A',
        last_verified_at: ''
    });
    const [licenseRequesting, setLicenseRequesting] = useState(false);

    const [emailSettings, setEmailSettings] = useState({
        MAIL_MAILER: 'smtp',
        MAIL_HOST: '',
        MAIL_PORT: '587',
        MAIL_USERNAME: '',
        MAIL_PASSWORD: '',
        MAIL_ENCRYPTION: 'tls',
        MAIL_FROM_ADDRESS: '',
        MAIL_FROM_NAME: ''
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [sRes, lRes, cRes, licRes, emailRes] = await Promise.all([
                    api.get('/admin/site-settings'),
                    api.get('/common/languages'),
                    api.get('/common/currencies'),
                    api.get('/admin/license/details'),
                    api.get('/admin/email-settings').catch(() => ({ data: null }))
                ]);
                setSettings(prev => ({ ...prev, ...sRes.data }));
                setLanguages(lRes.data || []);
                setCurrencies(cRes.data || []);
                setLicenseDetails(licRes.data);
                if (emailRes?.data) setEmailSettings(prev => ({ ...prev, ...emailRes.data }));
                if (sRes.data.logo_dark) setDarkLogoPreview(sRes.data.logo_dark);
                if (sRes.data.logo_light) setLightLogoPreview(sRes.data.logo_light);
                if (sRes.data.favicon) setFaviconPreview(sRes.data.favicon);
                if (sRes.data.customer_login_banner) setCustomerBannerPreview(sRes.data.customer_login_banner);
                if (sRes.data.seller_login_banner) setSellerBannerPreview(sRes.data.seller_login_banner);
                if (sRes.data.customer_register_banner) setCustomerRegBannerPreview(sRes.data.customer_register_banner);
                if (sRes.data.seller_register_banner) setSellerRegBannerPreview(sRes.data.seller_register_banner);
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };
        fetchInitialData();
    }, []);

    const handleRequestTransfer = async () => {
        if (!window.confirm("Are you sure you want to request a license transfer?\n\nThis will lock this administration console immediately and mark this code pending transfer on the license server.")) {
            return;
        }
        setLicenseRequesting(true);
        try {
            const res = await api.post('/admin/license/request-transfer');
            if (res.data.success) {
                showToast(res.data.message || 'Transfer request submitted.', 'success');
                window.location.reload();
            } else {
                showToast(res.data.message || 'Failed to submit transfer request.', 'error');
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Transfer request failed.', 'error');
        } finally {
            setLicenseRequesting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'dark' | 'light' | 'favicon' | 'customer_banner' | 'seller_banner' | 'customer_reg_banner' | 'seller_reg_banner') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const result = ev.target?.result as string;
            if (type === 'dark') { setDarkLogoPreview(result); setSettings(p => ({ ...p, logo_dark: result })); }
            else if (type === 'light') { setLightLogoPreview(result); setSettings(p => ({ ...p, logo_light: result })); }
            else if (type === 'favicon') { setFaviconPreview(result); setSettings(p => ({ ...p, favicon: result })); }
            else if (type === 'customer_banner') { setCustomerBannerPreview(result); setSettings(p => ({ ...p, customer_login_banner: result })); }
            else if (type === 'seller_banner') { setSellerBannerPreview(result); setSettings(p => ({ ...p, seller_login_banner: result })); }
            else if (type === 'customer_reg_banner') { setCustomerRegBannerPreview(result); setSettings(p => ({ ...p, customer_register_banner: result })); }
            else { setSellerRegBannerPreview(result); setSettings(p => ({ ...p, seller_register_banner: result })); }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await Promise.all([
                api.put('/admin/site-settings', settings),
                api.put('/admin/email-settings', emailSettings)
            ]);
            localStorage.setItem('primary_color', settings.primary_color);
            document.documentElement.style.setProperty('--primary-color', settings.primary_color);
            document.documentElement.style.setProperty('--primary', settings.primary_color);
            document.documentElement.style.setProperty('--sp-primary', settings.primary_color);
            document.documentElement.style.setProperty('--clr-primary', settings.primary_color);

            const secColor = settings.secondary_color || '';
            localStorage.setItem('secondary_color', secColor);
            document.documentElement.style.setProperty('--secondary-color', secColor);
            
            const btnGradient = secColor 
                ? `linear-gradient(135deg, ${settings.primary_color}, ${secColor})`
                : settings.primary_color;
            document.documentElement.style.setProperty('--button-gradient', btnGradient);

            refreshSiteSettings();
            showToast(t('settings_saved_success') || 'Settings saved successfully', 'success');
        } catch (err: any) {
            const errMsg = err.response?.data?.message || t('failed_save_settings') || 'Failed to save settings';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleBackupDownload = async () => {
        setDownloadingBackup(true);
        setError('');
        try {
            const response = await api.get('/admin/database-backup', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'] || '';
            const match = cd.match(/filename="(.+)"/);
            link.setAttribute('download', match ? match[1] : 'database-backup.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError(t('failed_backup_download') || 'Failed to download database backup.');
        } finally {
            setDownloadingBackup(false);
        }
    };

    const handleDirectImport = async () => {
        if (!window.confirm("Are you absolutely sure you want to trigger a full dummy data restoration?\n\nThis action will delete all current custom products, orders, chat history, reviews, and user accounts, and replace them with standard verified B2B buyer and supplier mock portfolios.")) {
            return;
        }

        setImporting(true);
        try {
            const { data } = await api.post('/admin/dummy-data/import');
            if (data.success) {
                showToast(data.message || 'Demo B2B datasets successfully populated and synchronized.', 'success');
            } else {
                showToast(data.message || 'Failed to import dummy B2B dataset.', 'error');
            }
        } catch (err: any) {
            console.error('Import failed:', err);
            showToast(err.response?.data?.message || 'Import failed due to database connection exception.', 'error');
        } finally {
            setImporting(false);
        }
    };



    const SETTINGS_TABS = [
        { id: 'site_seo', label: 'Site & SEO', description: 'Site identity, search engine metadata and footer branding' },
        { id: 'branding', label: 'Branding & Theme', description: 'Primary color palette, button gradients, logos and favicon' },
        { id: 'auth_banners', label: 'Authentication Banners', description: 'Manage login and registration hero banners and captions' },
        { id: 'behavior', label: 'Platform Behavior', description: 'Maintenance mode, auto-approval, shipping & deals timer' },
        { id: 'integrations', label: 'Integrations & APIs', description: 'WhatsApp Business, carriers, media storage, Google Maps & AI' },
        { id: 'localization', label: 'Localization & Formats', description: 'Default currency, language, date formats and pagination' },
        { id: 'contact', label: 'Contact & Support', description: 'Contact email, support hotline, and office physical address' },
        { id: 'security_backup', label: 'Security & Backup', description: 'reCAPTCHA bot protection, SMS OTP verification & data backups' },
        { id: 'licensing', label: 'System Licensing', description: 'Platform purchase code activation and installation details' },
        { id: 'email_settings', label: 'Email Settings', description: 'Configure SMTP server host, port, encryption and sender identity' }
    ];

    const [activeTab, setActiveTab] = useState('site_seo');

    const handleResetAll = async () => {
        if (!window.confirm("Are you sure you want to reset all settings to the last saved configuration?")) return;
        try {
            const sRes = await api.get('/admin/site-settings');
            setSettings(prev => ({ ...prev, ...sRes.data }));
            showToast('All settings reset to saved values', 'info');
        } catch (err) {
            showToast('Failed to reset settings', 'error');
        }
    };

    const handleResetSection = async (tabId: string) => {
        try {
            const sRes = await api.get('/admin/site-settings');
            setSettings(prev => ({ ...prev, ...sRes.data }));
            showToast('Section settings reset to saved values', 'info');
        } catch (err) {
            showToast('Failed to reset section', 'error');
        }
    };

    const currentTabObj = SETTINGS_TABS.find(t => t.id === activeTab) || SETTINGS_TABS[0];

    return (
        <div className={styles['admin-page']}>

            {error && (
                <div className={`${styles['admin-alert']} ${styles['admin-alert-error']}`} style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSave}>
                <div 
                    className={styles['admin-card']} 
                    style={{ 
                        overflow: 'hidden', 
                        padding: 0, 
                        border: '1px solid var(--admin-border, #e2e8f0)', 
                        borderRadius: '16px', 
                        background: '#ffffff', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)' 
                    }}
                >
                    {/* ── Top Header ── */}
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--admin-border, #f1f5f9)', background: '#ffffff' }}>
                        <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--admin-text-main, #0f172a)', margin: 0, letterSpacing: '-0.02em' }}>
                            Global Settings
                        </h2>
                    </div>

                    {/* ── Main Two-Column Split Layout ── */}
                    <div style={{ display: 'flex', minHeight: '680px', flexWrap: 'wrap' }}>
                        
                        {/* ── Left Vertical Navigation Tabs ── */}
                        <div 
                            style={{ 
                                width: '250px', 
                                background: '#f8fafc', 
                                borderRight: '1px solid #f1f5f9', 
                                padding: '16px 12px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '4px', 
                                flexShrink: 0 
                            }}
                        >
                            {SETTINGS_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '11px 16px',
                                        fontSize: '13px',
                                        fontWeight: activeTab === tab.id ? 700 : 500,
                                        color: activeTab === tab.id ? '#0f172a' : '#64748b',
                                        background: activeTab === tab.id ? '#ffffff' : 'transparent',
                                        border: activeTab === tab.id ? '1px solid #e2e8f0' : '1px solid transparent',
                                        borderRadius: '10px',
                                        boxShadow: activeTab === tab.id ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Right Content Area ── */}
                        <div style={{ flex: 1, padding: '28px 36px', background: '#ffffff', minWidth: '320px' }}>
                            
                            {/* Action Bar Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {currentTabObj.label}
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                                        {currentTabObj.description}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button 
                                        type="submit" 
                                        disabled={saving} 
                                        style={{ background: 'var(--primary-color, #0f172a)', border: 'none', color: '#ffffff', padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                    >
                                        {saving ? (tr('saving', 'Saving...')) : 'Save changes'}
                                    </button>
                                </div>
                            </div>

                            {/* ── TAB 1: Site & SEO ── */}
                            {activeTab === 'site_seo' && (
                                <div>
                                    <FieldRow label={tr('site_name', "Site Name")} hint={tr('site_name_hint', "Displayed in browser tabs and emails")}>
                                        <input name="site_name" value={settings.site_name} onChange={handleChange} className={styles['admin-form-input']} placeholder="My Platform" />
                                    </FieldRow>
                                    <FieldRow label={tr('seo_title', "SEO Title")} hint={tr('seo_title_hint', "Default meta title for all pages")}>
                                        <input name="seo_title" value={settings.seo_title} onChange={handleChange} className={styles['admin-form-input']} placeholder="Best B2B Marketplace" />
                                    </FieldRow>
                                    <FieldRow label={tr('meta_description', "Meta Description")} hint={tr('meta_description_hint', "~160 chars shown in search results")}>
                                        <textarea name="meta_description" value={settings.meta_description} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('describe_platform_placeholder', "Describe your platform...")} style={{ minHeight: '80px', resize: 'vertical' }} />
                                    </FieldRow>
                                    <FieldRow label={tr('seo_keywords', "SEO Keywords")} hint={tr('seo_keywords_hint', "Comma-separated keywords")}>
                                        <textarea name="keywords" value={settings.keywords} onChange={handleChange} className={styles['admin-form-input']} placeholder="ecommerce, wholesale, b2b" style={{ minHeight: '60px', resize: 'vertical' }} />
                                    </FieldRow>
                                    <FieldRow label={tr('footer_description', "Footer Description")} hint={tr('footer_description_hint', "Shown in site footer brand block")}>
                                        <textarea name="footer_description" value={settings.footer_description} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('about_brand_placeholder', "About your brand...")} style={{ minHeight: '60px', resize: 'vertical' }} />
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 2: Branding & Theme ── */}
                            {activeTab === 'branding' && (
                                <div>
                                    <FieldRow label={t('primary_color') || "Primary Color"} hint={t('primary_color_hint') || "Used for buttons, links, and accents"}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <input type="color" name="primary_color" value={settings.primary_color.startsWith('#') ? settings.primary_color : '#2563eb'} onChange={handleChange} style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--admin-border)', cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                                            <input type="text" name="primary_color" value={settings.primary_color} onChange={handleChange} className={styles['admin-form-input']} placeholder="#2563eb" style={{ fontFamily: 'monospace', maxWidth: '140px' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {PRESET_COLORS.map(opt => (
                                                <button key={opt.value} type="button" title={opt.label}
                                                    onClick={() => setSettings(prev => ({ ...prev, primary_color: opt.value }))}
                                                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: opt.value, border: settings.primary_color === opt.value ? '3px solid var(--admin-text-secondary)' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: settings.primary_color === opt.value ? 'scale(1.15)' : 'scale(1)' }}
                                                />
                                            ))}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={t('secondary_color') || "Secondary Color (Optional)"} hint={t('secondary_color_hint') || "Combined with primary color to create gradients for CTA buttons"}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <input type="color" name="secondary_color" value={settings.secondary_color?.startsWith('#') ? settings.secondary_color : '#ffffff'} onChange={handleChange} style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--admin-border)', cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                                            <input type="text" name="secondary_color" value={settings.secondary_color || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="#cbd5e1" style={{ fontFamily: 'monospace', maxWidth: '140px' }} />
                                        </div>

                                        <div style={{ marginTop: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>Button Gradient Preview:</span>
                                            <button 
                                                type="button" 
                                                style={{
                                                    padding: '10px 24px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    color: '#ffffff',
                                                    background: settings.secondary_color 
                                                        ? `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})`
                                                        : settings.primary_color,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                                    cursor: 'default'
                                                }}
                                            >
                                                Dynamic CTA Button
                                            </button>
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={t('logos') || "Logos"} hint={t('logos_hint') || "SVG or PNG recommended"}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                                            <LogoUpload label={t('dark_logo_label') || "Dark Logo (on light bg)"} preview={darkLogoPreview} onFile={e => handleLogoChange(e, 'dark')} onClear={() => { setDarkLogoPreview(null); setSettings(p => ({ ...p, logo_dark: '' })); }} t={t} />
                                            <LogoUpload label={t('light_logo_label') || "Light Logo (on dark bg)"} dark preview={lightLogoPreview} onFile={e => handleLogoChange(e, 'light')} onClear={() => { setLightLogoPreview(null); setSettings(p => ({ ...p, logo_light: '' })); }} t={t} />
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={t('favicon') || "Favicon"} hint={t('favicon_hint') || "ICO, PNG or SVG, 32x32px"}>
                                        <div style={{ maxWidth: '180px' }}>
                                            <LogoUpload label="" preview={faviconPreview} onFile={e => handleLogoChange(e, 'favicon')} onClear={() => { setFaviconPreview(null); setSettings(p => ({ ...p, favicon: '' })); }} t={t} />
                                        </div>
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 3: Authentication Banners ── */}
                            {activeTab === 'auth_banners' && (
                                <div>
                                    <FieldRow label="Customer Login Banner" hint="Wide split banner displayed on customer login/register page">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                            <LogoUpload label="Customer Banner" preview={customerBannerPreview} onFile={e => handleLogoChange(e, 'customer_banner')} onClear={() => { setCustomerBannerPreview(null); setSettings(p => ({ ...p, customer_login_banner: '' })); }} t={t} />
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginTop: '10px' }}>Customer Banner Text</div>
                                            <textarea name="customer_login_text" value={settings.customer_login_text} onChange={handleChange} className={styles['admin-form-input']} placeholder="Your data privacy is our priority" style={{ minHeight: '60px', resize: 'vertical' }} />
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Seller Login Banner" hint="Split banner displayed on the seller login page">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                            <LogoUpload label="Seller Banner" preview={sellerBannerPreview} onFile={e => handleLogoChange(e, 'seller_banner')} onClear={() => { setSellerBannerPreview(null); setSettings(p => ({ ...p, seller_login_banner: '' })); }} t={t} />
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginTop: '10px' }}>Seller Banner Text</div>
                                            <textarea name="seller_login_text" value={settings.seller_login_text} onChange={handleChange} className={styles['admin-form-input']} placeholder="A Trusted Platform..." style={{ minHeight: '80px', resize: 'vertical' }} />
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Customer Register Banner" hint="Banner image shown on the customer registration page">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                            <LogoUpload label="Customer Register Banner" preview={customerRegBannerPreview} onFile={e => handleLogoChange(e, 'customer_reg_banner')} onClear={() => { setCustomerRegBannerPreview(null); setSettings(p => ({ ...p, customer_register_banner: '' })); }} t={t} />
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginTop: '10px' }}>Customer Register Caption</div>
                                            <textarea name="customer_register_text" value={(settings as any).customer_register_text} onChange={handleChange} className={styles['admin-form-input']} placeholder="Join millions of shoppers worldwide" style={{ minHeight: '60px', resize: 'vertical' }} />
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Seller Register Banner" hint="Banner image shown on the seller registration page">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                            <LogoUpload label="Seller Register Banner" preview={sellerRegBannerPreview} onFile={e => handleLogoChange(e, 'seller_reg_banner')} onClear={() => { setSellerRegBannerPreview(null); setSettings(p => ({ ...p, seller_register_banner: '' })); }} t={t} />
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginTop: '10px' }}>Seller Register Caption</div>
                                            <textarea name="seller_register_text" value={(settings as any).seller_register_text} onChange={handleChange} className={styles['admin-form-input']} placeholder="Start Selling Today..." style={{ minHeight: '80px', resize: 'vertical' }} />
                                        </div>
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 4: Platform Behavior ── */}
                            {activeTab === 'behavior' && (
                                <div>
                                    <FieldRow label={t('maintenance_mode') || "Maintenance Mode"} hint={t('maintenance_mode_hint') || "Blocks public access while you update"}>
                                        <Toggle
                                            on={settings.maintenance_mode}
                                            onToggle={() => setSettings(prev => ({ ...prev, maintenance_mode: !prev.maintenance_mode }))}
                                            labelOn={t('maintenance_active') || "Maintenance Active — public visitors see maintenance page"}
                                            labelOff={t('site_live') || "Site is Live — all visitors can access the platform"}
                                            danger
                                        />
                                    </FieldRow>

                                    <FieldRow label="Product Auto-Approval" hint="When enabled, seller products are automatically published without admin review.">
                                        <Toggle
                                            on={(settings as any).product_auto_approval === true}
                                            onToggle={() => setSettings(prev => ({ ...prev, product_auto_approval: !(prev as any).product_auto_approval } as any))}
                                            labelOn="Auto-Approve ON — Products go live immediately after seller submission"
                                            labelOff="Manual Review — Admin must approve each product before it goes live"
                                        />
                                    </FieldRow>

                                    <FieldRow label="Free Delivery" hint="Enable a free shipping threshold for orders.">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <Toggle
                                                on={(settings as any).free_delivery_enabled === true}
                                                onToggle={() => setSettings(prev => ({ ...prev, free_delivery_enabled: !(prev as any).free_delivery_enabled } as any))}
                                                labelOn="Free Delivery ON — Orders meeting threshold ship for free"
                                                labelOff="Free Delivery OFF — Shipping fees apply normally"
                                            />
                                            {(settings as any).free_delivery_enabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Minimum Order Amount (USD)</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Set to 0 to offer free shipping on ALL orders.</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '16px' }}>$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={(settings as any).free_delivery_threshold || 0}
                                                            onChange={e => setSettings(prev => ({ ...prev, free_delivery_threshold: parseFloat(e.target.value) || 0 } as any))}
                                                            className={styles['admin-form-input']}
                                                            style={{ width: '120px', textAlign: 'right' }}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="First-Order Fee Waiver" hint="Waive service/commission fee on a buyer's first order.">
                                        <Toggle
                                            on={(settings as any).first_time_platform_fee_free === true}
                                            onToggle={() => setSettings(prev => ({ ...prev, first_time_platform_fee_free: !(prev as any).first_time_platform_fee_free } as any))}
                                            labelOn="Fee Waiver ON — First-time buyers pay no platform service fee 🎉"
                                            labelOff="Fee Waiver OFF — Service fee applies to all orders"
                                        />
                                    </FieldRow>

                                    <FieldRow label="First-Time Booking Offer" hint="Discount price or percentage offered to first-time buyers.">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <Toggle
                                                on={(settings as any).first_time_booking_offer_enabled === true}
                                                onToggle={() => setSettings(prev => ({ ...prev, first_time_booking_offer_enabled: !(prev as any).first_time_booking_offer_enabled } as any))}
                                                labelOn="First-Time Booking Offer ON — New buyers get welcome discount"
                                                labelOff="First-Time Booking Offer OFF"
                                            />
                                            {(settings as any).first_time_booking_offer_enabled && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Discount Type</div>
                                                        <select
                                                            name="first_time_booking_offer_type"
                                                            value={(settings as any).first_time_booking_offer_type || 'percentage'}
                                                            onChange={handleChange}
                                                            className={styles['admin-form-input']}
                                                        >
                                                            <option value="percentage">Percentage (%)</option>
                                                            <option value="fixed">Fixed Price ($)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Offer Value (Price / %)</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '16px' }}>
                                                                {(settings as any).first_time_booking_offer_type === 'fixed' ? '$' : '%'}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="first_time_booking_offer_price"
                                                                min="0"
                                                                step="0.01"
                                                                value={(settings as any).first_time_booking_offer_price || 0}
                                                                onChange={handleChange}
                                                                className={styles['admin-form-input']}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Deals of the Day Countdown" hint="Configure the homepage Deals of the Day campaign timer duration or target date.">
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Timer Cycle (Hours)</div>
                                                <input 
                                                    type="number" 
                                                    name="deals_timer_hours" 
                                                    min="1" 
                                                    max="168" 
                                                    value={(settings as any).deals_timer_hours || 24} 
                                                    onChange={handleChange} 
                                                    className={styles['admin-form-input']} 
                                                    placeholder="24" 
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Target End Date & Time (Optional)</div>
                                                <input 
                                                    type="datetime-local" 
                                                    name="deals_timer_end_date" 
                                                    value={(settings as any).deals_timer_end_date || ''} 
                                                    onChange={handleChange} 
                                                    className={styles['admin-form-input']} 
                                                />
                                            </div>
                                        </div>
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 5: Integrations & APIs ── */}
                            {activeTab === 'integrations' && (
                                <div>
                                    <FieldRow label="WhatsApp Business Gateway" hint="Configure Twilio WhatsApp Business API for order dispatch and customer alerts.">
                                        <div style={{ marginBottom: '12px' }}>
                                            <Toggle
                                                on={(settings as any).whatsapp_enabled === true}
                                                onToggle={() => setSettings(prev => ({ ...prev, whatsapp_enabled: !(prev as any).whatsapp_enabled } as any))}
                                                labelOn="WhatsApp Business Gateway Enabled 📲"
                                                labelOff="WhatsApp Gateway Disabled"
                                            />
                                        </div>
                                        {(settings as any).whatsapp_enabled && (
                                            <div style={{ marginTop: '10px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>WhatsApp Business Number (e.g. whatsapp:+14155238886)</div>
                                                <input 
                                                    type="text" 
                                                    name="whatsapp_phone_number" 
                                                    value={(settings as any).whatsapp_phone_number || ''} 
                                                    onChange={handleChange} 
                                                    className={styles['admin-form-input']} 
                                                    placeholder="whatsapp:+14155238886" 
                                                />
                                            </div>
                                        )}
                                    </FieldRow>

                                    <FieldRow label="Live Carrier Shipping APIs" hint="Enable automated live shipping rate calculation and label generation for international logistics carriers.">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                                <Toggle
                                                    on={(settings as any).carrier_fedex_enabled === true}
                                                    onToggle={() => setSettings(prev => ({ ...prev, carrier_fedex_enabled: !(prev as any).carrier_fedex_enabled } as any))}
                                                    labelOn="FedEx Priority API ON"
                                                    labelOff="FedEx OFF"
                                                />
                                                <Toggle
                                                    on={(settings as any).carrier_dhl_enabled === true}
                                                    onToggle={() => setSettings(prev => ({ ...prev, carrier_dhl_enabled: !(prev as any).carrier_dhl_enabled } as any))}
                                                    labelOn="DHL Express API ON"
                                                    labelOff="DHL OFF"
                                                />
                                                <Toggle
                                                    on={(settings as any).carrier_ups_enabled === true}
                                                    onToggle={() => setSettings(prev => ({ ...prev, carrier_ups_enabled: !(prev as any).carrier_ups_enabled } as any))}
                                                    labelOn="UPS Ground API ON"
                                                    labelOff="UPS OFF"
                                                />
                                            </div>

                                            {(settings as any).carrier_fedex_enabled && (
                                                <div style={{ padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>FedEx Web Services Credentials</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                                        <input type="text" name="fedex_api_key" value={(settings as any).fedex_api_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="FedEx API Key" />
                                                        <input type="password" name="fedex_secret_key" value={(settings as any).fedex_secret_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="FedEx Secret Key" />
                                                        <input type="text" name="fedex_account_number" value={(settings as any).fedex_account_number || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="FedEx Account Number" />
                                                    </div>
                                                </div>
                                            )}

                                            {(settings as any).carrier_dhl_enabled && (
                                                <div style={{ padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>DHL Express API Credentials</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                                        <input type="text" name="dhl_site_id" value={(settings as any).dhl_site_id || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="DHL Site ID / Client ID" />
                                                        <input type="password" name="dhl_api_key" value={(settings as any).dhl_api_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="DHL API Key / Secret" />
                                                    </div>
                                                </div>
                                            )}

                                            {(settings as any).carrier_ups_enabled && (
                                                <div style={{ padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>UPS Developer API Credentials</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                                        <input type="text" name="ups_access_key" value={(settings as any).ups_access_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="UPS Access Key" />
                                                        <input type="text" name="ups_account_number" value={(settings as any).ups_account_number || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="UPS Account Number" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Media Storage Driver" hint="Select storage destination for product images and media.">
                                        <div style={{ marginBottom: '12px' }}>
                                            <select 
                                                name="media_storage_driver" 
                                                value={(settings as any).media_storage_driver || 'local'} 
                                                onChange={handleChange} 
                                                className={styles['admin-form-input']}
                                            >
                                                <option value="local">Local Storage (/uploads)</option>
                                                <option value="cloudinary">Cloudinary CDN</option>
                                                <option value="s3">Amazon AWS S3 Bucket</option>
                                            </select>
                                        </div>
                                        {(settings as any).media_storage_driver === 'cloudinary' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                                <input type="text" name="cloudinary_cloud_name" value={(settings as any).cloudinary_cloud_name || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="Cloud Name" />
                                                <input type="text" name="cloudinary_api_key" value={(settings as any).cloudinary_api_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="API Key" />
                                                <input type="password" name="cloudinary_api_secret" value={(settings as any).cloudinary_api_secret || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="API Secret" />
                                            </div>
                                        )}
                                        {(settings as any).media_storage_driver === 's3' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                                <input type="text" name="s3_bucket_name" value={(settings as any).s3_bucket_name || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="Bucket Name" />
                                                <input type="text" name="s3_region" value={(settings as any).s3_region || 'us-east-1'} onChange={handleChange} className={styles['admin-form-input']} placeholder="Region (us-east-1)" />
                                                <input type="text" name="s3_access_key" value={(settings as any).s3_access_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="Access Key ID" />
                                                <input type="password" name="s3_secret_key" value={(settings as any).s3_secret_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="Secret Access Key" />
                                            </div>
                                        )}
                                    </FieldRow>

                                    <FieldRow label="Redis High-Speed Cache Engine" hint="Accelerate catalog queries and product searches.">
                                        <Toggle
                                            on={(settings as any).redis_cache_enabled !== false}
                                            onToggle={() => setSettings(prev => ({ ...prev, redis_cache_enabled: !(prev as any).redis_cache_enabled } as any))}
                                            labelOn="Redis Engine Active ⚡"
                                            labelOff="Redis Engine Disabled"
                                        />
                                    </FieldRow>

                                    <FieldRow label={t('google_maps') || "Google Maps"} hint={t('google_maps_hint') || "Address autocomplete and distance-based fees"}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <Toggle
                                                on={settings.google_maps_enabled}
                                                onToggle={() => setSettings(prev => ({ ...prev, google_maps_enabled: !prev.google_maps_enabled }))}
                                                labelOn={t('maps_enabled_label') || "Maps Enabled — requires Maps JS, Places and Geocoding APIs"}
                                                labelOff={t('maps_disabled') || "Maps Disabled"}
                                            />
                                            {settings.google_maps_enabled && (
                                                <input name="google_maps_api_key" type="password" value={settings.google_maps_api_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="AIza... (Google Maps API Key)" />
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={t('openai_api_key') || "OpenAI API Key"} hint={t('openai_hint') || "Powers AI-driven features across the platform"}>
                                        <input name="ai_api_key" type="password" value={settings.ai_api_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder="sk-..." />
                                    </FieldRow>

                                    <FieldRow label="Enable AI Chatbot" hint="Show or hide the AI Sourcing Assistant chatbot globally">
                                        <Toggle
                                            on={settings.chatbot_enabled}
                                            onToggle={() => setSettings(prev => ({ ...prev, chatbot_enabled: !prev.chatbot_enabled }))}
                                            labelOn="Active — AI Chatbot widget is visible to visitors"
                                            labelOff="Inactive — AI Chatbot widget is hidden"
                                        />
                                    </FieldRow>

                                    <FieldRow label="Enable RFQ (B2B Feature)" hint="Toggle Request for Quote (RFQ) capabilities on the platform.">
                                        <Toggle
                                            on={settings.rfq_enabled}
                                            onToggle={() => setSettings(prev => ({ ...prev, rfq_enabled: !prev.rfq_enabled }))}
                                            labelOn="Active — RFQ forms and B2B quote management are enabled"
                                            labelOff="Inactive — RFQ system is disabled"
                                        />
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 6: Localization & Formats ── */}
                            {activeTab === 'localization' && (
                                <div>
                                    <FieldRow label={tr('localization_settings', "Localization")} hint={tr('localization_hint', "Default currency and interface language")}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{tr('currency', 'Currency')}</div>
                                                <select name="default_currency" value={settings.default_currency} onChange={handleChange} className={styles['admin-form-input']}>
                                                    <option value="">{tr('select_currency_placeholder', 'Select currency...')}</option>
                                                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{tr('language', 'Language')}</div>
                                                <select name="default_language" value={settings.default_language} onChange={handleChange} className={styles['admin-form-input']}>
                                                    <option value="">{tr('select_language_placeholder', 'Select language...')}</option>
                                                    {languages.map(l => <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={tr('display_formats', "Display Formats")} hint={tr('display_formats_hint', "Date and price formatting")}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{tr('date_format', 'Date Format')}</div>
                                                <select name="date_format" value={settings.date_format} onChange={handleChange} className={styles['admin-form-input']}>
                                                    {DATE_FORMATS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{tr('price_format', 'Price Format')}</div>
                                                <select name="price_format" value={settings.price_format} onChange={handleChange} className={styles['admin-form-input']}>
                                                    <option value="prefix">{tr('prefix', 'Prefix')} — $500</option>
                                                    <option value="suffix">{tr('suffix', 'Suffix')} — 500$</option>
                                                </select>
                                            </div>
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={tr('items_per_page', "Items Per Page")} hint={tr('items_per_page_hint', "Default pagination limit")}>
                                        <input name="pagination_limit" type="number" min="5" max="100" value={settings.pagination_limit} onChange={handleChange} className={styles['admin-form-input']} style={{ maxWidth: '120px' }} />
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 7: Contact & Support ── */}
                            {activeTab === 'contact' && (
                                <div>
                                    <FieldRow label={tr('contact_details', "Contact Details")} hint={tr('contact_details_hint', "Used in emails and site footer")}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '8px' }}>
                                            <input name="contact_email" type="email" value={settings.contact_email} onChange={handleChange} className={styles['admin-form-input']} placeholder="info@aascendora.com" />
                                            <input name="contact_phone" type="text" value={settings.contact_phone} onChange={handleChange} className={styles['admin-form-input']} placeholder="+1 234 567 890" />
                                        </div>
                                        <input name="address" type="text" value={settings.address} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('address_placeholder', "123 Business St, City, Country")} />
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 8: Security & Backup ── */}
                            {activeTab === 'security_backup' && (
                                <div>
                                    <FieldRow label={tr('recaptcha_v2', "Google reCAPTCHA v2")} hint={tr('recaptcha_hint', 'Protects login and signup forms with "I\'m not a robot" checkbox challenge')}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <Toggle
                                                on={settings.enable_recaptcha}
                                                onToggle={() => setSettings(prev => ({ ...prev, enable_recaptcha: !prev.enable_recaptcha }))}
                                                labelOn={tr('recaptcha_active', "reCAPTCHA Active — bot protection is enabled")}
                                                labelOff={tr('recaptcha_disabled', "reCAPTCHA Disabled")}
                                            />
                                            {settings.enable_recaptcha && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <input name="recaptcha_site_key" type="text" value={settings.recaptcha_site_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('site_key_placeholder', "Site Key (6Lc...)")} />
                                                    <input name="recaptcha_secret_key" type="password" value={settings.recaptcha_secret_key || ''} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('secret_key_placeholder', "Secret Key (6Lc...)")} />
                                                </div>
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={tr('mobile_verification', "Mobile Number Verification")} hint={tr('mobile_verification_hint', "Require mobile OTP during registration")}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <Toggle
                                                on={settings.enable_mobile_verification}
                                                onToggle={() => setSettings(prev => ({ ...prev, enable_mobile_verification: !prev.enable_mobile_verification }))}
                                                labelOn={tr('mobile_verification_active', "Mobile Verification Enabled")}
                                                labelOff={tr('mobile_verification_disabled', "Mobile Verification Disabled")}
                                            />
                                            {settings.enable_mobile_verification && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px', display: 'block' }}>Twilio Account SID</label>
                                                        <input
                                                            name="twilio_account_sid"
                                                            type="text"
                                                            value={(settings as any).twilio_account_sid || ''}
                                                            onChange={handleChange}
                                                            className={styles['admin-form-input']}
                                                            placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px', display: 'block' }}>Twilio Auth Token</label>
                                                        <input
                                                            name="twilio_auth_token"
                                                            type="password"
                                                            value={(settings as any).twilio_auth_token || ''}
                                                            onChange={handleChange}
                                                            className={styles['admin-form-input']}
                                                            placeholder="Enter Twilio Auth Token"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px', display: 'block' }}>Twilio Phone Number</label>
                                                        <input
                                                            name="twilio_phone_number"
                                                            type="text"
                                                            value={(settings as any).twilio_phone_number || ''}
                                                            onChange={handleChange}
                                                            className={styles['admin-form-input']}
                                                            placeholder="+1234567890"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={tr('database_backup', "Database Backup")} hint={tr('database_backup_hint', "Download a full JSON snapshot of all platform data")}>
                                        <div className={styles['admin-section-box']} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>{tr('export_all_data', 'Export All Data')}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '14px', lineHeight: '1.5' }}>
                                                    {tr('export_data_desc', 'Download a complete JSON snapshot including users, products, orders, and settings.')}
                                                </div>
                                                <button type="button" onClick={handleBackupDownload} disabled={downloadingBackup}
                                                    className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                                                    {downloadingBackup ? (tr('preparing_backup', 'Preparing backup...')) : (tr('download_backup', 'Download Backup'))}
                                                </button>
                                            </div>
                                        </div>
                                    </FieldRow>

                                    <FieldRow label={tr('dummy_data_management', "Demo Data & Import")} hint={tr('dummy_data_management_hint', "Clean dynamic datasets and restore default demo catalog")}>
                                        <div className={styles['admin-section-box']} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <button type="button" onClick={() => router.push('/admin/dummy-data')}
                                                className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                {tr('detailed_management', 'Detailed History & Cleanup')}
                                            </button>
                                        </div>
                                    </FieldRow>
                                </div>
                            )}

                            {/* ── TAB 9: System Licensing ── */}
                            {activeTab === 'licensing' && (
                                <div>
                                    <FieldRow label="Installation Status" hint="Current active licensing mode of this platform instance">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                display: 'inline-flex', padding: '6px 14px', borderRadius: '20px',
                                                fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
                                                background: licenseDetails.license_status === 'active' ? 'rgba(16,185,129,0.15)' : licenseDetails.license_status === 'development' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: licenseDetails.license_status === 'active' ? '#10b981' : licenseDetails.license_status === 'development' ? '#3b82f6' : '#ef4444'
                                            }}>
                                                {licenseDetails.license_status === 'active' ? 'Activated (Production)' : licenseDetails.license_status === 'development' ? 'Development Mode' : 'Inactive'}
                                            </span>
                                        </div>
                                    </FieldRow>

                                    <FieldRow label="Purchase Code" hint="Masked license key currently bound to this server installation">
                                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px' }}>{licenseDetails.purchase_code}</span>
                                    </FieldRow>

                                    <FieldRow label="Installation ID" hint="Unique UUID generated for this environment setup">
                                        <span style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{licenseDetails.installation_id}</span>
                                    </FieldRow>

                                    {licenseDetails.license_status === 'active' && (
                                        <FieldRow label="License Migration / Transfer" hint="Request release of this purchase code to deploy on another server domain">
                                            <button type="button" onClick={handleRequestTransfer} disabled={licenseRequesting}
                                                className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                                style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                                            >
                                                {licenseRequesting ? 'Submitting request...' : 'Request License Transfer'}
                                            </button>
                                        </FieldRow>
                                    )}
                                </div>
                            )}

                            {/* ── TAB 10: Email Settings ── */}
                            {activeTab === 'email_settings' && (
                                <div>
                                    <FieldRow label="Mail Mailer Protocol" hint="Routing protocol for outgoing server emails (default: smtp)">
                                        <input 
                                            name="MAIL_MAILER" 
                                            value={emailSettings.MAIL_MAILER} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_MAILER: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="smtp" 
                                        />
                                    </FieldRow>

                                    <FieldRow label="SMTP Mail Host" hint="Address of your outgoing SMTP mail server (e.g. smtp.gmail.com)">
                                        <input 
                                            name="MAIL_HOST" 
                                            value={emailSettings.MAIL_HOST} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_HOST: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="smtp.gmail.com" 
                                        />
                                    </FieldRow>

                                    <FieldRow label="SMTP Mail Port" hint="Standard ports: 587 (TLS), 465 (SSL), or 25">
                                        <input 
                                            name="MAIL_PORT" 
                                            type="number"
                                            value={emailSettings.MAIL_PORT} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_PORT: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="587" 
                                            style={{ maxWidth: '140px' }}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Encryption Protocol" hint="Encryption protocol method for secure communication">
                                        <select
                                            name="MAIL_ENCRYPTION"
                                            value={emailSettings.MAIL_ENCRYPTION}
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_ENCRYPTION: e.target.value }))}
                                            className={styles['admin-form-input']}
                                            style={{ maxWidth: '200px' }}
                                        >
                                            <option value="tls">tls</option>
                                            <option value="ssl">ssl</option>
                                        </select>
                                    </FieldRow>

                                    <FieldRow label="Mail Username (Email)" hint="Account email address used for SMTP authentication">
                                        <input 
                                            name="MAIL_USERNAME" 
                                            type="email"
                                            value={emailSettings.MAIL_USERNAME} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_USERNAME: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="example@gmail.com" 
                                            autoComplete="off"
                                        />
                                    </FieldRow>

                                    <FieldRow label="Mail Password / App Password" hint="For Gmail or Yahoo, generate a 16-character App Password">
                                        <input 
                                            name="MAIL_PASSWORD" 
                                            type="password"
                                            value={emailSettings.MAIL_PASSWORD} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_PASSWORD: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="••••••••••••••••" 
                                            autoComplete="new-password"
                                        />
                                    </FieldRow>

                                    <FieldRow label="Sender Email Address (From)" hint="Sender address displayed on outgoing transactional emails">
                                        <input 
                                            name="MAIL_FROM_ADDRESS" 
                                            type="email"
                                            value={emailSettings.MAIL_FROM_ADDRESS} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_FROM_ADDRESS: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="no-reply@domain.com" 
                                        />
                                    </FieldRow>

                                    <FieldRow label="Sender Display Name (From)" hint="Sender name shown in recipient's inbox (e.g. B2B Marketplace)">
                                        <input 
                                            name="MAIL_FROM_NAME" 
                                            type="text"
                                            value={emailSettings.MAIL_FROM_NAME} 
                                            onChange={e => setEmailSettings(prev => ({ ...prev, MAIL_FROM_NAME: e.target.value }))} 
                                            className={styles['admin-form-input']} 
                                            placeholder="B2B Marketplace" 
                                        />
                                    </FieldRow>

                                    <FieldRow label="Test Mail Connection" hint="Verify your SMTP configuration by sending a test email">
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if (user?.email) setTestRecipientEmail(user.email);
                                                setTestMailStatus(null);
                                                setShowTestMailModal(true);
                                            }}
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #cbd5e1',
                                                color: '#0f172a',
                                                padding: '9px 20px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            Send Test Email
                                        </button>
                                    </FieldRow>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </form>

            {/* ── Send Test Email Bootstrap Modal ── */}
            {showTestMailModal && typeof window !== 'undefined' && createPortal(
                <div className="modal fade show" style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    width: '100vw', 
                    height: '100vh', 
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', 
                    backdropFilter: 'blur(5px)', 
                    zIndex: 999999, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px', width: '100%', margin: '0 16px' }}>
                        <div className="modal-content" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', background: '#ffffff' }}>
                            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    </div>
                                    <h5 className="modal-title" style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Send Test Email</h5>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setShowTestMailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
                            </div>
                            <form onSubmit={handleSendTestEmail}>
                                <div className="modal-body" style={{ padding: '24px' }}>
                                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px', lineHeight: '1.5' }}>
                                        Enter the recipient email address below to test your SMTP server configuration and delivery credentials.
                                    </p>

                                    {testMailStatus && (
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            marginBottom: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            background: testMailStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                            color: testMailStatus.type === 'success' ? '#166534' : '#991b1b',
                                            border: `1px solid ${testMailStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                                        }}>
                                            {testMailStatus.type === 'success' ? (
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            )}
                                            <span>{testMailStatus.message}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Recipient Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input 
                                            type="email" 
                                            value={testRecipientEmail} 
                                            onChange={e => setTestRecipientEmail(e.target.value)} 
                                            className={styles['admin-form-input']} 
                                            placeholder="name@domain.com" 
                                            required 
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                                    <button type="button" onClick={() => setShowTestMailModal(false)} className="btn btn-light" style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={sendingTestMail} className="btn btn-primary" style={{ background: 'var(--primary-color, #0f172a)', border: 'none', color: '#ffffff', padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                        {sendingTestMail ? 'Sending...' : 'Send Email'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminSettings;
