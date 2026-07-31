import BuyerLiveWatch from '@/app/pages/live/BuyerLiveWatch';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Stream Showcase | Alibaba Next B2B Marketplace',
  description: 'Watch real-time live demonstrations, chat with suppliers, and submit quote requests during live broadcasts.',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <BuyerLiveWatch streamId={resolvedParams.id} />;
}
