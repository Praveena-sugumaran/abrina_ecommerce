'use client'

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/js/Header';
import Footer from '@/components/js/Footer';
import MobileBottomNav from '@/components/js/MobileBottomNav';
import useIsMobile from '@/hooks/useIsMobile';
import ScrollToTop from '@/components/js/ScrollToTop';
import BackToTop from '@/components/js/BackToTop';
import AuthModal from '@/components/js/AuthModal';
import ChatPopup from '@/components/js/ChatPopup';
import AiChatbotPopup from '@/components/js/AiChatbotPopup';
import SEO from '@/components/js/SEO';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LicenseVerification from '@/components/LicenseVerification';
import BrandLoader from '@/components/BrandLoader';

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile(450);
  const isHomeTabletOrMobile = useIsMobile(767);
  const { siteSettings, isInitialized, user, t } = useAuth();
  const router = useRouter();

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered scope:', reg.scope);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && user) {
            reg.pushManager.getSubscription().then(async (sub) => {
              if (sub) {
                try {
                  await api.post('/notifications/subscribe', { subscription: sub });
                } catch (e) {}
              }
            });
          }
        })
        .catch((err) => console.error('PWA Service Worker registration failed:', err));
    }
  }, [user]);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      }
    };
  }, []);

  useEffect(() => {
    if (isInitialized && siteSettings) {
      if (siteSettings.is_installed === false) {
        if (pathname !== '/install') {
          router.push('/install');
        }
      }
    }
  }, [siteSettings, isInitialized, pathname, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('affiliate_referral', ref);
        if (ref.toUpperCase().startsWith('CAMP_')) {
          api.post(`/campaigns/track/${ref}`).catch(err => console.error('Failed to track click:', err));
        }
      }
    }
  }, [pathname]);

  const isFullscreenRoute =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/supplier/dashboard') ||
    pathname?.startsWith('/buyer/dashboard') ||
    pathname?.startsWith('/dashboard') ||
    pathname === '/install' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/become-supplier/login' ||
    pathname === '/become-supplier/register';

  const isLiveStreamCockpit =
    pathname?.startsWith('/live/supplier') ||
    pathname?.startsWith('/live/watch');

  const isInstalled = siteSettings?.is_installed;
  const isLicenseValid = siteSettings?.license_status === 'active' || siteSettings?.license_status === 'development';

  const needsInstallRedirect = isInitialized && siteSettings && isInstalled === false && pathname !== '/install';
  const needsLicenseBlock = isInitialized && siteSettings && isInstalled === true && !isLicenseValid && pathname !== '/install';

  const isAdminRoute = pathname?.startsWith('/admin');

  if ((!isInitialized || !siteSettings || needsInstallRedirect) && !isAdminRoute) {
    return <BrandLoader />;
  }

  if (needsLicenseBlock) {
    return <LicenseVerification />;
  }

  const isMaintenanceMode = siteSettings?.maintenance_mode === true;
  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
  const isExcludedRoute = pathname?.startsWith('/admin') || pathname === '/install';

  if (isMaintenanceMode && !isAdmin && !isExcludedRoute) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '500px',
          padding: '40px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          borderTop: '6px solid var(--primary-color, #ff6a00)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛠️</div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            {t('under_maintenance') || 'Under Maintenance'}
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#4b5563',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            {t('maintenance_message') || "We're currently performing some scheduled maintenance to improve your experience. We'll be back online shortly. Thank you for your patience!"}
          </p>
          <div style={{
            fontSize: '14px',
            color: '#9ca3af',
            fontWeight: '500'
          }}>
            {siteSettings?.site_name || 'B2B Marketplace'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO />
      {showInstallBanner && deferredPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>Install AliExpress Web App</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Access deals instantly from your home screen.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setShowInstallBanner(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 12px' }}
            >
              Close
            </button>
            <button 
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    console.log('User installed PWA');
                  }
                  setDeferredPrompt(null);
                  setShowInstallBanner(false);
                }
              }}
              style={{ background: '#ff6600', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 800, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Install
            </button>
          </div>
        </div>
      )}
      {!isFullscreenRoute && !isLiveStreamCockpit && <ScrollToTop />}
      {!isFullscreenRoute && !isLiveStreamCockpit && (!(pathname === '/' && isHomeTabletOrMobile) || isMobile) && <Header />}
      <main>
        {children}
      </main>
      {!isFullscreenRoute && !isLiveStreamCockpit && pathname !== '/ai-sourcing' && <Footer />}
      {isMobile && !isLiveStreamCockpit && (!isFullscreenRoute || pathname?.startsWith('/buyer/dashboard') || pathname?.startsWith('/dashboard')) && <MobileBottomNav />}
      {!isFullscreenRoute && !isLiveStreamCockpit && <BackToTop />}
      {/* Global Modals/Popups */}
      <AuthModal />
      <ChatPopup />
      {!isFullscreenRoute && !isLiveStreamCockpit && siteSettings?.chatbot_enabled !== false && <AiChatbotPopup />}
    </>
  );
}


