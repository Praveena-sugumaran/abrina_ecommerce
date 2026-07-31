import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import styles from './AdminLayout.module.css';
import { getImgUrl } from '@/utils/imageConfig';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface Plan {
    _id: string;
    name: string;
    plan_type: string;
    price: number;
    duration_value: number;
    duration_type: string;
    description: string;
    tagline: string;
    features: string[];
    level: number;
    badge_color: string;
    badge_icon: string;
    is_active: boolean;
    is_recommended: boolean;
    max_products: number;
    max_images_per_product: number;
    max_showcases: number;
    max_rfq_responses: number;
    has_analytics: boolean;
    has_verified_badge: boolean;
    max_ai_tasks: number;
    max_inquiries: number;
    max_rfqs: number;
    has_priority_support: boolean;
    has_partner_data: boolean;
}

const AdminModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', type = 'danger' }: any) => {
    const { t } = useAuth();
    if (!isOpen) return null;
    return (
        <div className={styles['admin-modal-overlay']}>
            <div className={styles['admin-modal']}>
                <div className={styles['admin-modal-header']}>
                    <h3>{title}</h3>
                    <button onClick={onCancel} className={styles['admin-modal-close']}>&times;</button>
                </div>
                <div className={styles['admin-modal-body']}>{children}</div>
                <div className={styles['admin-modal-footer']}>
                    <button onClick={onCancel} className={"admin-btn" + " " + "admin-btn-secondary"}>{t('cancel') || 'Cancel'}</button>
                    <button onClick={onConfirm} className={`admin-btn ${type === 'danger' ? 'admin-btn-danger' : 'admin-btn-primary'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const emptyForm = {
    name: '', plan_type: 'supplier', price: 0,
    duration_value: 1, duration_type: 'month',
    description: '', tagline: '', features: '',
    level: 1, badge_color: 'var(--primary-color)', badge_icon: '',
    is_active: true, is_recommended: false,
    max_products: 10, max_images_per_product: 5,
    max_showcases: 0, max_rfq_responses: 10,
    has_analytics: false, has_verified_badge: false,
    max_ai_tasks: 10, max_inquiries: -1, max_rfqs: -1,
    has_priority_support: false, has_partner_data: false,
};

const AdminSubscriptionPlans = () => {
    const { showToast } = useToast();
    const { t } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('supplier');
    
    const [modal, setModal] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${BACKEND_URL}/subscription-plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(data || []);
        } catch (err) {
            console.error('Fetch error', err);
            showToast(t('failed_fetch_plans') || 'Failed to fetch plans', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const uploadData = new FormData();
        uploadData.append('media', file);
        try {
            const res = await axios.post(`${BACKEND_URL}/products/upload-media`, uploadData, { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data' 
                } 
            });
            if (res.data.success) {
                setFormData({ ...formData, badge_icon: res.data.url });
                showToast(t('badge_icon_uploaded') || 'Badge icon uploaded successfully', 'success');
            }
        } catch (err) {
            showToast(t('failed_upload_icon') || 'Failed to upload icon', 'error');
        }
    };

    const handleEdit = (plan: Plan) => {
        setFormData({ ...plan, features: plan.features.join('\n') });
        setEditingId(plan._id);
        setIsFormOpen(true);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleDeleteConfirm = () => {
        const id = modal.id; setModal({ open: false, id: null });
        axios.delete(`${BACKEND_URL}/subscription-plans/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { fetchPlans(); showToast(t('plan_deleted') || 'Plan deleted.'); })
            .catch(() => showToast(t('error') || 'Error', 'error'));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, features: formData.features.split('\n').filter((f: string) => f.trim()) };
            if (editingId) {
                await axios.put(`${BACKEND_URL}/subscription-plans/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                showToast(t('plan_updated') || 'Plan updated!');
            } else {
                await axios.post(`${BACKEND_URL}/subscription-plans`, payload, { headers: { Authorization: `Bearer ${token}` } });
                showToast(t('plan_created') || 'Plan created!');
            }
            setIsFormOpen(false); setEditingId(null); fetchPlans();
        } catch (e) { showToast(t('error') || 'Error', 'error'); }
    };

    const tr = (key: string, fallback: string) => {
        const val = t(key);
        return (val && val !== key) ? val : fallback;
    };

    const isSupplier = formData.plan_type === 'supplier';
    const filteredPlans = (plans || []).filter(p => p.plan_type === activeTab);

    const CheckboxOption = ({ name, id, label, bg, border, color }: any) => (
        <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: '10px', cursor: 'pointer' }}>
            <input type="checkbox" name={name} checked={!!formData[name]} onChange={handleChange} id={id} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color }}>{label}</span>
        </label>
    );

    return (
        <div className={"admin-page"}>
            
            <AdminModal isOpen={modal.open} title={tr('delete_plan', "Delete Plan")} onConfirm={handleDeleteConfirm} onCancel={() => setModal({ open: false, id: null })} confirmText={tr('delete', "Delete")} type="danger">
                <p style={{ fontSize: '14px' }}>{tr('confirm_delete_plan', 'Are you sure you want to delete this plan? This action cannot be undone.')}</p>
            </AdminModal>

            {!isFormOpen ? (
                <>
                    <div className={"admin-page-header"}>
                        <div>
                            <h1 className={"admin-page-title"}>{tr('subscription_plans', 'Subscription Plans')}</h1>
                            <p className={"admin-page-subtitle"}>{tr('manage_plans_desc', 'Manage buyer and seller subscription plans')}</p>
                        </div>
                        <button onClick={() => { setFormData(emptyForm); setEditingId(null); setIsFormOpen(true); window.scrollTo(0, 0); }} className={"admin-btn" + " " + "admin-btn-primary"}>{tr('add_new_plan', '+ Add New Plan')}</button>
                    </div>

                    <div className={styles['admin-pill-tabs']} style={{ marginBottom: '32px' }}>
                        {['supplier', 'buyer'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`${styles['admin-pill-tab']} ${activeTab === tab ? styles['active'] : ''}`}>
                                {tab === 'supplier' ? tr('seller_plans', 'Seller Plans') : tr('buyer_plans', 'Buyer Plans')}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className={"admin-loading-text"}>{tr('loading_plans', 'Loading plans...')}</div>
                    ) : filteredPlans.length === 0 ? (
                        <div className={"admin-empty-state"}>
                            <div className={"admin-empty-state-icon"}>📋</div>
                            <p>{tr('no_plans_yet', `No ${activeTab === 'supplier' ? 'seller' : 'buyer'} plans created yet.`)}</p>
                            <button onClick={() => { setFormData({ ...emptyForm, plan_type: activeTab }); setEditingId(null); setIsFormOpen(true); window.scrollTo(0, 0); }} className={"admin-btn" + " " + "admin-btn-primary"}>{tr('create_plan', '+ Create Plan')}</button>
                        </div>
                    ) : (
                        <div className={styles['admin-plans-grid']}>
                            {filteredPlans.map(plan => (
                                <div key={plan._id} className={styles['admin-plan-card']}>
                                    <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: '6px' }}>
                                        {plan.is_recommended && <span className={"admin-badge" + " " + "admin-badge-neutral"} style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tr('recommended', 'Recommended')}</span>}
                                        <span className={`admin-badge ${plan.is_active ? 'admin-badge-success' : 'admin-badge-neutral'}`}>{plan.is_active ? tr('active', 'Active') : tr('inactive', 'Inactive')}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        {plan.badge_icon && (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', border: '1.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}>
                                                <img src={getImgUrl(plan.badge_icon)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        )}
                                        <span className={`admin-badge ${plan.plan_type === 'supplier' ? 'admin-badge-info' : 'admin-badge-purple'}`}>
                                            {plan.plan_type === 'supplier' ? tr('seller', 'Seller') : tr('buyer', 'Buyer')}
                                        </span>
                                    </div>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px', color: plan.badge_color || 'var(--admin-text-main)' }}>{plan.name}</h3>
                                    <p style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 4px' }}>
                                        ${plan.price}<span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 400 }}> / {plan.duration_value} {tr(plan.duration_type + '_s', plan.duration_type + '(s)')}</span>
                                    </p>
                                    {plan.plan_type === 'supplier' ? (
                                        <div style={{ fontSize: '12px', background: 'var(--admin-bg)', padding: '7px 10px', borderRadius: '7px', margin: '10px 0 12px', color: 'var(--admin-text-secondary)' }}>
                                            {tr('products', 'Products')}: <b>{plan.max_products <= 0 ? tr('unlimited', '∞') : plan.max_products}</b> · {tr('images', 'Images')}: <b>{plan.max_images_per_product <= 0 ? tr('unlimited', '∞') : plan.max_images_per_product}</b> · {tr('rfqs', 'RFQs')}: <b>{plan.max_rfq_responses <= 0 ? tr('unlimited', '∞') : plan.max_rfq_responses}</b>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px', background: 'var(--admin-bg)', padding: '7px 10px', borderRadius: '7px', margin: '10px 0 12px', color: 'var(--admin-text-secondary)' }}>
                                            {tr('ai_tasks', 'AI Tasks')}: <b>{plan.max_ai_tasks <= 0 ? tr('unlimited', '∞') : plan.max_ai_tasks}</b> · {tr('inquiries', 'Inquiries')}: <b>{plan.max_inquiries <= 0 ? tr('unlimited', '∞') : plan.max_inquiries}</b> · {tr('rfqs', 'RFQs')}: <b>{plan.max_rfqs <= 0 ? tr('unlimited', '∞') : plan.max_rfqs}</b>
                                        </div>
                                    )}
                                    <ul style={{ margin: '0 0 18px', padding: 0, fontSize: '12px', listStyle: 'none' }}>
                                        {(plan.features || []).slice(0, 4).map((f, i) => (
                                            <li key={i} style={{ marginBottom: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--admin-text-secondary)' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                {f}
                                            </li>
                                        ))}
                                        {plan.features?.length > 4 && <li style={{ color: 'var(--admin-text-muted)', paddingLeft: '19px', fontSize: '11px' }}>+{plan.features.length - 4} {tr('more', 'more')}</li>}
                                    </ul>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEdit(plan)} className={"admin-action-btn-edit"} style={{ flex: 1, padding: '8px' }}>{tr('edit', 'Edit')}</button>
                                        <button onClick={() => setModal({ open: true, id: plan._id })} className={"admin-action-btn-delete"} style={{ flex: 1, padding: '8px' }}>{tr('delete', 'Delete')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div className={"admin-page-header"} style={{ marginBottom: '40px' }}>
                        <div>
                            <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>{tr('back_to_plans', '← Back to Plans')}</button>
                            <h1 className={"admin-page-title"} style={{ fontSize: '2rem' }}>{editingId ? tr('refine_plan', 'Refine Plan') : tr('architect_new_plan', 'Architect New Plan')}</h1>
                        </div>
                        <div className={styles['plan-form-header-actions']} style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={() => setIsFormOpen(false)} className={"admin-btn"} style={{ padding: '12px 24px' }}>{tr('discard_changes', 'Discard Changes')}</button>
                            <button type="submit" form="plan-form" className={"admin-btn" + " " + "admin-btn-primary"} style={{ padding: '12px 32px' }}>{editingId ? tr('save_configuration', 'Save Configuration') : tr('release_plan', 'Release Plan')}</button>
                        </div>
                    </div>

                    <form id="plan-form" onSubmit={handleSubmit} className={styles['plan-form-grid']}>
                        {/* Main Settings */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div className={"admin-card"} style={{ padding: '32px' }}>
                                <h3 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 800 }}>{tr('primary_specification', 'Primary Specification')}</h3>
                                <div className={styles['admin-form-group']} style={{ marginBottom: '24px' }}>
                                    <label className={styles['admin-form-label']}>{tr('plan_name', 'Plan Name')}</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className={styles['admin-form-input']} style={{ fontSize: '1.2rem', padding: '16px' }} placeholder={tr('plan_name_placeholder', "e.g. Enterprise Sourcing Pro")} />
                                </div>
                                <div className={styles['admin-form-grid']} style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>{tr('price_usd', 'Price (USD)')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#000' }}>$</span>
                                            <input type="number" name="price" value={formData.price} onChange={handleChange} required className={styles['admin-form-input']} style={{ paddingLeft: '32px' }} min="0" step="0.01" />
                                        </div>
                                    </div>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']}>{tr('market_level', 'Market Level')}</label>
                                        <input type="number" name="level" value={formData.level} onChange={handleChange} required className={styles['admin-form-input']} placeholder="1-100" />
                                    </div>
                                </div>
                            </div>

                            <div className={"admin-card"} style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{isSupplier ? tr('seller', 'Seller') : tr('buyer', 'Buyer')} {tr('quotas_limits', 'Quotas & Limits')}</h3>
                                    <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', background: '#000', color: '#fff', borderRadius: '4px' }}>{formData.plan_type === 'supplier' ? 'Seller' : formData.plan_type} {tr('mode', 'mode')}</span>
                                </div>
                                
                                {isSupplier ? (
                                    <div className={styles['admin-form-grid']} style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('product_listings', 'Product Listings')}</label><input type="number" name="max_products" value={formData.max_products} onChange={handleChange} className={styles['admin-form-input']} placeholder={tr('unlimited_placeholder', "0 for unlimited")} /></div>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('images_per_product', 'Images per Product')}</label><input type="number" name="max_images_per_product" value={formData.max_images_per_product} onChange={handleChange} className={styles['admin-form-input']} /></div>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('premium_showcases', 'Premium Showcases')}</label><input type="number" name="max_showcases" value={formData.max_showcases} onChange={handleChange} className={styles['admin-form-input']} /></div>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('rfq_responses', 'RFQ Responses')}</label><input type="number" name="max_rfq_responses" value={formData.max_rfq_responses} onChange={handleChange} className={styles['admin-form-input']} /></div>
                                    </div>
                                ) : (
                                    <div className={styles['admin-form-grid']}>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('ai_sourcing_tasks', 'AI Sourcing Tasks')}</label><input type="number" name="max_ai_tasks" value={formData.max_ai_tasks} onChange={handleChange} className={styles['admin-form-input']} min="-1" /></div>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('direct_inquiries', 'Direct Inquiries')}</label><input type="number" name="max_inquiries" value={formData.max_inquiries} onChange={handleChange} className={styles['admin-form-input']} min="-1" /></div>
                                        <div className={styles['admin-form-group']}><label className={styles['admin-form-label']}>{tr('rfq_postings', 'RFQ Postings')}</label><input type="number" name="max_rfqs" value={formData.max_rfqs} onChange={handleChange} className={styles['admin-form-input']} min="-1" /></div>
                                    </div>
                                )}
                            </div>

                            <div className={"admin-card"} style={{ padding: '32px' }}>
                                <h3 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 800 }}>{tr('feature_manifest', 'Feature Manifest')}</h3>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('detailed_offerings') || 'Detailed Offerings (one per line)'}</label>
                                    <textarea name="features" value={formData.features} onChange={handleChange} rows={8} className={styles['admin-form-textarea']} style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                                        placeholder={t('features_placeholder') || "Verified Pro Badge\\nPriority Search Indexing\\nAdvanced Market Analytics"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Configuration */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div className={"admin-card"} style={{ padding: '24px' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>{t('identity_badge') || 'Identity & Badge'}</h3>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div 
                                        onClick={() => document.getElementById('icon-upload')?.click()}
                                        style={{ width: '80px', height: '80px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                                    >
                                        {formData.badge_icon ? (
                                            <img src={getImgUrl(formData.badge_icon)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} />
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M12 5v14M5 12h14"></path></svg>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input type="file" id="icon-upload" hidden accept="image/*" onChange={handleFileUpload} />
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>{t('custom_icon') || 'Custom Icon'}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>{t('upload_svg_png') || 'Upload SVG/PNG'}</p>
                                        {formData.badge_icon && <button type="button" onClick={() => setFormData({ ...formData, badge_icon: '' })} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '10px', fontWeight: 800, cursor: 'pointer', padding: 0, marginTop: '8px' }}>{t('remove_icon') || 'REMOVE ICON'}</button>}
                                    </div>
                                </div>
                                <div className={styles['admin-form-group']} style={{ marginTop: '24px' }}>
                                    <label className={styles['admin-form-label']}>{t('accent_color') || 'Accent Color'}</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input type="color" name="badge_color" value={formData.badge_color} onChange={handleChange} style={{ width: '44px', height: '44px', padding: '4px', cursor: 'pointer', border: '1.5px solid #000', borderRadius: '10px', background: '#fff' }} />
                                        <input type="text" value={formData.badge_color} readOnly className={styles['admin-form-input']} style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }} />
                                    </div>
                                </div>
                            </div>

                            <div className={"admin-card"} style={{ padding: '24px' }}>
                                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 800 }}>{t('terms_duration') || 'Terms & Duration'}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                    <input type="number" name="duration_value" value={formData.duration_value} onChange={handleChange} required className={styles['admin-form-input']} style={{ flex: 1, minWidth: '120px', boxSizing: 'border-box' }} />
                                    <select name="duration_type" value={formData.duration_type} onChange={handleChange} className={styles['admin-form-select']} style={{ flex: 1.5, minWidth: '120px', boxSizing: 'border-box' }}>
                                        <option value="day">{t('day_s') || 'Day(s)'}</option>
                                        <option value="month">{t('month_s') || 'Month(s)'}</option>
                                        <option value="year">{t('year_s') || 'Year(s)'}</option>
                                    </select>
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('market_tagline') || 'Market Tagline'}</label>
                                    <input type="text" name="tagline" value={formData.tagline} onChange={handleChange} className={styles['admin-form-input']} style={{ fontSize: '13px' }} placeholder={t('tagline_placeholder') || "Short catchy phrase"} />
                                </div>
                            </div>

                            <div className={"admin-card"} style={{ padding: '24px', background: '#000', color: '#fff' }}>
                                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 800 }}>{t('visibility_controls') || 'Visibility & Controls'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div 
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: '#1a1a1a', borderRadius: '12px', cursor: 'pointer', border: formData.is_active ? '1.5px solid #4ade80' : '1.5px solid #333' }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{t('active_status') || 'Active Status'}</span>
                                        <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: formData.is_active ? '#4ade80' : '#333', position: 'relative', transition: '0.2s', flexShrink: 0 }}>
                                            <div style={{ position: 'absolute', top: '2px', left: formData.is_active ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => setFormData({ ...formData, is_recommended: !formData.is_recommended })}
                                        style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: '#1a1a1a', borderRadius: '12px', cursor: 'pointer', border: formData.is_recommended ? '1.5px solid #fbbf24' : '1.5px solid #333' }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{t('recommended') || 'Recommended'}</span>
                                        <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: formData.is_recommended ? '#fbbf24' : '#333', position: 'relative', transition: '0.2s', flexShrink: 0 }}>
                                            <div style={{ position: 'absolute', top: '2px', left: formData.is_recommended ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                                        </div>
                                    </div>
                                    {isSupplier && (
                                        <>
                                            <div 
                                                onClick={() => setFormData({ ...formData, has_verified_badge: !formData.has_verified_badge })}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1a1a1a', borderRadius: '12px', cursor: 'pointer' }}
                                            >
                                                <span style={{ fontSize: '13px', fontWeight: 700 }}>{t('verified_pro_badge') || 'Verified Pro Badge'}</span>
                                                <input type="checkbox" checked={formData.has_verified_badge} readOnly style={{ accentColor: '#3b82f6' }} />
                                            </div>
                                            <div 
                                                onClick={() => setFormData({ ...formData, has_analytics: !formData.has_analytics })}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1a1a1a', borderRadius: '12px', cursor: 'pointer' }}
                                            >
                                                <span style={{ fontSize: '13px', fontWeight: 700 }}>{t('advanced_analytics') || 'Advanced Analytics'}</span>
                                                <input type="checkbox" checked={formData.has_analytics} readOnly style={{ accentColor: '#3b82f6' }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Mobile-only bottom action bar */}
                    <div className={styles['plan-form-mobile-actions']}>
                        <button type="button" onClick={() => setIsFormOpen(false)} className={"admin-btn admin-btn-secondary"} style={{ flex: 1, justifyContent: 'center' }}>{t('discard_changes') || 'Discard Changes'}</button>
                        <button type="submit" form="plan-form" className={"admin-btn admin-btn-primary"} style={{ flex: 1, justifyContent: 'center' }}>{editingId ? (t('save_configuration') || 'Save Configuration') : (t('release_plan') || 'Release Plan')}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptionPlans;
