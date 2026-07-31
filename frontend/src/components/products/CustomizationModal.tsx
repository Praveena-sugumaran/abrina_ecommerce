import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './CustomizationModal.module.css';

interface CustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        _id: string;
        name: string;
        main_image: string;
        supplier?: {
            _id: string;
            company_name?: string;
            first_name?: string;
            last_name?: string;
        };
    };
}

const CustomizationModal: React.FC<CustomizationModalProps> = ({ isOpen, onClose, product }) => {
    const { user, availableCountries, availableCurrencies } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        buyer_name: '',
        buyer_email: '',
        phone_code: '+1',
        buyer_phone: '',
        customization_type: 'Logo',
        quantity: 1,
        customization_details: '',
        expected_delivery_date: '',
        budget_currency: 'USD',
        budget_range: ''
    });

    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Set tomorrow's date as the minimum date allowed
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                buyer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                buyer_email: user.email || '',
                buyer_phone: user.phone || ''
            }));
        }
    }, [user, isOpen]);

    if (!isOpen || !product) return null;

    const supplierName = product.supplier?.company_name || 
        `${product.supplier?.first_name || ''} ${product.supplier?.last_name || ''}`.trim() || 
        'Supplier';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setReferenceFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isOwner = user && product.supplier && (user._id === (product.supplier._id || product.supplier));
        if (isOwner) {
            showToast('Suppliers cannot request customization on their own products', 'error');
            onClose();
            return;
        }

        // Email Validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.buyer_email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        // Phone Validation
        const cleanPhone = formData.buyer_phone.replace(/\D/g, '');
        if (!cleanPhone) {
            showToast('Phone number is required', 'error');
            return;
        }

        const selectedCountryObj = availableCountries?.find((c: any) => (c.dial_code || `+${c.phone_code}`) === formData.phone_code);
        const expectedLength = selectedCountryObj?.phone_length || 10;

        if (cleanPhone.length !== expectedLength) {
            showToast(`Phone number must be exactly ${expectedLength} digits for the selected country (${selectedCountryObj?.name || 'selected country'})`, 'error');
            return;
        }

        // Delivery Date Validation
        if (!formData.expected_delivery_date) {
            showToast('Expected delivery date is required', 'error');
            return;
        }
        const selectedDate = new Date(formData.expected_delivery_date);
        if (isNaN(selectedDate.getTime())) {
            showToast('Please enter a valid expected delivery date', 'error');
            return;
        }
        const year = selectedDate.getFullYear();
        if (year < 1000 || year > 9999) {
            showToast('Please enter a valid 4-digit year', 'error');
            return;
        }
        const tomorrowDate = new Date();
        tomorrowDate.setHours(0, 0, 0, 0);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        if (selectedDate < tomorrowDate) {
            showToast('Expected delivery date must be at least tomorrow', 'error');
            return;
        }

        // Max 1 Year in Future Validation
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (selectedDate > maxDate) {
            showToast('Expected delivery date cannot be more than 1 year in the future', 'error');
            return;
        }

        setLoading(true);

        try {
            // Build FormData to support file upload
            const data = new FormData();
            data.append('productId', product._id);
            data.append('buyer_name', formData.buyer_name);
            data.append('buyer_email', formData.buyer_email);
            data.append('buyer_phone', `${formData.phone_code} ${formData.buyer_phone}`);
            data.append('customization_type', formData.customization_type);
            data.append('quantity', String(formData.quantity));
            data.append('customization_details', formData.customization_details);
            data.append('expected_delivery_date', formData.expected_delivery_date);
            data.append('budget_range', `${formData.budget_currency} ${formData.budget_range}`);
            
            if (referenceFile) {
                data.append('reference_file', referenceFile);
            }

            await api.post('/customizations', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(true);
            showToast('Customization request sent successfully!', 'success');
            
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData(prev => ({
                    ...prev,
                    customization_details: '',
                    expected_delivery_date: '',
                    budget_range: ''
                }));
                setReferenceFile(null);
            }, 2500);

        } catch (error: any) {
            console.error('Customization request error:', error);
            showToast(error.response?.data?.message || 'Failed to submit customization request', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Min expected delivery date is tomorrow
    const activeCountryObj = availableCountries?.find((c: any) => (c.dial_code || `+${c.phone_code}`) === formData.phone_code);
    const dynamicMaxLen = activeCountryObj?.phone_length || 15;

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal-box']} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <div className={styles['modal-header-title']}>
                        <h3>Request Product Customization</h3>
                        <p>Submit customized specification changes for the supplier to quote.</p>
                    </div>
                    <button className={styles['modal-close-btn']} onClick={onClose}>✕</button>
                </div>

                {success ? (
                    <div className={styles['success-container']}>
                        <div className={styles['success-icon-wrap']}>
                            <svg width="36" height="36" fill="none" stroke="#16a34a" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4>Customization Request Received!</h4>
                        <p>Your request has been filed, and a chat thread has been started automatically. The supplier will send you a quote soon.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles['form-container']}>
                        <div className={styles['modal-body']}>
                            
                            {/* Visual separates badge */}
                            <div className={styles['info-badge']}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span><strong>Customization Note:</strong> Use this form specifically for physical product modifications (logos, packaging, branding, colors). For price/shipping negotiations, please use <strong>Send Enquiry</strong> instead.</span>
                            </div>

                            {/* Product Info Block */}
                            <div className={styles['product-summary']}>
                                <img 
                                    src={product.main_image?.startsWith('http') ? product.main_image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${product.main_image}`} 
                                    alt={product.name} 
                                />
                                <div>
                                    <p className={styles['prod-name']}>{product.name}</p>
                                    <p className={styles['prod-supplier']}>Supplier: <strong>{supplierName}</strong></p>
                                </div>
                            </div>

                            {/* Form Section: Contact Information */}
                            <div className={styles['form-section-title']}>Your Contact Info</div>
                            
                            <div className={styles['form-field']}>
                                <label>Full Name *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.buyer_name} 
                                    onChange={e => setFormData(prev => ({ ...prev, buyer_name: e.target.value }))}
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className={styles['form-grid-2']}>
                                <div className={styles['form-field']}>
                                    <label>Email *</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={formData.buyer_email} 
                                        onChange={e => setFormData(prev => ({ ...prev, buyer_email: e.target.value }))}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className={styles['form-field']}>
                                    <label>Phone Number *</label>
                                    <div className={styles['phone-input-group']} style={{ display: 'flex', gap: '8px' }}>
                                        <select 
                                            value={formData.phone_code} 
                                            onChange={e => setFormData(prev => ({ ...prev, phone_code: e.target.value }))}
                                            style={{ width: '100px', flexShrink: 0 }}
                                        >
                                            {availableCountries?.map((c: any) => (
                                                <option key={c.code} value={c.dial_code || `+${c.phone_code}`}>{c.dial_code || `+${c.phone_code}`} ({c.code})</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="tel" 
                                            required 
                                            maxLength={dynamicMaxLen}
                                            style={{ flex: 1 }}
                                            value={formData.buyer_phone} 
                                            onChange={e => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                setFormData(prev => ({ ...prev, buyer_phone: value }));
                                            }}
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Section: Customization Requirements */}
                            <div className={styles['form-section-title']}>Customization Specifications</div>

                            <div className={styles['form-grid-2']}>
                                <div className={styles['form-field']}>
                                    <label>Customization Type *</label>
                                    <select 
                                        value={formData.customization_type}
                                        onChange={e => setFormData(prev => ({ ...prev, customization_type: e.target.value }))}
                                    >
                                        <option value="Logo">Custom Logo</option>
                                        <option value="Packaging">Custom Packaging</option>
                                        <option value="Color">Color Customization</option>
                                        <option value="Size">Size Customization</option>
                                        <option value="Material/Fabric Change">Fabric / Material Change</option>
                                        <option value="Other">Other Specifications</option>
                                    </select>
                                </div>
                                <div className={styles['form-field']}>
                                    <label>Quantity Needed *</label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        required
                                        value={formData.quantity} 
                                        onChange={e => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    />
                                </div>
                            </div>

                            <div className={styles['form-field']}>
                                <label>Detailed Customization Specifications *</label>
                                <textarea 
                                    rows={4}
                                    required
                                    value={formData.customization_details}
                                    onChange={e => setFormData(prev => ({ ...prev, customization_details: e.target.value }))}
                                    placeholder="Describe your design specifications, dimensions, file requirements, placement details, material preference, etc..."
                                />
                            </div>

                            <div className={styles['form-grid-2']}>
                                <div className={styles['form-field']}>
                                    <label>Expected Delivery Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        min={minDateStr}
                                        value={formData.expected_delivery_date}
                                        onChange={e => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                                    />
                                </div>
                                <div className={styles['form-field']}>
                                    <label>Target Budget Range *</label>
                                    <div className={styles['budget-input-group']} style={{ display: 'flex', gap: '8px' }}>
                                        <select 
                                            value={formData.budget_currency} 
                                            onChange={e => setFormData(prev => ({ ...prev, budget_currency: e.target.value }))}
                                            style={{ width: '90px', flexShrink: 0 }}
                                        >
                                            {availableCurrencies?.map((curr: any) => (
                                                <option key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            required 
                                            style={{ flex: 1 }}
                                            value={formData.budget_range} 
                                            onChange={e => setFormData(prev => ({ ...prev, budget_range: e.target.value }))}
                                            placeholder="e.g. 1,000 - 2,000"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles['form-field']}>
                                <label>Reference Logo / Packaging drawing / Spec Doc</label>
                                {referenceFile ? (
                                    <div className={styles['file-selected-badge']}>
                                        <span>📄 {referenceFile.name} ({(referenceFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        <button type="button" onClick={() => setReferenceFile(null)}>Remove</button>
                                    </div>
                                ) : (
                                    <div className={styles['file-upload-box']} onClick={() => document.getElementById('cust-file-input')?.click()}>
                                        <svg width="24" height="24" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span>Click to upload specification attachments</span>
                                        <small>Images, PDFs, Word documents or spreadsheets (Max 10MB)</small>
                                        <input 
                                            id="cust-file-input"
                                            type="file" 
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                        />
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className={styles['modal-actions']}>
                            <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                            <button type="submit" className={styles['btn-send']} disabled={loading}>
                                {loading ? 'Submitting Specifications...' : 'Submit Customization Request'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CustomizationModal;
