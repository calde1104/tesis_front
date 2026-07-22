import { apiRequest } from './api';

export const login = async (email, password) => {
  const data = await apiRequest('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data && data.token) {
    localStorage.setItem('token', data.token);
    if (data.empresa) {
      localStorage.setItem('empresaId', data.empresa.id);
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

export const logout = async () => {
  try {
    await apiRequest('/v1/auth/logout', {
      method: 'POST'
    });
  } finally {
    localStorage.clear();
  }
};
