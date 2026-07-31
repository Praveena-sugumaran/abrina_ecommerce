import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminHeader.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import LogoutModal from '@/components/js/LogoutModal';
import { getImgUrl } from '@/utils/imageConfig';

interface AdminHeaderProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    setDrawerOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ isCollapsed, setIsCollapsed, setDrawerOpen }) => {
    const navigate = useRouter();
    const location = usePathname();
    const { theme, toggleTheme } = useTheme();
    const {
        user,
        logout,
        language,
        currency,
        availableLanguages,
        availableCurrencies,
        updateUserSettings,
        siteSettings,
        t
    } = useAuth();
    const { notifications, unreadCount } = useNotifications();

    // Dropdown visibility states
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Selected state for settings
    const [selectedLang, setSelectedLang] = useState(language);
    const [selectedCurr, setSelectedCurr] = useState(currency);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs for click outside detection
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const notifyDropdownRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const headerRightRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedLang(language);
        setSelectedCurr(currency);
    }, [language, currency]);

    // Handle outside clicks to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            const isOutsideHeader = headerRightRef.current && !headerRightRef.current.contains(target);
            const isOutsideProfile = !profileDropdownRef.current || !profileDropdownRef.current.contains(target);
            const isOutsideNotify = !notifyDropdownRef.current || !notifyDropdownRef.current.contains(target);
            const isOutsideLang = !langDropdownRef.current || !langDropdownRef.current.contains(target);

            if (isOutsideHeader && isOutsideProfile && isOutsideNotify && isOutsideLang) {
                setShowLangDropdown(false);
                setShowNotifyDropdown(false);
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const normalizeKey = (label: string) => {
        return label?.toLowerCase()
            .replace(/ & /g, '_and_')
            .replace(/ /g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '');
    };

    const getPageTitle = () => {
        const segments = location.split('/').filter(s => s && s !== 'admin');
        const last = segments[segments.length - 1];
        if (!last || last === 'dashboard') return 'Dashboard';
        if (last === 'suppliers' || last === 'supplier') return 'Sellers';
        if (last === 'approvals') return 'Product Approvals';
        return last.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleSaveLangCurr = async () => {
        await updateUserSettings(selectedLang, selectedCurr);
        setShowLangDropdown(false);
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    const activeLangName = availableLanguages?.find(l => (l.code === language || l.name === language))?.name || language || 'English';
    const activeCurrCode = availableCurrencies?.find(c => (c.code === currency || c.name === currency))?.code || currency || 'USD';

    const confirmLogout = () => {
        logout();
        setShowLogoutModal(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Example search navigation: if query matches orders, users, products, etc.
        const query = searchQuery.toLowerCase().trim();
        if (query.includes('order')) {
            navigate.push('/admin/orders');
        } else if (query.includes('product')) {
            navigate.push('/admin/products');
        } else if (query.includes('user') || query.includes('buyer') || query.includes('supplier')) {
            navigate.push('/admin/users');
        } else if (query.includes('setting')) {
            navigate.push('/admin/settings');
        }
    };

    return (
        <>
            {/* Desktop Header */}
            <header className={styles.adminHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerTitleBlock}>
                        <h2 className={styles.headerPageTitle}>{t(normalizeKey(getPageTitle())) || getPageTitle()}</h2>
                    </div>
                </div>

                <div className={styles.headerRight} ref={headerRightRef}>
                    <div className={styles.headerGroup}>
                        
                        {/* Language Selector */}
                        <div style={{ position: 'relative' }}>
                            <button
                                title="Language & Currency"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLangDropdown(!showLangDropdown);
                                    setShowNotifyDropdown(false);
                                    setShowProfileDropdown(false);
                                }}
                                className={styles.pillSelector}
                                style={{ borderColor: showLangDropdown ? 'var(--primary-color, #0d2e67)' : '' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color, #0d2e67)' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                <span className={styles.pillText}>{activeLangName} - {activeCurrCode}</span>
                            </button>

                            {showLangDropdown && (
                                <div ref={langDropdownRef} className={`${styles.dropdownContainer} ${styles.langDropdown}`}>
                                    <div className={styles.dropdownHeader}>
                                        <div className={styles.dropdownHeaderLeft}>
                                            <div className={styles.dropdownHeaderIcon}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="2" y1="12" x2="22" y2="12" />
                                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className={styles.dropdownHeaderTitle}>Preferences</div>
                                                <div className={styles.dropdownHeaderSubtitle}>Language & Currency</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowLangDropdown(false)} className={styles.dropdownCloseBtn}>✕</button>
                                    </div>
                                    <div className={styles.dropdownBody}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t('language') || 'Language'}</label>
                                            <select
                                                value={selectedLang}
                                                onChange={(e) => setSelectedLang(e.target.value)}
                                                className={styles.selectStyled}
                                            >
                                                {availableLanguages.map(lang => (
                                                    <option key={lang.code} value={lang.name}>{lang.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t('currency') || 'Currency'}</label>
                                            <select
                                                value={selectedCurr}
                                                onChange={(e) => setSelectedCurr(e.target.value)}
                                                className={styles.selectStyled}
                                            >
                                                {availableCurrencies.map(curr => (
                                                    <option key={curr.code} value={curr.code}>{curr.code} - {curr.symbol}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button onClick={handleSaveLangCurr} className={styles.applyBtn}>
                                            {t('apply_changes') || 'Apply Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div style={{ position: 'relative' }}>
                            <button
                                title="Notifications"
                                onClick={() => {
                                    setShowNotifyDropdown(!showNotifyDropdown);
                                    setShowLangDropdown(false);
                                    setShowProfileDropdown(false);
                                }}
                                className={styles.actionBtn}
                                style={{ borderColor: showNotifyDropdown ? 'var(--primary-color, #0d2e67)' : '' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && <span className={styles.badgeCount}>{unreadCount}</span>}
                            </button>

                            {showNotifyDropdown && (
                                <div ref={notifyDropdownRef} className={`${styles.dropdownContainer} ${styles.notifyDropdown}`}>
                                    <div className={styles.dropdownHeader}>
                                        <div className={styles.dropdownHeaderLeft}>
                                            <div className={styles.dropdownHeaderIcon}>
                                                <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2.5">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className={styles.dropdownHeaderTitle}>{t('notifications') || 'Notifications'}</div>
                                                <div className={styles.dropdownHeaderSubtitle}>{notifications.length} {t('unread_alerts') || 'Unread Alerts'}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowNotifyDropdown(false)} className={styles.dropdownCloseBtn}>✕</button>
                                    </div>
                                    <div className={styles.notifyScrollArea}>
                                        {notifications.length > 0 ? (
                                            notifications.slice(0, 5).map((n, idx) => {
                                                const colors = [
                                                    { bg: '#f0f4ff', icon: 'var(--primary-color, #0d2e67)' },
                                                    { bg: '#fff7ed', icon: '#f97316' },
                                                    { bg: '#f0fdf4', icon: '#10b981' },
                                                    { bg: '#fdf4ff', icon: '#a855f7' }
                                                ];
                                                const color = colors[idx % colors.length];
                                                return (
                                                    <div
                                                        key={n._id || idx}
                                                        onClick={() => {
                                                            if (n.link) navigate.push(n.link);
                                                            setShowNotifyDropdown(false);
                                                        }}
                                                        className={styles.notifyItem}
                                                    >
                                                        <div className={styles.notifyIconWrapper} style={{ background: color.bg }}>
                                                            <svg width="16" height="16" fill="none" stroke={color.icon} viewBox="0 0 24 24" strokeWidth="2.5">
                                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                            </svg>
                                                        </div>
                                                        <div className={styles.notifyContent}>
                                                            <div className={styles.notifyTitle}>{n.title}</div>
                                                            <div className={styles.notifyMsg}>{n.message}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className={styles.notifyEmpty}>{t('no_new_notifications') || 'No new notifications'}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} title="Toggle Theme" className={styles.actionBtn}>
                        {theme === 'light' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>

                    {/* Profile Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <div
                            className={`${styles.profilePill} ${showProfileDropdown ? styles.profilePillActive : ''}`}
                            onClick={() => {
                                setShowProfileDropdown(!showProfileDropdown);
                                setShowLangDropdown(false);
                                setShowNotifyDropdown(false);
                            }}
                        >
                            <div className={styles.avatarWrapper}>
                                {user?.profile_image ? (
                                    <img
                                        src={getImgUrl(user.profile_image)}
                                        alt="Profile"
                                        className={styles.avatarImage}
                                    />
                                ) : (
                                    <span className={styles.avatarText}>
                                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                                    </span>
                                )}
                            </div>
                            <div className={styles.profileInfo}>
                                <span className={styles.profileName}>{user?.first_name} {user?.last_name}</span>
                                <span className={styles.profileRole}>
                                    {user?.role_id ? (user.role_id.name || 'Sub Admin') : 'Super Admin'}
                                </span>
                            </div>
                            <svg className={styles.chevronIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showProfileDropdown ? 'rotate(180deg)' : 'none' }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>

                        {showProfileDropdown && (
                            <div ref={profileDropdownRef} className={`${styles.dropdownContainer} ${styles.profileDropdown}`}>
                                <div className={styles.profileMenuHeader}>
                                    <div className={styles.profileMenuUser}>
                                        <span className={styles.profileMenuSignedAs}>{t('signed_in_as') || 'Signed in as'}</span>
                                        <span className={styles.profileMenuEmail}>{user?.email}</span>
                                    </div>
                                    <button onClick={() => setShowProfileDropdown(false)} className={styles.dropdownCloseBtn} style={{ background: '#f1f5f9', color: '#64748b' }}>
                                        ✕
                                    </button>
                                </div>
                                <div className={styles.profileMenuBody}>
                                    <button
                                        onClick={() => { navigate.push('/admin/profile'); setShowProfileDropdown(false); }}
                                        className={styles.profileMenuItem}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {t('edit_profile') || 'Edit Profile'}
                                    </button>
                                    <button
                                        onClick={() => { setShowLogoutModal(true); setShowProfileDropdown(false); }}
                                        className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        {t('logout') || 'Logout'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Header */}
            <header className={styles.mobileHeader}>
                <button className={styles.mobileMenuToggle} onClick={() => setDrawerOpen(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <Link href="/admin/dashboard" className={styles.mobileLogoBox}>
                    {siteSettings?.logo_light ? (
                        <img src={siteSettings.logo_light} alt="Logo" style={{ height: '24px' }} />
                    ) : (
                        <div>
                            <span className={styles.logoTextA}>{siteSettings?.site_name?.[0] || 'A'}</span>
                            <span className={styles.logoTextRest}>{siteSettings?.site_name?.substring(1) || 'libaba'}</span>
                        </div>
                    )}
                </Link>

                <div className={styles.mobileHeaderRight}>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={styles.actionBtn}
                            onClick={() => {
                                setShowNotifyDropdown(!showNotifyDropdown);
                                setShowProfileDropdown(false);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className={styles.badgeCount}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div
                        className={styles.mobileProfileIcon}
                        onClick={() => {
                            setShowProfileDropdown(!showProfileDropdown);
                            setShowNotifyDropdown(false);
                        }}
                    >
                        {user?.profile_image ? (
                            <img src={getImgUrl(user.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Render absolute dropdowns on mobile under the same click handlers */}
            {showNotifyDropdown && (
                <div ref={notifyDropdownRef} className={`${styles.dropdownContainer} ${styles.notifyDropdown}`} style={{ display: 'none' /* Handled by responsive css */ }}>
                    {/* Handled by media queries in CSS */}
                </div>
            )}

            {/* Logout Modal */}
            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Admin Logout"
                message="Are you sure you want to sign out from Admin Panel?"
            />
        </>
    );
};

export default AdminHeader;
