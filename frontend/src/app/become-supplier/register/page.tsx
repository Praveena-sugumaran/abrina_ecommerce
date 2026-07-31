import SellerRegister from '@/app/pages/SellerRegister';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Registration | Global Selling Center',
  description: 'Register as a seller on our Global Selling Center. Reach millions of buyers worldwide and grow your business.',
};

export default function Page() { return <SellerRegister />; }
