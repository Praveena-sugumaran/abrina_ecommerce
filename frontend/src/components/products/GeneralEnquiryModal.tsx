import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './GeneralEnquiryModal.module.css';

interface GeneralEnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        _id: string;
        name: string;
        moq?: number;
        main_image: string;
        supplier?: {
            _id: string;
            company_name?: string;
            first_name?: string;
            last_name?: string;
        };
    };
}

const GeneralEnquiryModal: React.FC<GeneralEnquiryModalProps> = ({ isOpen, onClose, product }) => {
    const { user, availableCountries, siteSettings } = useAuth();
    const { showToast } = useToast();
    const isB2C = siteSettings?.rfq_enabled === false;

    const getImgUrl = (url?: string) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${url}`;
    };


    const [formData, setFormData] = useState({
        buyer_name: '',
        buyer_email: '',
        phone_code: '+1',
        buyer_phone: '',
        subject: '',
        message: '',
        quantity: 1,
        country: ''
    });

    const [attachment, setAttachment] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData(prev => ({
                ...prev,
                subject: `General Inquiry about: ${product.name}`,
                quantity: isB2C ? 1 : (product.moq || 1)
            }));
        }
    }, [product, isOpen, isB2C]);


    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                buyer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                buyer_email: user.email || '',
                buyer_phone: user.phone || '',
                country: user.country || user.country_code || 'US'
            }));
        }
    }, [user, isOpen]);

    if (!isOpen || !product) return null;

    const supplierName = product.supplier?.company_name || 
        `${product.supplier?.first_name || ''} ${product.supplier?.last_name || ''}`.trim() || 
        'Supplier';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isOwner = user && product.supplier && (user._id === (product.supplier._id || product.supplier));
        if (isOwner) {
            showToast('Suppliers cannot send enquiries on their own products', 'error');
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

        setLoading(true);

        try {
            // Build FormData
            const data = new FormData();
            data.append('productId', product._id);
            if (product.supplier?._id) {
                data.append('supplierId', product.supplier._id);
            } else if (typeof product.supplier === 'string') {
                data.append('supplierId', product.supplier);
            }
            data.append('buyer_name', formData.buyer_name);
            data.append('buyer_email', formData.buyer_email);
            data.append('buyer_phone', `${formData.phone_code} ${formData.buyer_phone}`);
            data.append('subject', formData.subject);
            data.append('message', formData.message);
            data.append('quantity', String(formData.quantity));
            data.append('country', formData.country);

            if (attachment) {
                data.append('attachment', attachment);
            }

            await api.post('/product-enquiries', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(true);
            showToast('General enquiry sent successfully!', 'success');

            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData(prev => ({
                    ...prev,
                    message: ''
                }));
                setAttachment(null);
            }, 2500);

        } catch (error: any) {
            console.error('General enquiry submission error:', error);
            showToast(error.response?.data?.message || 'Failed to send general enquiry', 'error');
        } finally {
            setLoading(false);
        }
    };

    const activeCountryObj = availableCountries?.find((c: any) => (c.dial_code || `+${c.phone_code}`) === formData.phone_code);
    const dynamicMaxLen = activeCountryObj?.phone_length || 15;

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal-box']} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <div className={styles['modal-header-title']}>
                        <h3>Send General Enquiry</h3>
                        <p>{isB2C ? 'Contact the supplier regarding product details, shipping, or other inquiries.' : 'Contact the supplier regarding prices, MOQ, logistics, or custom deals.'}</p>
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
                        <h4>Enquiry Sent Successfully!</h4>
                        <p>Your general enquiry has been received by the supplier. A continuous chat session is active inside your Messages dashboard.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles['form-container']}>
                        <div className={styles['modal-body']}>

                            {/* Informative Help Alert */}
                            <div className={styles['info-badge']}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span><strong>General Communication:</strong> {isB2C ? 'Use this form to ask about product details, shipping costs, delivery times, or product materials.' : 'Use this form to ask about unit pricing, bulk price tiers, shipping costs, payment terms, or product materials. If you want to customize product logos or packaging, use Request Customization.'}</span>
                            </div>


                            {/* Product Info Banner */}
                            <div className={styles['product-summary']}>
                                <img 
                                    src={getImgUrl(product.main_image || (product as any).images?.[0])} 
                                    alt={product.name} 
                                />
                                <div>
                                    <p className={styles['prod-name']}>{product.name}</p>
                                    <p className={styles['prod-supplier']}>Supplier: <strong>{supplierName}</strong></p>
                                </div>
                            </div>

                            {/* Form Section: Contact details */}
                            <div className={styles['form-section-title']}>Your Contact Info</div>

                            <div className={styles['form-field']}>
                                <label>Full Name *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.buyer_name} 
                                    onChange={e => setFormData(prev => ({ ...prev, buyer_name: e.target.value }))}
                                />
                            </div>

                            <div className={styles['form-grid-2']}>
                                <div className={styles['form-field']}>
                                    <label>Email Address *</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={formData.buyer_email} 
                                        onChange={e => setFormData(prev => ({ ...prev, buyer_email: e.target.value }))}
                                    />
                                </div>
                                <div className={styles['form-field']}>
                                    <label>Phone Number *</label>
                                    <div className={styles['phone-input-group']} style={{ display: 'flex', gap: '8px' }}>
                                        <select 
                                            value={formData.phone_code} 
                                            onChange={e => setFormData(prev => ({ ...prev, phone_code: e.target.value }))}
                                            style={{ width: '90px', flexShrink: 0 }}
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
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Section: Enquiry Details */}
                            <div className={styles['form-section-title']}>Enquiry details</div>

                            <div className={styles['form-field']}>
                                <label>Subject *</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.subject} 
                                    onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                />
                            </div>

                            <div className={styles['form-grid-2']}>
                                <div className={styles['form-field']}>
                                    <label>Quantity Interested *</label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        required
                                        value={formData.quantity} 
                                        onChange={e => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    />
                                </div>
                                <div className={styles['form-field']}>
                                    <label>Destination Country *</label>
                                    <select 
                                        required
                                        value={formData.country} 
                                        onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                    >
                                        <option value="">Select Country</option>
                                        {availableCountries?.map((c: any) => (
                                            <option key={c.code} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles['form-field']}>
                                <label>Detailed Message for Supplier *</label>
                                <textarea 
                                    rows={5}
                                    required
                                    value={formData.message}
                                    onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Enter your detailed questions regarding delivery, lead times, bulk negotiation, warranty, or general specifications..."
                                />
                            </div>

                            <div className={styles['form-field']}>
                                <label>Attachment (optional)</label>
                                {attachment ? (
                                    <div className={styles['file-selected-badge']}>
                                        <span>📄 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        <button type="button" onClick={() => setAttachment(null)}>Remove</button>
                                    </div>
                                ) : (
                                    <div className={styles['file-upload-box']} onClick={() => document.getElementById('enq-file-input')?.click()}>
                                        <svg width="24" height="24" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v4a2 2 0 002 2h2m10-4H8m8 4h-8" />
                                        </svg>
                                        <span>Click to upload files (RFP, details, images)</span>
                                        <small>Images, PDFs, Word, Excel (Max 10MB)</small>
                                        <input 
                                            id="enq-file-input"
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
                                {loading ? 'Sending Enquiry...' : 'Send Enquiry Now'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GeneralEnquiryModal;
