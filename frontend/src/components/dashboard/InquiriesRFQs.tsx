import React, { useState, useEffect } from 'react';
import MyRFQs from './MyRFQs';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getImgUrl } from '@/utils/imageConfig';

interface Inquiry {
    _id: string;
    product: {
        _id: string;
        name: string;
        main_image: string;
        slug?: string;
    };
    subject: string;
    buyer: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
        country_code?: string;
    };
    supplier: {
        _id: string;
        first_name: string;
        last_name: string;
        company_name?: string;
        country_code?: string;
    };
    status: string;
    createdAt: string;
}

const InquiriesRFQs = () => {
    const { user } = useAuth();
    const navigate = useRouter();
    const [activeTab, setActiveTab] = useState('inquiries');
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All Inquiries');

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/inquiries');
            setInquiries(data);
        } catch (err) {
            console.error('Failed to fetch inquiries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'inquiries') {
            fetchInquiries();
        }
    }, [activeTab]);

    const filteredInquiries = inquiries.filter(inq => {
        const matchesSearch = 
            inq.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inq.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
            filterStatus === 'All Inquiries' || 
            inq.status?.toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
        try {
            await api.delete(`/inquiries/${id}`);
            fetchInquiries();
        } catch (err) {
            console.error('Failed to delete inquiry:', err);
        }
    };

    return (
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                <button
                    onClick={() => setActiveTab('inquiries')}
                    style={{ padding: '12px 24px', border: 'none', background: activeTab === 'inquiries' ? '#fff' : 'transparent', borderTop: activeTab === 'inquiries' ? '2px solid var(--primary-color)' : '2px solid transparent', fontSize: '14px', fontWeight: activeTab === 'inquiries' ? 'bold' : 'normal', color: activeTab === 'inquiries' ? 'var(--primary-color)' : '#666', cursor: 'pointer' }}
                >
                    My Inquiries
                </button>
                <button
                    onClick={() => setActiveTab('rfqs')}
                    style={{ padding: '12px 24px', border: 'none', background: activeTab === 'rfqs' ? '#fff' : 'transparent', borderTop: activeTab === 'rfqs' ? '2px solid var(--primary-color)' : '2px solid transparent', fontSize: '14px', fontWeight: activeTab === 'rfqs' ? 'bold' : 'normal', color: activeTab === 'rfqs' ? 'var(--primary-color)' : '#666', cursor: 'pointer' }}
                >
                    My RFQs
                </button>
            </div>

            {activeTab === 'inquiries' ? (
                <>
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: '1px solid #eee', gap: '12px' }}>
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '6px 12px', border: '1px solid #333', borderRadius: '16px', fontSize: '12px', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            <option value="All Inquiries">All Inquiries</option>
                            <option value="Pending">Pending</option>
                            <option value="Replied">Replied</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="Search" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: '6px 32px 6px 12px', border: '1px solid #ccc', borderRadius: '16px', fontSize: '12px', width: '200px' }} 
                            />
                            <svg style={{ position: 'absolute', right: '10px', top: '8px', color: '#999' }} width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                    {loading ? (
                        <div style={{ padding: '100px', textAlign: 'center', color: '#666' }}>Loading inquiries...</div>
                    ) : filteredInquiries.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', color: '#666', fontSize: '13px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📩</div>
                            {searchTerm || filterStatus !== 'All Inquiries' ? "No inquiries match your filters." : ((user?.roles?.includes('supplier') || user?.role === 'supplier') ? "You haven't received any inquiries yet." : "You haven't sent any inquiries yet.")}
                        </div>
                    ) : (
                        <div style={{ padding: '0', overflowX: 'auto', width: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                                <thead style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '40px' }}><input type="checkbox" /></th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Product</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>{(user?.roles?.includes('supplier') || user?.role === 'supplier') ? 'Buyer' : 'Supplier'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInquiries.map((inq) => (
                                        <tr key={inq._id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fcfdfe'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '15px 16px' }}><input type="checkbox" /></td>
                                            <td style={{ padding: '15px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <img
                                                        src={getImgUrl(inq.product?.main_image)}
                                                        alt={inq.product?.name}
                                                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #eee' }}
                                                    />
                                                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                                        {inq.product?.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 16px', color: '#1a1a1a' }}>{inq.subject}</td>
                                            <td style={{ padding: '15px 16px' }}>
                                                <div style={{ fontWeight: '600' }}>
                                                    {(user?.roles?.includes('supplier') || user?.role === 'supplier') ? inq.buyer?.company_name || `${inq.buyer?.first_name} ${inq.buyer?.last_name}` : inq.supplier?.company_name || `${inq.supplier?.first_name} ${inq.supplier?.last_name}`}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#999' }}>{(user?.roles?.includes('supplier') || user?.role === 'supplier') ? inq.buyer?.country_code : inq.supplier?.country_code}</div>
                                            </td>
                                            <td style={{ padding: '15px 16px', color: '#666' }}>{new Date(inq.createdAt).toLocaleDateString()}</td>
                                            <td style={{ padding: '15px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    background: inq.status === 'pending' ? '#fff7ed' : inq.status === 'closed' ? '#f3f4f6' : '#f0fdf4',
                                                    color: inq.status === 'pending' ? '#c2410c' : inq.status === 'closed' ? '#374151' : '#15803d',
                                                    border: inq.status === 'pending' ? '1px solid #fdba74' : inq.status === 'closed' ? '1px solid #d1d5db' : '1px solid #86efac'
                                                }}>
                                                    {inq.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        const otherId = (user?.roles?.includes('supplier') || user?.role === 'supplier') ? inq.buyer?._id : inq.supplier?._id;
                                                        navigate.push(`/dashboard/messages?userId=${otherId}`);
                                                    }}
                                                    style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                >
                                                    View Chat
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ padding: '20px' }}>
                    <MyRFQs />
                </div>
            )}
        </div>
    );
};

export default InquiriesRFQs;
