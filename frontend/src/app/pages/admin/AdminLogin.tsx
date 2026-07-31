import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ReCAPTCHA from 'react-google-recaptcha';




const AdminLogin = () => {
    const navigate = useRouter();

    const {  user, siteSettings, isInitialized , t } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const [forgotMode, setForgotMode] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(0);
    const otpRefs = React.useRef<any>([]);

    // Redirect to dashboard if already logged in as admin
    useEffect(() => {
        if (!isInitialized) return;
        
        const roles = user?.roles || (user?.role ? [user.role] : []);
        if (user && roles.includes('admin')) {
            navigate.push('/admin/dashboard');
        }
    }, [user, siteSettings, navigate, isInitialized]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { 
                email, 
                password,
                recaptchaToken 
            });

            const roles = data.roles || (data.role ? [data.role] : []);
            if (!roles.includes('admin')) {
                setError('Access denied. This page is for administrators only.');
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            
            showToast('Login successful', 'success');
            // Redirect to admin dashboard
            window.location.href = '/admin/dashboard';
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(msg);
            showToast(msg, 'error');
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
            setForgotMode(false);
            setResetMode(true);
            showToast('Reset code sent to your email.', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to send reset code';
            setError(msg);
            showToast(msg, 'error');
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
            setResetMode(false);
            setError('');
            showToast('Password reset successful. Please login with your new password.', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Reset failed';
            setError(msg);
            showToast(msg, 'error');
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

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    );

    if (!isInitialized || !siteSettings) {
        return (
            <div style={{ 
                height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', background: '#f8fafc' 
            }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #e2e8f0',
                    borderTop: '3px solid var(--primary-color)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="admin-login-page" style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#f4f7f9',
            padding: '20px'
        }}>
            <div className="register-card" style={{ 
                maxWidth: '450px', 
                width: '100%', 
                background: '#fff', 
                padding: '40px', 
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '60px', 
                        height: '60px', 
                        backgroundColor: 'var(--primary-color)', 
                        borderRadius: '12px',
                        marginBottom: '15px'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Admin Control Panel</h2>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>Sign in to manage your platform</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="float-input-wrap">
                        <input 
                            type="email" 
                            className="float-input" 
                            placeholder=" " 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            autoComplete="username email"
                        />
                        <label className="float-label">Administrator Email</label>
                    </div>
                    
                    <div className="float-input-wrap password-wrap mt-2">
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            className="float-input" 
                            placeholder=" " 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            autoComplete="current-password"
                        />
                        <label className="float-label">Security Password</label>
                        <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '10px' }}>
                        <button type="button" onClick={() => setForgotMode(true)} style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 600, textDecoration: 'underline' }}>
                            Forgot password?
                        </button>
                    </div>

                    {siteSettings?.enable_recaptcha && siteSettings?.recaptcha_site_key && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                            <ReCAPTCHA
                                sitekey={siteSettings.recaptcha_site_key}
                                onChange={(token) => setRecaptchaToken(token || '')}
                            />
                        </div>
                    )}

                    {error && (
                        <div style={{ 
                            backgroundColor: '#fff1f2', 
                            color: '#e11d48', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            marginTop: '15px',
                            border: '1px solid #ffe4e6'
                        }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="admin-login-btn-premium"
                    >
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <div className="btn-spinner" />
                                <span>Authenticating...</span>
                            </div>
                        ) : (
                            'Sign In to Dashboard'
                        )}
                    </button>

                    <style>{`
                        .admin-login-btn-premium {
                            width: 100%;
                            height: 54px;
                            background: var(--primary-color);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 700;
                            margin-top: 24px;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            box-shadow: 0 4px 15px rgba(30, 58, 138, 0.25);
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }

                        .admin-login-btn-premium:hover:not(:disabled) {
                            transform: translateY(-2px);
                            box-shadow: 0 8px 25px rgba(30, 58, 138, 0.35);
                            filter: brightness(1.1);
                        }

                        .admin-login-btn-premium:active:not(:disabled) {
                            transform: translateY(0);
                        }

                        .admin-login-btn-premium:disabled {
                            background: #94a3b8;
                            cursor: not-allowed;
                            box-shadow: none;
                        }

                        .btn-spinner {
                            width: 20px;
                            height: 20px;
                            border: 3px solid rgba(255, 255, 255, 0.3);
                            border-top: 3px solid white;
                            border-radius: 50%;
                            animation: btn-spin 0.8s linear infinite;
                        }

                        @keyframes btn-spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </form>

                <div style={{ marginTop: '25px', textAlign: 'center' }}>
                    <a href="/" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
                        ← Back to Mainland Alibaba
                    </a>
                </div>
            </div>

            {forgotMode && (
                <div className="auth-modal-overlay d-flex align-center justify-center" onClick={() => setForgotMode(false)}>
                    <div className="register-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h2 className="register-title-v2">Forgot Admin Password?</h2>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Enter your administrator email to receive a reset code.</p>
                        <form onSubmit={handleForgotPassword}>
                            <div className="float-input-wrap">
                                <input type="email" className="float-input" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} required />
                                <label className="float-label">Admin Email</label>
                            </div>
                            {error && <p className="reg-error">{error}</p>}
                            <button type="submit" className="reg-btn-primary-v2" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
                            <button type="button" onClick={() => setForgotMode(false)} style={{ width: '100%', marginTop: '10px', color: '#666' }}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {resetMode && (
                <div className="auth-modal-overlay d-flex align-center justify-center" onClick={() => setResetMode(false)}>
                    <div className="register-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h2 className="register-title-v2">Reset Password</h2>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Enter the code sent to {email} and your new password.</p>
                        <div className="otp-boxes-v2" style={{ marginBottom: '20px' }}>
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
                                    style={{ width: '45px', height: '50px' }}
                                />
                            ))}
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="float-input-wrap">
                                <input type={showPassword ? 'text' : 'password'} className="float-input" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} required />
                                <label className="float-label">New Password</label>
                            </div>
                            {error && <p className="reg-error">{error}</p>}
                            <button type="submit" className="reg-btn-primary-v2" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                {resendTimer > 0 ? <span style={{ fontSize: '13px', color: '#999' }}>Resend in {resendTimer}s</span> : 
                                <button type="button" onClick={handleForgotPassword} style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '13px' }}>Resend Code</button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLogin;
