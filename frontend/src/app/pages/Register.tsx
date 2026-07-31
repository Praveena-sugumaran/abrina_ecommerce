'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import Select from 'react-select';
import { getImgUrl } from '@/utils/imageConfig';

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);

const STEPS = { EMAIL: 'email', OTP: 'otp', PHONE: 'phone', MOBILE_OTP: 'mobile_otp', SETUP: 'setup', DONE: 'done' };

const Register = () => {
    const { siteSettings, login, user, isInitialized } = useAuth();
    const navigate = useRouter();

    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('IN');
    const [stateProvince, setStateProvince] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(30);
    const [mobileOtp, setMobileOtp] = useState(['', '', '', '', '', '']);
    const [resendMobileTimer, setResendMobileTimer] = useState(30);
    const [simulatedMobileOtp, setSimulatedMobileOtp] = useState('');
    const [socialConfig, setSocialConfig] = useState({ google: false, facebook: false, linkedin: false });
    const [socialUrls, setSocialUrls] = useState<any>({});
    const [referralCode, setReferralCode] = useState('');

    const bannerSrc = siteSettings?.customer_register_banner
        ? getImgUrl(siteSettings.customer_register_banner)
        : '/images/customer-auth-banner-1.png';

    const bannerText = siteSettings?.customer_register_text || 'Join millions of shoppers worldwide';

    useEffect(() => {
        if (user) navigate.replace('/');
    }, [user, navigate]);

    useEffect(() => {
        api.get('/auth/countries').then(({ data }) => { setCountries(data); }).catch(() => { });
        api.get('/social-login/public').then(({ data }) => setSocialConfig(data)).catch(() => { });
        api.get('/auth/social-urls').then(({ data }) => setSocialUrls(data)).catch(() => { });

        const storedRef = localStorage.getItem('affiliate_referral');
        if (storedRef) {
            setReferralCode(storedRef);
        }
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            api.get(`/auth/states/${selectedCountry}`).then(({ data }) => { setStates(data); setStateProvince(''); }).catch(() => setStates([]));
        }
    }, [selectedCountry]);

    useEffect(() => {
        if (step === STEPS.OTP && resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [step, resendTimer]);

    useEffect(() => {
        if (step === STEPS.MOBILE_OTP && resendMobileTimer > 0) {
            const t = setTimeout(() => setResendMobileTimer(r => r - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [step, resendMobileTimer]);

    const handleSocialLogin = (provider: string) => {
        const url = socialUrls[provider];
        if (!url) { alert(`${provider} Login is not configured.`); return; }
        window.location.href = url;
    };

    const handleSendOtp = async (e?: any) => {
        if (e?.preventDefault) e.preventDefault();
        setError('');
        if (!email) return setError('Email is required');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email, role: 'buyer' });
            setResendTimer(30);
            setStep(STEPS.OTP);
        } catch (err: any) {
            if (err.response?.status === 409) {
                setError('Account already exists. Please sign in.');
            } else {
                setError(err.response?.data?.message || 'Failed to send OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        if (value && index < 5) document.getElementById(`reg-otp-${index + 1}`)?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`reg-otp-${index - 1}`)?.focus();
    };

    const handleMobileOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...mobileOtp];
        next[index] = value.slice(-1);
        setMobileOtp(next);
        if (value && index < 5) document.getElementById(`reg-m-otp-${index + 1}`)?.focus();
    };

    const handleMobileOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !mobileOtp[index] && index > 0) document.getElementById(`reg-m-otp-${index - 1}`)?.focus();
    };

    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) return setError('Enter all 6 digits');
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp: code });
            if (data.first_name) {
                // Existing user - redirect to login
                navigate.push('/login');
            } else {
                setStep(STEPS.PHONE);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMobileOtp = async () => {
        setError('');
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryDialCode}${phoneNumber}`;
            const { data } = await api.post('/auth/register/send-mobile-otp', {
                phone_number: fullPhone,
                country_code: selectedCountry
            });
            setSimulatedMobileOtp(data.otp || '');
            if (data.otp) {
                console.log('Simulated SMS OTP Code:', data.otp);
            }
            setResendMobileTimer(30);
            setStep(STEPS.MOBILE_OTP);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send mobile OTP');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!phoneNumber.trim()) return setError('Phone number is required');
        if (siteSettings?.enable_mobile_verification) {
            await handleSendMobileOtp();
        } else {
            setStep(STEPS.SETUP);
        }
    };

    const handleVerifyMobileOtp = async () => {
        const code = mobileOtp.join('');
        if (code.length < 6) return setError('Enter all 6 digits');
        setError('');
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryDialCode}${phoneNumber}`;
            await api.post('/auth/register/verify-mobile-otp', {
                phone_number: fullPhone,
                otp: code
            });
            setStep(STEPS.SETUP);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid mobile OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!firstName.trim()) return setError('First name is required');
        if (!lastName.trim()) return setError('Last name is required');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        if (!stateProvince) return setError('State/Province is required');
        if (!agreed) return setError('Please agree to terms');

        await executeRegistration();
    };

    const executeRegistration = async () => {
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryDialCode}${phoneNumber}`;
            const { data } = await api.post('/auth/register', {
                email, password,
                first_name: firstName, last_name: lastName,
                phone_number: fullPhone, role: 'buyer',
                country_code: selectedCountry, state: stateProvince,
                referral_code: referralCode || undefined
            });
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('token', data.token);
            localStorage.removeItem('affiliate_referral');
            login(data);
            window.location.href = '/';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const siteNameRaw = siteSettings?.site_name || 'B2C Platform';
    const siteName = siteNameRaw.toUpperCase() === 'B2B' ? 'B2C' : siteNameRaw;

    const stepLabels = ['Email', 'Mobile', 'Profile'];

    const stepIndexMap: Record<string, number> = {
        [STEPS.EMAIL]: 0,
        [STEPS.OTP]: 0,
        [STEPS.PHONE]: 1,
        [STEPS.MOBILE_OTP]: 1,
        [STEPS.SETUP]: 2,
        [STEPS.DONE]: 2
    };

    const stepIndex = stepIndexMap[step] ?? 0;

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

                    {/* Step indicator */}
                    <div className="auth-steps">
                        {stepLabels.map((label, i) => (
                            <React.Fragment key={label}>
                                <div className={`auth-step ${i <= stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}>
                                    <div className="auth-step-circle">
                                        {i < stepIndex ? (
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        ) : (i + 1)}
                                    </div>
                                    <span className="auth-step-label">{label}</span>
                                </div>
                                {i < stepLabels.length - 1 && <div className={`auth-step-line ${i < stepIndex ? 'done' : ''}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* STEP 1: Email */}
                    {step === STEPS.EMAIL && (
                        <>
                            <h1 className="auth-split-title">Create your account</h1>
                            <p className="auth-split-subtitle">Join {siteName} and start shopping today</p>

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
                                    <div className="auth-split-or"><span>or</span></div>
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Email address</label>
                                    <input id="reg-email" type="email" className="auth-field-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
                                    {loading ? 'Sending code...' : 'Continue'}
                                </button>
                            </form>
                            <p className="auth-split-footer-text">
                                Already have an account? <Link href="/login" className="auth-link-primary">Sign in</Link>
                            </p>
                            <p className="auth-split-footer-text" style={{ marginTop: '8px' }}>
                                Registering as a seller? <Link href="/become-supplier/register" className="auth-link-primary">Seller Registration</Link>
                            </p>
                        </>
                    )}

                    {/* STEP 2: OTP Verify */}
                    {step === STEPS.OTP && (
                        <>
                            <h1 className="auth-split-title">Check your email</h1>
                            <p className="auth-split-subtitle">
                                We sent a 6-digit code to <strong>{email}</strong>
                                <button
                                    type="button"
                                    onClick={() => { setStep(STEPS.EMAIL); setError(''); setOtp(['', '', '', '', '', '']); }}
                                    className="auth-edit-email-btn"
                                    title="Edit Email"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary-color, #ff6600)',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        marginLeft: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        verticalAlign: 'middle'
                                    }}
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </p>
                            <div className="auth-otp-row">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        id={`reg-otp-${i}`}
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
                            {error && <div className="auth-error-msg">{error}</div>}
                            <button className="auth-split-submit-btn" onClick={handleVerifyOtp} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify & Continue'}
                            </button>
                            <p className="auth-resend-row">
                                Didn't receive the code?{' '}
                                {resendTimer > 0
                                    ? <span className="auth-timer">Resend in {resendTimer}s</span>
                                    : <button type="button" className="auth-link-btn" onClick={handleSendOtp}>Resend code</button>
                                }
                            </p>
                        </>
                    )}

                    {/* STEP 3: Profile setup */}
                    {step === STEPS.SETUP && (
                        <>
                            <h1 className="auth-split-title">Complete your profile</h1>
                            <p className="auth-split-subtitle">Just a few more details to get started</p>
                            <form onSubmit={handleRegister} className="auth-split-form">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label">First name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="auth-field-input" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                    </div>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label">Last name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="auth-field-input" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div className="auth-field-password-wrap">
                                        <input type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-field-group">
                                    <label className="auth-field-label">State/Province <span style={{ color: '#ef4444' }}>*</span></label>
                                    {states.length > 0 ? (
                                        <Select
                                            value={stateProvince ? { value: stateProvince, label: stateProvince } : null}
                                            onChange={(opt: any) => setStateProvince(opt ? opt.value : '')}
                                            options={Array.from(new Set(states.map((s: any) => s.name))).sort().map(name => ({ value: name, label: name }))}
                                            placeholder="Select state..."
                                            isSearchable
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                            styles={{
                                                control: (base) => ({ ...base, minHeight: '44px', borderColor: '#ddd', borderRadius: '8px', boxShadow: 'none', '&:hover': { borderColor: '#111' } }),
                                                menu: (base) => ({ ...base, zIndex: 9999 })
                                            }}
                                        />
                                    ) : (
                                        <input type="text" className="auth-field-input" placeholder="State/Province" value={stateProvince} onChange={e => setStateProvince(e.target.value)} required />
                                    )}
                                </div>
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Referral Code (Optional)</label>
                                    <input type="text" className="auth-field-input" placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value)} />
                                </div>
                                <label className="auth-terms-row">
                                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
                                    <span>I agree to the <a href="#" className="auth-link-primary">Terms of Service</a> and <a href="#" className="auth-link-primary">Privacy Policy</a></span>
                                </label>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP: Phone Input */}
                    {step === STEPS.PHONE && (
                        <>
                            <h1 className="auth-split-title">Verify your phone</h1>
                            <p className="auth-split-subtitle">Please enter your phone number to continue</p>
                            <form onSubmit={handlePhoneSubmit} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label">Phone <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                                        <select className="auth-field-input" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{ padding: '10px 8px' }}>
                                            {countries.map(c => <option key={c._id} value={c.code}>{c.flag} {c.dial_code}</option>)}
                                        </select>
                                        <input type="tel" className="auth-field-input" placeholder="Phone number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn" disabled={loading}>
                                    {loading ? 'Processing...' : (siteSettings?.enable_mobile_verification ? 'Send OTP' : 'Continue')}
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP 4: Mobile OTP Verify */}
                    {step === STEPS.MOBILE_OTP && (
                        <>
                            <h1 className="auth-split-title">Verify your mobile</h1>
                            <p className="auth-split-subtitle">
                                We sent a 6-digit code to <strong>{phoneNumber}</strong>
                                <button
                                    type="button"
                                    onClick={() => { setStep(STEPS.PHONE); setError(''); setMobileOtp(['', '', '', '', '', '']); }}
                                    className="auth-edit-email-btn"
                                    title="Change Phone Number"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary-color, #ff6600)',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        marginLeft: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        verticalAlign: 'middle'
                                    }}
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </p>
                            <div className="auth-otp-row">
                                {mobileOtp.map((d, i) => (
                                    <input
                                        key={i}
                                        id={`reg-m-otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`auth-otp-box ${d ? 'filled' : ''}`}
                                        value={d}
                                        onChange={e => handleMobileOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleMobileOtpKeyDown(i, e)}
                                    />
                                ))}
                            </div>
                            {/* Simulated OTP is logged to console for security */}
                            {error && <div className="auth-error-msg">{error}</div>}
                            <button className="auth-split-submit-btn" onClick={handleVerifyMobileOtp} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify & Complete'}
                            </button>
                            <p className="auth-resend-row">
                                Didn't receive the code?{' '}
                                {resendMobileTimer > 0
                                    ? <span className="auth-timer">Resend in {resendMobileTimer}s</span>
                                    : <button type="button" className="auth-link-btn" onClick={handleSendMobileOtp}>Resend code</button>
                                }
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
