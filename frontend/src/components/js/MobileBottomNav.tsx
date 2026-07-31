import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';


const MobileBottomNav = () => {
    const location = usePathname();
    const navigate = useRouter();
    const { unreadTotal } = useChat();
    const { user, openLogin, logout, currentRole, switchRole } = useAuth();
    const [myAlibabaOpen, setMyAlibabaOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Do not show on admin, checkout, supplier dashboard, or active live stream pages
    if (
        location.startsWith('/admin') ||
        location === '/checkout' ||
        location.startsWith('/supplier/dashboard') ||
        location.startsWith('/live/supplier') ||
        location.startsWith('/live/watch')
    ) {
        return null;
    }

    const isActive = (path: string) => location === path;
    const isDashboard = location.startsWith('/dashboard');

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const currentUser = mounted ? (user || (userStr ? JSON.parse(userStr) : null)) : null;
    const initials = currentUser?.first_name
        ? currentUser.first_name[0].toUpperCase() + (currentUser.last_name ? currentUser.last_name[0].toUpperCase() : '')
        : 'U';

    const handleSwitchRole = (role: string) => {
        switchRole(role);
        setMyAlibabaOpen(false);
    };

    return (
        <>
            {/* My Alibaba Slide-up Sheet */}
            {myAlibabaOpen && (
                <div className="myalibaba-overlay" onClick={() => setMyAlibabaOpen(false)} />
            )}
            <div className={`myalibaba-sheet ${myAlibabaOpen ? 'open' : ''}`}>
                <div className="myalibaba-handle" />

                <button className="myalibaba-back-btn" onClick={() => setMyAlibabaOpen(false)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    {currentUser ? (currentUser.first_name || 'Profile') : 'My Account'}
                </button>

                {currentUser ? (
                    <>
                        {/* Profile header */}
                        <div className="myalibaba-profile">
                            <div className="myalibaba-avatar">{initials}</div>
                            <div className="myalibaba-user-info">
                                <div className="myalibaba-user-name">{currentUser.first_name} {currentUser.last_name}</div>
                                <div className="myalibaba-user-email">{currentUser.email}</div>
                            </div>
                        </div>

                        {/* Manage Dashboards */}
                        <div className="myalibaba-section">
                            <div className="myalibaba-section-title">Manage Your Dashboards</div>
                            <div className="myalibaba-role-grid">

                                {/* Buyer Card */}
                                <div
                                    className={`myalibaba-role-card ${currentRole === 'buyer' ? 'active' : ''}`}
                                    onClick={() => handleSwitchRole('buyer')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div>
                                        <div className="myalibaba-role-name">Buyer</div>
                                        <div className="myalibaba-role-desc">Purchase products</div>
                                    </div>
                                    {currentRole === 'buyer' && (
                                        <div className="myalibaba-check">
                                            <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </div>
                                    )}
                                </div>

                                {/* Supplier Card */}
                                {(currentUser.roles?.includes('supplier') || currentUser.role === 'supplier') ? (
                                    <div
                                        className={`myalibaba-role-card ${currentRole === 'supplier' ? 'active' : ''}`}
                                        onClick={() => handleSwitchRole('supplier')}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div>
                                            <div className="myalibaba-role-name">Supplier</div>
                                            <div className="myalibaba-role-desc">Sell on marketplace</div>
                                        </div>
                                        {currentRole === 'supplier' && (
                                            <div className="myalibaba-check">
                                                <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link href="/become-supplier" className="myalibaba-role-card start-selling" onClick={() => setMyAlibabaOpen(false)}>
                                        <div>
                                            <div className="myalibaba-role-name" style={{ color: '#ff6600' }}>Start Selling</div>
                                            <div className="myalibaba-role-desc">Become a supplier</div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Sign Out */}
                        <div className="myalibaba-signout-wrap">
                            <button
                                className="myalibaba-signout-btn"
                                onClick={() => { setMyAlibabaOpen(false); logout(); }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Sign Out
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="myalibaba-login-prompt">
                        <div className="myalibaba-login-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <h3>Welcome to AliExpress Next</h3>
                        <p>Sign in to manage your orders, messages and more</p>
                        <button className="myalibaba-login-btn" onClick={() => { setMyAlibabaOpen(false); openLogin(); }}>
                            Sign In / Register
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <nav className="mobile-bottom-nav">
                <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                    <div className="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </div>
                    <span>Home</span>
                </Link>
                <Link href="/search" className={`nav-item ${location.startsWith('/search') ? 'active' : ''}`}>
                    <div className="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <span>Search</span>
                </Link>
                <Link href="/cart" className={`nav-item ${isActive('/cart') ? 'active' : ''}`}>
                    <div className="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </div>
                    <span>Cart</span>
                </Link>
                <Link href="/dashboard/messages" className={`nav-item ${isActive('/dashboard/messages') ? 'active' : ''}`}>
                    <div className="nav-icon" style={{ position: 'relative' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        {unreadTotal > 0 && <span className="badge">{unreadTotal}</span>}
                    </div>
                    <span>Chat</span>
                </Link>

                <button
                    className={`nav-item nav-item-btn ${isDashboard ? 'active' : ''}`}
                    onClick={() => setMyAlibabaOpen(true)}
                >
                    <div className="nav-icon">
                        {mounted && currentUser ? (
                            <div className="nav-avatar-mini">{initials}</div>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        )}
                    </div>
                    <span>{mounted && currentUser ? 'Account' : 'Login'}</span>
                </button>
            </nav>
        </>
    );
};

export default MobileBottomNav;
