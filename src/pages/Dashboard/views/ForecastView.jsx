import { useState, useEffect } from 'react';
import { Play, Loader2, Sparkles, AlertCircle, Coins, Megaphone, X } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';
import { getForecast, getFeatureImportance, triggerSimulation, checkSimulationStatus } from '../../../services/forecast';
import { getMLModels } from '../../../services/settings';
import { getSalesFilters } from '../../../services/sales';

const deptBrands = {
  'Alimentos': ['Molinos', 'Vicentin', 'Arcor'],
  'Bebidas': ['Quilmes', 'Coca-Cola', 'Otros'],
  'Limpieza': ['Unilever', 'Otros'],
  'Cuidado Personal': []
};

const categoryBrands = {
  'Aceites': ['Vicentin'],
  'Fideos': ['Molinos'],
  'Arroz': ['Molinos'],
  'Salsas': ['Arcor'],
  'Cervezas': ['Quilmes'],
  'Vinos': ['Otros'],
  'Gaseosas': ['Coca-Cola'],
  'Aguas': ['Coca-Cola'],
  'Jabón Líquido': ['Unilever'],
  'Desinfectantes': ['Unilever'],
  'Suavizantes': ['Unilever'],
  'Limpiadores Multiuso': ['Otros']
};

const allProducts = [
  { sku: 'SKU-001', name: 'Aceite de Girasol 1.5L', category: 'Aceites', brand: 'Vicentin', department: 'Alimentos', scale: 0.15 },
  { sku: 'SKU-002', name: 'Fideos Tallarín 500g', category: 'Fideos', brand: 'Molinos', department: 'Alimentos', scale: 0.12 },
  { sku: 'SKU-003', name: 'Arroz Largo Fino 1kg', category: 'Arroz', brand: 'Molinos', department: 'Alimentos', scale: 0.10 },
  { sku: 'SKU-004', name: 'Puré de Tomate 520g', category: 'Salsas', brand: 'Arcor', department: 'Alimentos', scale: 0.08 },
  { sku: 'SKU-005', name: 'Cerveza Lager Lata 473ml', category: 'Cervezas', brand: 'Quilmes', department: 'Bebidas', scale: 0.25 },
  { sku: 'SKU-006', name: 'Vino Malbec Reserva 750ml', category: 'Vinos', brand: 'Otros', department: 'Bebidas', scale: 0.18 },
  { sku: 'SKU-007', name: 'Gaseosa Cola 2.25L', category: 'Gaseosas', brand: 'Coca-Cola', department: 'Bebidas', scale: 0.20 },
  { sku: 'SKU-008', name: 'Agua Mineral Sin Gas 1.5L', category: 'Aguas', brand: 'Coca-Cola', department: 'Bebidas', scale: 0.07 },
  { sku: 'SKU-009', name: 'Jabón Líquido Para Ropa 3L', category: 'Jabón Líquido', brand: 'Unilever', department: 'Limpieza', scale: 0.14 },
  { sku: 'SKU-010', name: 'Desinfectante de Ambientes 360ml', category: 'Desinfectantes', brand: 'Unilever', department: 'Limpieza', scale: 0.11 },
  { sku: 'SKU-011', name: 'Suavizante Floral 3L', category: 'Suavizantes', brand: 'Unilever', department: 'Limpieza', scale: 0.13 },
  { sku: 'SKU-012', name: 'Limpiador de Pisos 1L', category: 'Limpiadores Multiuso', brand: 'Otros', department: 'Limpieza', scale: 0.09 }
];

const ForecastView = ({ formatCurrency }) => {
  const [forecastData, setForecastData] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState(null);
  
  const [filterOptions, setFilterOptions] = useState(null);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('total');

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
      const [forecastRes, featureRes, modelsRes, filtersRes] = await Promise.all([
        getForecast(),
        getFeatureImportance(),
        getMLModels(),
        getSalesFilters()
      ]);
      setForecastData(forecastRes);
      setFeatureImportance(featureRes);
      setFilterOptions(filtersRes);
      
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
          
          const activeProd = allProducts.find(p => p.sku === selectedProduct);
          const scale = activeProd ? activeProd.scale : 1.0;
          
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

  const handleDepartmentChange = (e) => {
    const nextDept = e.target.value;
    setDepartment(nextDept);
    setSelectedProduct('total'); // Volver a consolidado general al cambiar departamento
    setSimResults(null);
    let nextCat = category;
    if (nextDept && category && filterOptions) {
      const allowedCats = filterOptions.categories[nextDept] || [];
      if (!allowedCats.includes(category)) {
        setCategory('');
        nextCat = '';
      }
    }
    if (brand) {
      if (nextCat) {
        const allowedBrands = categoryBrands[nextCat] || [];
        if (!allowedBrands.includes(brand)) setBrand('');
      } else if (nextDept) {
        const allowedBrands = deptBrands[nextDept] || [];
        if (!allowedBrands.includes(brand)) setBrand('');
      }
    }
  };

  const handleCategoryChange = (e) => {
    const nextCat = e.target.value;
    setCategory(nextCat);
    setSelectedProduct('total'); // Volver a consolidado general
    setSimResults(null);
    if (brand && nextCat) {
      const allowedBrands = categoryBrands[nextCat] || [];
      if (!allowedBrands.includes(brand)) setBrand('');
    }
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
    setSelectedProduct('total'); // Volver a consolidado general
    setSimResults(null);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartment('');
    setCategory('');
    setBrand('');
    setSelectedProduct('total');
    setSimResults(null);
  };

  // Filtrar productos según cascada y caja de búsqueda en el sidebar
  const filteredProducts = allProducts.filter(item => {
    if (department && item.department !== department) return false;
    if (category && item.category !== category) return false;
    if (brand && item.brand !== brand) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const getScaledData = () => {
    const activeProd = allProducts.find(p => p.sku === selectedProduct);
    const scale = activeProd ? activeProd.scale : 1.0;

    const scaled = forecastData.map(item => ({
      ...item,
      historical: item.historical ? Math.round(item.historical * scale) : null,
      forecast: item.forecast ? Math.round(item.forecast * scale) : null,
      lower: item.lower ? Math.round(item.lower * scale) : null,
      upper: item.upper ? Math.round(item.upper * scale) : null,
    }));

    const junIndex = scaled.findIndex(item => item.month === 'Jun');
    const julIndex = scaled.findIndex(item => item.month === 'Jul');
    if (junIndex !== -1 && julIndex !== -1) {
      scaled[junIndex].forecast = scaled[junIndex].historical;
      scaled[junIndex].lower = scaled[junIndex].historical;
      scaled[junIndex].upper = scaled[junIndex].historical;
    }

    return scaled;
  };

  const getCombinedData = () => {
    const scaled = getScaledData();
    if (!simResults) return scaled;
    
    const combined = scaled.map(item => {
      const simItem = simResults.find(s => s.month === item.month);
      return {
        ...item,
        simulated: simItem ? simItem.simulated : null
      };
    });

    const junIndex = combined.findIndex(item => item.month === 'Jun');
    if (junIndex !== -1) {
      combined[junIndex].simulated = combined[junIndex].historical;
    }

    return combined;
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

  const presetStyle = (isActive) => ({
    background: isActive ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.03)',
    border: `1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
    color: isActive ? '#38bdf8' : '#94a3b8',
    padding: '0.35rem 0.7rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  });

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

      {stockoutAlert && (
        <div className="warning-banner" style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} style={{ color: '#f87171' }} />
          <span>
            <strong>Alerta de Abastecimiento:</strong> El forecast de <strong>{stockoutAlert.month}</strong> ({stockoutAlert.forecast.toLocaleString('es-AR')} un.) supera el stock de seguridad ({stockoutAlert.threshold.toLocaleString('es-AR')} un.). Se sugiere coordinar una orden de compra o reabastecimiento.
          </span>
        </div>
      )}

      <div className="card filters-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Filtros de Búsqueda de Predicciones</h3>
          {(department || category || brand || selectedProduct !== 'total') && (
            <button 
              className="btn-secondary" 
              onClick={handleClearFilters}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              <X size={14} /> Limpiar Filtros
            </button>
          )}
        </div>
        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="filter-group">
            <label>Departamento</label>
            <select value={department} onChange={handleDepartmentChange}>
              <option value="">Todos los Departamentos</option>
              {filterOptions?.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Categoría</label>
            <select value={category} onChange={handleCategoryChange}>
              <option value="">Todas las Categorías</option>
              {department 
                ? filterOptions?.categories[department]?.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                : filterOptions && Array.from(new Set(Object.values(filterOptions.categories).flat())).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
              }
            </select>
          </div>

          <div className="filter-group">
            <label>Marca</label>
            <select value={brand} onChange={handleBrandChange}>
              <option value="">Todas las Marcas</option>
              {filterOptions?.brands
                .filter(b => {
                  if (category) {
                    const allowedBrands = categoryBrands[category] || [];
                    return allowedBrands.includes(b);
                  }
                  if (department) {
                    const allowedBrands = deptBrands[department] || [];
                    return allowedBrands.includes(b);
                  }
                  return true;
                })
                .map(b => (
                  <option key={b} value={b}>{b}</option>
                ))
              }
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem' }}>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '420px', padding: '1rem', overflow: 'hidden' }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buscar SKU o Nombre
            </label>
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar SKU o nombre..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                outline: 'none',
                marginTop: '0.35rem',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
            />
          </div>
          
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem',
            paddingRight: '0.25rem'
          }}>
            <div 
              onClick={() => { setSelectedProduct('total'); setSimResults(null); }}
              style={{
                padding: '0.65rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                background: selectedProduct === 'total' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${selectedProduct === 'total' ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)'}`,
                color: selectedProduct === 'total' ? '#38bdf8' : '#cbd5e1',
                fontSize: '0.82rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              Consolidado Total General
            </div>
            
            {filteredProducts.map(p => {
              const isSelected = selectedProduct === p.sku;
              return (
                <div 
                  key={p.sku}
                  onClick={() => { setSelectedProduct(p.sku); setSimResults(null); }}
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)'}`,
                    color: isSelected ? '#38bdf8' : '#f8fafc',
                    fontSize: '0.82rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: isSelected ? '#38bdf8' : '#64748b', fontFamily: 'monospace', fontWeight: 'bold' }}>{p.sku}</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '1.25rem' }}>
                No se encontraron productos
              </span>
            )}
          </div>
        </div>

        <div className="card chart-card forecast-chart-card" style={{ height: '420px', margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1.15rem' }}>
                {selectedProduct === 'total' 
                  ? 'Pronóstico de Demanda - Consolidado Total General' 
                  : `Pronóstico de Demanda - SKU: ${selectedProduct} (${allProducts.find(p => p.sku === selectedProduct)?.name})`
                }
              </h3>
            </div>
            <div className="legend-pills">
              <span className="legend-pill historical">Histórico</span>
              <span className="legend-pill forecast">Forecast</span>
              <span className="legend-pill confidence">Confianza (±10%)</span>
              {simResults && <span className="legend-pill simulated">Simulado</span>}
            </div>
          </div>
          
          <div className="chart-container" style={{ height: '340px', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="forecastHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#94a3b8'}} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} tickLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                
                <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(129, 140, 248, 0.06)" name="Límite Superior" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="none" name="Límite Inferior" />
                
                <Area type="monotone" dataKey="historical" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#forecastHist)" name="Histórico" />
                
                <Area type="monotone" dataKey="forecast" stroke="#818cf8" strokeWidth={3} strokeDasharray="5 5" fill="none" name="Forecast Oficial" />
                
                <Area type="monotone" dataKey="upper" stroke="rgba(129, 140, 248, 0.2)" strokeWidth={1} strokeDasharray="2 2" fill="none" name="Intervalo Confianza" />
                <Area type="monotone" dataKey="lower" stroke="rgba(129, 140, 248, 0.2)" strokeWidth={1} strokeDasharray="2 2" fill="none" />

                {simResults && (
                  <Area type="monotone" dataKey="simulated" stroke="#34d399" strokeWidth={3.5} fill="none" name="Simulado" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="forecast-bottom-grid">
        
        <div className="card simulator-card">
          <div className="simulator-header">
            <Sparkles size={24} className="simulator-sparkle-icon" />
            <h3>Simulador de Escenarios</h3>
          </div>
          <p className="simulator-desc">Modificá los parámetros operativos para simular el impacto en la demanda en tiempo real.</p>
          
          <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Escenarios Predefinidos</span>
            <div className="preset-buttons" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => { setPriceChange(0); setMarketingChange(0); }}
                style={presetStyle(priceChange === 0 && marketingChange === 0)}
              >
                Base
              </button>
              <button 
                type="button"
                onClick={() => { setPriceChange(-5); setMarketingChange(30); }}
                style={presetStyle(priceChange === -5 && marketingChange === 30)}
              >
                ⚡ Optimista
              </button>
              <button 
                type="button"
                onClick={() => { setPriceChange(5); setMarketingChange(10); }}
                style={presetStyle(priceChange === 5 && marketingChange === 10)}
              >
                💰 Ajuste de Precio
              </button>
              <button 
                type="button"
                onClick={() => { setPriceChange(0); setMarketingChange(-15); }}
                style={presetStyle(priceChange === 0 && marketingChange === -15)}
              >
                📉 Recorte
              </button>
            </div>
          </div>

          <div className="simulator-sliders">
            <div className="slider-group">
              <div className="slider-label-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Coins size={14} style={{ color: '#94a3b8' }} />
                  <label>Variación de Precio Unitario</label>
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Megaphone size={14} style={{ color: '#94a3b8' }} />
                  <label>Presupuesto de Marketing</label>
                </div>
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

          {simStatus === 'SUCCESS' && simResults && (
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="card feature-importance-card" style={{ margin: 0 }}>
            <h3>Factores del Modelo Predictivo (Feature Importance)</h3>
            <p className="subtitle">Muestra las variables de negocio que tienen mayor impacto en las estimaciones del modelo de IA</p>
            <div className="feature-chart-container" style={{ height: '180px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.95}/>
                    </linearGradient>
                    <linearGradient id="barPurple" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.95}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                  <XAxis type="number" domain={[0, 50]} stroke="#64748b" tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{fill: '#f8fafc', fontSize: 11}} width={140} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }}/>
                  <Bar dataKey="weight" radius={[0, 6, 6, 0]}>
                    <LabelList dataKey="weight" position="right" formatter={(v) => `${v}%`} style={{ fill: '#cbd5e1', fontSize: 10, fontWeight: '700' }} />
                    {featureImportance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#barBlue)' : 'url(#barPurple)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card model-info-card technical-info-card" style={{ margin: 0 }}>
            <div className="simulator-header">
              <Sparkles size={20} className="simulator-sparkle-icon" />
              <h3>Detalles del Modelo Activo</h3>
            </div>
            <div className="model-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1.25rem 0 0.75rem 0' }}>
              <div className="info-item-tech">
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Algoritmo</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc' }}>XGBoost Regressor</span>
              </div>
              <div className="info-item-tech">
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Versión</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>v2.4.1</span>
              </div>
              <div className="info-item-tech">
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precisión MAPE</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399' }}>4.85%</span>
              </div>
              <div className="info-item-tech">
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrenado</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#cbd5e1' }}>08/07/2026</span>
              </div>
            </div>
            <p className="simulator-desc" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#64748b', marginTop: '0.75rem' }}>
              El pronóstico (Forecast) se calcula a nivel mensual combinando el historial consolidado de la tabla <span style={{ fontFamily: 'monospace', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>VENTAS_MENSUALES</span> con variables de clima e inflación. El área sombreada representa el intervalo de confianza del ±10% basado en el error histórico del modelo.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForecastView;
