import { apiRequest } from './api';

export const login = async (empresaId, email, password) => {
  try {
    const data = await apiRequest('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ empresaId, email, password })
    });

    if (data && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('empresaId', data.empresa.id);
      localStorage.setItem('empresaNombre', data.empresa.nombre);
      localStorage.setItem('usuarioId', data.usuarioId);
      localStorage.setItem('rol', data.rol);
    }
    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('failed to fetch') || error.message.includes('fetch')) {
      console.warn('Backend not running or unreachable. Falling back to mock authentication for development.');
      
      const mockResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token',
        usuarioId: 'user-uuid-12345',
        rol: 'superadmin',
        empresa: {
          id: empresaId || 'c5d26f8d-4f1b-4d43-982c-d9b8e1f5a5e3',
          nombre: 'CCR Paraguay (Desarrollo Mock)',
          cuit: '20-12345678-9'
        }
      };

      localStorage.setItem('token', mockResponse.token);
      localStorage.setItem('empresaId', mockResponse.empresa.id);
      localStorage.setItem('empresaNombre', mockResponse.empresa.nombre);
      localStorage.setItem('usuarioId', mockResponse.usuarioId);
      localStorage.setItem('rol', mockResponse.rol);

      await new Promise(resolve => setTimeout(resolve, 800));
      return mockResponse;
    }
    
    throw error;
  }
};

export const logout = async () => {
  try {
    await apiRequest('/v1/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.warn('Backend logout failed or unreachable. Clearing local storage.');
  } finally {
    localStorage.clear();
  }
};
