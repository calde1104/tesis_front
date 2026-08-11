import { getEmpresaId, getAuthToken, apiRequest } from './api';

export const getProfile = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/profile`);
    return data;
  } catch (error) {
    console.warn('Failed to fetch user profile:', error);
    return null;
  }
};

export const uploadProfilePhoto = async (file) => {
  const empresaId = getEmpresaId();
  const token = getAuthToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/v1/${empresaId}/profile/foto`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return res.json();
};

export const deleteProfilePhoto = async () => {
  const empresaId = getEmpresaId();
  const token = getAuthToken();

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/v1/${empresaId}/profile/foto`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error('Failed to delete photo');
  }
  return true;
};
