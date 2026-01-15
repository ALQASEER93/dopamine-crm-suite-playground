import { apiClient } from './client';

export const getLatestLocations = async () => {
  const { data } = await apiClient.get('/telemetry/location/latest');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const getLocationTrail = async (repId, limit = 25) => {
  if (!repId) return [];
  const { data } = await apiClient.get(`/telemetry/location/trail?rep_id=${repId}&limit=${limit}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
