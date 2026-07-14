import { 
  ArrowUpRight, ArrowDownRight, Coins, LineChart, Target, Scale, 
  AreaChart as LucideAreaChart, Layers, Sliders, ShieldCheck 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        textAlign: 'left'
      }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        {payload.map((pld) => (
          <div key={pld.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: pld.color }}></span>
            <span style={{ color: '#94a3b8' }}>{pld.name}:</span>
            <span style={{ fontWeight: '700', color: '#f8fafc' }}>
              {typeof pld.value === 'number' ? `$${pld.value.toLocaleString('es-AR')}` : pld.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.6rem 0.85rem',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        fontSize: '0.8rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: data.payload.fill }}></span>
          <span style={{ color: '#94a3b8' }}>{data.name}:</span>
          <span style={{ fontWeight: '700', color: '#f8fafc' }}>{data.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const InicioView = ({ kpis, salesData, marketShare, contextVars, formatCurrency, setActiveTab }) => {
  if (!kpis || !contextVars) return null;

  return (
    <>
      <div className="kpi-cards">
        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{kpis.sales.label}</span>
            <Coins size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {formatCurrency(kpis.sales.value)}
          </div>
          <div className="kpi-footer">
            <div className={`kpi-trend ${kpis.sales.trend >= 0 ? 'positive' : 'negative'}`}>
              {kpis.sales.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
              <span>{Math.abs(kpis.sales.trend)}%</span>
            </div>
            <span>vs mes anterior</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{kpis.projections.label}</span>
            <LineChart size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {formatCurrency(kpis.projections.value)}
          </div>
          <div className="kpi-footer">
            <div className={`kpi-trend ${kpis.projections.trend >= 0 ? 'positive' : 'negative'}`}>
              {kpis.projections.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
              <span>{Math.abs(kpis.projections.trend)}%</span>
            </div>
            <span>vs mes anterior</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{kpis.marketShare.label}</span>
            <Target size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {kpis.marketShare.value}%
          </div>
          <div className="kpi-footer">
            <div className={`kpi-trend ${kpis.marketShare.trend >= 0 ? 'positive' : 'negative'}`}>
              {kpis.marketShare.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
              <span>{Math.abs(kpis.marketShare.trend)}%</span>
            </div>
            <span>vs mes anterior</span>
          </div>
        </div>

        <div className="card kpi-card highlight-card">
          <div className="kpi-header">
            <span className="kpi-label">{kpis.priceGap.label}</span>
            <Scale size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {kpis.priceGap.value}%
          </div>
          <div className="kpi-footer">
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
              Competitivo
            </span>
            <span>vs promedio</span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card large-chart">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LucideAreaChart size={18} className="icon-blue" />
              <h3>Evolución de Ventas vs Forecast</h3>
            </div>
            <div className="card-actions">
              <span className="badge">Consolidado Mensual</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="historical" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" name="Ventas Históricas" />
                <Area type="monotone" dataKey="forecast" stroke="#818cf8" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" name="Demanda Proyectada" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card side-chart">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} className="icon-purple" />
              <h3>Composición Market Share</h3>
            </div>
          </div>
          <div className="chart-container pie-container">
            <ResponsiveContainer width="100%" height="70%">
              <RechartsPie>
                <Pie
                  data={marketShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="rgba(15, 23, 42, 0.8)"
                  strokeWidth={2}
                >
                  {marketShare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0px 4px 10px ${entry.fill}33)` }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="chart-legend">
              {marketShare.map((entry, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-color" style={{backgroundColor: entry.fill, boxShadow: `0 0 8px ${entry.fill}aa`}}></span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} className="icon-blue" style={{ color: '#0ea5e9' }} />
              <h3>Variables de Contexto</h3>
            </div>
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
            <div className="security-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '16px',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)'
            }}>
              <ShieldCheck size={32} fill="currentColor" fillOpacity={0.15} />
            </div>
            <div>
              <h3>Auditoría de Ingesta</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0', lineHeight: '1.4' }}>
                Mantén la integridad criptográfica de tus datos históricos y valida los hashes SHA-256 del pipeline.
              </p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setActiveTab('ingestion')}>Ver Historial</button>
        </div>
      </div>
    </>
  );
};

export default InicioView;
