'use client';
import AdminLayout from '@/app/pages/admin/AdminLayout';
import { usePathname } from 'next/navigation';

export default function Layout({children}: {children: React.ReactNode}) { 
    const pathname = usePathname();
    if (pathname?.startsWith('/admin/login')) {
        return <>{children}</>;
    }
    return <AdminLayout>{children}</AdminLayout>; 
}