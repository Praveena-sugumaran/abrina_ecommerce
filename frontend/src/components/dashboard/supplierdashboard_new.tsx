import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import styles from './SupplierDashboard.module.css';
import ProductManagement from './products/ProductManagement';
import CompanyProfile from './CompanyProfile';
import SupplierOrders from './orders/SupplierOrders';
import MyMessages from './MyMessages';
import MyNotifications from './MyNotifications';
import UserSettings from './UserSettings';
import SupplierSubscription from './products/SupplierSubscription';
import SupplierWallet from './SupplierWallet';
import PayoutMethod from './PayoutMethod';
import { useChat } from '@/context/ChatContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/axiosConfig';
import LogoutModal from '../js/LogoutModal';
import { getImgUrl } from '@/utils/imageConfig';
import OrderDetail from './OrderDetail';
import Invoice from './Invoice';
import BuyerDisputes from './BuyerDisputes';
import SupplierReviews from './SupplierReviews';
import SupplierCoupons from './SupplierCoupons';
import SupplierCampaigns from './SupplierCampaigns';
import SupplierNewsletter from './SupplierNewsletter';
import SupplierAds from './SupplierAds';

import DropshippingCenter from './DropshippingCenter';

// ─── SVG Sparkline generator ─────────────────────────────────────────────────
const Sparkline = ({ data, color, fill }: { data: number[]; color: string; fill?: string }) => {
    if (!data || data.length < 2) return null;
    const w = 120, h = 40;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
        x: (i / (data.length - 1)) * w,
        y: h - ((v - min) / range) * (h - 6) - 3
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillPath = `${path} L${w},${h} L0,${h} Z`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
            {fill && <path d={fillPath} fill={fill} opacity="0.15" />}
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

// ─── Sales Overview SVG chart ─────────────────────────────────────────────────
const SalesChart = ({ data }: { data: { label: string; value: number }[] }) => {
    if (!data || data.length === 0) return null;
    const w = 100, h = 120;
    const values = data.map(d => d.value);
    const min = 0, max = Math.max(...values) * 1.2 || 100;
    const range = max - min;
    const pts = values.map((v, i) => ({
        x: (i / (values.length - 1)) * w,
        y: h - ((v - min) / range) * (h - 10) - 5
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillPath = `${path} L${w},${h} L0,${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '140px' }} preserveAspectRatio="none">
            <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#salesGrad)" />
            <path d={path} fill="none" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="#FF6B35" stroke="#fff" strokeWidth="1.5" />
            ))}
        </svg>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────
const SupplierDashboard = ({ tab, subtab }: { tab?: string; subtab?: string }) => {
    const { unreadTotal } = useChat();
    const navigate = useRouter();
    const { user, logout, switchRole, currentRole, language, currency, availableLanguages, availableCurrencies, updateUserSettings, t, convertPrice, siteSettings } = useAuth();
    const { theme } = useTheme();
    const activeSection = tab || 'home';
    const [accountSheetOpen, setAccountSheetOpen] = useState(false);

    const translateGroup = (groupName: string) => {
        const map: any = {
            'Core Services': t('core_services') || 'Core Services',
            'Marketing & Sales': t('marketing_sales') || 'Marketing & Sales',
            'Finance & Wallet': t('finance_wallet') || 'Finance & Wallet',
            'Account & Settings': t('account_settings') || 'Account & Settings',
        };
        return map[groupName] || groupName;
    };

    const translateLabel = (labelName: string, id: string) => {
        const map: any = {
            'products': t('product_management') || 'Product Management',
            'orders': t('orders') || 'Orders',
            'dropshipping': 'Dropshipping Center',
            'notifications': t('notifications') || 'Notifications',
            'messages': t('messages') || 'Messages',
            'disputes': t('disputes') || 'Disputes',
            'reviews': t('reviews') || 'Reviews',
            'marketing': t('coupons_vouchers') || 'Coupons',
            'analytics': 'Store Analytics',
            'campaigns': t('email_affiliate') || 'Email & Affiliate',
            'newsletter': 'Newsletter',
            'ads': t('sponsored_ads') || 'Ad Campaigns',
            'live-stream': t('live_stream') || 'Live Stream',
            'wallet': t('my_wallet') || 'My Wallet',
            'payout': t('payout_method') || 'Payout Method',
            'profile': t('company_profile') || 'Store Profile',
            'subscription': t('subscription_plan') || 'Subscription Plan',
            'settings': t('settings') || 'Settings',
        };
        return map[id] || labelName;
    };

    const [stats, setStats] = useState({
        activeProducts: 0,
        newRFQs: 0,
        totalOrders: 0,
        totalRevenue: '0.00',
        is_verified: false,
        plan_active: false,
        user_status: 'none',
        company_status: 'none',
        has_company: false
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);

    // Language & Currency State
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [selectedLang, setSelectedLang] = useState(language);
    const [selectedCurr, setSelectedCurr] = useState(currency);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        setSelectedLang(language);
        setSelectedCurr(currency);
    }, [language, currency]);

    const handleSaveLangCurr = async () => {
        await updateUserSettings(selectedLang, selectedCurr);
        setShowLangDropdown(false);
    };

    const handleLogout = () => setShowLogoutModal(true);
    const confirmLogout = () => { logout(); setShowLogoutModal(false); };

    useEffect(() => {
        const b2bSections = ['rfq', 'my-quotes', 'inquiries', 'customizations', 'product-enquiries', 'crm', 'tenders', 'tenders-live'];
        if (b2bSections.includes(activeSection)) navigate.push('/supplier/dashboard');
    }, [activeSection, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, notifyRes, ordersRes] = await Promise.allSettled([
                    api.get('/auth/supplier/stats'),
                    api.get('/notifications'),
                    api.get('/orders?role=supplier&limit=5&page=1')
                ]);
                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
                if (notifyRes.status === 'fulfilled') setNotifications(notifyRes.value.data || []);
                if (ordersRes.status === 'fulfilled') {
                    const data = ordersRes.value.data;
                    setRecentOrders(Array.isArray(data) ? data.slice(0, 5) : (data?.orders || []).slice(0, 5));
                }
            } catch (err) {
                console.error('Error in fetchData:', err);
            } finally {
                setLoadingStats(false);
            }
        };
        setLoadingStats(true);
        fetchData();
    }, [activeSection]);

    // Dummy sparkline data (representative trend shapes)
    const sparklines = {
        products: [8, 10, 9, 12, 14, 13, 16],
        orders: [2, 4, 3, 5, 6, 7, 8],
        revenue: [800, 1200, 950, 1800, 2400, 2100, 2800],
        rate: [1.2, 1.8, 1.5, 2.0, 1.9, 2.2, 2.4]
    };

    const salesChartData = [
        { label: 'Mon', value: 320 },
        { label: 'Tue', value: 580 },
        { label: 'Wed', value: 420 },
        { label: 'Thu', value: 1247 },
        { label: 'Fri', value: 890 },
        { label: 'Sat', value: 650 },
        { label: 'Sun', value: 730 },
    ];

    // Onboarding steps
    const onboardingSteps = [
        { label: t('complete_company_profile') || 'Complete Company Profile', done: stats.has_company, link: '/supplier/dashboard/profile' },
        { label: t('upload_products_step') || 'Upload 5+ Products', done: stats.activeProducts >= 5, link: '/supplier/dashboard/products' },
        { label: t('setup_payout_step') || 'Setup Payout Method', done: (user?.payout_methods?.length ?? 0) > 0, link: '/supplier/dashboard/payout' },
        { label: t('start_selling') || 'Start Selling & Get Orders', done: stats.totalOrders > 0, link: '/supplier/dashboard/orders' },
    ];
    const onboardingDone = onboardingSteps.filter(s => s.done).length;
    const onboardingPct = Math.round((onboardingDone / onboardingSteps.length) * 100);

    const sidebarItems = [
        {
            group: 'Core Services', items: [
                { id: 'products', label: 'Product Management', icon: 'P' },
                { id: 'orders', label: 'Orders', icon: 'O' },
                { id: 'dropshipping', label: 'Dropshipping Center', icon: 'DS' },
                { id: 'notifications', label: 'Notifications', icon: 'N' },
                { id: 'messages', label: 'Messages', icon: 'M' },
                { id: 'disputes', label: 'Disputes', icon: 'D' },
                { id: 'reviews', label: 'Reviews', icon: 'Rev' }
            ]
        },
        {
            group: 'Marketing & Sales', items: [
                { id: 'marketing', label: 'Coupons', icon: 'Mkt' },
                { id: 'analytics', label: 'Store Analytics', icon: 'Bar' },
                { id: 'campaigns', label: 'Promotions', icon: 'Campaign' },
                { id: 'ads', label: 'Ad Campaigns', icon: 'A' },

            ]
        },
        {
            group: 'Account & Settings', items: [
                { id: 'profile', label: 'Store Profile', icon: 'C' },
                { id: 'wallet', label: 'My Wallet', icon: 'W' },
                { id: 'payout', label: 'Payout Method', icon: 'Pay' },
                { id: 'subscription', label: 'Subscription Plan', icon: 'S' },
                { id: 'settings', label: 'Settings', icon: 'Set' }
            ]
        },
    ];

    const SidebarIcon = ({ type }: { type: string }) => {
        const icons: Record<string, React.ReactNode> = {
            'dashboard': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
            'M': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
            'D': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
            'O': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
            'DS': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
            'P': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
            'W': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
            'Pay': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" /></svg>,
            'A': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
            'Bar': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>,
            'Campaign': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
            'Live': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7z" /></svg>,
            'Mkt': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z" /></svg>,
            'C': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
            'N': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
            'S': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
            'Set': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
            'Rev': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
        };
        return <span className={styles['supplier-sb-icon']}>{icons[type] || icons['dashboard']}</span>;
    };

    // ─── Order status badge ─────────────────────────────────────────────────────
    const OrderBadge = ({ status }: { status: string }) => {
        const cfg: Record<string, { color: string; bg: string }> = {
            delivered: { color: '#059669', bg: '#ECFDF5' },
            processing: { color: '#D97706', bg: '#FFFBEB' },
            shipped: { color: '#2563EB', bg: '#EFF6FF' },
            cancelled: { color: '#DC2626', bg: '#FEF2F2' },
            pending: { color: '#7C3AED', bg: '#F5F3FF' },
            paid: { color: '#059669', bg: '#ECFDF5' },
        };
        const s = cfg[status?.toLowerCase()] || { color: '#64748b', bg: '#F1F5F9' };
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                color: s.color, background: s.bg, textTransform: 'capitalize'
            }}>
                {status || 'Unknown'}
            </span>
        );
    };

    const renderContent = () => {
        const isVerified = stats.company_status === 'verified';
        const isPlanActive = stats.plan_active;
        const restrictedSections = ['products', 'rfq', 'my-quotes', 'orders', 'dropshipping', 'inquiries', 'wallet', 'payout', 'analytics', 'marketing', 'reviews', 'campaigns', 'crm', 'live-stream', 'newsletter'];
        const isRestricted = restrictedSections.includes(activeSection) && (!isVerified || !isPlanActive);

        if (loadingStats) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: '14px' }}>
                    <div className={styles['admin-spinner']} style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: '3px solid #FF6B35', borderRadius: '50%' }} />
                    <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, margin: 0 }}>Loading dashboard...</p>
                </div>
            );
        }

        if (isRestricted) {
            return (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '64px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #eaecf0' }}>
                    <div style={{ width: '72px', height: '72px', background: '#FFF7ED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <svg width="32" height="32" fill="none" stroke="#FF6B35" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1d23', marginBottom: '12px' }}>{t('access_restricted') || 'Access Restricted'}</h2>
                    <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: '1.6' }}>
                        {!isVerified ? (t('access_restricted_desc') || 'Your company profile must be verified before accessing these features.') : (t('active_plan_required') || 'An active Gold Supplier plan is required to sell and manage orders.')}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        {!isVerified ? (
                            <button onClick={() => navigate.push('/supplier/dashboard/profile')} style={{ padding: '11px 22px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>{t('complete_profile') || 'Complete Profile'}</button>
                        ) : (
                            <button onClick={() => navigate.push('/supplier/dashboard/subscription')} style={{ padding: '11px 22px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>{t('upgrade_plan') || 'Upgrade Plan'}</button>
                        )}
                        <button onClick={() => switchRole('buyer')} style={{ padding: '11px 22px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>{t('back_to_buyer') || 'Back to Buyer'}</button>
                    </div>
                </div>
            );
        }

        if (activeSection === 'products') return <ProductManagement isAdminView={false} />;
        if (activeSection === 'reviews') return <SupplierReviews />;
        const emptyCardStyle = { background: '#fff', borderRadius: '14px', padding: '32px', minHeight: '400px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #eaecf0' };
        if (activeSection === 'orders') return subtab ? <OrderDetail role="supplier" orderId={subtab} /> : <SupplierOrders />;
        if (activeSection === 'dropshipping') return <DropshippingCenter />;
        if (activeSection === 'notifications') return <MyNotifications />;
        if (activeSection === 'messages') return <MyMessages />;
        if (activeSection === 'disputes') return <BuyerDisputes role="supplier" />;
        if (activeSection === 'wallet') return <SupplierWallet />;
        if (activeSection === 'payout') return <PayoutMethod />;
        if (activeSection === 'analytics') return <div style={emptyCardStyle}><h2>Store Analytics</h2><p>Visitor and search performance reports coming soon.</p></div>;
        if (activeSection === 'marketing') return <SupplierCoupons />;
        if (activeSection === 'campaigns') return <SupplierCampaigns />;
        if (activeSection === 'newsletter') return <SupplierNewsletter />;
        if (activeSection === 'ads') return <SupplierAds />;

        if (activeSection === 'profile') return <CompanyProfile />;
        if (activeSection === 'subscription') return <SupplierSubscription />;
        if (activeSection === 'settings') return <UserSettings />;
        if (activeSection === 'invoice') return <Invoice orderId={subtab} orderData={null} />;

        // ─── Home Dashboard ───────────────────────────────────────────────────────
        const statCards = [
            {
                label: t('active_products') || 'Active Products',
                value: loadingStats ? '—' : stats.activeProducts,
                change: '+12%',
                spark: sparklines.products,
                sparkColor: '#FF6B35',
                iconBg: '#FFF4EE',
                iconColor: '#FF6B35',
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
                link: '/supplier/dashboard/products'
            },
            {
                label: t('total_orders') || 'Total Orders',
                value: loadingStats ? '—' : stats.totalOrders,
                change: '+8%',
                spark: sparklines.orders,
                sparkColor: '#3B82F6',
                iconBg: '#EFF6FF',
                iconColor: '#3B82F6',
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
                link: '/supplier/dashboard/orders'
            },
            {
                label: t('revenue') || 'Revenue',
                value: loadingStats ? '—' : convertPrice(parseFloat(stats.totalRevenue) || 0).formatted,
                change: '+15%',
                spark: sparklines.revenue,
                sparkColor: '#10B981',
                iconBg: '#ECFDF5',
                iconColor: '#10B981',
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                link: '/supplier/dashboard/wallet'
            },
            {
                label: 'Conversion Rate',
                value: loadingStats ? '—' : (stats.totalOrders > 0 && stats.activeProducts > 0 ? ((stats.totalOrders / (stats.activeProducts * 10)) * 100).toFixed(1) + '%' : '0%'),
                change: '+6%',
                spark: sparklines.rate,
                sparkColor: '#8B5CF6',
                iconBg: '#F5F3FF',
                iconColor: '#8B5CF6',
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
                link: '/supplier/dashboard/analytics'
            },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* ── Welcome Banner ── */}
                <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #eaecf0',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative background */}
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(135deg, #FFF4EE 0%, #fff 100%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: '60px', top: '50%', transform: 'translateY(-50%)', width: '120px', height: '120px', background: 'rgba(255,107,53,0.06)', borderRadius: '50%', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, color: '#fff', flexShrink: 0, overflow: 'hidden', boxShadow: '0 4px 14px rgba(255,107,53,0.35)', border: '3px solid #fff' }}>
                            {user?.profile_image ? (
                                <img src={getImgUrl(user.profile_image)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                (user?.company_name ? user.company_name[0] : user?.first_name?.[0] || 'S').toUpperCase()
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                                {t('welcome_back') || 'Welcome back,'}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1a1d23', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.company_name || 'Supplier'}
                            </h2>
                            {stats.company_status === 'verified' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10B981', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>
                                    <svg width="14" height="14" fill="#10B981" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    {t('verified_supplier') || 'Verified Supplier'}
                                </span>
                            ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#F59E0B', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {t('pending_verification') || 'Pending Verification'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles['supplier-welcome-banner-buttons']} style={{ position: 'relative', zIndex: 1 }}>
                        <button
                            onClick={() => { if (!user?.subscription_plan) { navigate.push('/supplier/dashboard/subscription'); } else { navigate.push('/supplier/dashboard/products'); } }}
                            style={{ padding: '10px 20px', background: '#FF6B35', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 12px rgba(255,107,53,0.35)', transition: 'all .18s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#e55a25'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#FF6B35'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            {t('add_product') || 'Add Product'}
                        </button>
                        <button
                            onClick={() => switchRole('buyer')}
                            style={{ padding: '10px 20px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', color: '#374151', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', transition: 'all .18s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                        >
                            {t('buyer_view') || 'Buyer View'}
                        </button>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className={styles['supplier-stat-grid']}>
                    {statCards.map((s, i) => (
                        <div key={i} className={styles['supplier-stat-card']} onClick={() => navigate.push(s.link)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div className={styles['supplier-stat-icon']} style={{ background: s.iconBg, color: s.iconColor }}>
                                    {s.icon}
                                </div>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '3px 8px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                    {s.change}
                                </span>
                            </div>
                            <div className={styles['supplier-stat-value']}>{s.value}</div>
                            <div className={styles['supplier-stat-label']} style={{ marginBottom: '12px' }}>{s.label}</div>
                            <div style={{ marginTop: 'auto' }}>
                                <Sparkline data={s.spark} color={s.sparkColor} fill={s.sparkColor} />
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>↑ vs last 7 days</div>
                        </div>
                    ))}
                </div>

                {/* ── Main 2-Col Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '18px' }}>

                    {/* ── Left: Sales Overview ── */}
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #eaecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1a1d23' }}>Sales Overview</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>Weekly performance summary</div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer' }}>This Week ▾</span>
                        </div>

                        {/* Chart area */}
                        <div style={{ marginBottom: '20px' }}>
                            <SalesChart data={salesChartData} />
                        </div>

                        {/* Summary row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                            {[
                                { label: 'Total Visitors', value: '5,246', change: '+18%', positive: true },
                                { label: 'Total Sales', value: convertPrice(parseFloat(stats.totalRevenue) || 0).formatted, change: '+15%', positive: true },
                                { label: 'Total Orders', value: String(stats.totalOrders), change: '+8%', positive: true },
                                { label: 'Avg. Order Value', value: stats.totalOrders > 0 ? convertPrice((parseFloat(stats.totalRevenue) || 0) / stats.totalOrders).formatted : convertPrice(0).formatted, change: '+10%', positive: true },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1a1d23', letterSpacing: '-0.02em' }}>{item.value}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', marginTop: '2px' }}>↑ {item.change}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Right: Quick Actions + Onboarding ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Quick Actions */}
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #eaecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <svg width="16" height="16" fill="none" stroke="#FF6B35" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#1a1d23' }}>Quick Actions</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[
                                    {
                                        label: t('post_new_product') || 'Post New Product',
                                        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
                                        action: () => { if (!user?.subscription_plan) navigate.push('/supplier/dashboard/subscription'); else navigate.push('/supplier/dashboard/products'); },
                                        iconBg: '#FFF4EE', iconColor: '#FF6B35'
                                    },
                                    {
                                        label: t('view_orders') || 'View Orders',
                                        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
                                        action: () => navigate.push('/supplier/dashboard/orders'),
                                        iconBg: '#EFF6FF', iconColor: '#3B82F6'
                                    },
                                    {
                                    {
                                        label: t('boost_visibility') || 'Boost Visibility',
                                        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
                                        action: () => navigate.push('/supplier/dashboard/subscription'),
                                        iconBg: '#F5F3FF', iconColor: '#8B5CF6'
                                    },
                                ].map((a, i) => (
                                    <button
                                        key={i}
                                        onClick={a.action}
                                        style={{ background: '#f8fafc', border: '1.5px solid #e8edf5', borderRadius: '12px', padding: '14px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', color: '#374151', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all .18s', fontFamily: 'inherit' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.borderColor = '#c7d4f0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e8edf5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <span style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: a.iconBg, color: a.iconColor, flexShrink: 0 }}>
                                            {a.icon}
                                        </span>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Onboarding Progress */}
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #eaecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#1a1d23' }}>{t('onboarding_progress') || 'Onboarding Progress'}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B35' }}>{onboardingPct}% Complete</span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: '6px', borderRadius: '99px', background: '#f0f0f0', marginBottom: '14px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${onboardingPct}%`, background: 'linear-gradient(90deg, #FF6B35, #FF8C42)', borderRadius: '99px', transition: 'width .5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {onboardingSteps.map((step, i) => (
                                    <div key={i} onClick={() => navigate.push(step.link)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: '10px', transition: 'background .15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: step.done ? '#10B981' : '#fff', border: step.done ? 'none' : '2px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {step.done ? (
                                                <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d1d5db', display: 'block' }} />
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: step.done ? '#9ca3af' : '#374151', textDecoration: step.done ? 'line-through' : 'none', flex: 1 }}>{step.label}</span>
                                        {!step.done && <svg width="14" height="14" fill="none" stroke="#d1d5db" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bottom: Recent Orders + Top Stats ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '18px' }}>

                    {/* Recent Orders */}
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #eaecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1a1d23' }}>Recent Orders</span>
                            <button onClick={() => navigate.push('/supplier/dashboard/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#FF6B35', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                View All <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {recentOrders.length > 0 ? recentOrders.map((order, i) => (
                                <div key={order._id || i} onClick={() => navigate.push(`/supplier/dashboard/orders/${order._id}`)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', borderRadius: '10px', cursor: 'pointer', transition: 'background .15s', borderBottom: i < recentOrders.length - 1 ? '1px solid #f8fafc' : 'none' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1d23' }}>#{order.order_number || order._id?.slice(-6).toUpperCase()}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <OrderBadge status={order.order_status || order.status} />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1d23' }}>{convertPrice(order.total_amount || 0).formatted}</span>
                                    <svg width="14" height="14" fill="none" stroke="#d1d5db" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </div>
                            )) : (
                                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}>📦</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>No orders yet. Start selling!</div>
                                    <button onClick={() => navigate.push('/supplier/dashboard/products')} style={{ marginTop: '14px', padding: '8px 18px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                                        Add Products
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column: performance summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Account health */}
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #eaecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1a1d23', marginBottom: '14px' }}>Account Health</div>
                            {[
                                { label: 'Company Profile', value: stats.has_company ? 'Complete' : 'Incomplete', ok: stats.has_company, link: '/supplier/dashboard/profile' },
                                { label: 'Verification', value: stats.company_status === 'verified' ? 'Verified' : 'Pending', ok: stats.company_status === 'verified', link: '/supplier/dashboard/profile' },
                                { label: 'Subscription', value: stats.plan_active ? 'Active' : 'Inactive', ok: stats.plan_active, link: '/supplier/dashboard/subscription' },
                                { label: 'Payout Method', value: (user?.payout_methods?.length ?? 0) > 0 ? 'Set Up' : 'Missing', ok: (user?.payout_methods?.length ?? 0) > 0, link: '/supplier/dashboard/payout' },
                            ].map((item, i) => (
                                <div key={i} onClick={() => navigate.push(item.link)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer', borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}>
                                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.ok ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {item.ok ? (
                                            <svg width="13" height="13" fill="#10B981" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg width="13" height="13" fill="#F59E0B" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        )}
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Go Global promo */}
                        <div style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)', borderRadius: '16px', padding: '20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                            <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                🌍
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>{t('go_global') || 'Go Global'}</div>
                            <div style={{ fontSize: '12px', opacity: 0.85, lineHeight: 1.5, marginBottom: '14px', fontWeight: 500 }}>
                                {t('go_global_desc') || 'Reach millions of buyers worldwide with our Gold Supplier certification.'}
                            </div>
                            <button onClick={() => navigate.push('/supplier/dashboard/subscription')}
                                style={{ width: '100%', padding: '10px', background: '#fff', color: '#FF6B35', border: 'none', borderRadius: '9px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', transition: 'all .18s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                {t('upgrade_now') || 'Upgrade Now'} →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─── Lang/Currency Dropdown ──────────────────────────────────────────────────
    const LangDropdown = () => (
        <div
            onMouseLeave={() => !isMobile && setShowLangDropdown(false)}
            style={isMobile ? { position: 'fixed', top: '64px', left: '8px', right: '8px', zIndex: 3000, background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid #eaecf0', overflow: 'hidden' }
                : { position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '280px', zIndex: 3000, background: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid #eaecf0', overflow: 'hidden' }}>
            <div style={{ background: '#FF6B35', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px' }}>Language & Currency</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 500 }}>Display preferences</div>
                </div>
                <button onClick={() => setShowLangDropdown(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '14px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Language</label>
                    <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)} style={{ width: '100%', height: '40px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '0 12px', fontSize: '13px', fontWeight: 600, color: '#1a1d23', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {availableLanguages.map((lang: any) => <option key={lang.code} value={lang.name}>{lang.name}</option>)}
                    </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Currency</label>
                    <select value={selectedCurr} onChange={e => setSelectedCurr(e.target.value)} style={{ width: '100%', height: '40px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '0 12px', fontSize: '13px', fontWeight: 600, color: '#1a1d23', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {availableCurrencies.map((curr: any) => <option key={curr.code} value={curr.code}>{curr.code} - {curr.symbol}</option>)}
                    </select>
                </div>
                <button onClick={handleSaveLangCurr} style={{ width: '100%', padding: '10px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Save Changes
                </button>
            </div>
        </div>
    );

    // ─── Notification Dropdown ───────────────────────────────────────────────────
    const NotifyDropdown = () => (
        <div
            onMouseLeave={() => !isMobile && setShowNotifyDropdown(false)}
            style={isMobile ? { position: 'fixed', top: '64px', left: '8px', right: '8px', zIndex: 3000, background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid #eaecf0', overflow: 'hidden', maxHeight: '80vh', overflowY: 'auto' }
                : { position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '340px', zIndex: 3000, background: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid #eaecf0', overflow: 'hidden' }}>
            <div style={{ background: '#FF6B35', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px' }}>Notifications</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 500 }}>{notifications.length} unread</div>
                </div>
                {notifications.length > 0 && <span style={{ background: '#fff', color: '#FF6B35', fontSize: '10px', fontWeight: 900, padding: '3px 8px', borderRadius: '99px' }}>{notifications.length} NEW</span>}
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.slice(0, 5).map((n, idx) => (
                    <div key={n._id} onClick={() => { n.link && navigate.push(n.link); setShowNotifyDropdown(false); }}
                        style={{ display: 'flex', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: idx < Math.min(notifications.length, 5) - 1 ? '1px solid #f8fafc' : 'none', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#FFF4EE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="15" height="15" fill="none" stroke="#FF6B35" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1d23', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: '3px' }}>{new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </div>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF6B35', flexShrink: 0, marginTop: '4px' }} />
                    </div>
                )) : (
                    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '8px', opacity: 0.3 }}>🔔</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>No new notifications</div>
                    </div>
                )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
                <button onClick={() => { navigate.push('/supplier/dashboard/notifications'); setShowNotifyDropdown(false); }}
                    style={{ width: '100%', padding: '10px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    View All Notifications
                </button>
            </div>
        </div>
    );

    // ─── Main render ─────────────────────────────────────────────────────────────
    return (
        <div className={`${styles['supplier-dashboard-container']} ${theme}`}>

            {/* ── Header ── */}
            <header className={styles['supplier-header']}>
                <div className={styles['supplier-header-left']}>
                    <div className={styles['supplier-logo-box-desktop']} onClick={() => navigate.push('/supplier/dashboard')}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="15" height="15" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                                </div>
                                <span className={styles['supplier-logo-text-a']}>{siteSettings?.site_name || 'Velnexa'}</span>
                            </div>
                            <span className={styles['supplier-logo-text-rest']}>Supplier Hub</span>
                        </div>
                    </div>
                    <button className={styles['mobile-menu-toggle']} onClick={() => {
                        if (window.innerWidth > 768) setIsCollapsed(!isCollapsed);
                        else setDrawerOpen(!drawerOpen);
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className={styles['supplier-header-right']}>
                    <div className={styles['supplier-header-group']}>
                        {!isMobile && (
                            <button onClick={() => switchRole('buyer')} className={styles['sup-nav-link']} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                {t('buyer_dashboard') || 'Buyer Dashboard'}
                            </button>
                        )}
                        <Link href="/" className={styles['sup-nav-link']} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {isMobile ? 'Site' : 'Main Site'}
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </Link>
                    </div>

                    <div className={styles['relative']} style={{ position: 'relative' }}>
                        <button className={styles['admin-lang-btn']} onClick={() => setShowLangDropdown(!showLangDropdown)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                            <span>{language || 'English'} - {currency || 'USD'}</span>
                            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                        {showLangDropdown && <LangDropdown />}
                    </div>

                    <div className={styles['relative']} style={{ position: 'relative' }} onMouseLeave={() => !isMobile && setShowNotifyDropdown(false)}>
                        <button className={styles['admin-header-btn']} onMouseEnter={() => setShowNotifyDropdown(true)} onClick={() => isMobile ? navigate.push('/supplier/dashboard/notifications') : setShowNotifyDropdown(!showNotifyDropdown)}>
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            {notifications.length > 0 && <span className={styles['notification-badge-count']}>{notifications.length}</span>}
                        </button>
                        {showNotifyDropdown && <NotifyDropdown />}
                    </div>

                    <div className={styles['admin-profile-section']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate.push('/supplier/dashboard/settings')}>
                            <div className={styles['admin-avatar']} style={{ overflow: 'hidden', background: '#FF6B35' }}>
                                {user?.profile_image ? (
                                    <img src={getImgUrl(user.profile_image)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (user?.first_name?.[0]?.toUpperCase() || 'S')}
                            </div>
                            {!isMobile && (
                                <div className={styles['admin-user-info']}>
                                    <div className={styles['admin-user-name']}>{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Supplier'}</div>
                                    <div className={styles['admin-user-role']}>Supplier</div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleLogout} title="Logout" style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e11d48', transition: 'all 0.2s' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className={styles['supplier-layout-body']}>

                {/* Sidebar overlay */}
                {drawerOpen && <div className={styles['sidebar-overlay']} onClick={() => setDrawerOpen(false)} />}

                {/* ── Sidebar ── */}
                <aside className={`${styles['supplier-sidebar']} ${drawerOpen ? styles['drawer-open'] : ''} ${isCollapsed ? styles['collapsed'] : ''}`}>

                    <div className={styles['mobile-drawer-header']}>
                        <span>Supplier Portal</span>
                        <button onClick={() => setDrawerOpen(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    {/* Dashboard hub button */}
                    <button
                        className={`${styles['supplier-sidebar-item']} ${styles['hub-top-item']} ${activeSection === 'home' ? styles['active'] : ''}`}
                        onClick={() => { navigate.push('/supplier/dashboard'); setDrawerOpen(false); }}>
                        <div className={styles['sidebar-item-left']}>
                            <SidebarIcon type="dashboard" />
                            {!isCollapsed && <span style={{ fontWeight: 700 }}>Dashboard</span>}
                        </div>
                    </button>

                    <div className={styles['supplier-sidebar-content']}>
                        {/* Mobile quick links */}
                        {drawerOpen && (
                            <div style={{ marginBottom: '12px' }}>
                                <h4 className={styles['sidebar-section-title']}>Quick Links</h4>
                                <button className={styles['supplier-sidebar-item']} onClick={() => { switchRole('buyer'); setDrawerOpen(false); }}>
                                    <div className={styles['sidebar-item-left']}>
                                        <SidebarIcon type="dashboard" />
                                        <span>Buyer Dashboard</span>
                                    </div>
                                </button>
                                <Link href="/" className={styles['supplier-sidebar-item']} style={{ textDecoration: 'none' }} onClick={() => setDrawerOpen(false)}>
                                    <div className={styles['sidebar-item-left']}>
                                        <SidebarIcon type="dashboard" />
                                        <span>Main Site</span>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {sidebarItems.map((group, idx) => (
                            <div key={idx}>
                                {!isCollapsed && <h4 className={styles['sidebar-section-title']}>{translateGroup(group.group)}</h4>}
                                {group.items.map(item => (
                                    <button key={item.id}
                                        className={`${styles['supplier-sidebar-item']} ${activeSection === item.id ? styles['active'] : ''}`}
                                        onClick={() => {

                                            else navigate.push(`/supplier/dashboard/${item.id}`);
                                            setDrawerOpen(false);
                                        }}
                                        title={isCollapsed ? translateLabel(item.label, item.id) : ''}>
                                        <div className={styles['sidebar-item-left']}>
                                            <SidebarIcon type={item.icon} />
                                            {!isCollapsed && <span>{translateLabel(item.label, item.id)}</span>}
                                            {item.id === 'messages' && unreadTotal > 0 && (
                                                <span className={styles['supplier-msg-badge']}>{unreadTotal}</span>
                                            )}
                                        </div>
                                        {!isCollapsed && <span className={styles['supplier-sb-arrow']}>❯</span>}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Go Global Promo - sidebar bottom */}
                    {!isCollapsed && (
                        <div className={styles['sp-sidebar-promo']}>
                            <div className={styles['sp-sidebar-promo-icon']}>👑</div>
                            <h5>Go Global</h5>
                            <p>Upgrade to Gold Supplier</p>
                            <button className={styles['sp-sidebar-promo-btn']} onClick={() => navigate.push('/supplier/dashboard/subscription')}>
                                Upgrade Now →
                            </button>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ── */}
                <main className={styles['supplier-main-content']}>
                    {renderContent()}
                </main>
            </div>

            {/* ── Mobile Bottom Nav ── */}
            <nav className={styles['supplier-mobile-bottom-nav']}>
                {[
                    { id: 'home', label: 'HUB', path: '/supplier/dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
                    { id: 'products', label: 'PRODUCTS', path: '/supplier/dashboard/products', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
                    { id: 'orders', label: 'ORDERS', path: '/supplier/dashboard/orders', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg> },
                    { id: 'messages', label: 'CHAT', path: '/supplier/dashboard/messages', badge: unreadTotal > 0 ? unreadTotal : null, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
                ].map(item => (
                    <button key={item.id} className={`${styles['supplier-mob-nav-item']} ${activeSection === item.id ? styles.active : ''}`} onClick={() => navigate.push(item.path)} style={{ position: 'relative' }}>
                        {item.icon}
                        {(item as any).badge && <span className={styles['supplier-mob-badge']}>{(item as any).badge}</span>}
                        <span>{item.label}</span>
                    </button>
                ))}
                <button className={styles['supplier-mob-nav-item']} onClick={() => setAccountSheetOpen(true)}>
                    <div className={styles['supplier-mob-account-avatar']}>{user?.first_name ? user.first_name[0].toUpperCase() + (user.last_name ? user.last_name[0].toUpperCase() : '') : 'S'}</div>
                    <span>ACCOUNT</span>
                </button>
            </nav>

            {/* ── Account Sheet ── */}
            {accountSheetOpen && <div className={styles['myalibaba-overlay']} onClick={() => setAccountSheetOpen(false)} />}
            <div className={`${styles['myalibaba-sheet']} ${accountSheetOpen ? styles.open : ''}`}>
                <div className={styles['myalibaba-handle']} />
                <button className={styles['myalibaba-back-btn']} onClick={() => setAccountSheetOpen(false)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                    {user ? (user.first_name || 'Profile') : 'My Account'}
                </button>
                {user && (
                    <>
                        <div className={styles['myalibaba-profile']}>
                            <div className={styles['myalibaba-avatar']}>{user?.first_name ? user.first_name[0].toUpperCase() + (user.last_name ? user.last_name[0].toUpperCase() : '') : 'S'}</div>
                            <div>
                                <div className={styles['myalibaba-user-name']}>{user.first_name} {user.last_name}</div>
                                <div className={styles['myalibaba-user-email']}>{user.email}</div>
                            </div>
                        </div>
                        <div className={styles['myalibaba-section']}>
                            <div className={styles['myalibaba-section-title']}>Switch Dashboard</div>
                            <div className={styles['myalibaba-role-grid']}>
                                <div className={`${styles['myalibaba-role-card']} ${currentRole === 'buyer' ? styles.active : ''}`} onClick={() => { switchRole('buyer'); setAccountSheetOpen(false); }} role="button" tabIndex={0}>
                                    <div><div className={styles['myalibaba-role-name']}>Buyer</div><div className={styles['myalibaba-role-desc']}>Purchase products</div></div>
                                    {currentRole === 'buyer' && <div className={styles['myalibaba-check']}><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                                </div>
                                <div className={`${styles['myalibaba-role-card']} ${currentRole === 'supplier' || !currentRole ? styles.active : ''}`} onClick={() => { switchRole('supplier'); setAccountSheetOpen(false); }} role="button" tabIndex={0}>
                                    <div><div className={styles['myalibaba-role-name']}>Supplier</div><div className={styles['myalibaba-role-desc']}>Sell on marketplace</div></div>
                                    {(currentRole === 'supplier' || !currentRole) && <div className={styles['myalibaba-check']}><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                                </div>
                            </div>
                        </div>
                        <div className={styles['myalibaba-signout-wrap']}>
                            <button className={styles['myalibaba-signout-btn']} onClick={() => { setAccountSheetOpen(false); handleLogout(); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                Sign Out
                            </button>
                        </div>
                    </>
                )}
            </div>

            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Supplier Logout"
                message="Are you sure you want to sign out from Supplier Portal?"
            />
        </div>
    );
};

export default SupplierDashboard;
