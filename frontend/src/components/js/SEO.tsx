import React from 'react';
import { Helmet } from 'react-helmet-async';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';

const SEO = () => {
    const { siteSettings, t } = useAuth();
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();

    const siteName = siteSettings?.site_name || 'Alibaba';
    const defaultFavicon = getImgUrl(siteSettings?.favicon, '/favicon.ico');
    const siteKeywords = siteSettings?.keywords || 'e-commerce, shopping, marketplace, products, online deals, stores';

    let title = '';
    let description = '';
    let keywords = siteKeywords;
    let canonical = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : pathname;
    let image = siteSettings?.logo_light ? getImgUrl(siteSettings.logo_light) : '';

    // 1. HOME PAGE: Use Admin Site Settings
    if (pathname === '/') {
        const tab = searchParams.get('tab');
        if (tab === 'worldwide') {
            title = `${siteName} | ${t('worldwide_sourcing_hub') || 'Worldwide Sourcing Hub'}`;
            description = (t('worldwide_sourcing_desc') || `Explore global sourcing opportunities and verified suppliers from across the world on ${siteName}`).replace('{siteName}', siteName);
            keywords = `worldwide sourcing, global trade, international suppliers, ${siteKeywords}`;
        } else if (tab === 'suppliers') {
            title = `${siteName} | ${t('certified_global_suppliers') || 'Certified Global Suppliers'}`;
            description = (t('certified_global_suppliers_desc') || `Find and connect with verified manufacturers, wholesalers, and exporters on ${siteName}`).replace('{siteName}', siteName);
            keywords = `verified suppliers, manufacturers list, wholesale exporters, ${siteKeywords}`;
        } else {
            title = siteSettings?.seo_title || `${siteName} | ${t('home_seo_title_fallback') || 'Global e-commerce platform for international trade'}`;
            description = siteSettings?.meta_description || (t('home_meta_desc_fallback') || `${siteName} connects global buyers and suppliers. Browse millions of products in hundreds of categories.`).replace('{siteName}', siteName);
            keywords = siteSettings?.keywords || siteKeywords;
        }
    } 
    // 2. SEARCH PAGE: Use Keyword
    else if (pathname.startsWith('/search')) {
        const keyword = searchParams.get('keyword');
        const category = searchParams.get('category_id');
        const tab = searchParams.get('tab') || 'products';

        if (keyword) {
            title = `${t('search') || 'Search'}: ${keyword} | ${siteName}`;
            description = `${t('find_best_deals') || 'Find the best deals for'} "${keyword}" ${t('on') || 'on'} ${siteName}. ${t('secure_trading_desc') || 'Secure trading with verified suppliers.'}`;
            keywords = `${keyword}, buy ${keyword}, ${keyword} suppliers, wholesale ${keyword}, ${siteKeywords}`;
        } else if (category) {
            title = `${t('browse_category') || 'Browse Category'} | ${siteName}`;
            description = (t('browse_category_desc') || `Explore products in our specialized categories on ${siteName}`).replace('{siteName}', siteName);
        } else if (tab === 'suppliers') {
            title = `${t('find_suppliers') || 'Find Suppliers'} | ${siteName}`;
            description = (t('find_suppliers_desc') || `Connect with top-rated global suppliers and factories on ${siteName}`).replace('{siteName}', siteName);
        } else if (tab === 'worldwide') {
            title = `${t('worldwide_sourcing') || 'Worldwide Sourcing'} | ${siteName}`;
            description = (t('worldwide_sourcing_meta_desc') || `Source products from premium international suppliers on ${siteName}`).replace('{siteName}', siteName);
        } else {
            title = `${t('browse_products') || 'Browse Products'} | ${siteName}`;
            description = (t('browse_products_desc') || `Browse the latest hot-selling products and top-rated suppliers on ${siteName}`).replace('{siteName}', siteName);
        }
    }
    // 3. CATEGORIES PAGE
    else if (pathname === '/categories') {
        title = `${t('all_categories') || 'All Categories'} | ${siteName}`;
        description = (t('all_categories_desc') || `Browse all product categories and find what you need on ${siteName}`).replace('{siteName}', siteName);
    }
    // 4. CART & CHECKOUT
    else if (pathname === '/cart') {
        title = `${t('shopping_cart') || 'Shopping Cart'} | ${siteName}`;
        description = t('cart_desc') || 'Review your selected products and proceed to secure checkout.';
    }
    else if (pathname === '/checkout') {
        title = `${t('secure_checkout') || 'Secure Checkout'} | ${siteName}`;
        description = t('checkout_desc') || 'Complete your order securely with our protected payment system.';
    }
    // 5. RFQ
    else if (pathname.startsWith('/rfq')) {
        title = `${t('rfq_market') || 'Request for Quotation'} | ${siteName}`;
        description = (t('rfq_market_desc') || `Post your sourcing requirements and get multiple quotes from verified suppliers on ${siteName}`).replace('{siteName}', siteName);
    }
    // 6. PRODUCT DETAIL
    else if (pathname.startsWith('/product/')) {
        const slug = pathname.split('/product/')[1];
        // If it looks like a MongoDB ID (24 hex chars), use "Product Details" instead of the ID
        const isId = /^[0-9a-fA-F]{24}$/.test(slug);
        const formattedSlug = (slug && !isId)
            ? slug.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : (t('product_details') || 'Product Details');
        
        title = `${formattedSlug} | ${siteName}`;
        description = (t('product_detail_desc') || `View detailed specifications, pricing, and supplier information for this product on ${siteName}`).replace('{siteName}', siteName);
    }
    // 4. ADMIN PANEL
    else if (pathname.startsWith('/admin')) {
        const subPage = pathname.split('/admin/')[1] || 'Dashboard';
        const formattedSub = subPage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        title = `${t('admin_panel') || 'Admin Panel'} | ${formattedSub}`;
        description = `${t('manage_platform_desc') || 'Manage your platform settings, users, and orders from the secure'} ${siteName} ${t('admin_panel_suffix') || 'Admin Panel'}.`;
    }
    // 5. SUPPLIER PROFILE
    else if (pathname.startsWith('/supplier/')) {
        title = `${t('supplier_profile') || 'Supplier Profile'} | ${siteName}`;
        description = (t('supplier_profile_desc') || `Learn more about this verified supplier, their factory capabilities, and product range on ${siteName}`).replace('{siteName}', siteName);
    }
    // 6. DEFAULT: Path-based generation
    else {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            const formatted = lastSegment
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            title = `${siteName} | ${formatted}`;
            description = `Explore ${formatted} on ${siteName}. We offer the best platform for online global retail shopping.`;
        } else {
            title = siteName;
            description = `${siteName} - Leading online shopping platform.`;
        }
    }

    return (
        <Helmet>
            {/* Standard SEO */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonical} />
            <link rel="icon" href={defaultFavicon} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonical} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonical} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
};

export default SEO;
