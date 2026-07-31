'use client';

import React, { useState, useEffect } from 'react';

interface VoiceSearchButtonProps {
    onSpeechResult: (text: string) => void;
}

export default function VoiceSearchButton({ onSpeechResult }: VoiceSearchButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                setSupported(true);
            }
        }
    }, []);

    const startListening = () => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                const transcript = event.results?.[0]?.[0]?.transcript;
                if (transcript) {
                    onSpeechResult(transcript);
                }
            };

            recognition.start();
        } catch (err) {
            console.error('Voice search error:', err);
            setIsListening(false);
        }
    };

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={startListening}
            title={isListening ? 'Listening... Speak now' : 'Voice Search'}
            style={{
                background: isListening ? '#ef4444' : 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isListening ? '#ffffff' : '#64748b',
                transition: 'all 0.2s',
                animation: isListening ? 'pulse 1.2s infinite' : 'none'
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
        </button>
    );
}
