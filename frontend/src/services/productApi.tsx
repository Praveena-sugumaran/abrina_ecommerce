import api from './axiosConfig';

// Public
export const fetchProducts = (params: any) => api.get('/products', { params });
export const fetchProductById = (id: any) => api.get(`/products/${id}`);

// Supplier
export const fetchMyProducts = (params: any) => api.get('/products/my/products', { params });

export const createProduct = (formData: any) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const updateProduct = (id: any, formData: any) => api.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const bulkUploadProducts = (formData: any) => api.post('/products/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const deleteProduct = (id: any) => api.delete(`/products/${id}`);
export const toggleShowcase = (id: any) => api.put(`/products/${id}/toggle-showcase`);

// Admin
export const fetchAllProductsAdmin = (params: any) => api.get('/products/admin/all', { params });
export const exportProductsAdmin = () => api.get('/products/admin/export', { responseType: 'blob' });
export const approveProduct = (id: any) => api.put(`/products/${id}/approve`);
export const rejectProduct = (id: any, note: any) => api.put(`/products/${id}/reject`, { note });
