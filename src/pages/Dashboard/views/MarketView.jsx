import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getMarketShareOverview, getPriceGap } from '../../../services/marketShare';

const MarketView = () => {
  const [shareData, setShareData] = useState([]);
  const [priceGap, setPriceGap] = useState([]);
  const [loading, setLoading] = useState(true);

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

    </div>
  );
};

export default MarketView;
