import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface GoogleAddressAutocompleteProps {
    onAddressSelect: (address: any) => void;
    placeholder?: string;
    className?: string;
}

const GoogleAddressAutocomplete = ({ onAddressSelect, placeholder = "Enter your street address", className = "co-input" }: GoogleAddressAutocompleteProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { siteSettings } = useAuth();
    const [scriptLoaded, setScriptLoaded] = useState(typeof window !== 'undefined' ? !!(window as any).google : false);
    const [osmResults, setOsmResults] = useState<any[]>([]);
    const [showOsmResults, setShowOsmResults] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        if (!siteSettings?.google_maps_enabled || !siteSettings?.google_maps_api_key) return;

        if (typeof window !== 'undefined' && !(window as any).google) {
            const scriptId = 'google-maps-script';
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = `https://maps.googleapis.com/maps/api/js?key=${siteSettings.google_maps_api_key}&libraries=places`;
                script.async = true;
                script.onload = () => setScriptLoaded(true);
                document.head.appendChild(script);
            }
        }
    }, [siteSettings]);

    useEffect(() => {
        if (!siteSettings?.google_maps_enabled || !scriptLoaded || typeof window === 'undefined' || !(window as any).google) return;

        const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) return;

            const addressComponents = place.address_components;
            const result = {
                addressLine: '',
                city: '',
                state: '',
                country: '',
                postalCode: '',
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                formatted_address: place.formatted_address
            };

            let streetNumber = '';
            let route = '';

            addressComponents.forEach((component: any) => {
                const types = component.types;
                if (types.includes('street_number')) streetNumber = component.long_name;
                if (types.includes('route')) route = component.long_name;
                if (types.includes('locality')) result.city = component.long_name;
                if (types.includes('administrative_area_level_1')) result.state = component.long_name;
                if (types.includes('country')) result.country = component.short_name;
                if (types.includes('postal_code')) result.postalCode = component.long_name;
            });

            result.addressLine = `${streetNumber} ${route}`.trim();
            onAddressSelect(result);
        });

        const handleKeyPress = (e: any) => {
            if (e.key === 'Enter') e.preventDefault();
        };

        const inputEl = inputRef.current;
        if (inputEl) {
            inputEl.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.event) {
                (window as any).google.maps.event.clearInstanceListeners(autocomplete);
            }
            if (inputEl) inputEl.removeEventListener('keydown', handleKeyPress);
        };
    }, [onAddressSelect, scriptLoaded, siteSettings]);

    // OpenStreetMap Search
    useEffect(() => {
        if (siteSettings?.google_maps_enabled || searchValue.length < 3) {
            setOsmResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&addressdetails=1&limit=5`);
                const data = await res.json();
                setOsmResults(data);
                setShowOsmResults(true);
            } catch (err) {
                console.error('OSM Fetch Error:', err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchValue, siteSettings]);

    const handleOsmSelect = (item: any) => {
        const addr = item.address;
        const result = {
            addressLine: `${addr.road || ''} ${addr.house_number || ''}`.trim(),
            city: addr.city || addr.town || addr.village || '',
            state: addr.state || '',
            country: addr.country_code?.toUpperCase() || '',
            postalCode: addr.postcode || '',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            formatted_address: item.display_name
        };
        onAddressSelect(result);
        setSearchValue(item.display_name);
        setShowOsmResults(false);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className={className}
                value={siteSettings?.google_maps_enabled ? undefined : searchValue}
                onChange={(e) => {
                    if (!siteSettings?.google_maps_enabled) {
                        setSearchValue(e.target.value);
                    }
                }}
                onBlur={() => setTimeout(() => setShowOsmResults(false), 200)}
                onFocus={() => {
                    if (osmResults.length > 0) setShowOsmResults(true);
                }}
            />
            {showOsmResults && osmResults.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    marginTop: '4px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '250px',
                    overflowY: 'auto'
                }}>
                    {osmResults.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleOsmSelect(item)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: idx === osmResults.length - 1 ? 'none' : '1px solid #f1f5f9',
                                fontSize: '13px',
                                color: '#334155',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            <div style={{ fontWeight: '700', marginBottom: '2px' }}>{item.display_name.split(',')[0]}</div>
                            <div style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.display_name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GoogleAddressAutocomplete;
