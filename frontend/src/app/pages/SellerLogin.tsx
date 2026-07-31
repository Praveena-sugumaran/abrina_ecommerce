'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);

const SellerLogin = () => {
    const { siteSettings, login, user } = useAuth();
    const navigate = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        if (user) {
            const roles = user.roles || (user.role ? [user.role] : []);
            if (roles.includes('seller') || roles.includes('supplier')) {
                navigate.replace('/supplier/dashboard');
            } else {
                navigate.replace('/');
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        if (resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendTimer]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            login(data);
            const userRoles = data.roles || (data.role ? [data.role] : ['buyer']);
            if (userRoles.includes('admin')) {
                window.location.href = '/admin/dashboard';
            } else if (userRoles.includes('seller') || userRoles.includes('supplier')) {
                window.location.href = '/supplier/dashboard';
            } else {
                // Buyer attempting seller login
                setError('This account is not registered as a seller. Please use the standard login or register as a seller.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) return setError('Email is required');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setResendTimer(60);
            setMode('reset');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) return setError('Enter all 6 digits');
        if (!newPassword) return setError('New password is required');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp: code, newPassword });
            setMode('login');
            setError('');
            alert('Password reset! Please sign in with your new password.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        if (value && index < 5) document.getElementById(`seller-otp-${index + 1}`)?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`seller-otp-${index - 1}`)?.focus();
    };

    const bannerSrc = siteSettings?.seller_login_banner ? getImgUrl(siteSettings.seller_login_banner) : '/images/seller-auth-banner.png';
    const bannerText = siteSettings?.seller_login_text || 'A Trusted Platform\n\nA Professional Operations Team to Boost Your Sales Performance!';
    const siteNameRaw = siteSettings?.site_name || 'B2C Platform';
    const siteName = siteNameRaw.toUpperCase() === 'B2B' ? 'B2C' : siteNameRaw;

    return (
        <div className="auth-split-page seller-auth-page">
            {/* Left: Login Form */}
            <div className="auth-split-right seller-left-form" style={{ borderRight: '1px solid #f0f0f0' }}>
                <div className="auth-split-form-box">
                    <div className="seller-center-logo">
                        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                            {siteSettings?.logo_dark ? (
                                <img
                                    src={getImgUrl(siteSettings.logo_dark)}
                                    alt={siteName}
                                    style={{ height: '36px', maxWidth: '160px', objectFit: 'contain' }}
                                />
                            ) : (
                                <span className="seller-center-logo-text">{siteName}</span>
                            )}
                        </Link>
                        <span className="seller-center-badge">Global Selling Center</span>
                    </div>

                    {mode === 'login' && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '24px' }}>Welcome Back, Seller</h1>
                            <p className="auth-split-subtitle">Sign in to manage your store and products</p>

                            <form onSubmit={handleLogin} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Email address</label>
                                    <input id="seller-email" type="email" className="auth-field-input" placeholder="seller@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                                </div>
                                <div className="auth-field-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label className="auth-field-label" style={{ marginBottom: 0 }}>Password</label>
                                        <button type="button" className="auth-link-btn" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>
                                    </div>
                                    <div className="auth-field-password-wrap">
                                        <input id="seller-password" type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" id="seller-sign-in-btn" className="auth-split-submit-btn seller-submit-btn" disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>
                            <div className="seller-auth-divider"><span>New to selling?</span></div>
                            <Link href="/become-supplier/register" className="seller-register-link-btn" id="seller-register-link">
                                Create a Seller Account
                            </Link>
                            <p className="auth-split-footer-text" style={{ marginTop: '16px' }}>
                                <Link href="/login" className="auth-link-btn" style={{ fontSize: '13px', color: '#888' }}>
                                    ← Back to buyer login
                                </Link>
                            </p>
                        </>
                    )}

                    {mode === 'forgot' && (
                        <>
                            <button type="button" className="auth-back-btn" onClick={() => { setMode('login'); setError(''); }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <h1 className="auth-split-title" style={{ marginTop: '16px' }}>Forgot password?</h1>
                            <p className="auth-split-subtitle">Enter your seller email address to receive a reset code.</p>
                            <form onSubmit={handleForgot} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Email address</label>
                                    <input type="email" className="auth-field-input" placeholder="seller@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn seller-submit-btn" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Code'}
                                </button>
                            </form>
                        </>
                    )}

                    {mode === 'reset' && (
                        <>
                            <button type="button" className="auth-back-btn" onClick={() => { setMode('forgot'); setError(''); }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <h1 className="auth-split-title" style={{ marginTop: '16px' }}>Reset password</h1>
                            <p className="auth-split-subtitle">Enter the 6-digit code sent to <strong>{email}</strong></p>
                            <div className="auth-otp-row">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        id={`seller-otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`auth-otp-box ${d ? 'filled' : ''}`}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                    />
                                ))}
                            </div>
                            <div className="auth-field-group" style={{ marginTop: '16px' }}>
                                <label className="auth-field-label">New password</label>
                                <div className="auth-field-password-wrap">
                                    <input type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            {error && <div className="auth-error-msg">{error}</div>}
                            <button className="auth-split-submit-btn seller-submit-btn" onClick={handleReset} disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <p className="auth-resend-row">
                                Didn't receive the code?{' '}
                                {resendTimer > 0
                                    ? <span className="auth-timer">Resend in {resendTimer}s</span>
                                    : <button type="button" className="auth-link-btn" onClick={() => handleForgot({ preventDefault: () => { } } as any)}>Resend code</button>
                                }
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Banner */}
            <div
                className="auth-split-left seller-right-banner"
                style={{ backgroundImage: `url(${bannerSrc})` }}
            >
                <div className="auth-split-left-overlay seller-banner-overlay">
                    <div className="seller-banner-tag">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Powered by {siteName}
                    </div>
                    <div className="auth-split-caption seller-caption">
                        {bannerText.split('\n').map((line, i) => (
                            <p key={i} style={{ margin: '4px 0', fontWeight: i === 0 ? 800 : 400, fontSize: i === 0 ? '22px' : '15px' }}>{line}</p>
                        ))}
                    </div>
                    <div className="seller-stats-row">
                        <div className="seller-stat">
                            <span className="seller-stat-val">200M+</span>
                            <span className="seller-stat-label">Active Buyers</span>
                        </div>
                        <div className="seller-stat">
                            <span className="seller-stat-val">190+</span>
                            <span className="seller-stat-label">Countries</span>
                        </div>
                        <div className="seller-stat">
                            <span className="seller-stat-val">24/7</span>
                            <span className="seller-stat-label">Support</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerLogin;
