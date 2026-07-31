import Home from '@/app/pages/Home';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alibaba Next - Global B2B Marketplace',
  description: 'Connect with verified manufacturers, exporters, and wholesale suppliers worldwide on Alibaba Next, the premium B2B trading platform.',
  keywords: 'B2B, marketplace, wholesale, global trade, suppliers, manufacturers, exporters, bulk purchase',
};

export default function Page() { return <Home />; }