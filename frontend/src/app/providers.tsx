'use client'

import React, { Suspense } from 'react';
import BrandLoader from '@/components/BrandLoader';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { VoiceSearchProvider } from '@/context/VoiceSearchContext';
import { HelmetProvider } from 'react-helmet-async';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<BrandLoader />}>
      <HelmetProvider>
        <AuthProvider>
          <VoiceSearchProvider>
            <ToastProvider>
              <ChatProvider>
                <NotificationProvider>
                  <ThemeProvider>
                    {children}
                  </ThemeProvider>
                </NotificationProvider>
              </ChatProvider>
            </ToastProvider>
          </VoiceSearchProvider>
        </AuthProvider>
      </HelmetProvider>
    </Suspense>
  );
}

