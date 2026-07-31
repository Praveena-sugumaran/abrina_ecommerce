import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './BulkEnquiryModal.module.css';

interface BulkEnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategoryId?: string;
    initialKeyword?: string;
}

const BulkEnquiryModal: React.FC<BulkEnquiryModalProps> = ({ 
    isOpen, 
    onClose, 
    initialCategoryId = '', 
    initialKeyword = '' 
}) => {
    const { user, availableCountries } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        buyer_name: '',
        buyer_email: '',
        phone_code: '+1',
        buyer_phone: '',
        subject: '',
        message: '',
        quantity: 100, // Typically higher default for bulk sourcing
        country: '',
        categoryId: ''
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [broadcastCount, setBroadcastCount] = useState(0);

    // Load categories for selector
    useEffect(() => {
        if (isOpen) {
            api.get('/categories')
                .then(({ data }) => setCategories(data))
                .catch(err => console.error('Error fetching categories:', err));
        }
    }, [isOpen]);

    // Populate initial category or keyword
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                categoryId: initialCategoryId,
                subject: initialCategoryId 
                    ? `Sourcing Inquiry for category`
                    : initialKeyword 
                        ? `Sourcing Inquiry matching search: ${initialKeyword}`
                        : 'Bulk Sourcing Inquiry'
            }));
        }
    }, [isOpen, initialCategoryId, initialKeyword]);

    // Populate user profile info
    useEffect(() => {
        if (user && isOpen) {
            setFormData(prev => ({
                ...prev,
                buyer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                buyer_email: user.email || '',
                buyer_phone: user.phone || '',
                country: user.country || user.country_code || 'US'
            }));
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.categoryId && !initialKeyword) {
            showToast('Please select a target category or enter sourcing keywords', 'error');
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

        const selectedCountryObj = availableCountries?.find(
            (c: any) => (c.dial_code || `+${c.phone_code}`) === formData.phone_code
        );
        const expectedLength = selectedCountryObj?.phone_length || 10;

        if (cleanPhone.length !== expectedLength) {
            showToast(
                `Phone number must be exactly ${expectedLength} digits for the selected country (${selectedCountryObj?.name || 'selected country'})`, 
                'error'
            );
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            if (formData.categoryId) {
                data.append('categoryId', formData.categoryId);
            }
            if (initialKeyword) {
                data.append('keyword', initialKeyword);
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

            const response = await api.post('/product-enquiries/bulk', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setBroadcastCount(response.data.count || 0);
            setSuccess(true);
            showToast(`Broadcast sent successfully to ${response.data.count} suppliers!`, 'success');

            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData(prev => ({
                    ...prev,
                    message: ''
                }));
                setAttachment(null);
            }, 3000);

        } catch (error: any) {
            console.error('Bulk enquiry submission error:', error);
            showToast(error.response?.data?.message || 'Failed to broadcast sourcing enquiry', 'error');
        } finally {
            setLoading(false);
        }
    };

    const activeCountryObj = availableCountries?.find(
        (c: any) => (c.dial_code || `+${c.phone_code}`) === formData.phone_code
    );
    const dynamicMaxLen = activeCountryObj?.phone_length || 15;

    const selectedCategoryName = categories.find(c => c._id === formData.categoryId)?.title || 'Selected Category';

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal-box']} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <div className={styles['modal-header-title']}>
                        <h3>Broadcast Sourcing Inquiry</h3>
                        <p>Send your requirements to multiple suppliers matching your criteria simultaneously.</p>
                    </div>
                    <button className={styles['modal-close-btn']} onClick={onClose}>✕</button>
                </div>

                {success ? (
                    <div className={styles['success-container']}>
                        <div className={styles['success-icon-wrap']}>
                            <svg width="40" height="40" fill="none" stroke="#16a34a" strokeWidth="3.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4>Broadcast Successful!</h4>
                        <p>Your sourcing requirements have been sent to <strong>{broadcastCount}</strong> matching suppliers.</p>
                        <p className={styles['success-sub']}>Replies will appear as message conversations in your dashboard.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles['form-container']}>
                        <div className={styles['modal-body']}>
                            
                            {/* Broadcast Info Info-Badge */}
                            <div className={styles['info-badge']}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9 9 0 0114.142 0M2.006 8.01a14 14 0 0119.988 0" />
                                </svg>
                                <span>
                                    <strong>Supplier Broadcast:</strong> This inquiry will be dispatched as a direct enquiry and matching chat thread to all unique suppliers who list items in the chosen category.
                                </span>
                            </div>

                            {/* Category Selection / Context */}
                            <div className={styles['form-section-title']}>Target Sourcing Category</div>
                            <div className={styles['form-field']}>
                                <label>Category *</label>
                                {initialCategoryId ? (
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={selectedCategoryName} 
                                        className={styles['readonly-input']} 
                                    />
                                ) : (
                                    <select 
                                        required
                                        value={formData.categoryId}
                                        onChange={e => setFormData(prev => ({ 
                                            ...prev, 
                                            categoryId: e.target.value,
                                            subject: `Sourcing Inquiry for category: ${categories.find(c => c._id === e.target.value)?.title || ''}`
                                        }))}
                                    >
                                        <option value="">Select Target Category</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.title}</option>
                                        ))}
                                    </select>
                                )}
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
                                    <div className={styles['phone-input-group']}>
                                        <select 
                                            value={formData.phone_code} 
                                            onChange={e => setFormData(prev => ({ ...prev, phone_code: e.target.value }))}
                                        >
                                            {availableCountries?.map((c: any) => (
                                                <option key={c.code} value={c.dial_code || `+${c.phone_code}`}>
                                                    {c.dial_code || `+${c.phone_code}`} ({c.code})
                                                </option>
                                            ))}
                                        </select>
                                        <input 
                                            type="tel" 
                                            required 
                                            maxLength={dynamicMaxLen}
                                            value={formData.buyer_phone} 
                                            onChange={e => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                setFormData(prev => ({ ...prev, buyer_phone: value }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Section: Inquiry Details */}
                            <div className={styles['form-section-title']}>Inquiry Requirements</div>

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
                                    <label>Quantity Required *</label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        required
                                        value={formData.quantity} 
                                        onChange={e => setFormData(prev => ({ 
                                            ...prev, 
                                            quantity: Math.max(1, parseInt(e.target.value) || 1) 
                                        }))}
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
                                <label>Detailed Message for Suppliers *</label>
                                <textarea 
                                    rows={5}
                                    required
                                    value={formData.message}
                                    onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Explain your technical specifications, certifications required, packaging requirements, target pricing, and any customization requests..."
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
                                    <div 
                                        className={styles['file-upload-box']} 
                                        onClick={() => document.getElementById('bulk-file-input')?.click()}
                                    >
                                        <svg width="24" height="24" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        </svg>
                                        <span>Click to upload specification files or RFPs</span>
                                        <small>Images, PDFs, Word, Excel, ZIP (Max 10MB)</small>
                                        <input 
                                            id="bulk-file-input"
                                            type="file" 
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                                        />
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className={styles['modal-actions']}>
                            <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                            <button type="submit" className={styles['btn-send']} disabled={loading}>
                                {loading ? 'Broadcasting...' : 'Broadcast Inquiry Now'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BulkEnquiryModal;
