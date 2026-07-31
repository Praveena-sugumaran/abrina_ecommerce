import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import styles from './AdminEmailTemplates.module.css';

interface EmailTemplate {
    _id: string;
    name: string;
    description: string;
    slug: string;
    subject: string;
    status: string;
}

const AdminEmailTemplates: React.FC = () => {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useRouter();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/email-templates');
            setTemplates(res.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
            setErrorMsg('Failed to fetch templates.');
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await api.delete(`/admin/email-templates/${id}`);
                showToast('Template deleted successfully', 'success');
                fetchTemplates();
            } catch (err) {
                showToast('Error occurred while deleting', 'error');
            }
        }
    };

    return (
        <div className={styles['aet-container']}>
            <div className={styles['aet-header']}>
                <div className={styles['aet-title-box']}>
                    <h1>Email Templates</h1>
                    <p>Manage all system transactional emails and their dynamic content.</p>
                </div>
                <button className={styles['aet-btn-add']} onClick={() => navigate.push('/admin/email-templates/add')}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Template
                </button>
            </div>

            {errorMsg && <div className={`${styles['aet-alert']} ${styles['error']}`}>{errorMsg}</div>}

            {loading ? (
                <div style={{
                    minHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    gap: '14px',
                    padding: '40px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid var(--primary-color, #ff6a00)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Loading templates...</span>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <div className={styles['aet-table-card']}>
                    <table className={styles['aet-table']}>
                        <thead>
                            <tr>
                                <th>Template Name</th>
                                <th>Slug</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t._id}>
                                    <td>
                                        <div className={styles['aet-template-name']}>{t.name}</div>
                                        <div className={styles['aet-template-desc']}>{t.description}</div>
                                    </td>

                                    <td><span className={styles['aet-template-slug']}>{t.slug}</span></td>
                                    <td>{t.subject}</td>
                                    <td>
                                        <span className={`${styles['aet-badge']} ${styles[t.status] || ''}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => navigate.push(`/admin/email-templates/edit/${t._id}`)} 
                                                className="admin-action-btn-edit" 
                                                title="Edit Template" 
                                                style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t._id)} 
                                                className="admin-action-btn-delete" 
                                                title="Delete Template" 
                                                style={{ padding: '8px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {templates.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No templates found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminEmailTemplates;
