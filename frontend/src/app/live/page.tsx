import LiveDashboard from '@/app/pages/live/LiveDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Streams & Factory Tours | Alibaba Next B2B Marketplace',
  description: 'Join real-time supplier showcases, product demonstrations, factory tours, and request quotes live directly from the catalog.',
};

export default function Page() {
  return <LiveDashboard />;
}
