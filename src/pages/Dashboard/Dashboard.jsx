import { useState, useEffect } from 'react';
import { 
  Home, BarChart3, TrendingUp, UploadCloud, PieChart, 
  Settings, LogOut, Search, Bell, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getKPIs, getSalesEvolution, getMarketShareComposition, getContextVariables } from '../../services/dashboard';
import { getMLModels } from '../../services/settings';
import './Dashboard.css';
import logoImg from '../../assets/logo.jpg';

import InicioView from './views/InicioView';
import SalesView from './views/SalesView';
import ForecastView from './views/ForecastView';
import IngestionView from './views/IngestionView';
import MarketView from './views/MarketView';
import SettingsView from './views/SettingsView';

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
  const [activeModel, setActiveModel] = useState(null);
  const [safetyStocks, setSafetyStocks] = useState({
    'SKU-001': 12000,
    'SKU-002': 25000,
    'SKU-005': 40000,
    'SKU-007': 30000
  });

  const getNotifications = () => {
    const list = [];
    
    if (activeModel && activeModel.desalineado) {
      list.push({
        id: 'mlops-warn',
        type: 'MLOPS',
        title: 'Desalineación de Datos',
        message: `Se modificaron datos históricos. El modelo activo (${activeModel.version}) requiere reentrenamiento.`,
        severity: 'WARNING',
        tab: 'settings'
      });
    }

    const productPredictions = {
      'SKU-001': { name: 'Aceite de Girasol', forecast: 14200, threshold: safetyStocks['SKU-001'] },
      'SKU-002': { name: 'Fideos Tallarín', forecast: 28500, threshold: safetyStocks['SKU-002'] },
      'SKU-005': { name: 'Cerveza Lager Lata', forecast: 45000, threshold: safetyStocks['SKU-005'] },
      'SKU-007': { name: 'Gaseosa Cola', forecast: 35600, threshold: safetyStocks['SKU-007'] }
    };

    Object.entries(productPredictions).forEach(([sku, prod]) => {
      if (prod.forecast > prod.threshold) {
        list.push({
          id: `stock-${sku}`,
          type: 'STOCK',
          title: `Quiebre de Stock: ${prod.name}`,
          message: `La demanda estimada (${prod.forecast.toLocaleString('es-AR')} un) supera el stock de seguridad (${prod.threshold.toLocaleString('es-AR')} un).`,
          severity: 'CRITICAL',
          tab: 'forecast'
        });
      }
    });

    return list;
  };

  const notifications = getNotifications();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, salesRes, marketRes, contextRes, modelsRes] = await Promise.all([
          getKPIs(),
          getSalesEvolution(),
          getMarketShareComposition(),
          getContextVariables(),
          getMLModels()
        ]);
        setKpis(kpiRes);
        setSalesData(salesRes);
        setMarketShare(marketRes);
        setContextVars(contextRes);
        
        const active = modelsRes.find(m => m.activo || m.active);
        setActiveModel(active);
        
        const saved = localStorage.getItem('product_thresholds');
        if (saved) {
          setSafetyStocks(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleLogout = () => {
    navigate('/login');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando plataforma...</p>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'inicio': return "¡Hola, Analista!";
      case 'sales': return "Módulo de Ventas";
      case 'forecast': return "Forecast & Simulación";
      case 'ingestion': return "Ingesta de Datos";
      case 'market': return "Market Share & Competencia";
      case 'settings': return "Configuración del Sistema";
      default: return "¡Hola, Analista!";
    }
  };

  const getHeaderSubtitle = () => {
    switch(activeTab) {
      case 'inicio': return "Explora la información y actividad de tu negocio";
      case 'sales': return "Consulta el historial detallado de ventas a nivel de SKU";
      case 'forecast': return "Visualiza pronósticos y simula escenarios predictivos";
      case 'ingestion': return "Sube archivos y monitorea el estado de carga de datos";
      case 'market': return "Mapea tu cuota de mercado e identifica brechas de precio";
      case 'settings': return "Gestiona parámetros operacionales y modelos de IA";
      default: return "Explora la información y actividad de tu negocio";
    }
  };

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
      
      <div className="sidebar-logo">
        <img src={logoImg} className="logo-icon" alt="Logo" />
        <span className="logo-text">Predictive B2B</span>
      </div>

      <header className="dashboard-header">
        <div className="header-greeting">
          <h1>{getHeaderTitle()}</h1>
          <p>{getHeaderSubtitle()}</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Buscar..." />
          </div>
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative' }}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
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
                  {notifications.length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown" style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '320px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                padding: '0.75rem 0'
              }}>
                <div style={{
                  padding: '0 1rem 0.5rem 1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f1f5f9' }}>Notificaciones</h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{notifications.length} Alertas</span>
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '0.25rem 0' }}>
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        className="notification-item"
                        onClick={() => {
                          setActiveTab(n.tab);
                          setShowNotifications(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{
                            color: n.severity === 'CRITICAL' ? '#ef4444' : '#eab308',
                            fontSize: '1rem',
                            lineHeight: '1'
                          }}>
                            {n.severity === 'CRITICAL' ? '●' : '▲'}
                          </span>
                          <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#f8fafc' }}>
                            {n.title}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                          {n.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                      No tienes alertas pendientes
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
              <Home size={22} className="nav-icon" />
              <span className="nav-label">Inicio</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <BarChart3 size={22} className="nav-icon" />
              <span className="nav-label">Ventas</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              <TrendingUp size={22} className="nav-icon" />
              <span className="nav-label">Proyecciones</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTab('market')}
            >
              <PieChart size={22} className="nav-icon" />
              <span className="nav-label">Mercado</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'ingestion' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingestion')}
            >
              <UploadCloud size={22} className="nav-icon" />
              <span className="nav-label">Ingesta de Datos</span>
            </button>
          </nav>
          
          <div className="sidebar-bottom">
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={22} className="nav-icon" />
              <span className="nav-label">Configuración</span>
            </button>
            <button className="nav-item" onClick={handleLogout}>
              <LogOut size={22} className="nav-icon" />
              <span className="nav-label">Cerrar Sesión</span>
            </button>
            <div className="user-profile-nav">
              <div className="user-avatar">
                <img src="https://ui-avatars.com/api/?name=Analista+B2B&background=0D8ABC&color=fff" alt="User" />
              </div>
              <div className="user-info-nav">
                <span className="user-name">Analista B2B</span>
                <span className="user-role">Admin</span>
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

      <main className="dashboard-grid">
        {activeTab === 'inicio' && (
          <InicioView 
            kpis={kpis} 
            salesData={salesData} 
            marketShare={marketShare} 
            contextVars={contextVars} 
            formatCurrency={formatCurrency}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'sales' && (
          <SalesView formatCurrency={formatCurrency} />
        )}
        {activeTab === 'forecast' && (
          <ForecastView formatCurrency={formatCurrency} />
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
      </main>
    </div>
  );
};

export default Dashboard;
