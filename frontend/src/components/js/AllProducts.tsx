import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getImgUrl } from '@/utils/imageConfig';


const AllProducts = ({ forceWorldwide = false }: { forceWorldwide?: boolean }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { convertPrice, t, selectedCountry } = useAuth();

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch a generous fixed batch (e.g., 24) instead of paginating
                const uCountry = forceWorldwide ? '' : (selectedCountry || '');
                const { data } = await api.get(`/products?page=1&limit=24&user_country=${uCountry}`);
                setProducts(data.products || []);
            } catch (error) {
                console.error('Error fetching all products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [selectedCountry, forceWorldwide]);

    return (
        <div className="all-products container mt-16 pb-16">
            <div className="section-header mb-8">
                <h2 className="section-block-title">{t('just_for_you')}</h2>
                <p className="section-block-subtitle">{t('personalized_recommendations') || 'Personalized recommendations based on your interests'}</p>
            </div>

            <div className="all-products-grid">
                {products && products.length > 0 ? (
                    products.map((product: any) => (
                        <Link key={product._id} href={`/product/${product.slug || product._id}`} className="product-item-card">
                            <ProductCardBody product={product} convertPrice={convertPrice} t={t} />
                        </Link>
                    ))
                ) : (
                    !loading && <div className="no-products-found" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No products found for this region.</div>
                )}
            </div>

            {loading && (
                <div className="text-center mt-8">
                    <div className="loading-spinner"></div>
                </div>
            )}

            {!loading && products.length > 0 && products.length >= 24 && (
                <div className="text-center mt-12 text-muted">
                    {t('no_more_products') || 'You have reached the end of personalized recommendations.'}
                </div>
            )}
        </div>
    );
};

interface ProductCardBodyProps {
    product: any;
    convertPrice?: (priceInUSD: number) => { amount: string; symbol: string; formatted: string };
    t: (key: string) => string;
}

const ProductCardBody = ({ product, convertPrice = (p) => ({ amount: String(p), symbol: '$', formatted: `$${p}` }), t }: ProductCardBodyProps) => {
    const { siteSettings } = useAuth();
    return (
        <div className="p-card-inner">
            <div className="p-card-img-container">
                <img
                    src={getImgUrl(product.images?.[0] || product.main_image)}
                    alt={product.name}
                    className="p-card-img"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = 'https://placehold.co/300'}
                />
                <button className="visual-search-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
            </div>
            <div className="p-card-content">
                <h3 className="p-card-name" title={product.name}>{product.name}</h3>
                <div className="p-card-price-row">
                    <span className="p-card-price">{convertPrice(product.main_price || product.price_tiers?.[0]?.price || 0).formatted}</span>
                </div>
                {siteSettings?.rfq_enabled !== false && (
                    <div className="p-card-moq">
                        MOQ: {product.moq || 1} {product.moq > 1 ? 'pieces' : 'piece'}
                    </div>
                )}
                <div className="p-card-footer d-flex align-center gap-2 mt-2">
                    {product.supplier_info?.is_verified && <span className="verified-badge">{t('verified') || 'Verified'}</span>}
                    {product.supplier_info?.country && <span className="years-vendor">{product.supplier_info.country}</span>}
                </div>
            </div>
        </div>
    );
};

export default AllProducts;



