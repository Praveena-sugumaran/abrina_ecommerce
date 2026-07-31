import { useAuth } from '@/context/AuthContext';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

import { getImgUrl, getFlagUrl } from '@/utils/imageConfig';


interface Hub {
    _id: string;
    title: string;
    desc: string;
    country: string;
    flag: string;
    image?: string;
    isActive: boolean;
    order: number;
    sideProduct1?: any;
    sideProduct2?: any;
}

interface Ranking {
    _id: string;
    category: string;
    country: string;
    flag: string;
    items: { name: string; score: string; img: string }[];
    isActive: boolean;
}

interface ProductSelectProps {
    value: string | null;
    onChange: (val: string | null) => void;
    products: any[];
    categories: any[];
    flagOptions: { label: string; value: string }[];
}

const ProductSelect = ({ value, onChange, products, categories, flagOptions }: ProductSelectProps) => {
    const { t } = useAuth();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [catFilter, setCatFilter] = useState('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter Logic: Search Name + Category + Country
    const filtered = products.filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());

        // Robust ID comparison (handle both populated and unpopulated category fields)
        const pCatId = (p.category?._id || p.category || p.category_info?._id || '').toString();
        const matchesCat = catFilter === 'all' || pCatId === catFilter;

        // Country/Origin Match: Check against both Country Name (label) AND Country Code (value)
        const selectedOption = flagOptions.find((f: any) => f.label === countryFilter);
        const selectedCode = selectedOption ? selectedOption.value.toLowerCase() : '';
        const selectedLabel = selectedOption ? selectedOption.label.toLowerCase() : '';

        const productOrigin = (p.country_of_origin || '').toLowerCase();
        const supplierCountry = (p.supplier_info?.country_code || p.supplier?.country_code || '').toLowerCase();

        const matchesCountry = countryFilter === 'all' ||
            productOrigin === selectedLabel ||
            productOrigin === selectedCode ||
            supplierCountry === selectedCode;

        return matchesSearch && matchesCat && matchesCountry;
    });

    const selected = products.find((p: any) => p._id === value);

    useEffect(() => {
        const handleClickOut = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOut);
        return () => document.removeEventListener('mousedown', handleClickOut);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{ ...inputSt, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
                <span style={{ flex: 1, color: selected ? '#111' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {selected ? selected.name : 'Select a product for this slot...'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 300, overflowY: 'auto' }}>
                    <div style={{ padding: 12, borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" style={{ position: 'absolute', left: 12 }}>
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                style={{ ...inputSt, padding: '9px 12px 9px 36px', borderRadius: 10, border: '1.5px solid #e2e8f0' }}
                                placeholder="Search names..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onFocus={(e: any) => {
                                    e.target.style.borderColor = 'var(--primary-color)';
                                    e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent)';
                                }}
                                onBlur={(e: any) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <select
                                style={{ ...inputSt, padding: '4px 6px', fontSize: 11 }}
                                value={catFilter}
                                onChange={e => setCatFilter(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                            </select>
                            <select
                                style={{ ...inputSt, padding: '4px 6px', fontSize: 11 }}
                                value={countryFilter}
                                onChange={e => setCountryFilter(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            >
                                <option value="all">All Origins</option>
                                {flagOptions.map(f => <option key={f.value} value={f.label}>{f.label}</option>)}
                            </select>
                        </div>
                    </div>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' as const }}>No products match these filters</div>
                    ) : (
                        filtered.map((p: any) => (
                            <div
                                key={p._id}
                                onClick={() => { onChange(p._id); setIsOpen(false); }}
                                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: value === p._id ? '#f1f5f9' : '#fff', borderBottom: '1px solid #f9fafb' }}
                                onMouseEnter={(e: any) => e.target.style.background = '#f9fafb'}
                                onMouseLeave={(e: any) => e.target.style.background = value === p._id ? '#f1f5f9' : '#fff'}
                            >
                                <div style={{ fontWeight: 600, color: '#111' }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{p.category?.title || 'No Category'}</span>
                                    <span>{p.country_of_origin || 'No Origin'}</span>
                                </div>
                            </div>
                        ))
                    )}
                    {value && (
                        <div
                            onClick={() => { onChange(null); setIsOpen(false); }}
                            style={{ padding: '10px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--primary-color)', borderTop: '1px solid #f3f4f6', textAlign: 'center', fontWeight: 700 }}
                        >
                            Clear Selection
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── HUB FORM ──────────────────────────────────────────────
interface HubFormProps {
    initial?: Hub | null;
    onSave: () => void;
    onCancel: () => void;
    flagOptions: { label: string; value: string }[];
}

const HubForm = ({ initial, onSave, onCancel, flagOptions }: HubFormProps) => {
    const [title, setTitle] = useState(initial?.title || '');
    const [desc, setDesc] = useState(initial?.desc || '');
    const [country, setCountry] = useState(initial?.country || '');
    const [flag, setFlag] = useState(initial?.flag || 'pk');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [sideProduct1, setSideProduct1] = useState(initial?.sideProduct1?._id || initial?.sideProduct1 || '');
    const [sideProduct2, setSideProduct2] = useState(initial?.sideProduct2?._id || initial?.sideProduct2 || '');
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isActive, setIsActive] = useState(initial?.isActive !== false);
    const [order, setOrder] = useState<string | number>(initial?.order || 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pRes, cRes] = await Promise.all([
                    api.get('/products?limit=1000'), // Higher limit to ensure we get featured ones
                    api.get('/categories')
                ]);
                setProducts(pRes.data.products || []);
                setCategories(cRes.data || []);
            } catch (err) { console.error('Error fetching data:', err); }
        };
        fetchData();
    }, []);

    const handleFlagChange = (val: string) => {
        setFlag(val);
        const option = flagOptions.find((f: any) => f.value === val);
        if (option) setCountry(option.label);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const fd = new FormData();
            fd.append('title', title); fd.append('desc', desc);
            fd.append('country', country); fd.append('flag', flag);
            fd.append('isActive', String(isActive));
            fd.append('order', String(order));
            fd.append('sideProduct1', sideProduct1 || '');
            fd.append('sideProduct2', sideProduct2 || '');
            if (imageFile) fd.append('image', imageFile);

            if (initial?._id) {
                await api.put(`/worldwide/admin/hubs/${initial._id}`, fd);
            } else {
                await api.post(`/worldwide/admin/hubs`, fd);
            }
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving hub');
        } finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#e53e3e', background: '#fff5f5', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                    <label style={labelSt}>Title *</label>
                    <input style={inputSt} value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div>
                    <label style={labelSt}>Country *</label>
                    <select style={inputSt} value={flag} onChange={e => handleFlagChange(e.target.value)}>
                        {flagOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelSt}>Display Order</label>
                    <input type="number" style={inputSt} value={order} onChange={e => setOrder(e.target.value)} placeholder="0" />
                </div>
            </div>
            <div>
                <label style={labelSt}>Description *</label>
                <textarea style={{ ...inputSt, minHeight: 80 }} value={desc} onChange={e => setDesc(e.target.value)} required />
            </div>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label style={{ ...labelSt, color: '#475569' }}>Main Hub Background Image (Upload)</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        {initial?.image && <img src={getImgUrl(initial.image)} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #cbd5e1' }} />}
                        <div style={{ flex: 1 }}>
                            <input type="file" accept="image/*" onChange={e => { if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]); }} style={fileSt} />
                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>High resolution landscape image recommended</p>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                    <label style={{ ...labelSt, color: '#444', marginBottom: 12 }}>Side Featured Products</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ minWidth: 0 }}>
                            <label style={{ ...labelSt, fontSize: 11, color: '#64748b' }}>Side Slot 1 *</label>
                            <ProductSelect value={sideProduct1} onChange={setSideProduct1} products={products} categories={categories} flagOptions={flagOptions} />
                            {(() => {
                                const p = products.find(p => p._id === sideProduct1);
                                if (!p) return null;
                                return (
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: '#fffef3', padding: '6px 10px', borderRadius: 8, border: '1px solid #fff3cd' }}>
                                        <img
                                            src={getImgUrl(p.main_image || p.images?.[0])}
                                            alt=""
                                            style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6 }}
                                        />
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#856404', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Product Linked</span>
                                    </div>
                                );
                            })()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <label style={{ ...labelSt, fontSize: 11, color: '#64748b' }}>Side Slot 2 *</label>
                            <ProductSelect value={sideProduct2} onChange={setSideProduct2} products={products} categories={categories} flagOptions={flagOptions} />
                            {(() => {
                                const p = products.find(p => p._id === sideProduct2);
                                if (!p) return null;
                                return (
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: '#fffef3', padding: '6px 10px', borderRadius: 8, border: '1px solid #fff3cd' }}>
                                        <img
                                            src={getImgUrl(p.main_image || p.images?.[0])}
                                            alt=""
                                            style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6 }}
                                        />
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#856404', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Product Linked</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Active (show on Worldwide page)
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onCancel} style={cancelBtnSt}>Cancel</button>
                <button type="submit" disabled={saving} style={saveBtnSt}>{saving ? 'Saving…' : initial?._id ? 'Update Hub' : 'Create Hub'}</button>
            </div>
        </form>
    );
};

// ─── RANKING FORM ──────────────────────────────────────────
interface RankingFormProps {
    initial?: Ranking | null;
    onSave: () => void;
    onCancel: () => void;
    flagOptions: { label: string; value: string }[];
}

const RankingForm = ({ initial, onSave, onCancel, flagOptions }: RankingFormProps) => {
    const [category, setCategory] = useState(initial?.category || '');
    const [country, setCountry] = useState(initial?.country || '');
    const [flag, setFlag] = useState(initial?.flag || 'pk');
    const [isActive, setIsActive] = useState(initial?.isActive !== false);
    const [items, setItems] = useState(initial?.items || [
        { name: '', score: '', img: '' },
        { name: '', score: '', img: '' },
        { name: '', score: '', img: '' },
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const updateItem = (idx: number, field: string, val: string) => {
        setItems((prev: any[]) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
    };

    const handleFlagChange = (val: string) => {
        setFlag(val);
        const option = flagOptions.find((f: any) => f.value === val);
        if (option) setCountry(option.label);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const payload = { category, country, flag, items, isActive };
            if (initial?._id) {
                await api.put(`/worldwide/admin/rankings/${initial._id}`, payload);
            } else {
                await api.post(`/worldwide/admin/rankings`, payload);
            }
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving ranking');
        } finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#e53e3e', background: '#fff5f5', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={labelSt}>Category Name *</label>
                    <input style={inputSt} value={category} onChange={e => setCategory(e.target.value)} required />
                </div>
                <div>
                    <label style={labelSt}>Country *</label>
                    <select style={inputSt} value={flag} onChange={e => handleFlagChange(e.target.value)}>
                        {flagOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label style={{ ...labelSt, marginBottom: 12, display: 'block', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>🏆 Top 3 Ranked Items</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {items.map((item, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary-color)', marginBottom: 10 }}>RANK #{idx + 1}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <label style={{ ...labelSt, fontSize: 11, marginBottom: 4 }}>Item Name</label>
                                    <input style={inputSt} value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="e.g. Jasmine Rice" />
                                </div>
                                <div>
                                    <label style={{ ...labelSt, fontSize: 11, marginBottom: 4 }}>Score</label>
                                    <input style={inputSt} value={item.score} onChange={e => updateItem(idx, 'score', e.target.value)} placeholder="99.1" />
                                </div>
                                <div>
                                    <label style={{ ...labelSt, fontSize: 11, marginBottom: 4 }}>Image URL</label>
                                    <input style={inputSt} value={item.img} onChange={e => updateItem(idx, 'img', e.target.value)} placeholder="/uploads/..." />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Active (show on Worldwide page)
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onCancel} style={cancelBtnSt}>Cancel</button>
                <button type="submit" disabled={saving} style={saveBtnSt}>{saving ? 'Saving…' : initial?._id ? 'Update Ranking' : 'Create Ranking'}</button>
            </div>
        </form>
    );
};

// ─── MAIN PAGE ─────────────────────────────────────────────

const AdminWorldwide = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('hubs');
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [flagOptions, setFlagOptions] = useState<{ label: string; value: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: string, data: any } | null>(null); // { type: 'hub'|'ranking', data: null|item }
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string, id: string, name: string } | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [h, r, c] = await Promise.all([
                api.get('/worldwide/admin/hubs'),
                api.get('/worldwide/admin/rankings'),
                api.get('/auth/countries')
            ]);
            setHubs(h.data.hubs || []);
            setRankings(r.data.rankings || []);
            if (c.data && Array.isArray(c.data)) {
                setFlagOptions(c.data.map(cnt => ({ label: cnt.name, value: cnt.code.toLowerCase() })));
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const path = deleteConfirm.type === 'hub' ? `/worldwide/admin/hubs/${deleteConfirm.id}` : `/worldwide/admin/rankings/${deleteConfirm.id}`;
            await api.delete(path);
            fetchAll();
        } catch (err) { showToast('Error occurred', 'error'); }
        setDeleteConfirm(null);
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Worldwide Page Manager</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Manage Global Industry Hubs and Top Ranking sections for the Worldwide page.</p>
                </div>
                <button onClick={() => setModal({ type: 'hub', data: null })} style={saveBtnSt}>
                    + Add Industry Hub
                </button>
            </div>

            {/* Tabs (Hidden as TOP RANKINGS is removed) */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
                {[{ id: 'hubs', label: 'Industry Hubs' }].map(t => (
                    <button key={t.id} style={{
                        padding: '10px 20px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                        background: 'none', borderBottom: '2px solid var(--primary-color)',
                        color: 'var(--primary-color)', marginBottom: -2
                    }}>{t.label}</button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading…</div>
            ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                    {hubs.length === 0 && <div style={emptyBoxSt}>No industry hubs yet. Click "+ Add Industry Hub" to create one.</div>}
                    {hubs.map(hub => (
                        <div key={hub._id} style={cardSt}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <img src={getImgUrl(hub.image)} alt={hub.title} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0, background: '#f3f4f6' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{hub.title}</h3>
                                        <span style={{ background: '#f3f4f6', color: '#4b5563', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                                            Order: {hub.order || 0}
                                        </span>
                                        <span style={{ background: hub.isActive ? '#000000' : '#f3f4f6', color: hub.isActive ? '#ffffff' : '#94a3b8', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                            {hub.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 8px' }}>{hub.desc}</p>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <img src={getFlagUrl(hub.flag)} alt="" style={{ width: 20, height: 14, borderRadius: 2 }} />
                                        <span style={{ fontSize: 13, color: '#374151' }}>{hub.country}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button onClick={() => setModal({ type: 'hub', data: hub })} className="admin-action-btn-edit">Edit</button>
                                    <button onClick={() => setDeleteConfirm({ type: 'hub', id: hub._id, name: hub.title })} className="admin-action-btn-delete">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: '20px', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: '#111', lineHeight: '1.4' }}>
                            {modal.data ? 'Edit' : 'Create'} {modal.type === 'hub' ? 'Industry Hub' : 'Ranking Column'}
                        </h2>
                        {modal.type === 'hub' ? (
                            <HubForm initial={modal.data} onSave={() => { setModal(null); fetchAll(); }} onCancel={() => setModal(null)} flagOptions={flagOptions} />
                        ) : (
                            <RankingForm initial={modal.data} onSave={() => { setModal(null); fetchAll(); }} onCancel={() => setModal(null)} flagOptions={flagOptions} />
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#111' }}>Delete "{deleteConfirm.name}"?</h2>
                        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>This action cannot be undone. The item will be permanently removed from the Worldwide page.</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={cancelBtnSt}>Cancel</button>
                            <button onClick={handleDelete} style={{ ...deleteBtnSt, padding: '8px 18px', fontSize: 14 }}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Shared styles
const labelSt: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 };
const inputSt: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const fileSt: React.CSSProperties = { fontSize: 13, width: '100%' };
const saveBtnSt: React.CSSProperties = { background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const cancelBtnSt: React.CSSProperties = { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const editBtnSt: React.CSSProperties = { background: '#f8fafc', color: 'var(--primary-color)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const deleteBtnSt: React.CSSProperties = { background: '#ffffff', color: '#000000', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const cardSt: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
const emptyBoxSt: React.CSSProperties = { background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 12, padding: 40, textAlign: 'center' as const, color: '#9ca3af', fontSize: 14 };

export default AdminWorldwide;
