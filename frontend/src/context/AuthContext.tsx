import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { translations } from '@/utils/translations';

export interface SiteSettings {
    site_name?: string;
    favicon?: string;
    keywords?: string;
    logo_light?: string;
    logo_dark?: string;
    seo_title?: string;
    meta_description?: string;
    default_currency?: string;
    default_language?: string;
    price_format?: 'prefix' | 'suffix';
    contact_email?: string;
    contact_phone?: string;
    google_maps_api_key?: string;
    google_maps_enabled?: boolean;
    enable_recaptcha?: boolean;
    recaptcha_site_key?: string;
    enable_mobile_verification?: boolean;
    pagination_limit?: number;
    chatbot_enabled?: boolean;
    is_installed?: boolean;
    license_status?: 'active' | 'inactive' | 'development';
    maintenance_mode?: boolean;
    live_stream_enabled?: boolean;
    rfq_enabled?: boolean;
    zego_app_id?: string;
    zego_server_secret?: string;
    customer_login_banner?: string;
    customer_login_text?: string;
    seller_login_banner?: string;
    seller_login_text?: string;
    customer_register_banner?: string;
    customer_register_text?: string;
    seller_register_banner?: string;
    seller_register_text?: string;
    gift_wrap_fee?: number | string;
    footer_description?: string;
    facebook_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
    youtube_url?: string;
    copyright?: string;
}

export interface AuthContextType {
    authModal: {
        isOpen: boolean;
        mode: string;
        role: string;
    };
    setAuthModal: React.Dispatch<React.SetStateAction<any>>;
    openLogin: (options?: any) => void;
    openRegister: (options?: any) => void;
    closeAuthModal: () => void;
    user: any;
    currentRole: string;
    setCurrentRole: (role: string) => void;
    switchRole: (newRole: string) => void;
    login: (userData: any) => void;
    logout: () => void;
    language: string;
    currency: string;
    availableLanguages: any[];
    availableCurrencies: any[];
    availableCountries: any[];
    selectedCountry: string;
    setSelectedCountry: (code: string) => void;
    updateUserSettings: (newLang: string, newCurr: string) => Promise<void>;
    convertPrice: (priceInUSD: number) => { amount: string; symbol: string; formatted: string };
    refreshUser: () => Promise<void>;
    siteSettings: SiteSettings | null;
    refreshSiteSettings: () => void;
    t: (key: string) => string;
    isInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useRouter();
    const [authModal, setAuthModal] = useState<{
        isOpen: boolean;
        mode: string;
        role: string;
    }>({
        isOpen: false,
        mode: 'login', // 'login', 'email', 'role', 'otp', 'setup'
        role: 'buyer'
    });

    const openLogin = useCallback((options: any = {}) => {
        setAuthModal({ isOpen: true, mode: options.mode || 'login', role: options.role || 'buyer' });
    }, []);

    const openRegister = useCallback((options: any = {}) => {
        setAuthModal({ isOpen: true, mode: options.mode || 'auth_start', role: options.role || 'supplier' });
    }, []);

    const closeAuthModal = useCallback(() => {
        setAuthModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const [user, setUser] = useState<any>(null);
    const [currentRole, setCurrentRole] = useState('buyer');
    const [currency, setCurrency] = useState('USD');
    const [language, setLanguage] = useState('English');
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
    const [availableCountries, setAvailableCountries] = useState<any[]>([]);
    const [selectedCountry, setSelectedCountry] = useState('IN');
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [localStateInitialized, setLocalStateInitialized] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const refreshUser = useCallback(async () => {
        try {
            const res = await api.get('/auth/profile');
            if (res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
            }
        } catch (err) {
            console.error('Error fetching updated user:', err);
        }
    }, []);

    // Initialize from localStorage ONLY on client
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
            const storedToken = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('currentRole') : null);
            const storedLang = (typeof window !== 'undefined' ? localStorage.getItem('guest_language') : null);
            const storedCurr = (typeof window !== 'undefined' ? localStorage.getItem('guest_currency') : null);
            const storedCountry = (typeof window !== 'undefined' ? localStorage.getItem('selectedCountry') : null);

            let parsedUser = null;
            if (storedUser && storedToken) {
                try {
                    parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch (e) { }
            }

            if (storedRole) setCurrentRole(storedRole);
            else if (parsedUser) {
                const availableRoles = parsedUser.roles || (parsedUser.role ? [parsedUser.role] : []);
                const defaultRole = availableRoles[0] || 'buyer';
                setCurrentRole(defaultRole);
                localStorage.setItem('currentRole', defaultRole);
            }

            if (storedLang) setLanguage(storedLang);
            if (storedCurr) setCurrency(storedCurr);
            if (storedCountry) setSelectedCountry(storedCountry);

            setLocalStateInitialized(true);
        }
    }, []);

    const switchRole = (newRole: string) => {
        setCurrentRole(newRole);
        localStorage.setItem('currentRole', newRole);

        // Redirect based on role
        if (newRole === 'supplier') {
            navigate.push('/supplier/dashboard');
        } else if (newRole === 'buyer') {
            navigate.push('/buyer/dashboard');
        } else if (newRole === 'admin') {
            navigate.push('/admin/dashboard');
        } else {
            navigate.push('/');
        }
    };

    const t = (key: string) => {
        const currentLangObj = availableLanguages.find((l: any) => l.name === language);
        if (currentLangObj && currentLangObj.translations && currentLangObj.translations[key]) {
            return currentLangObj.translations[key];
        }
        const trans = translations as any;
        if (trans[language]?.[key]) return trans[language][key];
        if (trans['English']?.[key]) return trans['English'][key];
        return key;
    };

    useEffect(() => {
        const langObj = availableLanguages.find(l => l.name === language);
        if (langObj && langObj.direction) {
            document.documentElement.dir = langObj.direction;
        } else {
            document.documentElement.dir = 'ltr';
        }
    }, [language, availableLanguages]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [langRes, currRes, countriesRes, siteRes] = await Promise.allSettled([
                    api.get('/common/languages'),
                    api.get('/common/currencies'),
                    api.get('/auth/countries'),
                    api.get('/site-settings/public')
                ]);

                if (langRes.status === 'fulfilled' && langRes.value.data) setAvailableLanguages(langRes.value.data);
                if (currRes.status === 'fulfilled' && currRes.value.data) setAvailableCurrencies(currRes.value.data);
                if (countriesRes.status === 'fulfilled' && countriesRes.value.data) setAvailableCountries(countriesRes.value.data);

                const siteData = siteRes.status === 'fulfilled' ? siteRes.value.data : null;
                if (siteData) {
                    setSiteSettings(siteData);

                    if (siteData.primary_color && typeof window !== 'undefined') {
                        localStorage.setItem('primary_color', siteData.primary_color);
                        document.documentElement.style.setProperty('--primary-color', siteData.primary_color);
                        document.documentElement.style.setProperty('--primary', siteData.primary_color);
                        document.documentElement.style.setProperty('--sp-primary', siteData.primary_color);
                        document.documentElement.style.setProperty('--clr-primary', siteData.primary_color);

                        const secColor = siteData.secondary_color || '';
                        localStorage.setItem('secondary_color', secColor);
                        document.documentElement.style.setProperty('--secondary-color', secColor);

                        const btnGradient = secColor 
                            ? `linear-gradient(135deg, ${siteData.primary_color}, ${secColor})`
                            : siteData.primary_color;
                        document.documentElement.style.setProperty('--button-gradient', btnGradient);
                    }

                    if (!user) {
                        if (!(typeof window !== 'undefined' ? localStorage.getItem('guest_currency') : null)) {
                            setCurrency(siteData.default_currency || 'USD');
                        }
                        if (!(typeof window !== 'undefined' ? localStorage.getItem('guest_language') : null)) {
                            setLanguage(siteData.default_language || 'English');
                        }
                    }
                } else if (!siteSettings) {
                    setSiteSettings({ site_name: 'B2B Marketplace', is_installed: true, license_status: 'development' });
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
                if (!siteSettings) {
                    setSiteSettings({ site_name: 'B2B Marketplace', is_installed: true, license_status: 'development' });
                }
            } finally {
                setIsInitialized(true);
            }
        };

        if (localStateInitialized) {
            fetchSettings();
            if (user?._id) {
                refreshUser();
            }
        }

        const refreshSettingsHandler = () => fetchSettings();
        if (typeof window !== 'undefined') {
            window.addEventListener('refreshSiteSettings', refreshSettingsHandler);
            window.addEventListener('wishlistUpdated', refreshUser);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('refreshSiteSettings', refreshSettingsHandler);
                window.removeEventListener('wishlistUpdated', refreshUser);
            }
        };
    }, [user?._id, localStateInitialized]);

    const updateUserSettings = async (newLang: string, newCurr: string) => {
        try {
            if (user) {
                await api.put('/auth/update-profile', { language: newLang, currency: newCurr });
                const updatedUser = { ...user, language: newLang, currency: newCurr };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            } else {
                localStorage.setItem('guest_language', newLang);
                localStorage.setItem('guest_currency', newCurr);
            }
            setLanguage(newLang);
            setCurrency(newCurr);
        } catch (err) {
            console.error('Error updating settings:', err);
        }
    };

    const convertPrice = (priceInUSD: number) => {
        const curr = availableCurrencies.find(c => c.code === currency);
        const rate = curr ? curr.exchange_rate : 1;
        const symbol = curr ? curr.symbol : '$';
        const convertedAmount = priceInUSD * rate;
        const hasFraction = convertedAmount % 1 !== 0;
        const amount = convertedAmount.toLocaleString(undefined, { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 });
        const isSuffix = siteSettings?.price_format === 'suffix';
        const formatted = isSuffix ? `${amount}${symbol}` : `${symbol}${amount}`;

        return {
            amount: (priceInUSD * rate).toFixed(2),
            symbol,
            formatted
        };
    };

    const login = (userData: any) => {
        const userToStore = userData.user || userData;
        localStorage.setItem('user', JSON.stringify(userToStore));
        if (userData.token) {
            localStorage.setItem('token', userData.token);
        }
        setUser(userToStore);

        const availableRoles = userToStore.roles || (userToStore.role ? [userToStore.role] : []);
        // Preserve current role if it's still available, otherwise default to the first one
        if (!currentRole || !availableRoles.includes(currentRole)) {
            const defaultRole = availableRoles[0] || 'buyer';
            setCurrentRole(defaultRole);
            localStorage.setItem('currentRole', defaultRole);
        }

        const newCurr = userToStore.currency || (typeof window !== 'undefined' ? localStorage.getItem('guest_currency') : null) || 'USD';
        const newLang = userToStore.language || (typeof window !== 'undefined' ? localStorage.getItem('guest_language') : null) || 'English';

        setCurrency(newCurr);
        setLanguage(newLang);
        if (userToStore.country_code) {
            setSelectedCountry(userToStore.country_code);
            localStorage.setItem('selectedCountry', userToStore.country_code);
        }
    };

    const logout = () => {
        const availableRoles = user?.roles || (user?.role ? [user.role] : []);
        const isAdmin = availableRoles.includes('admin');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentRole');
        setAuthModal({ isOpen: false, mode: 'login', role: 'buyer' });
        setUser(null);
        setCurrentRole('buyer');
        if (isAdmin) {
            window.location.href = '/admin/login';
        } else {
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{
            authModal,
            setAuthModal,
            openLogin,
            openRegister,
            closeAuthModal,
            user,
            currentRole,
            setCurrentRole,
            switchRole,
            login,
            logout,
            language,
            currency,
            availableLanguages,
            availableCurrencies,
            availableCountries,
            selectedCountry,
            setSelectedCountry: (code: string) => {
                setSelectedCountry(code);
                localStorage.setItem('selectedCountry', code);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('countryChanged', { detail: code }));
                }
            },
            updateUserSettings,
            convertPrice,
            siteSettings,
            refreshSiteSettings: () => window.dispatchEvent(new CustomEvent('refreshSiteSettings')),
            t,
            isInitialized,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
