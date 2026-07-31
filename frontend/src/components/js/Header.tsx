import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import api from '@/services/axiosConfig';
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';
import { useAuth } from '@/context/AuthContext';
import { useVoiceSearch } from '@/context/VoiceSearchContext';
import { useToast } from '@/context/ToastContext';
import LogoutModal from './LogoutModal';
import { useChat } from '@/context/ChatContext';
import { useNotifications } from '@/context/NotificationContext';
import { getImgUrl } from '@/utils/imageConfig';
import useIsMobile from '@/hooks/useIsMobile';


interface Category {
    _id: string;
    title: string;
    image?: string;
    children?: Category[];
    subcategories?: Category[];
    name?: string;
    slug?: string;
}

interface UserAddress {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    country_code?: string;
    is_default?: boolean;
}

interface CartItem {
    image?: string;
    title?: string;
    name?: string;
    price: number | string;
    quantity: number;
}

const Header = () => {
    const { startListening } = useVoiceSearch();
    const { unreadTotal } = useChat();
    const { unreadCount, notifications, markAsRead, markAllRead } = useNotifications();
    const [categories, setCategories] = useState<Category[]>([]);
    const [staticPages, setStaticPages] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    const [headerLinks, setHeaderLinks] = useState<any[]>([]);
    const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFeaturedMenuOpen, setIsFeaturedMenuOpen] = useState(false);
    const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
    const [activeFeaturedItem, setActiveFeaturedItem] = useState<string>('top-deals');
    const [activeHelpItem, setActiveHelpItem] = useState<string>('buyers');
    const [isCategoriesPortalOpen, setIsCategoriesPortalOpen] = useState(false);
    const [activePortalCategory, setActivePortalCategory] = useState<any>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const pathname = usePathname();
    const navigate = useRouter();

    // Read initial tab from URL if present
    const searchParams = useSearchParams();
    const urlTab = searchParams.get('tab') || 'products';

    const [activeSearchTab, setActiveSearchTab] = useState(urlTab);
    const [cartCount, setCartCount] = useState(0);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isDeliverToOpen, setIsDeliverToOpen] = useState(false);
    const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
    const [tempCountry, setTempCountry] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [logoImgError, setLogoImgError] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const deliverToRef = useRef<HTMLDivElement>(null);

    // Barcode Scanner States
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [manualBarcode, setManualBarcode] = useState('');
    const [scanError, setScanError] = useState('');
    const activeStreamRef = useRef<any>(null);

    const startScanner = async () => {
        setScanError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            activeStreamRef.current = stream;
            const videoElement = document.getElementById('scanner-video') as HTMLVideoElement;
            if (videoElement) {
                videoElement.srcObject = stream;
                videoElement.setAttribute('playsinline', 'true');
                await videoElement.play().catch((e: any) => console.error("Video play error:", e));

                // Integrate HTML5 BarcodeDetector Web API if supported
                if ('BarcodeDetector' in window) {
                    try {
                        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
                        const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
                        const activeFormats = formats.filter(f => supportedFormats.includes(f));
                        
                        const detector = new (window as any).BarcodeDetector({
                            formats: activeFormats.length > 0 ? activeFormats : supportedFormats
                        });

                        const scanFrame = async () => {
                            if (!activeStreamRef.current) return;
                            try {
                                if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                                    const detected = await detector.detect(videoElement);
                                    if (detected && detected.length > 0) {
                                        const code = detected[0].rawValue;
                                        if (code) {
                                            handleSearchBarcode(code);
                                            return;
                                        }
                                    }
                                }
                            } catch (detectErr) {
                                console.error("Frame detection error:", detectErr);
                            }
                            if (activeStreamRef.current) {
                                requestAnimationFrame(scanFrame);
                            }
                        };
                        requestAnimationFrame(scanFrame);
                    } catch (detInitErr) {
                        console.error("Failed to initialize BarcodeDetector:", detInitErr);
                    }
                } else {
                    console.log("BarcodeDetector API is not supported in this browser. Fallback to manual entry is active.");
                }
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setScanError('Could not access camera. Please enter barcode manually.');
        }
    };

    const stopScanner = () => {
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach((track: any) => track.stop());
            activeStreamRef.current = null;
        }
    };

    const handleSearchBarcode = async (code: string) => {
        if (!code || !code.trim()) return;
        setScanError('');
        try {
            const { data } = await api.get(`/products/search-barcode/${code.trim()}`);
            if (data.success && data.product) {
                stopScanner();
                setIsBarcodeScannerOpen(false);
                navigate.push(`/product/${data.product.slug || data.product._id}`);
            } else {
                setScanError(`Product not found with barcode: ${code}`);
            }
        } catch (err: any) {
            setScanError(err.response?.data?.message || `No product found with barcode: ${code}`);
        }
    };

    useEffect(() => {
        if (isBarcodeScannerOpen) {
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            stopScanner();
        }
        return () => {
            stopScanner();
        };
    }, [isBarcodeScannerOpen]);



    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (deliverToRef.current && !deliverToRef.current.contains(event.target as Node)) {
                setIsDeliverToOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const history = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('search_history') : null) || '[]');
        setSearchHistory(history);
    }, []);

    const saveSearch = (term: string) => {
        const history = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('search_history') : null) || '[]');
        if (!history.includes(term)) {
            const newHistory = [term, ...history].slice(0, 5);
            setSearchHistory(newHistory);
            localStorage.setItem('search_history', JSON.stringify(newHistory));
        }
    };

    const removeSearch = (e: React.MouseEvent, termToRemove: string) => {
        e.stopPropagation();
        const newHistory = searchHistory.filter(term => term !== termToRemove);
        setSearchHistory(newHistory);
        localStorage.setItem('search_history', JSON.stringify(newHistory));
    };

    useEffect(() => {
        const updateCount = () => {
            const items = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');
            setCartCount(items.length);
            setCartItems(items);
        };
        updateCount();
        window.addEventListener('cartUpdated', updateCount);
        window.addEventListener('storage', updateCount);
        return () => {
            window.removeEventListener('cartUpdated', updateCount);
            window.removeEventListener('storage', updateCount);
        };
    }, []);

    const {
        authModal, user, currentRole, switchRole, logout,
        openLogin, openRegister, closeAuthModal,
        language, currency, availableCountries, selectedCountry, setSelectedCountry, t, siteSettings,
        refreshUser
    } = useAuth();
    const { showToast } = useToast();
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [couponsCount, setCouponsCount] = useState(0);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user || !isProfileMenuOpen) return;
            try {
                // Fetch public coupons
                let publicCoupons = [];
                try {
                    const res = await api.get('/coupons/public');
                    publicCoupons = res.data || [];
                } catch (err) {
                    console.error('Error fetching public coupons:', err);
                }
                setCouponsCount(publicCoupons.length || 0);

                // Fetch orders
                let ordersList = [];
                try {
                    const res = await api.get('/orders/my-orders');
                    ordersList = res.data || [];
                } catch (err) {
                    console.error('Error fetching my orders:', err);
                }
                // Count pending orders (status is pending or payment_status is unpaid)
                const pendingOrders = ordersList.filter((o: any) => o.status === 'pending' || o.payment_status === 'unpaid');
                setPendingOrdersCount(pendingOrders.length);
            } catch (error) {
                console.error('Error fetching dropdown stats:', error);
            }
        };
        fetchStats();
    }, [user, isProfileMenuOpen]);

    const hasCheckedInToday = () => {
        if (!user?.last_check_in) return false;
        const lastDate = new Date(user.last_check_in);
        const now = new Date();
        return (
            lastDate.getDate() === now.getDate() &&
            lastDate.getMonth() === now.getMonth() &&
            lastDate.getFullYear() === now.getFullYear()
        );
    };

    const handleCheckIn = async () => {
        if (isCheckingIn) return;
        setIsCheckingIn(true);
        try {
            const res = await api.post('/auth/check-in');
            if (res.data && res.data.success) {
                showToast(res.data.message || 'Checked in successfully!', 'success');
                await refreshUser();
            } else {
                showToast(res.data.message || 'Check-in failed.', 'error');
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || 'Check-in failed.';
            showToast(errorMsg, 'error');
        } finally {
            setIsCheckingIn(false);
        }
    };

    const renderCoinsWidget = () => {
        if (!user) return null;
        return (
            <div style={{
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '12px',
                padding: '12px',
                width: '100%',
                boxSizing: 'border-box',
                margin: '8px 0',
                border: '1px solid #ffe0b2',
                boxShadow: '0 2px 8px rgba(255, 152, 0, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '18px' }}>🪙</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e65100' }}>AliExpress Coins</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#e65100' }}>
                        {user.coins || 0}
                    </span>
                </div>
                <button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    {isCheckingIn ? 'Claiming...' : 'Daily Check-In'}
                </button>
            </div>
        );
    };

    const isCheckoutPage = pathname === '/checkout';
    const isAiSourcingPage = pathname === '/ai-sourcing';
    const isDashboard = pathname ? (pathname.startsWith('/dashboard') || pathname.startsWith('/buyer/dashboard') || pathname.startsWith('/supplier') || pathname.startsWith('/admin') || pathname.startsWith('/supplier-dashboard')) : false;
    const isSearchPage = pathname ? pathname.startsWith('/search') : false;
    const isProductPage = pathname ? pathname.startsWith('/product') : false;
    const isWorldwide = searchParams.get('tab') === 'worldwide';
    const isHome = pathname === '/';
    const isCompactHeader = (!isHome || (isHome && isScrolled)) && pathname && !pathname.startsWith('/admin') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/buyer/dashboard');

    const isMobile = useIsMobile(450);

    useEffect(() => {
        const keyword = searchParams?.get('keyword') || '';
        setSearchKeyword(keyword);
    }, [searchParams]);

    const handleClearKeyword = () => {
        setSearchKeyword('');
        if (isSearchPage) {
            navigate.push(`/search?tab=${activeSearchTab}`);
        }
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await api.get('/categories');
                setCategories(data);
                if (data.length > 0) setActiveCategory(null);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        const fetchStaticPages = async () => {
            try {
                const { data } = await api.get('/cms');
                setStaticPages(data);
            } catch (err) {
                console.error('Error fetching static pages:', err);
            }
        };
        const fetchUserAddress = async () => {
            if (user) {
                try {
                    const { data } = await api.get('/shipping-address');
                    const defaultAddr = data.find((a: any) => a.is_default) || data[0];
                    setUserAddress(defaultAddr);
                    if (defaultAddr && defaultAddr.country_code) {
                        setSelectedCountry(defaultAddr.country_code);
                    }
                } catch (err) {
                    console.error('Error fetching address:', err);
                }
            }
        };
        const fetchHeaderLinks = async () => {
            try {
                const { data } = await api.get('/common/header-navigations');
                setHeaderLinks(data || []);
            } catch (err) {
                console.error('Error fetching header links:', err);
            }
        };
        fetchCategories();
        fetchStaticPages();
        fetchUserAddress();
        fetchHeaderLinks();
    }, [user]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 150);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const showFixedHeader = true;

    useEffect(() => {
        setTempCountry(selectedCountry);
    }, [selectedCountry]);

    useEffect(() => {
        // Keep active tab in sync with URL
        const paramsTab = new URLSearchParams(searchParams?.toString()).get('tab');
        if (paramsTab && paramsTab !== activeSearchTab) {
            setActiveSearchTab(paramsTab);
        }
    }, [searchParams?.toString()]);

    useEffect(() => {
        // Product fetching for mega menu is removed as per user request to show categories only
    }, [isMenuOpen]);

    // Lock body scroll and prevent jump when mega menu is open
    useEffect(() => {
        if (isMenuOpen || isFeaturedMenuOpen || isHelpCenterOpen || isCategoriesPortalOpen) {
            document.body.classList.add('mega-menu-open');
        } else {
            document.body.classList.remove('mega-menu-open');
        }
        return () => { document.body.classList.remove('mega-menu-open'); };
    }, [isMenuOpen, isFeaturedMenuOpen, isCategoriesPortalOpen]);

    if (pathname && pathname.startsWith('/admin')) {
        return null;
    }

    if (isMobile) {
        return (
            <>
                <header className="mhdr-root">
                    {/* ── Top bar: hamburger | logo | icons ── */}
                    <div className="mhdr-top">
                        {/* Hamburger */}
                        <button
                            className="mhdr-hamburger"
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <span /><span /><span />
                        </button>

                        {/* Logo */}
                        <div className="mhdr-logo" onClick={() => navigate.push('/')} style={{ cursor: 'pointer' }}>
                            {siteSettings?.logo_dark || siteSettings?.logo_light ? (
                                <img
                                    src={getImgUrl(siteSettings.logo_dark || siteSettings.logo_light)}
                                    alt={siteSettings?.site_name || 'Logo'}
                                    style={{ height: '32px', objectFit: 'contain' }}
                                />
                            ) : (
                                <span className="mhdr-logo-text">{siteSettings?.site_name || 'AliExpress Next'}</span>
                            )}
                        </div>


                    </div>
                </header>

                {/* ── Drawer overlay ── */}
                {isMenuOpen && (
                    <div className="mhdr-overlay" onClick={() => setIsMenuOpen(false)} />
                )}

                {/* ── Slide-in Drawer ── */}
                <div className={`mhdr-drawer ${isMenuOpen ? 'mhdr-drawer--open' : ''}`}>
                    {/* Drawer header: auth buttons + close */}
                    <div className="mhdr-drawer-head">
                        <div className="mhdr-drawer-user">
                            {user ? (
                                <>
                                    <div className="mhdr-drawer-avatar">
                                        {user.first_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="mhdr-drawer-name">{user.first_name} {user.last_name}</p>
                                        <p className="mhdr-drawer-email">{user.email}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="mhdr-drawer-auth">
                                    <button className="mhdr-drawer-login-btn" onClick={() => { openLogin(); setIsMenuOpen(false); }}>Sign In</button>
                                    <button className="mhdr-drawer-register-btn" onClick={() => { openRegister(); setIsMenuOpen(false); }}>Create account</button>
                                </div>
                            )}
                        </div>
                        <button className="mhdr-drawer-close" onClick={() => setIsMenuOpen(false)} aria-label="Close">
                            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Utility items — mirrors desktop top bar (image 3) */}
                    <div className="mhdr-drawer-utils">
                        {/* Deliver to */}
                        <button className="mhdr-util-row" onClick={() => { setIsDeliverToOpen(true); setIsMenuOpen(false); }}>
                            <div className="mhdr-util-icon">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div className="mhdr-util-text">
                                <span className="mhdr-util-label">Deliver to</span>
                                <span className="mhdr-util-value">{selectedCountry || user?.country_code || 'IN'}</span>
                            </div>
                            <svg className="mhdr-util-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" /></svg>
                        </button>

                        {/* Language & Currency */}
                        <button className="mhdr-util-row" onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}>
                            <div className="mhdr-util-icon">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20" strokeLinecap="round" /></svg>
                            </div>
                            <div className="mhdr-util-text">
                                <span className="mhdr-util-label">Language & Currency</span>
                                <span className="mhdr-util-value">{language} – {currency}</span>
                            </div>
                            <svg className="mhdr-util-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" /></svg>
                        </button>

                        <div className="mhdr-util-divider" />

                        {/* Icon grid row: Notifications · Chat · Wishlist · Cart */}
                        <div className="mhdr-util-icon-grid">
                            <Link href={user ? "/dashboard/notifications" : "#"} className="mhdr-util-icon-item" onClick={(e) => { if (!user) { e.preventDefault(); openLogin(); } setIsMenuOpen(false); }}>
                                <div className="mhdr-util-icon-circle mhdr-badge-wrap">
                                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    {unreadCount > 0 && <span className="mhdr-badge">{unreadCount}</span>}
                                </div>
                                <span>Alerts</span>
                            </Link>
                            <Link href={user ? "/chat" : "#"} className="mhdr-util-icon-item" onClick={(e) => { if (!user) { e.preventDefault(); openLogin(); } setIsMenuOpen(false); }}>
                                <div className="mhdr-util-icon-circle mhdr-badge-wrap">
                                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    {unreadTotal > 0 && <span className="mhdr-badge">{unreadTotal}</span>}
                                </div>
                                <span>Chat</span>
                            </Link>
                            <Link href={user ? "/buyer/dashboard/saved" : "#"} className="mhdr-util-icon-item" onClick={(e) => { if (!user) { e.preventDefault(); openLogin(); } setIsMenuOpen(false); }}>
                                <div className="mhdr-util-icon-circle">
                                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                </div>
                                <span>Wishlist</span>
                            </Link>
                            <Link href="/cart" className="mhdr-util-icon-item" onClick={() => setIsMenuOpen(false)}>
                                <div className="mhdr-util-icon-circle">
                                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
                                </div>
                                <span>Cart</span>
                            </Link>
                        </div>

                        {user && (
                            <>
                                <div className="mhdr-util-divider" />
                                <button className="mhdr-util-row mhdr-util-row--danger" onClick={() => { setShowLogoutModal(true); setIsMenuOpen(false); }}>
                                    <div className="mhdr-util-icon">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    </div>
                                    <div className="mhdr-util-text">
                                        <span className="mhdr-util-label">Sign Out</span>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Modals */}
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={() => { logout(); setShowLogoutModal(false); }} title="Sign Out" message="Are you sure you want to sign out?" />
                {authModal && <AuthModal />}
                {isDeliverToOpen && (
                    <div className="settings-modal-overlay" onClick={() => setIsDeliverToOpen(false)}>
                        <div className="location-dropdown-menu mobile-location-modal" onClick={e => e.stopPropagation()}>
                            <div className="location-dropdown-content">
                                <button
                                    className="btn-reset location-close-btn"
                                    onClick={(e) => { e.stopPropagation(); setIsDeliverToOpen(false); }}
                                    style={{ position: 'absolute', top: '16px', right: '16px', padding: '5px', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                                    title="Close"
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                                <h4 className="location-title">Specify your location</h4>
                                <p className="location-subtitle">Shipping options and fees vary based on your location</p>

                                {user ? (
                                    <div className="user-location-info">
                                        {userAddress && (
                                            <div className="current-address-card">
                                                <div className="address-info">
                                                    <strong>{user.first_name} {user.last_name}</strong>
                                                    <p>{userAddress.address}, {userAddress.city}, {userAddress.state}, {userAddress.zip_code}, {userAddress.country}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="location-links">
                                            <Link href="/dashboard/shipping" className="location-link" onClick={() => setIsDeliverToOpen(false)}>View more</Link>
                                            <span className="divider">|</span>
                                            <Link href="/dashboard/shipping" className="location-link" onClick={() => setIsDeliverToOpen(false)}>Add address</Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="login-prompt-location"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            openLogin();
                                            setIsDeliverToOpen(false);
                                        }}
                                    >
                                        <p>Sign in to see your addresses</p>
                                    </div>
                                )}

                                <div className="location-separator">
                                    <span>Or</span>
                                </div>

                                <div className="location-form">
                                    <div className="form-group custom-select-wrapper-react">
                                        <div className="select-container-react">
                                            <Select
                                                className="country-select-enhanced"
                                                classNamePrefix="rs-select"
                                                options={(availableCountries || []).map(c => ({ value: c.code, label: c.name }))}
                                                value={{
                                                    value: tempCountry,
                                                    label: availableCountries.find(c => c.code === tempCountry)?.name || tempCountry
                                                }}
                                                onChange={(option: any) => option && setTempCountry(option.value)}
                                                placeholder="Select country..."
                                                isSearchable={true}
                                                styles={{
                                                    control: (base) => ({
                                                        ...base,
                                                        border: 'none',
                                                        boxShadow: 'none',
                                                        background: 'transparent',
                                                        padding: '0 10px',
                                                        minHeight: '60px',
                                                        fontWeight: '700',
                                                        fontSize: '18px',
                                                        cursor: 'pointer'
                                                    }),
                                                    valueContainer: (base) => ({
                                                        ...base,
                                                        paddingLeft: '50px'
                                                    }),
                                                    option: (base, state) => ({
                                                        ...base,
                                                        fontSize: '14px',
                                                        fontWeight: state.isSelected ? '700' : '500',
                                                        padding: '12px 20px',
                                                        background: state.isFocused ? '#f1f5f9' : (state.isSelected ? 'var(--primary-color)' : 'transparent'),
                                                        color: state.isSelected ? '#fff' : '#1a1a2e',
                                                        cursor: 'pointer'
                                                    })
                                                }}
                                            />
                                            <span className="flag-icon-overlay">
                                                {tempCountry || 'IN'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="btn-location-save"
                                        onClick={() => {
                                            setSelectedCountry(tempCountry);
                                            setIsDeliverToOpen(false);
                                            window.location.reload();
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (isDashboard) {
        return (
            <>
                <header className="header dashboard-global-header">
                    <div className="top-nav container-fluid">
                        <div className="logo-section d-flex align-center gap-4">
                            <Link href="/" className="brand-logo d-flex align-center" style={{ textDecoration: 'none' }}>
                                {siteSettings?.logo_dark && !logoImgError ? (
                                    <img
                                        src={getImgUrl(siteSettings.logo_dark)}
                                        alt={siteSettings?.site_name || 'Logo'}
                                        style={{ height: '40px', maxWidth: '160px', objectFit: 'contain' }}
                                        onError={() => setLogoImgError(true)}
                                    />
                                ) : (
                                    <span className="alibaba-logo-svg">
                                        <svg width="240" height="40" viewBox="0 0 250 40" preserveAspectRatio="xMinYMid meet">
                                            <text x="0" y="32" style={{ fill: '#000', fontSize: '30px', fontWeight: '900', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
                                                {siteSettings?.site_name || 'AliExpress Next'}
                                                <tspan style={{ fill: '#000', fontStyle: 'normal' }}>.com</tspan>
                                            </text>
                                        </svg>
                                    </span>
                                )}
                            </Link>
                        </div>

                        {/* Search Bar on Dashboard */}
                        <div className="compact-search-container animated-search" style={{ flex: 1, maxWidth: '500px', margin: '0 2rem' }}>
                            <form className="search-bar unified d-flex align-center compact-search-bar" onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (searchKeyword.trim() || activeSearchTab === 'suppliers') {
                                    saveSearch(searchKeyword);
                                    navigate.push(`/search?keyword=${encodeURIComponent(searchKeyword)}&tab=${activeSearchTab}`);
                                    setShowHistory(false);
                                } else {
                                    alert('Please enter a search keyword.');
                                }
                            }}>
                                <input
                                    type="text"
                                    placeholder={activeSearchTab === 'products' ? t('search') + ' ' + t('products') + '...' : t('search') + ' ' + t('suppliers') + '...'}
                                    className="search-input w-100"
                                    value={searchKeyword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                                />
                                <button type="submit" className="btn-search dynamic-gradient-style d-flex align-center justify-center gap-2" style={{ padding: '0.5rem 1rem' }}>
                                    <span>{t('search')}</span>
                                </button>
                            </form>
                        </div>

                        <div className="right-section d-flex align-center gap-4">
                            {/* Profile Dropdown */}
                            {user && (
                                <div className={`user-profile-dropdown-container ${isProfileMenuOpen ? 'is-open' : ''}`} ref={profileDropdownRef}>
                                    <div className="user-profile-trigger d-flex align-center gap-2" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                        <div className="avatar-wrapper">
                                            {user.profile_image ? (
                                                <img src={getImgUrl(user.profile_image)} alt="Avatar" className="user-avatar-small" />
                                            ) : (
                                                <div className="user-avatar-placeholder">
                                                    {user.first_name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="user-label-content">
                                            <span className="user-role-label">{currentRole === 'supplier' || currentRole === 'seller' ? 'Seller' : (currentRole === 'admin' ? 'Admin' : 'Customer')}</span>
                                            <span className="user-name-text">{user.first_name}</span>
                                        </div>
                                        <svg className="chevron-icon" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>

                                    <div className={`header-profile-dropdown ${isProfileMenuOpen ? 'show-dropdown' : ''}`}>
                                        <div className="dropdown-header-info">
                                            <div className="info-main">
                                                <p className="full-name">{user.first_name} {user.last_name}</p>
                                                <p className="email">{user.email}</p>
                                            </div>
                                            {renderCoinsWidget()}
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <div className="role-switcher-section">
                                            <p className="section-title">Manage Your Dashboards</p>
                                            <div className="role-grid">
                                                {!(user.roles?.includes('admin') || user.role === 'admin') && (
                                                    <>
                                                        <button
                                                            className={`role-choice-card ${currentRole === 'buyer' || currentRole === 'customer' ? 'active' : ''}`}
                                                            onClick={() => { switchRole('buyer'); setIsProfileMenuOpen(false); }}
                                                        >
                                                            <div className="check-mark"><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                                                            <span className="role-name">Customer</span>
                                                        </button>
                                                        {(user.roles?.includes('supplier') || user.roles?.includes('seller') || user.role === 'supplier' || user.role === 'seller') ? (
                                                            <button
                                                                className={`role-choice-card ${currentRole === 'supplier' || currentRole === 'seller' ? 'active' : ''}`}
                                                                onClick={() => { switchRole('supplier'); setIsProfileMenuOpen(false); }}
                                                            >
                                                                <div className="check-mark"><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                                                                <span className="role-name">Seller</span>
                                                            </button>
                                                        ) : (
                                                            <Link href="/become-supplier" className="role-choice-card start-selling-card">
                                                                <span className="role-name" style={{ color: '#ff6600' }}>Start Selling</span>
                                                            </Link>
                                                        )}
                                                    </>
                                                )}
                                                {(user.roles?.includes('admin') || user.role === 'admin') && (
                                                    <button
                                                        className={`role-choice-card ${currentRole === 'admin' ? 'active' : ''}`}
                                                        onClick={() => switchRole('admin')}
                                                    >
                                                        <div className="check-mark"><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                                                        <span className="role-name">Admin</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <div className="dropdown-footer-links">
                                            <button onClick={() => { setShowLogoutModal(true); setIsProfileMenuOpen(false); }} className="footer-link btn-reset">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={() => { logout(); setShowLogoutModal(false); }} title="Sign Out" message="Are you sure you want to sign out?" />
                {authModal && <AuthModal />}
            </>
        );
    }

    return (
        <>
            <header className={`header ${showFixedHeader ? 'is-fixed' : ''} ${isCompactHeader ? 'search-page-header' : ''}`}>
                {/* Top Row: PREMIA B2C styling */}
                <div className="premia-top-nav">
                    <div className="container d-flex align-center justify-between">
                        {/* Brand Identity */}
                        <div className="premia-brand-section" onClick={() => navigate.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {(siteSettings?.logo_dark || siteSettings?.logo_light) && !logoImgError ? (
                                <img
                                    src={getImgUrl(siteSettings.logo_dark || siteSettings.logo_light)}
                                    alt={siteSettings?.site_name || 'Logo'}
                                    style={{ height: '42px', maxWidth: '200px', objectFit: 'contain' }}
                                    onError={() => setLogoImgError(true)}
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="premia-logo-text">PREMIA</span>
                                    <span className="premia-logo-subtitle">PREMIUM CHOICES. EVERY DAY.</span>
                                </div>
                            )}
                        </div>

                        {/* Centered Search Bar */}
                        <div className="premia-search-container">
                            <form className="premia-search-bar" onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (searchKeyword.trim() || activeSearchTab === 'suppliers') {
                                    saveSearch(searchKeyword);
                                    navigate.push(`/search?keyword=${encodeURIComponent(searchKeyword)}&tab=${activeSearchTab}`);
                                    setShowHistory(false);
                                } else {
                                    alert('Please enter a search keyword.');
                                }
                            }}>
                                <input
                                    type="text"
                                    placeholder={activeSearchTab === 'products' ? t('search') + ' ' + t('products') + '...' : t('search') + ' ' + t('suppliers') + '...'}
                                    className="premia-search-input"
                                    value={searchKeyword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                                    onFocus={() => setShowHistory(true)}
                                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                />
                                {searchKeyword && (
                                    <button
                                        type="button"
                                        className="premia-clear-btn"
                                        onClick={handleClearKeyword}
                                        title="Clear search"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                )}

                                {showHistory && searchHistory.length > 0 && !searchKeyword && (
                                    <div className="premia-search-history">
                                        <div className="premia-history-label">Recent Searches</div>
                                        {searchHistory.map((term, i) => (
                                            <div
                                                key={i}
                                                className="premia-history-item"
                                                onClick={() => {
                                                    setSearchKeyword(term);
                                                    navigate.push(`/search?keyword=${encodeURIComponent(term)}&tab=${activeSearchTab}`);
                                                    saveSearch(term);
                                                }}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    <span>{term}</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => removeSearch(e, term)}
                                                    className="remove-history-btn"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                    title="Remove from history"
                                                >
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <input
                                    type="file"
                                    id="premia-image-search"
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const file = e.target.files ? e.target.files[0] : null;
                                        if (file) {
                                            if (typeof window !== 'undefined') {
                                                (window as any).imageSearchFile = file;
                                            }
                                            navigate.push('/search?is_image_search=true');
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="premia-image-search-btn"
                                    onClick={() => document.getElementById('premia-image-search')?.click()}
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </button>
                                <button
                                    type="button"
                                    className="premia-voice-search-btn"
                                    style={{ marginRight: '6px' }}
                                    onClick={() => setIsBarcodeScannerOpen(true)}
                                    title="Scan Barcode"
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2M8 7v10M12 7v10M16 7v10" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="premia-voice-search-btn"
                                    onClick={() => startListening((text) => {
                                        setSearchKeyword(text);
                                        saveSearch(text);
                                        navigate.push(`/search?keyword=${encodeURIComponent(text)}&tab=${activeSearchTab}`);
                                    })}
                                    title="Voice Search"
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                                </button>
                                <button type="submit" className="premia-search-submit-btn">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </button>
                            </form>
                        </div>

                        {/* Right side utility icons */}
                        <div className="premia-actions-container">
                            {/* Deliver to */}
                            <div className="premia-action-vertical" onClick={() => setIsDeliverToOpen(true)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className="premia-action-vertical-label">Deliver: {selectedCountry || 'IN'}</span>
                            </div>

                            {/* Language & Currency */}
                            <div className="premia-action-vertical" onClick={() => setIsSettingsOpen(true)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                    <path d="M2 12h20" />
                                </svg>
                                <span className="premia-action-vertical-label">{language || 'English'} - {currency || 'USD'}</span>
                            </div>

                            {/* Account */}
                            {user ? (
                                <div className="premia-action-wrapper" ref={profileDropdownRef}>
                                    <div className={`premia-action-vertical ${isProfileMenuOpen ? 'active-account-tab' : ''}`} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                            <span style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: '#22c55e',
                                                border: '1.5px solid white'
                                            }} />
                                        </div>
                                        <span className="premia-action-vertical-label">Hi, {user.first_name || 'User'}</span>
                                    </div>
                                    {isProfileMenuOpen && (
                                        <div className="redesigned-profile-dropdown">
                                            {/* 1. Profile Header Area */}
                                            <div className="rp-header">
                                                <div className="rp-avatar-box">
                                                    {user.profile_image ? (
                                                        <img src={getImgUrl(user.profile_image)} alt="Avatar" />
                                                    ) : (
                                                        user.first_name?.[0]?.toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div className="rp-info">
                                                    <p className="rp-greeting">
                                                        {(() => {
                                                            const hours = new Date().getHours();
                                                            if (hours < 12) return 'Good Morning';
                                                            if (hours < 17) return 'Good Afternoon';
                                                            return 'Good Evening';
                                                        })()} 👋
                                                    </p>
                                                    <p className="rp-name">{user.first_name || 'User'} {user.last_name || ''}</p>
                                                    <p className="rp-email">{user.email}</p>
                                                    {!(user.roles?.includes('admin') || user.role === 'admin') && (
                                                        (user.subscription_status === 'active' || user.subscription_plan || currentRole !== 'buyer') ? (
                                                            <div className="rp-badge">
                                                                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l3 6 6 1-4 4.5 1.5 6.5-6.5-3.5-6.5 3.5 1.5-6.5-4-4.5 6-1z" /></svg>
                                                                Premium Member
                                                            </div>
                                                        ) : (
                                                            <div className="rp-badge" style={{ background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' }}>
                                                                Standard Member
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                <Link href={(user.roles?.includes('admin') || user.role === 'admin') ? "/admin" : "/buyer/dashboard/profile"} className="rp-edit-btn" onClick={() => setIsProfileMenuOpen(false)} title="Profile">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </Link>
                                            </div>

                                            {/* 2. Statistics Row & 3. Daily Check-in Card (Hidden for Admin) */}
                                            {!(user.roles?.includes('admin') || user.role === 'admin') && (
                                                <>
                                                    <div className="rp-stats-row">
                                                        <Link href="/buyer/dashboard/wallet" className="rp-stat-col" onClick={() => setIsProfileMenuOpen(false)}>
                                                            <div className="rp-stat-icon-wrapper coins">
                                                                <span style={{ fontSize: '16px' }}>⭐</span>
                                                            </div>
                                                            <span className="rp-stat-label">Coins</span>
                                                            <span className="rp-stat-val coins">{user.coins || 0}</span>
                                                        </Link>

                                                        <Link href="/buyer/dashboard" className="rp-stat-col" onClick={() => setIsProfileMenuOpen(false)}>
                                                            <div className="rp-stat-icon-wrapper coupons">
                                                                <span style={{ fontSize: '15px' }}>%</span>
                                                            </div>
                                                            <span className="rp-stat-label">Coupons</span>
                                                            <span className="rp-stat-val coupons">{couponsCount}</span>
                                                        </Link>

                                                        <Link href="/buyer/dashboard/orders" className="rp-stat-col" onClick={() => setIsProfileMenuOpen(false)}>
                                                            <div className="rp-stat-icon-wrapper orders">
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                                            </div>
                                                            <span className="rp-stat-label">Orders</span>
                                                            <span className="rp-stat-val orders">{pendingOrdersCount}</span>
                                                            <span className="rp-stat-sublabel">Pending</span>
                                                        </Link>

                                                        <Link href="/buyer/dashboard/wallet" className="rp-stat-col" onClick={() => setIsProfileMenuOpen(false)}>
                                                            <div className="rp-stat-icon-wrapper points">
                                                                <span style={{ fontSize: '15px' }}>⭐</span>
                                                            </div>
                                                            <span className="rp-stat-label">Points</span>
                                                            <span className="rp-stat-val points">{user.loyalty_points || 0}</span>
                                                        </Link>
                                                    </div>

                                                    <div className="rp-checkin-card">
                                                        <div className="rp-checkin-left">
                                                            <div className="rp-checkin-icon">
                                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4))' }}>
                                                                    <circle cx="12" cy="12" r="10" fill="url(#goldGradientCheckin)" stroke="#d97706" strokeWidth="1.2" />
                                                                    <path d="M12 6.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#d97706" />
                                                                    <defs>
                                                                        <linearGradient id="goldGradientCheckin" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                                                                            <stop offset="0%" stopColor="#fbbf24" />
                                                                            <stop offset="50%" stopColor="#f59e0b" />
                                                                            <stop offset="100%" stopColor="#d97706" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                </svg>
                                                            </div>
                                                            <div className="rp-checkin-info">
                                                                <p className="rp-checkin-title">Daily Check-in</p>
                                                                <p className="rp-checkin-desc">+10 Coins every day</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="rp-checkin-btn"
                                                            onClick={handleCheckIn}
                                                            disabled={isCheckingIn || hasCheckedInToday()}
                                                        >
                                                            {isCheckingIn ? 'Claiming...' : hasCheckedInToday() ? 'Checked In' : 'Check In'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* 4. Menu & Role Switchers */}
                                            <div className="rp-menu">
                                                <Link href={(user.roles?.includes('admin') || user.role === 'admin') ? "/admin" : "/buyer/dashboard"} className="rp-menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                                                    <div className="rp-menu-item-left">
                                                        <div className="rp-menu-item-icon">
                                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
                                                        </div>
                                                        <span>Dashboard</span>
                                                    </div>
                                                    <div className="rp-menu-item-chevron">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                                                    </div>
                                                </Link>

                                                {/* Role Switcher inside list (Hidden for Admin) */}
                                                {!(user.roles?.includes('admin') || user.role === 'admin') && (
                                                    <>
                                                        {(currentRole === 'supplier' || currentRole === 'seller') ? (
                                                            <button
                                                                onClick={() => { switchRole('buyer'); setIsProfileMenuOpen(false); }}
                                                                className="rp-menu-item btn-reset"
                                                                style={{ width: '100%', border: 'none', background: 'none' }}
                                                            >
                                                                <div className="rp-menu-item-left">
                                                                    <div className="rp-menu-item-icon">
                                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                                    </div>
                                                                    <span>Switch to Customer</span>
                                                                </div>
                                                                <div className="rp-menu-item-chevron">
                                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                                                                </div>
                                                            </button>
                                                        ) : (user.roles?.includes('supplier') || user.roles?.includes('seller') || user.role === 'supplier' || user.role === 'seller') ? (
                                                            <button
                                                                onClick={() => { switchRole('supplier'); setIsProfileMenuOpen(false); }}
                                                                className="rp-menu-item btn-reset"
                                                                style={{ width: '100%', border: 'none', background: 'none' }}
                                                            >
                                                                <div className="rp-menu-item-left">
                                                                    <div className="rp-menu-item-icon">
                                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                                    </div>
                                                                    <span>Switch to Seller</span>
                                                                </div>
                                                                <div className="rp-menu-item-chevron">
                                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                                                                </div>
                                                            </button>
                                                        ) : null}
                                                    </>
                                                )}

                                                <div className="rp-menu-divider"></div>

                                                <button
                                                    onClick={() => { setShowLogoutModal(true); setIsProfileMenuOpen(false); }}
                                                    className="rp-logout-btn"
                                                >
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="premia-action-wrapper" ref={profileDropdownRef}>
                                    <div className={`premia-action-vertical ${isProfileMenuOpen ? 'active-account-tab' : ''}`} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        <span className="premia-action-vertical-label">Sign In</span>
                                    </div>
                                    {isProfileMenuOpen && (
                                        <div className="redesigned-guest-dropdown">
                                            {/* Close Button */}
                                            <button
                                                type="button"
                                                className="rg-close-btn"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '16px',
                                                    right: '16px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#9e9e9e',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '6px',
                                                    borderRadius: '50%',
                                                    transition: 'all 0.2s ease',
                                                    zIndex: 100
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f5f5f5';
                                                    e.currentTarget.style.color = '#333';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'none';
                                                    e.currentTarget.style.color = '#9e9e9e';
                                                }}
                                            >
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                            {/* Top Welcome Header */}
                                            <div className="rg-header">
                                                <div className="rg-avatar-wrapper">
                                                    <svg width="40" height="40" fill="none" stroke="#ff5722" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                    </svg>
                                                </div>
                                                <h3 className="rg-title">Welcome!</h3>
                                                <p className="rg-subtitle">Sign in or register to enjoy the best experience</p>
                                            </div>

                                            {/* Button Group */}
                                            <div className="rg-btn-group">
                                                {pathname === '/' ? (
                                                    <>
                                                        <Link href="/login" className="rg-btn-signin" onClick={() => setIsProfileMenuOpen(false)}>
                                                            Sign In
                                                        </Link>
                                                        <Link href="/register" className="rg-btn-register" onClick={() => setIsProfileMenuOpen(false)}>
                                                            Register
                                                        </Link>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button type="button" className="rg-btn-signin btn-reset" style={{ width: '100%', border: 'none' }} onClick={() => { setIsProfileMenuOpen(false); openLogin(); }}>
                                                            Sign In
                                                        </button>
                                                        <button type="button" className="rg-btn-register btn-reset" style={{ width: '100%' }} onClick={() => { setIsProfileMenuOpen(false); openRegister({ role: 'buyer' }); }}>
                                                            Register
                                                        </button>
                                                    </>
                                                )}
                                                <Link href="/become-supplier/login" className="rg-btn-seller" onClick={() => setIsProfileMenuOpen(false)}>
                                                    Seller Log In
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Wishlist */}
                            <Link href="/buyer/dashboard/saved" className="premia-action-vertical" style={{ textDecoration: 'none' }} onClick={(e) => { if (!user) { e.preventDefault(); openLogin(); } }}>
                                <div className="premia-icon-badge-container">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                    {user && unreadCount > 0 && <span className="premia-badge">{unreadCount}</span>}
                                </div>
                                <span className="premia-action-vertical-label">Wishlist</span>
                            </Link>

                            {/* Cart */}
                            <div className="premia-action-wrapper cart-dropdown-wrapper">
                                <Link href="/cart" className="premia-action-vertical" style={{ textDecoration: 'none' }}>
                                    <div className="premia-icon-badge-container">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        {cartCount > 0 && <span className="premia-badge">{cartCount}</span>}
                                    </div>
                                    <span className="premia-action-vertical-label">Cart</span>
                                </Link>

                                <div className="notifications-dropdown cart-dropdown premia-cart-dropdown">
                                    <div className="dropdown-header">
                                        <span>My Cart</span>
                                        <div className="cart-count-pill">{cartCount} items</div>
                                    </div>
                                    <div className="cart-dropdown-list">
                                        {cartItems && cartItems.length > 0 ? (
                                            cartItems.slice(0, 2).map((item: CartItem, idx: number) => (
                                                <Link key={idx} href="/cart" className="cart-dropdown-item">
                                                    <div className="cart-item-img-container">
                                                        <img src={getImgUrl(item.image) || 'https://via.placeholder.com/64'} alt="product" />
                                                    </div>
                                                    <div className="cart-item-info">
                                                        <div className="cart-item-name">{item.title || item.name}</div>
                                                        <div className="cart-item-meta">
                                                            <span className="cart-item-price-val">{typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}</span>
                                                            <span className="cart-item-quantity-pill">Qty: {item.quantity || 1}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="cart-empty-state">
                                                <div className="cart-empty-icon">🛒</div>
                                                <div className="cart-empty-title">Your cart is empty</div>
                                            </div>
                                        )}
                                    </div>
                                    {cartItems && cartItems.length > 0 && (
                                        <div className="cart-dropdown-footer">
                                            <div className="cart-subtotal-row">
                                                <span className="subtotal-label">Subtotal</span>
                                                <span className="subtotal-value">
                                                    ${cartItems.reduce((acc: number, item: CartItem) => {
                                                        const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                                        return acc + (isNaN(price) ? 0 : price * (item.quantity || 1));
                                                    }, 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <Link href="/cart" className="btn-cart-checkout">Checkout Now</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="premia-bottom-nav">
                    <div className="container d-flex align-center justify-between">
                        {/* Categories Dropdown Wrapper */}
                        <div
                            className="premia-all-categories-wrapper"
                            onMouseEnter={() => (typeof window !== 'undefined' ? window.innerWidth : 768) > 768 && setIsMenuOpen(true)}
                            onMouseLeave={() => (typeof window !== 'undefined' ? window.innerWidth : 768) > 768 && setIsMenuOpen(false)}
                            onClick={() => (typeof window !== 'undefined' ? window.innerWidth : 768) <= 768 && setIsMenuOpen(!isMenuOpen)}
                        >
                            <button className="premia-all-categories-btn">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                                <span>All Categories</span>
                            </button>

                            {isMenuOpen && (
                                <div className="mega-menu premia-mega-menu">
                                    <div className="mega-menu-container d-flex">
                                        <div className="mega-menu-left">
                                            <ul className="category-list">
                                                <li
                                                    className={`category-item d-flex align-center justify-between gap-2 ${!activeCategory ? 'active' : ''}`}
                                                    onMouseEnter={() => setActiveCategory(null)}
                                                >
                                                    <div className="d-flex align-center gap-2">
                                                        <div className="cat-icon-wrapper">
                                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                                                        </div>
                                                        <span className="cat-title-text">Categories for you</span>
                                                    </div>
                                                    <svg className="cat-chevron-arrow" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                </li>
                                                {categories.map(cat => (
                                                    <li
                                                        key={cat._id}
                                                        className={`category-item d-flex align-center justify-between gap-2 ${activeCategory?._id === cat._id ? 'active' : ''}`}
                                                        onMouseEnter={() => setActiveCategory(cat)}
                                                        onClick={() => {
                                                            if (cat.children && cat.children.length > 0) {
                                                                navigate.push(`/categories/${cat.slug || cat._id}`);
                                                            } else {
                                                                navigate.push(`/search?category_id=${cat.slug || cat._id}`);
                                                            }
                                                            setIsMenuOpen(false);
                                                        }}
                                                    >
                                                        <div className="d-flex align-center gap-2">
                                                            <div className="cat-icon-wrapper">
                                                                <img src={getImgUrl(cat.image)} alt="" className="cat-menu-img" onError={(e) => (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png'} />
                                                            </div>
                                                            <span className="cat-title-text">{cat.title}</span>
                                                        </div>
                                                        <svg className="cat-chevron-arrow" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="mega-menu-right">
                                            <div className="mega-menu-scroll-area">
                                                <div className="mega-category-section">
                                                    <div className="mega-menu-title-row">
                                                        <h4 className="active-cat-title category-title">
                                                            {activeCategory ? activeCategory.title : 'Featured Categories'}
                                                        </h4>
                                                        <Link href={activeCategory ? (activeCategory.children && activeCategory.children.length > 0 ? `/categories/${activeCategory.slug || activeCategory._id}` : `/search?category_id=${activeCategory.slug || activeCategory._id}`) : '/search'} className="browse-link-alibaba view-all-link">View all &gt;</Link>
                                                    </div>
                                                    <div className="subcategory-grid">
                                                        {activeCategory ? (
                                                            activeCategory.children && activeCategory.children.length > 0 ? (
                                                                activeCategory.children.map((sub: Category) => (
                                                                    <div key={sub._id} className="subcategory-card-item">
                                                                        <Link
                                                                            href={`/search?category_id=${sub.slug || sub._id}`}
                                                                            className="subcategory-card-link"
                                                                            onClick={() => setIsMenuOpen(false)}
                                                                        >
                                                                            <div className="subcategory-card-img-box">
                                                                                <img
                                                                                    src={getImgUrl(sub.image)}
                                                                                    alt={sub.title}
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png';
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <span className="subcategory-card-title">{sub.title}</span>
                                                                        </Link>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="no-subcategories" style={{ gridColumn: '1 / -1' }}>
                                                                    <p>Explore all products in {activeCategory.title}</p>
                                                                </div>
                                                            )
                                                        ) : (
                                                            categories.slice(0, 10).map((parent: Category) => (
                                                                parent.children && parent.children.slice(0, 1).map((sub: Category) => (
                                                                    <div key={sub._id} className="subcategory-card-item">
                                                                        <Link
                                                                            href={`/search?category_id=${sub.slug || sub._id}`}
                                                                            className="subcategory-card-link"
                                                                            onClick={() => setIsMenuOpen(false)}
                                                                        >
                                                                            <div className="subcategory-card-img-box">
                                                                                <img src={getImgUrl(sub.image)} alt={sub.title} onError={(e) => {
                                                                                    (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png';
                                                                                }} />
                                                                            </div>
                                                                            <span className="subcategory-card-title">{sub.title}</span>
                                                                        </Link>
                                                                    </div>
                                                                ))
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>


                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Links */}
                        <div className="premia-nav-links">
                            {(() => {
                                const rootLinks = headerLinks.filter((link: any) => !link.parent);
                                const getChildren = (parentId: string) => {
                                    return headerLinks.filter((link: any) => {
                                        const pId = link.parent?._id || link.parent;
                                        return pId === parentId;
                                    });
                                };
                                return rootLinks.map((link: any) => {
                                    const children = getChildren(link._id);
                                    if (children.length > 0) {
                                        return (
                                            <div key={link._id} className="premia-nav-dropdown-wrapper">
                                                <Link
                                                    href={link.url || '#'}
                                                    onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                                    className={`premia-nav-link ${link.isFlash ? 'flash-sale-link' : ''}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <span>{link.title}</span>
                                                    <svg className="nav-chevron" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </Link>
                                                <div className="premia-nav-dropdown-menu">
                                                    {children.map((sub: any) => (
                                                        <Link
                                                            key={sub._id}
                                                            href={sub.url || '#'}
                                                            className="premia-dropdown-nav-link"
                                                        >
                                                            {sub.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <Link
                                            key={link._id}
                                            href={link.url || '#'}
                                            onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                            className={`premia-nav-link ${link.isFlash ? 'flash-sale-link' : ''}`}
                                        >
                                            <span>{link.title}</span>
                                        </Link>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                />
                <LogoutModal
                    isOpen={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    onConfirm={() => {
                        logout();
                        setShowLogoutModal(false);
                    }}
                    title="Sign Out"
                    message="Are you sure you want to sign out?"
                />

                {isBarcodeScannerOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        backdropFilter: 'blur(8px)',
                        fontFamily: 'inherit'
                    }}>
                        <div style={{
                            background: '#ffffff',
                            width: '90%',
                            maxWidth: '480px',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>
                            <button
                                onClick={() => {
                                    stopScanner();
                                    setIsBarcodeScannerOpen(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '16px',
                                    color: '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ✕
                            </button>

                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Barcode & Camera Scanner</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Align the product barcode within the guide lines to scan</p>
                            </div>

                            <div style={{
                                position: 'relative',
                                width: '100%',
                                height: '240px',
                                background: '#0f172a',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <video
                                    id="scanner-video"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    playsInline
                                    muted
                                />
                                <div style={{
                                    position: 'absolute',
                                    width: '70%',
                                    height: '40%',
                                    border: '2px solid #ff6600',
                                    borderRadius: '12px',
                                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        width: '100%',
                                        height: '2px',
                                        background: '#ff6600',
                                        boxShadow: '0 0 10px #ff6600',
                                        position: 'absolute',
                                        animation: 'scanLineMove 2s infinite ease-in-out'
                                    }} />
                                    <style>{`
                                        @keyframes scanLineMove {
                                            0% { top: 0%; }
                                            50% { top: 100%; }
                                            100% { top: 0%; }
                                        }
                                    `}</style>
                                </div>
                            </div>

                            {scanError && (
                                <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                                    {scanError}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Or type barcode manually:</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter barcode..."
                                        value={manualBarcode}
                                        onChange={e => setManualBarcode(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 14px',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '0.875rem',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            background: '#fff',
                                            color: '#000'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSearchBarcode(manualBarcode)}
                                        style={{
                                            background: '#ff6600',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '0 18px',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    handleSearchBarcode('190199123456');
                                }}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px dashed #cbd5e1',
                                    color: '#475569',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Simulate Scan (Lookup demo product)
                            </button>
                        </div>
                    </div>
                )}


                {/* Mobile Categories Fullscreen Portal */}
                {isCategoriesPortalOpen && (
                    <div className="categories-portal">
                        <div className="portal-header">
                            <button className="portal-back-btn" onClick={() => setIsCategoriesPortalOpen(false)}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h2 className="portal-title">Categories</h2>
                            <button className="portal-help-btn">
                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                        </div>

                        <div className="portal-main">
                            <div className="portal-sidebar">
                                <div
                                    className={`portal-sidebar-item ${!activePortalCategory ? 'active' : ''}`}
                                    onClick={() => setActivePortalCategory(null)}
                                >
                                    <div className="portal-sidebar-icon-wrap">
                                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                    </div>
                                    <span className="portal-sidebar-text">For you</span>
                                </div>
                                {categories.map((cat: Category) => (
                                    <div
                                        key={cat._id}
                                        className={`portal-sidebar-item ${activePortalCategory?._id === cat._id ? 'active' : ''}`}
                                        onClick={() => setActivePortalCategory(cat)}
                                    >
                                        <div className="portal-sidebar-icon-wrap">
                                            <img src={getImgUrl(cat.image)} alt="" onError={(e) => (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png'} />
                                        </div>
                                        <span className="portal-sidebar-text">{cat.title}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="portal-content">
                                <h3 className="portal-content-title">
                                    {activePortalCategory ? activePortalCategory.title : 'Recommendations'}
                                </h3>

                                <div className="portal-recommendations-grid">
                                    {(activePortalCategory ? (activePortalCategory.subcategories || activePortalCategory.children || []) : categories).map((item: Category, i: number) => (
                                        <Link
                                            key={item._id || i}
                                            href={
                                                item.children && item.children.length > 0
                                                    ? `/categories/${item.slug || item._id}`
                                                    : item.subcategories && item.subcategories.length > 0
                                                        ? `/categories/${item.slug || item._id}`
                                                        : `/search?category_id=${item.slug || item._id}`
                                            }
                                            className="portal-item-card"
                                            onClick={() => setIsCategoriesPortalOpen(false)}
                                        >
                                            <div className="portal-item-img-wrap">
                                                <img
                                                    src={getImgUrl(item.image)}
                                                    alt={item.title || item.name}
                                                    onError={(e) => (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png'}
                                                />
                                            </div>
                                            <span className="portal-item-name">{item.title || item.name || 'Sample Item'}</span>
                                        </Link>
                                    ))}
                                </div>

                                {!activePortalCategory && (
                                    <div className="portal-inspiration">
                                        <h3 className="portal-inspiration-title">Get product inspiration</h3>
                                        <div className="portal-recommendations-grid">
                                            {categories.slice(0, 6).reverse().map((item: Category, i: number) => (
                                                <Link
                                                    key={i}
                                                    href={
                                                        item.children && item.children.length > 0
                                                            ? `/categories/${item.slug || item._id}`
                                                            : item.subcategories && item.subcategories.length > 0
                                                                ? `/categories/${item.slug || item._id}`
                                                                : `/search?category_id=${item.slug || item._id}`
                                                    }
                                                    className="portal-item-card"
                                                    onClick={() => setIsCategoriesPortalOpen(false)}
                                                >
                                                    <div className="portal-item-img-wrap">
                                                        <img
                                                            src={getImgUrl(item.image)}
                                                            alt={item.title}
                                                            onError={(e) => (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/711/711707.png'}
                                                        />
                                                    </div>
                                                    <span className="portal-item-name">{item.title}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>
            {showFixedHeader && <div className="fixed-header-placeholder" style={{ height: isMobile ? '60px' : '145px' }} />}
        </>
    );
};

export default Header;
