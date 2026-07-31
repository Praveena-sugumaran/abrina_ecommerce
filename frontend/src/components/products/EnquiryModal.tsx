import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './EnquiryModal.module.css';

interface EnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    isCustomization?: boolean;
}

const EnquiryModal = ({ isOpen, onClose, product, isCustomization = false }: EnquiryModalProps) => {
    const { siteSettings } = useAuth();
    const isB2C = siteSettings?.rfq_enabled === false;

    const [formData, setFormData] = useState({
        subject: isCustomization ? `Customization request for ${product?.name}` : `Inquiry about ${product?.name}`,
        message: '',
        quantity: 1,
        unit: 'pieces'
    });

    useEffect(() => {
        if (product) {
            setFormData(prev => ({
                ...prev,
                subject: isCustomization ? `Customization request for ${product.name}` : `Inquiry about ${product.name}`,
                quantity: isB2C ? 1 : (product.moq || 1)
            }));
        }
    }, [product, isOpen, isB2C, isCustomization]);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen || !product) return null;



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/inquiries', {
                productId: product._id,
                ...formData,
                isCustomizationRequest: isCustomization
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ ...formData, message: '' });
            }, 2000);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to send inquiry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['enquiry-modal-overlay']} onClick={onClose}>
            <div className={styles['enquiry-modal-box']} onClick={e => e.stopPropagation()}>
                <div className={styles['enquiry-modal-header']}>
                    <h3>{isCustomization ? 'Customization Request' : 'Send Inquiry'}</h3>
                    <button onClick={onClose}>✕</button>
                </div>

                {success ? (
                    <div className={styles['enquiry-success']}>
                        <div className={styles['success-icon']}>✅</div>
                        <h4>Inquiry Sent Successfully!</h4>
                        <p>The supplier will get back to you soon.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles['enquiry-form']}>
                        <div className={styles['enquiry-modal-body']}>
                            <div className={styles['enquiry-product-summary']}>
                                <img src={product.main_image?.startsWith('http') ? product.main_image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${product.main_image}`} alt={product.name} />
                                <div>
                                    <p className={styles['enquiry-prod-name']}>{product.name}</p>
                                    {!isB2C && <p className={styles['enquiry-prod-moq']}>Min. Order: {product.moq} {formData.unit}</p>}
                                </div>
                            </div>

                            <div className={styles['enquiry-field']}>
                                <label>Subject</label>
                                <input 
                                    type="text" 
                                    value={formData.subject} 
                                    onChange={e => setFormData({...formData, subject: e.target.value})}
                                    required
                                />
                            </div>

                            <div className={styles['enquiry-field-row']}>
                                <div className={styles['enquiry-field']}>
                                    <label>Quantity</label>
                                    <input 
                                        type="number" 
                                        min={isB2C ? 1 : (product.moq || 1)} 
                                        value={formData.quantity} 
                                        onChange={e => setFormData({...formData, quantity: parseInt(e.target.value, 10) || 1})}
                                        required
                                    />
                                </div>

                                <div className={styles['enquiry-field']}>
                                    <label>Unit</label>
                                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                        <option value="pieces">Pieces</option>
                                        <option value="sets">Sets</option>
                                        <option value="kg">KG</option>
                                        <option value="tons">Tons</option>
                                    </select>
                                </div>
                            </div>

                             <div className={styles['enquiry-field']}>
                                 <div className={styles['enquiry-label-row']}>
                                     <label>Detailed Requirements</label>
                                 </div>
                                 <textarea 
                                     placeholder="Enter details such as material, size, color, logo customization, etc."
                                     value={formData.message}
                                     onChange={e => setFormData({...formData, message: e.target.value})}
                                     rows={5}
                                     required
                                 ></textarea>
                             </div>
                        </div>

                        <div className={styles['enquiry-actions']}>
                            <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                            <button type="submit" className={styles['btn-send']} disabled={loading}>
                                {loading ? 'Sending...' : 'Send Inquiry Now'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EnquiryModal;
