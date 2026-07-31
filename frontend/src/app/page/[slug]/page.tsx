import PageView from '@/app/pages/PageView';
import api from '@/services/axiosConfig';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: page } = await api.get(`/cms/${slug}`);
    if (!page) {
      return {
        title: 'Page - Alibaba Next B2B Marketplace',
        description: 'Global B2B Trading Platform',
      };
    }
    const cleanTitle = page.title || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const cleanDescription = page.content
      ? page.content.replace(/<[^>]*>?/gm, '').slice(0, 160)
      : `Read our ${cleanTitle} on Alibaba Next B2B Marketplace.`;

    return {
      title: `${cleanTitle} | Alibaba Next B2B Marketplace`,
      description: cleanDescription,
    };
  } catch (err) {
    try {
      const { slug } = await params;
      const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return {
        title: `${title} | Alibaba Next B2B Marketplace`,
        description: `Read our ${title} on Alibaba Next B2B Marketplace.`,
      };
    } catch {
      return {
        title: 'Information - Alibaba Next B2B Marketplace',
        description: 'Global B2B Trading Platform',
      };
    }
  }
}

export default function Page() { return <PageView />; }
export const generateStaticParams = () => [];