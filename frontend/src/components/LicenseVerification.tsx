'use client';

import React, { useState } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

export default function LicenseVerification() {
    const { refreshSiteSettings, siteSettings, isInitialized } = useAuth();

    const [purchaseCode, setPurchaseCode] = useState('');
    const [email, setEmail] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError('');

        try {
            const res = await api.post('/install/verify-license', {
                purchase_code: purchaseCode,
                email: email
            });

            if (res.data.status || res.data.success) {
                setSuccess(true);
                // Refresh local site settings to cache new active status
                await refreshSiteSettings();
                
                setTimeout(() => {
                    if (siteSettings?.is_installed) {
                        window.location.href = '/';
                    } else {
                        window.location.href = '/install';
                    }
                }, 1500);
            } else {
                setError(res.data.message || 'Verification failed. Please check your credentials.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Cannot connect to license server.');
        } finally {
            setVerifying(false);
        }
    };

    if (!isInitialized || !siteSettings) {
        return (
            <div style={{
                height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#090d16'
            }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #e2e8f0',
                    borderTop: '3px solid #2563eb', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            background: '#090d16',
            backgroundImage: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.12) 0%, #090d16 75%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f3f4f6',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                background: 'rgba(17, 24, 39, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                boxSizing: 'border-box'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ 
                        fontSize: '24px', 
                        fontWeight: '800', 
                        background: 'linear-gradient(135deg, #60a5fa, #818cf8)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent',
                        margin: '0 0 8px 0' 
                    }}>
                        License Verification
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '13.5px', margin: 0 }}>
                        B2B Marketplace Management Console
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#fca5a5',
                        fontSize: '13px',
                        marginBottom: '24px',
                        fontWeight: '600',
                        lineHeight: '1.4'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#a7f3d0',
                        fontSize: '13px',
                        marginBottom: '24px',
                        fontWeight: '600',
                        lineHeight: '1.4'
                    }}>
                        ✓ License activated successfully! Redirecting...
                    </div>
                )}

                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Purchase Code *
                        </label>
                        <input
                            type="text"
                            required
                            value={purchaseCode}
                            onChange={e => setPurchaseCode(e.target.value)}
                            placeholder="e.g. W8ip9ErQq5dsmiqPSeCvWYWwl"
                            style={{
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontFamily: 'monospace'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Registered Customer Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="e.g. client@gmail.com"
                            style={{
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={verifying || success}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14.5px',
                            fontWeight: '700',
                            cursor: verifying || success ? 'default' : 'pointer',
                            transition: 'opacity 0.2s',
                            marginTop: '10px',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        {verifying ? 'Verifying License...' : 'Verify & Activate'}
                    </button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12.5px', color: '#64748b' }}>
                    Only unverified installations are restricted to this verification screen.
                </div>
            </div>
        </div>
    );
}
