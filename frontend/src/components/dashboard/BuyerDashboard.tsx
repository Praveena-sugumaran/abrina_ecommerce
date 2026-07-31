import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerWishlist from './BuyerWishlist';
// import MyRFQs from './MyRFQs';
import MyOrders from './MyOrders';
import BuyerDisputes from './BuyerDisputes';
import MyMessages from './MyMessages';
import MyNotifications from './MyNotifications';
// import InquiriesRFQs from './InquiriesRFQs';
// import BuyerCustomizations from './BuyerCustomizations';
// import BuyerEnquiries from './BuyerEnquiries';
import MyContacts from './MyContacts';
import UserSettings from './UserSettings';
import ShippingAddress from './ShippingAddress';
import BuyerSubscription from './products/BuyerSubscription';
import OrderDetail from './OrderDetail';
import Invoice from './Invoice';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useNotifications } from '@/context/NotificationContext';
import { getImgUrl } from '@/utils/imageConfig';
// import TenderMarket from './tender/TenderMarket';
// import TenderLive from './tender/TenderLive';
// import BuyerCredit from './BuyerCredit';
import CustomerWallet from './CustomerWallet';
import ReferralProgram from './ReferralProgram';
import DeviceManagement from './DeviceManagement';
import MyEmiSchedules from './MyEmiSchedules';
import BuyerGiftCards from './BuyerGiftCards';
import CustomerLoyaltyRewards from './CustomerLoyaltyRewards';

const BuyerDashboard = ({ tab, subtab }: { tab?: string; subtab?: string }) => {
    const { unreadTotal } = useChat();
    const activeSidebar = tab || 'dashboard';
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Cart Recovery Coupon countdown state
    const [cartItemsCount, setCartItemsCount] = useState(0);
    const [recoveryTimeLeft, setRecoveryTimeLeft] = useState(900); // 15 mins
    const [recoveryDismissed, setRecoveryDismissed] = useState(false);

    useEffect(() => {
        try {
            const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartItemsCount(cartItems.length);
        } catch (e) {
            setCartItemsCount(0);
        }

        const countdown = setInterval(() => {
            setRecoveryTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdown);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdown);
    }, []);

    // Header Dropdowns
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { logout, user: authUser, currentRole, switchRole, convertPrice, language, currency, availableLanguages, availableCurrencies, updateUserSettings, t, siteSettings } = useAuth();
    const { markAllRead, notifications } = useNotifications();
    const navigate = useRouter();
    const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
    const user = authUser || { first_name: 'User', last_name: '', email: 'user@example.com' };
    const [stats, setStats] = useState({ rfqs: 0, favorites: 0, totalOrders: 0, pendingOrders: 0, completedOrders: 0, activeInquiries: 0 });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentProducts, setRecentProducts] = useState<any[]>([]);
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchDashboardStats = async () => {
        setLoadingStats(true);
        try {
            const results = await Promise.allSettled([
                api.get('/rfq/my-rfqs'),
                api.get('/wishlist'),
                api.get('/orders/my-orders')
            ]);

            const rfqRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
            const wishlistRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
            const orderRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

            const orders = Array.isArray(orderRes.data) ? orderRes.data : [];
            const pending = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length;
            const completed = orders.filter((o: any) => o.status === 'delivered' || o.status === 'completed').length;

            setStats({
                rfqs: Array.isArray(rfqRes.data) ? rfqRes.data.length : 0,
                favorites: Array.isArray(wishlistRes.data) ? wishlistRes.data.length : 0,
                totalOrders: orders.length,
                pendingOrders: pending,
                completedOrders: completed,
                activeInquiries: Array.isArray(rfqRes.data) ? rfqRes.data.filter((r: any) => r.status === 'active' || r.status === 'open').length : 0
            });

            // Get 5 most recent orders
            setRecentOrders(orders.slice(0, 5));
            setRfqs((Array.isArray(rfqRes.data) ? rfqRes.data : []).slice(0, 5));

            // Fetch recently viewed products
            try {
                const prodRes = await api.get('/products', { params: { limit: 12, sort_by: 'recent' } });
                setRecentProducts(prodRes.data?.products || []);
            } catch { }
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        const b2bSections = ['inquiries', 'customizations', 'product-enquiries', 'my_rfqs', 'tenders', 'tenders-live', 'credit'];
        if (b2bSections.includes(activeSidebar)) {
            const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
            navigate.push(baseRoute);
        }
    }, [activeSidebar, navigate]);

    useEffect(() => {
        fetchDashboardStats();

        const handleRefresh = () => {
            fetchDashboardStats();
        };
        window.addEventListener('newMessage', handleRefresh);
        window.addEventListener('notificationReceived', handleRefresh);
        return () => {
            window.removeEventListener('newMessage', handleRefresh);
            window.removeEventListener('notificationReceived', handleRefresh);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate.push('/login');
    };

    const translateGroup = (groupName: string) => {
        const map: any = {
            'My Account': t('my_account') || 'My Account',
            'Rewards & Program': t('rewards_program') || 'Rewards & Program',
            'Settings': t('settings') || 'Settings'
        };
        return map[groupName] || groupName;
    };

    const sidebarItems = [
        {
            group: 'SHOPPING', items: [
                { id: 'dashboard', label: t('dashboard') || 'Dashboard', icon: 'dashboard' },
                { id: 'orders', label: t('orders') || 'Orders', icon: 'O' },
                { id: 'saved', label: 'Wishlist', icon: 'H' },
                { id: 'messages', label: 'My Messages', icon: 'M' },
                { id: 'reviews', label: 'Reviews', icon: 'star' },
                { id: 'recently-viewed', label: 'Recently Viewed', icon: 'clock' }
            ]
        },
        {
            group: 'ACCOUNT', items: [
                { id: 'wallet', label: 'My Wallet', icon: 'wallet' },
                { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'gift' },
                { id: 'giftcards', label: 'Gift Cards', icon: 'gift' },
                { id: 'emi', label: 'My EMI Plans', icon: 'Sub' },
                { id: 'shipping', label: 'Addresses', icon: 'shipping' },
                { id: 'settings', label: 'Account Settings', icon: 'S' },
                { id: 'logout', label: 'Logout', icon: 'logout' }
            ]
        }
    ];

    const SidebarIcon = ({ type }: { type: string }) => {
        const icons = {
            'dashboard': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>,
            'M': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
            'O': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
            'H': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
            'star': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
            'clock': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
            'wallet': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>,
            'gift': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>,
            'Sub': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>,
            'shipping': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
            'S': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
            'logout': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        };
        return <span className="buyer-sb-icon">{(icons as any)[type] || icons['dashboard']}</span>;
    };


    // Helper for toggle icon
    const ToggleIcon = () => (
        isCollapsed ?
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> :
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
    );

    const getStatusColor = (status: string) => {
        const colors = {
            pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6',
            delivered: '#10b981', completed: '#059669', cancelled: '#ef4444',
            active: '#10b981', open: '#3b82f6', closed: '#6b7280'
        };
        return (colors as any)[status?.toLowerCase()] || '#6b7280';
    };

    // ─── Dashboard Overview Content ───
    const DashboardOverview = () => {
        return (
            <>
                {/* Abandoned Cart Recovery Alert Banner */}
                {cartItemsCount > 0 && recoveryTimeLeft > 0 && !recoveryDismissed && (
                    <div
                        style={{
                            background: '#fffbf7',
                            border: '1.5px dashed #fdba74',
                            borderRadius: '16px',
                            padding: isMobile ? '20px 16px 16px' : '18px 24px',
                            marginBottom: '24px',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'stretch' : 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 15px rgba(253, 186, 116, 0.05)',
                            position: 'relative',
                            gap: '16px',
                            fontFamily: "'Inter', sans-serif"
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '12px' : '18px', flex: 1, minWidth: isMobile ? '100%' : '280px', textAlign: isMobile ? 'center' : 'left' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6a00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="9" width="18" height="12" rx="2" ry="2"></rect>
                                    <path d="M12 2v20"></path>
                                    <path d="M3 9h18"></path>
                                    <path d="M7.5 3a2.5 2.5 0 0 0 0 5H12"></path>
                                    <path d="M16.5 3a2.5 2.5 0 0 1 0 5H12"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', color: '#ff6a00', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.01em' }}>
                                    Don't miss out on your items!
                                </h4>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: 500, lineHeight: 1.55 }}>
                                    You have {cartItemsCount} item{cartItemsCount > 1 ? 's' : ''} waiting in your shopping cart. Use coupon code <strong style={{ background: '#ff6a00', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', letterSpacing: '0.02em', fontWeight: 800 }}>CARTRECOVERY10</strong> to claim an extra <strong style={{ color: '#ff6a00', fontWeight: 850 }}>10% OFF</strong> at checkout!
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '12px' : '20px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', borderRight: isMobile ? 'none' : '1px solid #ffd8c0', paddingRight: isMobile ? '0' : '20px' }}>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', display: 'block', letterSpacing: '0.08em' }}>Expires In</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '19px', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>
                                    {Math.floor(recoveryTimeLeft / 60).toString().padStart(2, '0')} : {(recoveryTimeLeft % 60).toString().padStart(2, '0')}
                                </span>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 750, color: '#94a3b8', display: 'block', letterSpacing: '0.08em', wordSpacing: '8px' }}>Min Sec</span>
                            </div>
                            <Link
                                href="/cart"
                                style={{
                                    background: '#ff6a00',
                                    color: '#fff',
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    fontWeight: 750,
                                    fontSize: '13.5px',
                                    textDecoration: 'none',
                                    boxShadow: '0 4px 12px rgba(255, 106, 0, 0.2)',
                                    transition: 'all 0.18s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '42px',
                                    width: isMobile ? '100%' : 'auto',
                                    boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e05d00'}
                                onMouseLeave={e => e.currentTarget.style.background = '#ff6a00'}
                            >
                                Checkout Now
                            </Link>
                            <button
                                onClick={() => setRecoveryDismissed(true)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '20px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    transition: 'color 0.15s ease',
                                    lineHeight: 1
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ff6a00'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Welcome Banner */}
                <div className="dashboard-welcome-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '18px 20px' : '28px 32px', borderRadius: '18px', background: 'linear-gradient(135deg, #ff6a00 0%, #ff8e3c 100%)', color: 'white', position: 'relative', overflow: 'hidden', minHeight: isMobile ? 'auto' : '140px', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '18px', zIndex: 2, flex: 1, minWidth: '250px' }}>
                        <div style={{ width: isMobile ? '50px' : '72px', height: isMobile ? '50px' : '72px', borderRadius: '50%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                            {user.profile_image ? (
                                <img src={getImgUrl(user.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: isMobile ? '18px' : '26px', fontWeight: 900, color: '#ff6a00' }}>{user.first_name ? user.first_name[0].toUpperCase() : 'U'}</span>
                            )}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{ margin: 0, fontSize: isMobile ? '17px' : '22px', fontWeight: 850, color: 'white', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {t('welcome_back') || 'Welcome back'}, {user.first_name}! 👋
                            </h1>
                            <p style={{ margin: '4px 0 0 0', fontSize: isMobile ? '12px' : '13.5px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                                {t('buyer_subtitle') || 'Manage your orders, track deliveries and discover amazing products.'}
                            </p>
                        </div>
                    </div>

                    {/* Interactive 3D SVGs Art (Plant and Shopping Bags) - Hidden on mobile */}
                    {!isMobile && (
                        <div className="bdr-welcome-art" style={{ position: 'absolute', right: '180px', bottom: 0, display: 'flex', alignItems: 'flex-end', gap: '8px', zIndex: 1, pointerEvents: 'none' }}>
                            {/* Plant SVG */}
                            <svg width="48" height="70" viewBox="0 0 48 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="14" y="44" width="20" height="26" rx="4" fill="#ffffff" opacity="0.9" />
                                <ellipse cx="24" cy="44" rx="14" ry="6" fill="#e2e8f0" />
                                <path d="M24 40C20 28 8 32 8 20C8 8 20 16 24 28Z" fill="#10b981" />
                                <path d="M24 40C28 28 40 32 40 20C40 8 28 16 24 28Z" fill="#059669" />
                                <path d="M24 44C24 30 18 34 14 24C10 14 20 22 24 34Z" fill="#34d399" />
                            </svg>
                            {/* Bags SVG */}
                            <svg width="60" height="65" viewBox="0 0 60 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Beige bag */}
                                <path d="M12 24H36V60H12Z" fill="#ffedd5" />
                                <path d="M18 24V16C18 12.68 20.68 10 24 10C27.32 10 30 12.68 30 16V24" stroke="#fdba74" strokeWidth="2.5" />
                                {/* Orange bag in front */}
                                <path d="M26 30H54V60H26Z" fill="#ff8e3c" />
                                <path d="M32 30V20C32 16.68 34.68 14 38 14C41.32 14 44 16.68 44 20V30" stroke="#ff6a00" strokeWidth="2.5" />
                            </svg>
                        </div>
                    )}

                    <div style={{ zIndex: 2, width: isMobile ? '100%' : 'auto', textAlign: 'left' }}>
                        <Link href="/search" className="buyer-dash-banner-btn" style={{ textDecoration: 'none', width: isMobile ? '100%' : 'auto', display: 'inline-flex', justifyContent: 'center' }}>
                            {t('browse_products') || 'Browse Products'}
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Row */}
                <div className="buyer-stat-grid" style={{ marginTop: '24px' }}>
                    {[
                        {
                            label: t('total_orders') || 'Total Orders',
                            sub: 'All time orders',
                            val: loadingStats ? '...' : stats.totalOrders,
                            color: '#ff6a00',
                            bg: '#fff7ed',
                            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /></svg>,
                            route: `${baseRoute}/orders`
                        },
                        {
                            label: t('pending') || 'Pending Orders',
                            sub: 'Awaiting confirmation',
                            val: loadingStats ? '...' : stats.pendingOrders,
                            color: '#3b82f6',
                            bg: '#eff6ff',
                            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                            route: `${baseRoute}/orders`
                        },
                        {
                            label: t('new_messages') || 'New Messages',
                            sub: 'Unread messages',
                            val: loadingStats ? '...' : (unreadTotal || 0),
                            color: '#a855f7',
                            bg: '#faf5ff',
                            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
                            route: `${baseRoute}/messages`
                        },
                        {
                            label: 'Wishlist Items',
                            sub: 'Saved for later',
                            val: loadingStats ? '...' : stats.favorites,
                            color: '#ec4899',
                            bg: '#fdf2f8',
                            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>,
                            route: `${baseRoute}/saved`
                        },
                        {
                            label: t('completed') || 'Completed Orders',
                            sub: 'Successfully delivered',
                            val: loadingStats ? '...' : stats.completedOrders,
                            color: '#10b981',
                            bg: '#f0fdf4',
                            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
                            route: `${baseRoute}/orders`
                        }
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="buyer-stat-card"
                            onClick={() => navigate.push(item.route)}
                            style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '8px' : '16px', padding: isMobile ? '16px 12px' : '20px 24px', background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', cursor: 'pointer', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                        >
                            <div className="buyer-stat-icon" style={{ background: item.bg, color: item.color, width: isMobile ? '38px' : '48px', height: isMobile ? '38px' : '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: 0 }}>
                                {item.icon}
                            </div>
                            <div style={{ textAlign: isMobile ? 'center' : 'left', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start' }}>
                                <span style={{ fontSize: isMobile ? '18px' : '26px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{item.val}</span>
                                <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 800, color: '#475569', marginTop: '4px', whiteSpace: 'nowrap' }}>{item.label}</span>
                                <span style={{ fontSize: isMobile ? '9px' : '10px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{item.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Split Grid: Recent Orders & Quick Links */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: '20px', marginTop: '24px' }}>

                    {/* Recent Orders Section */}
                    <div className="buyer-dash-section" style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', boxShadow: '0 4px 20px rgba(13, 46, 103, 0.02)', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{t('recent_orders') || 'Recent Orders'}</h3>
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Status of your latest purchases</span>
                            </div>
                            <Link href={`${baseRoute}/orders`} style={{ fontSize: '13px', fontWeight: 700, color: '#ff6a00', textDecoration: 'none', background: '#fff0e6', padding: '6px 14px', borderRadius: '8px' }}>
                                {t('view_all') || 'View All'}
                            </Link>
                        </div>

                        {recentOrders.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="buyer-orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <th style={{ padding: '12px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{t('order_id') || 'Order ID'}</th>
                                            <th style={{ padding: '12px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{t('product') || 'Product'}</th>
                                            <th style={{ padding: '12px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{t('amount') || 'Amount'}</th>
                                            <th style={{ padding: '12px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{t('status') || 'Status'}</th>
                                            <th style={{ padding: '12px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{t('date') || 'Date'}</th>
                                            <th style={{ padding: '12px 8px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map(order => (
                                            <tr key={order._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px', fontSize: isMobile ? '12px' : '13px', fontWeight: 750, color: '#ff6a00' }}>
                                                    #{order._id?.slice(-8).toUpperCase()}
                                                </td>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px', fontSize: isMobile ? '12px' : '13px', fontWeight: 600, color: '#334155', maxWidth: isMobile ? '120px' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {order.items?.[0]?.product?.name || order.items?.[0]?.name || 'Product'}
                                                </td>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px', fontSize: isMobile ? '12px' : '13px', fontWeight: 750, color: '#0f172a' }}>
                                                    {convertPrice ? convertPrice(order.total_amount || order.totalAmount || 0).formatted : `$${order.total_amount || order.totalAmount || 0}`}
                                                </td>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px' }}>
                                                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: isMobile ? '10px' : '11px', fontWeight: 700, background: `${getStatusColor(order.status)}15`, color: getStatusColor(order.status) }}>
                                                        {order.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px', fontSize: isMobile ? '11px' : '12px', color: '#64748b', fontWeight: 500 }}>
                                                    {new Date(order.createdAt || order.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: isMobile ? '10px 6px' : '14px 8px', textAlign: 'right' }}>
                                                    <button onClick={() => navigate.push(`${baseRoute}/orders/${order._id}`)} style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '6px 12px', borderRadius: '6px', fontSize: isMobile ? '10.5px' : '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                                                        {t('view') || 'View'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #e2e8f0' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="24" height="24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                </div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#475569', fontWeight: 750 }}>No orders yet</h4>
                                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Start shopping and place your first order.</p>
                                <button onClick={() => navigate.push('/search')} style={{ background: '#ff6a00', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                    {t('browse_products') || 'Browse Products'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Links Section */}
                    <div className="buyer-dash-section" style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', boxShadow: '0 4px 20px rgba(13, 46, 103, 0.02)', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Quick Links</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                {
                                    title: 'Track Your Order',
                                    desc: 'Check order status',
                                    color: '#ff6a00',
                                    bg: '#fff7ed',
                                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
                                    route: `${baseRoute}/orders`
                                },
                                {
                                    title: 'Manage Addresses',
                                    desc: 'Add or update addresses',
                                    color: '#3b82f6',
                                    bg: '#eff6ff',
                                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
                                    route: `${baseRoute}/shipping`
                                },
                                {
                                    title: 'Payment Methods',
                                    desc: 'Manage your payment options',
                                    color: '#10b981',
                                    bg: '#f0fdf4',
                                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
                                    route: `${baseRoute}/wallet`
                                },
                                {
                                    title: 'Help Center',
                                    desc: 'Get help & support',
                                    color: '#a855f7',
                                    bg: '#faf5ff',
                                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
                                    route: '/help'
                                }
                            ].map((link, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => navigate.push(link.route)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.background = '#fafbfc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fff'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: link.bg, color: link.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {link.icon}
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 750, color: '#1e293b' }}>{link.title}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>{link.desc}</div>
                                        </div>
                                    </div>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3" width="12" height="12"><polyline points="9 18 15 12 9 6" /></svg>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recently Viewed Products */}
                {recentProducts.length > 0 && (
                    <div className="buyer-dash-section" style={{ marginTop: '24px', background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5' }}>
                        <div className="buyer-dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{t('recently_added_products') || 'Recently Added Products'}</h3>
                            <Link href="/search" className="buyer-dash-view-all" style={{ background: '#f1f5f9', color: '#475569', fontSize: '12px', padding: '6px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
                                {t('browse_all') || 'Browse All'} →
                            </Link>
                        </div>
                        <div className="buyer-recent-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', padding: '24px' }}>
                            {recentProducts.slice(0, 12).map(product => {
                                const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
                                const priceData = convertPrice ? convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0) : { formatted: `$${product.main_price || 0}` };
                                return (
                                    <Link key={product._id} href={`/product/${product.slug || product._id}`} className="buyer-recent-prod-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div className="buyer-recent-prod-img">
                                            {imgUrl ? <img src={imgUrl} alt={product.name} /> : <div className="buyer-recent-prod-placeholder">📷</div>}
                                        </div>
                                        <div className="buyer-recent-prod-info">
                                            <div className="buyer-recent-prod-name">{product.name}</div>
                                            <div className="buyer-recent-prod-price" style={{ fontSize: '14px', fontWeight: 800, color: '#ff6a00', marginTop: '6px' }}>{priceData.formatted}</div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="dashboard-page-wrapper">
            {/* Desktop Premium Header */}
            <header className="bdr-header">
                {/* Left: logo + hamburger */}
                <div className="bdr-hdr-left">
                    <button className="bdr-hamburger" onClick={() => setDrawerOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <Link href="/" className="bdr-logo">
                        <div className="bdr-logo-icon">
                            <svg viewBox="0 0 32 32" width="22" height="22" fill="none"><rect x="2" y="8" width="28" height="20" rx="3" fill="#fff" opacity=".9"/><path d="M8 8V6a8 8 0 0116 0v2" stroke="#fff" strokeWidth="2.5" fill="none"/><circle cx="16" cy="18" r="3" fill="#ff6a00"/></svg>
                        </div>
                        <div>
                            <div className="bdr-logo-name">{t('customer') || 'customer'}</div>
                        </div>
                    </Link>
                </div>

                {/* Right: nav actions */}
                <div className="bdr-hdr-right">
                    {!isMobile && (
                        <>
                            {(authUser?.roles?.includes('supplier') || authUser?.role === 'supplier') ? (
                                <button onClick={() => switchRole('supplier')} className="bdr-hdr-action">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    <span>{t('supplier_portal') || 'Supplier Portal'}</span>
                                </button>
                            ) : (
                                <Link href="/become-supplier" className="bdr-hdr-action">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    <span>{t('start_selling') || 'Start Selling'}</span>
                                </Link>
                            )}
                            <Link href="/" className="bdr-hdr-action">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                                <span>{t('main_site') || 'Main Site'}</span>
                            </Link>
                        </>
                    )}

                    {/* Notification bell */}
                    <button className="bdr-hdr-bell" onClick={() => navigate.push('/buyer/dashboard/notifications')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                        {notifications.length > 0 && <span className="bdr-bell-badge">{notifications.length}</span>}
                    </button>

                    {/* User chip */}
                    <div className="bdr-user-chip" onClick={() => navigate.push('/dashboard/settings')}>
                        <div className="bdr-user-av">
                            {user.profile_image
                                ? <img src={getImgUrl(user.profile_image)} alt="" />
                                : <span>{user.first_name?.[0]?.toUpperCase() || 'J'}</span>
                            }
                        </div>
                        {!isMobile && (
                            <div className="bdr-user-info">
                                <div className="bdr-user-name">{user.first_name} {user.last_name}</div>
                                <div className="bdr-user-sub" style={{ color: '#94a3b8', fontWeight: 500 }}>Customer Account</div>
                            </div>
                        )}
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="14" height="14"><path d="M6 9l6 6 6-6"/></svg>
                    </div>

                    <button onClick={handleLogout} title="Logout" style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e11d48', transition: 'all 0.2s', marginLeft: '4px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </header>

            {drawerOpen && <div className="bdr-overlay" onClick={() => setDrawerOpen(false)} />}

            <div className="bdr-body">
                <aside className={`bdr-sidebar ${drawerOpen ? 'open' : ''}`}>
                    <div className="bdr-sb-profile">
                        <div className="bdr-sb-av">
                            {user.profile_image ? (
                                <img src={getImgUrl(user.profile_image)} alt="" />
                            ) : (
                                <span>{user.first_name?.[0]?.toUpperCase() || 'J'}</span>
                            )}
                        </div>
                        <div className="bdr-sb-info">
                            <div className="bdr-sb-name">{user.first_name} {user.last_name}</div>
                            <div className="bdr-sb-badge" style={{ background: '#ffeddb', color: '#ff6a00' }}>BUYER</div>
                        </div>
                        <button className="bdr-sb-x" onClick={() => setDrawerOpen(false)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <nav className="bdr-sb-nav">
                        {sidebarItems.map((group, idx) => (
                            <div key={idx}>
                                <div className="bdr-sb-glabel">{group.group}</div>
                                {group.items.map((item: any) => {
                                    if (item.id === 'logout') return null; // We handle logout at the bottom
                                    
                                    const baseRoute = typeof window !== 'undefined' && window.location.pathname.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
                                    const isActive = activeSidebar === item.id;
                                    
                                    if (item.id === 'dashboard') {
                                        return (
                                            <button
                                                key={item.id}
                                                className={`bdr-sb-hub ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    navigate.push(baseRoute);
                                                    setDrawerOpen(false);
                                                }}
                                            >
                                                <SidebarIcon type={item.icon} />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    }
                                    
                                    return (
                                        <button
                                            key={item.id}
                                            className={`bdr-sb-item ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                navigate.push(`${baseRoute}/${item.id}`);
                                                setDrawerOpen(false);
                                            }}
                                        >
                                            <span className="bdr-sb-iico"><SidebarIcon type={item.icon} /></span>
                                            <span className="bdr-sb-item-label">{item.label}</span>
                                            {item.id === 'messages' && unreadTotal > 0 && <span className="bdr-sb-mbadge">{unreadTotal}</span>}
                                            <span className="bdr-sb-arrow" style={{ marginLeft: 'auto', opacity: 0.35, fontSize: '10px' }}>❯</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                    
                    <button className="bdr-sb-logout" onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>Logout</span>
                    </button>
                </aside>

                <main className="bdr-main">
                    <div className="bdr-content">
                        {activeSidebar === 'orders' ? (
                            subtab ? <OrderDetail role="buyer" orderId={subtab} /> : <MyOrders />
                    ) : activeSidebar === 'disputes' ? (
                        <BuyerDisputes />
                    ) : activeSidebar === 'notifications' ? (
                        <MyNotifications />
                    ) : activeSidebar === 'messages' ? (
                        <MyMessages />
                    ) : activeSidebar === 'contacts' ? (
                        <MyContacts />
                    ) : activeSidebar === 'saved' ? (
                        <BuyerWishlist />
                    ) : activeSidebar === 'subscription' ? (
                        <BuyerSubscription />
                    ) : activeSidebar === 'shipping' ? (
                        <ShippingAddress />
                    ) : activeSidebar === 'wallet' ? (
                        <CustomerWallet />
                    ) : activeSidebar === 'loyalty' ? (
                        <CustomerLoyaltyRewards />
                    ) : activeSidebar === 'giftcards' ? (
                        <BuyerGiftCards />
                    ) : activeSidebar === 'emi' ? (
                        <MyEmiSchedules />
                    ) : activeSidebar === 'referral' ? (
                        <ReferralProgram />
                    ) : activeSidebar === 'security' || activeSidebar === 'settings' ? (
                        <UserSettings />
                    ) : activeSidebar === 'devices' ? (
                        <DeviceManagement />
                    ) : activeSidebar === 'invoice' ? (
                        <Invoice orderId={subtab} orderData={null} />
                    ) : activeSidebar === 'reviews' ? (
                        <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', padding: '24px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>My Reviews</h3>
                            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Manage reviews and ratings you have shared for products.</p>
                            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #fef3c7' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#475569', fontWeight: 750 }}>No reviews submitted</h4>
                                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>You haven't reviewed any purchases yet. Your feedback will appear here once submitted.</p>
                                <button onClick={() => navigate.push(`${baseRoute}/orders`)} style={{ background: '#ff6a00', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                    Go to Orders
                                </button>
                            </div>
                        </div>
                    ) : activeSidebar === 'recently-viewed' ? (
                        <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', padding: '24px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Recently Viewed</h3>
                            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Your recently browsed items on Buy2Mart.</p>
                            {recentProducts.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                    {recentProducts.map(product => {
                                        const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
                                        const priceData = convertPrice ? convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0) : { formatted: `$${product.main_price || 0}` };
                                        return (
                                            <Link key={product._id} href={`/product/${product.slug || product._id}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px', background: '#fff', transition: 'all 0.15s ease' }}>
                                                <div style={{ width: '100%', height: '140px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {imgUrl ? <img src={imgUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px' }}>📷</span>}
                                                </div>
                                                <div style={{ marginTop: '10px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#ff6a00', marginTop: '6px' }}>{priceData.formatted}</div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #e2e8f0' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" width="24" height="24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    </div>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#475569', fontWeight: 750 }}>No history yet</h4>
                                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Browse our wide range of categories to discover products.</p>
                                    <button onClick={() => navigate.push('/search')} style={{ background: '#ff6a00', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                        Go Shopping
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <DashboardOverview />
                    )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BuyerDashboard;
