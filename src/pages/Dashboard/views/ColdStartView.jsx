import { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, TrendingUp, HelpCircle, Utensils, GlassWater, 
  User, Droplet, Folder, AlertCircle, RefreshCw, BarChart3, Users,
  Layers, CheckCircle2, DollarSign, Activity, Percent, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { predictColdStart } from '../../../services/coldStart';
import { getSalesFilters, getDeptId, getCategoryId, getBrandId } from '../../../services/sales';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthsFullEs = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getDepartmentIcon = (deptName) => {
  const name = deptName ? deptName.toLowerCase() : '';
  if (name.includes('bebida')) return <GlassWater size={16} />;
  if (name.includes('aliment') || name.includes('comida') || name.includes('lacteo') || name.includes('frescos')) return <Utensils size={16} />;
  if (name.includes('limpi') || name.includes('hogar')) return <Droplet size={16} />;
  if (name.includes('cuidado') || name.includes('personal') || name.includes('perfumer') || name.includes('cosmet')) return <User size={16} />;
  return <Folder size={16} />;
};

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
    <div className="filter-group" style={{ position: 'relative', zIndex: isOpen ? 9999 : 1 }} onClick={(e) => e.stopPropagation()}>
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
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 10000,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(14, 165, 233, 0.15)'
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

const CustomColdStartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const monthName = monthsFullEs[(data.monthNum || 1) - 1] || data.month;

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(14, 165, 233, 0.2)',
        fontSize: '0.78rem',
        minWidth: '200px'
      }}>
        <div style={{
          color: '#f8fafc',
          fontWeight: '700',
          fontSize: '0.85rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.35rem',
          marginBottom: '0.45rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{monthName} {data.year}</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>M+{payload[0].payload.idxMes || ''}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
              Demanda Estimada:
            </span>
            <span style={{ fontWeight: '700', color: '#f8fafc' }}>
              {Number(data.units).toLocaleString('es-PY')} un.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
              Facturación Proyectada:
            </span>
            <span style={{ fontWeight: '700', color: '#f8fafc' }}>
              ₲ {Number(data.revenue).toLocaleString('es-PY')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
            <span>Rango de Confianza (±20%):</span>
            <span>[{Number(data.confidenceInf).toLocaleString('es-PY')} - {Number(data.confidenceSup).toLocaleString('es-PY')}]</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>Factor Estacional:</span>
            <span style={{ color: '#38bdf8', fontWeight: '600' }}>x{Number(data.seasonalFactor || 1).toFixed(3)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const ColdStartView = () => {
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    categories: {},
    brands: []
  });

  const [coldProductName, setColdProductName] = useState('');
  const [coldDepartment, setColdDepartment] = useState('');
  const [coldTargetCategory, setColdTargetCategory] = useState('');
  const [coldBrand, setColdBrand] = useState('');
  const [coldExpectedPrice, setColdExpectedPrice] = useState('');
  const [coldExpectedWeight, setColdExpectedWeight] = useState('');
  const [coldUnit, setColdUnit] = useState('lt');
  const [coldHorizon, setColdHorizon] = useState(12);

  const [coldPredicting, setColdPredicting] = useState(false);
  const [coldPredictionResult, setColdPredictionResult] = useState(null);
  const [coldError, setColdError] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('forecast'); // 'forecast' | 'twins'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const filtersRes = await getSalesFilters();
        if (filtersRes) {
          setFilterOptions(filtersRes);
          if (filtersRes.departments && filtersRes.departments.length > 0) {
            setColdDepartment(filtersRes.departments[0]);
          }
        }
      } catch (err) {
        console.error("Error al cargar filtros de catálogo:", err);
      }
    };
    fetchData();
  }, []);

  const handleColdStartSubmit = async (e) => {
    if (e) e.preventDefault();
    setColdError(null);

    if (!coldProductName.trim()) {
      setColdError("Ingrese el nombre o descripción del nuevo producto.");
      return;
    }
    if (!coldDepartment) {
      setColdError("Seleccione el departamento comercial.");
      return;
    }
    if (!coldTargetCategory) {
      setColdError("Seleccione la categoría objetivo.");
      return;
    }
    if (!coldBrand) {
      setColdError("Seleccione la marca del nuevo SKU.");
      return;
    }
    if (!coldExpectedPrice || Number(coldExpectedPrice) <= 0) {
      setColdError("Ingrese un precio sugerido válido mayor a 0.");
      return;
    }
    if (!coldExpectedWeight || Number(coldExpectedWeight) <= 0) {
      setColdError("Ingrese un contenido neto válido mayor a 0.");
      return;
    }

    setColdPredicting(true);
    setColdPredictionResult(null);

    try {
      const result = await predictColdStart({
        department: coldDepartment,
        category: coldTargetCategory,
        brand: coldBrand,
        name: coldProductName,
        expectedPrice: Number(coldExpectedPrice),
        weight: Number(coldExpectedWeight),
        unit: coldUnit,
        horizonteMeses: Number(coldHorizon) || 12
      });

      setColdPredictionResult(result);
      setActiveResultTab('forecast');
    } catch (err) {
      console.error("Error al ejecutar predicción Cold Start:", err);
      setColdError(err.message || "Error al comunicarse con el microservicio de IA.");
    } finally {
      setColdPredicting(false);
    }
  };

  const handleColdDepartmentChange = (deptId) => {
    setColdDepartment(deptId);
    setColdTargetCategory('');
    setColdBrand('');
  };

  const handleColdCategoryChange = (catId) => {
    setColdTargetCategory(catId);
  };

  const handleColdBrandChange = (brandId) => {
    setColdBrand(brandId);
  };

  const coldAllowedCategories = coldDepartment && filterOptions?.categories ? filterOptions.categories[coldDepartment] || [] : [];
  const coldAllowedBrands = filterOptions?.brands || [];

  const proyecciones = coldPredictionResult?.proyeccion_12_meses || [];
  const totalUnits12M = proyecciones.reduce((acc, p) => acc + (Number(p.unidades_predichas) || 0), 0);
  const totalRevenue12M = proyecciones.reduce((acc, p) => acc + (Number(p.monto_predicho) || 0), 0);
  const clusterId = coldPredictionResult?.producto_nuevo?.cluster_asignado ?? 0;
  const baseUnitsEst = Number(coldPredictionResult?.producto_nuevo?.unidades_base_estimadas || 0);
  const elasticityFactor = Number(coldPredictionResult?.producto_nuevo?.factor_elasticidad_precio || 1.0);
  const peerProducts = coldPredictionResult?.productos_similares_gemelos || [];

  const chartData = proyecciones.map((p, idx) => ({
    month: `${monthsEs[(p.mes || 1) - 1]} ${String(p.anio || '').slice(-2)}`,
    monthNum: p.mes,
    year: p.anio,
    idxMes: idx + 1,
    units: Math.round(p.unidades_predichas || 0),
    revenue: Math.round(p.monto_predicho || 0),
    confidenceInf: Math.round(p.intervalo_confianza_inf || 0),
    confidenceSup: Math.round(p.intervalo_confianza_sup || 0),
    seasonalFactor: p.factor_estacional_aplicado || 1.0
  }));

  return (
    <div className="forecast-view" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: '100%' }}>
      <div className="card cold-start-card interactive-card" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid rgba(14, 165, 233, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        padding: '1rem 1.25rem',
        position: 'relative',
        height: 'auto',
        minHeight: '480px',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div className="cold-start-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            borderRadius: '10px',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={20} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Asistente Predictivo de Pre-lanzamiento (Cold Start)
            </h3>
            <p className="subtitle" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
              Inferencia de demanda inicial para nuevos SKUs mediante segmentación K-Means y transferencia de vecinos cercanos (KNN).
            </p>
          </div>
        </div>

        <div className="cold-start-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '1.25rem', flex: 1, minHeight: 0, overflow: 'visible' }}>
          <form className="cold-start-form" onSubmit={handleColdStartSubmit} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '0.65rem', height: '100%', overflow: 'visible', paddingRight: '0.25rem' }}>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', zIndex: 10 }}>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                1. Clasificación Comercial
              </span>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>
                  Departamento
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(filterOptions?.departments || []).length || 4}, 1fr)`, gap: '0.5rem' }}>
                  {(filterOptions?.departments || []).map(deptId => {
                    const isActive = coldDepartment === deptId;
                    return (
                      <div
                        key={deptId}
                        onClick={() => handleColdDepartmentChange(deptId)}
                        style={{
                          padding: '0.5rem 0.5rem',
                          borderRadius: '6px',
                          border: `1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                          background: isActive ? 'rgba(14, 165, 233, 0.18)' : 'rgba(15, 23, 42, 0.4)',
                          color: isActive ? '#38bdf8' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                      >
                        {getDepartmentIcon(deptId)}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deptId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <CustomSelect
                    label="Categoría Objetivo"
                    value={coldTargetCategory}
                    onChange={(e) => handleColdCategoryChange(e.target.value)}
                    placeholder="Seleccionar Categoría"
                    direction="down"
                    options={[
                      { value: '', label: 'Seleccionar Categoría' },
                      ...coldAllowedCategories.map(cat => ({ value: cat, label: cat }))
                    ]}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <CustomSelect
                    label="Marca / Distribuidor"
                    value={coldBrand}
                    onChange={(e) => handleColdBrandChange(e.target.value)}
                    placeholder="Seleccionar Marca"
                    direction="down"
                    options={[
                      { value: '', label: 'Seleccionar Marca' },
                      ...coldAllowedBrands.map(b => ({ value: b, label: b }))
                    ]}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', zIndex: 5 }}>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                2. Especificaciones del Producto
              </span>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                  Nombre del Producto Nuevo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Jugo Exprés Naranja 1L"
                  value={coldProductName}
                  onChange={(e) => setColdProductName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                    marginTop: '0.2rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0ea5e9';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.45)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    Precio Sugerido (₲)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Ej: 12500"
                    value={coldExpectedPrice}
                    onChange={(e) => setColdExpectedPrice(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.85rem',
                      outline: 'none',
                      marginTop: '0.2rem',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0ea5e9';
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.45)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    Contenido Neto
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Ej: 1.5"
                    value={coldExpectedWeight}
                    onChange={(e) => setColdExpectedWeight(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.85rem',
                      outline: 'none',
                      marginTop: '0.2rem',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0ea5e9';
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.45)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <CustomSelect
                    label="Unidad"
                    value={coldUnit}
                    onChange={(e) => setColdUnit(e.target.value)}
                    placeholder="Unidad"
                    direction="down"
                    options={[
                      { value: 'lt', label: 'Litros (lt)' },
                      { value: 'ml', label: 'Mililitros (ml)' },
                      { value: 'gr', label: 'Gramos (gr)' },
                      { value: 'kg', label: 'Kilos (kg)' },
                      { value: 'un', label: 'Unidades (un)' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {coldError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#fca5a5',
                fontSize: '0.78rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span>{coldError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={coldPredicting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.2rem',
                fontSize: '0.88rem',
                fontWeight: '700',
                borderRadius: '6px',
                marginTop: '0.15rem',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
                transition: 'all 0.2s ease',
                position: 'relative',
                zIndex: 1,
                cursor: coldPredicting ? 'not-allowed' : 'pointer'
              }}
            >
              {coldPredicting ? <Loader2 size={16} className="spinner" /> : <TrendingUp size={16} />}
              {coldPredicting ? 'Consultando Motor de IA...' : 'Predecir Lanzamiento (FastAPI)'}
            </button>
          </form>

          <div className="cold-start-results-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {coldPredicting ? (
              /* Scanning / Loading state */
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.45)',
                border: '1px dashed rgba(14, 165, 233, 0.3)',
                borderRadius: '12px',
                padding: '2rem'
              }}>
                <Loader2 size={42} className="spinner" style={{ color: '#38bdf8', marginBottom: '1rem' }} />
                <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modelado de Similitud en Ejecución
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: '1.4', maxWidth: '360px' }}>
                  FastAPI está procesando el agrupamiento vectorial K-Means y buscando los productos gemelos más cercanos (KNN) en la base de datos...
                </p>
              </div>
            ) : coldPredictionResult ? (
              /* Real Results Box */
              <div className="prediction-success-box" style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%)',
                border: '1px solid rgba(14, 165, 233, 0.25)',
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                minHeight: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.5rem' }}>
                  <div style={{ maxWidth: '65%', overflow: 'hidden' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {coldPredictionResult.producto_nuevo?.descripcion || coldProductName || 'Nuevo Lanzamiento'}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Transferencia de demanda desde catálogo histórico
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span className="badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700' }}>
                      Cluster #{clusterId}
                    </span>
                    <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700' }}>
                      K-Means + KNN
                    </span>
                  </div>
                </div>

                <div className="result-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.55rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Demanda Base</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#38bdf8', display: 'block', marginTop: '0.1rem' }}>
                      {Math.round(baseUnitsEst).toLocaleString('es-PY')} <span style={{ fontSize: '0.65rem', fontWeight: '400', color: '#94a3b8' }}>un/mes</span>
                    </span>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.55rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Elasticidad</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginTop: '0.1rem' }}>
                      x{elasticityFactor.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.55rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Volumen 12M</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginTop: '0.1rem' }}>
                      {Math.round(totalUnits12M).toLocaleString('es-PY')} <span style={{ fontSize: '0.65rem', fontWeight: '400', color: '#94a3b8' }}>un.</span>
                    </span>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.55rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Facturación 12M</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#34d399', display: 'block', marginTop: '0.1rem' }}>
                      ₲ {Math.round(totalRevenue12M).toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('forecast')}
                      style={{
                        background: activeResultTab === 'forecast' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                        border: `1px solid ${activeResultTab === 'forecast' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: activeResultTab === 'forecast' ? '#38bdf8' : '#94a3b8',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <BarChart3 size={14} />
                      Curva de Proyección (12 Meses)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveResultTab('twins')}
                      style={{
                        background: activeResultTab === 'twins' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                        border: `1px solid ${activeResultTab === 'twins' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: activeResultTab === 'twins' ? '#38bdf8' : '#94a3b8',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Users size={14} />
                      Pares Gemelos KNN ({peerProducts.length})
                    </button>
                  </div>

                  {activeResultTab === 'forecast' && (
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                        Demanda (unidades)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(56, 189, 248, 0.5)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(56, 189, 248, 0.2)', border: '1px dashed #38bdf8' }} />
                        Confianza ±20%
                      </span>
                    </div>
                  )}
                </div>

                {activeResultTab === 'forecast' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                    <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorColdForecast" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="colorColdBand" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.12} />
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#475569" 
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#475569"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                            tickLine={false}
                            axisLine={false}
                            width={45}
                          />

                          <Tooltip content={<CustomColdStartTooltip />} />

                          <Area
                            type="monotone"
                            dataKey="confidenceSup"
                            stroke="rgba(56, 189, 248, 0.3)"
                            strokeDasharray="3 3"
                            fill="url(#colorColdBand)"
                            fillOpacity={1}
                            name="Límite Superior"
                          />

                          <Area
                            type="monotone"
                            dataKey="units"
                            stroke="#38bdf8"
                            strokeWidth={2.5}
                            fill="url(#colorColdForecast)"
                            fillOpacity={1}
                            name="Demanda Proyectada"
                            activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {activeResultTab === 'twins' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
                    {peerProducts.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem', fontSize: '0.8rem' }}>
                        No se encontraron productos similares en el espacio vectorial.
                      </div>
                    ) : (
                      peerProducts.map((peer, idx) => (
                        <div
                          key={peer.id_producto || peer.sku || idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(14, 165, 233, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                                {peer.sku || `SKU-${idx + 1}`}
                              </span>
                              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#f8fafc' }}>
                                {peer.descripcion}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '0.5rem' }}>
                              <span>Marca: <strong style={{ color: '#cbd5e1' }}>{peer.marca || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Categoría: <strong style={{ color: '#cbd5e1' }}>{peer.categoria || 'N/A'}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'right' }}>
                            <div>
                              <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Ventas Promedio</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f8fafc' }}>
                                {Math.round(Number(peer.ventas_promedio_mensual || 0)).toLocaleString('es-PY')} <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>un/m</span>
                              </span>
                            </div>

                            <div style={{
                              background: 'rgba(52, 211, 153, 0.12)',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              color: '#34d399',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              whiteSpace: 'nowrap'
                            }}>
                              {Number(peer.similitud_pct || 0).toFixed(1)}% Similitud
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Initial State Placeholder */
              <div className="prediction-placeholder" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#64748b',
                padding: '2rem',
                border: '1px dashed rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.01)'
              }}>
                <HelpCircle size={42} className="placeholder-icon" style={{ color: '#475569', marginBottom: '0.85rem' }} />
                <p style={{ fontSize: '0.92rem', fontWeight: '600', color: '#cbd5e1', margin: 0 }}>Cargá las especificaciones del nuevo SKU</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem', margin: 0, lineHeight: '1.45', maxWidth: '340px' }}>
                  Completá el formulario para clasificar el producto en un cluster K-Means y heredar la curva estacional mediante vecinos cercanos (KNN).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColdStartView;
