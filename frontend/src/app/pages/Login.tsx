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

const Login = () => {
    const { siteSettings, login, user, isInitialized } = useAuth();
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
    const [socialConfig, setSocialConfig] = useState({ google: false, facebook: false, linkedin: false });
    const [socialUrls, setSocialUrls] = useState<any>({});

    const bannerSrc = siteSettings?.customer_login_banner
        ? getImgUrl(siteSettings.customer_login_banner)
        : '/images/customer-auth-banner-1.png';

    const bannerText = siteSettings?.customer_login_text || 'Your data privacy is our priority';

    useEffect(() => {
        if (user) { navigate.replace('/'); }
    }, [user, navigate]);

    useEffect(() => {
        api.get('/social-login/public').then(({ data }) => setSocialConfig(data)).catch(() => { });
        api.get('/auth/social-urls').then(({ data }) => setSocialUrls(data)).catch(() => { });
    }, []);

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
            const userRole = data.role || (data.roles && data.roles[0]) || 'buyer';
            if (userRole === 'admin') window.location.href = '/admin/dashboard';
            else if (userRole === 'supplier' || userRole === 'seller') window.location.href = '/supplier/dashboard';
            else window.location.href = '/';
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
        if (value && index < 5) {
            const nextEl = document.getElementById(`login-otp-${index + 1}`);
            nextEl?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`login-otp-${index - 1}`)?.focus();
        }
    };

    const handleSocialLogin = (provider: string) => {
        const url = socialUrls[provider];
        if (!url) { alert(`${provider} Login is not configured by the administrator.`); return; }
        window.location.href = url;
    };

    const siteNameRaw = siteSettings?.site_name || 'B2C Platform';
    const siteName = siteNameRaw.toUpperCase() === 'B2B' ? 'B2C' : siteNameRaw;

    return (
        <div className="auth-split-page">
            {/* Left: Banner Slider */}
            <div className="auth-split-left">
                <div
                    className="auth-split-left-slide"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${bannerSrc})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 1,
                        zIndex: 1
                    }}
                />
                <div className="auth-split-left-overlay" style={{ zIndex: 2 }}>
                    <div className="auth-split-brand">
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <span className="auth-split-brand-name">{siteName}</span>
                        </Link>
                    </div>
                    <div className="auth-split-caption">
                        {bannerText.split('\n').map((line, i) => (
                            <p key={i} style={{ margin: '4px 0', fontWeight: i === 0 ? 700 : 400 }}>{line}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Form */}
            <div className="auth-split-right">
                <div className="auth-split-form-box">
                    <div className="auth-split-form-logo" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-start' }}>
                        <Link href="/">
                            {siteSettings?.logo_dark ? (
                                <img
                                    src={getImgUrl(siteSettings.logo_dark)}
                                    alt={siteName}
                                    style={{ height: '40px', maxWidth: '200px', objectFit: 'contain' }}
                                />
                            ) : (
                                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-color, #ff6600)', letterSpacing: '-0.5px' }}>{siteName}</span>
                            )}
                        </Link>
                    </div>

                    <Link href="/" className="auth-split-back-home">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </Link>

                    {mode === 'login' && (
                        <>
                            <h1 className="auth-split-title">Welcome back</h1>
                            <p className="auth-split-subtitle">Sign in to your account to continue</p>

                            {(socialConfig.google || socialConfig.facebook || socialConfig.linkedin) && (
                                <div className="auth-split-social">
                                    {socialConfig.google && (
                                        <button className="auth-social-btn" onClick={() => handleSocialLogin('google')}>
                                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                            Continue with Google
                                        </button>
                                    )}
                                    {socialConfig.facebook && (
                                        <button className="auth-social-btn" onClick={() => handleSocialLogin('facebook')}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                            Continue with Facebook
                                        </button>
                                    )}
                                    {socialConfig.linkedin && (
                                        <button className="auth-social-btn" onClick={() => handleSocialLogin('linkedin')}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#0077B5"><path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9H7.12v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zM20.45 20.45h-3.56v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" /></svg>
                                            Continue with LinkedIn
                                        </button>
                                    )}
                                    <div className="auth-split-or"><span>or</span></div>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Email address</label>
                                    <input id="login-email" type="email" className="auth-field-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                                </div>
                                <div className="auth-field-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label className="auth-field-label" style={{ marginBottom: 0 }}>Password</label>
                                        <button type="button" className="auth-link-btn" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>
                                    </div>
                                    <div className="auth-field-password-wrap">
                                        <input id="login-password" type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>
                            <p className="auth-split-footer-text">
                                New to {siteName}?{' '}
                                <Link href="/register" className="auth-link-primary">Create account</Link>
                            </p>
                            <p className="auth-split-footer-text" style={{ marginTop: '8px' }}>
                                Are you a seller?{' '}
                                <Link href="/become-supplier/login" className="auth-link-primary">Seller Sign In</Link>
                            </p>
                        </>
                    )}

                    {mode === 'forgot' && (
                        <>
                            <button type="button" className="auth-back-btn" onClick={() => { setMode('login'); setError(''); }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <h1 className="auth-split-title">Forgot password?</h1>
                            <p className="auth-split-subtitle">Enter your email and we'll send you a reset code.</p>
                            <form onSubmit={handleForgot} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Email address</label>
                                    <input type="email" className="auth-field-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
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
                            <h1 className="auth-split-title">Reset password</h1>
                            <p className="auth-split-subtitle">Enter the 6-digit code sent to <strong>{email}</strong></p>
                            <form onSubmit={handleReset} className="auth-split-form">
                                <div className="auth-otp-row">
                                    {otp.map((d, i) => (
                                        <input
                                            key={i}
                                            id={`login-otp-${i}`}
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
                                <div className="auth-field-group">
                                    <label className="auth-field-label">New password</label>
                                    <div className="auth-field-password-wrap">
                                        <input type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                                <p className="auth-resend-row">
                                    Didn't receive the code?{' '}
                                    {resendTimer > 0
                                        ? <span className="auth-timer">Resend in {resendTimer}s</span>
                                        : <button type="button" className="auth-link-btn" onClick={() => { handleForgot({ preventDefault: () => { } } as any); }}>Resend code</button>
                                    }
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
