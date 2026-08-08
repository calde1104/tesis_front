import { apiRequest } from './api';

export const login = async (email, password) => {
  const data = await apiRequest('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data && data.token) {
    localStorage.setItem('token', data.token);
    if (email) {
      localStorage.setItem('userEmail', email);
    }
    if (data.empresaId) {
      localStorage.setItem('empresaId', data.empresaId);
    }
    if (data.empresa) {
      localStorage.setItem('empresaId', data.empresa.id || data.empresaId);
      localStorage.setItem('empresaNombre', data.empresa.nombre);
    }
    if (data.usuarioId) {
      localStorage.setItem('usuarioId', data.usuarioId);
    }
    if (data.rol) {
      localStorage.setItem('rol', data.rol);
    }
  }
  return data;
};

import { clearSalesFiltersCache } from './sales';
import { clearMarketShareCache } from './marketShare';

export const logout = async () => {
  try {
    await apiRequest('/v1/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.warn('Logout endpoint error (continuing local cleanup):', error);
  } finally {
    clearSalesFiltersCache();
    clearMarketShareCache();
    
    const preservedSettings = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('product_thresholds')) {
        preservedSettings[key] = localStorage.getItem(key);
      }
    }

    localStorage.clear();
    sessionStorage.clear();

    Object.entries(preservedSettings).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });
  }
};

