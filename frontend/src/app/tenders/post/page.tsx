import PostTender from '@/app/pages/tender/PostTender';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Reverse Auction Tender | Alibaba Next B2B Marketplace',
  description: 'Create a procurement tender and let suppliers bid their lowest prices in real time.',
};

export default function Page() { return <PostTender />; }
