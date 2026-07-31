import api from './axiosConfig';

export const createCheckoutSession = (orderData: any) => api.post('/orders/create-checkout-session', orderData);
export const verifySession = (sessionId: any) => api.post('/orders/verify-session', { sessionId });
export const verifyPayPal = (orderId: any) => api.post('/orders/verify-paypal', { orderId });
export const getMyOrders = () => api.get('/orders/my-orders');
export const getSupplierOrders = () => api.get('/orders/supplier-orders');
export const updateOrderStatus = (id: any, data: any) => api.put(`/orders/${id}/status`, data);
