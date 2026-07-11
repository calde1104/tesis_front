import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, HelpCircle, Sparkles } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getMarketShareOverview, getPriceGap, predictColdStart } from '../../../services/marketShare';

const MarketView = () => {
  const [shareData, setShareData] = useState([]);
  const [priceGap, setPriceGap] = useState([]);
  const [loading, setLoading] = useState(true);

  const [productName, setProductName] = useState('');
  const [targetCategory, setTargetCategory] = useState('Aceites');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [expectedWeight, setExpectedWeight] = useState('');
  
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [shareRes, priceRes] = await Promise.all([
        getMarketShareOverview(),
        getPriceGap()
      ]);
      setShareData(shareRes);
      setPriceGap(priceRes);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleColdStartSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !expectedPrice) {
      alert("Por favor rellene el nombre y precio del producto.");
      return;
    }
    setPredicting(true);
    setPredictionResult(null);
    
    const result = await predictColdStart({
      name: productName,
      category: targetCategory,
      expectedPrice,
      weight: expectedWeight
    });
    setPredictionResult(result);
    setPredicting(false);
  };

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando información competitiva del mercado...</p>
      </div>
    );
  }

  return (
    <div className="view-container market-view">

      <div className="market-charts-grid">
        
        <div className="card chart-card market-share-chart">
          <div className="card-header">
            <h3>Evolución de Cuota de Mercado (%)</h3>
            <span className="badge">Histórico</span>
          </div>
          <div className="chart-container" style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} domain={[15, 40]} tickFormatter={(val) => `${val}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}/>
                <Line type="monotone" dataKey="Nuestra Empresa" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Competidor A" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Competidor B" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Otros" stroke="#475569" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="market-chart-legend">
            <span className="legend-marker my-company">Nuestra Empresa (34.5%)</span>
            <span className="legend-marker comp-a">Competidor A (25.0%)</span>
            <span className="legend-marker comp-b">Competidor B (20.5%)</span>
            <span className="legend-marker comp-other">Otros (20.0%)</span>
          </div>
        </div>

        <div className="card chart-card price-gap-chart">
          <div className="card-header">
            <h3>Price Gap vs Competencia (%)</h3>
            <span className="badge">Por Categoría</span>
          </div>
          <div className="chart-container" style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceGap} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="category" stroke="#64748b" tick={{fill: '#f8fafc', fontSize: 11}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }}
                  formatter={(value) => [`${value}%`, 'Brecha de Precio']}
                />
                <Bar dataKey="gap" radius={[4, 4, 0, 0]}>
                  {priceGap.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.gap > 0 ? '#f43f5e' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="price-gap-legend">
            <span className="legend-dot negative-gap">Brecha Negativa (Más Barato)</span>
            <span className="legend-dot positive-gap">Brecha Positiva (Más Caro)</span>
          </div>
        </div>

      </div>

      <div className="card cold-start-card">
        <div className="cold-start-header">
          <Sparkles size={24} className="sparkle-icon" />
          <h3>Herramienta de Pre-lanzamiento (Cold Start)</h3>
        </div>
        <p className="subtitle">Algoritmo de clustering que agrupa productos nuevos sin historial para proyectar su comportamiento inicial en góndola.</p>

        <div className="cold-start-layout-grid">
          <form className="cold-start-form" onSubmit={handleColdStartSubmit}>
            <div className="form-group">
              <label>Nombre del SKU Nuevo</label>
              <input 
                type="text" 
                placeholder="Ej: Jugo Exprés Naranja 1L" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            <div className="form-row-double">
              <div className="form-group">
                <label>Categoría Objetivo</label>
                <select value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)}>
                  <option value="Aceites">Aceites</option>
                  <option value="Fideos">Fideos</option>
                  <option value="Arroz">Arroz</option>
                  <option value="Salsas">Salsas</option>
                  <option value="Cervezas">Cervezas</option>
                  <option value="Vinos">Vinos</option>
                  <option value="Gaseosas">Gaseosas</option>
                </select>
              </div>

              <div className="form-group">
                <label>Precio de Venta Sugerido ($)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 1250" 
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={predicting}>
              {predicting ? <Loader2 size={16} className="spinner" /> : <TrendingUp size={16} />}
              {predicting ? 'Calculando Clusters...' : 'Predecir Lanzamiento'}
            </button>
          </form>

          <div className="cold-start-results-panel">
            {predictionResult ? (
              <div className="prediction-success-box">
                <h4>Clasificación Generada</h4>
                <div className="result-metric-large">
                  <span className="metric-label">Grupo de Comportamiento</span>
                  <span className="metric-value">{predictionResult.clusterName}</span>
                </div>
                
                <div className="result-stats-row">
                  <div className="stat-box">
                    <span className="stat-label">Precio Óptimo</span>
                    <span className="stat-value">${predictionResult.recommendedPrice.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Ventas Est. (Mes 1)</span>
                    <span className="stat-value">{predictionResult.salesVolume.toLocaleString('es-AR')} un.</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Confianza de IA</span>
                    <span className="stat-value highlight-text">{predictionResult.confidenceLevel}</span>
                  </div>
                </div>

                <div className="predicted-share-months">
                  <h5>Market Share Proyectado</h5>
                  <div className="share-months-flex">
                    {predictionResult.predictedShares.map((m, idx) => (
                      <div key={idx} className="month-share-item">
                        <span className="month-num">{m.month}</span>
                        <span className="month-percent">{m.share}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="prediction-placeholder">
                <HelpCircle size={36} className="placeholder-icon" />
                <p>Carga los datos del nuevo producto a la izquierda y presiona el botón para consultar al algoritmo predictivo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketView;
