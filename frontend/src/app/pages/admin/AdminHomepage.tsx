import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';

interface Section {
    _id: string;
    id_name: string;
    title: string;
    subtitle: string;
    is_active: boolean;
    order: number;
    data?: any;
}

const AdminHomepage = () => {
    const { t } = useAuth();
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchSections = async () => {
        try {
            const { data } = await api.get('/homepage-sections');
            setSections(data.sort((a: Section, b: Section) => a.order - b.order));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSections();
    }, []);

    const toggleStatus = async (id: string) => {
        try {
            await api.put(`/homepage-sections/${id}/toggle`);
            fetchSections();
            showToast('Visibility toggled successfully', 'success');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveSection = async (section: Section) => {
        try {
            await api.put(`/homepage-sections/${section._id}`, { 
                title: section.title, 
                subtitle: section.subtitle, 
                data: section.data 
            });
            showToast(`${section.id_name.replace(/_/g, ' ')} updated successfully`, 'success');
            fetchSections(); // Refresh to ensure data sync
        } catch (err) {
            console.error(err);
            showToast('Failed to save changes', 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('media', file);
        try {
            const res = await api.post('/products/upload-media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                const newSecs = [...sections];
                if (!newSecs[index].data) newSecs[index].data = {};
                newSecs[index].data.image = res.data.url;
                setSections(newSecs);
                showToast('Image uploaded. Remember to click Save.', 'info');
            }
        } catch (err) {
            showToast('Failed to upload image.', 'error');
        }
    };

    const updateLocalField = (index: number, field: string, value: any, nested = false) => {
        const newSecs = [...sections];
        if (nested) {
            if (!newSecs[index].data) newSecs[index].data = {};
            newSecs[index].data[field] = value;
        } else {
            (newSecs[index] as any)[field] = value;
        }
        setSections(newSecs);
    };

    // --- Drag and Drop Logic ---
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => setDraggedItemIndex(index);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = async (index: number) => {
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        const newSections = [...sections];
        const draggedItem = newSections[draggedItemIndex];
        newSections.splice(draggedItemIndex, 1);
        newSections.splice(index, 0, draggedItem);
        setSections(newSections);
        setDraggedItemIndex(null);
        try {
            const orderedIds = newSections.map(s => s._id);
            await api.put('/homepage-sections/order', { orderedIds });
            showToast('Layout order updated', 'success');
        } catch (err) {
            console.error(err);
            fetchSections();
        }
    };


    if (loading) return (
        <div className={styles['flex']} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div className={"admin-loading-spinner"} />
        </div>
    );

    return (
        <div className={"admin-page"} style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ color: '#000', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '8px' }}>Home Layout Editor</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Manage marketplace sections, visibility, and display sequence</p>
                </div>
                <div style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-main)', padding: '10px 18px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, border: '1.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    Drag to reorder sections
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {sections.map((sec, index) => (
                    <div
                        key={sec._id}
                        className={"admin-card"}
                        style={{ 
                            position: 'relative', 
                            overflow: 'hidden', 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: draggedItemIndex === index ? 0.3 : 1,
                            transform: draggedItemIndex === index ? 'scale(0.98)' : 'none',
                            border: draggedItemIndex === index ? '2px dashed #000' : '1px solid var(--admin-border)',
                            padding: '0'
                        }}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                    >
                        {/* Drag Handle Section */}
                        <div 
                            style={{ 
                                position: 'absolute', 
                                left: 0, top: 0, bottom: 0, 
                                width: '40px', 
                                background: 'var(--admin-bg)', 
                                borderRight: '1px solid var(--admin-border)',
                                cursor: 'move',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--admin-text-muted)'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 8h16M4 16h16"/></svg>
                        </div>
                        
                        <div style={{ padding: '32px 32px 32px 64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                                {/* Section Info */}
                                <div style={{ width: '220px', flexShrink: 0 }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#000', margin: '0 0 4px', letterSpacing: '0.05em' }}>
                                        {sec.id_name.replace(/_/g, ' ')}
                                    </h3>
                                    <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 800, marginBottom: '20px' }}>ID: {sec.id_name}</div>

                                    <div style={{ background: 'var(--admin-bg)', padding: '16px', borderRadius: '16px', border: '1.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            className={`${styles['admin-toggle']} ${sec.is_active ? styles['on'] : ''}`}
                                            onClick={() => toggleStatus(sec._id)}
                                        />
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: sec.is_active ? '#000' : 'var(--admin-text-muted)' }}>
                                            {sec.is_active ? 'VISIBLE' : 'HIDDEN'}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                        <div className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Main Heading</label>
                                            <input
                                                type="text"
                                                className={styles['admin-form-input']}
                                                style={{ height: '44px', borderRadius: '12px', fontWeight: 700 }}
                                                value={sec.title || ''}
                                                onChange={e => updateLocalField(index, 'title', e.target.value)}
                                                placeholder="Section Title"
                                            />
                                        </div>
                                        <div className={styles['admin-form-group']}>
                                            <label className={styles['admin-form-label']} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Subtitle / Description</label>
                                            <input
                                                type="text"
                                                className={styles['admin-form-input']}
                                                style={{ height: '44px', borderRadius: '12px', fontWeight: 700 }}
                                                value={sec.subtitle || ''}
                                                onChange={e => updateLocalField(index, 'subtitle', e.target.value)}
                                                placeholder="Helpful subtitle text"
                                            />
                                        </div>
                                    </div>

                                    {/* App Promo Details */}
                                    {sec.id_name === 'app_promo' && (
                                        <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div className={styles['admin-form-group']}>
                                                    <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 900 }}>App Store Link</label>
                                                    <input
                                                        type="text"
                                                        className={styles['admin-form-input']}
                                                        style={{ height: '40px', borderRadius: '10px' }}
                                                        value={sec.data?.appStoreLink || ''}
                                                        onChange={e => updateLocalField(index, 'appStoreLink', e.target.value, true)}
                                                    />
                                                </div>
                                                <div className={styles['admin-form-group']}>
                                                    <label className={styles['admin-form-label']} style={{ fontSize: '10px', fontWeight: 900 }}>Play Store Link</label>
                                                    <input
                                                        type="text"
                                                        className={styles['admin-form-input']}
                                                        style={{ height: '40px', borderRadius: '10px' }}
                                                        value={sec.data?.googlePlayLink || ''}
                                                        onChange={e => updateLocalField(index, 'googlePlayLink', e.target.value, true)}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#fff', padding: '16px', borderRadius: '14px', border: '1.5px solid var(--admin-border)' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--admin-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {sec.data?.image ? <img src={getImgUrl(sec.data.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>App Mockup (Transparent PNG recommended)</div>
                                                    <label style={{ fontSize: '12px', fontWeight: 950, cursor: 'pointer', background: '#000', color: '#fff', padding: '10px 16px', borderRadius: '10px', display: 'inline-block' }}>
                                                        {sec.data?.image ? 'Change Mockup' : 'Choose Mockup'}
                                                        <input type="file" className={styles['hidden']} accept="image/*" onChange={(e) => handleFileUpload(e, index)} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>App Features</h4>
                                                    <button 
                                                        onClick={() => {
                                                            const newSecs = [...sections];
                                                            if (!newSecs[index].data) newSecs[index].data = {};
                                                            if (!newSecs[index].data.features) newSecs[index].data.features = [];
                                                            newSecs[index].data.features.push({label: '', icon: ''});
                                                            setSections(newSecs);
                                                        }}
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                        style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                    >+ Add Feature</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                    {(sec.data?.features || []).map((feat: any, idx: number) => (
                                                        <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--admin-border)', position: 'relative' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.features.splice(idx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -5, right: -5, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            <input type="text" placeholder="Icon" style={{ width: '100%', marginBottom: '8px', border: '1px solid #efefef', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }} value={feat.icon || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.features[idx].icon = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                            <input type="text" placeholder="Label" style={{ width: '100%', border: '1px solid #efefef', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }} value={feat.label || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.features[idx].label = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* RFQ Section Editor */}
                                    {sec.id_name === 'rfq_section' && (
                                        <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>RFQ Benefits</h4>
                                                    <button 
                                                        onClick={() => {
                                                            const newSecs = [...sections];
                                                            if (!newSecs[index].data) newSecs[index].data = {};
                                                            if (!newSecs[index].data.benefits) newSecs[index].data.benefits = [];
                                                            newSecs[index].data.benefits.push({title: '', desc: ''});
                                                            setSections(newSecs);
                                                        }}
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                        style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                    >+ Add Benefit</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                    {(sec.data?.benefits || []).map((feat: any, idx: number) => (
                                                        <div key={idx} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid var(--admin-border)', position: 'relative' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.benefits.splice(idx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -8, right: -8, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            <input type="text" placeholder="Title" style={{ width: '100%', marginBottom: '10px', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }} value={feat.title || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.benefits[idx].title = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                            <textarea placeholder="Description" style={{ width: '100%', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', height: '60px' }} value={feat.desc || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.benefits[idx].desc = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>RFQ Statistics</h4>
                                                    <button 
                                                        onClick={() => {
                                                            const newSecs = [...sections];
                                                            if (!newSecs[index].data) newSecs[index].data = {};
                                                            if (!newSecs[index].data.stats) newSecs[index].data.stats = [];
                                                            newSecs[index].data.stats.push({num: '', label: ''});
                                                            setSections(newSecs);
                                                        }}
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                        style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                    >+ Add Stat</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                                    {(sec.data?.stats || []).map((stat: any, idx: number) => (
                                                        <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--admin-border)', position: 'relative' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.stats.splice(idx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -5, right: -5, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            <input type="text" placeholder="Num (e.g. 200k+)" style={{ width: '100%', marginBottom: '6px', border: '1px solid #efefef', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, color: '#000' }} value={stat.num || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.stats[idx].num = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                            <input type="text" placeholder="Label" style={{ width: '100%', border: '1px solid #efefef', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} value={stat.label || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.stats[idx].label = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Why Choose Us Editor */}
                                    {sec.id_name === 'why_choose_us' && (
                                        <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Trust Features</h4>
                                                    <button 
                                                        onClick={() => {
                                                            const newSecs = [...sections];
                                                            if (!newSecs[index].data) newSecs[index].data = {};
                                                            if (!newSecs[index].data.features) newSecs[index].data.features = [];
                                                            newSecs[index].data.features.push({title: '', desc: ''});
                                                            setSections(newSecs);
                                                        }}
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                        style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                    >+ Add Feature</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                    {(sec.data?.features || []).map((feat: any, idx: number) => (
                                                        <div key={idx} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid var(--admin-border)', position: 'relative' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.features.splice(idx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -8, right: -8, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            <input type="text" placeholder="Feature Title" style={{ width: '100%', marginBottom: '10px', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }} value={feat.title || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.features[idx].title = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                            <textarea placeholder="Description" style={{ width: '100%', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', height: '60px' }} value={feat.desc || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.features[idx].desc = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Trust Bar Statistics</h4>
                                                    <button 
                                                        onClick={() => {
                                                            const newSecs = [...sections];
                                                            if (!newSecs[index].data) newSecs[index].data = {};
                                                            if (!newSecs[index].data.stats) newSecs[index].data.stats = [];
                                                            newSecs[index].data.stats.push({num: '', label: ''});
                                                            setSections(newSecs);
                                                        }}
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                        style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                    >+ Add Stat</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                                    {(sec.data?.stats || []).map((stat: any, idx: number) => (
                                                        <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--admin-border)', position: 'relative' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.stats.splice(idx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -5, right: -5, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            <input type="text" placeholder="Num" style={{ width: '100%', marginBottom: '6px', border: '1px solid #efefef', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, color: '#000' }} value={stat.num || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.stats[idx].num = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                            <input type="text" placeholder="Label" style={{ width: '100%', border: '1px solid #efefef', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} value={stat.label || ''} onChange={e => {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.stats[idx].label = e.target.value;
                                                                setSections(newSecs);
                                                            }}/>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                    {/* Shop by Brand Section Editor */}
                                    {sec.id_name === 'shop_by_brand' && (
                                        <div style={{ background: 'var(--admin-bg)', padding: '24px', borderRadius: '20px', border: '1.5px solid var(--admin-border)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Brands List</h4>
                                                <button 
                                                    onClick={() => {
                                                        const newSecs = [...sections];
                                                        if (!newSecs[index].data) newSecs[index].data = {};
                                                        if (!newSecs[index].data.brands) newSecs[index].data.brands = [];
                                                        newSecs[index].data.brands.push({ name: '', logo: '', description: '' });
                                                        setSections(newSecs);
                                                    }}
                                                    className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                                    style={{ fontSize: '10px', fontWeight: 900, padding: '6px 12px', border: 'none' }}
                                                >+ Add Brand</button>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                {(sec.data?.brands || []).map((brand: any, bIdx: number) => {
                                                    const handleBrandImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const formData = new FormData();
                                                        formData.append('media', file);
                                                        try {
                                                            const res = await api.post('/products/upload-media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                            if (res.data.success) {
                                                                const newSecs = [...sections];
                                                                newSecs[index].data.brands[bIdx].logo = res.data.url;
                                                                setSections(newSecs);
                                                                showToast('Brand logo uploaded. Click Save.', 'info');
                                                            }
                                                        } catch (err) {
                                                            showToast('Failed to upload image.', 'error');
                                                        }
                                                    };
                                                    
                                                    return (
                                                        <div key={bIdx} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid var(--admin-border)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.brands.splice(bIdx, 1);
                                                                    setSections(newSecs);
                                                                }}
                                                                style={{ position: 'absolute', top: -8, right: -8, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >×</button>
                                                            
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--admin-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                                                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--admin-border)' }}>
                                                                    {brand.logo ? <img src={getImgUrl(brand.logo)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : '🏷️'}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <label style={{ fontSize: '10px', fontWeight: 900, cursor: 'pointer', background: '#000', color: '#fff', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                                                                        Upload Logo
                                                                        <input type="file" className={styles['hidden']} accept="image/*" onChange={handleBrandImageUpload} />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            
                                                            <input 
                                                                type="text" 
                                                                placeholder="Brand Name" 
                                                                style={{ width: '100%', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }} 
                                                                value={brand.name || ''} 
                                                                onChange={e => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.brands[bIdx].name = e.target.value;
                                                                    setSections(newSecs);
                                                                }}
                                                            />
                                                            
                                                            <input 
                                                                type="text" 
                                                                placeholder="Logo URL (optional)" 
                                                                style={{ width: '100%', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '11px' }} 
                                                                value={brand.logo || ''} 
                                                                onChange={e => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.brands[bIdx].logo = e.target.value;
                                                                    setSections(newSecs);
                                                                }}
                                                            />
                                                            
                                                            <input 
                                                                type="text" 
                                                                placeholder="Short Description" 
                                                                style={{ width: '100%', border: '1px solid #efefef', padding: '8px 12px', borderRadius: '8px', fontSize: '11px' }} 
                                                                value={brand.description || ''} 
                                                                onChange={e => {
                                                                    const newSecs = [...sections];
                                                                    newSecs[index].data.brands[bIdx].description = e.target.value;
                                                                    setSections(newSecs);
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                     <button
                                        onClick={() => handleSaveSection(sec)}
                                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                        style={{ height: '50px', padding: '0 32px', borderRadius: '14px', fontSize: '14px', fontWeight: 900 }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '48px', textAlign: 'center', padding: '40px', background: 'var(--admin-bg)', borderRadius: '24px', border: '2px dashed var(--admin-border)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: 700 }}>
                    💡 Pro Tip: Drag any card using the left handle to instantly update the homepage layout order.
                </p>
            </div>
        </div>
    );
};

export default AdminHomepage;
