'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import '@/components/css/Subcategories.css';

interface Category {
    _id: string;
    title: string;
    image?: string;
    children?: Category[];
    parent?: string | null;
    slug?: string;
}

const CategorySubcategoriesPage = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = useAuth();
    const id = params.id as string;

    const [category, setCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Recursively find the category inside the categories tree
    const findCategoryInTree = (tree: Category[], targetId: string): Category | null => {
        for (const cat of tree) {
            if (cat._id === targetId || cat.slug === targetId) {
                return cat;
            }
            if (cat.children && cat.children.length > 0) {
                const found = findCategoryInTree(cat.children, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    useEffect(() => {
        if (!id) return;

        const fetchCategoryDetails = async () => {
            try {
                setLoading(true);
                // Fetch the full categories tree
                const { data } = await api.get('/categories');
                const matchedCategory = findCategoryInTree(data, id);
                
                if (matchedCategory) {
                    setCategory(matchedCategory);
                } else {
                    setError(t('category_not_found') || 'Category not found');
                }
            } catch (err) {
                console.error('Error loading category:', err);
                setError(t('failed_load_category') || 'Failed to load category details');
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="subcat-page-wrapper">
                <div className="subcat-banner">
                    <div className="subcat-banner-inner">
                        <div style={{ height: '36px', width: '220px', background: '#eaeaea', borderRadius: '8px', animation: 'subcat-pulse 1.5s infinite' }} />
                        <div style={{ height: '32px', width: '120px', background: '#eaeaea', borderRadius: '20px', animation: 'subcat-pulse 1.5s infinite' }} />
                    </div>
                </div>
                <div className="subcat-container">
                    <div className="subcat-grid">
                        {Array(16).fill(0).map((_, i) => (
                            <div key={i} className="subcat-card" style={{ pointerEvents: 'none' }}>
                                <div className="subcat-skeleton-circle" />
                                <div className="subcat-skeleton-text" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !category) {
        return (
            <div className="subcat-page-wrapper">
                <div className="subcat-container" style={{ paddingTop: '80px' }}>
                    <div className="subcat-empty-state">
                        <div className="subcat-empty-title">{error || 'Category Not Found'}</div>
                        <div className="subcat-empty-desc">The category you are looking for might have been removed or does not exist.</div>
                        <Link href="/" className="subcat-back-btn" style={{ display: 'inline-block' }}>
                            {t('back_to_home') || 'Back to Home'}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const subcategories = category.children || [];

    return (
        <div className="subcat-page-wrapper">
            {/* Banner Section */}
            <div className="subcat-banner">
                <div className="subcat-banner-inner">
                    <h1 className="subcat-banner-title">{category.title}</h1>
                    <Link href="/categories" className="subcat-back-btn">
                        ← {t('all_categories') || 'All Categories'}
                    </Link>
                </div>
            </div>

            {/* Container and Subcategories Grid */}
            <div className="subcat-container">
                {subcategories.length > 0 ? (
                    <div className="subcat-grid">
                        {subcategories.map((sub) => {
                            const subImage = sub.image || '/assets/placeholder-category.png';
                            return (
                                <Link
                                    key={sub._id}
                                    href={`/search?category_id=${sub.slug || sub._id}`}
                                    className="subcat-card"
                                >
                                    <div className="subcat-circle-wrap">
                                        <img
                                            src={getImgUrl(subImage)}
                                            alt={sub.title}
                                            className="subcat-circle-img"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=' + encodeURIComponent(sub.title);
                                            }}
                                        />
                                    </div>
                                    <span className="subcat-label">{sub.title}</span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="subcat-empty-state">
                        <div className="subcat-empty-title">No subcategories found</div>
                        <div className="subcat-empty-desc">There are no subcategories listed under {category.title} currently. You can search products directly.</div>
                        <Link href={`/search?category_id=${category.slug || category._id}`} className="subcat-back-btn" style={{ display: 'inline-block' }}>
                            Browse All Products in {category.title}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategorySubcategoriesPage;
