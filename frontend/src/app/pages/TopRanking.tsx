'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import styles from './TopRanking.module.css';

import { getImgUrl } from '@/utils/imageConfig';

// ── Skeleton group ──────────────────────────────────────────────────────────
const SkeletonGroup = () => (
    <div className={styles['tr-skeleton-group']}>
        <div className={styles['tr-skel-title']} />
        <div className={styles['tr-skel-trio']}>
            {[1, 2, 3].map(i => (
                <div key={i} className={styles['tr-skel-card']}>
                    <div className={styles['tr-skel-img']} />
                    <div className={styles['tr-skel-line'] + " " + styles['w80']} />
                    <div className={styles['tr-skel-line'] + " " + styles['w50']} />
                </div>
            ))}
        </div>
    </div>
);

// ── Mini Product Card ─────────────────────────────────────────────────────────
const MiniCard = ({ product, rank, convertPrice }: { product: any; rank: number; convertPrice: any }) => {
    const { siteSettings } = useAuth();
    const imgUrl = getImgUrl(product.images?.[0] || product.main_image);
    const price = convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0);
    const supplierObj = product.supplier_info || product.supplier;
    const isNew = product.createdAt
        ? (Date.now() - new Date(product.createdAt).getTime()) / 86400000 < 7
        : false;

    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';

    return (
        <Link href={`/product/${product.slug || product._id}`} className={styles['tr-mini-card']}>
            <div className={styles['tr-mini-img-wrap']}>
                {imgUrl
                    ? <img src={imgUrl} alt={product.name} loading="lazy" />
                    : <div className={styles['tr-mini-placeholder']}>📦</div>
                }
                <div className={`${styles['tr-rank-badge']} ${styles[rankClass]}`}>#{rank}</div>
                {isNew && <div className={styles['tr-new-badge']}>NEW</div>}
            </div>
            <div className={styles['tr-mini-body']}>
                <p className={styles['tr-mini-name']}>{product.name}</p>
                <div className={styles['tr-mini-price']}>{price.formatted}</div>
                {siteSettings?.rfq_enabled !== false && product.moq && <div className={styles['tr-mini-moq']}>MOQ: {product.moq}</div>}
            </div>
        </Link>
    );
};

// ── Category Group ─────────────────────────────────────────────────────────────
const CategoryGroup = ({ group, convertPrice }: { group: any; convertPrice: any }) => {
    return (
        <div className={styles['tr-cat-group']}>
            <div className={styles['tr-cat-group-header']}>
                <h3 className={styles['tr-cat-title']}>
                    {group.icon && <span className={styles['tr-cat-title-icon']}>{group.icon}</span>}
                    {group.title}
                </h3>
                <Link
                    href={`/search?category_id=${group.slug || group._id}&tab=products`}
                    className={styles['tr-see-all']}
                >
                    See all →
                </Link>
            </div>
            <div className={styles['tr-product-trio']}>
                {group.products.map((prod: any, idx: number) => (
                    <MiniCard
                        key={prod._id}
                        product={prod}
                        rank={idx + 1}
                        convertPrice={convertPrice}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TopRanking = () => {
    const { convertPrice } = useAuth();
    const navRef = React.useRef<HTMLDivElement | null>(null);

    const [groups, setGroups] = useState<any[]>([]);
    const [allCats, setAllCats] = useState<any[]>([]);
    const [selectedCat, setSelectedCat] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('ranking');

    const sortOptions = [
        { key: 'ranking',   label: '🏆 Top Ranked' },
        { key: 'rating',    label: '⭐ Best Reviewed' },
        { key: 'recent',    label: '✨ Newest' },
        { key: 'price_asc', label: '💰 Lowest Price' },
    ];

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/products/top-ranking', {
                params: { 
                    sort_by: sortBy, 
                    limit_per_cat: 3, 
                    max_cats: 30,
                    category_id: selectedCat || undefined,
                    t: Date.now()
                },
            });
            setGroups(data.categories || []);
            if (data.allCategories) setAllCats(data.allCategories);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [sortBy, selectedCat]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const scrollNav = (dir: string) => {
        navRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    };

    const totalCategories = groups.length;
    const totalProducts = groups.reduce((acc: number, g: any) => acc + g.products.length, 0);

    return (
        <div className={styles['tr-page']}>
            {/* ── Hero ──────────────────────────────────────────────── */}
            <div className={styles['tr-hero']}>
                <div className={styles['tr-hero-inner']}>
                    <div className={styles['tr-hero-icon']}>🏆</div>
                    <div className={styles['tr-hero-text']}>
                        <h1>Top Ranking Products</h1>
                        <p>Best-performing products grouped by category, ranked by views, orders & ratings</p>
                    </div>
                    {!loading && (
                        <div className={styles['tr-hero-stats']}>
                            <div className={styles['tr-hero-stat']}>
                                <strong>{totalProducts}+</strong>
                                <span>Products</span>
                            </div>
                            <div className={styles['tr-hero-stat']}>
                                <strong>{totalCategories}</strong>
                                <span>Categories</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Category Nav ── */}
            {allCats.length > 0 && (
                <div className={styles['tr-cat-nav']}>
                    <button className={styles['tr-cat-nav-arrow']} onClick={() => scrollNav('left')}>‹</button>
                    <div className={styles['tr-cat-nav-inner']} ref={navRef}>
                        <button
                            className={`${styles['tr-cat-pill']} ${!selectedCat ? styles['active'] : ''}`}
                            onClick={() => setSelectedCat('')}
                        >
                            All Categories
                        </button>
                        {allCats.map(cat => (
                            <button
                                key={cat._id}
                                className={`${styles['tr-cat-pill']} ${selectedCat === cat._id ? styles['active'] : ''}`}
                                onClick={() => setSelectedCat(cat._id)}
                            >
                                {cat.icon && <span style={{ marginRight: '6px' }}>{cat.icon}</span>}
                                {cat.title}
                            </button>
                        ))}
                    </div>
                    <button className={styles['tr-cat-nav-arrow']} onClick={() => scrollNav('right')}>›</button>
                </div>
            )}

            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div className={styles['tr-toolbar']}>
                <div className={styles['tr-toolbar-inner']}>
                    <div className={styles['tr-sort-group']}>
                        {sortOptions.map(opt => (
                            <button
                                key={opt.key}
                                className={`${styles['tr-sort-btn']} ${sortBy === opt.key ? styles['active'] : ''}`}
                                onClick={() => setSortBy(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {!loading && (
                        <div className={styles['tr-result-info']}>
                            <strong>{totalCategories}</strong> categories · <strong>{totalProducts}</strong> products
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main ─────────────────────────────────────────────────── */}
            <div className={styles['tr-main']}>
                {loading ? (
                    <div className={styles['tr-cat-groups']}>
                        {[...Array(12)].map((_, i) => <SkeletonGroup key={i} />)}
                    </div>
                ) : groups.length === 0 ? (
                    <div className={styles['tr-empty']}>
                        <div className={styles['tr-empty-icon']}>🔍</div>
                        <h2>No ranked products yet</h2>
                        <p>Products will appear here once they have views, orders or ratings.</p>
                        <button className={styles['tr-cat-pill']} style={{ marginTop: '20px' }} onClick={() => setSelectedCat('')}>
                            Clear Filter
                        </button>
                    </div>
                ) : (
                    <div className={styles['tr-cat-groups']}>
                        {groups.map(group => (
                            <CategoryGroup
                                key={group._id}
                                group={group}
                                convertPrice={convertPrice}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopRanking;
