import React, { useState, useEffect } from 'react';
import { createCategory, updateCategory, fetchCategories } from '@/services/categoryApi';
import { getImgUrl } from '@/utils/imageConfig';
import { useToast } from '@/context/ToastContext';
import styles from '@/app/pages/admin/AdminLayout.module.css';

interface Category {
    _id: string;
    title: string;
    description?: string;
    parent?: string;
    status?: 'active' | 'inactive';
    order?: number;
    image?: string;
}

interface CategoryFormProps {
    category?: Category | null;
    presetParentId?: string | null;
    onSave: () => void;
    onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, presetParentId, onSave, onCancel }) => {
    const isEdit = !!category;
    const { showToast } = useToast();
    const [title, setTitle] = useState(category?.title || '');
    const [description, setDescription] = useState(category?.description || '');
    const [parent, setParent] = useState(category?.parent || presetParentId || '');
    const [status, setStatus] = useState(category?.status || 'active');
    const [order, setOrder] = useState(category?.order || 0);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(category?.image || '');
    const [flatCategories, setFlatCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchCategories({ flat: true }).then(({ data }: { data: Category[] }) => {
            setFlatCategories(data.filter(c => c._id !== category?._id));
        }).catch(() => { });
    }, [category]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return setError('Title is required');

        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('status', status);
            formData.append('order', order.toString());
            if (parent) formData.append('parent', parent);
            if (imageFile) formData.append('image', imageFile);

            if (isEdit) {
                await updateCategory(category._id, formData);
                showToast('Category updated successfully!', 'success');
            } else {
                await createCategory(formData);
                showToast('Category created successfully!', 'success');
            }
            onSave();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Save failed';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['admin-page']}>
            <div className={styles['admin-page-header']}>
                <div>
                    <h1 className={styles['admin-page-title']}>{isEdit ? 'Edit Category' : 'Add Category'}</h1>
                    <p className={styles['admin-page-subtitle']}>{isEdit ? `Modifying taxonomy for ${category.title}` : 'Expand platform taxonomy with new segments'}</p>
                </div>
                <div className={styles['admin-page-actions']}>
                    <button onClick={onCancel} className={styles['admin-back-btn']}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        Back to List
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {error && <div className={`${styles['admin-alert']} ${styles['admin-alert-error']}`}>{error}</div>}

                <div className={styles['admin-card']}>
                    <div className={styles['admin-card-header']}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Category Details</h2>
                    </div>
                    <div className={styles['admin-card-body']}>
                        <div className={styles['admin-form-grid']}>
                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']}>Category Title <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    className={styles['admin-form-input']}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Electronics, Home & Garden..."
                                />
                            </div>

                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']}>Parent Category</label>
                                <select
                                    className={styles['admin-form-select']}
                                    value={parent}
                                    onChange={e => setParent(e.target.value)}
                                >
                                    <option value="">-- Root Category (No Parent) --</option>
                                    {flatCategories.map(c => (
                                        <option key={c._id} value={c._id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles['admin-form-group'] + ' ' + styles['full-width']}>
                                <label className={styles['admin-form-label']}>Description</label>
                                <textarea
                                    className={styles['admin-form-textarea']}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Briefly describe what this category contains..."
                                />
                            </div>

                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']}>Status</label>
                                <select
                                    className={styles['admin-form-select']}
                                    value={status}
                                    onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className={styles['admin-form-group']}>
                                <label className={styles['admin-form-label']}>Display Order</label>
                                <input
                                    type="number"
                                    className={styles['admin-form-input']}
                                    value={order}
                                    onChange={e => setOrder(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles['admin-card']}>
                    <div className={styles['admin-card-header']}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Visual Asset</h2>
                    </div>
                    <div className={styles['admin-card-body']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'var(--admin-bg)', border: '2px dashed var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                {imagePreview ? (
                                    <img src={getImgUrl(imagePreview)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : <span style={{ fontSize: '2rem', opacity: 0.3 }}>🖼️</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="cat-img" className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ width: 'fit-content', marginBottom: '8px', cursor: 'pointer' }}>
                                    {imagePreview ? 'Change Image' : 'Choose Category Image'}
                                    <input type="file" id="cat-img" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                                </label>
                                <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Recommended: Square image, max 2MB. (JPG, PNG, WebP)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles['admin-form-actions']}>
                    <button type="button" onClick={onCancel} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '12px 24px' }}>
                        Cancel
                    </button>
                    <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} disabled={loading} style={{ padding: '12px 32px' }}>
                        {loading ? 'Processing...' : (isEdit ? 'Update Category' : 'Create Category')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;
