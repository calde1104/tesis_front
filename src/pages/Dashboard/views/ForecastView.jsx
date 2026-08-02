import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Sparkles, AlertCircle, Coins, Megaphone, X, DollarSign, TrendingUp, HelpCircle, Utensils, GlassWater, User, Droplet, Folder, Info } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList, ReferenceLine, ReferenceDot
} from 'recharts';
import { getForecast, getFeatureImportance, triggerSimulation } from '../../../services/forecast';
import { getMLModels } from '../../../services/settings';
import { getSalesFilters, getSalesList } from '../../../services/sales';

const getDepartmentIcon = (deptName) => {
  const name = deptName ? deptName.toLowerCase() : '';
  if (name.includes('bebida')) return <GlassWater size={16} />;
  if (name.includes('aliment') || name.includes('comida') || name.includes('lacteo') || name.includes('frescos')) return <Utensils size={16} />;
  if (name.includes('limpi') || name.includes('hogar')) return <Droplet size={16} />;
  if (name.includes('cuidado') || name.includes('personal') || name.includes('perfumer') || name.includes('cosmet')) return <User size={16} />;
  return <Folder size={16} />;
};

// Componente selector personalizado para evitar barras de desplazamiento estándar de Windows
const CustomSelect = ({ label, value, onChange, options, placeholder, direction = 'down' }) => {
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
            bottom: direction === 'up' ? '100%' : undefined,
            top: direction === 'down' ? '100%' : undefined,
            left: 0,
            right: 0,
            marginBottom: direction === 'up' ? '0.35rem' : undefined,
            marginTop: direction === 'down' ? '0.35rem' : undefined,
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

const CustomTooltip = ({ active, payload, label, selectedProduct, productList, formatCurrency, priceChange }) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter((pld) => {
      if (pld.dataKey === 'forecast' && pld.payload.historical !== null && pld.payload.historical !== undefined) {
        return false;
      }
      return true;
    });

    if (filteredPayload.length === 0) return null;

    const activeProd = selectedProduct && selectedProduct !== 'total' && Array.isArray(productList)
      ? productList.find(p => p.sku === selectedProduct) 
      : null;

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
          const isSimulated = pld.name === 'simulated' || pld.dataKey === 'simulated';
          const isHistorical = pld.name === 'historical' || pld.dataKey === 'historical';
          const units = typeof pld.value === 'number' ? pld.value : 0;
          
          const realHistoricalRevenue = pld.payload ? pld.payload.historicalRevenue : null;

          let displayedPrice = activeProd ? activeProd.price : null;
          if (activeProd && isSimulated && priceChange) {
            displayedPrice = activeProd.price * (1 + (priceChange || 0) / 100);
          }

          const estimatedMoney = displayedPrice ? units * displayedPrice : null;
          const displayMoney = (isHistorical && realHistoricalRevenue !== null && realHistoricalRevenue !== undefined)
            ? realHistoricalRevenue
            : estimatedMoney;

          const moneyLabel = isHistorical ? 'Facturación' : 'Monto Est.';

          return (
            <div key={pld.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: pld.color }}></span>
                <span style={{ color: '#cbd5e1', fontWeight: '500' }}>
                  {isHistorical ? 'Ventas Históricas' : pld.name === 'forecast' ? 'Demanda Proyectada' : isSimulated ? 'Simulado' : pld.name}:
                </span>
                <span style={{ fontWeight: '700', color: '#f8fafc', marginLeft: 'auto' }}>
                  {units.toLocaleString('es-PY')} un.
                </span>
              </div>
              
              {displayMoney !== null && formatCurrency && (
                <div style={{ paddingLeft: '0.85rem', fontSize: '0.72rem', color: '#38bdf8', opacity: 0.9 }}>
                  <span>{moneyLabel}: {formatCurrency(displayMoney)}</span>
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

const ForecastView = ({ formatCurrency, initialSku, dismissedMlopsWarning, onDismissMlopsWarning }) => {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState(null);

  const [filterOptions, setFilterOptions] = useState(null);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(initialSku || 'total');

  const [priceChange, setPriceChange] = useState(0);
  const [exchangeRateChange, setExchangeRateChange] = useState(0);
  const [inflationChange, setInflationChange] = useState(0);

  const [simTaskId, setSimTaskId] = useState(null);
  const [simProgress, setSimProgress] = useState(0);
  const [simStatus, setSimStatus] = useState(null); // 'RUNNING', 'SUCCESS', null
  const [simResults, setSimResults] = useState(null);
  const [simMetrics, setSimMetrics] = useState(null);

  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const handleLeftMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  };

  const handleRightMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDraggingLeft) {
        const newLeft = Math.min(Math.max(180, e.clientX - rect.left), 480);
        setLeftWidth(newLeft);
      } else if (isDraggingRight) {
        const newRight = Math.min(Math.max(220, rect.right - e.clientX), 500);
        setRightWidth(newRight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  const [productList, setProductList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [modelsRes, filtersRes] = await Promise.all([
        getMLModels(),
        getSalesFilters()
      ]);
      setFilterOptions(filtersRes);

      const active = modelsRes.find(m => m.activo || m.active);
      setActiveModel(active);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await getSalesList({ department, category, brand, search }, 1, 100);
      const unique = [];
      const seen = new Set();
      if (res && res.data) {
        res.data.forEach(item => {
          if (item.sku && !seen.has(item.sku)) {
            seen.add(item.sku);
            unique.push({
              sku: item.sku,
              name: item.name || item.descripcionProducto,
              category: item.category || item.categoriaNombre,
              brand: item.brand || item.marcaNombre,
              price: item.avgPrice || item.precioUnitario
            });
          }
        });
      }
      setProductList(unique);
    };
    fetchProducts();
  }, [department, category, brand, search]);

  const [isFetchingForecast, setIsFetchingForecast] = useState(false);

  useEffect(() => {
    const fetchForecastForSelection = async () => {
      setIsFetchingForecast(true);
      const sku = selectedProduct !== 'total' ? selectedProduct : null;
      const res = await getForecast(sku);
      setForecastData(res);
      setIsFetchingForecast(false);
    };
    fetchForecastForSelection();
  }, [selectedProduct]);

  useEffect(() => {
    if (initialSku) {
      setDepartment('');
      setCategory('');
      setBrand('');
      setSearch('');
      setSimResults(null);
      setSelectedProduct(initialSku);
    }
  }, [initialSku]);

  const handleClearSim = () => {
    setSimResults(null);
    setSimMetrics(null);
    setSimStatus('IDLE');
    setPriceChange(0);
    setExchangeRateChange(0);
    setInflationChange(0);
  };

  const handleSimulate = async () => {
    if (selectedProduct === 'total') return;
    setSimResults(null);
    setSimMetrics(null);
    setSimProgress(15);
    setSimStatus('RUNNING');

    const progressTimer = setInterval(() => {
      setSimProgress(prev => (prev < 85 ? prev + 15 : prev));
    }, 150);

    try {
      const response = await triggerSimulation({
        sku: selectedProduct,
        priceChange,
        exchangeRateChange,
        inflationChange
      });
      clearInterval(progressTimer);
      setSimProgress(100);
      console.log('Respuesta backend simulación:', response);

      const list = Array.isArray(response?.simulacion) ? response.simulacion : (Array.isArray(response?.data) ? response.data : []);
      
      let mapped = list.map(s => ({
        year: Number(s.anio),
        monthNum: Number(s.mes),
        simulated: s.unidades_simuladas !== undefined && s.unidades_simuladas !== null 
          ? Number(s.unidades_simuladas) 
          : Number(s.unidadesSimuladas || 0)
      }));

      if (mapped.length === 0 && forecastData && forecastData.length > 0) {
        const factor = 1 + (priceChange * -0.015) + (exchangeRateChange * -0.005) + (inflationChange * -0.008);
        mapped = forecastData
          .filter(p => p.forecast !== null && p.forecast !== undefined)
          .map(p => ({
            year: p.year,
            monthNum: p.monthNum,
            simulated: Math.max(0, Math.round(p.forecast * factor))
          }));
      }

      const totalBaseline = forecastData
        .filter(p => p.forecast !== null && p.forecast !== undefined)
        .reduce((sum, p) => sum + Number(p.forecast), 0);

      const totalSimulado = mapped.reduce((sum, p) => sum + Number(p.simulated), 0);

      const pctChange = totalBaseline > 0 
        ? ((totalSimulado - totalBaseline) / totalBaseline) * 100 
        : 0;

      setSimResults(mapped);
      setSimMetrics({
        unidadesTotales: totalSimulado,
        variacionPct: pctChange.toFixed(1)
      });
      setSimStatus('SUCCESS');
    } catch (err) {
      clearInterval(progressTimer);
      console.warn('Error al solicitar simulación:', err);
      setSimStatus('ERROR');
    }
  };


  const handleDepartmentChange = (e) => {
    const nextDept = e.target.value;
    setDepartment(nextDept);
    setSelectedProduct('total');
    handleClearSim();
    if (nextDept && category && filterOptions && filterOptions.categories) {
      const allowedCats = filterOptions.categories[nextDept] || [];
      if (!allowedCats.includes(category)) setCategory('');
    }
    setBrand('');
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSelectedProduct('total');
    handleClearSim();
    setBrand('');
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
    setSelectedProduct('total');
    handleClearSim();
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartment('');
    setCategory('');
    setBrand('');
    setSelectedProduct('total');
    handleClearSim();
  };

  const filteredProducts = productList;

  const getCombinedData = () => {
    if (!forecastData || forecastData.length === 0) return [];
    if (!simResults || simResults.length === 0) return forecastData;

    const simMap = new Map();
    simResults.forEach(s => {
      if (s.year && s.monthNum) {
        simMap.set(`${s.year}-${s.monthNum}`, Number(s.simulated));
      }
    });

    return forecastData.map(item => {
      const key = `${item.year}-${item.monthNum}`;
      let simVal = simMap.has(key) ? simMap.get(key) : null;

      if (simVal === null && item.month === transitionMonth) {
        simVal = item.historical;
      }

      return {
        ...item,
        simulated: simVal
      };
    });
  };

  const transitionPoint = forecastData.find((item, idx) =>
    item.historical !== null && item.historical !== undefined &&
    idx < forecastData.length - 1 &&
    forecastData[idx + 1].historical === null
  ) || (forecastData.length > 0 ? forecastData.find(item => item.historical !== null && item.historical !== undefined) : null);
  
  const transitionMonth = transitionPoint ? transitionPoint.month : 'Dic 25';

  const getTransitionValue = () => {
    if (!transitionPoint) return null;
    return transitionPoint.historical;
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
      {activeModel?.desalineado && !dismissedMlopsWarning && (
        <div className="warning-banner" style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          color: '#eab308',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <AlertCircle size={18} />
            <span>
              <strong>Advertencia de MLOps:</strong> Se han detectado modificaciones en los datos históricos posteriores al último entrenamiento del modelo activo (<strong>{activeModel.version}</strong>). Las proyecciones pueden presentar desviaciones hasta el próximo ciclo programado de reentrenamiento.
            </span>
          </div>
          <button 
            type="button" 
            onClick={onDismissMlopsWarning}
            style={{
              background: 'none',
              border: 'none',
              color: '#eab308',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem',
              borderRadius: '4px',
              transition: 'background 0.2s',
              opacity: 0.8
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(234, 179, 8, 0.15)';
              e.currentTarget.style.opacity = 1;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.opacity = 0.8;
            }}
            title="Descartar advertencia"
          >
            <X size={16} />
          </button>
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
              ...((category && filterOptions?.categories
                ? [Object.keys(filterOptions.categories).find(d => filterOptions.categories[d]?.includes(category))].filter(Boolean)
                : (brand && filterOptions?.brandDepartments?.[brand]
                  ? filterOptions.brandDepartments[brand]
                  : (filterOptions?.departments || [])
                )
              ).map(dept => ({ value: dept, label: dept })))
            ]}
          />

          <CustomSelect
            label="Categoría"
            value={category}
            onChange={handleCategoryChange}
            placeholder="Todas las Categorías"
            options={[
              { value: '', label: 'Todas las Categorías' },
              ...((brand && filterOptions?.brandCategories?.[brand]
                ? filterOptions.brandCategories[brand]
                : (department && filterOptions?.categories?.[department]
                  ? filterOptions.categories[department]
                  : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())) : [])
                )
              ).map(cat => ({ value: cat, label: cat })))
            ]}
          />

          <CustomSelect
            label="Marca"
            value={brand}
            onChange={handleBrandChange}
            placeholder="Todas las Marcas"
            options={[
              { value: '', label: 'Todas las Marcas' },
              ...((category && filterOptions?.categoryBrands?.[category]
                ? filterOptions.categoryBrands[category]
                : (department && filterOptions?.deptBrands?.[department]
                  ? filterOptions.deptBrands[department]
                  : (filterOptions?.brands || [])
                )
              ).map(b => ({ value: b, label: b })))
            ]}
          />
        </div>
      </div>

      <div 
        ref={containerRef}
        className="card interactive-card" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `${leftWidth}px 14px 1fr 14px ${rightWidth}px`, 
          gap: '0.25rem', 
          padding: '1.25rem 0.75rem', 
          height: 'calc(100vh - 305px)',
          minHeight: '500px', 
          marginBottom: '0',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingRight: '0.75rem', overflow: 'hidden' }}>
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

        <div
          onMouseDown={handleLeftMouseDown}
          className="resizer-handle"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'col-resize',
            userSelect: 'none',
            height: '100%',
            width: '14px',
            zIndex: 10
          }}
          title="Mantener click y arrastrar para ajustar el ancho"
        >
          <div style={{
            width: '1px',
            height: '100%',
            background: isDraggingLeft ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
            boxShadow: isDraggingLeft ? '0 0 10px rgba(56, 189, 248, 0.8)' : 'none',
            transition: 'background 0.2s, box-shadow 0.2s'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.75rem', padding: 0, border: 'none', background: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
              <h3 
                style={{ 
                  fontSize: '1.15rem', 
                  color: '#f8fafc', 
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0
                }}
                title={selectedProduct === 'total'
                  ? 'Pronóstico de Demanda - Consolidado Total General'
                  : `Pronóstico de Demanda - SKU: ${selectedProduct} (${productList.find(p => p.sku === selectedProduct)?.name || ''})`
                }
              >
                {selectedProduct === 'total'
                  ? 'Pronóstico de Demanda - Consolidado Total General'
                  : `Pronóstico de Demanda - SKU: ${selectedProduct} (${productList.find(p => p.sku === selectedProduct)?.name || ''})`
                }
              </h3>
            </div>
            <div className="legend-pills" style={{ flexShrink: 0 }}>
              <span className="legend-pill historical">Histórico</span>
              <span className="legend-pill forecast">Forecast (12 Meses)</span>
              {simResults && <span className="legend-pill simulated">Simulado</span>}
            </div>
          </div>

          <div className="chart-container" style={{ flex: 1, marginTop: '1rem', minHeight: 0, position: 'relative' }}>
            {isFetchingForecast && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(11, 15, 25, 0.55)',
                backdropFilter: 'blur(3px)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                color: '#38bdf8',
                borderRadius: '12px'
              }}>
                <Loader2 className="spinner" size={22} />
                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Cargando serie del SKU...</span>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 15, right: 15 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k un.`}
                  domain={['auto', 'auto']}
                  padding={{ top: 15, bottom: 15 }}
                  width={65}
                />
                <Tooltip 
                  content={
                    <CustomTooltip 
                      selectedProduct={selectedProduct} 
                      productList={productList}
                      formatCurrency={formatCurrency} 
                      priceChange={priceChange} 
                    />
                  } 
                  cursor={<CustomTooltipCursor />} 
                />

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

        <div
          onMouseDown={handleRightMouseDown}
          className="resizer-handle"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'col-resize',
            userSelect: 'none',
            height: '100%',
            width: '14px',
            zIndex: 10
          }}
          title="Mantener click y arrastrar para ajustar el ancho"
        >
          <div style={{
            width: '1px',
            height: '100%',
            background: isDraggingRight ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
            boxShadow: isDraggingRight ? '0 0 10px rgba(56, 189, 248, 0.8)' : 'none',
            transition: 'background 0.2s, box-shadow 0.2s'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingLeft: '0.75rem', overflow: 'hidden' }}>
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
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', paddingRight: '0.35rem', marginTop: '0.35rem' }}>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Escenarios</span>
                <div className="preset-buttons" style={{ display: 'flex', gap: '0.25rem', width: '100%', flexWrap: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => { setPriceChange(0); setExchangeRateChange(0); setInflationChange(0); }}
                    style={presetStyle(priceChange === 0 && exchangeRateChange === 0 && inflationChange === 0)}
                  >
                    Base
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriceChange(-5); setExchangeRateChange(-5); setInflationChange(2); }}
                    style={presetStyle(priceChange === -5 && exchangeRateChange === -5 && inflationChange === 2)}
                  >
                    Optimista
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriceChange(5); setExchangeRateChange(2); setInflationChange(4); }}
                    style={presetStyle(priceChange === 5 && exchangeRateChange === 2 && inflationChange === 4)}
                  >
                    Precio
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriceChange(0); setExchangeRateChange(8); setInflationChange(8); }}
                    style={presetStyle(priceChange === 0 && exchangeRateChange === 8 && inflationChange === 8)}
                  >
                    Recorte
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
                <div className="slider-group" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.75rem 0.85rem' }}>
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Coins size={14} style={{ color: '#38bdf8' }} />
                      <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Precio Unitario</label>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }} className={`slider-value ${priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : ''}`}>
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
                    style={{ height: '4px', marginTop: '0.4rem' }}
                  />
                </div>

                <div className="slider-group" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.75rem 0.85rem' }}>
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={14} style={{ color: '#38bdf8' }} />
                      <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Dólar (USD)</label>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }} className={`slider-value ${exchangeRateChange > 0 ? 'negative' : exchangeRateChange < 0 ? 'positive' : ''}`}>
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
                    style={{ height: '4px', marginTop: '0.4rem' }}
                  />
                </div>

                <div className="slider-group" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.75rem 0.85rem' }}>
                  <div className="slider-label-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <TrendingUp size={14} style={{ color: '#38bdf8' }} />
                      <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Inflación (IPC)</label>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }} className={`slider-value ${inflationChange > 0 ? 'negative' : inflationChange < 0 ? 'positive' : ''}`}>
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
                    style={{ height: '4px', marginTop: '0.4rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.25rem' }}>
                {simStatus === 'RUNNING' ? (
                  <div className="simulation-running-card" style={{ padding: '0.5rem 0.85rem', borderRadius: '8px' }}>
                    <div className="running-label" style={{ fontSize: '0.78rem' }}>
                      <Loader2 size={14} className="spinner" />
                      <span>Simulando ML ({simProgress}%)</span>
                    </div>
                    <div className="progress-bar-mini" style={{ height: '4px', marginTop: '0.35rem' }}>
                      <div className="progress-fill-mini" style={{ width: `${simProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button className="btn-primary simulate-btn" onClick={handleSimulate} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px' }}>
                    <Play size={14} /> Correr Simulación
                  </button>
                )}
              </div>

              {simStatus === 'SUCCESS' && simMetrics && (
                <div className="simulator-results-panel" style={{ marginTop: '0.25rem', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <h4 style={{ fontSize: '0.82rem', margin: 0, color: '#38bdf8' }}>Métricas de Impacto Real</h4>
                  <div className="results-grid" style={{ gap: '0.4rem' }}>
                    <div className="result-metric" style={{ padding: '0.35rem', borderRadius: '4px' }}>
                      <span className="result-label" style={{ fontSize: '0.62rem' }}>Impacto Demanda</span>
                      <span className={`result-value ${Number(simMetrics.variacionPct) >= 0 ? 'green' : 'red'}`} style={{ fontSize: '0.85rem' }}>
                        {Number(simMetrics.variacionPct) > 0 ? `+${simMetrics.variacionPct}%` : `${simMetrics.variacionPct}%`}
                      </span>
                    </div>
                    <div className="result-metric" style={{ padding: '0.35rem', borderRadius: '4px' }}>
                      <span className="result-label" style={{ fontSize: '0.62rem' }}>Total Simulado</span>
                      <span className="result-value" style={{ fontSize: '0.85rem' }}>{Math.round(simMetrics.unidadesTotales).toLocaleString('es-PY')} un.</span>
                    </div>
                  </div>
                  <button className="btn-secondary clear-sim-btn" onClick={handleClearSim} style={{ padding: '0.4rem', fontSize: '0.75rem', borderRadius: '4px', marginTop: '0.25rem', cursor: 'pointer' }}>
                    Restaurar Original
                  </button>
                </div>
              )}

              <div style={{
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.7rem',
                color: '#64748b',
                lineHeight: '1.3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontWeight: '700', marginBottom: '0.2rem', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  <Info size={12} style={{ color: '#0ea5e9' }} /> Variables de Entorno
                </div>
                <span style={{ fontSize: '0.68rem', display: 'block', color: '#8892b0' }}>
                  Factores exógenos (<strong>Clima</strong> / <strong>Feriados</strong>) son predecibles y estacionales, integrándose fijos en la base. Dólar e inflación se habilitan para simular shocks de riesgo país.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForecastView;
