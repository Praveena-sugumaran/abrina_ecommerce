import Categories from '@/app/pages/Categories';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Product Categories | Alibaba Next B2B Marketplace',
  description: 'Browse all wholesale product categories on Alibaba Next. Find electronics, apparel, machinery, home decor, and more from global manufacturers.',
  keywords: 'product categories, directory, wholesale departments, manufacturing sectors',
};

export default function Page() { return <Categories />; }