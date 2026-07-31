import api from './axiosConfig';

export const fetchCategories = (params?: any) => api.get('/categories', { params });
export const createCategory = (categoryData: any) => api.post('/categories', categoryData);
export const updateCategory = (id: string, categoryData: any) => api.put(`/categories/${id}`, categoryData);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);
