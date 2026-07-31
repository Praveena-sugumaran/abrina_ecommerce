import api from './axiosConfig';

export const getCompanyProfile = () => api.get('/company/profile');
export const updateCompanyProfile = (data: any) => api.post('/company/profile', data);
export const getSupplierCompanyProfile = (supplierId: any) => api.get(`/company/supplier/${supplierId}`);
export const getSupplierProducts = (supplierId: any) => api.get(`/products?supplier=${supplierId}&limit=20`);
export const searchCompanies = (params: any) => api.get('/company/search', { params });
