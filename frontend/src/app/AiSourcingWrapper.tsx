'use client'
import useIsMobile from '@/hooks/useIsMobile';
import MobileHomePage from '@/components/js/MobileHomePage';
import AiSourcing from '@/app/pages/AiSourcing';
export default function AiSourcingWrapper() { const isMobile = useIsMobile(); return isMobile ? <MobileHomePage /> : <AiSourcing />; }