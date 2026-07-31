import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

export default function InstallWizard() {
    const router = useRouter();
    const { refreshSiteSettings, siteSettings, isInitialized } = useAuth();
    
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState({
        isInstalled: false,
        hasAdmin: false,
        isLocal: false
    });
    
    // Step 1: DB State
    const [dbChecking, setDbChecking] = useState(false);
    const [dbVerified, setDbVerified] = useState(false);
    const [dbMessage, setDbMessage] = useState('');

    // Step 2: Admin Form State
    const [adminForm, setAdminForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    });
    const [adminSaving, setAdminSaving] = useState(false);
    const [adminError, setAdminError] = useState('');

    // Step 3: License State
    const [purchaseCode, setPurchaseCode] = useState('');
    const [licenseVerifying, setLicenseVerifying] = useState(false);
    const [licenseError, setLicenseError] = useState('');
    const [licenseSuccess, setLicenseSuccess] = useState(false);

    // Step 4: Completion State
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        const isLicenseValid = siteSettings?.license_status === 'active' || siteSettings?.license_status === 'development';
        if (isInitialized && siteSettings?.is_installed && isLicenseValid) {
            router.push('/admin/dashboard');
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await api.get('/install/status');
                setStatus(res.data);
                if (res.data.isInstalled && isLicenseValid) {
                    router.push('/admin/dashboard');
                    return;
                }

                // Determine step based on database and licensing status
                if (res.data.hasAdmin) {
                    if (siteSettings?.license_status === 'active' || siteSettings?.license_status === 'development') {
                        setStep(4);
                    } else {
                        setStep(3);
                    }
                } else {
                    setStep(1);
                }
            } catch (err) {
                console.error('Failed to retrieve installation status:', err);
            }
        };
        if (isInitialized && siteSettings) {
            fetchStatus();
        }
    }, [isInitialized, siteSettings, router]);

    // DB Test
    const handleTestDb = async () => {
        setDbChecking(true);
        setDbMessage('');
        try {
            const res = await api.post('/install/db-test');
            if (res.data.success) {
                setDbVerified(true);
                setDbMessage(res.data.message);
            } else {
                setDbVerified(false);
                setDbMessage('Database test failed.');
            }
        } catch (err: any) {
            setDbVerified(false);
            setDbMessage(err.response?.data?.message || 'Database connection error.');
        } finally {
            setDbChecking(false);
        }
    };

    // Create Admin
    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdminSaving(true);
        setAdminError('');
        try {
            const res = await api.post('/install/create-admin', adminForm);
            if (res.data.success) {
                setStep(3);
            }
        } catch (err: any) {
            setAdminError(err.response?.data?.message || 'Failed to create admin.');
        } finally {
            setAdminSaving(false);
        }
    };

    // Verify License
    const handleVerifyLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        setLicenseVerifying(true);
        setLicenseError('');
        try {
            const res = await api.post('/install/verify-license', {
                purchase_code: status.isLocal ? null : purchaseCode
            });
            if (res.data.status || res.data.success) {
                setLicenseSuccess(true);
                setStep(4);
            } else {
                setLicenseError(res.data.message || 'Verification failed.');
            }
        } catch (err: any) {
            setLicenseError(err.response?.data?.message || 'Failed to connect to license validation server.');
        } finally {
            setLicenseVerifying(false);
        }
    };

    // Complete setup
    const handleComplete = async () => {
        setCompleting(true);
        try {
            await api.post('/install/complete');
            refreshSiteSettings();
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 1000);
        } catch (err) {
            console.error('Failed to complete setup:', err);
            setCompleting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#090d16',
            backgroundImage: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.15) 0%, #090d16 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f3f4f6',
            fontFamily: 'system-ui, sans-serif',
            padding: '24px'
        }}>
            <div style={{
                background: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '600px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', background: 'linear-gradient(135deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        B2B Setup Wizard
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '6px' }}>Enforcing commercial verification system</p>
                </div>

                {/* Steps tracker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
                    <div style={{ position: 'absolute', top: '15px', left: '10%', right: step === 1 ? '90%' : step === 2 ? '60%' : step === 3 ? '30%' : '10%', height: '2px', background: '#2563eb', transition: 'right 0.3s', zIndex: 1 }} />

                    {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: step >= s ? '#2563eb' : 'rgba(255,255,255,0.05)',
                                color: step >= s ? '#fff' : '#9ca3af',
                                border: step >= s ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.08)',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                boxShadow: step >= s ? '0 0 10px rgba(37, 99, 235, 0.4)' : 'none',
                                transition: 'all 0.3s',
                                textAlign: 'center'
                            }}>
                                {s}
                            </div>
                            <span style={{ fontSize: '10px', color: step >= s ? '#60a5fa' : '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {s === 1 ? 'Database' : s === 2 ? 'Admin' : s === 3 ? 'License' : 'Finish'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1 Content: DB Check */}
                {step === 1 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Step 1: Database Connectivity</h2>
                        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                            We need to check if the platform is connected to your MongoDB database. Please ensure MongoDB is running and settings match.
                        </p>

                        {dbMessage && (
                            <div style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: dbVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: dbVerified ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                                color: dbVerified ? '#a7f3d0' : '#fca5a5',
                                fontSize: '13px',
                                marginBottom: '24px',
                                fontWeight: '600'
                            }}>
                                {dbMessage}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={handleTestDb}
                                disabled={dbChecking}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: '#1f2937',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                {dbChecking ? 'Checking Link...' : 'Test DB Link'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(status.hasAdmin ? 3 : 2)}
                                disabled={!dbVerified}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: dbVerified ? '#2563eb' : 'rgba(37, 99, 235, 0.4)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    cursor: dbVerified ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Next Step
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2 Content: Admin Account Setup */}
                {step === 2 && (
                    <form onSubmit={handleCreateAdmin}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Step 2: Create Super Admin</h2>
                        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                            Set up your credentials for the Super Admin management console.
                        </p>

                        {adminError && (
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '13px', marginBottom: '20px', fontWeight: '600' }}>
                                {adminError}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>First Name *</label>
                                <input type="text" required value={adminForm.first_name} onChange={e => setAdminForm({...adminForm, first_name: e.target.value})} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', outline: 'none' }} placeholder="Admin" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Last Name *</label>
                                <input type="text" required value={adminForm.last_name} onChange={e => setAdminForm({...adminForm, last_name: e.target.value})} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', outline: 'none' }} placeholder="Manager" />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Email Address *</label>
                            <input type="email" required value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', outline: 'none' }} placeholder="admin@domain.com" />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '32px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Password *</label>
                            <input type="password" required minLength={6} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', outline: 'none' }} placeholder="••••••••" />
                        </div>

                        <button
                            type="submit"
                            disabled={adminSaving}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#2563eb',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {adminSaving ? 'Registering...' : 'Create Admin & Proceed'}
                        </button>
                    </form>
                )}

                {/* Step 3 Content: License Key Activation */}
                {step === 3 && (
                    <form onSubmit={handleVerifyLicense}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                            Step 3: {status.isLocal ? 'Bypass Verification' : 'Purchase Verification'}
                        </h2>

                        {licenseError && (
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '13px', marginBottom: '20px', fontWeight: '600' }}>
                                {licenseError}
                            </div>
                        )}

                        {status.isLocal ? (
                            <div style={{
                                padding: '20px',
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '12px',
                                color: '#93c5fd',
                                fontSize: '13.5px',
                                lineHeight: '1.6',
                                marginBottom: '32px'
                            }}>
                                <strong style={{ display: 'block', fontSize: '15px', color: '#fff', marginBottom: '8px' }}>Development Environment Detected</strong>
                                Purchase code verification is not required on localhost or private development servers.<br/>
                                This installation cannot be used in production until a valid purchase code is activated.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '32px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Purchase Code / License Key *</label>
                                <input
                                    type="text"
                                    required
                                    value={purchaseCode}
                                    onChange={e => setPurchaseCode(e.target.value)}
                                    style={{
                                        padding: '14px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontFamily: 'monospace',
                                        fontSize: '16px',
                                        outline: 'none'
                                    }}
                                    placeholder="SV-XXXX-XXXX-XXXX-XXXX"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={licenseVerifying}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#2563eb',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {licenseVerifying ? 'Validating code...' : status.isLocal ? 'Bypass & Activate Development' : 'Verify & Activate'}
                        </button>
                    </form>
                )}

                {/* Step 4 Content: Setup Completed */}
                {step === 4 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '2px solid #10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px auto',
                            fontSize: '32px',
                            color: '#10b981'
                        }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Installation Finalized!</h2>
                        <p style={{ color: '#9ca3af', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '32px' }}>
                            Your B2B marketplace platform has been successfully configured and license cached. Re-installation routes are now securely locked.
                        </p>

                        <button
                            type="button"
                            onClick={handleComplete}
                            disabled={completing}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {completing ? 'Locking Installer...' : 'Launch Admin Console'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
