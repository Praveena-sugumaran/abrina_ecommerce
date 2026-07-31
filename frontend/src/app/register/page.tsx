import Register from '@/app/pages/Register';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an Account / Register | Alibaba Next B2B Marketplace',
  description: 'Register a free buyer or supplier account on Alibaba Next. Join the global B2B trade network and start sourcing or selling today.',
};

export default function Page() { return <Register />; }