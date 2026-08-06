import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckSquare, Square, Shield, FileText, Lock, Mail, ArrowRight } from 'lucide-react';
import { login } from '../../services/auth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Debes aceptar los términos y políticas para continuar.');
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

  React.useEffect(() => {
    const canvas = document.getElementById('login-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const nodesCount = 35;
    const nodes = Array.from({ length: nodesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.5 + 1
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="login-wrapper">
      
      <canvas id="login-canvas" className="login-canvas"></canvas>
      <div className="bg-spotlight"></div>
      <div className="bg-grid"></div>

      <div className="login-box">
        
        <div className="login-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
            <svg className="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
              <defs>
                <linearGradient id="logoGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <filter id="logoGlowLogin" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#38bdf8" floodOpacity="0.4" />
                </filter>
              </defs>
              <path 
                d="M16 3L27 9.35V22.65L16 29L5 22.65V9.35L16 3Z" 
                stroke="url(#logoGradLogin)" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill="rgba(56, 189, 248, 0.05)"
              />
              <path 
                d="M15.5 8V24 M15.5 8H20C22.5 8, 22.5 16, 20 16H15.5 M15.5 16H20C22.5 16, 22.5 24, 20 24H15.5" 
                stroke="#38bdf8" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M9.5 8V24 M9.5 8H14.5C17.5 8, 17.5 16, 14.5 16H9.5" 
                stroke="#ffffff" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                filter="url(#logoGlowLogin)"
              />
            </svg>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Predictive <span style={{ color: '#38bdf8' }}>B2B</span>
            </h1>
          </div>
          <p className="brand-subtitle">Plataforma de Simulación & Gestión de Demanda</p>
        </div>

        <div className="login-card">
          
          <div className="card-heading">
            <h2>Iniciar Sesión</h2>
            <p>Ingresá tus credenciales corporativas para acceder al sistema.</p>
          </div>

          {error && (
            <div className="login-error-alert">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            
            <div className="form-field">
              <label htmlFor="email">Correo Electrónico</label>
              <div className="input-control">
                <Mail size={16} className="field-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password">Contraseña</label>
              <div className="input-control">
                <Lock size={16} className="field-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button 
                  type="button" 
                  className="toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-checkbox" onClick={() => setAgreed(!agreed)}>
              {agreed ? (
                <CheckSquare size={16} className="check-icon active" />
              ) : (
                <Square size={16} className="check-icon" />
              )}
              <span>
                Acepto el{' '}
                <a
                  href="#terms"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveModal('terms');
                  }}
                >
                  Acuerdo de Usuario
                </a>{' '}
                y la{' '}
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveModal('privacy');
                  }}
                >
                  Política de Privacidad
                </a>
              </span>
            </div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-state">Iniciando sesión...</span>
              ) : (
                <>
                  Ingresar a la Plataforma
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {activeModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-box">
                {activeModal === 'terms' ? <FileText size={20} className="modal-icon text-sky" /> : <Shield size={20} className="modal-icon text-emerald" />}
                <div>
                  <h3>{activeModal === 'terms' ? 'Acuerdo de Usuario y Términos de Servicio B2B' : 'Política de Privacidad y Protección de Datos'}</h3>
                  <p>Proyecto Final de Ingeniería — UADE 2026 (Calderón, Felipe & Crespo, Edgardo)</p>
                </div>
              </div>
            </div>

            <div className="modal-body custom-scrollbar">
              {activeModal === 'terms' ? (
                <>
                  <div className="modal-callout callout-sky">
                    <strong>Marco Institucional del Sistema:</strong> Especificación oficial del sistema de soporte a decisiones predictivas.
                  </div>
                  <div>
                    <h4>1. Licencia B2B de Inteligencia Predictiva (DaaS)</h4>
                    <p>Se concede a la organización cliente una licencia corporativa no exclusiva para operar la Plataforma de Inteligencia Predictiva B2B. El servicio permite consultar dashboards de cuota de mercado (Market Share / SOM), Share of Assortment (SOA), competitividad de precios (Price Gap) y pronóstico de demanda de volumen transaccionado.</p>
                  </div>
                  <div>
                    <h4>2. Integridad e Inmutabilidad de Ingesta (SHA-256)</h4>
                    <p>Los lotes de datos transaccionales procesados en la plataforma (histórico 2021-2025) son auditados mediante protocolos criptográficos de hashing SHA-256. Esto garantiza la trazabilidad e inmutabilidad del historial de ventas frente a alteraciones no autorizadas.</p>
                  </div>
                  <div>
                    <h4>3. Propiedad de Algoritmos y Torneo de Modelos</h4>
                    <p>Los motores de Machine Learning (Torneo Champion/Challenger con algoritmos SARIMAX, XGBoost, Prophet y K-Medoids) constituyen propiedad intelectual protegida, orientados a lograr explicabilidad y alta precisión predictiva.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-callout callout-emerald">
                    <strong>Garantía de Confidencialidad Empresarial:</strong> Resguardo total de registros transaccionales por organización.
                  </div>
                  <div>
                    <h4>1. Aislamiento Multi-inquilino (Multi-tenant)</h4>
                    <p>La arquitectura de datos implementa un estricto control de acceso basado en roles y aislamiento de datos por identificador de inquilino (<code>empresaId</code>). Sus registros de ventas, precios y catálogos de SKUs se mantienen 100% aislados de otros competidores.</p>
                  </div>
                  <div>
                    <h4>2. Encriptación y Seguridad</h4>
                    <p>Toda transmisión de información utiliza protocolos TLS 1.3 y cifrado en reposo AES-256. La integración automatizada de datos de contexto macroeconómico y climatológico se ejecuta en un entorno aislado sin exponer datos privados.</p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
