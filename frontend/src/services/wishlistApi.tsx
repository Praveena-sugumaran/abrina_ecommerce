import api from './axiosConfig';

export const getWishlist = () => api.get('/wishlist');
export const addToWishlist = (productId: any) => api.post(`/wishlist/${productId}`);
export const removeFromWishlist = (productId: any) => api.delete(`/wishlist/${productId}`);
export const checkWishlist = (productId: any) => api.get(`/wishlist/check/${productId}`);
export const toggleWishlist = (productId: any) => api.post(`/wishlist/toggle/${productId}`);
