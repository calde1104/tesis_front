import { useState, useEffect } from 'react';
import { 
  Home, BarChart3, TrendingUp, UploadCloud, PieChart, 
  Settings, LogOut, Search, Bell, Menu, ArrowUpRight, ArrowDownRight, Fingerprint,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getKPIs, getSalesEvolution, getMarketShareComposition, getContextVariables } from '../../services/dashboard';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [marketShare, setMarketShare] = useState([]);
  const [contextVars, setContextVars] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
      
      <div className="sidebar-logo">
        <div className="logo-icon"></div>
        <span className="logo-text">Predictive UI</span>
      </div>

      <header className="dashboard-header">
        <div className="header-greeting">
          <h1>Hola, Analista!</h1>
          <p>Explora la información y actividad de tu negocio</p>
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
          <button className="nav-item active">
            <Home size={22} className="nav-icon" />
            <span className="nav-label">Inicio</span>
          </button>
          <button className="nav-item">
            <BarChart3 size={22} className="nav-icon" />
            <span className="nav-label">Ventas</span>
          </button>
          <button className="nav-item">
            <TrendingUp size={22} className="nav-icon" />
            <span className="nav-label">Proyecciones</span>
          </button>
          <button className="nav-item">
            <UploadCloud size={22} className="nav-icon" />
            <span className="nav-label">Ingesta de Datos</span>
          </button>
          <button className="nav-item">
            <PieChart size={22} className="nav-icon" />
            <span className="nav-label">Mercado</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item">
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
          
          <div className="kpi-cards">
            <div className="card kpi-card">
              <div className="kpi-info">
                <h3>{kpis.sales.label}</h3>
                <h2>{formatCurrency(kpis.sales.value)}</h2>
              </div>
              <div className={`kpi-trend ${kpis.sales.trend >= 0 ? 'positive' : 'negative'}`}>
                {kpis.sales.trend >= 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}
                <span>{Math.abs(kpis.sales.trend)}%</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-info">
                <h3>{kpis.projections.label}</h3>
                <h2>{formatCurrency(kpis.projections.value)}</h2>
              </div>
              <div className={`kpi-trend ${kpis.projections.trend >= 0 ? 'positive' : 'negative'}`}>
                {kpis.projections.trend >= 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}
                <span>{Math.abs(kpis.projections.trend)}%</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-info">
                <h3>{kpis.marketShare.label}</h3>
                <h2>{kpis.marketShare.value}%</h2>
              </div>
              <div className={`kpi-trend ${kpis.marketShare.trend >= 0 ? 'positive' : 'negative'}`}>
                {kpis.marketShare.trend >= 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}
                <span>{Math.abs(kpis.marketShare.trend)}%</span>
              </div>
            </div>

            <div className="card kpi-card highlight-card">
              <div className="kpi-info">
                <h3>{kpis.priceGap.label}</h3>
                <h2>{kpis.priceGap.value}%</h2>
                <p>vs Competencia</p>
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="card chart-card large-chart">
              <div className="card-header">
                <h3>Evolución de Ventas vs Forecast</h3>
                <div className="card-actions">
                  <span className="badge">Mensual</span>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="historical" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" name="Histórico" />
                    <Area type="monotone" dataKey="forecast" stroke="#818cf8" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" name="Forecast" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-card side-chart">
              <div className="card-header">
                <h3>Composición Market Share</h3>
              </div>
              <div className="chart-container pie-container">
                <ResponsiveContainer width="100%" height="70%">
                  <RechartsPie>
                    <Pie
                      data={marketShare}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {marketShare.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}/>
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {marketShare.map((entry, index) => (
                    <div key={index} className="legend-item">
                      <span className="legend-color" style={{backgroundColor: entry.fill}}></span>
                      <span className="legend-label">{entry.name}</span>
                      <span className="legend-value">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-row">
            <div className="card context-card">
              <div className="card-header">
                <h3>Variables de Contexto</h3>
              </div>
              <div className="context-list">
                <div className="context-item">
                  <span className="context-label">{contextVars.inflation.label}</span>
                  <span className="context-value">{contextVars.inflation.value}%</span>
                </div>
                <div className="context-item">
                  <span className="context-label">{contextVars.exchangeRate.label}</span>
                  <span className="context-value">${contextVars.exchangeRate.value}</span>
                </div>
                <div className="context-item">
                  <span className="context-label">{contextVars.seasonality.label}</span>
                  <span className="context-value highlight">{contextVars.seasonality.value}</span>
                </div>
              </div>
            </div>

            <div className="card security-card">
              <div className="security-content">
                <Fingerprint size={48} className="security-icon" />
                <div>
                  <h3>Auditoría de Ingesta</h3>
                  <p>Mantén la integridad de tus datos revisando el pipeline.</p>
                </div>
              </div>
              <button className="btn-primary">Ver Historial</button>
            </div>
          </div>

      </main>
    </div>
  );
};

export default Dashboard;
