import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';


const Partners = () => {
    const [partners, setPartners] = useState<any[]>([]);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { data } = await api.get('/common/partners');
                setPartners(data);
            } catch (err) {
                console.error('Error fetching partners:', err);
            }
        };
        fetchPartners();
    }, []);

    if (partners.length === 0) return null;

    return (
        <div className="partners-section container mt-16 mb-16 text-center">
            <p className="partners-title">PARTNERING WITH VISIONARIES</p>
            <div className="partners-grid d-flex justify-between align-center mt-8 gap-4 flex-wrap">
                {partners.map((partner, i) => (
                    <div key={i} className="partner-logo d-flex align-center gap-1 font-bold">
                        {partner.logo ? (
                            <div dangerouslySetInnerHTML={{ __html: partner.logo }} />
                        ) : partner.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Partners;



