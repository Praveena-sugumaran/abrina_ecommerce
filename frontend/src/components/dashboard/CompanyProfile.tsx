import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/axiosConfig';
import styles from './CompanyProfile.module.css';
import { getImgUrl } from '@/utils/imageConfig';
import GoogleAddressAutocomplete from '@/components/js/GoogleAddressAutocomplete';

const CompanyProfile = () => {
    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const docInputRef = useRef<HTMLInputElement | null>(null);
    const bannerInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);

    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);

    const [companyData, setCompanyData] = useState<any>({
        company_name: '',
        business_type: '',
        country: '',
        state: '',
        city: '',
        address: '',
        website: '',
        phone: '',
        phone_country: '',
        mobile: '',
        mobile_country: '',
        description: '',
        logo: '',
        document: '',
        banner_image: '',
        staff_size: '',
        factory_area: '',
        annual_revenue: '',
        capabilities: '',
        certifications: '',
        tax_id: '',
        id_proof: '',
        verification_status: 'pending',
        rejection_reason: '',
        split_payment_enabled: false
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');
    const [videoPreview, setVideoPreview] = useState('');
    const [businessTypes, setBusinessTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        fetchProfile();
        fetchBusinessTypes();
        fetchCountries();
    }, []);

    useEffect(() => {
        if (companyData.country && countries.length > 0) {
            const country = countries.find(c => c.name === companyData.country);
            if (country) {
                fetchStates(country._id);
            }
        }
    }, [companyData.country, countries]);

    const fetchCountries = async () => {
        try {
            const { data } = await api.get('/common/countries');
            setCountries(data);
        } catch (err) {
            console.error('Error fetching countries:', err);
        }
    };

    const fetchStates = async (countryId: any) => {
        try {
            const { data } = await api.get(`/common/states/${countryId}`);
            setStates(data);
        } catch (err: any) {
            console.error('Error fetching states:', err);
        }
    };

    const fetchBusinessTypes = async () => {
        try {
            const { data } = await api.get('/auth/business-types');
            setBusinessTypes(data);
        } catch (err: any) {
            console.error('Error fetching business types:', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/company/profile');
            if (data) {
                setCompanyData(data);
                if (data.logo) setLogoPreview(getImgUrl(data.logo));
                if (data.banner_image) setBannerPreview(getImgUrl(data.banner_image));
                if (data.video) setVideoPreview(getImgUrl(data.video));
            }
        } catch (err: any) {
            console.error('Error fetching company profile:', err);
        }
    };

    const handleCountryChange = async (e: any) => {
        const countryId = e.target.value;
        const selectedCountry: any = countries.find((c: any) => c._id === countryId);
        if (selectedCountry) {
            setCompanyData((prev: any) => ({ ...prev, country: selectedCountry.name, state: '' }));
            fetchStates(countryId);
        }
    };

    const handleAddressSelect = async (data: any) => {
        setCompanyData((prev: any) => ({
            ...prev,
            address: data.addressLine || data.formatted_address,
            city: data.city || prev.city
        }));

        if (data.country) {
            const matchedCountry: any = countries.find((c: any) => 
                c.countryCode === data.country || 
                c.name.toLowerCase() === data.country.toLowerCase()
            );
            
            if (matchedCountry) {
                setCompanyData((prev: any) => ({ ...prev, country: matchedCountry.name }));
                try {
                    const { data: stateData } = await api.get(`/common/states/${matchedCountry._id}`);
                    setStates(stateData);
                    if (data.state) {
                        const matchedState = stateData.find((s: any) => s.name.toLowerCase() === data.state.toLowerCase());
                        if (matchedState) {
                            setCompanyData((prev: any) => ({ ...prev, state: matchedState.name }));
                        }
                    }
                } catch (err: any) {
                    console.error('Failed to fetch states during autocomplete:', err);
                }
            }
        }
    };

    const handleLogoChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (event: any) => {
                if (event.target?.result) setLogoPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDocChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) setDocFile(file);
    };

    const handleBannerChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const reader = new FileReader();
            reader.onload = (event: any) => {
                if (event.target?.result) setBannerPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            const reader = new FileReader();
            reader.onload = (event: any) => {
                if (event.target?.result) setVideoPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const fd = new FormData();
            fd.append('company_name', companyData.company_name);
            fd.append('business_type', companyData.business_type);
            fd.append('country', companyData.country);
            fd.append('state', companyData.state);
            fd.append('city', companyData.city);
            fd.append('address', companyData.address);
            fd.append('website', companyData.website);
            fd.append('phone', companyData.phone);
            fd.append('phone_country', companyData.phone_country || companyData.country);
            fd.append('mobile', companyData.mobile);
            fd.append('mobile_country', companyData.mobile_country || companyData.country);
            fd.append('description', companyData.description);
            fd.append('staff_size', companyData.staff_size);
            fd.append('factory_area', companyData.factory_area);
            fd.append('annual_revenue', companyData.annual_revenue);
            fd.append('capabilities', companyData.capabilities);
            fd.append('certifications', companyData.certifications);
            fd.append('tax_id', companyData.tax_id);
            fd.append('id_proof', companyData.id_proof);
            fd.append('split_payment_enabled', companyData.split_payment_enabled);

            if (logoFile) fd.append('logo', logoFile);
            if (docFile) fd.append('document', docFile);
            if (bannerFile) fd.append('banner_image', bannerFile);
            if (videoFile) fd.append('video', videoFile);

            await api.post('/company/profile', fd);
            setSuccess('✅ Profile updated successfully! Verification is pending review.');
            fetchProfile();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['cp-container']} style={{ background: '#fff', boxShadow: 'none' }}>
            <div className={styles['cp-header-v2']}>
                <div className={styles['cp-header-left']}>
                    <h2>{'Company Profile'}</h2>
                    <p>Manage your business identity, verification documents, and branding assets.</p>
                </div>
                <div className={styles['cp-status-chip']}>
                    <div className={`${styles['status-indicator']} ${styles[companyData.verification_status]}`}></div>
                    <span className={styles['status-text']}>
                        {companyData.verification_status === 'verified' ? 'Verified Business' : 
                         companyData.verification_status === 'pending' ? 'Verification Pending' : 
                         companyData.verification_status === 'rejected' ? 'Verification Rejected' : 'Unverified'}
                    </span>
                </div>
            </div>

            {companyData.verification_status === 'rejected' && companyData.rejection_reason && (
                <div className={styles['cp-rejection-banner']}>
                    <div className={styles['rejection-icon']}>⚠️</div>
                    <div className={styles['rejection-body']}>
                        <strong>Verification Rejected:</strong> {companyData.rejection_reason}
                        <p>Please update the required information and resubmit for review.</p>
                    </div>
                </div>
            )}

            <div className={styles['cp-tabs-v2']}>
                <button 
                    type="button" 
                    className={`${styles['cp-tab-item']} ${activeTab === 'basic' ? styles['active'] : ''}`}
                    onClick={() => setActiveTab('basic')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    Basic Details
                </button>
                <button 
                    type="button" 
                    className={`${styles['cp-tab-item']} ${activeTab === 'location' ? styles['active'] : ''}`}
                    onClick={() => setActiveTab('location')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    Address
                </button>
                <button 
                    type="button" 
                    className={`${styles['cp-tab-item']} ${activeTab === 'stats' ? styles['active'] : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    Capability
                </button>
                <button 
                    type="button" 
                    className={`${styles['cp-tab-item']} ${activeTab === 'media' ? styles['active'] : ''}`}
                    onClick={() => setActiveTab('media')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Branding
                </button>
            </div>

            <form className={styles['cp-form']} onSubmit={handleSubmit}>
                {error && <div className={styles['cp-alert-error']}>{error}</div>}
                {success && <div className={styles['cp-alert-success']}>{success}</div>}

                {activeTab === 'basic' && (
                    <div className={styles['cp-section'] + " " + styles['fade-in']}>
                        <h3>Basic Information</h3>
                        <div className={styles['cp-grid']}>
                            <div className={styles['cp-field']}>
                                <label>Company Name *</label>
                                <input
                                    type="text"
                                    value={companyData.company_name}
                                    onChange={e => setCompanyData({ ...companyData, company_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Business Type *</label>
                                <select
                                    value={companyData.business_type}
                                    onChange={e => setCompanyData({ ...companyData, business_type: e.target.value })}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    {businessTypes.map(type => (
                                        <option key={type._id} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Website</label>
                                <input
                                    type="text"
                                    value={companyData.website}
                                    onChange={e => setCompanyData({ ...companyData, website: e.target.value })}
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Company Fax</label>
                                <input
                                    type="text"
                                    value={companyData.fax || ''}
                                    onChange={e => setCompanyData({ ...companyData, fax: e.target.value })}
                                    placeholder="+91 XXXXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className={styles['cp-grid'] + " " + styles['mt-4']}>
                            <div className={styles['cp-field']}>
                                <label>Company Phone</label>
                                <div className={styles['cp-phone-wrapper']}>
                                    <select
                                        value={companyData.phone_country || companyData.country}
                                        onChange={e => setCompanyData({ ...companyData, phone_country: e.target.value })}
                                        className={styles['cp-phone-select']}
                                    >
                                        {countries.map(c => (
                                            <option key={c._id} value={c.name}>{c.code} {c.dial_code}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={companyData.phone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const country = countries.find((c: any) => c.name === (companyData.phone_country || companyData.country));
                                            const maxLen = country ? country.phone_length : 15;
                                            if (val.length <= maxLen) setCompanyData({ ...companyData, phone: val });
                                        }}
                                        placeholder="Phone Number"
                                        className={styles['cp-phone-input']}
                                    />
                                </div>
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Company Mobile</label>
                                <div className={styles['cp-phone-wrapper']}>
                                    <select
                                        value={companyData.mobile_country || companyData.country}
                                        onChange={e => setCompanyData({ ...companyData, mobile_country: e.target.value })}
                                        className={styles['cp-phone-select']}
                                    >
                                        {countries.map((c: any) => (
                                            <option key={c._id} value={c.name}>{c.code} {c.dial_code}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={companyData.mobile}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const country = countries.find((c: any) => c.name === (companyData.mobile_country || companyData.country));
                                            const maxLen = country ? country.phone_length : 15;
                                            if (val.length <= maxLen) setCompanyData({ ...companyData, mobile: val });
                                        }}
                                        placeholder="Mobile Number"
                                        className={styles['cp-phone-input']}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles['cp-field'] + " " + styles['full'] + " " + styles['mt-4']}>
                            <label>Company Description</label>
                            <textarea
                                rows={4}
                                value={companyData.description}
                                onChange={e => setCompanyData({ ...companyData, description: e.target.value })}
                            />
                        </div>

                    </div>
                )}

                {activeTab === 'location' && (
                    <div className={styles['cp-section'] + " " + styles['fade-in']}>
                        <h3>Location Details</h3>
                        <div className={styles['cp-field'] + " " + styles['full']}>
                            <label>Business Address (Street, Building, etc.)</label>
                            <GoogleAddressAutocomplete 
                                onAddressSelect={handleAddressSelect}
                                placeholder={companyData.address || "Enter business address"}
                                className={styles['cp-input']}
                            />
                        </div>

                        <div className={styles['cp-grid'] + " " + styles['mt-4']}>
                            <div className={styles['cp-field']}>
                                <label>Country/Region</label>
                                <select
                                    value={countries.find((c: any) => c.name === companyData.country)?._id || ''}
                                    onChange={handleCountryChange}
                                >
                                    <option value="">Select Country</option>
                                    {countries.map((c: any) => (
                                        <option key={c._id} value={c._id}>{c.flag} {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles['cp-field']}>
                                <label>City</label>
                                <input
                                    type="text"
                                    value={companyData.city}
                                    onChange={e => setCompanyData({ ...companyData, city: e.target.value })}
                                    placeholder="e.g. Mumbai"
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>State</label>
                                <select
                                    value={companyData.state}
                                    onChange={e => setCompanyData({ ...companyData, state: e.target.value })}
                                    disabled={!companyData.country}
                                >
                                    <option value="">Select State</option>
                                    {states.map((s: any) => (
                                        <option key={s._id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className={styles['cp-section'] + " " + styles['fade-in']}>
                        <h3>Business Stats & Capability</h3>
                        <div className={styles['cp-grid']}>
                            <div className={styles['cp-field']}>
                                <label>Staff Size</label>
                                <select
                                    value={companyData.staff_size}
                                    onChange={e => setCompanyData({ ...companyData, staff_size: e.target.value })}
                                >
                                    <option value="">Select Size</option>
                                    <option value="1-5 staff">1-5 staff</option>
                                    <option value="5-50 staff">5-50 staff</option>
                                    <option value="50-100 staff">50-100 staff</option>
                                    <option value="100-500 staff">100-500 staff</option>
                                    <option value="500+ staff">500+ staff</option>
                                </select>
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Factory Area (e.g., 1,200+ m²)</label>
                                <input
                                    type="text"
                                    value={companyData.factory_area}
                                    onChange={e => setCompanyData({ ...companyData, factory_area: e.target.value })}
                                    placeholder="e.g. 2000 m²"
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Annual Revenue</label>
                                <select
                                    value={companyData.annual_revenue}
                                    onChange={e => setCompanyData({ ...companyData, annual_revenue: e.target.value })}
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

                        <div className={styles['cp-grid'] + " " + styles['mt-4']}>
                            <div className={styles['cp-field']}>
                                <label>Factory Capabilities</label>
                                <input
                                    type="text"
                                    value={companyData.capabilities}
                                    onChange={e => setCompanyData({ ...companyData, capabilities: e.target.value })}
                                    placeholder="e.g. Warranty available, Inspection"
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Certifications (e.g. CE, ISO)</label>
                                <input
                                    type="text"
                                    value={companyData.certifications}
                                    onChange={e => setCompanyData({ ...companyData, certifications: e.target.value })}
                                    placeholder="e.g. CE, ISO 9001"
                                />
                            </div>
                            <div className={styles['cp-field']}>
                                <label>Tax ID / GST Number</label>
                                <input
                                    type="text"
                                    value={companyData.tax_id}
                                    onChange={e => setCompanyData({ ...companyData, tax_id: e.target.value })}
                                    placeholder="e.g. GSTIN12345678"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className={styles['cp-section'] + " " + styles['fade-in']}>
                        <h3>Branding & Media Assets</h3>
                        <div className={styles['cp-banner-upload']}>
                            <label>Company Banner Image</label>
                            <div className={styles['cp-banner-preview']} onClick={() => bannerInputRef.current?.click()}>
                                {bannerPreview ? <img src={bannerPreview} alt="Banner" /> : <span>Click to upload banner (Large image recommended)</span>}
                            </div>
                            <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={handleBannerChange} />
                        </div>

                        <div className={styles['cp-upload-grid'] + " " + styles['mt-4']}>
                            <div className={styles['cp-upload-box']}>
                                <label>Company Logo</label>
                                <div className={styles['cp-logo-preview']} onClick={() => logoInputRef.current?.click()}>
                                    {logoPreview ? <img src={logoPreview} alt="Logo" /> : <span>Click to upload logo</span>}
                                </div>
                                <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={handleLogoChange} />
                            </div>

                            <div className={styles['cp-upload-box']}>
                                <label>Business License / Tax Certificate</label>
                                <div className={styles['cp-doc-uploader']} onClick={() => docInputRef.current?.click()}>
                                    {docFile ? <p>📄 {docFile.name}</p> : (companyData.document || companyData.id_proof) ? <p>✅ Document Uploaded</p> : <p>Click to upload business license (PDF/Doc/Image)</p>}
                                </div>
                                <input type="file" ref={docInputRef} hidden accept=".pdf,.doc,.docx,image/*" onChange={handleDocChange} />
                            </div>

                            <div className={styles['cp-upload-box']} style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                                <label>Showcase Corporate Video</label>
                                <div 
                                    className={styles['cp-doc-uploader']} 
                                    onClick={() => videoInputRef.current?.click()}
                                    style={{ height: 'auto', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                                >
                                    {videoPreview ? (
                                        <div style={{ width: '100%', maxWidth: '360px' }}>
                                            <video src={videoPreview} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                                            <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Click to change video file</span>
                                        </div>
                                    ) : (
                                        <p>Click to upload company profile tour video (mp4/webm/mov, Max 50MB)</p>
                                    )}
                                </div>
                                <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleVideoChange} />
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles['cp-actions']}>
                    <button type="submit" className={styles['cp-btn-primary']} disabled={loading}>
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CompanyProfile;
