'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';

const Categories = () => {
    const { t, siteSettings } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await api.get('/categories');
                setCategories(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching categories:', error);
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="cat-page-wrapper">
                <div className="container">
                    <div className="cat-page-header">
                        <h1 className="cat-page-title">{t('all_categories') || 'All Categories'}</h1>
                    </div>
                    <div className="cat-skeleton-grid-main">
                        {Array(18).fill(0).map((_, i) => (
                            <div key={i} className="cat-skeleton-card" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cat-page-wrapper">
            <div className="container">
                {/* Header */}
                <div className="cat-page-header">
                    <div className="cat-page-header-left">
                        <h1 className="cat-page-title">{t('all_categories') || 'All Categories'}</h1>
                        <p className="cat-page-subtitle">{categories.length} {t('categories_available') || 'categories available'}</p>
                    </div>
                    <Link href="/" className="cat-back-btn">
                        ← {t('back_to_home') || 'Back to Home'}
                    </Link>
                </div>

                <div className="cat-page-grid">
                    {categories.map((cat: any, index) => {
                        const hasChildren = cat.children && cat.children.length > 0;
                        const linkHref = hasChildren ? `/categories/${cat.slug || cat._id}` : `/search?category_id=${cat.slug || cat._id}`;
                        return (
                            <Link
                                href={linkHref}
                                key={cat._id || index}
                                className="cat-grid-card"
                            >
                                <div className="cat-grid-img-wrap">
                                    <img
                                        src={getImgUrl(cat.image)}
                                        alt={cat.title}
                                        className="cat-grid-img"
                                        onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/300x300?text=No+Image'}
                                    />
                                    <div className="cat-grid-overlay" />
                                </div>
                                <div className="cat-grid-info">
                                    <h3 className="cat-grid-name">{cat.title}</h3>
                                    {cat.description && (
                                        <p className="cat-grid-desc">
                                            {cat.description.slice(0, 45)}{cat.description.length > 45 ? '…' : ''}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Categories;
