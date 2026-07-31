'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import '@/components/css/VoiceSearch.css';

// Language name to Web Speech API locale mapping
const NAME_TO_SPEECH_LOCALE: Record<string, string> = {
    'English': 'en-IN',
    'Tamil': 'ta-IN',
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN',
    'Arabic': 'ar-SA',
    'German': 'de-DE',
    'Spanish': 'es-ES',
    'French': 'fr-FR',
    'Hebrew': 'he-IL',
    'Italian': 'it-IT',
    'Japanese': 'ja-JP',
    'Korean': 'ko-KR',
    'Portuguese': 'pt-PT',
    'Russian': 'ru-RU',
    'Chinese': 'zh-CN',
};

// Popular locales to readable names
const SPEECH_LOCALE_TO_NAME: Record<string, string> = {
    'en-IN': 'English (India)',
    'en-US': 'English (US)',
    'ta-IN': 'தமிழ் (Tamil)',
    'hi-IN': 'हिन्दी (Hindi)',
    'bn-IN': 'বাংলা (Bengali)',
    'ar-SA': 'العربية (Arabic)',
    'de-DE': 'Deutsch (German)',
    'es-ES': 'Español (Spanish)',
    'fr-FR': 'Français (French)',
};

interface VoiceSearchContextType {
    isListening: boolean;
    isOpen: boolean;
    transcript: string;
    interimTranscript: string;
    currentLang: string;
    error: string | null;
    startListening: (callback: (text: string) => void, defaultLang?: string) => void;
    stopListening: () => void;
    changeLanguage: (locale: string) => void;
}

const VoiceSearchContext = createContext<VoiceSearchContextType | undefined>(undefined);

export const VoiceSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const { user, language: appLanguage, currency: appCurrency, updateUserSettings } = useAuth();
    const setAppLanguage = useCallback((newLang: string) => {
        updateUserSettings(newLang, appCurrency);
    }, [updateUserSettings, appCurrency]);

    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [currentLang, setCurrentLang] = useState('en-IN');
    const [error, setError] = useState<string | null>(null);
    const [commandMessage, setCommandMessage] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const callbackRef = useRef<((text: string) => void) | null>(null);
    const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Recognition
    const initRecognition = useCallback(() => {
        if (typeof window === 'undefined') return null;

        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = currentLang;

        return recognition;
    }, [currentLang]);

    // Handle voice command routing & language switching
    const handleVoiceCommand = useCallback((commandText: string): boolean => {
        const cmd = commandText.toLowerCase().trim();

        // Voice Command: Go to Cart
        if (cmd === 'go to cart' || cmd === 'open cart' || cmd === 'cart') {
            setCommandMessage('Opening Shopping Cart...');
            setTimeout(() => {
                router.push('/cart');
                closeOverlay();
            }, 1200);
            return true;
        }

        // Voice Command: Go to Profile
        if (cmd === 'go to profile' || cmd === 'open profile' || cmd === 'profile' || cmd === 'my profile') {
            setCommandMessage('Opening Dashboard...');
            const isSupplier = user?.roles?.includes('supplier') || user?.role === 'supplier';
            const destination = isSupplier ? '/supplier/dashboard' : '/dashboard';
            setTimeout(() => {
                router.push(destination);
                closeOverlay();
            }, 1200);
            return true;
        }

        // Voice Command: Post RFQ
        if (cmd === 'post rfq' || cmd === 'rfq' || cmd === 'post request' || cmd === 'request for quotation') {
            setCommandMessage('Opening RFQ Wizard...');
            setTimeout(() => {
                router.push('/rfq/post');
                closeOverlay();
            }, 1200);
            return true;
        }

        // Voice Command: Go Home
        if (cmd === 'go home' || cmd === 'home' || cmd === 'homepage' || cmd === 'go to homepage') {
            setCommandMessage('Redirecting Home...');
            setTimeout(() => {
                router.push('/');
                closeOverlay();
            }, 1200);
            return true;
        }

        // Voice Command: AI Sourcing
        if (cmd === 'ai sourcing' || cmd === 'ai mode' || cmd === 'sourcing') {
            setCommandMessage('Opening AI Sourcing Mode...');
            setTimeout(() => {
                router.push('/ai-sourcing');
                closeOverlay();
            }, 1200);
            return true;
        }

        // Voice Command: Language Switching
        if (cmd === 'switch to english' || cmd === 'change language to english') {
            setCommandMessage('Switching site language to English...');
            if (setAppLanguage) setAppLanguage('English');
            setCurrentLang('en-IN');
            setTimeout(() => closeOverlay(), 1200);
            return true;
        }
        if (cmd === 'switch to tamil' || cmd === 'change language to tamil') {
            setCommandMessage('தமிழுக்கு மாறுகிறது...');
            if (setAppLanguage) setAppLanguage('Tamil');
            setCurrentLang('ta-IN');
            setTimeout(() => closeOverlay(), 1200);
            return true;
        }
        if (cmd === 'switch to hindi' || cmd === 'change language to hindi') {
            setCommandMessage('हिन्दी में बदल रहा है...');
            if (setAppLanguage) setAppLanguage('Hindi');
            setCurrentLang('hi-IN');
            setTimeout(() => closeOverlay(), 1200);
            return true;
        }

        return false;
    }, [router, user, setAppLanguage]);

    // Close and stop listening
    const closeOverlay = useCallback(() => {
        setIsOpen(false);
        setIsListening(false);
        setTranscript('');
        setInterimTranscript('');
        setCommandMessage(null);
        setError(null);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                // Ignore abort error
            }
        }

        if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current);
        }
    }, []);

    // Effect to auto-close if no speech is detected after 8s
    const resetAutoCloseTimer = useCallback(() => {
        if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current);
        }
        autoCloseTimeoutRef.current = setTimeout(() => {
            if (isListening && !transcript && !interimTranscript) {
                setError('no-speech');
                setIsListening(false);
            }
        }, 8000);
    }, [isListening, transcript, interimTranscript]);

    // Setup speech events
    const startListening = useCallback((callback: (text: string) => void, defaultLang?: string) => {
        setError(null);
        setTranscript('');
        setInterimTranscript('');
        setCommandMessage(null);
        setIsOpen(true);
        callbackRef.current = callback;

        // Set default speech locale based on appLanguage or parameter
        let initialLocale = 'en-IN';
        if (defaultLang && NAME_TO_SPEECH_LOCALE[defaultLang]) {
            initialLocale = NAME_TO_SPEECH_LOCALE[defaultLang];
        } else if (appLanguage && NAME_TO_SPEECH_LOCALE[appLanguage]) {
            initialLocale = NAME_TO_SPEECH_LOCALE[appLanguage];
        }
        setCurrentLang(initialLocale);

        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('not-supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = initialLocale;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            resetAutoCloseTimer();
        };

        recognition.onresult = (event: any) => {
            resetAutoCloseTimer();
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (final) {
                setTranscript(prev => prev + final);
                // Check voice command
                const isCommand = handleVoiceCommand(final);
                if (!isCommand && callbackRef.current) {
                    callbackRef.current(final);
                    // Close overlay after a small delay to let user see final result
                    setTimeout(() => closeOverlay(), 1000);
                }
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setError(event.error);
            setIsListening(false);
            if (autoCloseTimeoutRef.current) {
                clearTimeout(autoCloseTimeoutRef.current);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start speech recognition', e);
            setError('audio-capture');
        }
    }, [appLanguage, handleVoiceCommand, closeOverlay, resetAutoCloseTimer]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // Change recognition language on-the-fly
    const changeLanguage = useCallback((locale: string) => {
        setCurrentLang(locale);
        setError(null);
        setTranscript('');
        setInterimTranscript('');

        // Stop current recognition and restart with new lang
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
        }

        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = locale;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            resetAutoCloseTimer();
        };

        recognition.onresult = (event: any) => {
            resetAutoCloseTimer();
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (final) {
                setTranscript(prev => prev + final);
                const isCommand = handleVoiceCommand(final);
                if (!isCommand && callbackRef.current) {
                    callbackRef.current(final);
                    setTimeout(() => closeOverlay(), 1000);
                }
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (e) {
            setError('audio-capture');
        }
    }, [handleVoiceCommand, closeOverlay, resetAutoCloseTimer]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            if (autoCloseTimeoutRef.current) {
                clearTimeout(autoCloseTimeoutRef.current);
            }
        };
    }, []);

    const activeSpeechLocaleName = SPEECH_LOCALE_TO_NAME[currentLang] || currentLang;

    return (
        <VoiceSearchContext.Provider
            value={{
                isListening,
                isOpen,
                transcript,
                interimTranscript,
                currentLang,
                error,
                startListening,
                stopListening,
                changeLanguage
            }}
        >
            {children}

            {isOpen && (
                <div className="vs-overlay-wrapper">
                    <div className="vs-backdrop" onClick={closeOverlay} />
                    <div className="vs-modal">
                        {/* Close button */}
                        <button className="vs-close-btn" onClick={closeOverlay} title="Close Voice Search">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="vs-content">
                            {/* Listening / Microphone Wave Section */}
                            <div className="vs-mic-section">
                                <div className={`vs-mic-circle-glow ${isListening ? 'listening' : ''}`} onClick={() => isListening ? stopListening() : changeLanguage(currentLang)}>
                                    <div className="vs-mic-pulse-wave ring1" />
                                    <div className="vs-mic-pulse-wave ring2" />
                                    <div className="vs-mic-circle">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="vs-status-text">
                                    {commandMessage ? (
                                        <span className="vs-command-msg">{commandMessage}</span>
                                    ) : error ? (
                                        <span className="vs-error-msg">
                                            {error === 'not-allowed' && 'Microphone access denied. Please allow mic permissions.'}
                                            {error === 'no-speech' && 'No speech detected. Click the mic to try again.'}
                                            {error === 'not-supported' && 'Speech recognition is not supported in this browser.'}
                                            {error !== 'not-allowed' && error !== 'no-speech' && error !== 'not-supported' && `Error: ${error}`}
                                        </span>
                                    ) : isListening ? (
                                        <span>Listening in <strong style={{ color: 'var(--primary-color)' }}>{activeSpeechLocaleName}</strong>...</span>
                                    ) : (
                                        <span>Speech Recognition Stopped</span>
                                    )}
                                </div>
                            </div>

                            {/* Transcript Box */}
                            <div className="vs-transcript-container">
                                {transcript || interimTranscript ? (
                                    <div className="vs-transcript-text">
                                        <span className="vs-final-text">{transcript}</span>
                                        <span className="vs-interim-text"> {interimTranscript}</span>
                                    </div>
                                ) : (
                                    <div className="vs-placeholder-text">
                                        {error ? 'Please try again' : 'Say something like "wireless bluetooth headphones"...'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </VoiceSearchContext.Provider>
    );
};

export const useVoiceSearch = () => {
    const context = useContext(VoiceSearchContext);
    if (context === undefined) {
        throw new Error('useVoiceSearch must be used within a VoiceSearchProvider');
    }
    return context;
};
