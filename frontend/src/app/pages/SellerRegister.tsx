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

const STEPS = {
    EMAIL: 'email',       // Enter email & send OTP
    OTP: 'otp',           // Verify email OTP
    PHONE: 'phone',       // Enter phone number
    MOBILE_OTP: 'mobile_otp', // Verify mobile number OTP
    PROFILE: 'profile',   // Enter name, password
    COMPANY: 'company',   // Enter company details & uploads
    TERMS: 'terms',       // Agree to terms
    SUCCESS: 'success',   // Account created, redirect
};

const SellerRegister = () => {
    const { siteSettings, login, user } = useAuth();
    const navigate = useRouter();

    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [businessType, setBusinessType] = useState('Manufacturer');
    const [companyAddress, setCompanyAddress] = useState('');
    const [zipCode, setZipCode] = useState('');
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
    const [referralCode, setReferralCode] = useState('');

    // New Company Fields
    const [companyEmail, setCompanyEmail] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');
    const [certificateName, setCertificateName] = useState('');

    useEffect(() => {
        if (user) {
            const roles = user.roles || (user.role ? [user.role] : []);
            navigate.replace(roles.includes('seller') || roles.includes('supplier') ? '/supplier/dashboard' : '/');
        }
    }, [user, navigate]);

    useEffect(() => {
        api.get('/auth/countries').then(({ data }) => setCountries(data)).catch(() => { });
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

    const handleSendOtp = async (e?: any) => {
        if (e?.preventDefault) e.preventDefault();
        setError('');
        if (!email) return setError('Email is required');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email, role: 'seller' });
            setResendTimer(30);
            setStep(STEPS.OTP);
        } catch (err: any) {
            if (err.response?.status === 409) {
                setError('Account already exists. Please sign in at Seller Login.');
            } else {
                setError(err.response?.data?.message || 'Failed to send verification code');
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
        if (value && index < 5) document.getElementById(`sreg-otp-${index + 1}`)?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`sreg-otp-${index - 1}`)?.focus();
    };

    const handleMobileOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...mobileOtp];
        next[index] = value.slice(-1);
        setMobileOtp(next);
        if (value && index < 5) document.getElementById(`sreg-m-otp-${index + 1}`)?.focus();
    };

    const handleMobileOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !mobileOtp[index] && index > 0) document.getElementById(`sreg-m-otp-${index - 1}`)?.focus();
    };

    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) return setError('Enter all 6 digits');
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp: code });
            if (data.first_name) {
                navigate.push('/become-supplier/login');
            } else {
                setStep(STEPS.PHONE);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!firstName.trim()) return setError('First name is required');
        if (!lastName.trim()) return setError('Last name is required');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        setStep(STEPS.COMPANY);
    };

    const handleCompanyNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!companyName.trim()) return setError('Company/Store name is required');
        if (!companyAddress.trim()) return setError('Company address is required');
        if (!zipCode.trim()) return setError('Postal / Zip Code is required');
        if (!stateProvince) return setError('State/Province is required');
        if (!companyPhone.trim()) return setError('Company phone number is required');
        if (!companyEmail.trim()) return setError('Company email is required');
        setStep(STEPS.TERMS);
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string || '');
            reader.readAsDataURL(file);
        }
    };

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setBannerPreview(ev.target?.result as string || '');
            reader.readAsDataURL(file);
        }
    };

    const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCertificateFile(file);
            setCertificateName(file.name);
        }
    };

    const handleSendMobileOtp = async () => {
        setError('');
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = companyPhone.startsWith('+') ? companyPhone : `${countryDialCode}${companyPhone}`;
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
        if (!companyPhone.trim()) return setError('Company phone number is required');
        if (siteSettings?.enable_mobile_verification) {
            await handleSendMobileOtp();
        } else {
            setStep(STEPS.PROFILE);
        }
    };

    const handleVerifyMobileOtp = async () => {
        const code = mobileOtp.join('');
        if (code.length < 6) return setError('Enter all 6 digits');
        setError('');
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = companyPhone.startsWith('+') ? companyPhone : `${countryDialCode}${companyPhone}`;
            await api.post('/auth/register/verify-mobile-otp', {
                phone_number: fullPhone,
                otp: code
            });
            setStep(STEPS.PROFILE);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid mobile OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) return setError('Please agree to the terms to continue');
        setError('');
        await executeRegistration();
    };

    const executeRegistration = async () => {
        setLoading(true);
        try {
            const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '';
            const fullPhone = companyPhone.startsWith('+') ? companyPhone : `${countryDialCode}${companyPhone}`;
            // 1. Create the user
            const { data } = await api.post('/auth/register', {
                email, password,
                first_name: firstName, last_name: lastName,
                company_name: companyName,
                business_type: businessType,
                company_address: companyAddress,
                zip_code: zipCode,
                phone_number: fullPhone, role: 'seller',
                country_code: selectedCountry, state: stateProvince,
                referral_code: referralCode || undefined
            });
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('token', data.token);
            localStorage.removeItem('affiliate_referral');

            // Set Auth header dynamically for subsequent request
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

            // 2. Prepare and upsert Company Profile
            const fd = new FormData();
            fd.append('company_name', companyName);
            fd.append('business_type', businessType);

            const countryObj = countries.find(c => c.code === selectedCountry);
            const countryName = countryObj ? countryObj.name : '';
            fd.append('country', countryName);
            fd.append('state', stateProvince);
            fd.append('address', companyAddress);
            fd.append('zip_code', zipCode);
            fd.append('phone', fullPhone);
            fd.append('email', companyEmail);

            if (logoFile) fd.append('logo', logoFile);
            if (certificateFile) fd.append('document', certificateFile);
            if (bannerFile) fd.append('banner_image', bannerFile);

            await api.post('/company/profile', fd);

            login(data);
            setStep(STEPS.SUCCESS);
            setTimeout(() => { window.location.href = '/supplier/dashboard'; }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const bannerSrc = siteSettings?.seller_register_banner ? getImgUrl(siteSettings.seller_register_banner) : '/images/seller-auth-banner.png';
    const bannerText = siteSettings?.seller_register_text || 'Start Selling Today\n\nReach millions of buyers and grow your business globally!';
    const siteNameRaw = siteSettings?.site_name || 'B2C Platform';
    const siteName = siteNameRaw.toUpperCase() === 'B2B' ? 'B2C' : siteNameRaw;

    const stepLabels = ['Email', 'Mobile', 'Profile'];

    const stepIndexMap: Record<string, number> = {
        [STEPS.EMAIL]: 0,
        [STEPS.OTP]: 0,
        [STEPS.PHONE]: 1,
        [STEPS.MOBILE_OTP]: 1,
        [STEPS.PROFILE]: 2,
        [STEPS.COMPANY]: 2,
        [STEPS.TERMS]: 2,
        [STEPS.SUCCESS]: 2
    };
    const stepIndex = stepIndexMap[step] ?? 0;

    return (
        <div className="auth-split-page seller-auth-page">
            {/* Left: Registration Form */}
            <div className="auth-split-right seller-left-form" style={{ borderRight: '1px solid #f0f0f0', flex: '0 0 55%', maxWidth: '55%' }}>
                <div className="auth-split-form-box" style={{ maxWidth: '520px' }}>
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

                    {/* Step indicator */}
                    {step !== STEPS.SUCCESS && (
                        <div className="seller-steps-container" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '40px', marginTop: '24px' }}>
                            {/* Connecting Line background */}
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                left: '24px',
                                right: '24px',
                                height: '2px',
                                background: '#e2e8f0',
                                zIndex: 1
                            }}>
                                {/* Active progress bar */}
                                <div style={{
                                    height: '100%',
                                    width: `${(stepIndex / (stepLabels.length - 1)) * 100}%`,
                                    background: 'var(--primary-color)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>

                            {stepLabels.map((label, i) => (
                                <div
                                    key={label}
                                    style={{
                                        position: 'relative',
                                        zIndex: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flex: 1
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        border: `2px solid ${i <= stepIndex ? 'var(--primary-color)' : '#e2e8f0'}`,
                                        background: i <= stepIndex ? 'var(--primary-color)' : '#fff',
                                        color: i <= stepIndex ? '#fff' : '#94a3b8',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s ease',
                                        boxShadow: i === stepIndex ? '0 4px 12px rgba(var(--primary-color-rgb, 255, 102, 0), 0.2)' : 'none'
                                    }}>
                                        {i < stepIndex ? (
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        ) : (i + 1)}
                                    </div>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: i <= stepIndex ? 'var(--primary-color)' : '#94a3b8',
                                        transition: 'color 0.3s ease'
                                    }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* STEP 1: Email */}
                    {step === STEPS.EMAIL && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Create Your Seller Account</h1>
                            <p className="auth-split-subtitle">Enter your business email to begin your selling journey with us.</p>
                            <form onSubmit={handleSendOtp} className="auth-split-form">
                                <div className="auth-field-group" style={{ marginBottom: '20px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Business Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                            </svg>
                                        </span>
                                        <input
                                            id="sreg-email"
                                            type="email"
                                            className="auth-field-input"
                                            placeholder="seller@company.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            style={{ paddingLeft: '44px', height: '48px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button
                                    type="submit"
                                    id="sreg-send-code-btn"
                                    className="auth-split-submit-btn seller-submit-btn"
                                    disabled={loading}
                                    style={{
                                        height: '48px',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                    {loading ? 'Sending code...' : 'Send Verification Code'}
                                </button>
                            </form>
                            <div className="seller-auth-divider" style={{ margin: '24px 0', color: '#9ca3af', fontSize: '13px' }}>
                                <span>Already have a seller account?</span>
                            </div>
                            <Link
                                href="/become-supplier/login"
                                className="seller-register-link-btn"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--primary-color)',
                                    border: '2px solid var(--primary-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    height: '48px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Sign In as Seller
                            </Link>
                        </>
                    )}

                    {/* STEP 2: OTP Verify */}
                    {step === STEPS.OTP && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Verify Your Email</h1>
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
                                        id={`sreg-otp-${i}`}
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
                            <button id="sreg-verify-btn" className="auth-split-submit-btn seller-submit-btn" onClick={handleVerifyOtp} disabled={loading} style={{ height: '48px', borderRadius: '8px' }}>
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

                    {/* STEP: Phone Input */}
                    {step === STEPS.PHONE && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Verify Company Mobile</h1>
                            <p className="auth-split-subtitle">Please enter your company phone number to continue</p>
                            <form onSubmit={handlePhoneSubmit} className="auth-split-form">
                                <div className="auth-field-group" style={{ marginBottom: '20px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Phone <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                                        <select className="auth-field-input" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{ padding: '10px 8px', height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}>
                                            {countries.map(c => <option key={c._id} value={c.code}>{c.flag} {c.dial_code}</option>)}
                                        </select>
                                        <input
                                            type="tel"
                                            className="auth-field-input"
                                            placeholder="Company Phone"
                                            value={companyPhone}
                                            onChange={e => setCompanyPhone(e.target.value)}
                                            required
                                            style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" className="auth-split-submit-btn seller-submit-btn" disabled={loading} style={{ height: '48px', borderRadius: '8px' }}>
                                    {loading ? 'Processing...' : (siteSettings?.enable_mobile_verification ? 'Send OTP' : 'Continue')}
                                </button>
                                <button type="button" className="auth-link-btn" onClick={() => setStep(STEPS.OTP)} style={{ marginTop: '8px', display: 'block', width: '100%', textAlign: 'center' }}>
                                    ← Back
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP 3: Profile */}
                    {step === STEPS.PROFILE && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Personal Profile Details</h1>
                            <p className="auth-split-subtitle">Set up your personal seller account credentials</p>
                            <form onSubmit={handleProfileNext} className="auth-split-form">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>First name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="auth-field-input" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                    </div>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Last name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="auth-field-input" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                    </div>
                                </div>
                                <div className="auth-field-group" style={{ marginTop: '12px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div className="auth-field-password-wrap">
                                        <input type={showPassword ? 'text' : 'password'} className="auth-field-input" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px', paddingRight: '40px' }} />
                                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} style={{ background: 'none', border: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-field-group" style={{ marginTop: '12px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Referral Code (Optional)</label>
                                    <input type="text" className="auth-field-input" placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value)} style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                </div>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" id="sreg-profile-next-btn" className="auth-split-submit-btn seller-submit-btn" style={{ height: '48px', borderRadius: '8px', marginTop: '24px', fontWeight: 700, fontSize: '15px' }}>
                                    Continue to Store Details
                                </button>
                                <button type="button" className="auth-link-btn" onClick={() => setStep(STEPS.PHONE)} style={{ marginTop: '8px', display: 'block', width: '100%', textAlign: 'center' }}>
                                    ← Back
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP 4: Company Details */}
                    {step === STEPS.COMPANY && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Your Store Details</h1>
                            <p className="auth-split-subtitle">Tell us about your business and add branding assets</p>
                            <form onSubmit={handleCompanyNext} className="auth-split-form">
                                <div className="auth-field-group">
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company / Store name <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" className="auth-field-input" placeholder="Acme Trading Co." value={companyName} onChange={e => setCompanyName(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Business Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select className="auth-field-input" value={businessType} onChange={e => setBusinessType(e.target.value)} required style={{ padding: '10px 14px', height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}>
                                            <option value="Manufacturer">Manufacturer</option>
                                            <option value="Wholesaler">Wholesaler</option>
                                            <option value="Retailer">Retailer</option>
                                            <option value="Brand Owner">Brand Owner</option>
                                            <option value="Agent">Trading Agent</option>
                                        </select>
                                    </div>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Postal / Zip Code <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="auth-field-input" placeholder="100001" value={zipCode} onChange={e => setZipCode(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                    </div>
                                </div>
                                <div className="auth-field-group" style={{ marginTop: '12px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Address <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" className="auth-field-input" placeholder="Floor 4, Building B, Industrial Zone" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Country/Region <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select className="auth-field-input" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{ padding: '10px 8px', height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}>
                                            {countries.map(c => <option key={c._id} value={c.code}>{c.flag} {c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>State/Province <span style={{ color: '#ef4444' }}>*</span></label>
                                        {states.length > 0 ? (
                                            <select className="auth-field-input" value={stateProvince} onChange={e => setStateProvince(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }}>
                                                <option value="">Select state...</option>
                                                {Array.from(new Set(states.map((s: any) => s.name))).sort().map(name => (
                                                    <option key={name as string} value={name as string}>{name as string}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input type="text" className="auth-field-input" placeholder="State/Province" value={stateProvince} onChange={e => setStateProvince(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Email <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="email" className="auth-field-input" placeholder="store@company.com" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px' }} />
                                    </div>
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Phone <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="tel" className="auth-field-input" placeholder="Company Phone" value={companyPhone} readOnly disabled style={{ height: '44px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '14px', backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                                    </div>
                                </div>

                                {/* Custom Upload Fields */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                                    {/* Logo Upload */}
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Logo</label>
                                        <div style={{
                                            border: '2px dashed #cbd5e1',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: '#f8fafc',
                                            position: 'relative',
                                            height: '76px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden'
                                        }} onClick={() => document.getElementById('logo-upload-input')?.click()}>
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo Preview" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '20px', color: '#64748b' }}>🖼️</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Upload Logo</span>
                                                </>
                                            )}
                                            <input
                                                id="logo-upload-input"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleLogoFileChange}
                                            />
                                        </div>
                                    </div>

                                    {/* Banner Upload */}
                                    <div className="auth-field-group">
                                        <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Banner</label>
                                        <div style={{
                                            border: '2px dashed #cbd5e1',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: '#f8fafc',
                                            position: 'relative',
                                            height: '76px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden'
                                        }} onClick={() => document.getElementById('banner-upload-input')?.click()}>
                                            {bannerPreview ? (
                                                <img src={bannerPreview} alt="Banner Preview" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '20px', color: '#64748b' }}>🌄</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Upload Banner</span>
                                                </>
                                            )}
                                            <input
                                                id="banner-upload-input"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleBannerFileChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Certificate Upload */}
                                <div className="auth-field-group" style={{ marginTop: '16px' }}>
                                    <label className="auth-field-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '8px' }}>Company Certificate (PDF or Image)</label>
                                    <div style={{
                                        border: '2px dashed #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '14px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }} onClick={() => document.getElementById('cert-upload-input')?.click()}>
                                        <span style={{ fontSize: '22px' }}>📄</span>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                                {certificateName || 'Choose certificate file'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>PDF, DOCX, JPG or PNG up to 10MB</div>
                                        </div>
                                        <input
                                            id="cert-upload-input"
                                            type="file"
                                            accept=".pdf,.doc,.docx,image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleCertificateFileChange}
                                        />
                                    </div>
                                </div>

                                {error && <div className="auth-error-msg">{error}</div>}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginTop: '24px' }}>
                                    <button type="button" className="seller-register-link-btn" onClick={() => setStep(STEPS.PROFILE)} style={{
                                        background: 'transparent',
                                        color: '#475569',
                                        border: '1.5px solid #cbd5e1',
                                        height: '48px',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textDecoration: 'none',
                                        boxSizing: 'border-box'
                                    }}>
                                        ← Back
                                    </button>
                                    <button type="submit" className="auth-split-submit-btn seller-submit-btn" style={{ height: '48px', borderRadius: '8px', margin: 0 }}>
                                        Continue to Terms
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* STEP 5: Terms */}
                    {step === STEPS.TERMS && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Review & Agree</h1>
                            <p className="auth-split-subtitle">Please read and accept the seller terms to complete registration</p>
                            <div className="seller-terms-box">
                                <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>Seller Service Agreement</h3>
                                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.7' }}>
                                    Welcome to the Global Selling Center. By registering as a seller on {siteName}, you enter into a legally binding agreement to maintain high-quality listings, guarantee authentic products, provide transparent shipping rates, and adhere to our buyer-protection policies. We are dedicated to ensuring a secure, high-trust environment for both buyers and merchants. Any breach of catalog accuracy or service delivery standards may result in temporary store suspension or account review. Please read our complete merchant terms below.
                                </p>
                                <div className="seller-perks-grid">
                                    {[
                                        { icon: '🌍', label: 'Global Reach', desc: 'Access buyers in 190+ countries' },
                                        { icon: '🛡️', label: 'Safe Trading', desc: 'Trade Assurance for every deal' },
                                        { icon: '📊', label: 'Analytics', desc: 'Real-time sales dashboard' },
                                        { icon: '🤝', label: 'Dedicated Support', desc: '24/7 seller support team' },
                                    ].map(perk => (
                                        <div key={perk.label} className="seller-perk-card">
                                            <span className="seller-perk-icon">{perk.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{perk.label}</div>
                                                <div style={{ fontSize: '11px', color: '#888' }}>{perk.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <form onSubmit={handleRegister} className="auth-split-form">
                                <label className="auth-terms-row">
                                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
                                    <span>I have read and agree to the <a href="#" className="auth-link-primary">Seller Service Agreement</a> and <a href="#" className="auth-link-primary">Platform Terms</a></span>
                                </label>
                                {error && <div className="auth-error-msg">{error}</div>}
                                <button type="submit" id="sreg-submit-btn" className="auth-split-submit-btn seller-submit-btn" disabled={loading} style={{ height: '48px', borderRadius: '8px' }}>
                                    {loading ? 'Creating account...' : 'Agree & Create Seller Account'}
                                </button>
                                <button type="button" className="auth-link-btn" onClick={() => setStep(STEPS.COMPANY)} style={{ marginTop: '8px', display: 'block', width: '100%', textAlign: 'center' }}>
                                    ← Back to Store Details
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP 6: Mobile OTP Verify */}
                    {step === STEPS.MOBILE_OTP && (
                        <>
                            <h1 className="auth-split-title" style={{ marginTop: '20px' }}>Verify Company Mobile</h1>
                            <p className="auth-split-subtitle">
                                We sent a 6-digit code to your company phone: <strong>{companyPhone}</strong>
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
                                        id={`sreg-m-otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`auth-otp-box ${d ? 'filled' : ''}`}
                                        value={d}
                                        onChange={e => handleMobileOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleMobileOtpKeyDown(i, e)}
                                        style={{ height: '50px', width: '50px', borderRadius: '8px', border: '1.5px solid #d1d5db', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
                                    />
                                ))}
                            </div>
                            {/* Simulated OTP is logged to console for security */}
                            {error && <div className="auth-error-msg">{error}</div>}
                            <button className="auth-split-submit-btn seller-submit-btn" onClick={handleVerifyMobileOtp} disabled={loading} style={{ height: '48px', borderRadius: '8px', marginTop: '12px' }}>
                                {loading ? 'Verifying...' : 'Verify & Register Account'}
                            </button>
                            <p className="auth-resend-row" style={{ marginTop: '16px', textAlign: 'center' }}>
                                Didn't receive the code?{' '}
                                {resendMobileTimer > 0
                                    ? <span className="auth-timer">Resend in {resendMobileTimer}s</span>
                                    : <button type="button" className="auth-link-btn" onClick={handleSendMobileOtp}>Resend code</button>
                                }
                            </p>
                        </>
                    )}

                    {/* STEP 5: Success */}
                    {step === STEPS.SUCCESS && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div className="seller-success-icon">🎉</div>
                            <h1 className="auth-split-title">Welcome to {siteName}!</h1>
                            <p className="auth-split-subtitle">Your seller account has been created successfully. Redirecting you to your dashboard...</p>
                            <div className="seller-success-loader">
                                <div className="seller-success-bar"></div>
                            </div>
                            <Link href="/supplier/dashboard" className="auth-split-submit-btn seller-submit-btn" style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none', height: '48px', borderRadius: '8px', lineHeight: '48px', padding: '0 24px' }}>
                                Go to Dashboard
                            </Link>
                        </div>
                    )}

                    {step !== STEPS.SUCCESS && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                            <Link
                                href="/become-supplier/login"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    color: '#9ca3af',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Seller Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Banner */}
            <div
                className="auth-split-left seller-right-banner"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '36px',
                    position: 'relative',
                    background: 'linear-gradient(135deg, #090e1a 0%, #121829 50%, #2b0e27 100%)',
                    color: '#fff',
                    overflow: 'hidden',
                    flex: '0 0 45%',
                    maxWidth: '45%'
                }}
            >
                {/* Top Row: Powered by badge */}
                <div style={{ zIndex: 2 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontWeight: 600
                    }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Powered by {siteName}
                    </div>
                </div>

                {/* Middle Content: Title, Subtitle, and side-by-side Bullets & Illustration */}
                <div style={{ zIndex: 2, margin: '20px 0', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                        Start <span style={{ color: '#d946ef', background: 'linear-gradient(90deg, #d946ef, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Selling</span> Today
                    </h2>
                    <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px' }}>
                        Join thousands of successful sellers and grow your business globally.
                    </p>

                    {/* Side-by-side Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between', width: '100%' }}>
                        {/* Left Side: Bullet Points */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', maxWidth: '340px' }}>
                            {/* Bullet 1 */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="18" height="18" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px', color: '#fff', textTransform: 'none', letterSpacing: 'normal' }}>Reach Millions of Buyers</h4>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>Access a global customer base across multiple countries.</p>
                                </div>
                            </div>

                            {/* Bullet 2 */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(236, 72, 153, 0.15)',
                                    border: '1px solid rgba(236, 72, 153, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="18" height="18" fill="none" stroke="#f472b6" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px', color: '#fff', textTransform: 'none', letterSpacing: 'normal' }}>Grow Your Business</h4>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>Powerful tools and insights to scale your business faster.</p>
                                </div>
                            </div>

                            {/* Bullet 3 */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(249, 115, 22, 0.15)',
                                    border: '1px solid rgba(249, 115, 22, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="18" height="18" fill="none" stroke="#fb923c" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px', color: '#fff', textTransform: 'none', letterSpacing: 'normal' }}>Secure & Reliable</h4>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>Advanced security, secure payments and 24/7 dedicated support.</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: The 3D Illustration */}
                        <div style={{
                            width: '240px',
                            height: '240px',
                            backgroundImage: 'url(/images/seller-illustration-3d.png)',
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            opacity: 0.95,
                            flexShrink: 0,
                            mixBlendMode: 'normal',
                            pointerEvents: 'none',
                        }} />
                    </div>
                </div>

                {/* Bottom Row: Stats Container */}
                <div style={{ zIndex: 2 }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        {/* Stat 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="18" height="18" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>200M+</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Buyers</div>
                            </div>
                        </div>

                        {/* Divider line */}
                        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

                        {/* Stat 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(236, 72, 153, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="18" height="18" fill="none" stroke="#f472b6" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V8a2 2 0 00-2-2h-1.5a3 3 0 01-3-3V2" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>190+</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Countries</div>
                            </div>
                        </div>

                        {/* Divider line */}
                        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

                        {/* Stat 3 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(249, 115, 22, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="18" height="18" fill="none" stroke="#fb923c" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>24/7</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Support</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerRegister;
