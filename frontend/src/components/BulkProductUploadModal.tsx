'use client';

import React, { useState } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';

interface BulkProductUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkProductUploadModal({ isOpen, onClose, onSuccess }: BulkProductUploadModalProps) {
    const { showToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('Please select a CSV or Excel file to upload.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const { data } = await api.post('/products/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                showToast(`Successfully imported ${data.importedCount} products!`, 'success');
                setResult(data);
                onSuccess();
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Bulk upload failed.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const downloadSampleCsv = () => {
        const sampleContent = 'name,price,stock,sku,description,category_id\nSample Wireless Earbuds,49.99,50,SKU-EARBUDS-01,High quality bluetooth earbuds,\nIndustrial Hydraulic Pump,499.00,10,SKU-PUMP-99,Heavy duty pump,';
        const blob = new Blob([sampleContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_products_import.csv';
        a.click();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>📥 Bulk Product CSV / Excel Upload</h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong>Template Guide:</strong> Upload CSV with <code>name</code>, <code>price</code>, <code>stock</code>, and <code>sku</code> headers.
                    </div>
                    <button onClick={downloadSampleCsv} style={{ background: '#ffffff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ⇩ Sample CSV
                    </button>
                </div>

                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', background: '#f8fafc', marginBottom: '20px' }}>
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} id="csv-file-input" style={{ display: 'none' }} />
                    <label htmlFor="csv-file-input" style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            {file ? file.name : 'Click or Drag CSV/Excel file to Upload'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Supports .csv, .xls, and .xlsx formats</div>
                    </label>
                </div>

                {result && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '14px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px' }}>
                        ✅ Imported <strong>{result.importedCount}</strong> products successfully!
                        {result.errorsCount > 0 && <div style={{ color: '#dc2626', marginTop: '4px' }}>⚠️ {result.errorsCount} rows skipped due to errors.</div>}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleUpload} disabled={uploading || !file} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', opacity: uploading || !file ? 0.6 : 1 }}>
                        {uploading ? 'Importing...' : 'Upload & Process'}
                    </button>
                </div>
            </div>
        </div>
    );
}
