'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminEmailTemplateForm.module.css';

const AdminEmailTemplateForm = () => {
    const { t } = useAuth();
    const { id } = useParams();
    const navigate = useRouter();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        subject: '',
        body: '',
        status: 'active',
        description: '',
        placeholders: []
    });
    const [placeholderInput, setPlaceholderInput] = useState('');
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchTemplate();
        }
    }, [id]);

    const fetchTemplate = async () => {
        try {
            const res = await api.get(`/admin/email-templates/${id}`);
            setFormData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch template:', err);
            showToast('Failed to fetch template details.', 'error');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'name' && !isEditMode) {
            const slug = value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const addPlaceholder = () => {
        if (placeholderInput && !formData.placeholders.includes(placeholderInput)) {
            setFormData(prev => ({
                ...prev,
                placeholders: [...prev.placeholders, placeholderInput]
            }));
            setPlaceholderInput('');
        }
    };

    const removePlaceholder = (ph) => {
        setFormData(prev => ({
            ...prev,
            placeholders: prev.placeholders.filter(p => p !== ph)
        }));
    };

    const insertPlaceholder = (ph) => {
        const placeholderText = `{{${ph}}}`;
        setFormData(prev => ({
            ...prev,
            body: prev.body + placeholderText
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditMode) {
                await api.put(`/admin/email-templates/${id}`, formData);
                showToast('Template updated successfully!', 'success');
            } else {
                await api.post('/admin/email-templates', formData);
                showToast('Template created successfully!', 'success');
            }
            setTimeout(() => navigate.push('/admin/email-templates'), 1500);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save template.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles['aetf-container']}>Loading template data...</div>;

    return (
        <div className={styles['aetf-container']}>
            <div className={styles['aetf-header']}>
                <div className={styles['aetf-title-box']}>
                    <button className={styles['aetf-btn-back']} onClick={() => navigate.push('/admin/email-templates')}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        Back to Templates
                    </button>
                    <h1>{isEditMode ? 'Edit Email Template' : 'Create New Template'}</h1>
                </div>
                <div className={styles['aetf-header-actions']}>
                    <button 
                        className={`${styles['aetf-btn-tab']} ${!isPreviewMode ? styles['active'] : ''}`}
                        onClick={() => setIsPreviewMode(false)}
                    >
                        Editor
                    </button>
                    <button 
                        className={`${styles['aetf-btn-tab']} ${isPreviewMode ? styles['active'] : ''}`}
                        onClick={() => setIsPreviewMode(true)}
                    >
                        Preview
                    </button>
                </div>

            </div>

            <div className={styles['aetf-main-grid']}>
                <div className={styles['aetf-content-col']}>
                    {!isPreviewMode ? (
                        <div className={styles['aetf-form-card']}>
                            <form id="templateForm" onSubmit={handleSubmit}>
                                <div className={styles['aetf-form-row']}>
                                    <div className={styles['aetf-form-group']}>
                                        <label className={styles['aetf-label']}>Template Name <span>*</span></label>
                                        <input 
                                            type="text" name="name" value={formData.name} 
                                            onChange={handleInputChange} className={styles['aetf-input']} 
                                            placeholder="e.g., Welcome Email" required 
                                        />
                                    </div>
                                    <div className={styles['aetf-form-group']}>
                                        <label className={styles['aetf-label']}>Slug <span>*</span></label>
                                        <input 
                                            type="text" name="slug" value={formData.slug} 
                                            onChange={handleInputChange} className={styles['aetf-input']} 
                                            placeholder="welcome-email" required 
                                            readOnly={isEditMode}
                                            style={isEditMode ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                        />
                                    </div>
                                </div>

                                <div className={styles['aetf-form-group']}>
                                    <label className={styles['aetf-label']}>Email Subject <span>*</span></label>
                                    <input 
                                        type="text" name="subject" value={formData.subject} 
                                        onChange={handleInputChange} className={styles['aetf-input']} 
                                        placeholder="Welcome to our platform!" required 
                                    />
                                </div>

                                <div className={styles['aetf-form-group']}>
                                    <label className={styles['aetf-label']}>Email Body (HTML/Text) <span>*</span></label>
                                    <textarea 
                                        name="body" value={formData.body} 
                                        onChange={handleInputChange} className={styles['aetf-textarea']} 
                                        placeholder="Hello {{user_name}}, welcome to..." required 
                                    />
                                </div>

                                <div className={styles['aetf-form-row']}>
                                    <div className={styles['aetf-form-group']}>
                                        <label className={styles['aetf-label']}>Status</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange} className={styles['aetf-select']}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className={styles['aetf-form-group']}>
                                        <label className={styles['aetf-label']}>Internal Description</label>
                                        <input 
                                            type="text" name="description" value={formData.description} 
                                            onChange={handleInputChange} className={styles['aetf-input']} 
                                            placeholder="Describe when this email is sent..." 
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles['aetf-preview-card']}>

                            <div className={styles['aetf-preview-header']}>
                                <span>Subject:</span> {formData.subject || '(Empty Subject)'}
                            </div>
                            <div 
                                className={styles['aetf-preview-body']}
                                style={{ wordBreak: 'break-word' }}
                                dangerouslySetInnerHTML={{ __html: formData.body.replace(/\n/g, '<br/>') || '(No Body Content)' }}
                            />
                        </div>
                    )}
                </div>

                <div className={styles['aetf-side-col']}>
                    <div className={styles['aetf-side-card']}>
                        <div className={styles['aetf-side-card-header']}>Dynamic Placeholders</div>
                        <div className={styles['aetf-side-card-body']}>
                            <p>Add fields that will be dynamically replaced when sending the email.</p>
                            <div className={styles['aetf-add-ph-box']}>
                                <input 
                                    type="text" 
                                    value={placeholderInput} 
                                    onChange={(e) => setPlaceholderInput(e.target.value)} 
                                    placeholder="e.g., user_name" 
                                />
                                <button type="button" onClick={addPlaceholder}>Add</button>
                            </div>
                            <div className={styles['aetf-ph-list']}>
                                {formData.placeholders.map(ph => (
                                    <div key={ph} className={styles['aetf-ph-item']}>
                                        <span onClick={() => insertPlaceholder(ph)}>{`{{${ph}}}`}</span>
                                        <button onClick={() => removePlaceholder(ph)}>×</button>
                                    </div>
                                ))}
                                {formData.placeholders.length === 0 && <div className={styles['aetf-empty-ph']}>No placeholders added.</div>}
                            </div>
                        </div>
                    </div>

                    <div className={`${styles['aetf-actions-card']} d-flex`} style={{ gap: '10px', padding: '16px' }}>
                        <button 
                            type="submit" 
                            form="templateForm" 
                            className={styles['aetf-btn-save']} 
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
                        </button>
                        <button className={styles['aetf-btn-cancel']} onClick={() => navigate.push('/admin/email-templates')}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEmailTemplateForm;
