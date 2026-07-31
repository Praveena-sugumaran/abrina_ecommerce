'use client';
import React, { Suspense } from 'react';
import AdminLayout from '@/app/pages/admin/AdminLayout';
import { usePathname } from 'next/navigation';

export default function Layout({children}: {children: React.ReactNode}) { 
    const pathname = usePathname();
    if (pathname?.startsWith('/admin/login')) {
        return <>{children}</>;
    }
    return (
        <AdminLayout>
            <Suspense fallback={
                <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--admin-text-sub, #64748b)', fontWeight: 600 }}>
                    <div className="spinner-circle" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }}></div>
                    Loading...
                </div>
            }>
                {children}
            </Suspense>
        </AdminLayout>
    ); 
}