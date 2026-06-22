import { apiClient } from './client';

export const adminCustomerKeys = {
  root: ['admin-customers'],
};

export const importCustomersWorkbook = async ({ file, dryRun = true }) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/admin/customers/import?dryRun=${dryRun ? 'true' : 'false'}`, {
    body: formData,
  });
  return data;
};

export const exportCustomersCsv = async () => {
  const { data } = await apiClient.get('/admin/customers/export', { responseType: 'blob' });
  return data;
};
