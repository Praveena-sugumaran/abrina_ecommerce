import api from './axiosConfig';

export const createReview = (reviewData: any) => api.post('/reviews', reviewData);
export const getMyReviews = () => api.get('/reviews/my-reviews');
export const getProductReviews = (productId: any) => api.get(`/reviews/product/${productId}`);
