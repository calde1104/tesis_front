import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { login } from '../../services/auth';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Debes aceptar el acuerdo y la privacidad.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await login(username, password);
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
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: false, zIndex: 0 },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "grab",
              },
              resize: true,
            },
            modes: {
              grab: {
                distance: 200,
                links: { opacity: 0.6 },
              },
            },
          },
          particles: {
            color: { value: "#2563eb" },
            links: {
              color: "#60a5fa",
              distance: 180,
              enable: true,
              opacity: 0.4,
              width: 1.5,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 1.2,
              straight: false,
            },
            number: {
              density: { enable: true, area: 800 },
              value: 50,
            },
            opacity: { value: 0.6 },
            shape: { type: "circle" },
            size: { value: { min: 1.5, max: 4 } },
          },
          detectRetina: true,
        }}
        className="particles-canvas"
      />

      <div className="bg-graphics">
        <div className="bg-grid"></div>
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

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. 15602226456"
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
