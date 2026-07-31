import RFQMarketplace from '@/app/pages/rfq/RFQMarketplace';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RFQ Market | Alibaba Next B2B Marketplace',
  description: 'Browse the latest Request for Quotations (RFQs) from global buyers and submit your competitive quotes to win business.',
  keywords: 'rfq market, b2b marketplace, request for quotation, submit quote, supplier dashboard',
};

export default function Page() { return <RFQMarketplace />; }
