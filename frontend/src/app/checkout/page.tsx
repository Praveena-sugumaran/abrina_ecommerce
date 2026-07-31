import Checkout from '@/app/pages/Checkout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | Alibaba Next B2B Marketplace',
  description: 'Complete your bulk product purchase securely. Set your shipping details, choose payment options, and finalize your order directly with the supplier.',
};

export default function Page() { return <Checkout />; }