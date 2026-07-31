import ProductDetail from '@/app/pages/ProductDetail';
import { fetchProductById } from '@/services/productApi';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: product } = await fetchProductById(slug);
    if (!product) {
      return {
        title: 'Product - Alibaba Next B2B Marketplace',
        description: 'Global B2B Trading Platform',
      };
    }
    const cleanDescription = product.description
      ? product.description.replace(/<[^>]*>?/gm, '').slice(0, 160)
      : `Buy ${product.name} at wholesale prices on Alibaba Next.`;

    let imageUrl = undefined;
    if (product.main_image) {
      if (product.main_image.startsWith('http') || product.main_image.startsWith('data:')) {
        imageUrl = product.main_image;
      } else {
        const baseDomain = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5011';
        const normalizedPath = product.main_image.startsWith('/') ? product.main_image : `/${product.main_image}`;
        imageUrl = normalizedPath.startsWith('/uploads/')
          ? `${baseDomain}${normalizedPath}`
          : `${baseDomain}/uploads${normalizedPath}`;
      }
    }

    return {
      title: `${product.name} | Alibaba Next B2B Marketplace`,
      description: cleanDescription,
      keywords: `${product.name}, ${product.category?.title || ''}, wholesale, manufacturer, global trade`,
      openGraph: {
        title: `${product.name} | Alibaba Next B2B Marketplace`,
        description: cleanDescription,
        images: imageUrl ? [{ url: imageUrl }] : [],
      },
    };
  } catch (err) {
    return {
      title: 'Product - Alibaba Next B2B Marketplace',
      description: 'Global B2B Trading Platform',
    };
  }
}

export default function Page() { return <ProductDetail />; }
export const generateStaticParams = () => [];