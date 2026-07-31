import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './ShippingAddress.module.css';
import GoogleAddressAutocomplete from '../js/GoogleAddressAutocomplete';

const ShippingAddress = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [locating, setLocating] = useState(false);
    const [editingAddress, setEditingAddress] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        phoneCountry: '',
        addressLine: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        isDefault: false,
        lat: 0,
        lng: 0
    });

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/shipping-address');
            setAddresses(data);
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try {
            const { data } = await api.get('/common/countries');
            setCountries(data);
            if (data.length > 0 && !formData.phoneCountry) {
                setFormData(prev => ({ ...prev, phoneCountry: data[0]._id }));
            }
        } catch (err) {
            console.error('Failed to fetch countries:', err);
        }
    };

    const fetchStates = async (countryId: any) => {
        if (!countryId) {
            setStates([]);
            return [];
        }
        try {
            console.log('Fetching states for:', countryId);
            const { data } = await api.get(`/common/states/${countryId}`);
            console.log('States received:', data.length);
            setStates(data);
            return data;
        } catch (err) {
            console.error('Failed to fetch states:', err);
            return [];
        }
    };

    useEffect(() => {
        fetchAddresses();
        fetchCountries();
    }, []);

    const handleCountryChange = async (e: any) => {
        const countryId = e.target.value;
        const selectedCountry = countries.find(c => c._id === countryId);
        
        if (selectedCountry) {
            setFormData(prev => ({ ...prev, country: selectedCountry.name, state: '' })); // Clear state
            await fetchStates(countryId);
        } else {
            setFormData(prev => ({ ...prev, country: '', state: '' }));
            setStates([]);
        }
    };

    const handleAddressSelect = (data: any) => {
        setFormData(prev => ({
            ...prev,
            addressLine: data.addressLine || data.formatted_address,
            city: data.city || prev.city,
            state: data.state || prev.state,
            postalCode: data.postalCode || prev.postalCode,
            lat: data.lat || 0,
            lng: data.lng || 0
        }));

        if (data.country) {
            const matchedCountry = countries.find(c => c.countryCode === data.country || c.name.toLowerCase() === data.country.toLowerCase());
            if (matchedCountry) {
                setFormData(prev => ({ ...prev, country: matchedCountry.name }));
                fetchStates(matchedCountry._id);
            }
        }
    };

    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser", "error");
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                const data = await response.json();
                
                if (data.address) {
                    const addr = data.address;
                    // Try to match country
                    const countryName = addr.country;
                    const matchedCountry = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
                    
                    if (matchedCountry) {
                        const fetchedStates = await fetchStates(matchedCountry._id);
                        let matchedStateName = '';
                        if (addr.state) {
                            const matchedState = fetchedStates.find((s: any) => s.name.toLowerCase() === addr.state.toLowerCase());
                            matchedStateName = matchedState ? matchedState.name : addr.state;
                        }

                        setFormData(prev => ({
                            ...prev,
                            country: matchedCountry.name,
                            state: matchedStateName,
                            city: addr.city || addr.town || addr.village || '',
                            postalCode: addr.postcode || '',
                            addressLine: `${addr.road || ''} ${addr.suburb || ''}`.trim()
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            country: countryName || '',
                            state: addr.state || '',
                            city: addr.city || addr.town || addr.village || '',
                            postalCode: addr.postcode || '',
                            addressLine: `${addr.road || ''} ${addr.suburb || ''}`.trim()
                        }));
                    }
                }
            } catch (err) {
                console.error("Reverse geocoding failed:", err);
            } finally {
                setLocating(false);
            }
        }, (err) => {
            console.error("Geolocation error:", err);
            setLocating(false);
            showToast("Could not get your location. Please check your browser permissions.", "error");
        });
    };

    const handleOpenModal = async (address: any = null) => {
        if (address) {
            setEditingAddress(address);
            setFormData({
                fullName: address.fullName,
                phone: address.phone,
                phoneCountry: address.phoneCountry || '',
                addressLine: address.addressLine,
                city: address.city,
                state: address.state,
                country: address.country,
                postalCode: address.postalCode,
                isDefault: address.isDefault,
                lat: address.lat || 0,
                lng: address.lng || 0
            });
            
            // Find country ID by name to fetch states
            const countryObj = countries.find((c: any) => c.name === address.country);
            if (countryObj) await fetchStates(countryObj._id);
        } else {
            setEditingAddress(null);
            setFormData({
                fullName: '',
                phone: '',
                phoneCountry: countries[0]?._id || '',
                addressLine: '',
                city: '',
                state: '',
                country: '',
                postalCode: '',
                isDefault: addresses.length === 0,
                lat: 0,
                lng: 0
            });
            setStates([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Full Name Validation
        if (!formData.fullName || !formData.fullName.trim() || formData.fullName.trim().length < 2) {
            showToast('Please enter a valid Full Name (at least 2 characters).', 'error');
            return;
        }

        // Phone Validation
        const cleanPhone = (formData.phone || '').replace(/\D/g, '');
        if (!cleanPhone) {
            showToast('Phone Number is required.', 'error');
            return;
        }
        if (cleanPhone.length < 7 || cleanPhone.length > 15) {
            showToast('Phone Number must be a valid number between 7 and 15 digits.', 'error');
            return;
        }

        // Street Address Validation
        if (!formData.addressLine || !formData.addressLine.trim()) {
            showToast('Street Address is required. Please search and select a valid address.', 'error');
            return;
        }

        // Country Validation
        if (!formData.country || !formData.country.trim()) {
            showToast('Country is required.', 'error');
            return;
        }

        // State Validation
        if (!formData.state || !formData.state.trim()) {
            showToast('State / Province is required.', 'error');
            return;
        }

        // City Validation
        if (!formData.city || !formData.city.trim()) {
            showToast('City is required.', 'error');
            return;
        }

        // Postal Code Validation
        if (!formData.postalCode || !formData.postalCode.trim() || formData.postalCode.trim().length < 3) {
            showToast('Please enter a valid Postal Code.', 'error');
            return;
        }

        try {
            if (editingAddress) {
                await api.put(`/shipping-address/${editingAddress._id}`, formData);
                showToast('Address updated successfully!', 'success');
            } else {
                await api.post('/shipping-address', formData);
                showToast('Address added successfully!', 'success');
            }
            fetchAddresses();
            handleCloseModal();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to save address', 'error');
        }
    };

    const handleDelete = async (id: any) => {
        if (!window.confirm('Are you sure you want to delete this address?')) return;
        try {
            await api.delete(`/shipping-address/${id}`);
            showToast('Address deleted successfully', 'success');
            fetchAddresses();
        } catch (error) {
            showToast('Failed to delete address', 'error');
        }
    };

    const handleSetDefault = async (id: any) => {
        try {
            await api.put(`/shipping-address/${id}/set-default`);
            showToast('Default address updated', 'success');
            fetchAddresses();
        } catch (error) {
            showToast('Failed to set default address', 'error');
        }
    };

    return (
        <div className={styles['shipping-address-container']} style={{ width: '100%', maxWidth: '100%' }}>
            <div className={styles['sa-header']}>
                <h2>Shipping Address</h2>
                <button className={styles['sa-add-btn']} onClick={() => handleOpenModal()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                    Add
                </button>
            </div>

            {loading ? (
                <div className={styles['sa-loading']}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #ff6600', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
                </div>
            ) : addresses.length === 0 ? (
                <div className={styles['sa-empty']}>
                    <p>You haven't added any shipping addresses yet.</p>
                    <button className={styles['sa-btn-primary']} onClick={() => handleOpenModal()}>Add Your First Address</button>
                </div>
            ) : (
                <div className={styles['sa-grid']}>
                    {addresses.map((addr) => (
                        <div key={addr._id} className={`${styles['sa-card']} ${addr.isDefault ? styles['sa-default'] : ''}`}>
                            {addr.isDefault && <span className={styles['sa-badge']}>Default</span>}
                            <div className={styles['sa-card-body']}>
                                <div className={styles['sa-name']}>{addr.fullName}</div>
                                <div className={styles['sa-phone']}>
                                    {countries.find(c => c._id === addr.phoneCountry)?.dial_code || ''} {addr.phone}
                                </div>
                                <div className={styles['sa-address']}>
                                    {addr.addressLine}<br />
                                    {addr.city}, {addr.state} {addr.postalCode}<br />
                                    {addr.country}
                                </div>
                            </div>
                            <div className={styles['sa-card-actions']}>
                                <button onClick={() => handleOpenModal(addr)}>Edit</button>
                                <button onClick={() => handleDelete(addr._id)}>Delete</button>
                                {!addr.isDefault && (
                                    <button onClick={() => handleSetDefault(addr._id)}>Set Default</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className={styles['sa-modal-overlay']} onClick={handleCloseModal}>
                    <div className={styles['sa-modal']} onClick={e => e.stopPropagation()}>
                        <div className={styles['sa-modal-header']}>
                            <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
                            <button onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles['sa-form']}>
                            <div className={styles['sa-form-body']}>
                                <div className={styles['sa-use-location-box']}>
                                    <button 
                                        type="button" 
                                        className={styles['sa-btn-location']} 
                                        onClick={handleUseLocation}
                                        disabled={locating}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        {locating ? 'Locating...' : 'Use current location'}
                                    </button>
                                </div>
                                <div className={styles['sa-form-group']}>
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.fullName} 
                                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className={styles['sa-form-group']}>
                                    <label>Phone Number</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            value={formData.phoneCountry || countries.find(co => co.name === formData.country)?._id || ''}
                                            onChange={e => setFormData({...formData, phoneCountry: e.target.value})}
                                            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9', minWidth: '70px', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                            {countries.map(c => (
                                                <option key={c._id} value={c._id}>{c.code} {c.dial_code}</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                const country = countries.find(co => co._id === (formData.phoneCountry || countries.find(c => c.name === formData.country)?._id));
                                                const maxLen = country ? country.phone_length : 15;
                                                if (val.length <= maxLen) setFormData({...formData, phone: val});
                                            }}
                                            placeholder="Phone Number"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                                <div className={styles['sa-form-group']}>
                                    <label>Street Address *</label>
                                    <GoogleAddressAutocomplete 
                                        onAddressSelect={handleAddressSelect} 
                                        placeholder="Search for address..." 
                                        className={styles['sa-input']} 
                                    />
                                    {formData.addressLine && (
                                        <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                                            Selected: {formData.addressLine}
                                        </div>
                                    )}
                                </div>
                                <div className={styles['sa-form-row']}>
                                    <div className={styles['sa-form-group']}>
                                        <label>Country</label>
                                        <select 
                                            required 
                                            value={countries.find(c => c.name === formData.country)?._id || ''} 
                                            onChange={handleCountryChange}
                                            className={styles['sa-select']}
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles['sa-form-group']}>
                                        <label>State / Province</label>
                                        <select 
                                            required 
                                            value={formData.state} 
                                            onChange={e => setFormData({...formData, state: e.target.value})}
                                            className={styles['sa-select']}
                                            disabled={!formData.country}
                                        >
                                            <option value="">Select State</option>
                                            {states.map(s => (
                                                <option key={s._id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={styles['sa-form-row']}>
                                    <div className={styles['sa-form-group']}>
                                        <label>City</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.city} 
                                            onChange={e => setFormData({...formData, city: e.target.value})}
                                        />
                                    </div>
                                    <div className={styles['sa-form-group']}>
                                        <label>Postal Code</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.postalCode} 
                                            onChange={e => setFormData({...formData, postalCode: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className={styles['sa-form-checkbox']}>
                                    <input 
                                        type="checkbox" 
                                        id="isDefault"
                                        checked={formData.isDefault} 
                                        onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                                    />
                                    <label htmlFor="isDefault">Set as default shipping address</label>
                                </div>
                            </div>
                            <div className={styles['sa-modal-footer']}>
                                <button type="button" className={styles['sa-btn-outline']} onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className={styles['sa-btn-primary']}>Save Address</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingAddress;
