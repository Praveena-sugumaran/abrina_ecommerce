import AdminSupplierDetail from '@/app/pages/admin/AdminSupplierDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <AdminSupplierDetail supplierId={id} />;
}
