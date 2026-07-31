import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';


const IndustrySection = ({ config }: { config?: any }) => {
    const [industryData, setIndustryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { convertPrice, selectedCountry, t } = useAuth();

    const gradients = [
        { color: 'var(--primary)', bg: 'linear-gradient(135deg, var(--primary), #1a4a9e)' },
        { color: '#9c27b0', bg: 'linear-gradient(135deg, #4a148c, #9c27b0)' },
        { color: '#e65100', bg: 'linear-gradient(135deg, #bf360c, #e65100)' },
        { color: '#2e7d32', bg: 'linear-gradient(135deg, #1b5e20, #2e7d32)' },
    ];

    useEffect(() => {
        const fetchIndustryProducts = async () => {
            try {
                const uCountry = selectedCountry || '';
                const catRes = await api.get('/categories');
                const topCats = (catRes.data || []).slice(0, 4);

                const dynamicIndustries = topCats.map((cat: any, i: number) => ({
                    id: cat._id,
                    slug: cat.slug || cat._id,
                    label: cat.title || cat.name,
                    color: gradients[i % gradients.length].color,
                    bg: gradients[i % gradients.length].bg,
                    children: cat.children,
                    subcategories: cat.subcategories
                }));

                const results = await Promise.all(
                    dynamicIndustries.map(async (ind: any) => {
                        try {
                            const { data } = await api.get(
                                `/products?category_id=${ind.id}&limit=4&user_country=${uCountry}&t=${Date.now()}`
                            );
                            return { ...ind, products: data.products || [] };
                        } catch {
                            return { ...ind, products: [] };
                        }
                    })
                );
                setIndustryData(results.filter((r: any) => r.products.length > 0));
            } catch (err) {
                console.error('Error fetching industry data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchIndustryProducts();
        // eslint-disable-next-line
    }, [selectedCountry]);



    if (!loading && industryData.length === 0) return null;

    return (
        <section className="industry-section">
            <div className="container">
                <div className="ind-header">
                    <h2 className="ind-main-title">{config?.title || 'Shop by Industry'}</h2>
                    <p className="ind-main-subtitle">{config?.subtitle || 'Curated product collections across top industries'}</p>
                </div>

                <div className="ind-blocks">
                    {industryData.map((industry, idx) => (
                        <div key={idx} className="ind-block">
                            {/* Block Banner */}
                            <div
                                className="ind-block-banner"
                                style={{ background: industry.bg }}
                            >
                                <div className="ind-banner-content">
                                    <div>
                                        <h3 className="ind-banner-title">{industry.label}</h3>
                                        <p className="ind-banner-count">
                                            {industry.products.length}+ products available
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={industry.children && industry.children.length > 0 ? `/categories/${industry.slug || industry.id}` : `/search?category_id=${industry.slug || industry.id}`}
                                    className="ind-banner-cta"
                                >
                                    View All →
                                </Link>
                            </div>

                            {/* Products Grid */}
                            <div className="ind-products-grid">
                                {industry.products.slice(0, 4).map((product: any) => (
                                    <Link
                                        key={product._id}
                                        href={`/product/${product.slug || product._id}`}
                                        className="ind-product-card"
                                    >
                                        <div className="ind-product-img-wrap">
                                            <img
                                                src={getImgUrl(product.images?.[0] || product.main_image)}
                                                alt={product.name}
                                                className="ind-product-img"
                                                loading="lazy"
                                                onError={e => (e.target as HTMLImageElement).src = 'https://placehold.co/300'}
                                            />
                                        </div>
                                        <div className="ind-product-info">
                                            <p className="ind-product-name">{product.name}</p>
                                            <span className="ind-product-price">
                                                {convertPrice(product.main_price || 0).formatted}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default IndustrySection;
