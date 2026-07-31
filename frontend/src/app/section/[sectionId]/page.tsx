import SectionPage from '@/app/pages/SectionPage';
import TopRanking from '@/app/pages/TopRanking';
import type { Metadata } from 'next';
import { use } from 'react';

type Props = {
  params: Promise<{ sectionId: string }>;
};

const pageMetadata: Record<string, { title: string; description: string }> = {
  'top-deals': {
    title: 'Top Deals',
    description: 'Find the best prices and exclusive wholesale discounts from verified global suppliers on Alibaba Next.',
  },
  'top-ranking': {
    title: 'Top Rankings',
    description: 'Explore our top-ranking, best-performing products based on real sales data, ratings, and popularity on Alibaba Next.',
  },
  'new-arrivals': {
    title: 'New Arrivals',
    description: 'Browse freshly listed products from global suppliers added to Alibaba Next in the last 7 days.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { sectionId } = await params;
    const meta = pageMetadata[sectionId];
    if (meta) {
      return {
        title: `${meta.title} | Alibaba Next B2B Marketplace`,
        description: meta.description,
      };
    }
    const formattedTitle = sectionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      title: `${formattedTitle} | Alibaba Next B2B Marketplace`,
      description: `Explore ${formattedTitle} on Alibaba Next B2B Marketplace.`,
    };
  } catch (err) {
    return {
      title: 'Products Section - Alibaba Next B2B Marketplace',
      description: 'Explore our curated product selections on Alibaba Next.',
    };
  }
}

export default function Page({ params }: Props) {
  const { sectionId } = use(params);
  if (sectionId === 'top-ranking') {
    return <TopRanking />;
  }
  return <SectionPage />;
}
export const generateStaticParams = () => [];