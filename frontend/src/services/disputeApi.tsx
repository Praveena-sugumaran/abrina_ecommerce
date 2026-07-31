import api from './axiosConfig';

export const openDispute = (disputeData: any) => api.post('/disputes', disputeData);
export const getMyDisputes = () => api.get('/disputes/my-disputes');
export const addDisputeMessage = (disputeId: any, message: any) => api.post(`/disputes/${disputeId}/message`, { message });
export const updateDisputeTracking = (disputeId: any, trackingData: any) => api.put(`/disputes/${disputeId}/tracking`, trackingData);
