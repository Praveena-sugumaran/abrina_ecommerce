import SellerLogin from '@/app/pages/SellerLogin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Login | Global Selling Center',
  description: 'Sign in to your seller account on the Global Selling Center to manage your store, products, and orders.',
};

export default function Page() { return <SellerLogin />; }
