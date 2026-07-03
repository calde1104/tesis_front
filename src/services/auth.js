export const login = async (username, password) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (username === 'admin' && password === '1234') {
    return {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token',
      user: {
        id: 'user-uuid',
        username: 'admin',
        role: 'superadmin',
        organization: 'CCR Paraguay'
      }
    };
  }
  
  throw new Error('Credenciales inválidas');
};
