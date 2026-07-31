import React from 'react';
import NotFound from '@/app/pages/NotFound';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | Alibaba Next B2B Marketplace',
  description: 'The page you are looking for does not exist or has been moved. Explore the B2B marketplace or use our search tool to find wholesale suppliers and products.',
};

export default function NotFoundPage() {
  return <NotFound />;
}
