import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import { translations } from '@/utils/translations';
import styles from './AdminLayout.module.css';

const emptyForm = { name: '', code: '', native_name: '', is_active: true, direction: 'ltr' };

interface Language {
    _id: string;
    name: string;
    code: string;
    native_name: string;
    is_active: boolean;
    direction: string;
    translations?: Record<string, string>;
}

const AdminModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', type = 'info' }: any) => {
    if (!isOpen) return null;
    return (
        <div className={styles['admin-modal-overlay']}>
            <div className={styles['admin-modal']}>
                <div className={styles['admin-modal-header']}>
                    <h3>{title}</h3>
                    <button className={styles['admin-modal-close']} onClick={onCancel}>&times;</button>
                </div>
                <div className={styles['admin-modal-body']}>{children}</div>
                <div className={styles['admin-modal-footer']}>
                    <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} onClick={onCancel}>Cancel</button>
                    <button
                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                        style={{ background: type === 'danger' ? '#dc2626' : 'var(--primary-color)' }}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminLanguages = () => {
    const { showToast } = useToast();
    const { refreshSiteSettings } = useAuth();
    const [data, setData] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Pagination states for languages list
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    // Translation editor states
    const [selectedLangForTranslation, setSelectedLangForTranslation] = useState<Language | null>(null);
    const [translationEditMap, setTranslationEditMap] = useState<Record<string, string>>({});
    const [transSearch, setTransSearch] = useState('');
    const [transPage, setTransPage] = useState(1);
    const transPerPage = 20;

    const fetchLanguages = async () => {
        try {
            setLoading(true);
            const { data: langs } = await api.get('/admin/languages');
            setData(langs);
        } catch (err) {
            console.error('Fetch error', err);
        } finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchLanguages(); 
    }, []);

    // Search and Pagination Logic for languages list
    const filteredData = data.filter(item => {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (item.native_name && item.native_name.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleEdit = (item: Language) => {
        setForm(item);
        setEditingId(item._id);
        setShowForm(true);
    };

    const confirmDelete = (id: string) => {
        setPendingDeleteId(id);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/admin/languages/${pendingDeleteId}`);
            showToast('Language removed', 'success');
            fetchLanguages();
            refreshSiteSettings();
        } catch (err) { showToast('Delete failed', 'error'); }
        finally { setModalOpen(false); setPendingDeleteId(null); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/languages/${editingId}`, form);
                showToast('Language updated', 'success');
            } else {
                await api.post('/admin/languages', form);
                showToast('Language added', 'success');
            }
            setShowForm(false);
            fetchLanguages();
            refreshSiteSettings();
        } catch (err) { showToast('Save failed', 'error'); }
    };

    // Translation Editor Functions
    const handleStartTranslate = (lang: Language) => {
        setSelectedLangForTranslation(lang);
        const initialMap: Record<string, string> = {};
        const dbTranslations = lang.translations || {};
        const englishKeys = translations['English'] ? Object.keys(translations['English']) : [];
        
        englishKeys.forEach(key => {
            initialMap[key] = dbTranslations[key] || '';
        });
        
        setTranslationEditMap(initialMap);
        setTransSearch('');
        setTransPage(1);
    };

    const handleTranslationChange = (key: string, value: string) => {
        setTranslationEditMap(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleResetKey = (key: string) => {
        setTranslationEditMap(prev => ({
            ...prev,
            [key]: ''
        }));
    };

    const handleSaveTranslations = async () => {
        if (!selectedLangForTranslation) return;
        try {
            const cleanedTranslations: Record<string, string> = {};
            Object.keys(translationEditMap).forEach(key => {
                const val = translationEditMap[key];
                if (val && val.trim() !== '') {
                    cleanedTranslations[key] = val.trim();
                }
            });

            const updatedLang = {
                ...selectedLangForTranslation,
                translations: cleanedTranslations
            };

            await api.put(`/admin/languages/${selectedLangForTranslation._id}`, updatedLang);
            showToast('Translations saved successfully', 'success');
            refreshSiteSettings();
            setSelectedLangForTranslation(null);
            fetchLanguages();
        } catch (err) {
            console.error('Save translations error', err);
            showToast('Failed to save translations', 'error');
        }
    };

    // Render Translation Editor View
    if (selectedLangForTranslation) {
        const langName = selectedLangForTranslation.name;
        const englishKeys = translations['English'] ? Object.keys(translations['English']) : [];
        
        // Filter keys based on search
        const filteredKeys = englishKeys.filter(key => {
            const keyLower = key.toLowerCase();
            const englishVal = (((translations['English'] as any)[key]) || '').toLowerCase();
            const defaultVal = (((translations as any)[langName]?.[key]) || '').toLowerCase();
            const currentOverride = (translationEditMap[key] || '').toLowerCase();
            const query = transSearch.toLowerCase();
            return (
                keyLower.includes(query) ||
                englishVal.includes(query) ||
                defaultVal.includes(query) ||
                currentOverride.includes(query)
            );
        });

        // Paginate keys
        const indexOfLastKey = transPage * transPerPage;
        const indexOfFirstKey = indexOfLastKey - transPerPage;
        const currentKeys = filteredKeys.slice(indexOfFirstKey, indexOfLastKey);
        const totalTransPages = Math.ceil(filteredKeys.length / transPerPage);

        // Count overrides
        const overrideCount = Object.keys(translationEditMap).filter((key: string) => {
            const val = translationEditMap[key];
            return val && val.trim() !== '';
        }).length;

        return (
            <div className={"admin-page"}>
                <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                    <div>
                        <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900 }}>
                            Translate: {selectedLangForTranslation.name} ({selectedLangForTranslation.code.toUpperCase()})
                        </h1>
                        <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                            Override local translations dynamically. Unchanged inputs fall back to default locales.
                        </p>
                    </div>
                    <button onClick={() => setSelectedLangForTranslation(null)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>
                        &larr; Back to Languages
                    </button>
                </div>

                {/* Stats Banner */}
                <div className={"admin-card"} style={{ marginBottom: '24px', borderRadius: '16px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ padding: '16px 24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Total Master Keys</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--admin-text-main)' }}>{englishKeys.length}</span>
                        </div>
                        <div style={{ width: '1px', height: '32px', background: 'var(--admin-border)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Custom Overrides</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary-color)' }}>{overrideCount}</span>
                        </div>
                        <div style={{ width: '1px', height: '32px', background: 'var(--admin-border)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Status</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedLangForTranslation.is_active ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
                                {selectedLangForTranslation.is_active ? 'Active on Storefront' : 'Inactive'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setSelectedLangForTranslation(null)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>Cancel</button>
                            <button onClick={handleSaveTranslations} className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>Save Translations</button>
                        </div>
                    </div>
                </div>

                {/* Translation List */}
                <div className={"admin-card"}>
                    <div style={{ padding: '14px 18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className={styles['admin-search-wrap']} style={{ flex: '1', minWidth: '220px' }}>
                            <svg className={styles['admin-search-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={styles['admin-search-input-premium']}
                                placeholder="Search translation keys or text..."
                                value={transSearch}
                                onChange={e => { setTransSearch(e.target.value); setTransPage(1); }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={"admin-table"}>
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>Translation Key</th>
                                    <th style={{ width: '30%' }}>English Reference</th>
                                    <th style={{ width: '35%' }}>Translation Override ({selectedLangForTranslation.name})</th>
                                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentKeys.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>No translation keys found.</td></tr>
                                ) : currentKeys.map(key => {
                                    const englishVal = (translations['English'] as any)[key] || '';
                                    const defaultVal = ((translations as any)[langName]?.[key]) || '';
                                    const isOverridden = !!translationEditMap[key];

                                    return (
                                        <tr key={key}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: 'var(--admin-text-main)', fontSize: '13px' }}>{key}</div>
                                                {defaultVal && defaultVal !== englishVal && (
                                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                                                        Default File: <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{defaultVal}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{englishVal}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className={styles['admin-form-input']}
                                                    style={{ margin: 0, padding: '8px 12px', fontSize: '13px', width: '100%', borderRadius: '8px' }}
                                                    value={translationEditMap[key] || ''}
                                                    placeholder={defaultVal || englishVal}
                                                    onChange={e => handleTranslationChange(key, e.target.value)}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {isOverridden && (
                                                    <button
                                                        type="button"
                                                        className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                                                        onClick={() => handleResetKey(key)}
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalTransPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--admin-border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                Showing {indexOfFirstKey + 1} to {Math.min(indexOfLastKey, filteredKeys.length)} of {filteredKeys.length} keys
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button disabled={transPage === 1} onClick={() => setTransPage(p => p - 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {transPage} of {totalTransPages}</span>
                                <button disabled={transPage === totalTransPages} onClick={() => setTransPage(p => p + 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={"admin-page"}>
            <div className={"admin-page-header"} style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className={"admin-page-title"} style={{ fontSize: '28px', fontWeight: 900 }}>Global Languages</h1>
                    <p className={"admin-page-subtitle"} style={{ fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Configure available localized interfaces and typography settings</p>
                </div>
                {!showForm && <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>+ Add Language</button>}
            </div>

            <AdminModal isOpen={modalOpen} title="Delete Language" type="danger" onConfirm={handleDelete} onCancel={() => setModalOpen(false)} confirmText="Remove Now">
                <p>Are you sure you want to disable this language? This will immediately remove it from the storefront language switcher.</p>
            </AdminModal>

            {showForm ? (
                <div className={"admin-card"} style={{ borderRadius: '24px' }}>
                    <div style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>{editingId ? 'Edit Language Profile' : 'Register New Interface Language'}</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Language Name</label>
                                    <input className={styles['admin-form-input']} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. English" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Language Code (ISO)</label>
                                    <input className={styles['admin-form-input']} value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. en" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Native Name</label>
                                    <input className={styles['admin-form-input']} value={form.native_name} onChange={e => setForm({...form, native_name: e.target.value})} placeholder="e.g. English" />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Layout Direction</label>
                                    <select className={styles['admin-form-select']} value={form.direction} onChange={e => setForm({...form, direction: e.target.value})}>
                                        <option value="ltr">LTR (Left to Right)</option>
                                        <option value="rtl">RTL (Right to Left)</option>
                                    </select>
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Status</label>
                                    <select className={styles['admin-form-select']} value={form.is_active} onChange={e => setForm({...form, is_active: e.target.value === 'true'})}>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                             <div className={styles['admin-form-actions']}>
                                <button type="button" onClick={() => setShowForm(false)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>Cancel</button>
                                <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}> {editingId ? 'Update' : 'Save Language'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={"admin-card"}>
                    <div style={{ padding: '14px 18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className={styles['admin-search-wrap']} style={{ flex: '1', minWidth: '220px' }}>
                            <svg className={styles['admin-search-icon']} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className={styles['admin-search-input-premium']}
                                placeholder="Search languages..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={"admin-table"}>
                            <thead>
                                <tr>
                                    <th>Language Name</th>
                                    <th>ISO Code</th>
                                    <th>Native Name</th>
                                    <th>Direction</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr className={""}><td colSpan={6}>No languages found.</td></tr>
                                ) : currentData.map(item => (
                                    <tr key={item._id}>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.code}</td>
                                        <td>{item.native_name}</td>
                                        <td>
                                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{item.direction || 'ltr'}</span>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${item.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEdit(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Edit Language" 
                                                    style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleStartTranslate(item)} 
                                                    className="admin-action-btn-edit" 
                                                    title="Translate Key-Values" 
                                                    style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M5 8l6 6" />
                                                        <path d="M4 14l6-6 2 3" />
                                                        <path d="M2 5h12" />
                                                        <path d="M7 2v3" />
                                                        <path d="M22 22l-5-10-5 10" />
                                                        <path d="M14 18h6" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(item._id)} 
                                                    className="admin-action-btn-delete" 
                                                    title="Delete Language" 
                                                    style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        <line x1="10" y1="11" x2="10" y2="17" />
                                                        <line x1="14" y1="11" x2="14" y2="17" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--admin-border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} languages
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Page {currentPage} of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} style={{ padding: '6px 12px' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminLanguages;
