import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useVoiceSearch } from '@/context/VoiceSearchContext';
import ManufacturerCard from './ManufacturerCard';
import api from '@/services/axiosConfig';


/* ─── Skeleton card ─────────────────────────────────────────── */
const SkeletonCard = () => (
    <div className="mc2-skeleton shl-skeleton-card">
        <div className="mc2-skeleton-left">
            <div className="mc2-skel-block" style={{ width: 60, height: 60, borderRadius: 8 }} />
            <div className="mc2-skel-block" style={{ height: 14, width: '90%' }} />
            <div className="mc2-skel-block" style={{ height: 12, width: '60%' }} />
            <div className="mc2-skel-block" style={{ height: 11, width: '70%' }} />
            <div className="mc2-skel-block" style={{ height: 11, width: '55%' }} />
        </div>
        <div className="mc2-skeleton-center">
            <div className="mc2-skel-block" style={{ height: 13, width: '100%' }} />
            <div className="mc2-skel-block" style={{ height: 13, width: '85%' }} />
            <div className="mc2-skel-block" style={{ height: 12, width: '55%' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 4 }}>
                {[0, 1, 2].map(i => (
                    <div key={i}>
                        <div className="mc2-skel-block" style={{ height: 80, borderRadius: 8, marginBottom: 6 }} />
                        <div className="mc2-skel-block" style={{ height: 12, width: '80%', marginBottom: 4 }} />
                        <div className="mc2-skel-block" style={{ height: 10, width: '60%' }} />
                    </div>
                ))}
            </div>
        </div>
        <div className="mc2-skeleton-right">
            <div className="mc2-skel-block" style={{ height: 36, borderRadius: 6 }} />
            <div className="mc2-skel-block" style={{ height: 36, borderRadius: 6 }} />
        </div>
    </div>
);

/* ─── Filter pill button ─────────────────────────────────────── */
interface FilterPillProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

const FilterPill = ({ label, active, onClick }: FilterPillProps) => (
    <button
        className={`shl-filter-pill${active ? ' active' : ''}`}
        onClick={onClick}
    >
        {label}
    </button>
);

/* ─── Pagination ─────────────────────────────────────────────── */
interface PaginationProps {
    page: number;
    pages: number;
    onPageChange: (page: number) => void;
}

const Pagination = ({ page, pages, onPageChange }: PaginationProps) => {
    if (pages <= 1) return null;

    const getPages = () => {
        const list = [];
        const range = 2;
        for (let i = 1; i <= pages; i++) {
            if (
                i === 1 || i === pages ||
                (i >= page - range && i <= page + range)
            ) {
                list.push(i);
            } else if (
                list[list.length - 1] !== '...'
            ) {
                list.push('...');
            }
        }
        return list;
    };

    return (
        <div className="shl-pagination">
            <button
                className="shl-page-btn shl-page-arrow"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
            >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
            </button>

            {getPages().map((p, i) =>
                p === '...' ? (
                    <span key={`dots-${i}`} className="shl-page-dots">…</span>
                ) : (
                    <button
                        key={p}
                        className={`shl-page-btn${p === page ? ' active' : ''}`}
                        onClick={() => onPageChange(p as number)}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                className="shl-page-btn shl-page-arrow"
                disabled={page === pages}
                onClick={() => onPageChange(page + 1)}
            >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
            </button>
        </div>
    );
};

/* ─── Sort options ───────────────────────────────────────────── */
const SORT_OPTIONS = [
    { value: '', label: 'Best Match' },
    { value: 'verified', label: 'Verified Only' },
    { value: 'pro', label: 'Pro Verified' },
];

const ITEMS_PER_PAGE = 10;

/* ─── Main layout ────────────────────────────────────────────── */
const SupplierHomeLayout = () => {
    const { t } = useAuth();
    const { startListening } = useVoiceSearch();

    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState('');
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');

    /* ── fetch ── */
    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(ITEMS_PER_PAGE),
                page: String(page),
                ...(keyword && { keyword }),
                ...(activeFilter === 'verified' && { verified_only: 'true' }),
                ...(activeFilter === 'pro' && { verified_pro: 'true' }),
            });

            const { data } = await api.get(`/company/search?${params}`);
            setCompanies(data.companies || []);
            setTotalCount(data.total || 0);
            setTotalPages(data.pages || 1);
        } catch (err) {
            console.error('Error fetching companies:', err);
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    }, [page, keyword, activeFilter]);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    /* Reset to page 1 when filter/keyword changes */
    const handleFilter = (val: string) => {
        setActiveFilter(val);
        setPage(1);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setKeyword(searchInput.trim());
        setPage(1);
    };

    const clearSearch = () => {
        setSearchInput('');
        setKeyword('');
        setPage(1);
    };

    /* ── skeleton count ── */
    const SKELETON_COUNT = 5;

    return (
        <div className="shl-wrapper">
            {/* ── Top bar: search + filters ── */}
            <div className="shl-topbar">
                <div className="shl-topbar-left">
                    <h2 className="shl-section-title">
                        {t('suppliers') || 'Suppliers'}
                        {!loading && totalCount > 0 && (
                            <span className="shl-count-badge">{totalCount.toLocaleString()}</span>
                        )}
                    </h2>
                    <div className="shl-filter-pills">
                        {SORT_OPTIONS.map(opt => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={activeFilter === opt.value}
                                onClick={() => handleFilter(opt.value)}
                            />
                        ))}
                    </div>
                </div>

                <form className="shl-search-form" onSubmit={handleSearch}>
                    <div className="shl-search-box">
                        <svg className="shl-search-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="shl-search-input"
                            placeholder="Search suppliers, products…"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <button type="button" className="shl-search-clear" onClick={clearSearch}>
                                ×
                            </button>
                        )}
                        <button type="button" className="shl-mic-btn" onClick={() => startListening((text) => {
                            setSearchInput(text);
                            setKeyword(text);
                            setPage(1);
                        })} title="Voice Search" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </button>
                    </div>
                    <button type="submit" className="shl-search-btn">Search</button>
                </form>
            </div>

            {/* ── Active keyword indicator ── */}
            {keyword && (
                <div className="shl-keyword-bar">
                    <span>Results for: <strong>"{keyword}"</strong></span>
                    <button className="shl-clear-kw" onClick={clearSearch}>Clear ×</button>
                </div>
            )}

            {/* ── Card list ── */}
            <div className="shl-card-list">
                {loading ? (
                    Array(SKELETON_COUNT).fill(0).map((_, i) => <SkeletonCard key={i} />)
                ) : companies.length === 0 ? (
                    <div className="shl-empty-state">
                        <svg width="56" height="56" fill="none" stroke="#d0d5dd" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <p className="shl-empty-title">No suppliers found</p>
                        <p className="shl-empty-sub">
                            {keyword
                                ? 'Try a different keyword or clear the search.'
                                : 'No suppliers match the current filters.'}
                        </p>
                        {(keyword || activeFilter) && (
                            <button
                                className="shl-empty-reset-btn"
                                onClick={() => { clearSearch(); handleFilter(''); }}
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                ) : (
                    companies.map(company => (
                        <ManufacturerCard key={company._id} manufacturer={company} />
                    ))
                )}
            </div>

            {/* ── Pagination ── */}
            {!loading && companies.length > 0 && (
                <Pagination
                    page={page}
                    pages={totalPages}
                    onPageChange={(p: number) => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            )}
        </div>
    );
};

export default SupplierHomeLayout;
