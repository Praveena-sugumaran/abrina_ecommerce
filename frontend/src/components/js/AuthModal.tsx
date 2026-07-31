import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import ReCAPTCHA from 'react-google-recaptcha';
import Select from 'react-select';
import { getImgUrl } from '@/utils/imageConfig';

const STEPS = {
    AUTH_START: 'auth_start',
    OTP: 'otp',
    ROLE: 'role',
    SETUP: 'setup',
    BUSINESS: 'business',
    LOGIN: 'login',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password'
};



const AuthModal = ({
    isOpen: propIsOpen,
    onClose: propOnClose,
    initialMode,
    isFullPage = false
}: {
    isOpen?: boolean;
    onClose?: () => void;
    initialMode?: string;
    isFullPage?: boolean;
}) => {
    const { authModal, closeAuthModal, siteSettings } = useAuth();
    const navigate = useRouter();

    // Support both prop-based (standalone) and context-based (global) usage
    const isOpen = propIsOpen !== undefined ? propIsOpen : authModal.isOpen;
    const onClose = propOnClose || closeAuthModal;

    const [mode, setMode] = useState(STEPS.AUTH_START);

    const isRegistering = mode !== STEPS.LOGIN && mode !== STEPS.FORGOT_PASSWORD && mode !== STEPS.RESET_PASSWORD;
    const bannerSrc = isRegistering
        ? (siteSettings?.customer_register_banner ? getImgUrl(siteSettings.customer_register_banner) : '/images/customer-auth-banner-1.png')
        : (siteSettings?.customer_login_banner ? getImgUrl(siteSettings.customer_login_banner) : '/images/customer-auth-banner-1.png');

    const bannerText = isRegistering
        ? (siteSettings?.customer_register_text || 'Join millions of shoppers worldwide')
        : (siteSettings?.customer_login_text || 'Your data privacy is our priority');

    const siteNameRaw = siteSettings?.site_name || 'B2C Platform';
    const siteName = siteNameRaw.toUpperCase() === 'B2B' ? 'B2C' : siteNameRaw;
    const [email, setEmail] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('buyer');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('IN');
    const [countries, setCountries] = useState<any[]>([]);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(30);
    const [businessType, setBusinessType] = useState<string[]>([]);
    const [businessTypes, setBusinessTypes] = useState<any[]>([]);
    const [stateProvince, setStateProvince] = useState('');
    const [states, setStates] = useState<any[]>([]);
    const otpRefs = useRef<any>([]);
    const [socialConfig, setSocialConfig] = useState({ google: false, facebook: false, linkedin: false });
    const [socialUrls, setSocialUrls] = useState<any>({});

    const handleSocialLogin = async (provider: string) => {
        const url = socialUrls[provider];
        if (!url) {
            alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} Login is not fully configured by administrator.`);
            return;
        }
        window.location.href = url;
    };

    useEffect(() => {
        if (isOpen) {
            // Reset all input state values to initial empty states on open
            setEmail('');
            setPassword('');
            setOtp(['', '', '', '', '', '']);
            setFirstName('');
            setLastName('');
            setCompanyName('');
            setPhoneNumber('');
            setShowPassword(false);
            setAgreed(false);
            setLoading(false);
            setError('');
            setResendTimer(30);
            setBusinessType([]);
            setStateProvince('');

            setMode((initialMode as any) || authModal.mode || STEPS.AUTH_START);
            setRole(authModal.role || 'buyer');

            // Initialization data
            api.get('/auth/countries').then(({ data }) => {
                setCountries(data);
                const india = data.find((c: any) => c.code === 'IN');
                if (india) setSelectedCountry('IN');
            }).catch(() => { });

            api.get('/auth/business-types').then(({ data }) => setBusinessTypes(data)).catch(() => { });
            api.get('/social-login/public').then(({ data }) => setSocialConfig(data)).catch(() => { });
            api.get('/auth/social-urls').then(({ data }) => setSocialUrls(data)).catch(() => { });
        }
    }, [isOpen, initialMode, authModal.mode, authModal.role]);

    useEffect(() => {
        if (selectedCountry) {
            api.get(`/auth/states/${selectedCountry}`)
                .then(({ data }) => {
                    setStates(data);
                    setStateProvince('');
                })
                .catch(() => { setStates([]); });
        }
    }, [selectedCountry]);

    useEffect(() => {
        if (mode === STEPS.OTP && resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [mode, resendTimer]);

    if (!isOpen) return null;

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', {
                email, password, recaptchaToken
            });

            if (data.requiresOTP) {
                setMode(STEPS.OTP);
                setResendTimer(30);
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            onClose();
            const userRole = data.role || (data.roles && data.roles[0]) || 'buyer';
            if (userRole === 'admin') window.location.href = '/admin/dashboard';
            else if (userRole === 'supplier') window.location.href = '/supplier/dashboard';
            else window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) return setError('Email is required');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setResendTimer(30);
            setMode(STEPS.RESET_PASSWORD);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length < 6) return setError('All six digits required.');
        if (!password) return setError('Please set a new password');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp: code, newPassword: password });
            setMode(STEPS.LOGIN);
            setError('');
            // Optional: Show success message
            alert('Password reset successful. Please login with your new password.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailContinue = async (e?: any) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        if (!email) return setError('Email is required');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email, role, recaptchaToken });
            setResendTimer(30);
            setMode(STEPS.OTP);
        } catch (err: any) {
            // Check if user exists but has password (redirect to login)
            if (err.response?.status === 409) {
                setError('Account already exists. Please login with your password.');
                setMode(STEPS.LOGIN);
            } else {
                setError(err.response?.data?.message || 'Failed to send OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const handleOtpContinue = async () => {
        setError('');
        const code = otp.join('');
        if (code.length < 6) return setError('All six digits required.');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp: code });
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
            }

            if (data.first_name) {
                onClose();
                const userRole = data.role || (data.roles && data.roles[0]) || 'buyer';
                if (userRole === 'admin') window.location.href = '/admin/dashboard';
                else if (userRole === 'supplier') window.location.href = '/supplier/dashboard';
                else window.location.reload();
            } else {
                setMode(STEPS.ROLE);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (mode === STEPS.OTP) setMode(STEPS.AUTH_START);
        else if (mode === STEPS.ROLE) setMode(STEPS.OTP);
        else if (mode === STEPS.SETUP) setMode(STEPS.ROLE);
        else if (mode === STEPS.BUSINESS) setMode(STEPS.SETUP);
        else if (mode === STEPS.LOGIN) setMode(STEPS.AUTH_START);
        else if (mode === STEPS.FORGOT_PASSWORD) setMode(STEPS.LOGIN);
        else if (mode === STEPS.RESET_PASSWORD) setMode(STEPS.FORGOT_PASSWORD);
    };

    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!firstName.trim()) return setError('First name is required');
        if (!lastName.trim()) return setError('Last name is required');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        if (!phoneNumber.trim()) return setError('Phone number is required');
        if (!/^\d{7,15}$/.test(phoneNumber.replace(/\s+/g, ''))) return setError('Invalid phone number format');
        if (!stateProvince.trim()) return setError('State/Province is required');
        if (role === 'supplier' && !companyName.trim()) return setError('Company name is required');

        if (!agreed) return setError('Please agree to terms.');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', {
                email, password, first_name: firstName, last_name: lastName,
                phone_number: phoneNumber, role, company_name: companyName,
                country_code: selectedCountry, state: stateProvince, recaptchaToken
            });
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('token', data.token);
            if (role === 'supplier') setMode(STEPS.BUSINESS);
            else {
                onClose();
                if (data.role === 'admin') window.location.href = '/admin/dashboard';
                else window.location.reload();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to complete registration');
        } finally {
            setLoading(false);
        }
    };

    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/auth/update-profile', { business_type: businessType, state: stateProvince });
            onClose();
            window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save business info');
        } finally {
            setLoading(false);
        }
    };

    const renderSocialButtons = () => {
        if (!socialConfig.google && !socialConfig.facebook && !socialConfig.linkedin) return null;
        return (
            <>
                <div className="social-btns-group">
                    {socialConfig.google && (
                        <button className="social-btn premium-social" onClick={() => handleSocialLogin('google')}>
                            <svg viewBox="0 0 24 24" className="social-icon" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    )}
                    {socialConfig.facebook && (
                        <button className="social-btn premium-social" onClick={() => handleSocialLogin('facebook')}>
                            <svg viewBox="0 0 24 24" className="social-icon" width="20" height="20" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Continue with Facebook
                        </button>
                    )}
                    {socialConfig.linkedin && (
                        <button className="social-btn premium-social" onClick={() => handleSocialLogin('linkedin')}>
                            <svg viewBox="0 0 24 24" className="social-icon" width="20" height="20" fill="#0077B5">
                                <path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9H7.12v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zM20.45 20.45h-3.56v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" />
                            </svg>
                            Continue with LinkedIn
                        </button>
                    )}
                </div>
                <div className="divider"><span>OR</span></div>
            </>
        );
    };

    const isRegisterFlow = mode === STEPS.AUTH_START || mode === STEPS.OTP || mode === STEPS.SETUP || mode === STEPS.ROLE || mode === STEPS.BUSINESS;

    const renderProgressSteps = () => {
        if (isFullPage) return null;
        let currentStep = 1;
        if (mode === STEPS.OTP) currentStep = 2;
        if (mode === STEPS.SETUP || mode === STEPS.ROLE || mode === STEPS.BUSINESS) currentStep = 3;

        return (
            <div className="auth-progress-steps">
                <div className={`auth-progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Email</span>
                </div>
                <div className="step-line" />
                <div className={`auth-progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">Mobile</span>
                </div>
                <div className="step-line" />
                <div className={`auth-progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                    <span className="step-number">3</span>
                    <span className="step-label">Profile</span>
                </div>
            </div>
        );
    };

    const innerContent = (
        <div className={isFullPage ? "auth-split-page" : "auth-modal-content auth-popup-card"} onClick={e => e.stopPropagation()}>
            {/* Left Side: Illustration Banner for Popup OR Split Page Banner for Fullpage */}
            {!isFullPage ? (
                <div className="auth-popup-left-pane">
                    <div className="auth-popup-brand-row">
                        <span className="auth-popup-brand-name">{siteName}</span>
                    </div>
                    <div className="auth-popup-banner-text">
                        <h3>Welcome back!</h3>
                        <p>Sign in to continue and discover amazing deals ❤️</p>
                    </div>
                    <div className="auth-popup-illustration-container">
                        <img src="/images/auth_illustration.png" alt="Welcome back illustration" className="auth-popup-illustration-img" />
                    </div>
                    <div className="auth-popup-safe-card">
                        <div className="auth-popup-safe-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div className="auth-popup-safe-text">
                            <h4>Your data is safe with us</h4>
                            <p>We use advanced security to protect your information.</p>
                        </div>
                    </div>
                </div>
            ) : (
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
                            <span className="auth-split-brand-name">{siteName}</span>
                        </div>
                        <div className="auth-split-caption">
                            {bannerText.split('\n').map((line, i) => (
                                <p key={i} style={{ margin: '4px 0', fontWeight: i === 0 ? 700 : 400 }}>{line}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Right Side: Exact Split Page Form Container */}
            <div className="auth-split-right">
                <div className="auth-split-form-box" style={{ width: '100%', position: 'relative' }}>
                    {/* Close button */}
                    {!isFullPage && (
                        <button className="auth-modal-close-v2" onClick={onClose} type="button" style={{ top: '-10px', right: '-10px' }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}

                    {/* Back button */}
                    {mode !== STEPS.AUTH_START && mode !== STEPS.LOGIN && (
                        <button className="auth-modal-back-v2" onClick={handleBack} type="button" style={{ top: '-10px', left: isFullPage ? '-25px' : '-10px' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                    )}

                    {mode === STEPS.AUTH_START && (
                        <>
                            {!isFullPage && renderProgressSteps()}
                            <h2 className="register-title-v2">{isFullPage ? "Sign in or create account" : "Create your account"}</h2>
                            <p className="auth-protected-subtitle">{isFullPage ? "✔ Your information is protected" : "Join B2C and start shopping today"}</p>
                            {renderSocialButtons()}
                            <form onSubmit={handleEmailContinue}>
                                {!isFullPage ? (
                                    <div className="auth-field-group">
                                        <label className="auth-input-label">Email address</label>
                                        <div className="auth-input-wrapper">
                                            <span className="auth-input-icon">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                            </span>
                                            <input type="email" className="auth-standard-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="float-input-wrap auth-input-container">
                                        <input type="email" className="float-input" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                                        <label className="float-label">Enter your email address</label>
                                    </div>
                                )}
                                {siteSettings?.enable_recaptcha && siteSettings?.recaptcha_site_key && (
                                    <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                                        <ReCAPTCHA
                                            sitekey={siteSettings.recaptcha_site_key}
                                            onChange={(token) => setRecaptchaToken(token || '')}
                                        />
                                    </div>
                                )}
                                {error && <p className="reg-error">{error}</p>}
                                <button type="submit" className="reg-btn-primary-v2" disabled={loading}>{loading ? 'Checking...' : 'Continue'}</button>
                            </form>
                            {!isFullPage && (
                                <div className="auth-popup-footer">
                                    <p>Already have an account? <button type="button" className="auth-footer-link-btn" onClick={() => { setMode(STEPS.LOGIN); setError(''); }}>Sign in</button></p>
                                    <p>Registering as a seller? <a href="/become-supplier/register" className="auth-footer-link-btn">Seller Registration</a></p>
                                </div>
                            )}
                        </>
                    )}

                    {mode === STEPS.LOGIN && (
                        <>
                            <h2 className="register-title-v2">{isFullPage ? "Sign in" : "Welcome back"}</h2>
                            <p className="auth-protected-subtitle">{isFullPage ? "✔ Your information is protected" : "Sign in to your account to continue"}</p>
                            {renderSocialButtons()}
                            <form onSubmit={handleLogin}>
                                {!isFullPage ? (
                                    <>
                                        <div className="auth-field-group">
                                            <label className="auth-input-label">Email address</label>
                                            <div className="auth-input-wrapper">
                                                <span className="auth-input-icon">
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                                </span>
                                                <input type="email" className="auth-standard-input" placeholder="buyer@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username email" />
                                            </div>
                                        </div>
                                        <div className="auth-field-group mt-3">
                                            <div className="auth-label-row">
                                                <label className="auth-input-label">Password</label>
                                                <button type="button" className="reg-link-btn forgot-pw-link" onClick={() => setMode(STEPS.FORGOT_PASSWORD)}>Forgot password?</button>
                                            </div>
                                            <div className="auth-input-wrapper">
                                                <span className="auth-input-icon">
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                                </span>
                                                <input type={showPassword ? 'text' : 'password'} className="auth-standard-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                                                <button type="button" className="toggle-pw-v2" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="float-input-wrap auth-input-container">
                                            <input type="email" className="float-input" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username email" />
                                            <label className="float-label">Enter your email</label>
                                        </div>
                                        <div className="float-input-wrap mt-1 auth-input-container">
                                            <input type={showPassword ? 'text' : 'password'} className="float-input" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                                            <label className="float-label">Enter your password</label>
                                            <button type="button" className="toggle-pw-v2" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                        </div>
                                        <div className="d-flex justify-end mt-1">
                                            <button type="button" className="reg-link-btn" style={{ fontSize: '13px', color: '#ff6600', fontWeight: 600 }} onClick={() => setMode(STEPS.FORGOT_PASSWORD)}>Forgot password?</button>
                                        </div>
                                    </>
                                )}
                                {siteSettings?.enable_recaptcha && siteSettings?.recaptcha_site_key && (
                                    <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                                        <ReCAPTCHA
                                            sitekey={siteSettings.recaptcha_site_key}
                                            onChange={(token) => setRecaptchaToken(token || '')}
                                        />
                                    </div>
                                )}
                                {error && <p className="reg-error">{error}</p>}
                                <button type="submit" className="reg-btn-primary-v2" disabled={loading}>Sign In</button>
                            </form>
                            {!isFullPage ? (
                                <div className="auth-popup-footer">
                                    <p>New to B2C? <button type="button" className="auth-footer-link-btn" onClick={() => { setMode(STEPS.AUTH_START); setError(''); }}>Create account</button></p>
                                    <p>Are you a seller? <a href="/become-supplier/login" className="auth-footer-link-btn">Seller Sign In</a></p>
                                </div>
                            ) : (
                                <p className="reg-footer-text-v2">
                                    New user? <button type="button" className="reg-link-btn font-bold" style={{ color: '#ff6600' }} onClick={() => { setMode(STEPS.AUTH_START); setError(''); }}>Register &gt;</button>
                                </p>
                            )}
                        </>
                    )}

                    {mode === STEPS.OTP && (
                        <>
                            <div className="otp-header">
                                <h2 className="register-title-v2">Check your email</h2>
                                <p className="otp-sub">We sent a 6-digit code to<br /><strong>{email}</strong></p>
                            </div>
                            <div className="otp-boxes-v2">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`otp-box-v2 ${d ? 'filled' : ''}`}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                    />
                                ))}
                            </div>
                            {error && <p className="reg-error">{error}</p>}
                            <button className="reg-btn-primary-v2" onClick={handleOtpContinue} disabled={loading}>Verify & Continue</button>
                            <p className="otp-resend-row">
                                Didn't receive the code?{' '}
                                {resendTimer > 0 ? <span className="otp-timer">Resend in {resendTimer}s</span> :
                                    <button className="reg-link-btn" onClick={() => handleEmailContinue()}>Resend code</button>}
                            </p>
                        </>
                    )}

                    {mode === STEPS.ROLE && (
                        <>
                            <h2 className="register-title-v2">Select account type</h2>
                            <div className="role-options">
                                <label className={`role-card-v2 ${role === 'buyer' ? 'selected' : ''}`} onClick={() => setRole('buyer')}>
                                    <strong>Buyer</strong>
                                    <p>Source from global suppliers</p>
                                </label>
                                <label className={`role-card-v2 ${role === 'supplier' ? 'selected' : ''}`} onClick={() => setRole('supplier')}>
                                    <strong>Supplier</strong>
                                    <p>Sell to global buyers</p>
                                </label>
                            </div>
                            <button className="reg-btn-primary-v2" onClick={() => setMode(STEPS.SETUP)}>Continue</button>
                        </>
                    )}

                    {mode === STEPS.SETUP && (
                        <>
                            <h2 className="register-title-v2">Create account</h2>
                            <form onSubmit={handleSetupSubmit}>
                                <div className="name-row">
                                    <div className="float-input-wrap">
                                        <input type="text" className="float-input" placeholder=" " value={firstName} onChange={e => setFirstName(e.target.value)} required autoComplete="off" />
                                        <label className="float-label">First name <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                    <div className="float-input-wrap">
                                        <input type="text" className="float-input" placeholder=" " value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="off" />
                                        <label className="float-label">Last name <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                </div>
                                {role === 'supplier' && (
                                    <div className="float-input-wrap mt-1">
                                        <input type="text" className="float-input" placeholder=" " value={companyName} onChange={e => setCompanyName(e.target.value)} required autoComplete="off" />
                                        <label className="float-label">Company name <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                )}
                                <div className="float-input-wrap mt-1">
                                    <input type={showPassword ? 'text' : 'password'} className="float-input" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                                    <label className="float-label">Set password <span style={{ color: '#ef4444' }}>*</span></label>
                                    <button type="button" className="toggle-pw-v2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                                </div>
                                <div className="phone-row mt-1">
                                    <div className="float-input-wrap" style={{ width: '100px', marginBottom: 0 }}>
                                        <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="float-select">
                                            {countries.map(c => <option key={c._id} value={c.code}>{c.flag} {c.dial_code}</option>)}
                                        </select>
                                    </div>
                                    <div className="float-input-wrap flex-1 no-margin">
                                        <input type="tel" className="float-input" placeholder=" " value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required autoComplete="off" />
                                        <label className="float-label">Phone number <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                </div>
                                <div className="float-input-wrap mt-1 custom-select-v2">
                                    {states.length > 0 ? (
                                        <>
                                            <Select
                                                value={states.find(s => s.name === stateProvince) ? { value: stateProvince, label: stateProvince } : null}
                                                onChange={(opt: any) => setStateProvince(opt ? opt.value : '')}
                                                options={Array.from(new Set(states.map(s => s.name))).sort().map(name => ({ value: name, label: name }))}
                                                placeholder=" "
                                                isSearchable={true}
                                                className="react-select-container"
                                                classNamePrefix="react-select"
                                                required
                                                styles={{
                                                    control: (base, state) => ({
                                                        ...base,
                                                        minHeight: '48px',
                                                        paddingTop: '10px',
                                                        background: '#fff',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '8px',
                                                        boxShadow: 'none',
                                                        '&:hover': { borderColor: '#111' },
                                                        borderColor: state.isFocused ? '#111' : '#ddd'
                                                    }),
                                                    placeholder: (base) => ({ ...base, display: 'none' }),
                                                    input: (base) => ({ ...base, color: '#111', fontSize: '0.95rem', margin: 0, padding: 0 }),
                                                    singleValue: (base) => ({ ...base, color: '#111', fontSize: '0.95rem' }),
                                                    valueContainer: (base) => ({ ...base, padding: '0 1rem' }),
                                                    menu: (base) => ({ ...base, zIndex: 9999 })
                                                }}
                                            />
                                            <label className={`float-label ${stateProvince ? 'float-label-active' : ''}`} style={{ zIndex: 10 }}>State/Province <span style={{ color: '#ef4444' }}>*</span></label>
                                        </>
                                    ) : (
                                        <>
                                            <input type="text" className="float-input" placeholder=" " value={stateProvince} onChange={e => setStateProvince(e.target.value)} required autoComplete="off" />
                                            <label className="float-label">State/Province <span style={{ color: '#ef4444' }}>*</span></label>
                                        </>
                                    )}
                                </div>
                                <label className="terms-row">
                                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
                                    <span>Agree to <a href="#">Terms</a> and <a href="#">Privacy Policy</a> <span style={{ color: '#ef4444' }}>*</span></span>
                                </label>
                                {siteSettings?.enable_recaptcha && siteSettings?.recaptcha_site_key && (
                                    <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                                        <ReCAPTCHA
                                            sitekey={siteSettings.recaptcha_site_key}
                                            onChange={(token) => setRecaptchaToken(token || '')}
                                        />
                                    </div>
                                )}
                                {error && <p className="reg-error">{error}</p>}
                                <button type="submit" className="reg-btn-primary-v2" disabled={loading}>Create account</button>
                            </form>
                        </>
                    )}

                    {mode === STEPS.BUSINESS && (
                        <>
                            <h2 className="register-title-v2">Business Details</h2>
                            <form onSubmit={handleBusinessSubmit}>
                                <div className="business-type-options">
                                    {businessTypes.map(type => (
                                        <label key={type._id} className={`business-type-card ${businessType.includes(type.name) ? 'checked' : ''}`}>
                                            <input type="checkbox" checked={businessType.includes(type.name)} onChange={e => e.target.checked ? setBusinessType([...businessType, type.name]) : setBusinessType(businessType.filter(i => i !== type.name))} />
                                            <span>{type.name}</span>
                                        </label>
                                    ))}
                                </div>
                                {/* State/Province moved to SETUP step */}
                                {error && <p className="reg-error">{error}</p>}
                                <button type="submit" className="reg-btn-primary-v2" disabled={loading}>Submit</button>
                            </form>
                        </>
                    )}
                    {mode === STEPS.FORGOT_PASSWORD && (
                        <>
                            <h2 className="register-title-v2">Forgot password?</h2>
                            <p className="otp-sub">Enter your email and we'll send you a code to reset your password.</p>
                            <form onSubmit={handleForgotPassword}>
                                <div className="float-input-wrap">
                                    <input type="email" className="float-input" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} required />
                                    <label className="float-label">Email address</label>
                                </div>
                                {error && <p className="reg-error">{error}</p>}
                                <button type="submit" className="reg-btn-primary-v2" disabled={loading}>{loading ? 'Sending...' : 'Send reset code'}</button>
                            </form>
                        </>
                    )}

                    {mode === STEPS.RESET_PASSWORD && (
                        <>
                            <div className="otp-header">
                                <h2 className="register-title-v2">Reset password</h2>
                                <p className="otp-sub">Enter the 6-digit code sent to<br /><strong>{email}</strong></p>
                            </div>
                            <div className="otp-boxes-v2">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`otp-box-v2 ${d ? 'filled' : ''}`}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                    />
                                ))}
                            </div>
                            <div className="float-input-wrap mt-2">
                                <input type={showPassword ? 'text' : 'password'} className="float-input" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                                <label className="float-label">New password</label>
                                <button type="button" className="toggle-pw-v2" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {error && <p className="reg-error">{error}</p>}
                            <button className="reg-btn-primary-v2" onClick={handleResetPassword} disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
                            <p className="otp-resend-row">
                                Didn't receive the code?{' '}
                                {resendTimer > 0 ? <span className="otp-timer">Resend in {resendTimer}s</span> :
                                    <button className="reg-link-btn" onClick={() => handleForgotPassword({ preventDefault: () => { } } as any)}>Resend code</button>}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    if (isFullPage) {
        return (
            <div className="auth-full-page">
                {innerContent}
            </div>
        );
    }

    return (
        <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {innerContent}
        </div>
    );
};

export default AuthModal;
