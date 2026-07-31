'use client';

import React, { useState, useEffect, useRef } from 'react';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanResult: (barcode: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScanResult }: BarcodeScannerModalProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        if (isOpen && typeof navigator !== 'undefined' && navigator.mediaDevices) {
            setErrorMsg(null);
            setScanning(true);

            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                })
                .catch(err => {
                    console.error('Camera access error:', err);
                    setErrorMsg('Camera access unavailable. You can enter the barcode/SKU number manually below.');
                    setScanning(false);
                });
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            onScanResult(manualCode.trim());
            onClose();
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z"/><path d="M14 14h3v3h-3z"/></svg>
                        Scan Barcode / QR Code
                    </h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                </div>

                {errorMsg ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '14px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px' }}>
                        {errorMsg}
                    </div>
                ) : (
                    <div style={{ position: 'relative', width: '100%', height: '240px', background: '#0f172a', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: '24px', border: '2px dashed #3b82f6', borderRadius: '12px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '6px 12px', borderRadius: '20px', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>Center Barcode Here</div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                        placeholder="Enter Barcode / SKU manually..."
                        style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '10px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        Search
                    </button>
                </form>
            </div>
        </div>
    );
}
