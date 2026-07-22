import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import Spline from '@splinetool/react-spline';
import { login } from '../../services/auth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Debes aceptar el acuerdo y la privacidad.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await login(email, password);
      console.log('Login successful:', response);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="spline-bg">
        <Spline scene="https://prod.spline.design/tw1-qSQoYshZJjqD/scene.splinecode" />
      </div>

      <div className="login-container">
        
        <div className="branding-section">

          <div className="branding-logo">
            <span className="branding-prefix">EL FUTURO DE LA</span>
            <h1 className="branding-title">Inteligencia Predictiva</h1>
            <span className="branding-suffix">B2B</span>
          </div>
          
        </div>

        <div className="login-card-wrapper">
          <div className="login-card">
            <h2>Iniciar sesión</h2>
            <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico (ej. calderon@gmail.com)"
                  required
                />
              </div>

              <div className="form-group password-group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="form-terms" onClick={() => setAgreed(!agreed)}>
                {agreed ? (
                  <CheckSquare size={16} className="checkbox-icon checked" />
                ) : (
                  <Square size={16} className="checkbox-icon" />
                )}
                <span>He leído y acepto el <a href="#terms" onClick={e => e.stopPropagation()}>Acuerdo de Usuario</a> y <a href="#privacy" onClick={e => e.stopPropagation()}>Privacidad</a></span>
              </div>

              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
