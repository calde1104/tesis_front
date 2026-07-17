import { useState, useEffect } from 'react';
import { Play, Loader2, Sparkles, AlertCircle, Coins, Megaphone, X, DollarSign, TrendingUp } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList, ReferenceLine, ReferenceDot
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

// Componente selector personalizado para evitar barras de desplazamiento estándar de Windows
const CustomSelect = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const selectedOptionLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="filter-group" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <label>{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${isOpen ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '8px',
          color: '#f8fafc',
          padding: '0.6rem 0.8rem',
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(14, 165, 233, 0.45)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOptionLabel}</span>
        <span style={{ 
          fontSize: '0.65rem', 
          color: '#64748b', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div 
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.35rem',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              style={{
                padding: '0.55rem 0.8rem',
                fontSize: '0.88rem',
                color: value === opt.value ? '#38bdf8' : '#cbd5e1',
                background: value === opt.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
        {filteredPayload.map((pld) => (
          <div key={pld.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: pld.color }}></span>
            <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{pld.name === 'historical' ? 'Ventas Históricas' : pld.name === 'forecast' ? 'Demanda Proyectada' : pld.name === 'simulated' ? 'Simulado' : pld.name}:</span>
            <span style={{ fontWeight: '700', color: '#f8fafc', marginLeft: 'auto' }}>
              {typeof pld.value === 'number' ? `${pld.value.toLocaleString('es-AR')} un.` : pld.value}
            </span>
          </div>
        ))}
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

  const [priceChange, setPriceChange] = useState(0);
  const [marketingChange, setMarketingChange] = useState(0);
  const [exchangeRateChange, setExchangeRateChange] = useState(0);
  const [inflationChange, setInflationChange] = useState(0);
  
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
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSimulate = async () => {
    if (selectedProduct === 'total') return; // Restringir simulación en el consolidado
    setSimResults(null);
    setSimMetrics(null);
    setSimProgress(0);
    setSimStatus('RUNNING');
    
    const { taskId } = await triggerSimulation({ 
      priceChange, 
      marketingChange,
      exchangeRateChange,
      inflationChange
    });
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
      month: item.month,
      historical: item.historical ? Math.round(item.historical * scale) : null,
      forecast: item.forecast ? Math.round(item.forecast * scale) : null,
    }));

    const junIndex = scaled.findIndex(item => item.month === 'Jun 26');
    const julIndex = scaled.findIndex(item => item.month === 'Jul 26');
    if (junIndex !== -1 && julIndex !== -1) {
      scaled[junIndex].forecast = scaled[junIndex].historical;
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

    const junIndex = combined.findIndex(item => item.month === 'Jun 26');
    if (junIndex !== -1) {
      combined[junIndex].simulated = combined[junIndex].historical;
    }

    return combined;
  };

  const transitionPoint = forecastData.find((item, idx) => 
    item.historical !== null && 
    (item.forecast === null || item.forecast === undefined) && 
    idx < forecastData.length - 1 && 
    forecastData[idx + 1].forecast !== null
  );
  const transitionMonth = transitionPoint ? transitionPoint.month : 'Jun 26';
  
  const getTransitionValue = () => {
    if (!transitionPoint) return null;
    const activeProd = allProducts.find(p => p.sku === selectedProduct);
    const scale = activeProd ? activeProd.scale : 1.0;
    return Math.round(transitionPoint.historical * scale);
  };
  const transitionValue = getTransitionValue();

  const presetStyle = (isActive) => ({
    background: isActive ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.03)',
    border: `1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
    color: isActive ? '#38bdf8' : '#94a3b8',
    padding: '0.35rem 0.1rem',
    borderRadius: '6px',
    fontSize: '0.70rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    flex: 1,
    textAlign: 'center'
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
          <CustomSelect
            label="Departamento"
            value={department}
            onChange={handleDepartmentChange}
            placeholder="Todos los Departamentos"
            options={[
              { value: '', label: 'Todos los Departamentos' },
              ...(filterOptions?.departments.map(dept => ({ value: dept, label: dept })) || [])
            ]}
          />

          <CustomSelect
            label="Categoría"
            value={category}
            onChange={handleCategoryChange}
            placeholder="Todas las Categorías"
            options={[
              { value: '', label: 'Todas las Categorías' },
              ...(department 
                ? (filterOptions?.categories[department]?.map(cat => ({ value: cat, label: cat })) || [])
                : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())).map(cat => ({ value: cat, label: cat })) : [])
              )
            ]}
          />

          <CustomSelect
            label="Marca"
            value={brand}
            onChange={handleBrandChange}
            placeholder="Todas las Marcas"
            options={[
              { value: '', label: 'Todas las Marcas' },
              ...(filterOptions?.brands
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
                .map(b => ({ value: b, label: b })) || []
              )
            ]}
          />
        </div>
      </div>

      <div className="card interactive-card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: '1.5rem', padding: '1.25rem', height: '580px', marginBottom: '1.25rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '1.5rem', overflow: 'hidden' }}>
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
          
          <div className="custom-scrollbar" style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem',
            paddingRight: '0.5rem'
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

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: 0, border: 'none', background: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: '600' }}>
                {selectedProduct === 'total' 
                  ? 'Pronóstico de Demanda - Consolidado Total General' 
                  : `Pronóstico de Demanda - SKU: ${selectedProduct} (${allProducts.find(p => p.sku === selectedProduct)?.name})`
                }
              </h3>
            </div>
            <div className="legend-pills">
              <span className="legend-pill historical">Histórico</span>
              <span className="legend-pill forecast">Forecast (12 Meses)</span>
              {simResults && <span className="legend-pill simulated">Simulado</span>}
            </div>
          </div>
          
          <div className="chart-container" style={{ flex: 1, marginTop: '1rem', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
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
                  tickFormatter={(value) => `${value/1000}k un.`}
                  domain={['auto', 'auto']}
                  padding={{ top: 15, bottom: 15 }}
                  width={65}
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
                
                {transitionMonth && transitionValue !== null && transitionValue !== undefined && (
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
                
                <Area type="monotone" dataKey="historical" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" name="historical" activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2, fill: '#040d21' }} connectNulls={true} />
                
                <Area 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#818cf8" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  fillOpacity={1} 
                  fill="url(#colorForecast)" 
                  name="forecast" 
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

                {simResults && (
                  <Area 
                    type="monotone" 
                    dataKey="simulated" 
                    stroke="#34d399" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSimulated)" 
                    name="Simulado" 
                    connectNulls={true} 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '1.5rem', overflow: 'hidden' }}>
          <div className="simulator-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={18} className="simulator-sparkle-icon" />
            <h3 style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: '600' }}>Simulador</h3>
          </div>
          
          {selectedProduct === 'total' ? (
            /* Disabled / Hint State when no specific SKU is selected */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: '#64748b',
              padding: '1rem',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              marginTop: '0.75rem'
            }}>
              <Sparkles size={28} style={{ color: '#334155', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', lineHeight: '1.4' }}>
                Seleccioná un SKU de la lista para simular
              </p>
              <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: '#475569', lineHeight: '1.3' }}>
                La simulación de elasticidades de precio y marketing requiere seleccionar un producto individual.
              </p>
            </div>
          ) : (
            /* Active Simulator controls */
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.35rem', marginTop: '0.5rem' }}>
              
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Escenarios</span>
                <div className="preset-buttons" style={{ display: 'flex', gap: '0.25rem', width: '100%', flexWrap: 'nowrap' }}>
                  <button 
                    type="button"
                    onClick={() => { setPriceChange(0); setMarketingChange(0); setExchangeRateChange(0); setInflationChange(0); }}
                    style={presetStyle(priceChange === 0 && marketingChange === 0 && exchangeRateChange === 0 && inflationChange === 0)}
                  >
                    Base
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setPriceChange(-5); setMarketingChange(30); setExchangeRateChange(-5); setInflationChange(2); }}
                    style={presetStyle(priceChange === -5 && marketingChange === 30 && exchangeRateChange === -5 && inflationChange === 2)}
                  >
                    Optimista
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setPriceChange(5); setMarketingChange(10); setExchangeRateChange(2); setInflationChange(4); }}
                    style={presetStyle(priceChange === 5 && marketingChange === 10 && exchangeRateChange === 2 && inflationChange === 4)}
                  >
                    Precio
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setPriceChange(0); setMarketingChange(-15); setExchangeRateChange(8); setInflationChange(8); }}
                    style={presetStyle(priceChange === 0 && marketingChange === -15 && exchangeRateChange === 8 && inflationChange === 8)}
                  >
                    Recorte
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="slider-group">
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Coins size={13} style={{ color: '#94a3b8' }} />
                      <label style={{ fontSize: '0.78rem' }}>Precio Unitario</label>
                    </div>
                    <span style={{ fontSize: '0.85rem' }} className={`slider-value ${priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : ''}`}>
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
                    style={{ height: '4px' }}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Megaphone size={13} style={{ color: '#94a3b8' }} />
                      <label style={{ fontSize: '0.78rem' }}>Marketing</label>
                    </div>
                    <span style={{ fontSize: '0.85rem' }} className={`slider-value ${marketingChange > 0 ? 'positive' : marketingChange < 0 ? 'negative' : ''}`}>
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
                    style={{ height: '4px' }}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DollarSign size={13} style={{ color: '#94a3b8' }} />
                      <label style={{ fontSize: '0.78rem' }}>Dólar (USD)</label>
                    </div>
                    <span style={{ fontSize: '0.85rem' }} className={`slider-value ${exchangeRateChange > 0 ? 'negative' : exchangeRateChange < 0 ? 'positive' : ''}`}>
                      {exchangeRateChange > 0 ? `+${exchangeRateChange}` : exchangeRateChange}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    value={exchangeRateChange} 
                    onChange={(e) => setExchangeRateChange(parseInt(e.target.value))}
                    className="range-input"
                    style={{ height: '4px' }}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingUp size={13} style={{ color: '#94a3b8' }} />
                      <label style={{ fontSize: '0.78rem' }}>Inflación (IPC)</label>
                    </div>
                    <span style={{ fontSize: '0.85rem' }} className={`slider-value ${inflationChange > 0 ? 'negative' : inflationChange < 0 ? 'positive' : ''}`}>
                      {inflationChange > 0 ? `+${inflationChange}` : inflationChange}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="-5" 
                    max="15" 
                    value={inflationChange} 
                    onChange={(e) => setInflationChange(parseInt(e.target.value))}
                    className="range-input"
                    style={{ height: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.25rem' }}>
                {simStatus === 'RUNNING' ? (
                  <div className="simulation-running-card" style={{ padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
                    <div className="running-label" style={{ fontSize: '0.75rem' }}>
                      <Loader2 size={13} className="spinner" />
                      <span>Simulando ML ({simProgress}%)</span>
                    </div>
                    <div className="progress-bar-mini" style={{ height: '3px', marginTop: '0.25rem' }}>
                      <div className="progress-fill-mini" style={{ width: `${simProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button className="btn-primary simulate-btn" onClick={handleSimulate} style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem', borderRadius: '6px' }}>
                    <Play size={13} /> Correr Simulación
                  </button>
                )}
              </div>

              {simStatus === 'SUCCESS' && simMetrics && (
                <div className="simulator-results-panel" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <h4 style={{ fontSize: '0.82rem', margin: 0, color: '#38bdf8' }}>Métricas de Impacto</h4>
                  <div className="results-grid" style={{ gap: '0.4rem' }}>
                    <div className="result-metric" style={{ padding: '0.35rem', borderRadius: '4px' }}>
                      <span className="result-label" style={{ fontSize: '0.62rem' }}>Precisión R²</span>
                      <span className="result-value" style={{ fontSize: '0.85rem' }}>{(simMetrics.r2 * 100).toFixed(0)}%</span>
                    </div>
                    <div className="result-metric" style={{ padding: '0.35rem', borderRadius: '4px' }}>
                      <span className="result-label" style={{ fontSize: '0.62rem' }}>MAPE Sim.</span>
                      <span className="result-value green" style={{ fontSize: '0.85rem' }}>{simMetrics.mapeSimulado}</span>
                    </div>
                  </div>
                  <button className="btn-secondary clear-sim-btn" onClick={() => setSimResults(null)} style={{ padding: '0.4rem', fontSize: '0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                    Restaurar Original
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="forecast-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        <div className="card feature-importance-card interactive-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
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

        <div className="card model-info-card technical-info-card interactive-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          <p className="simulator-desc" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#64748b', marginTop: '0.75rem', flex: 1 }}>
            El pronóstico (Forecast) se calcula a nivel mensual combinando el historial consolidado de la tabla <span style={{ fontFamily: 'monospace', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>VENTAS_MENSUALES</span> con variables de clima e inflación. El área sombreada representa el intervalo de confianza del ±10% basado en el error histórico del modelo.
          </p>
        </div>

      </div>
    </div>
  );
};

export default ForecastView;
