import { useState, useEffect } from 'react';
import { 
  Home, BarChart3, TrendingUp, UploadCloud, PieChart, 
  Settings, LogOut, Search, Bell, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getKPIs, getSalesEvolution, getMarketShareComposition, getContextVariables } from '../../services/dashboard';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, salesRes, marketRes, contextRes] = await Promise.all([
          getKPIs(),
          getSalesEvolution(),
          getMarketShareComposition(),
          getContextVariables()
        ]);
        setKpis(kpiRes);
        setSalesData(salesRes);
        setMarketShare(marketRes);
        setContextVars(contextRes);
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
          <button className="icon-btn"><Bell size={20} /></button>
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
