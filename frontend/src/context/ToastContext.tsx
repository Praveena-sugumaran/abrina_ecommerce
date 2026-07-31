import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'loading';
    title?: string;
    exiting?: boolean;
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info' | 'loading', title?: string) => number;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => removeToast(id), 300);
    }, [removeToast]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' | 'loading' = 'success', title = '') => {
        const id = Date.now() + Math.random();
        const newToast: Toast = { id, message, type, title };

        setToasts(prev => {
            // Remove any existing loading toast or identical message to prevent double toasts
            const filtered = prev.filter(t => (type !== 'loading' ? t.type !== 'loading' : true) && t.message !== message);
            return [...filtered, newToast];
        });

        // Auto remove after 4 seconds for non-loading toasts
        if (type !== 'loading') {
            setTimeout(() => {
                dismissToast(id);
            }, 4000);
        }

        return id;
    }, [dismissToast]);

    return (
        <ToastContext.Provider value={{ showToast: addToast, dismissToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => {
                    let icon = null;
                    if (toast.type === 'success') icon = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>;
                    if (toast.type === 'error') icon = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
                    if (toast.type === 'warning' || toast.type === 'info') icon = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                    if (toast.type === 'loading') {
                        icon = (
                            <svg className="toast-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" fill="none" strokeLinecap="round" />
                            </svg>
                        );
                    }

                    return (
                        <div 
                            key={toast.id} 
                            className={`toast-item ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
                        >
                            <div className="toast-icon">{icon}</div>
                            <div className="toast-content">
                                {toast.title && <div className="toast-title">{toast.title}</div>}
                                <div className="toast-message-text">{toast.message}</div>
                            </div>
                            <div className="toast-close" onClick={() => dismissToast(toast.id)}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="toast-progress-bar" />
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

