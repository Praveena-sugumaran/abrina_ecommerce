import SupplierLiveControl from '@/app/pages/live/SupplierLiveControl';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Host a Live Stream | B2B Marketplace Supplier Panel',
  description: 'Launch your live stream, stream product launches and factory tours, and interact directly with active B2B buyers.',
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px 0' }}><h3>Loading cockpit...</h3></div>}>
      <SupplierLiveControl isStandalone={true} />
    </Suspense>
  );
}
