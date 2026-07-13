import { useState, useEffect } from 'react';
import { Play, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getForecast, getFeatureImportance, triggerSimulation, checkSimulationStatus } from '../../../services/forecast';
import { getMLModels } from '../../../services/settings';

const ForecastView = ({ formatCurrency }) => {
  const [forecastData, setForecastData] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('total');
  const [activeModel, setActiveModel] = useState(null);
  const [safetyStocks, setSafetyStocks] = useState({
    'SKU-001': 12000,
    'SKU-002': 25000,
    'SKU-005': 40000,
    'SKU-007': 30000
  });

  const [priceChange, setPriceChange] = useState(0);
  const [marketingChange, setMarketingChange] = useState(0);
  
  const [simTaskId, setSimTaskId] = useState(null);
  const [simProgress, setSimProgress] = useState(0);
  const [simStatus, setSimStatus] = useState(null); // 'RUNNING', 'SUCCESS', null
  const [simResults, setSimResults] = useState(null);
  const [simMetrics, setSimMetrics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [forecastRes, featureRes, modelsRes] = await Promise.all([
        getForecast(),
        getFeatureImportance(),
        getMLModels()
      ]);
      setForecastData(forecastRes);
      setFeatureImportance(featureRes);
      
      const active = modelsRes.find(m => m.activo || m.active);
      setActiveModel(active);
      
      const saved = localStorage.getItem('product_thresholds');
      if (saved) {
        setSafetyStocks(JSON.parse(saved));
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSimulate = async () => {
    setSimResults(null);
    setSimMetrics(null);
    setSimProgress(0);
    setSimStatus('RUNNING');
    
    const { taskId } = await triggerSimulation({ priceChange, marketingChange });
    setSimTaskId(taskId);
  };

  useEffect(() => {
    let intervalId;
    if (simTaskId && simStatus === 'RUNNING') {
      intervalId = setInterval(async () => {
        const status = await checkSimulationStatus(simTaskId);
        setSimProgress(status.progress);
        if (status.status === 'SUCCESS') {
          setSimStatus('SUCCESS');
          
          // Escalar resultados simulados si no es consolidado total
          let scale = 1.0;
          if (selectedProduct === 'SKU-001') scale = 0.15;
          else if (selectedProduct === 'SKU-002') scale = 0.12;
          else if (selectedProduct === 'SKU-005') scale = 0.25;
          else if (selectedProduct === 'SKU-007') scale = 0.20;
          
          const scaledResults = status.results.map(r => ({
            ...r,
            simulated: Math.round(r.simulated * scale),
            original: Math.round(r.original * scale)
          }));
          
          setSimResults(scaledResults);
          setSimMetrics(status.metrics);
          setSimTaskId(null);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [simTaskId, simStatus, selectedProduct]);

  const getScaledData = () => {
    let scale = 1.0;
    if (selectedProduct === 'SKU-001') scale = 0.15;
    else if (selectedProduct === 'SKU-002') scale = 0.12;
    else if (selectedProduct === 'SKU-005') scale = 0.25;
    else if (selectedProduct === 'SKU-007') scale = 0.20;

    return forecastData.map(item => ({
      ...item,
      historical: item.historical ? Math.round(item.historical * scale) : null,
      forecast: item.forecast ? Math.round(item.forecast * scale) : null,
      lower: item.lower ? Math.round(item.lower * scale) : null,
      upper: item.upper ? Math.round(item.upper * scale) : null,
    }));
  };

  const getCombinedData = () => {
    const scaled = getScaledData();
    if (!simResults) return scaled;
    
    return scaled.map(item => {
      const simItem = simResults.find(s => s.month === item.month);
      return {
        ...item,
        simulated: simItem ? simItem.simulated : null
      };
    });
  };

  const getStockoutAlert = () => {
    if (selectedProduct === 'total') return null;
    const threshold = safetyStocks[selectedProduct] || 0;
    if (threshold === 0) return null;
    
    const scaled = getScaledData();
    const offendingMonth = scaled.find(item => item.forecast && item.forecast > threshold);
    if (offendingMonth) {
      return {
        month: offendingMonth.month,
        forecast: offendingMonth.forecast,
        threshold
      };
    }
    return null;
  };

  const stockoutAlert = getStockoutAlert();

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando modelos predictivos...</p>
      </div>
    );
  }

  const combinedData = getCombinedData();

  return (
    <div className="view-container forecast-view">
      {activeModel?.desalineado && (
        <div className="warning-banner" style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: '#eab308',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} />
          <span>
            <strong>Advertencia de MLOps:</strong> Se han detectado modificaciones en los datos históricos posteriores al último entrenamiento del modelo activo (<strong>{activeModel.version}</strong>). Las proyecciones pueden presentar desviaciones hasta el próximo ciclo programado de reentrenamiento.
          </span>
        </div>
      )}
      <div className="forecast-grid">
        
        <div className="forecast-charts-col">
          <div className="card chart-card forecast-chart-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h3>Proyección de Ventas (Próximo Semestre)</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ver por SKU:</span>
                  <select 
                    value={selectedProduct} 
                    onChange={(e) => {
                      setSelectedProduct(e.target.value);
                      setSimResults(null); // Limpiar simulación al cambiar de SKU
                    }}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="total">Consolidado Total General</option>
                    <option value="SKU-001">Aceite de Girasol 1.5L (SKU-001)</option>
                    <option value="SKU-002">Fideos Tallarín 500g (SKU-002)</option>
                    <option value="SKU-005">Cerveza Lager Lata 473ml (SKU-005)</option>
                    <option value="SKU-007">Gaseosa Cola 2.25L (SKU-007)</option>
                  </select>
                </div>
              </div>
              <div className="legend-pills">
                <span className="legend-pill historical">Histórico</span>
                <span className="legend-pill forecast">Forecast</span>
                <span className="legend-pill confidence">Confianza (±10%)</span>
                {simResults && <span className="legend-pill simulated">Simulado</span>}
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="forecastOficial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="forecastSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#94a3b8'}} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} tickLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  
                  <Area type="monotone" dataKey="historical" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#forecastHist)" name="Histórico" />
                  
                  <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(129, 140, 248, 0.05)" name="Límite Superior" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="none" name="Límite Inferior" />
                  
                  <Area type="monotone" dataKey="forecast" stroke="#818cf8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#forecastOficial)" name="Forecast Oficial" />
                  
                  <Area type="monotone" dataKey="upper" stroke="rgba(129, 140, 248, 0.25)" strokeWidth={1} strokeDasharray="2 2" fillOpacity={0} name="Intervalo Confianza" />
                  <Area type="monotone" dataKey="lower" stroke="rgba(129, 140, 248, 0.25)" strokeWidth={1} strokeDasharray="2 2" fillOpacity={0} />

                  {simResults && (
                    <Area type="monotone" dataKey="simulated" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#forecastSim)" name="Simulado" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card feature-importance-card">
            <h3>Factores del Modelo Predictivo (Feature Importance)</h3>
            <p className="subtitle">Muestra las variables de negocio que tienen mayor impacto en las estimaciones del modelo de IA</p>
            <div className="feature-chart-container" style={{ height: '180px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportance} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 50]} stroke="#64748b" tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{fill: '#f8fafc', fontSize: 11}} width={140} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }}/>
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {featureImportance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="forecast-simulator-col">
          <div className="card simulator-card">
            <div className="simulator-header">
              <Sparkles size={24} className="simulator-sparkle-icon" />
              <h3>Simulador de Escenarios</h3>
            </div>
            <p className="simulator-desc">Modifica las variables operativas para que el microservicio de ML re-calcule las proyecciones en tiempo real.</p>
            
            <div className="simulator-sliders">
              <div className="slider-group">
                <div className="slider-label-row">
                  <label>Variación de Precio Unitario</label>
                  <span className={`slider-value ${priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : ''}`}>
                    {priceChange > 0 ? `+${priceChange}` : priceChange}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-10" 
                  max="10" 
                  value={priceChange} 
                  onChange={(e) => setPriceChange(parseInt(e.target.value))}
                  className="range-input"
                />
                <span className="slider-help">Modificar el precio altera la elasticidad de demanda.</span>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <label>Presupuesto de Marketing</label>
                  <span className={`slider-value ${marketingChange > 0 ? 'positive' : marketingChange < 0 ? 'negative' : ''}`}>
                    {marketingChange > 0 ? `+${marketingChange}` : marketingChange}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-20" 
                  max="50" 
                  value={marketingChange} 
                  onChange={(e) => setMarketingChange(parseInt(e.target.value))}
                  className="range-input"
                />
                <span className="slider-help">Suma o resta exposición de marca y acciones promocionales.</span>
              </div>
            </div>

            <div className="simulator-actions">
              {simStatus === 'RUNNING' ? (
                <div className="simulation-running-card">
                  <div className="running-label">
                    <Loader2 size={16} className="spinner" />
                    <span>Lanzando simulación ML ({simProgress}%)</span>
                  </div>
                  <div className="progress-bar-mini">
                    <div className="progress-fill-mini" style={{ width: `${simProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button className="btn-primary simulate-btn" onClick={handleSimulate}>
                  <Play size={16} /> Correr Simulación
                </button>
              )}
            </div>

            {simStatus === 'SUCCESS' && simMetrics && (
              <div className="simulator-results-panel">
                <h4>Resultados del Escenario</h4>
                <div className="results-grid">
                  <div className="result-metric">
                    <span className="result-label">Precisión R²</span>
                    <span className="result-value">{(simMetrics.r2 * 100).toFixed(0)}%</span>
                  </div>
                  <div className="result-metric">
                    <span className="result-label">MAPE Escenario</span>
                    <span className="result-value green">{simMetrics.mapeSimulado}</span>
                  </div>
                </div>
                <div className="alert-message">
                  <AlertCircle size={16} className="alert-icon" />
                  <span>El nuevo escenario ha sido mapeado en verde en el gráfico para su comparación.</span>
                </div>
                <button className="btn-secondary clear-sim-btn" onClick={() => setSimResults(null)}>
                  Restaurar Original
                </button>
              </div>
            )}
          </div>

          <div className="card model-info-card" style={{ marginTop: '1.25rem' }}>
            <div className="simulator-header">
              <Sparkles size={20} className="simulator-sparkle-icon" />
              <h3>Detalles del Modelo Activo</h3>
            </div>
            <div className="model-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0' }}>
              <div className="info-row" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Algoritmo</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>XGBoost Regressor</span>
              </div>
              <div className="info-row" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Versión</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>v2.4.1</span>
              </div>
              <div className="info-row" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Precisión MAPE</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#34d399' }}>4.85%</span>
              </div>
              <div className="info-row" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Entrenado</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>08/07/2026</span>
              </div>
            </div>
            <p className="simulator-desc" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#64748b' }}>
              El pronóstico (Forecast) se calcula a nivel mensual combinando el historial consolidado de la tabla <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>VENTAS_MENSUALES</span> con variables de clima e inflación. El área sombreada representa el intervalo de confianza del ±10% basado en el error histórico.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForecastView;
