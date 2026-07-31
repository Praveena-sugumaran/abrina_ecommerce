import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import ClientToaster from '@/components/ClientToaster';
import './globals.css';

import ClientAppLayout from './ClientAppLayout';
import BrandLoader from '@/components/BrandLoader';

export const metadata: Metadata = {
  title: 'Alibaba Next B2B Marketplace',
  description: 'Global B2B Trading Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var primaryColor = localStorage.getItem('primary_color');
                var secondaryColor = localStorage.getItem('secondary_color');
                if (primaryColor) {
                  document.documentElement.style.setProperty('--primary-color', primaryColor);
                  document.documentElement.style.setProperty('--primary', primaryColor);
                  if (secondaryColor) {
                    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
                    document.documentElement.style.setProperty('--button-gradient', 'linear-gradient(135deg, ' + primaryColor + ', ' + secondaryColor + ')');
                  } else {
                    document.documentElement.style.setProperty('--button-gradient', primaryColor);
                  }
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <Providers>
            <ClientAppLayout>
              {children}
            </ClientAppLayout>
            <ClientToaster />
          </Providers>
        </Suspense>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossOrigin="anonymous"></script>
      </body>
    </html>
  );
}
