import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import styles from './SecuritySettings.module.css';

const SecuritySettings = () => {
    const { user, login, t } = useAuth();
    const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled || false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [hasTOTP, setHasTOTP] = useState(user?.hasTOTP || false);
    const [totpSetup, setTotpSetup] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [totpSecret, setTotpSecret] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [totpError, setTotpError] = useState('');
    const [totpSuccess, setTotpSuccess] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);

    // Phone verification states
    const [phoneInput, setPhoneInput] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [countries, setCountries] = useState<any[]>([]);
    const [showPhoneForm, setShowPhoneForm] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [phoneError, setPhoneError] = useState('');
    const [phoneSuccess, setPhoneSuccess] = useState('');
    const [simulationOtp, setSimulationOtp] = useState('');

    useEffect(() => {
        // Fetch countries
        api.get('/auth/countries')
            .then(({ data }) => {
                setCountries(data);
                // Try to extract existing phone dial code
                if (user?.phone_number) {
                    const matched = data.find((c: any) => user.phone_number.startsWith(c.dial_code));
                    if (matched) {
                        setCountryCode(matched.dial_code);
                        const phoneWithoutCode = user.phone_number.replace(matched.dial_code, '').trim();
                        setPhoneInput(phoneWithoutCode);
                    } else {
                        setPhoneInput(user.phone_number);
                    }
                }
            })
            .catch(() => {
                // Fallback if country endpoint fails
                if (user?.phone_number) {
                    setPhoneInput(user.phone_number);
                }
            });
    }, [user]);

    // Timer effect for OTP resend
    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleStartTOTPSetup = async () => {
        setTotpLoading(true);
        setTotpError('');
        setTotpSuccess('');
        try {
            const { data } = await api.get('/auth/generate-2fa');
            setQrCode(data.qrCode);
            setTotpSecret(data.secret);
            setTotpSetup(true);
        } catch (err) {
            setTotpError('Failed to initialize Authenticator Setup. Please try again.');
        } finally {
            setTotpLoading(false);
        }
    };

    const handleVerifyAndEnableTOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpToken || totpToken.trim().length !== 6) {
            setTotpError('Please enter a valid 6-digit authenticator code.');
            return;
        }
        setTotpLoading(true);
        setTotpError('');
        try {
            const { data } = await api.post('/auth/verify-enable-2fa', {
                secret: totpSecret,
                token: totpToken
            });
            if (data.success) {
                setTwoFactor(true);
                setHasTOTP(true);
                login({ ...user, twoFactorEnabled: true, hasTOTP: true });
                setTotpSuccess('Authenticator App linked and enabled successfully!');
                setTimeout(() => {
                    setTotpSetup(false);
                    setQrCode('');
                    setTotpSecret('');
                    setTotpToken('');
                    setTotpSuccess('');
                }, 2000);
            }
        } catch (err: any) {
            setTotpError(err.response?.data?.message || 'Verification failed. Invalid code.');
        } finally {
            setTotpLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        setLoading(true);
        setMessage('');
        try {
            if (hasTOTP) {
                const { data } = await api.post('/auth/disable-2fa');
                if (data.success) {
                    setTwoFactor(false);
                    setHasTOTP(false);
                    login({ ...user, twoFactorEnabled: false, hasTOTP: false });
                    setMessage('Authenticator 2FA disabled successfully.');
                }
            } else {
                const { data } = await api.put('/auth/update-security', {
                    twoFactorEnabled: false
                });
                setTwoFactor(false);
                login({ ...user, twoFactorEnabled: false });
                setMessage('Email 2FA disabled successfully.');
            }
        } catch (err) {
            setMessage('Failed to disable Two-Factor Authentication.');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableEmail2FA = async () => {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await api.put('/auth/update-security', {
                twoFactorEnabled: true
            });
            setTwoFactor(true);
            setHasTOTP(false);
            login({ ...user, twoFactorEnabled: true, hasTOTP: false });
            setMessage('Email 2FA enabled successfully.');
        } catch (err) {
            setMessage('Failed to enable Email 2FA.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMobileOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setPhoneError('');
        setPhoneSuccess('');
        setSimulationOtp('');

        if (!phoneInput.trim()) {
            setPhoneError('Phone number is required');
            return;
        }

        setOtpLoading(true);
        try {
            const fullPhone = phoneInput.startsWith('+') ? phoneInput : `${countryCode}${phoneInput}`;
            const { data } = await api.post('/auth/send-mobile-otp', {
                phone_number: fullPhone,
                country_code: countryCode
            });

            if (data.success) {
                setShowOtpInput(true);
                setResendTimer(60);
                setPhoneSuccess(`Verification code sent to ${fullPhone}`);
                if (data.otp) {
                    setSimulationOtp(data.otp);
                }
            } else {
                setPhoneError(data.message || 'Failed to send OTP code.');
            }
        } catch (err: any) {
            setPhoneError(err.response?.data?.message || 'Failed to send verification code. Please check the phone number format.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyMobileOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError('');
        setPhoneSuccess('');

        if (!otpInput || otpInput.trim().length !== 6) {
            setPhoneError('Please enter a valid 6-digit OTP code');
            return;
        }

        setOtpLoading(true);
        try {
            const { data } = await api.post('/auth/verify-mobile-otp', {
                otp: otpInput
            });

            if (data.success) {
                setPhoneSuccess('Mobile number verified successfully!');
                const fullPhone = phoneInput.startsWith('+') ? phoneInput : `${countryCode}${phoneInput}`;
                
                // Update context user details
                login({ 
                    ...user, 
                    is_phone_verified: true, 
                    phone_number: fullPhone,
                    country_code: countryCode
                });

                setShowPhoneForm(false);
                setShowOtpInput(false);
                setOtpInput('');
                setSimulationOtp('');
            } else {
                setPhoneError(data.message || 'Verification failed. Please retry.');
            }
        } catch (err: any) {
            setPhoneError(err.response?.data?.message || 'Failed to verify. Invalid or expired OTP.');
        } finally {
            setOtpLoading(false);
        }
    };

    return (
        <div className={styles['security-settings-card']} style={{ width: '100%', maxWidth: '100%' }}>
            <h2 className={styles['card-title']}>
                <span>🛡️</span> {t('account_security_compliance') || 'Account Security & Compliance'}
            </h2>

            {/* 2FA Item */}
            <div className={styles['security-item']} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
                    <div className={styles['security-info']}>
                        <h3>Two-Factor Authentication (2FA)</h3>
                        <p>
                            {twoFactor 
                                ? (hasTOTP ? '✓ Protected with Authenticator App (Google/Authy).' : '✓ Protected with Email Verification Codes.') 
                                : 'Add an extra layer of security to your account using email codes or an Authenticator App.'
                            }
                        </p>
                    </div>
                    <div className={styles['security-action']} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {twoFactor ? (
                            <button
                                onClick={handleDisable2FA}
                                disabled={loading}
                                className={`${styles['btn-action']} ${styles['btn-danger']}`}
                            >
                                {loading ? 'Processing...' : 'Disable 2FA'}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleEnableEmail2FA}
                                    disabled={loading || totpSetup}
                                    className={`${styles['btn-action']} ${styles['btn-secondary']}`}
                                >
                                    Enable Email OTP
                                </button>
                                <button
                                    onClick={handleStartTOTPSetup}
                                    disabled={loading || totpSetup}
                                    className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                >
                                    {totpLoading ? 'Loading...' : 'Set up Authenticator'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {totpSetup && (
                    <div className="totp-setup-container" style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Set up Authenticator App</h4>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                {qrCode ? (
                                    <img src={qrCode} alt="TOTP QR Code" style={{ width: '160px', height: '160px' }} />
                                ) : (
                                    <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Generating QR...</div>
                                )}
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Scan with Google Authenticator or Authy</span>
                            </div>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <ol style={{ paddingLeft: '20px', color: '#475569', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li>Open your Authenticator app and scan the QR code.</li>
                                    <li>If you cannot scan, enter the key below manually:
                                        <div style={{ marginTop: '4px', background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', letterSpacing: '1px', border: '1px dashed #cbd5e1', wordBreak: 'break-all' }}>
                                            {totpSecret}
                                        </div>
                                    </li>
                                    <li>Enter the 6-digit code generated by your app:</li>
                                </ol>
                                <form onSubmit={handleVerifyAndEnableTOTP} style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={totpToken}
                                        onChange={(e) => setTotpToken(e.target.value)}
                                        style={{ width: '120px', padding: '8px 12px', fontSize: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px' }}
                                        required
                                        disabled={totpLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={totpLoading}
                                        className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                    >
                                        Verify & Activate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTotpSetup(false);
                                            setQrCode('');
                                            setTotpSecret('');
                                            setTotpToken('');
                                            setTotpError('');
                                        }}
                                        className={`${styles['btn-action']} ${styles['btn-secondary']}`}
                                        disabled={totpLoading}
                                    >
                                        Cancel
                                    </button>
                                </form>
                                {totpError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', fontWeight: 500 }}>⚠️ {totpError}</p>}
                                {totpSuccess && <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '12px', fontWeight: 500 }}>✓ {totpSuccess}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Verification Item */}
            <div className={styles['security-item']}>
                <div className={styles['security-info']}>
                    <h3>Email Verification</h3>
                    <p>Your primary email address is used for critical alerts and 2FA.</p>
                </div>
                <div className={styles['security-action']}>
                    <span className={`${styles['badge']} ${styles['badge-verified']}`}>
                        Verified
                    </span>
                </div>
            </div>

            {/* Mobile Number Verification Item */}
            <div className={styles['security-item']}>
                <div className={styles['security-info']}>
                    <h3>Mobile Number Verification</h3>
                    <p>
                        {user?.is_phone_verified 
                            ? 'Your mobile number is verified for secure transactions and login access.'
                            : 'Verify your mobile number to protect your account and access premium trade options.'}
                    </p>
                    {user?.phone_number && (
                        <p style={{ marginTop: '8px', fontWeight: 600, color: '#334155' }}>
                            Phone Number: {user.phone_number}
                        </p>
                    )}
                </div>
                <div className={styles['security-action']}>
                    {user?.is_phone_verified ? (
                        <span className={`${styles['badge']} ${styles['badge-verified']}`}>
                            ✓ Verified
                        </span>
                    ) : (
                        <button
                            onClick={() => {
                                setShowPhoneForm(!showPhoneForm);
                                setPhoneError('');
                                setPhoneSuccess('');
                            }}
                            className={`${styles['btn-action']} ${styles['btn-primary']}`}
                        >
                            {showPhoneForm ? 'Close' : 'Verify Mobile'}
                        </button>
                    )}
                </div>
            </div>

            {/* Inline OTP verification flow */}
            {!user?.is_phone_verified && showPhoneForm && (
                <div className={styles['otp-container']}>
                    <h4 className={styles['otp-title']}>
                        {showOtpInput ? 'Enter Verification Code' : 'Enter Mobile Number'}
                    </h4>
                    
                    {!showOtpInput ? (
                        <form onSubmit={handleSendMobileOtp}>
                            <div className={styles['phone-input-row']}>
                                <select 
                                    value={countryCode} 
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className={styles['country-select']}
                                >
                                    {countries && countries.length > 0 ? (
                                        countries.map((c: any) => (
                                            <option key={c._id || c.code} value={c.dial_code}>
                                                {c.dial_code} ({c.code})
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="+91">+91 (IN)</option>
                                            <option value="+1">+1 (US)</option>
                                            <option value="+86">+86 (CN)</option>
                                            <option value="+44">+44 (GB)</option>
                                            <option value="+7">+7 (RU)</option>
                                        </>
                                    )}
                                </select>
                                <input
                                    type="tel"
                                    placeholder="e.g. 9876543210"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    className={styles['phone-number-input']}
                                    required
                                    disabled={otpLoading}
                                />
                            </div>
                            <div className={styles['form-actions-row']}>
                                <button
                                    type="submit"
                                    className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? 'Sending...' : 'Send OTP Code'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPhoneForm(false)}
                                    className={`${styles['btn-action']} ${styles['btn-secondary']}`}
                                    disabled={otpLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyMobileOtp}>
                            <div className={styles['otp-input-row']}>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value)}
                                    className={styles['otp-code-input']}
                                    required
                                    disabled={otpLoading}
                                />
                                {resendTimer > 0 ? (
                                    <span className={styles['resend-timer-text']}>
                                        Resend in {resendTimer}s
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendMobileOtp()}
                                        className={styles['resend-btn']}
                                        disabled={otpLoading}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                            <div className={styles['form-actions-row']}>
                                <button
                                    type="submit"
                                    className={`${styles['btn-action']} ${styles['btn-primary']}`}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOtpInput(false);
                                        setOtpInput('');
                                        setSimulationOtp('');
                                    }}
                                    className={`${styles['btn-action']} ${styles['btn-secondary']}`}
                                    disabled={otpLoading}
                                >
                                    Back
                                </button>
                            </div>
                        </form>
                    )}

                    {phoneError && (
                        <div className={`${styles['message-alert']} ${styles['message-alert-error']}`}>
                            ⚠️ {phoneError}
                        </div>
                    )}
                    
                    {phoneSuccess && (
                        <div className={`${styles['message-alert']} ${styles['message-alert-success']}`}>
                            ✓ {phoneSuccess}
                        </div>
                    )}

                    {simulationOtp && (
                        <div className={`${styles['message-alert']} ${styles['message-alert-info']}`} style={{ marginTop: '12px' }}>
                            💡 <strong>[Simulation Mode]</strong> Code is: <code>{simulationOtp}</code> (Also printed to server terminal)
                        </div>
                    )}
                </div>
            )}

            {/* Fraud Protection Item */}
            <div className={styles['security-item']}>
                <div className={styles['security-info']}>
                    <h3>Fraud Protection</h3>
                    <p>Our AI-driven system monitors your account for suspicious activity.</p>
                </div>
                <div className={styles['security-action']}>
                    <span className={styles['status-active']}>Active</span>
                </div>
            </div>

            {message && (
                <div className={`${styles['message-alert']} ${styles['message-alert-info']}`} style={{ marginTop: '24px' }}>
                    {message}
                </div>
            )}

            <div className={styles['info-columns']}>
                <div className={styles['info-column-gray']}>
                    <h4 className={styles['info-column-title']}>GDPR & Privacy</h4>
                    <p className={styles['info-column-text']}>
                        We value your privacy. Your data is encrypted and handled according to our global compliance standards.
                        You can request a data export or account deletion by contacting our legal compliance team at support@alibaba-clone.com.
                    </p>
                </div>
                <div className={styles['info-column-blue']}>
                    <h4 className={styles['info-column-title']}>Why this matters?</h4>
                    <p className={styles['info-column-text']}>
                        Maintaining high security standards is mandatory for <b>Verified Supplier</b> status. This section ensures your account complies with global trade safety regulations, protecting both you and your buyers from fraud and data breaches.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
