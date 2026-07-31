import SupplierProfile from '@/app/pages/SupplierProfile';
import { getSupplierCompanyProfile } from '@/services/companyApi';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const { data } = await getSupplierCompanyProfile(id);
    if (!data || !data.company) {
      return {
        title: 'Supplier Profile - Alibaba Next B2B Marketplace',
        description: 'Global B2B Trading Platform',
      };
    }
    const { company, user } = data;
    const companyName = company.company_name || user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Supplier';

    const cleanDescription = company.description
      ? company.description.slice(0, 160)
      : `Verified supplier ${companyName} on Alibaba Next B2B Marketplace.`;

    let logoUrl = undefined;
    if (company.logo) {
      if (company.logo.startsWith('http') || company.logo.startsWith('data:')) {
        logoUrl = company.logo;
      } else {
        const baseDomain = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5011';
        const normalizedPath = company.logo.startsWith('/') ? company.logo : `/${company.logo}`;
        logoUrl = normalizedPath.startsWith('/uploads/')
          ? `${baseDomain}${normalizedPath}`
          : `${baseDomain}/uploads${normalizedPath}`;
      }
    }

    return {
      title: `${companyName} | Alibaba Next B2B Marketplace`,
      description: cleanDescription,
      keywords: `${companyName}, ${company.business_type || ''}, ${company.country || ''} supplier, wholesale`,
      openGraph: {
        title: `${companyName} | Alibaba Next B2B Marketplace`,
        description: cleanDescription,
        images: logoUrl ? [{ url: logoUrl }] : [],
      },
    };
  } catch (err) {
    return {
      title: 'Supplier Profile - Alibaba Next B2B Marketplace',
      description: 'Global B2B Trading Platform',
    };
  }
}

export default function Page() { return <SupplierProfile />; }
export const generateStaticParams = () => [];