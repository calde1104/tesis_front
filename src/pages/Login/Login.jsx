import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckSquare, Square, X, Shield, FileText, Check } from 'lucide-react';
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
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null
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
                <span>
                  He leído y acepto el{' '}
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
                  y{' '}
                  <a
                    href="#privacy"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveModal('privacy');
                    }}
                  >
                    Privacidad
                  </a>
                </span>
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

      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 100%)',
            border: activeModal === 'terms' ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(52, 211, 153, 0.35)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: activeModal === 'terms'
              ? '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)'
              : '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(52, 211, 153, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              background: activeModal === 'terms' ? 'rgba(14, 165, 233, 0.05)' : 'rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {activeModal === 'terms' ? (
                  <FileText size={22} style={{ color: '#38bdf8' }} />
                ) : (
                  <Shield size={22} style={{ color: '#34d399' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                    {activeModal === 'terms' ? 'Acuerdo de Usuario y Términos de Servicio B2B' : 'Política de Privacidad y Protección de Datos'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {activeModal === 'terms' ? 'Plataforma Predictiva de Inteligencia Comercial' : 'Garantía de Confidencialidad y Seguridad Empresarial'}
                  </span>
                </div>
              </div>
            </div>

            <div className="custom-scrollbar" style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              color: '#cbd5e1',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {activeModal === 'terms' ? (
                <>
                  <div style={{ background: 'rgba(56, 189, 248, 0.06)', borderLeft: '3px solid #38bdf8', padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0', fontSize: '0.8rem', color: '#e2e8f0' }}>
                    <strong>Marco Institucional del Sistema:</strong> Documento legal y técnico basado en la especificación del Proyecto Final de Ingeniería (UADE 2026, Autores: Calderón, Felipe & Crespo, Edgardo).
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>1. Licencia B2B de Inteligencia Predictiva (DaaS)</h4>
                    <p style={{ margin: 0 }}>
                      Se concede a la organización cliente una licencia corporativa no exclusiva para operar la Plataforma de Inteligencia Predictiva B2B. El servicio permite consultar dashboards de cuota de mercado (Market Share / SOM), Share of Assortment (SOA), competitividad de precios (Price Gap) y pronóstico de demanda de volumen transaccionado.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>2. Integridad e Inmutabilidad de Ingesta (SHA-256)</h4>
                    <p style={{ margin: 0 }}>
                      Los lotes de datos transaccionales procesados en la plataforma (histórico 2021-2025) son auditados mediante protocolos criptográficos de hashing SHA-256. Esto garantiza la trazabilidad, inmutabilidad y autenticidad del historial de ventas de su empresa frente a alteraciones no autorizadas.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>3. Propiedad de Algoritmos y Torneo de Modelos</h4>
                    <p style={{ margin: 0 }}>
                      Los motores de Machine Learning (Torneo Champion/Challenger con algoritmos SARIMAX, XGBoost, Prophet y Clustering no supervisado K-Medoids / Gower Distance) constituyen propiedad intelectual protegida. Su objetivo técnico es lograr un MAPE &lt; 20% garantizando explicabilidad algorítmica.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>4. Evaluación Holística y Alcance de las Proyecciones</h4>
                    <p style={{ margin: 0 }}>
                      El motor predictivo analiza el universo completo de datos del mercado para modelar escenarios competitivos precisos. Las inferencias de demanda y Cold Start sirven como soporte cuantitativo para optimizar inventarios y prevenir quiebres de stock en el sector retail.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(52, 211, 153, 0.06)', borderLeft: '3px solid #34d399', padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0', fontSize: '0.8rem', color: '#e2e8f0' }}>
                    <strong>Garantía de Confidencialidad Empresarial:</strong> Arquitectura diseñada para resguardar la privacidad transaccional de marcas y distribuidoras.
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>1. Aislamiento Multi-inquilino (Multi-tenant)</h4>
                    <p style={{ margin: 0 }}>
                      La arquitectura de datos implementa un estricto control de acceso basado en roles y aislamiento de datos por identificador de inquilino (<code>empresaId</code>). Sus registros de ventas, precios y catálogos de SKUs se mantienen 100% aislados de otros competidores de la plataforma.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>2. Encriptación y Conexión Segura con Variables Exógenas</h4>
                    <p style={{ margin: 0 }}>
                      Toda transmisión de información utiliza protocolos TLS 1.3 y cifrado en reposo AES-256. La integración automatizada de datos de contexto macroeconómico y climatológico (Open-Meteo, Banco Mundial, FMI) se ejecuta en un sandbox analítico sin exponer datos privados.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>3. Confidencialidad de Auditoría de Mercado (Store Audit / Selling & Sellout)</h4>
                    <p style={{ margin: 0 }}>
                      Los volúmenes transaccionados en canales de venta se consolidan exclusivamente para generar indicadores macro de cuota de mercado. Bajo ninguna circunstancia sus cifras unitarias de facturación serán vendidas, transferidas o expuestas de forma individual a terceros.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 0.4rem 0', fontSize: '0.92rem', fontWeight: '700' }}>4. Titularidad y Derechos sobre la Información Transaccional</h4>
                    <p style={{ margin: 0 }}>
                      Su empresa conserva la titularidad inalienable sobre sus archivos procesados y su historial transaccional. Puede solicitar reportes de auditoría de integridad, exportación de datasets y la eliminación total de sus registros al finalizar el contrato de servicio.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justify: 'flex-end',
              background: 'rgba(15, 23, 42, 0.6)'
            }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  padding: '0.55rem 1.3rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  background: activeModal === 'terms'
                    ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                    : 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  boxShadow: activeModal === 'terms'
                    ? '0 4px 14px rgba(56, 189, 248, 0.25)'
                    : '0 4px 14px rgba(52, 211, 153, 0.25)'
                }}
              >
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
