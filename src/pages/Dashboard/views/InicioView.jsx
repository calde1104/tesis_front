import { 
  ArrowUpRight, ArrowDownRight, Coins, LineChart, Target, Scale, 
  AreaChart as LucideAreaChart, Layers, Sliders, ShieldCheck 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, ReferenceLine, ReferenceDot
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter((pld) => {
      if (pld.dataKey === 'forecast' && pld.payload.historical !== null && pld.payload.historical !== undefined) {
        return false;
      }
      return true;
    });

    if (filteredPayload.length === 0) return null;

    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(14, 165, 233, 0.1)',
        textAlign: 'left'
      }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        {filteredPayload.map((pld) => {
          const isCurrency = pld.dataKey === 'historical';
          const formattedValue = typeof pld.value === 'number'
            ? (isCurrency 
                ? `₲ ${Math.round(pld.value).toLocaleString('es-PY')}`
                : `${Math.round(pld.value).toLocaleString('es-PY')} un.`)
            : pld.value;

          const historicalUnits = pld.payload && pld.payload.historicalUnits !== null && pld.payload.historicalUnits !== undefined
            ? Math.round(pld.payload.historicalUnits).toLocaleString('es-PY')
            : null;

          return (
            <div key={pld.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: pld.color }}></span>
                <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{pld.name}:</span>
                <span style={{ fontWeight: '700', color: '#f8fafc', marginLeft: 'auto' }}>
                  {formattedValue}
                </span>
              </div>
              {isCurrency && historicalUnits !== null && (
                <div style={{ paddingLeft: '0.85rem', fontSize: '0.72rem', color: '#38bdf8', opacity: 0.9 }}>
                  <span>Volumen físico: {historicalUnits} un.</span>
                </div>
              )}
            </div>
          );
        })}
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
        border: `1px solid ${data.payload.fill || 'rgba(255, 255, 255, 0.15)'}`,
        padding: '0.6rem 0.85rem',
        borderRadius: '12px',
        boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${data.payload.fill}22`,
        fontSize: '0.8rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: data.payload.fill }}></span>
          <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{data.name}:</span>
          <span style={{ fontWeight: '700', color: '#f8fafc' }}>{data.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltipCursor = (props) => {
  let x = props.x;
  let y = props.y;
  let height = props.height || 0;

  if (x === undefined && props.points && props.points.length > 0) {
    x = props.points[0].x;
  }
  if (y === undefined && props.points && props.points.length > 0) {
    y = props.points[0].y;
  }
  if (height === 0 && props.points && props.points.length > 1) {
    height = props.points[1].y - props.points[0].y;
  }

  if (x === undefined) x = props.x1;
  if (y === undefined) y = props.y1;
  if (height === 0 && props.y2 !== undefined && props.y1 !== undefined) {
    height = props.y2 - props.y1;
  }

  if (x === undefined || y === undefined) return null;

  return (
    <line 
      x1={x} 
      y1={y + 25} 
      x2={x} 
      y2={y + height} 
      stroke="rgba(255, 255, 255, 0.15)" 
      strokeWidth={1}
    />
  );
};

const CustomReferenceLabel = (props) => {
  const xVal = props.x !== undefined && typeof props.x === 'number' ? props.x : (props.viewBox ? props.viewBox.x : 0);
  const yVal = props.y !== undefined && typeof props.y === 'number' ? props.y : (props.viewBox ? props.viewBox.y : 0);
  
  if (!xVal) return null;
  
  return (
    <g>
      <rect 
        x={xVal - 22} 
        y={yVal + 5} 
        width={44} 
        height={18} 
        rx={9} 
        fill="#0ea5e9" 
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(14, 165, 233, 0.4))' }}
      />
      <text 
        x={xVal} 
        y={yVal + 17} 
        fill="#040d21" 
        fontSize="9" 
        fontWeight="800" 
        textAnchor="middle"
        letterSpacing="0.05em"
      >
        HOY
      </text>
    </g>
  );
};

const InicioView = ({ kpis, salesData, marketShare, contextVars, formatCurrency, setActiveTab }) => {
  if (!kpis || !contextVars) return null;

  const processedSalesData = salesData.map((item, idx) => {
    const isTransitionPoint = item.historical !== null && 
                              (item.forecast === null || item.forecast === undefined) && 
                              idx < salesData.length - 1 && 
                              salesData[idx + 1].forecast !== null;
    if (isTransitionPoint) {
      return {
        ...item,
        forecast: item.historical
      };
    }
    return item;
  });

  const transitionPoint = salesData.find((item, idx) => 
    item.historical !== null && 
    (item.forecast === null || item.forecast === undefined) && 
    idx < salesData.length - 1 && 
    salesData[idx + 1].forecast !== null
  );
  const transitionMonth = transitionPoint ? transitionPoint.month : 'Jun 26';
  const transitionValue = transitionPoint ? transitionPoint.historical : 682500;

  return (
    <>
      <div className="kpi-cards">
        <div className="card kpi-card clickable-card" onClick={() => setActiveTab('sales')}>
          <div className="kpi-header">
            <span className="kpi-label">{kpis.sales.label}</span>
            <Coins size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {formatCurrency(kpis.sales.value)}
          </div>
          <div className="kpi-footer">
            {kpis.sales.trend !== null && kpis.sales.trend !== undefined ? (
              <div className={`kpi-trend ${kpis.sales.trend >= 0 ? 'positive' : 'negative'}`}>
                {kpis.sales.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                <span>{kpis.sales.trend >= 0 ? `+${kpis.sales.trend}` : kpis.sales.trend}% vs mes anterior</span>
              </div>
            ) : (
              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                Sin mes anterior
              </span>
            )}
          </div>
        </div>

        <div className="card kpi-card clickable-card" onClick={() => setActiveTab('market')}>
          <div className="kpi-header">
            <span className="kpi-label">{kpis.margin.label}</span>
            <Layers size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {kpis.margin.value}%
          </div>
          <div className="kpi-footer">
            {kpis.margin.trend !== null && kpis.margin.trend !== undefined ? (
              <div className={`kpi-trend ${kpis.margin.trend >= 0 ? 'positive' : 'negative'}`}>
                {kpis.margin.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                <span>{kpis.margin.trend >= 0 ? `+${kpis.margin.trend}` : kpis.margin.trend}% vs mes anterior</span>
              </div>
            ) : (
              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                Período actual
              </span>
            )}
          </div>
        </div>

        <div className="card kpi-card clickable-card" onClick={() => setActiveTab('market')}>
          <div className="kpi-header">
            <span className="kpi-label">{kpis.priceGap.label}</span>
            <Scale size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {kpis.priceGap.value}%
          </div>
          <div className="kpi-footer">
            {kpis.priceGap.trend !== null && kpis.priceGap.trend !== undefined ? (
              <div className={`kpi-trend ${kpis.priceGap.trend <= 0 ? 'positive' : 'negative'}`}>
                {kpis.priceGap.trend <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                <span>{kpis.priceGap.trend >= 0 ? `+${kpis.priceGap.trend}` : kpis.priceGap.trend}% vs mes anterior</span>
              </div>
            ) : (
              <span className="badge" style={{ background: kpis.priceGap.value <= 0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: kpis.priceGap.value <= 0 ? '#38bdf8' : '#ef4444', border: kpis.priceGap.value <= 0 ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
                {kpis.priceGap.value <= 0 ? 'Competitivo' : 'Por encima'}
              </span>
            )}
          </div>
        </div>

        <div className="card kpi-card clickable-card" onClick={() => setActiveTab('settings')}>
          <div className="kpi-header">
            <span className="kpi-label">{kpis.accuracy.label}</span>
            <LineChart size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">
            {kpis.accuracy.value !== null && kpis.accuracy.value !== undefined ? `${kpis.accuracy.value}%` : 'N/A'}
          </div>
          <div className="kpi-footer">
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
              {kpis.accuracy.value !== null ? 'Modelo Activo' : 'Sin Modelo Activo'}
            </span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card large-chart clickable-card" onClick={() => setActiveTab('forecast')}>
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
              <AreaChart data={processedSalesData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 11}} 
                  tickLine={false} 
                  axisLine={false}
                  padding={{ left: 15, right: 15 }}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 11}} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => {
                    if (!val) return '₲ 0';
                    if (Math.abs(val) >= 1_000_000_000) {
                      return `₲ ${(val / 1_000_000_000).toFixed(1)}B`;
                    }
                    if (Math.abs(val) >= 1_000_000) {
                      return `₲ ${(val / 1_000_000).toFixed(0)}M`;
                    }
                    return `₲ ${val}`;
                  }}
                  domain={['auto', 'auto']}
                  padding={{ top: 15, bottom: 15 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={<CustomTooltipCursor />} />
                
                {transitionMonth && (
                  <ReferenceLine 
                    x={transitionMonth} 
                    stroke="rgba(14, 165, 233, 0.4)" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                    isFront={false}
                  />
                )}
                
                {transitionMonth && (
                  <ReferenceLine 
                    x={transitionMonth} 
                    stroke="none"
                    label={<CustomReferenceLabel />}
                    isFront={true}
                  />
                )}
                
                {transitionMonth && transitionValue && (
                  <ReferenceDot 
                    x={transitionMonth} 
                    y={transitionValue} 
                    r={5}
                    fill="#0ea5e9"
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{ filter: 'drop-shadow(0px 0px 8px rgba(14, 165, 233, 0.9))' }}
                    isFront={true}
                  />
                )}
                
                <Area type="monotone" dataKey="historical" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" name="Ventas Históricas" activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2, fill: '#040d21' }} connectNulls={true} />
                
                <Area 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#818cf8" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  fillOpacity={1} 
                  fill="url(#colorForecast)" 
                  name="Demanda Proyectada" 
                  connectNulls={true} 
                  activeDot={(props) => {
                    if (props && props.payload && props.payload.month === transitionMonth) {
                      return null;
                    }
                    return (
                      <circle 
                        cx={props.cx} 
                        cy={props.cy} 
                        r={6} 
                        fill="#040d21" 
                        stroke="#818cf8" 
                        strokeWidth={2} 
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card side-chart clickable-card" onClick={() => setActiveTab('market')}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} className="icon-purple" />
              <h3>Composición Market Share</h3>
            </div>
          </div>
          <div className="chart-container pie-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '80%', padding: '0 0.75rem', position: 'relative' }}>
            <div style={{ width: '56%', height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={marketShare}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={4}
                    dataKey="value"
                    stroke="rgba(15, 23, 42, 0.8)"
                    strokeWidth={2}
                  >
                    {marketShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0px 4px 10px ${entry.fill}33)` }} />
                    ))}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
              
              {marketShare && marketShare.length > 0 && (
                (() => {
                  const realCompanies = marketShare.filter(item => item.name !== 'Otros');
                  const leaderSource = realCompanies.length > 0 ? realCompanies : marketShare;
                  const leader = leaderSource.reduce((max, item) => item.value > max.value ? item : max, leaderSource[0]);
                  return (
                    <div className="pie-center-label" style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Líder</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: leader.fill, display: 'block', marginTop: '2px', textShadow: `0 0 10px ${leader.fill}55` }}>{leader.value}%</span>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="chart-legend" style={{ width: '42%', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {marketShare.map((entry, index) => (
                <div key={index} className="legend-item" style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span className="legend-color" style={{backgroundColor: entry.fill, boxShadow: `0 0 8px ${entry.fill}aa`, width: '12px', height: '12px', borderRadius: '3px', marginRight: '0.5rem', flexShrink: 0}}></span>
                  <span className="legend-label" style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                  <span className="legend-value" style={{ fontWeight: '700', color: '#f8fafc', marginLeft: 'auto' }}>{entry.value}%</span>
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
              <span className="context-value">
                {contextVars.inflation.value !== null && contextVars.inflation.value !== undefined 
                  ? `${contextVars.inflation.value}%` 
                  : 'N/A'}
              </span>
            </div>
            <div className="context-item">
              <span className="context-label">{contextVars.exchangeRate.label}</span>
              <span className="context-value">
                {contextVars.exchangeRate.value !== null && contextVars.exchangeRate.value !== undefined 
                  ? `₲ ${Number(contextVars.exchangeRate.value).toLocaleString('es-PY')}` 
                  : 'N/A'}
              </span>
            </div>
            <div className="context-item">
              <span className="context-label">{contextVars.seasonality.label}</span>
              <span className="context-value highlight">{contextVars.seasonality.value}</span>
            </div>
          </div>
        </div>

        <div className="card security-card">
          <div className="security-content">
            <ShieldCheck size={44} style={{ color: '#38bdf8' }} fill="currentColor" fillOpacity={0.15} />
            <div>
              <h3>Auditoría de Ingesta</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0', lineHeight: '1.4' }}>
                Sube nuevos archivos de ventas para actualizar los pronósticos, valida el formato de las planillas y gestiona el historial de cargas.
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
