import FeaturesList from '@/app/pages/FeaturesList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace Features Directory | B2C AliExpress Clone',
  description: 'Explore the comprehensive list of features, payment gateways, supplier tools, and security architectures integrated into our B2C e-commerce platform.',
  keywords: 'ecommerce features, shopping cart, supplier dashboard, secure checkout, stripe checkout, multi-language',
};

export default function Page() { return <FeaturesList />; }
