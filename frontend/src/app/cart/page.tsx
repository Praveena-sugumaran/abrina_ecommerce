import Cart from '@/app/pages/Cart';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Cart | Alibaba Next B2B Marketplace',
  description: 'Review your selected wholesale items, adjust quantities, and manage bulk products in your shopping cart before proceeding to checkout.',
};

export default function Page() { return <Cart />; }