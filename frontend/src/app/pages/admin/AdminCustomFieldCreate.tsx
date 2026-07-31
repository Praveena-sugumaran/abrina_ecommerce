'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

interface Category {
    _id: string;
    title: string;
    parent?: string | null;
    children?: Category[];
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text Input' },
    { value: 'number', label: 'Number Input' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'textarea', label: 'Text Area' },
];

const emptyForm = () => ({
    name: '',
    type: 'text' as const,
    minLength: '',
    maxLength: '',
    options: [] as string[],
    categories: [] as string[],
    isRequired: false,
    showFilter: false,
    order: 0,
    iconFile: null as File | null,
    iconPreview: '',
    iconExisting: '',
    status: 'active' as 'active' | 'inactive',
});

function flattenCategories(cats: Category[], depth = 0): { cat: Category; depth: number }[] {
    const result: { cat: Category; depth: number }[] = [];
    for (const cat of cats) {
        result.push({ cat, depth });
        if (cat.children?.length) {
            result.push(...flattenCategories(cat.children, depth + 1));
        }
    }
    return result;
}

const AdminCustomFieldCreate = () => {
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editingId = searchParams.get('id');

    const [categories, setCategories] = useState<{ cat: Category; depth: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [catSearch, setCatSearch] = useState('');

    const [form, setForm] = useState(emptyForm());
    const [newOption, setNewOption] = useState('');
    const iconInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, fRes] = await Promise.all([
                api.get('/categories'),
                editingId ? api.get('/custom-fields') : Promise.resolve({ data: [] })
            ]);

            const tree: Category[] = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.categories || []);
            setCategories(flattenCategories(tree));

            if (editingId) {
                const fields = fRes.data || [];
                const field = fields.find((f: any) => f._id === editingId);
                if (field) {
                    setForm({
                        name: field.name,
                        type: field.type,
                        minLength: field.minLength != null ? String(field.minLength) : '',
                        maxLength: field.maxLength != null ? String(field.maxLength) : '',
                        options: [...field.options],
                        categories: field.categories.map((c: any) => c._id || c),
                        isRequired: field.isRequired,
                        showFilter: field.showFilter || false,
                        order: field.order,
                        iconFile: null,
                        iconPreview: field.icon ? getImgUrl(field.icon) : '',
                        iconExisting: field.icon || '',
                        status: field.status || 'active',
                    });
                } else {
                    showToast('Custom field not found', 'error');
                    router.push('/admin/custom-fields');
                }
            }
        } catch {
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [editingId]);

    const handleCategoryToggle = (catId: string) => {
        setForm(prev => ({
            ...prev,
            categories: prev.categories.includes(catId)
                ? prev.categories.filter(id => id !== catId)
                : [...prev.categories, catId],
        }));
    };

    const addOption = () => {
        const opt = newOption.trim();
        if (!opt) return;
        if (form.options.includes(opt)) { showToast('Option already exists', 'warning'); return; }
        setForm(prev => ({ ...prev, options: [...prev.options, opt] }));
        setNewOption('');
    };

    const removeOption = (idx: number) => {
        setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setForm(prev => ({ ...prev, iconFile: file, iconPreview: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return showToast('Field name is required', 'error');
        if (!form.type) return showToast('Field type is required', 'error');
        if (form.categories.length === 0) {
            return showToast('At least one category must be selected', 'error');
        }
        if (form.type === 'select' && form.options.length === 0) {
            return showToast('Add at least one option for Dropdown Select type', 'error');
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            fd.append('type', form.type);
            fd.append('minLength', form.minLength !== '' ? String(form.minLength) : '');
            fd.append('maxLength', form.maxLength !== '' ? String(form.maxLength) : '');
            fd.append('options', JSON.stringify(form.options));
            fd.append('categories', JSON.stringify(form.categories));
            fd.append('isRequired', String(form.isRequired));
            fd.append('showFilter', String(form.showFilter));
            fd.append('order', String(form.order));
            fd.append('status', form.status);

            if (editingId) {
                await api.put(`/custom-fields/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                showToast('Custom field updated!', 'success');
            } else {
                await api.post('/custom-fields', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                showToast('Custom field created!', 'success');
            }
            router.push('/admin/custom-fields');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredCats = catSearch
        ? categories.filter(c => c.cat.title.toLowerCase().includes(catSearch.toLowerCase()))
        : categories;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>
                Loading details...
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div className={styles['admin-page-header']} style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                        {editingId ? 'Edit Custom Field' : 'Create Custom Field'}
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: '4px 0 0' }}>
                        {editingId ? 'Modify details of the custom field' : 'Define a new dynamic category-based field'}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/admin/custom-fields')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-secondary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                    ← Back to List
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'flex-start' }}>
                {/* LEFT: Form */}
                <div>
                    <div className={styles['admin-card']} style={{ marginBottom: '0' }}>
                        <div className={styles['admin-card-header']}>
                            <h2>{editingId ? 'Field Configuration' : 'New Field Info'}</h2>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                                Specify parameters for how this field functions
                            </span>
                        </div>
                        <div className={styles['admin-card-body']}>
                            <form onSubmit={handleSubmit}>
                                {/* Field Name */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                        Field Name <span style={{ color: '#e11d48' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        className={styles['admin-form-input']}
                                        placeholder="e.g. Warranty, Color, Material"
                                    />
                                </div>

                                {/* Field Type */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                        Field Type <span style={{ color: '#e11d48' }}>*</span>
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        {FIELD_TYPES.map(ft => (
                                            <button
                                                key={ft.value}
                                                type="button"
                                                disabled={!!editingId}
                                                onClick={() => setForm(prev => ({ ...prev, type: ft.value as any }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '12px 16px',
                                                    borderRadius: '10px',
                                                    border: `2px solid ${form.type === ft.value ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                    background: form.type === ft.value ? 'rgba(var(--primary-color-rgb, 255,106,0),0.08)' : 'var(--admin-bg)',
                                                    color: form.type === ft.value ? 'var(--primary-color)' : 'var(--admin-text-secondary)',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    cursor: editingId ? 'not-allowed' : 'pointer',
                                                    opacity: editingId && form.type !== ft.value ? 0.6 : 1,
                                                    transition: 'all 0.15s',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {ft.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Options for Dropdown Select */}
                                {form.type === 'select' && (
                                    <div style={{ marginBottom: '20px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                            Dropdown Options <span style={{ color: '#e11d48' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                            <input
                                                type="text"
                                                value={newOption}
                                                onChange={e => setNewOption(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                                                className={styles['admin-form-input']}
                                                placeholder="Add option, press Enter"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={addOption}
                                                style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px' }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {form.options.map((opt, i) => (
                                                <div
                                                    key={i}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}
                                                >
                                                    {opt}
                                                    <button type="button" onClick={() => removeOption(i)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 900, fontSize: '14px', lineHeight: 1, padding: 0 }}>✕</button>
                                                </div>
                                            ))}
                                            {form.options.length === 0 && (
                                                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No options added yet</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Validation (min/max) */}
                                {(form.type === 'text' || form.type === 'textarea' || form.type === 'number') && (
                                    <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                {form.type === 'number' ? 'Min Value' : 'Min Length'}
                                            </label>
                                            <input
                                                type="number"
                                                value={form.minLength}
                                                onChange={e => setForm(prev => ({ ...prev, minLength: e.target.value }))}
                                                className={styles['admin-form-input']}
                                                placeholder="None"
                                                min={0}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                {form.type === 'number' ? 'Max Value' : 'Max Length'}
                                            </label>
                                            <input
                                                type="number"
                                                value={form.maxLength}
                                                onChange={e => setForm(prev => ({ ...prev, maxLength: e.target.value }))}
                                                className={styles['admin-form-input']}
                                                placeholder="None"
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Sort Order & Status */}
                                <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={form.order}
                                            onChange={e => setForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                                            className={styles['admin-form-input']}
                                            placeholder="0"
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                            Field Status
                                        </label>
                                        <select
                                            value={form.status}
                                            onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                                            className={styles['admin-form-select']}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Required Checkbox */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <div
                                            onClick={() => setForm(prev => ({ ...prev, isRequired: !prev.isRequired }))}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '5px',
                                                border: `2px solid ${form.isRequired ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                background: form.isRequired ? 'var(--primary-color)' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {form.isRequired && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                                            Required field — sellers must fill this before submitting a product
                                        </span>
                                    </label>
                                </div>

                                {/* Show Filter Checkbox */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <div
                                            onClick={() => setForm(prev => ({ ...prev, showFilter: !prev.showFilter }))}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '5px',
                                                border: `2px solid ${form.showFilter ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                background: form.showFilter ? 'var(--primary-color)' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {form.showFilter && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                                            Show in filters — show this custom field as a filter on category/product search pages
                                        </span>
                                    </label>
                                </div>



                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: saving ? '#cbd5e1' : 'var(--primary-color)',
                                        color: '#fff',
                                        fontWeight: 800,
                                        fontSize: '15px',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    {saving ? 'Saving...' : editingId ? 'Update Custom Field' : 'Create Custom Field'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Category Selection */}
                <div>
                    <div className={styles['admin-card']} style={{ position: 'sticky', top: '20px' }}>
                        <div className={styles['admin-card-header']}>
                            <h2>Assign to Categories <span style={{ color: '#e11d48' }}>*</span></h2>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                {form.categories.length} selected
                            </span>
                        </div>
                        <div className={styles['admin-card-body']} style={{ padding: '0' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>
                                <input
                                    type="text"
                                    value={catSearch}
                                    onChange={e => setCatSearch(e.target.value)}
                                    className={styles['admin-form-input']}
                                    placeholder="Search categories..."
                                />
                            </div>
                            <div style={{ maxHeight: '460px', overflowY: 'auto', padding: '8px' }}>
                                {filteredCats.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                                        No categories found
                                    </div>
                                )}
                                {filteredCats.map(({ cat, depth }) => {
                                    const isChecked = form.categories.includes(cat._id);
                                    return (
                                        <div
                                            key={cat._id}
                                            onClick={() => handleCategoryToggle(cat._id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '9px 12px',
                                                paddingLeft: `${12 + depth * 20}px`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: isChecked ? 'rgba(var(--primary-color-rgb,255,106,0),0.08)' : 'transparent',
                                                marginBottom: '2px',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '4px',
                                                border: `2px solid ${isChecked ? 'var(--primary-color)' : 'var(--admin-border)'}`,
                                                background: isChecked ? 'var(--primary-color)' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.15s',
                                            }}>
                                                {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: depth === 0 ? 700 : 500, color: isChecked ? 'var(--primary-color)' : 'var(--admin-text-secondary)', flex: 1, lineHeight: 1.3 }}>
                                                {depth > 0 && '└ '}{cat.title}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {form.categories.length > 0 && (
                                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--admin-border)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, categories: [] }))}
                                        style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        ✕ Clear all selections
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCustomFieldCreate;
