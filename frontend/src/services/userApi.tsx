import api from './axiosConfig';

export const getWishlist = () => {
    return api.get('/auth/wishlist');
};

export const toggleWishlist = (productId: any) => {
    return api.post(`/wishlist/toggle/${productId}`);
};

export const getAdminStats = () => {
    return api.get('/auth/stats');
};
