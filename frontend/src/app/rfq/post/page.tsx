import PostRFQ from '@/app/pages/rfq/PostRFQ';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post a Request for Quotation (RFQ) | Alibaba Next B2B Marketplace',
  description: 'Submit your product requirements through our simple RFQ form and receive competitive wholesale quotes directly from multiple verified suppliers.',
  keywords: 'post rfq, request for quotation, buyer request, wholesale quote, sourcing requirements',
};

export default function Page() { return <PostRFQ />; }