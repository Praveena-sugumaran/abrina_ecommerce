import SupplierRegister from '@/app/pages/SupplierRegister';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Seller/Supplier | Alibaba Next B2B Marketplace',
  description: 'Join Alibaba Next as a supplier or manufacturer. Set up your factory storefront, list your bulk products, and reach millions of global buyers.',
  keywords: 'sell on alibaba, supplier registration, wholesale seller, list products, manufacturer registration',
};

export default function Page() { return <SupplierRegister />; }