const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const getAuthToken = () => localStorage.getItem('token');

/**
 * Obtiene el empresaId autenticado dando máxima prioridad al token JWT activo
 * para evitar TenantMismatchException (HTTP 403) en Spring Boot.
 */
export const getEmpresaId = () => {
  const token = getAuthToken();
  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(decodedJson);
      if (payload && payload.empresaId) {
        localStorage.setItem('empresaId', payload.empresaId);
        return payload.empresaId;
      }
    } catch (e) {
      console.warn('Failed to parse empresaId from JWT token:', e);
    }
  }

  const storedId = localStorage.getItem('empresaId');
  if (storedId) return storedId;

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u.empresaId) return u.empresaId;
      if (u.empresa && u.empresa.id) return u.empresa.id;
    } catch (e) {}
  }

  return '1';
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
      sessionStorage.clear();
    }
    let errorMessage = `Error HTTP ${response.status} (${response.statusText})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore if not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};
