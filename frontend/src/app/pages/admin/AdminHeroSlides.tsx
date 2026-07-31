import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';

interface HeroSlide {
    _id?: string;
    tag: string;
    title: string;
    subtitle: string;
    cta1_label: string;
    cta1_link: string;
    cta1_needsAuth: boolean;
    cta1_variant: 'primary' | 'secondary' | 'outline';
    cta2_label: string;
    cta2_link: string;
    cta2_variant: 'primary' | 'secondary' | 'outline';
    accent: string;
    gradFrom: string;
    gradMid: string;
    gradTo: string;
    shape1: string;
    shape2: string;
    statLabel: string;
    isActive: boolean;
    order: number;
    priority: number;
    image: string;
    mobileImage: string;
    textAlignment: 'left' | 'center' | 'right';
    discountText: string;
    campaignId: string | null;
    featuresText: string;
    translations: any;
    textColor?: 'light' | 'dark';
    products?: any[];
    impressions?: number;
    clicks?: number;
}

const initialForm: HeroSlide = {
    tag: 'Trending Now',
    title: '',
    subtitle: '',
    cta1_label: 'Get Quotes Now',
    cta1_link: '/rfq/post',
    cta1_needsAuth: false,
    cta1_variant: 'primary',
    cta2_label: 'Start Selling',
    cta2_link: '/become-supplier',
    cta2_variant: 'outline',
    accent: '#000000',
    gradFrom: '#ffffff',
    gradMid: '#f8fafc',
    gradTo: '#f1f5f9',
    shape1: '#e2e8f0',
    shape2: '#f1f5f9',
    statLabel: '40M+ Products',
    isActive: true,
    order: 0,
    priority: 0,
    image: '',
    mobileImage: '',
    textAlignment: 'left',
    discountText: '',
    campaignId: '',
    featuresText: '',
    translations: {},
    textColor: 'light',
    products: []
};

const AdminHeroSlides = () => {
    const { t } = useAuth();
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<HeroSlide>(initialForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formLang, setFormLang] = useState<'Default' | 'Arabic' | 'Spanish' | 'French' | 'Chinese' | 'Hindi'>('Default');
    const { showToast } = useToast();
    
    const selectedProducts = allProducts.filter(p => formData.products?.includes(p._id));

    const fetchSlides = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/hero-slides/all');
            setSlides(data || []);
        } catch (err: any) {
            console.error('Fetch error:', err);
            showToast('Error fetching slides', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const { data } = await api.get('/sale-campaigns');
            setCampaigns(data || []);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
        }
    };

    const fetchAllProducts = async () => {
        try {
            const { data } = await api.get('/admin/products');
            setAllProducts(data || []);
        } catch (err) {
            console.error('Failed to load products:', err);
        }
    };

    useEffect(() => {
        fetchSlides();
        fetchCampaigns();
        fetchAllProducts();
        // eslint-disable-next-line
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;
        
        if (name === 'order' || name === 'priority') {
            setFormData({ ...formData, [name]: Number(value) });
        } else {
            setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        }
    };

    const handleTextChange = (field: string, value: string) => {
        if (formLang === 'Default') {
            setFormData({ ...formData, [field]: value });
        } else {
            const translations = formData.translations ? { ...formData.translations } : {};
            if (!translations[formLang]) translations[formLang] = {};
            translations[formLang][field] = value;
            setFormData({ ...formData, translations });
        }
    };

    const getFieldValue = (field: string) => {
        if (formLang === 'Default') {
            return (formData as any)[field] || '';
        }
        return formData.translations?.[formLang]?.[field] || '';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'image' | 'mobileImage') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const uploadData = new FormData();
        uploadData.append('media', file);
        try {
            const res = await api.post('/products/upload-media', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                setFormData({ ...formData, [fieldName]: res.data.url });
                showToast(`${fieldName === 'image' ? 'Banner' : 'Mobile'} image uploaded successfully`, 'success');
            }
        } catch (err) {
            showToast('Failed to upload image', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            ...formData,
            campaignId: formData.campaignId || null
        };

        try {
            if (editingId) {
                await api.put(`/hero-slides/${editingId}`, payload);
                showToast('Slide updated successfully', 'success');
            } else {
                await api.post('/hero-slides', payload);
                showToast('Slide created successfully', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData(initialForm);
            setFormLang('Default');
            fetchSlides();
        } catch (err) {
            console.error('Submit error:', err);
            showToast('Failed to save slide', 'error');
        }
    };

    const handleEdit = (slide: HeroSlide) => {
        setFormData({
            ...slide,
            campaignId: slide.campaignId ? (slide.campaignId as any)._id || slide.campaignId : '',
            translations: slide.translations || {},
            textColor: slide.textColor || 'light',
            products: slide.products ? slide.products.map((p: any) => p._id || p) : []
        });
        setEditingId(slide._id || null);
        setFormLang('Default');
        setShowForm(true);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.admin-content-wrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this slide?')) return;
        try {
            await api.delete(`/hero-slides/${id}`);
            showToast('Slide deleted successfully', 'success');
            fetchSlides();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Failed to delete slide', 'error');
        }
    };

    const toggleActive = async (slide: HeroSlide) => {
        try {
            await api.put(`/hero-slides/${slide._id}`, { ...slide, isActive: !slide.isActive });
            fetchSlides();
        } catch (err) {
            console.error(err);
        }
    };

    const handleExportCSV = () => {
        if (!slides.length) return;
        const headers = ["Title", "Subtitle", "Discount", "Priority", "Status"];
        const rows = slides.map((slide: any) => [
            `"${(slide.title || '').replace(/"/g, '""')}"`,
            `"${(slide.subtitle || '').replace(/"/g, '""')}"`,
            `"${slide.discountTag || ''}"`,
            `"${slide.priority || 0}"`,
            `"${slide.isActive ? 'Active' : 'Inactive'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `hero_slides_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
            <div style={{
                width: '44px', height: '44px', border: '4px solid #e2e8f0',
                borderTop: '4px solid #ff6a00', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading hero banners...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className={styles['usr-page-container']}>
            {!showForm ? (
                <>
                    {/* Page Header */}
                    <div className={styles['usr-header-row']}>
                        <div>
                            <h1 className={styles['usr-page-title']}>Hero Banners</h1>
                            <div className={styles['usr-breadcrumbs']}>
                                <span>Dashboard</span>
                                <span>›</span>
                                <span>Hero Banners</span>
                            </div>
                        </div>
                        <div className={styles['usr-header-actions']}>
                            <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export CSV
                            </button>
                            <button 
                                onClick={() => { setShowForm(true); setFormData(initialForm); setEditingId(null); setFormLang('Default'); window.scrollTo(0, 0); }} 
                                className={styles['usr-add-btn']}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                Create Slide
                            </button>
                        </div>
                    </div>

                    {!loading && slides.length === 0 ? (
                        <div className={styles['usr-main-card']} style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>No hero banners found. Create your first promotion banner to get started.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {slides.map((slide: any) => {
                                const linkedCampaign = campaigns.find(c => c._id === (slide.campaignId?._id || slide.campaignId));
                                return (
                                    <div key={slide._id} className={"admin-card"} style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px', border: '1.5px solid var(--admin-border)', overflowX: 'auto' }}>
                                        <div 
                                            style={{ 
                                                width: '180px', height: '100px', borderRadius: '16px', overflow: 'hidden', 
                                                background: `linear-gradient(135deg, ${slide.gradFrom}, ${slide.gradTo})`,
                                                border: '1px solid var(--admin-border)', position: 'relative', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {slide.image && <img src={getImgUrl(slide.image)} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover', opacity: 0.8 }} />}
                                            <div style={{ position: 'relative', zIndex: 2, padding: '8px', background: '#000', color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', borderRadius: '6px' }}>{slide.tag}</div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{slide.statLabel}</span>
                                                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800, background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>PRIORITY: {slide.priority || 0}</span>
                                                <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 800, background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>ALIGN: {slide.textAlignment?.toUpperCase() || 'LEFT'}</span>
                                                {linkedCampaign && (
                                                    <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800, background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>CAMPAIGN: {linkedCampaign.title}</span>
                                                )}
                                            </div>
                                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000', margin: '0 0 6px' }} dangerouslySetInnerHTML={{ __html: slide.title }} />
                                            <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: '0 0 10px', fontWeight: 500, lineHeight: 1.5 }}>{slide.subtitle}</p>
                                            
                                            {/* Analytics Summary */}
                                            <div style={{ display: 'flex', gap: '20px', fontSize: '12.5px', color: '#334155', fontWeight: 700, borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                                                <span>📈 Views: <strong style={{ color: '#000' }}>{slide.impressions || 0}</strong></span>
                                                <span>🖱️ Clicks: <strong style={{ color: '#000' }}>{slide.clicks || 0}</strong></span>
                                                <span>📊 CTR: <strong style={{ color: '#0f766e' }}>{slide.impressions ? ((slide.clicks / slide.impressions) * 100).toFixed(2) : '0.00'}%</strong></span>
                                            </div>
                                        </div>

                                        <div className={styles['admin-hero-slide-actions']} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    className={`${styles['admin-toggle']} ${slide.isActive ? styles['on'] : ''}`}
                                                    onClick={() => toggleActive(slide)}
                                                />
                                                <span style={{ fontSize: '10px', fontWeight: 900, color: slide.isActive ? '#000' : 'var(--admin-text-muted)' }}>
                                                    {slide.isActive ? 'ACTIVE' : 'HIDDEN'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => handleEdit(slide)} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--admin-bg)', border: '1.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                </button>
                                                <button onClick={() => handleDelete(slide._id)} style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fff', border: '1.5px solid #ff4d4f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f' }}>
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className={"admin-card"} style={{ padding: '32px', border: '1.5px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1.5px solid var(--admin-border)' }}>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#000', margin: 0 }}>{editingId ? 'Edit Hero Banner' : 'Create New Banner'}</h2>
                            <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: 700, marginTop: '4px' }}>Adjust content, alignments, and device image variants</p>
                        </div>
                        <button 
                            onClick={() => { setShowForm(false); setFormData(initialForm); setEditingId(null); setFormLang('Default'); }} 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 900, color: 'var(--admin-text-muted)', background: 'var(--admin-bg)', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid var(--admin-border)' }}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                            Back to List
                        </button>
                    </div>

                    {/* Translations Tab Selector */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid var(--admin-border)', marginBottom: '32px', paddingBottom: '8px', overflowX: 'auto' }}>
                        {(['Default', 'Arabic', 'Spanish', 'French', 'Chinese', 'Hindi'] as const).map(lang => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => setFormLang(lang)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    background: formLang === lang ? '#000' : 'var(--admin-bg)',
                                    color: formLang === lang ? '#fff' : 'var(--admin-text-muted)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {lang === 'Default' ? 'Default (English)' : lang}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Text Content - Language Dependent */}
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px', color: '#2563eb' }}>
                                Text Content Fields ({formLang === 'Default' ? 'Default English' : formLang})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800 }}>Promo Tag (Badge)</label>
                                        <input required={formLang === 'Default'} value={getFieldValue('tag')} onChange={e => handleTextChange('tag', e.target.value)} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} placeholder="e.g. SPECIAL OFFER" />
                                    </div>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800 }}>Discount Label / Accent</label>
                                        <input value={getFieldValue('discountText')} onChange={e => handleTextChange('discountText', e.target.value)} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} placeholder="e.g. SAVE UP TO 70% OFF" />
                                    </div>
                                </div>

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800 }}>Main Heading Title</label>
                                    <input required={formLang === 'Default'} value={getFieldValue('title')} onChange={e => handleTextChange('title', e.target.value)} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 900, fontSize: '16px' }} placeholder="Global B2B Marketplace" />
                                    <p style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, marginTop: '6px' }}>* HTML is supported (e.g., &lt;br/&gt; for line breaks)</p>
                                </div>

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800 }}>Description Text / Subtitle</label>
                                    <textarea required={formLang === 'Default'} value={getFieldValue('subtitle')} onChange={e => handleTextChange('subtitle', e.target.value)} className={styles['admin-form-input']} style={{ minHeight: '80px', borderRadius: '12px', fontWeight: 500, padding: '16px' }} placeholder="Connect with manufacturers directly..." />
                                </div>
                            </div>
                        </div>

                        {/* General layout & campaigns */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Text / Button Alignment</label>
                                <select name="textAlignment" value={formData.textAlignment} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700, padding: '0 16px', background: '#fff', border: '1.5px solid var(--admin-border)' }}>
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Text Color Theme</label>
                                <select name="textColor" value={formData.textColor || 'light'} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700, padding: '0 16px', background: '#fff', border: '1.5px solid var(--admin-border)' }}>
                                    <option value="light">Light (White Text)</option>
                                    <option value="dark">Dark (Charcoal Text)</option>
                                </select>
                            </div>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Associate with Campaign</label>
                                <select name="campaignId" value={formData.campaignId || ''} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700, padding: '0 16px', background: '#fff', border: '1.5px solid var(--admin-border)' }}>
                                    <option value="">No Campaign (Standard layout)</option>
                                    {campaigns.map(c => (
                                        <option key={c._id} value={c._id}>{c.title} (Sale layout)</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Sort Order</label>
                                <input type="number" required name="order" value={formData.order} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} />
                            </div>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Priority (High floats first)</label>
                                <input type="number" required name="priority" value={formData.priority} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} />
                            </div>
                        </div>

                        <div className={styles['admin-form-grid']}>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Stat Badge Text (e.g. 40M+ Products)</label>
                                <input name="statLabel" value={formData.statLabel} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} />
                            </div>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Highlighted Features List (comma separated)</label>
                                <input name="featuresText" value={formData.featuresText} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }} placeholder="e.g. 100% Authentic, Secure Payments, Easy Returns" />
                            </div>
                        </div>

                        {/* Images Upload Area */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            {/* Desktop Background */}
                            <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 16px' }}>Desktop Banner Image</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '100%', height: '120px', borderRadius: '16px', background: '#fff', border: '1.5px solid var(--admin-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {formData.image ? <img src={getImgUrl(formData.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️ No Image'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <label style={{ padding: '10px 16px', background: '#000', color: '#fff', borderRadius: '10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>
                                            Select Desktop Image
                                            <input type="file" className={styles['hidden']} accept="image/*" onChange={e => handleFileUpload(e, 'image')} />
                                        </label>
                                        {formData.image && (
                                            <button type="button" onClick={() => setFormData({...formData, image: ''})} style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Background */}
                            <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 16px' }}>Mobile Banner Image (Optional)</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '100%', height: '120px', borderRadius: '16px', background: '#fff', border: '1.5px solid var(--admin-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {formData.mobileImage ? <img src={getImgUrl(formData.mobileImage)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📱 No Mobile Image'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <label style={{ padding: '10px 16px', background: '#000', color: '#fff', borderRadius: '10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>
                                            Select Mobile Image
                                            <input type="file" className={styles['hidden']} accept="image/*" onChange={e => handleFileUpload(e, 'mobileImage')} />
                                        </label>
                                        {formData.mobileImage && (
                                            <button type="button" onClick={() => setFormData({...formData, mobileImage: ''})} style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Linked Products Showcase */}
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 10px', color: '#2563eb' }}>
                                Linked Products Showcase (Optional - Max 3)
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '16px', fontWeight: 500 }}>
                                Select up to 3 products to display as floating clickable cards over this banner slide.
                            </p>
                            
                            {/* Selected Products Preview List */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {selectedProducts.map((p: any) => {
                                    const img = p.images?.[0] ? getImgUrl(p.images[0]) : '';
                                    return (
                                        <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid var(--admin-border)', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {img ? <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                                            </div>
                                            <div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 700, color: '#000' }}>{p.name}</div>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const filtered = formData.products?.filter((id: string) => id !== p._id) || [];
                                                    setFormData({ ...formData, products: filtered });
                                                }}
                                                style={{ color: '#ef4444', fontSize: '16px', border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                                {selectedProducts.length === 0 && (
                                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>No products linked to this banner yet.</span>
                                )}
                            </div>

                            {/* Search Input for Products */}
                            {(!formData.products || formData.products.length < 3) && (
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text"
                                        placeholder="Type product name to search and link..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className={styles['admin-form-input']}
                                        style={{ height: '44px', borderRadius: '10px', fontSize: '13px', paddingLeft: '16px' }}
                                    />
                                    {productSearch.trim() !== '' && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--admin-border)', borderRadius: '12px', marginTop: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                                            {allProducts
                                                .filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !formData.products?.includes(p._id))
                                                .slice(0, 5)
                                                .map((p: any) => {
                                                    const img = p.images?.[0] ? getImgUrl(p.images[0]) : '';
                                                    return (
                                                        <div 
                                                            key={p._id} 
                                                            onClick={() => {
                                                                const updated = [...(formData.products || []), p._id];
                                                                setFormData({ ...formData, products: updated });
                                                                setProductSearch('');
                                                            }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                {img ? <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                                                            </div>
                                                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                                                {p.name}
                                                            </div>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#000' }}>
                                                                ${p.price}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            }
                                            {allProducts.filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !formData.products?.includes(p._id)).length === 0 && (
                                                <div style={{ padding: '12px 16px', fontSize: '12.5px', color: 'var(--admin-text-muted)', textAlign: 'center' }}>No matching products found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CTA Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
                            {/* CTA 1 */}
                            <div style={{ padding: '24px', background: '#fff', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '24px', height: '24px', background: '#000', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                    <h4 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Primary CTA ({formLang === 'Default' ? 'Default English' : formLang})</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Label</label>
                                        <input required={formLang === 'Default'} value={getFieldValue('cta1_label')} onChange={e => handleTextChange('cta1_label', e.target.value)} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} />
                                    </div>
                                    {formLang === 'Default' && (
                                        <>
                                            <div className={styles['admin-form-group']}>
                                                <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Link / Path</label>
                                                <input required name="cta1_link" value={formData.cta1_link} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} />
                                            </div>
                                            <div className={styles['admin-form-group']}>
                                                <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Style Variant</label>
                                                <select name="cta1_variant" value={formData.cta1_variant} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px', background: '#fff', border: '1.5px solid var(--admin-border)', padding: '0 10px' }}>
                                                    <option value="primary">Primary (Warm Gradient)</option>
                                                    <option value="secondary">Secondary (Accent Glow)</option>
                                                    <option value="outline">Outline (Ghost Border)</option>
                                                </select>
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input type="checkbox" name="cta1_needsAuth" checked={formData.cta1_needsAuth} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>Require authentication?</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* CTA 2 */}
                            <div style={{ padding: '24px', background: '#fff', borderRadius: '20px', border: '1.5px solid var(--admin-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '24px', height: '24px', background: 'var(--admin-bg)', color: '#000', borderRadius: '6px', border: '1.5px solid var(--admin-border)', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                    <h4 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Secondary CTA ({formLang === 'Default' ? 'Default English' : formLang})</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className={styles['admin-form-group']}>
                                        <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Label</label>
                                        <input required={formLang === 'Default'} value={getFieldValue('cta2_label')} onChange={e => handleTextChange('cta2_label', e.target.value)} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} />
                                    </div>
                                    {formLang === 'Default' && (
                                        <>
                                            <div className={styles['admin-form-group']}>
                                                <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Link / Path</label>
                                                <input required name="cta2_link" value={formData.cta2_link} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} />
                                            </div>
                                            <div className={styles['admin-form-group']}>
                                                <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 800 }}>Button Style Variant</label>
                                                <select name="cta2_variant" value={formData.cta2_variant} onChange={handleInputChange} className={styles['admin-form-input']} style={{ height: '40px', borderRadius: '10px', fontSize: '13px', background: '#fff', border: '1.5px solid var(--admin-border)', padding: '0 10px' }}>
                                                    <option value="primary">Primary (Warm Gradient)</option>
                                                    <option value="secondary">Secondary (Accent Glow)</option>
                                                    <option value="outline">Outline (Ghost Border)</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Visual Palette & Gradients</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                {[
                                    { label: 'Grad Start', name: 'gradFrom' },
                                    { label: 'Grad Mid', name: 'gradMid' },
                                    { label: 'Grad End', name: 'gradTo' },
                                    { label: 'Accent Tool', name: 'accent' },
                                    { label: 'Design Dot 1', name: 'shape1' },
                                    { label: 'Design Dot 2', name: 'shape2' }
                                ].map((color: any) => (
                                    <div key={color.name} style={{ background: '#fff', border: '1.5px solid var(--admin-border)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input type="color" name={color.name} value={(formData as any)[color.name]} onChange={handleInputChange} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>{color.label}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{(formData as any)[color.name]}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '1.5px solid var(--admin-border)', paddingTop: '32px', display: 'flex', gap: '16px' }}>
                            <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} style={{ flex: 1, height: '54px', borderRadius: '14px', fontSize: '16px', fontWeight: 900 }}>
                                {editingId ? 'Save Changes' : 'Create Slide'}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setFormData(initialForm); setEditingId(null); setFormLang('Default'); }} className={styles['admin-btn']} style={{ width: '160px', height: '54px', borderRadius: '14px', fontSize: '16px', fontWeight: 800 }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminHeroSlides;
