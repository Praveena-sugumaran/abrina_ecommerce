'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import GoogleAddressAutocomplete from '@/components/js/GoogleAddressAutocomplete';

const SupplierRegister = () => {
    const { user, openRegister, login, switchRole } = useAuth();
    const navigate = useRouter();
    const [formData, setFormData] = useState<any>({
        company_name: '',
        business_type: '',
        address_line1: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        website: '',
        description: '',
        staff_size: '',
        annual_revenue: '',
        tax_id: '',
        phone: '',
        phone_country: ''
    });
    const [businessTypes, setBusinessTypes] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [idProof, setIdProof] = useState<File | null>(null);

    useEffect(() => {
        if (!user) {
            openRegister({ mode: 'register' });
            navigate.replace('/');
        } else if ((user.roles?.includes('supplier') || user.role === 'supplier') && user.status === 'active') {
            navigate.replace('/supplier/dashboard');
        } else {
            api.get('/auth/business-types').then(({ data }) => setBusinessTypes(data)).catch(() => { });
            api.get('/common/countries').then(({ data }) => setCountries(data)).catch(() => { });
        }
    }, [user, openRegister, navigate]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCountryChange = async (e: any) => {
        const countryId = e.target.value;
        const selectedCountry: any = countries.find((c: any) => c._id === countryId);
        if (selectedCountry) {
            setFormData((prev: any) => ({ ...prev, country: selectedCountry.name, state: '' }));
            try {
                const { data } = await api.get(`/common/states/${countryId}`);
                setStates(data);
            } catch (err: any) {
                console.error('Failed to fetch states:', err);
                setStates([]);
            }
        }
    };

    const handleAddressSelect = async (data: any) => {
        setFormData((prev: any) => ({
            ...prev,
            address_line1: data.addressLine || data.formatted_address,
            city: data.city || prev.city,
            zip_code: data.postalCode || prev.zip_code,
        }));

        if (data.country) {
            const matchedCountry: any = countries.find((c: any) =>
                c.countryCode === data.country ||
                c.name.toLowerCase() === data.country.toLowerCase()
            );

            if (matchedCountry) {
                setFormData((prev: any) => ({ ...prev, country: matchedCountry.name }));
                try {
                    const { data: stateData } = await api.get(`/common/states/${matchedCountry._id}`);
                    setStates(stateData);
                    if (data.state) {
                        const matchedState = stateData.find((s: any) => s.name.toLowerCase() === data.state.toLowerCase());
                        if (matchedState) {
                            setFormData((prev: any) => ({ ...prev, state: matchedState.name }));
                        }
                    }
                } catch (err: any) {
                    console.error('Failed to fetch states during autocomplete:', err);
                }
            }
        }
    };

    const handleFileChange = (e: any) => {
        setIdProof(e.target.files?.[0]);
    };

    const handleTypeChange = (typeName: any) => {
        setFormData({ ...formData, business_type: typeName });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        
        // Robust Validation
        if (!formData.company_name.trim()) return setError('Company name is required');
        if (!formData.business_type) return setError('Please select a business type');
        if (!formData.phone.trim()) return setError('Phone number is required');
        if (!/^\d{7,15}$/.test(formData.phone)) return setError('Invalid phone number format (7-15 digits)');
        if (!formData.state) return setError('State/Province is required');
        if (!idProof) return setError('Please upload an ID proof document');

        setLoading(true);
        try {
            const dataToSubmit = new FormData();
            Object.keys(formData).forEach(key => {
                dataToSubmit.append(key, formData[key]);
            });

            if (idProof) {
                dataToSubmit.append('id_proof', idProof);
            }

            const { data } = await api.post('/auth/become-supplier', dataToSubmit, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                login(data.user);
                navigate.replace('/supplier/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update to supplier role');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    if ((user.roles?.includes('supplier') || user.role === 'supplier') && user.status === 'profile_submitted') {
        return (
            <div className="supplier-onboarding-wrapper" style={{ padding: '60px 20px', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="onboarding-card" style={{ maxWidth: '600px', width: '100%', backgroundColor: '#fff', borderRadius: '24px', padding: '48px', boxShadow: '0 30px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                    <div style={{ marginBottom: '30px' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <svg width="40" height="40" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '28px', color: 'var(--primary-color)', fontWeight: '900', marginBottom: '10px' }}>Profile Under Review</h2>
                        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6' }}>
                            Thank you for submitting your company profile. Our team is currently verifying your documents. You will be notified once your account is verified.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate.push('/supplier/dashboard')}
                        style={{ width: '100%', height: '54px', backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="supplier-onboarding-wrapper" style={{ padding: '60px 20px', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="onboarding-card" style={{ maxWidth: '800px', width: '100%', backgroundColor: '#fff', borderRadius: '24px', padding: '48px', boxShadow: '0 30px 60px rgba(0,0,0,0.08)' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--primary-color)', marginBottom: '16px' }}>Become a Supplier</h1>
                    <p style={{ color: '#64748b', fontSize: '18px', maxWidth: '500px', margin: '0 auto' }}>Join the world's largest B2B marketplace. Complete your profile to get started.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', color: 'var(--primary-color)', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            Company Information
                        </h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>Legal Company Name</label>
                            <input
                                type="text"
                                name="company_name"
                                required
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="As per registration documents"
                                style={{ width: '100%', height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontSize: '15px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '12px', fontSize: '14px' }}>Business Type</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {businessTypes.map((type: any) => (
                                    <div key={type._id}
                                        onClick={() => handleTypeChange(type.name)}
                                        style={{
                                            padding: '8px 16px',
                                            border: '1.5px solid',
                                            borderColor: formData.business_type === type.name ? 'var(--primary-color)' : '#cbd5e1',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            backgroundColor: formData.business_type === type.name ? 'rgba(255, 102, 0, 0.05)' : '#fff',
                                            color: formData.business_type === type.name ? 'var(--primary-color)' : '#64748b',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}>
                                        {type.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>Staff Size</label>
                                <select
                                    name="staff_size"
                                    required
                                    value={formData.staff_size}
                                    onChange={handleChange}
                                    style={{ width: '100%', height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontSize: '15px' }}
                                >
                                    <option value="">Select Size</option>
                                    <option value="1-5 staff">1-5 staff</option>
                                    <option value="5-50 staff">5-50 staff</option>
                                    <option value="50-100 staff">50-100 staff</option>
                                    <option value="100-500 staff">100-500 staff</option>
                                    <option value="500+ staff">500+ staff</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>Annual Revenue</label>
                                <select
                                    name="annual_revenue"
                                    required
                                    value={formData.annual_revenue}
                                    onChange={handleChange}
                                    style={{ width: '100%', height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontSize: '15px' }}
                                >
                                    <option value="">Select Revenue</option>
                                    <option value="Below $100k">Below $100k</option>
                                    <option value="$100k - $1M">$100k - $1M</option>
                                    <option value="$1M - $10M">$1M - $10M</option>
                                    <option value="$10M - $50M">$10M - $50M</option>
                                    <option value="Above $50M">Above $50M</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>Contact Phone Number</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <select
                                    name="phone_country"
                                    value={formData.phone_country || ''}
                                    onChange={handleChange}
                                    style={{ width: '120px', height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', backgroundColor: '#fff' }}
                                >
                                    <option value="">Code</option>
                                    {countries.map((c: any) => (
                                        <option key={c._id} value={c.name}>{c.code} {c.dial_code}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    name="phone"
                                    required
                                    value={formData.phone || ''}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        const country: any = countries.find((c: any) => c.name === formData.phone_country);
                                        const maxLen = country ? country.phone_length : 15;
                                        if (val.length <= maxLen) setFormData({ ...formData, phone: val });
                                    }}
                                    placeholder="Phone Number"
                                    style={{ flex: 1, height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontSize: '15px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '12px', fontSize: '14px' }}>Business Address</label>
                            <div style={{
                                backgroundColor: '#fff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '16px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Street Address</label>
                                    <GoogleAddressAutocomplete
                                        onAddressSelect={handleAddressSelect}
                                        placeholder="Enter your street address"
                                        className="supplier-address-input-v2"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>City</label>
                                        <input type="text" name="city" required placeholder="City" value={formData.city} onChange={handleChange} style={{ width: '100%', height: '45px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>State / Province</label>
                                        <select
                                            name="state"
                                            required
                                            value={formData.state}
                                            onChange={handleChange}
                                            style={{ width: '100%', height: '45px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#fff' }}
                                            disabled={!formData.country}
                                        >
                                            <option value="">Select State</option>
                                            {states.map((s: any) => <option key={s._id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Country</label>
                                        <select
                                            name="country_id"
                                            required
                                            onChange={handleCountryChange}
                                            value={(countries.find((c: any) => c.name === formData.country) as any)?._id || ''}
                                            style={{ width: '100%', height: '45px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#fff' }}
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', color: 'var(--primary-color)', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Verification Documents
                        </h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>Upload ID Proof (ID Card / Passport / Business License)</label>
                            <input
                                type="file"
                                required
                                onChange={handleFileChange}
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ width: '100%', padding: '10px', border: '1.5px dashed #cbd5e1', borderRadius: '10px', backgroundColor: '#fff' }}
                            />
                            <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>Accepted formats: PDF, JPG, PNG. Max size: 5MB.</p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px', fontSize: '14px' }}>GST / Tax Identification Number</label>
                            <input
                                type="text"
                                name="tax_id"
                                value={formData.tax_id || ''}
                                onChange={handleChange}
                                placeholder="Enter Tax ID"
                                style={{ width: '100%', height: '50px', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontSize: '15px' }}
                            />
                        </div>
                    </div>

                    {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: '600', fontSize: '14px', textAlign: 'center', border: '1px solid #fee2e2' }}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', height: '64px', backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(255,102,0,0.2)' }}
                    >
                        {loading ? 'Submitting Application...' : 'Complete Supplier Onboarding'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '13px' }}>
                        By joining, you agree to our <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Terms of Service</span> and <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Supplier Agreement</span>.
                    </p>
                </form>
            </div>
            <style jsx>{`
                :global(.supplier-address-input-v2) {
                    width: 100% !important;
                    height: 48px !important;
                    border: 1.5px solid #e2e8f0 !important;
                    border-radius: 10px !important;
                    padding: 0 16px !important;
                    font-size: 15px !important;
                    transition: all 0.2s !important;
                    background-color: #fff !important;
                }
                :global(.supplier-address-input-v2:focus) {
                    outline: none !important;
                    border-color: var(--primary-color) !important;
                    box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default SupplierRegister;

