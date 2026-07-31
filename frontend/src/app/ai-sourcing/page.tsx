import AiSourcingWrapper from '@/app/AiSourcingWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Sourcing Assistant | Alibaba Next B2B Marketplace',
  description: 'Use our advanced AI Sourcing Assistant to find the best manufacturers and products. Type your requirements and let AI match you with suppliers.',
  keywords: 'ai sourcing, smart procurement, find suppliers with AI, automated product matching, B2B ai tool',
};

export default function Page() { return <AiSourcingWrapper />; }