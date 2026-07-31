'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import '@/components/css/AuthRegistry.css';

const styles = new Proxy<Record<string, string>>({}, {
    get: (target, prop) => {
        if (prop === 'register-title') return 'register-title-v2';
        if (prop === 'reg-btn-primary') return 'reg-btn-primary-v2';
        return typeof prop === 'string' ? prop : '';
    }
});

const STEPS = {
    ROLE: 'role',
    SETUP: 'setup',
    BUSINESS: 'business'
};

const SocialRegister = () => {
    const location = usePathname();
    const navigate = useRouter();
    const { login } = useAuth();
    const searchParams = useSearchParams();

    const [step, setStep] = useState(STEPS.ROLE);
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form States (Pre-filled from token later)
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('buyer');
    const [selectedCountry, setSelectedCountry] = useState('IN');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [businessType, setBusinessType] = useState<string[]>([]);
    const [stateProvince, setStateProvince] = useState('');

    // Data States
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [businessTypes, setBusinessTypes] = useState<any[]>([]);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(searchParams?.toString());
        const t = params.get('token');
        if (!t) {
            navigate.push('/login');
            return;
        }
        setToken(t);

        // Decode token to get pre-fill data (JWT is base64 encoded in middle part)
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);

            setEmail(decoded.email || '');
            const names = (decoded.name || '').split(' ');
            setFirstName(names[0] || '');
            setLastName(names.slice(1).join(' ') || '');
        } catch (e) {
            console.error('Error decoding token', e);
        }

        // Fetch Initial Data
        api.get('/auth/countries').then(({ data }: any) => {
            setCountries(data);
            const india = data.find((c: any) => c.code === 'IN');
            if (india) setSelectedCountry('IN');
        }).catch(() => { });

        api.get('/auth/business-types').then(({ data }: any) => {
            setBusinessTypes(data);
        }).catch(() => { });
    }, [location, navigate]);

    useEffect(() => {
        if (selectedCountry) {
            api.get(`/auth/states/${selectedCountry}`)
                .then(({ data }: any) => {
                    setStates(data);
                    setStateProvince('');
                })
                .catch(() => { setStates([]); });
        }
    }, [selectedCountry]);

    const handleRoleContinue = () => {
        setStep(STEPS.SETUP);
    };

    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Basic validation
        if (!firstName.trim()) return setError('First name is required');
        if (!lastName.trim()) return setError('Last name is required');
        if (!phoneNumber.trim()) return setError('Phone number is required');
        if (!/^\d{7,15}$/.test(phoneNumber.replace(/\s+/g, ''))) return setError('Invalid phone number format');
        if (!stateProvince.trim()) return setError('State/Province is required');
        if (role === 'supplier' && !companyName.trim()) return setError('Company name is required');

        if (!agreed) return setError('Please agree to terms.');

        if (role === 'supplier') {
            setStep(STEPS.BUSINESS);
        } else {
            await finalizeRegistration({ state: stateProvince });
        }
    };

    const finalizeRegistration = async (businessData = {}) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/social-register', {
                token,
                role,
                first_name: firstName,
                last_name: lastName,
                country_code: selectedCountry,
                phone_number: phoneNumber,
                company_name: role === 'supplier' ? companyName : '',
                state: stateProvince,
                ...businessData
            });

            if (res.data.success) {
                if (login) {
                    login(res.data);
                } else {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    window.location.href = '/dashboard';
                }
                navigate.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await finalizeRegistration({
            business_type: businessType,
            state: stateProvince
        });
    };

    return (
        <div className={styles['register-page']}>
            <div className={styles['register-card'] + " " + styles['fade-in']}>

                {/* ─── ROLE STEP ─── */}
                {step === STEPS.ROLE && (
                    <>
                        <h2 className={styles['register-title']}>Which account would you like to create?</h2>
                        <div className={styles['role-options']}>
                            <label className={`role-card premium-card ${role === 'buyer' ? 'selected' : ''}`}>
                                <input type="radio" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} />
                                <div className={styles['role-radio-dot']}></div>
                                <div className={styles['role-info']}>
                                    <strong>Buyer</strong>
                                    <p>Find global suppliers and products for your business.</p>
                                </div>
                            </label>
                            <label className={`role-card premium-card ${role === 'supplier' ? 'selected' : ''}`}>
                                <input type="radio" value="supplier" checked={role === 'supplier'} onChange={() => setRole('supplier')} />
                                <div className={styles['role-radio-dot']}></div>
                                <div className={styles['role-info']}>
                                    <strong>Supplier</strong>
                                    <p>Reach millions of buyers and grow your global presence.</p>
                                </div>
                            </label>
                        </div>
                        <button className={styles['reg-btn-primary'] + " " + styles['orange-btn']} onClick={handleRoleContinue}>Continue</button>
                    </>
                )}

                {/* ─── SETUP STEP ─── */}
                {step === STEPS.SETUP && (
                    <>
                        <h2 className={styles['register-title']}>Complete your profile</h2>
                        <form onSubmit={handleSetupSubmit}>
                            <div className={styles['name-row']}>
                                <div className={styles['float-input-wrap']}>
                                    <input type="text" className={styles['float-input']} placeholder=" " value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                    <label className={styles['float-label']}>First name</label>
                                </div>
                                <div className={styles['float-input-wrap']}>
                                    <input type="text" className={styles['float-input']} placeholder=" " value={lastName} onChange={e => setLastName(e.target.value)} required />
                                    <label className={styles['float-label']}>Last name</label>
                                </div>
                            </div>

                            {role === 'supplier' && (
                                <div className={styles['float-input-wrap'] + " " + styles['mt-1']}>
                                    <input type="text" className={styles['float-input']} placeholder=" " value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                    <label className={styles['float-label']}>Company name</label>
                                </div>
                            )}

                            <div className={styles['phone-row'] + " " + styles['mt-1']}>
                                <div className={styles['float-input-wrap']} style={{ width: '100px', marginBottom: 0 }}>
                                    <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className={styles['float-select']}>
                                        {countries.map(c => (
                                            <option key={c._id} value={c.code}>
                                                {c.flag} {c.dial_code}
                                            </option>
                                        ))}
                                    </select>
                                    <label className={styles['float-label-active']}>Code</label>
                                </div>
                                <div className={styles['float-input-wrap'] + " " + styles['flex-1'] + " " + styles['no-margin']}>
                                    <input type="tel" className={styles['float-input']} placeholder=" " value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required autoComplete="off" />
                                    <label className={styles['float-label']}>Phone number</label>
                                </div>
                            </div>

                            <div className={styles['float-input-wrap'] + " " + styles['mt-1']}>
                                {states && states.length > 0 ? (
                                    <select
                                        className={styles['float-select']}
                                        value={stateProvince}
                                        onChange={e => setStateProvince(e.target.value)}
                                        required
                                    >
                                        <option value="">Select State/Province</option>
                                        {states.map(s => (
                                            <option key={s._id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" className={styles['float-input']} placeholder=" " value={stateProvince} onChange={e => setStateProvince(e.target.value)} required autoComplete="off" />
                                )}
                                <label className={styles['float-label-active']}>State/province</label>
                            </div>

                            <label className={styles['terms-row']}>
                                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
                                <span>Agree to <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</span>
                            </label>

                            {error && <p className={styles['reg-error']}>{error}</p>}
                            <div className={styles['d-flex'] + " " + styles['gap-1']}>
                                <button type="button" className={styles['reg-btn-secondary']} style={{ width: '120px' }} onClick={() => setStep(STEPS.ROLE)}>Back</button>
                                <button type="submit" className={styles['reg-btn-primary'] + " " + styles['blue-btn'] + " " + styles['flex-1']} disabled={loading}>
                                    {loading ? 'Processing...' : (role === 'supplier' ? 'Next' : 'Finish & Explore')}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* ─── BUSINESS STEP ─── */}
                {step === STEPS.BUSINESS && (
                    <>
                        <h2 className={styles['register-title']}>Tell us more about your business</h2>
                        <form onSubmit={handleBusinessSubmit}>
                            <div className={styles['business-type-options']}>
                                {businessTypes.map(type => (
                                    <label key={type._id} className={`business-type-card ${businessType.includes(type.name) ? 'checked' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={businessType.includes(type.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) setBusinessType([...businessType, type.name]);
                                                else setBusinessType(businessType.filter(item => item !== type.name));
                                            }}
                                        />
                                        <span>{type.name}</span>
                                    </label>
                                ))}
                            </div>

                            {/* State moved to Setup */}

                            {error && <p className={styles['reg-error']}>{error}</p>}
                            <div className={styles['d-flex'] + " " + styles['gap-1']}>
                                <button type="button" className={styles['reg-btn-secondary']} style={{ width: '120px' }} onClick={() => setStep(STEPS.SETUP)}>Back</button>
                                <button type="submit" className={styles['reg-btn-primary'] + " " + styles['blue-btn'] + " " + styles['flex-1']} disabled={loading}>
                                    {loading ? 'Creating...' : 'Complete Registration'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default SocialRegister;
