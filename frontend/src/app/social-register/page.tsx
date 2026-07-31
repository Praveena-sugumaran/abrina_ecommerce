import SocialRegister from '@/app/pages/SocialRegister';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Registration | Alibaba Next B2B Marketplace',
  description: 'Complete your registration on Alibaba Next B2B Marketplace using your social network account.',
};

export default function Page() { return <SocialRegister />; }