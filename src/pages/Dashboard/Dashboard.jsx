import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Home, BarChart3, TrendingUp, UploadCloud, PieChart,
  Settings, LogOut, Bell, ChevronLeft, ChevronRight, AlertCircle, Sparkles, SlidersHorizontal, Server, LineChart,
  Building2, Shield, Copy, Check, X, Mail, CheckCircle2, Search, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getKPIs, getSalesEvolution, getMarketShareComposition, getContextVariables } from '../../services/dashboard';
import { getSystemInfo } from '../../services/settings';
import { logout } from '../../services/auth';
import { getProfile, uploadProfilePhoto, deleteProfilePhoto, deleteAccount } from '../../services/profile';
import { getNotificaciones, marcarNotificacionVista } from '../../services/notificaciones';
import { getSalesList } from '../../services/sales';
import CommandPalette from './CommandPalette';
import InicioSkeleton from './InicioSkeleton';
import { isMacPlatform } from '../../utils/platform';
import './Dashboard.css';

import InicioView from './views/InicioView';
import SalesView from './views/SalesView';
import ForecastView from './views/ForecastView';
import ColdStartView from './views/ColdStartView';
import IngestionView from './views/IngestionView';
import MarketView from './views/MarketView';
import SettingsView from './views/SettingsView';
import SettingsInfoView from './views/SettingsInfoView';

// Devuelve la referencia anterior si el contenido no cambio. Reemplazar el
// estado por datos identicos genera referencias nuevas que re-renderizan las
// vistas y congelan la animacion de recharts a mitad de camino (StrictMode
// duplica el fetch en dev, y volver a Inicio lo repite).
const keepIfEqual = (prev, next) =>
  JSON.stringify(prev) === JSON.stringify(next) ? prev : next;

const Dashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [marketShare, setMarketShare] = useState([]);
  const [contextVars, setContextVars] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [copiedTenant, setCopiedTenant] = useState(false);
  const [forecastSelectedSku, setForecastSelectedSku] = useState(null);
  const [forecastSkuRequestId, setForecastSkuRequestId] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [dashboardTargetDate, setDashboardTargetDate] = useState('');

  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const getRealUserEmail = () => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail && savedEmail.includes('@')) return savedEmail;

    if (companyDetails?.emailUsuario && companyDetails.emailUsuario.includes('@')) {
      return companyDetails.emailUsuario;
    }
    if (companyDetails?.email && companyDetails.email.includes('@')) {
      return companyDetails.email;
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodedJson);
        if (payload && payload.sub && payload.sub.includes('@')) return payload.sub;
      } catch {
        // Token ilegible: se usa el nombre de la empresa como respaldo.
      }
    }

    const empNombre = localStorage.getItem('empresaNombre') || 'empresa';
    const cleanEmp = empNombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `admin@${cleanEmp || 'empresa'}.com`;
  };

  // Abre la proyeccion de un SKU. El requestId permite reabrir el mismo SKU
  // dos veces seguidas y que ForecastView vuelva a reaccionar.
  const openProductForecast = useCallback((sku) => {
    if (!sku) return;
    setForecastSelectedSku(sku);
    setForecastSkuRequestId((id) => id + 1);
    setActiveTab('forecast');
  }, []);

  const handleOpenCompanyModal = async () => {
    setShowCompanyModal(true);
    if (!companyDetails) {
      setLoadingCompanyDetails(true);
      try {
        const sysInfo = await getSystemInfo();
        if (sysInfo) setCompanyDetails(sysInfo);
      } catch (e) {
        console.error("Error al cargar datos del perfil corporativo:", e);
      } finally {
        setLoadingCompanyDetails(false);
      }
    }
  };
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [productsMap, setProductsMap] = useState({});
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const monthNamesFull = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const fetchBackendNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await getNotificaciones(0, 50);
      if (res && res.content && Array.isArray(res.content)) {
        setNotifications(res.content);
      }
    } catch (e) {
      console.warn("Error al cargar notificaciones reales:", e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsViewed = async (notifId, productSku) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, estado: 'VISTA' } : n));
    marcarNotificacionVista(notifId);

    if (productSku) {
      openProductForecast(productSku);
    } else {
      setActiveTab('forecast');
    }
    setShowNotifications(false);
  };

  const activeNotificationsCount = notifications.filter(n => n.estado === 'ACTIVA').length;

  // --- Command Palette (Ctrl/Cmd + K) ---
  // productsMap indexa por id y por sku a la vez, asi que deduplicamos por sku.
  const paletteProducts = useMemo(() => {
    const seen = new Set();
    const list = [];
    Object.values(productsMap).forEach((prod) => {
      if (!prod?.sku || seen.has(prod.sku)) return;
      seen.add(prod.sku);
      list.push(prod);
    });
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  }, [productsMap]);

  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowPalette((open) => !open);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const closePalette = useCallback(() => setShowPalette(false), []);
  const handlePaletteNavigate = useCallback((tab) => setActiveTab(tab), []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const p = await getProfile();
        if (p) setProfile(p);
      } catch (e) {
        console.error("Error fetching user profile:", e);
      }
    };
    fetchUserProfile();

    const fetchData = async () => {
      try {
        const salesRes = await getSalesEvolution();
        const lastHistPoint = salesRes.filter(p => p.historical !== null && p.rawAnio && p.rawMes).pop();
        const targetAnio = lastHistPoint ? lastHistPoint.rawAnio : new Date().getFullYear();
        const targetMes = lastHistPoint ? lastHistPoint.rawMes : 12;

        if (lastHistPoint) {
          const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
          setDashboardTargetDate(`${monthNames[targetMes - 1]} ${targetAnio}`);
        } else {
          setDashboardTargetDate('');
        }

        const [kpiRes, marketRes, contextRes] = await Promise.all([
          getKPIs(targetAnio, targetMes),
          getMarketShareComposition(targetAnio, targetMes),
          getContextVariables(targetAnio, targetMes)
        ]);

        setKpis((prev) => keepIfEqual(prev, kpiRes));
        setSalesData((prev) => keepIfEqual(prev, salesRes));
        setMarketShare((prev) => keepIfEqual(prev, marketRes));
        setContextVars((prev) => keepIfEqual(prev, contextRes));
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'inicio') {
      fetchData();
    }

    const loadCatalogDictionary = async () => {
      try {
        const salesRes = await getSalesList({}, 1, 500);
        if (salesRes && salesRes.data) {
          const map = {};
          salesRes.data.forEach(item => {
            const id = item.id || item.id_producto || item.idProducto;
            const sku = item.sku;
            const entry = {
              sku: item.sku,
              name: item.name || item.descripcionProducto,
              category: item.category || item.categoriaNombre,
              brand: item.brand || item.marcaNombre
            };
            if (id) map[id] = entry;
            if (sku) map[sku] = entry;
          });
          setProductsMap(map);
        }
      } catch (e) {
        console.warn("Error cargando diccionario de productos para notificaciones:", e);
      }
    };
    loadCatalogDictionary();
    fetchBackendNotifications();
  }, [navigate, activeTab]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const OK = ["image/jpeg", "image/png", "image/webp"];
    if (!OK.includes(file.type)) return alert("Formato no permitido (JPG, PNG o WebP).");
    if (file.size > 2 * 1024 * 1024) return alert("La imagen supera los 2 MB.");
    
    try {
      setUploadingPhoto(true);
      const updatedProfile = await uploadProfilePhoto(file);
      setProfile(updatedProfile);
    } catch (err) {
      alert(err.message || "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setUploadingPhoto(true);
      await deleteProfilePhoto();
      setProfile(prev => ({ ...prev, foto: null }));
    } catch (err) {
      alert(err.message || "Error al borrar la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await deleteAccount();
      setShowDeleteAccountModal(false);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      alert(err.message || "Error al dar de baja la cuenta");
      setDeletingAccount(false);
    }
  };

  const formatCurrency = useCallback((value) => {
    if (value === null || value === undefined || isNaN(value)) return '₲ 0';
    return `₲ ${Math.round(Number(value)).toLocaleString('es-PY')}`;
  }, []);


  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    const companyName = localStorage.getItem('empresaNombre') || 'Empresa';
    if (hour < 12) return `Buen día, ${companyName}`;
    if (hour < 20) return `Buenas tardes, ${companyName}`;
    return `Buenas noches, ${companyName}`;
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'inicio': return getDynamicGreeting();
      case 'sales': return "Historial Comercial de Ventas";
      case 'forecast': return "Predicciones & Simulador de Escenarios";
      case 'cold-start': return "Asistente Predictivo de Pre-lanzamiento";
      case 'ingestion': return "Pipeline de Ingesta de Datos";
      case 'market': return "Monitoreo de Share & Competencia";
      case 'settings': return "Umbrales de Demanda por SKU";
      case 'settings-info': return "Información & Estado del Sistema";
      default: return getDynamicGreeting();
    }
  };

  const getHeaderSubtitle = () => {
    switch(activeTab) {
      case 'inicio': return `Resumen predictivo y estado de la demanda comercial (basado en datos de ${dashboardTargetDate || 'último mes cargado'}).`;
      case 'sales': return "Consulta el histórico de transacciones facturadas por SKU.";
      case 'forecast': return "Proyecciones de demanda a 12 meses y simulaciones de contexto.";
      case 'cold-start': return "Inferencia de demanda inicial para nuevos SKUs mediante búsqueda jerárquica por similitud de atributos.";
      case 'ingestion': return "Carga de archivos de ventas, validación de formato y control de historial.";
      case 'market': return "Análisis de cuota de mercado y posicionamiento competitivo.";
      case 'settings': return "Configuración de límites de demanda máxima esperada por producto.";
      case 'settings-info': return "Metadatos de la organización, especificaciones del modelo ML y estado de la plataforma.";
      default: return `Resumen predictivo y estado de la demanda comercial (basado en datos de ${dashboardTargetDate || 'último mes cargado'}).`;
    }
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(localStorage.getItem('empresaNombre') || 'Analista B2B')}&background=0D8ABC&color=fff`;
  const avatarSrc = profile?.foto ?? defaultAvatar;

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
      
      <div className="sidebar-logo">
        <svg className="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#38bdf8" floodOpacity="0.4" />
            </filter>
          </defs>
          <path 
            d="M16 3L27 9.35V22.65L16 29L5 22.65V9.35L16 3Z" 
            stroke="url(#logoGrad)" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="rgba(56, 189, 248, 0.03)"
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
            filter="url(#logoGlow)"
          />
        </svg>
        <span className="logo-text">Predictive B2B</span>
      </div>

      <header className="dashboard-header">
        <div className="header-greeting">
          <h1>{getHeaderTitle()}</h1>
          <p>{getHeaderSubtitle()}</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="cmdk-trigger"
            onClick={() => setShowPalette(true)}
            title="Buscar productos, vistas y acciones"
          >
            <Search size={18} />
            <span className="cmdk-trigger-label">Buscar</span>
            <span className="cmdk-trigger-keys">
              <kbd className="cmdk-kbd">{isMacPlatform() ? '⌘' : 'Ctrl'}</kbd>
              <kbd className="cmdk-kbd">K</kbd>
            </span>
          </button>

          <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  fetchBackendNotifications();
                }
              }}
              style={{ position: 'relative' }}
              title="Notificaciones y Alertas"
            >
              <Bell size={20} />
              {activeNotificationsCount > 0 && (
                <span className="notification-badge" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0b0f19'
                }}>
                  {activeNotificationsCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown" style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                width: '360px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
                zIndex: 1000,
                padding: '0.75rem 0',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '0 1.1rem 0.65rem 1.1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Bell size={15} style={{ color: '#38bdf8' }} />
                    <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#f1f5f9', fontWeight: '700' }}>Notificaciones</h4>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    background: activeNotificationsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeNotificationsCount > 0 ? '#ef4444' : '#94a3b8',
                    border: `1px solid ${activeNotificationsCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '10px'
                  }}>
                    {activeNotificationsCount} {activeNotificationsCount === 1 ? 'no leída' : 'no leídas'}
                  </span>
                </div>

                <div className="custom-scrollbar" style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.25rem 0' }}>
                  {loadingNotifications ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Cargando notificaciones...
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map(n => {
                      const prodInfo = productsMap[n.productoId] || {};
                      const prodName = prodInfo.name || 'Producto';
                      const prodSku = prodInfo.sku || '';

                      let payload = {};
                      try {
                        payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : (n.payload || {});
                      } catch {
                        payload = {};
                      }

                      const units = payload.unidadesPredichas ? Math.round(payload.unidadesPredichas) : null;
                      const threshold = payload.umbralDemandaMaxima ? Math.round(payload.umbralDemandaMaxima) : null;
                      const mesName = payload.mes ? monthNamesFull[payload.mes - 1] : '';
                      const anio = payload.anio || '';

                      const isUnread = n.estado === 'ACTIVA';

                      return (
                        <div 
                          key={n.id} 
                          style={{
                            padding: '0.8rem 1.15rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            background: isUnread ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                          }}
                          className="notification-item"
                          onClick={() => handleMarkAsViewed(n.id, prodSku || n.productoId)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              {isUnread && (
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                                  flexShrink: 0
                                }} />
                              )}
                              <span style={{ fontWeight: '600', fontSize: '0.82rem', color: isUnread ? '#f8fafc' : '#94a3b8' }}>
                                {prodName}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {n.fechaGeneracion ? new Date(n.fechaGeneracion).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' }) : ''}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.76rem', color: isUnread ? '#cbd5e1' : '#64748b', lineHeight: '1.4' }}>
                            {units && threshold ? (
                              <>
                                Pronóstico de <strong style={{ color: isUnread ? '#38bdf8' : '#94a3b8' }}>{units.toLocaleString('es-PY')} un.</strong> supera el límite de <strong style={{ color: isUnread ? '#f1f5f9' : '#94a3b8' }}>{threshold.toLocaleString('es-PY')} un.</strong> para {mesName} {anio}.
                              </>
                            ) : (
                              'La demanda proyectada por la IA superó el límite de unidades fijado.'
                            )}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={24} style={{ color: '#38bdf8', opacity: 0.6 }} />
                      <div style={{ fontWeight: '600', color: '#94a3b8' }}>Sin notificaciones pendientes</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Todos los productos se encuentran dentro de los rangos previstos.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="sidebar-wrapper">
        <div className="sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'inicio' ? 'active' : ''}`}
              onClick={() => setActiveTab('inicio')}
            >
              <Home size={22} className="nav-icon" fill={activeTab === 'inicio' ? 'currentColor' : 'none'} fillOpacity={0.15} />
              <span className="nav-label">Inicio</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <BarChart3 size={22} className="nav-icon" fill={activeTab === 'sales' ? 'currentColor' : 'none'} fillOpacity={0.15} />
              <span className="nav-label">Ventas</span>
            </button>
            <div className="nav-group" style={{ width: '100%' }}>
              <button 
                className={`nav-item ${(activeTab === 'forecast' || activeTab === 'cold-start') ? 'active' : ''}`}
                onClick={() => setActiveTab('forecast')}
                style={{ position: 'relative' }}
              >
                <TrendingUp size={22} className="nav-icon" />
                <span className="nav-label">Proyecciones</span>
              </button>
              
              {(activeTab === 'forecast' || activeTab === 'cold-start') && (
                <div className="sub-nav-list">
                  <button
                    className={`sub-nav-item ${activeTab === 'forecast' ? 'active' : ''}`}
                    onClick={() => setActiveTab('forecast')}
                    title="Predicciones & Simulaciones"
                  >
                    <span className="sub-nav-dash" style={{ color: activeTab === 'forecast' ? '#38bdf8' : '#64748b' }}>-</span>
                    <LineChart size={16} className="sub-nav-icon" />
                    <span className="sub-nav-label">Simulador de Demanda</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeTab === 'cold-start' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cold-start')}
                    title="Pre-lanzamiento"
                  >
                    <span className="sub-nav-dash" style={{ color: activeTab === 'cold-start' ? '#38bdf8' : '#64748b' }}>-</span>
                    <Sparkles size={16} className="sub-nav-icon" />
                    <span className="sub-nav-label">Pre-lanzamiento</span>
                  </button>
                </div>
              )}
            </div>
            <button 
              className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTab('market')}
            >
              <PieChart size={22} className="nav-icon" fill={activeTab === 'market' ? 'currentColor' : 'none'} fillOpacity={0.15} />
              <span className="nav-label">Mercado</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'ingestion' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingestion')}
            >
              <UploadCloud size={22} className="nav-icon" fill={activeTab === 'ingestion' ? 'currentColor' : 'none'} fillOpacity={0.15} />
              <span className="nav-label">Ingesta de Datos</span>
            </button>
          </nav>
          
          <div className="sidebar-bottom">
            <div className="nav-group" style={{ width: '100%' }}>
              <button 
                className={`nav-item ${(activeTab === 'settings' || activeTab === 'settings-info') ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={22} className="nav-icon" fill={(activeTab === 'settings' || activeTab === 'settings-info') ? 'currentColor' : 'none'} fillOpacity={0.15} />
                <span className="nav-label">Configuración</span>
              </button>

              {(activeTab === 'settings' || activeTab === 'settings-info') && (
                <div className="sub-nav-list">
                  <button
                    className={`sub-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                    title="Umbrales por SKU"
                  >
                    <span className="sub-nav-dash" style={{ color: activeTab === 'settings' ? '#38bdf8' : '#64748b' }}>-</span>
                    <SlidersHorizontal size={16} className="sub-nav-icon" />
                    <span className="sub-nav-label">Umbrales por SKU</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeTab === 'settings-info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings-info')}
                    title="Información del Sistema"
                  >
                    <span className="sub-nav-dash" style={{ color: activeTab === 'settings-info' ? '#38bdf8' : '#64748b' }}>-</span>
                    <Server size={16} className="sub-nav-icon" />
                    <span className="sub-nav-label">Información del Sistema</span>
                  </button>
                </div>
              )}
            </div>
            <button className="nav-item logout-btn" onClick={handleLogout}>
              <LogOut size={22} className="nav-icon" />
              <span className="nav-label">Cerrar Sesión</span>
            </button>
            <div 
              className="user-profile-nav"
              onClick={handleOpenCompanyModal}
              title="Ver perfil corporativo e información de la empresa"
            >
              <div className="user-avatar">
                <img src={avatarSrc} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div className="user-info-nav">
                <span className="user-name">{localStorage.getItem('empresaNombre') || 'Analista B2B'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          className="sidebar-toggle-edge"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Alternar Menú"
        >
          {isSidebarOpen ? <ChevronLeft size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
        </button>
      </aside>

      <main className="dashboard-grid view-transition" key={activeTab}>
        {activeTab === 'inicio' && (loading ? (
          <InicioSkeleton />
        ) : (
          <InicioView 
            kpis={kpis} 
            salesData={salesData} 
            marketShare={marketShare} 
            contextVars={contextVars} 
            formatCurrency={formatCurrency}
            setActiveTab={setActiveTab}
          />
        ))}
        {activeTab === 'sales' && (
          <SalesView formatCurrency={formatCurrency} />
        )}
        {activeTab === 'forecast' && (
          <ForecastView 
            formatCurrency={formatCurrency} 
            initialSku={forecastSelectedSku} 
            skuRequestId={forecastSkuRequestId} 
          />
        )}
        {activeTab === 'cold-start' && (
          <ColdStartView />
        )}
        {activeTab === 'ingestion' && (
          <IngestionView />
        )}
        {activeTab === 'market' && (
          <MarketView />
        )}
        {activeTab === 'settings' && (
          <SettingsView />
        )}
        {activeTab === 'settings-info' && (
          <SettingsInfoView />
        )}
      </main>

      {showPalette && (
        <CommandPalette
          onClose={closePalette}
          products={paletteProducts}
          notifications={notifications}
          onNavigate={handlePaletteNavigate}
          onOpenProduct={openProductForecast}
          onOpenNotification={handleMarkAsViewed}
          onOpenCompany={handleOpenCompanyModal}
          onLogout={handleLogout}
        />
      )}

      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'overlay-in 0.2s ease-out'
        }} onClick={() => setShowLogoutModal(false)}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(14, 165, 233, 0.08)',
            animation: 'scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              background: 'rgba(56, 189, 248, 0.08)', 
              border: '1px solid rgba(56, 189, 248, 0.18)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <LogOut size={22} style={{ color: '#38bdf8' }} />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>¿Cerrar Sesión?</h3>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                ¿Estás seguro de que deseas salir de la plataforma? Deberás ingresar tus credenciales nuevamente para acceder.
              </p>
            </div>

            <div style={{ display: 'flex', width: '100%', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{ 
                  flex: 1, 
                  padding: '0.55rem', 
                  fontSize: '0.82rem', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  setShowLogoutModal(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompanyModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 8, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            animation: 'overlay-in 0.2s ease-out'
          }} 
          onClick={() => setShowCompanyModal(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '92%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(14, 165, 233, 0.15)',
              animation: 'scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              position: 'relative'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 size={22} style={{ color: '#38bdf8' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>Perfil Corporativo</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Información de la Cuenta & Organización</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCompanyModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.color = '#ef4444'; 
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; 
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.color = '#94a3b8'; 
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; 
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; 
                }}
              >
                <X size={16} />
              </button>
            </div>

            {loadingCompanyDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', gap: '0.75rem' }}>
                <div className="spinner"></div>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Obteniendo datos de la organización desde la base de datos...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <img 
                    src={avatarSrc} 
                    alt="Perfil" 
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(56, 189, 248, 0.3)' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: '700' }}>Foto de Perfil</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label style={{ 
                        background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-block', transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { if (!uploadingPhoto) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)' }}
                      onMouseLeave={(e) => { if (!uploadingPhoto) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)' }}>
                        {uploadingPhoto ? 'Procesando...' : 'Cambiar foto'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                      </label>
                      {profile?.foto && (
                        <button 
                          type="button" 
                          onClick={handlePhotoDelete}
                          disabled={uploadingPhoto}
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', border: '1px solid rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { if (!uploadingPhoto) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)' }}
                          onMouseLeave={(e) => { if (!uploadingPhoto) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Razón Social</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc' }}>
                      {companyDetails?.razonSocial || companyDetails?.empresaNombre || localStorage.getItem('empresaNombre') || '-'}
                    </span>
                  </div>
                  <span style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    {companyDetails?.rolUsuario || companyDetails?.rol || localStorage.getItem('rol') || 'USUARIO'}
                  </span>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Correo Electrónico de Sesión</span>
                  <span style={{ fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Mail size={16} style={{ color: '#38bdf8' }} />
                    {getRealUserEmail()}
                  </span>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>RUC / CUIT Tributario</span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontFamily: 'monospace', fontWeight: '600' }}>
                    {companyDetails?.cuit || '-'}
                  </span>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Identificador Único (Tenant ID)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', flex: 1, background: 'rgba(5, 8, 16, 0.6)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                      {companyDetails?.tenantUuid || companyDetails?.empresaId || localStorage.getItem('empresaId') || '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const id = companyDetails?.tenantUuid || companyDetails?.empresaId || localStorage.getItem('empresaId') || '';
                        if (id) {
                          navigator.clipboard.writeText(id);
                          setCopiedTenant(true);
                          setTimeout(() => setCopiedTenant(false), 2000);
                        }
                      }}
                      style={{
                        background: copiedTenant ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${copiedTenant ? 'rgba(52, 211, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                        color: copiedTenant ? '#34d399' : '#38bdf8',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {copiedTenant ? <Check size={14} /> : <Copy size={14} />}
                      {copiedTenant ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: '700' }}>Dar de baja mi cuenta</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Deshabilita tu acceso de forma permanente.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountModal(true)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
                  >
                    <Trash2 size={14} />
                    Dar de baja
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          animation: 'overlay-in 0.2s ease-out'
        }} onClick={() => !deletingAccount && setShowDeleteAccountModal(false)}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(239, 68, 68, 0.08)',
            animation: 'scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>

            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={22} style={{ color: '#f87171' }} />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>¿Dar de baja tu cuenta?</h3>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Esta acción deshabilita tu acceso de forma permanente. No vas a poder volver a iniciar sesión con este usuario. Los registros de auditoría se conservan por trazabilidad.
              </p>
            </div>

            <div style={{ display: 'flex', width: '100%', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={deletingAccount}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                {deletingAccount ? 'Procesando...' : 'Dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
