import Search from '@/app/pages/Search';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Products & Suppliers | Alibaba Next B2B Marketplace',
  description: 'Search for high-quality global products, manufacturers, verified suppliers, and exporters on Alibaba Next. Start bulk sourcing today.',
  keywords: 'product search, supplier lookup, wholesale products, find manufacturers, bulk sourcing',
};

export default function Page() { return <Search />; }