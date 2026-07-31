import TopRanking from '@/app/pages/TopRanking';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top Rankings | Alibaba Next B2B Marketplace',
  description: 'Explore top-ranking, highly-rated, and best-performing products by industry based on sales performance and buyer reviews on Alibaba Next.',
  keywords: 'top products, best sellers, top rated, popular products, top rankings',
};

export default function Page() { return <TopRanking />; }