import api from './axiosConfig';

export const postRFQ = (rfqData: any) => api.post('/rfq', rfqData);
export const getRFQs = (params: any) => api.get('/rfq', { params });
export const getMyRFQs = () => api.get('/rfq/my-rfqs');
export const getRFQById = (id: any) => api.get(`/rfq/${id}`);
export const submitQuote = (rfqId: any, quoteData: any) => api.post(`/rfq/${rfqId}/quote`, quoteData);
export const getRFQQuotes = (rfqId: any) => api.get(`/rfq/${rfqId}/quotes`);
