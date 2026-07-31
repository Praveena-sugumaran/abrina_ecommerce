import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import SubscribePrompt from './SubscribePrompt';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

const TEMPLATE_HEADERS = ['name', 'description', 'category', 'sku', 'moq', 'price', 'currency', 'stock', 'sample_available', 'sample_price', 'main_image', 'images', 'price_tiers', 'variants', 'key_attributes'];

const ProductManagement = ({ isAdminView = false }: { isAdminView?: boolean }) => {
    const router = useRouter();
    const [view, setView] = useState('list');
    const [editProduct, setEditProduct] = useState<any | null>(null);
    const [bulkModal, setBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkDrag, setBulkDrag] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<any | null>(null);
    const [totalProducts, setTotalProducts] = useState(0);
    const bulkInputRef = useRef<HTMLInputElement | null>(null);
    const { user } = useAuth();
    const { showToast } = useToast();

    const handleAdd = () => {
        if (!isAdminView && (user?.roles?.includes('supplier') || user?.role === 'supplier')) {
            if (!user?.subscription_plan) {
                router.push('/supplier/dashboard/subscription');
                return;
            }

            // Check product limit
            const limit = user.subscription_plan.max_products;
            if (limit !== -1 && limit !== 0 && totalProducts >= limit) {
                showToast(`Product limit exceeded. Your ${user.subscription_plan.name} plan allows up to ${limit} products. Please upgrade your plan.`, 'error', 'Limit Reached');
                return;
            }
            // Temporarily alert the values if no limit was hit (for debugging)
            // alert(`Debug - Limit: ${limit}, Count: ${totalProducts}`);
        }
        setEditProduct(null);
        setView('add');
    };

    const handleEdit = (product: any) => { setEditProduct(product); setView('edit'); };
    const handleSaved = () => { setView('list'); setEditProduct(null); };
    const handleCancel = () => { setView('list'); setEditProduct(null); };

    const handleExport = async () => {
        try {
            const response = await api.get('/products/my/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my-products.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            showToast('Export failed: ' + (err.response?.data?.message || err.message), 'error');
        }
    };

    const downloadTemplate = () => {
        const rows = [
            TEMPLATE_HEADERS.join(','),
            'Industrial Safety Helmet,High-grade ABS helmet,Safety Equipment,HLM-RED-XL,100,12.50,USD,500,false,0,/uploads/products/helmet-main.jpg,"/uploads/products/helmet-main.jpg, /uploads/products/helmet-side.jpg",100-499:12.50 | 500+:11.00,"Color:Red (Stock: 300, Price: 0) | Color:Blue (Stock: 200, Price: 0.50)","Material:ABS Plastic | Certification:CE"',
            'Cotton Work Gloves,Heavy-duty cotton,Protective Equipment,GLV-001,200,5.00,USD,1000,true,2.50,/uploads/products/gloves.jpg,/uploads/products/gloves.jpg,200+:5.00,,"Material:Cotton | Color:White"'
        ].join('\n');
        const blob = new Blob([rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product-upload-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setBulkLoading(true);
        setBulkResult(null);
        try {
            const fd = new FormData();
            fd.append('file', bulkFile);
            const { data } = await api.post('/products/bulk-upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(data);
            setBulkFile(null);
        } catch (err: any) {
            setBulkResult({ error: err.response?.data?.message || 'Upload failed' });
        } finally {
            setBulkLoading(false);
        }
    };

    if (view === 'add') return <ProductForm product={null} onSave={handleSaved} onCancel={handleCancel} />;
    if (view === 'edit') return <ProductForm product={editProduct} onSave={handleSaved} onCancel={handleCancel} />;
    if (view === 'subscribe_prompt') return <SubscribePrompt onSubscribed={handleSaved} />;

    return (
        <>
            <ProductList 
                isAdminView={isAdminView} 
                onAdd={handleAdd} 
                onEdit={handleEdit} 
                onTotalUpdate={setTotalProducts} 
                onExport={!isAdminView ? handleExport : undefined}
                onBulkUpload={!isAdminView ? () => { setBulkModal(true); setBulkResult(null); } : undefined}
            />

            {/* Bulk Upload Modal */}
            {bulkModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1a1a2e' }}>Bulk Product Upload</h3>
                            <button onClick={() => setBulkModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' }}>✕</button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>
                            Upload a <strong>CSV or XLSX</strong> file. Category names must match exactly.
                        </p>

                        <button onClick={downloadTemplate} style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: '700', background: '#f0f4ff', border: '1px solid #c7d7f8', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', marginBottom: '16px' }}>
                            Download Template CSV
                        </button>

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setBulkDrag(true); }}
                            onDragLeave={() => setBulkDrag(false)}
                            onDrop={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setBulkDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setBulkFile(f); }}
                            onClick={() => bulkInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${bulkDrag ? 'var(--primary-color)' : '#e5e7eb'}`,
                                borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer',
                                background: bulkDrag ? '#f0f4ff' : '#fafafa', marginBottom: '14px', transition: 'all 0.15s'
                            }}
                        >
                            {bulkFile ? (
                                <div>
                                    <div style={{ fontWeight: '700', color: 'var(--primary-color)', fontSize: '14px' }}>{bulkFile.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{(bulkFile.size / 1024).toFixed(1)} KB</div>
                                    <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setBulkFile(null); }} style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Drop CSV or XLSX here</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>or click to browse</div>
                                </div>
                            )}
                            <input ref={bulkInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setBulkFile(f); }} />
                        </div>

                        {/* Result */}
                        {bulkResult && !bulkResult.error && (
                            <div style={{
                                marginBottom: '14px',
                                padding: '14px 16px',
                                background: bulkResult.inserted > 0 ? '#f0fdf4' : '#fef2f2',
                                borderRadius: '10px',
                                border: `1px solid ${bulkResult.inserted > 0 ? '#bbf7d0' : '#fee2e2'}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}>
                                {bulkResult.inserted > 0 ? (
                                    <div style={{ fontWeight: '700', color: '#15803d', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>✅</span> {bulkResult.inserted} products uploaded successfully as drafts.
                                    </div>
                                ) : (
                                    <div style={{ fontWeight: '700', color: '#b91c1c', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>⚠️</span> No products were imported. Please check the errors below.
                                    </div>
                                )}
                            </div>
                        )}
                        {bulkResult && !bulkResult.error && bulkResult.errors && bulkResult.errors.length > 0 && (
                            <div style={{
                                maxHeight: '160px',
                                overflowY: 'auto',
                                marginBottom: '14px',
                                padding: '12px 14px',
                                background: '#fef2f2',
                                borderRadius: '8px',
                                border: '1px solid #fee2e2',
                                fontSize: '12.5px',
                                color: '#b91c1c',
                                textAlign: 'left'
                            }}>
                                <div style={{ fontWeight: '800', marginBottom: '6px' }}>Import Errors/Warnings ({bulkResult.errors.length}):</div>
                                <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.5' }}>
                                    {bulkResult.errors.map((err: any, index: number) => (
                                        <li key={index} style={{ marginBottom: '4px' }}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {bulkResult?.error && (
                            <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '13px', color: '#991b1b' }}>
                                ❌ {bulkResult.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setBulkModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                {bulkResult ? 'Close' : 'Cancel'}
                            </button>
                            {!bulkResult && (
                                <button onClick={handleBulkUpload} disabled={!bulkFile || bulkLoading} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: bulkFile ? 'pointer' : 'not-allowed', opacity: !bulkFile || bulkLoading ? 0.6 : 1 }}>
                                    {bulkLoading ? 'Uploading...' : 'Upload'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductManagement;



