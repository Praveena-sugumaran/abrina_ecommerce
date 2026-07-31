import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://b2b.sangvish.com/api",
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor to handle 401s, 451s and log errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Only log unexpected errors to console to avoid Next.js dev overlays for handled cases
            if (error.response.status !== 401 && error.response.status !== 409 && error.response.status !== 451) {
                console.warn(`[AXIOS ERROR] ${error.config.method.toUpperCase()} ${error.config.url} failed with ${error.response.status}`);
                console.warn(`[AXIOS RESPONSE DATA]:`, error.response.data);
            }
            
            if (typeof window !== 'undefined') {
                if (error.response.status === 451) {
                    const data = error.response.data || {};
                    const currentPath = window.location.pathname;
                    if (data.isInstalled === false) {
                        if (currentPath !== '/install') {
                            window.location.href = '/install';
                        }
                    } else {
                        window.dispatchEvent(new CustomEvent('refreshSiteSettings'));
                    }
                } else if (error.response.status === 401) {
                    const url = error.config.url || '';
                    // Do not trigger logout/redirect for login, register, verify-otp, or initial non-critical auth checks
                    const excludedUrls = ['/auth/login', '/auth/verify-otp', '/auth/register', '/auth/profile', '/auth/supplier/stats', '/admin/menu'];
                    const isExcluded = excludedUrls.some(endpoint => url.includes(endpoint));

                    if (!isExcluded) {
                        const token = localStorage.getItem('token');
                        // Only perform forced logout if a token was actually present (meaning an active session expired)
                        if (token) {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            if (window.location.pathname.startsWith('/admin')) {
                                window.location.href = '/admin/login';
                            } else {
                                window.location.href = '/'; // Redirect to home/login
                            }
                        }
                    }
                }
            }
        } else {
            console.warn(`[AXIOS NETWORK ERROR] ${error.config?.url}:`, error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
