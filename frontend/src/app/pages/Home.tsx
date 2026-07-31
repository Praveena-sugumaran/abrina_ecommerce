'use client';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import HomeCoupons from '@/components/js/HomeCoupons';
import Worldwide from './Worldwide';
import SupplierHomeLayout from '@/components/js/SupplierHomeLayout';
import Partners from '@/components/js/Partners';
import AllProducts from '@/components/js/AllProducts';
import MobileHomePage from '@/components/js/MobileHomePage';
import useIsMobile from '@/hooks/useIsMobile';
import '@/components/css/StickyWidgets.css';

// Lazy-loaded homepage sections for performance
const HeroBanner = lazy(() => import('@/components/js/HeroBanner'));
const HomeCategories = lazy(() => import('@/components/js/HomeCategories'));
const FeaturedSuppliers = lazy(() => import('@/components/js/FeaturedSuppliers'));
const RFQSection = lazy(() => import('@/components/js/RFQSection'));
const FeaturedSelections = lazy(() => import('@/components/js/FeaturedSelections'));
const WhyChooseUs = lazy(() => import('@/components/js/WhyChooseUs'));
const AppPromoSection = lazy(() => import('@/components/js/AppPromoSection'));
const ShowcaseProducts = lazy(() => import('@/components/js/ShowcaseProducts'));
const HomepageSections = lazy(() => import('@/components/js/HomepageSections').then(m => ({ default: m.HomepageSections })));

const SectionLoader = () => (
    <div style={{
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#bbb',
        fontSize: '14px',
    }}>
        Loading...
    </div>
);

const Home = () => {
    const { siteSettings } = useAuth();
    const chatContext = useChat();
    const location = usePathname();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'products';
    const isMobile = useIsMobile(450);

    const [sections, setSections] = useState<any[]>([]);
    const [publicCoupons, setPublicCoupons] = useState<any[]>([]);

    useEffect(() => {
        api.get('/homepage-sections')
            .then(res => { if (res.data) setSections(res.data); })
            .catch(err => console.error('Error fetching homepage sections:', err));

        api.get('/coupons/public')
            .then(res => setPublicCoupons(res.data || []))
            .catch(err => console.error('Error fetching public coupons:', err));
    }, []);

    const isSectionActive = (idName: string) => {
        const s = sections.find(x => x.id_name === idName);
        return s ? s.is_active : true;
    };

    const handleChatClick = () => {
        if (chatContext?.openChat) {
            chatContext.openChat(null);
        } else {
            alert('Chat service is currently unavailable.');
        }
    };

    const handleRecentlyViewedClick = () => {
        const el = document.getElementById('recently-viewed-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('No recently viewed items yet!');
        }
    };

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ── MOBILE layout (≤ 450 px) ── */
    // if (isMobile) {
    //     return <MobileHomePage />;
    // }

    /* ── Special tabs ── */
    if (tab === 'suppliers') {
        return (
            <div className="home-page">
                <SupplierHomeLayout />
                <Partners />
            </div>
        );
    }

    if (tab === 'worldwide') {
        return (
            <div className="home-page">
                <Worldwide />
                <AllProducts forceWorldwide={true} />
            </div>
        );
    }

    /* ── DESKTOP layout ── */
    return (
        <div className="home-page alibaba-home">
            <Suspense fallback={<SectionLoader />}>
                {isSectionActive('hero_banner') && <HeroBanner />}

                <HomepageSections
                    sections={sections}
                    categoriesComponent={isSectionActive('categories') && <HomeCategories />}
                    showcaseComponent={(onQuickView) => isSectionActive('showcase_products') && <ShowcaseProducts onQuickView={onQuickView} />}
                    suppliersComponent={isSectionActive('featured_suppliers') && <FeaturedSuppliers />}
                    couponsComponent={publicCoupons.length > 0 && <HomeCoupons coupons={publicCoupons} />}
                    selectionsComponent={null /* Hidden per user request: contains Top Deals, Top Ranking, New Arrivals */}
                    rfqComponent={isSectionActive('rfq_section') && siteSettings?.rfq_enabled !== false && <RFQSection />}
                    whyChooseUsComponent={isSectionActive('why_choose_us') && <WhyChooseUs />}
                    appPromoComponent={isSectionActive('app_promo') && <AppPromoSection />}
                />

                {/* ── Sticky Widgets Layer ── */}
                <div className="sticky-widgets-bar">
                    <button 
                        className="sticky-widget-item" 
                        data-tooltip="Chat Support"
                        onClick={handleChatClick}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                    <button 
                        className="sticky-widget-item" 
                        data-tooltip="Recently Viewed"
                        onClick={handleRecentlyViewedClick}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button 
                        className="sticky-widget-item" 
                        data-tooltip="Back To Top"
                        onClick={handleScrollToTop}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>
            </Suspense>
        </div>
    );
};

export default Home;
