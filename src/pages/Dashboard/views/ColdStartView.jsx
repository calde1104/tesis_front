import { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, TrendingUp, HelpCircle, Utensils, GlassWater, 
  User, Droplet, Folder, AlertCircle, RefreshCw, BarChart3, Users,
  Layers, CheckCircle2, DollarSign, Activity, Percent, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { predictColdStart } from '../../../services/coldStart';
import { getSalesFilters, getDeptId, getCategoryId, getBrandId } from '../../../services/sales';
import { sanitizeText, sanitizeNumber } from '../../../utils/security';

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
    <div className="filter-group" style={{ position: 'relative', zIndex: isOpen ? 99999 : 1, display: 'flex', flexDirection: 'column', margin: 0 }} onClick={(e) => e.stopPropagation()}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '0.72rem',
          color: '#94a3b8',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '0.35rem',
          height: '14px',
          lineHeight: '14px'
        }}>
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '38px',
          minHeight: '38px',
          maxHeight: '38px',
          boxSizing: 'border-box',
          background: 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${isOpen ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '6px',
          color: '#f8fafc',
          padding: '0 0.75rem',
          fontSize: '0.82rem',
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
          fontSize: '0.62rem',
          color: '#64748b',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          marginLeft: '0.4rem'
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            bottom: direction === 'up' ? 'calc(100% + 4px)' : undefined,
            top: direction === 'down' ? 'calc(100% + 4px)' : undefined,
            left: 0,
            right: 0,
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '6px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 999999,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(14, 165, 233, 0.2)'
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
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                color: value === opt.value ? '#38bdf8' : '#cbd5e1',
                background: value === opt.value ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
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

const CustomColdStartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const units = typeof data.units === 'number' ? data.units : 0;
    const revenue = typeof data.revenue === 'number' ? data.revenue : 0;
    const monthName = monthsFullEs[(data.monthNum || 1) - 1] || data.month;

    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(14, 165, 233, 0.1)',
        textAlign: 'left',
        minWidth: '220px'
      }}>
        <p style={{
          margin: 0,
          fontWeight: '700',
          fontSize: '0.75rem',
          color: '#64748b',
          marginBottom: '0.4rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {monthName} {data.year}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', flexShrink: 0 }} />
            <span style={{ color: '#cbd5e1', fontWeight: '500' }}>Demanda Proyectada:</span>
            <span style={{ fontWeight: '700', color: '#f8fafc', marginLeft: 'auto' }}>
              {units.toLocaleString('es-PY')} un.
            </span>
          </div>

          {revenue > 0 && (
            <div style={{ paddingLeft: '0.85rem', fontSize: '0.72rem', color: '#38bdf8', opacity: 0.9 }}>
              <span>Monto Est.: ₲ {revenue.toLocaleString('es-PY')}</span>
            </div>
          )}

          {data.confidenceInf !== null && data.confidenceInf !== undefined && data.confidenceSup !== null && data.confidenceSup !== undefined && (
            <div style={{
              paddingLeft: '0.85rem',
              fontSize: '0.72rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginTop: '0.15rem'
            }}>
              <span>Int. Confianza (±20%):</span>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>
                [{Math.round(data.confidenceInf).toLocaleString('es-PY')} - {Math.round(data.confidenceSup).toLocaleString('es-PY')} un.]
              </span>
            </div>
          )}
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
    if (catId && filterOptions?.categoryBrands?.[catId] && !filterOptions.categoryBrands[catId].includes(coldBrand)) {
      setColdBrand('');
    }
  };

  const handleColdBrandChange = (brandId) => {
    setColdBrand(brandId);
  };

  const coldAllowedCategories = coldDepartment && filterOptions?.categories?.[coldDepartment]
    ? filterOptions.categories[coldDepartment]
    : (filterOptions?.categories ? Array.from(new Set(Object.values(filterOptions.categories).flat())) : []);

  const coldAllowedBrands = coldTargetCategory && filterOptions?.categoryBrands?.[coldTargetCategory]
    ? filterOptions.categoryBrands[coldTargetCategory]
    : (coldDepartment && filterOptions?.deptBrands?.[coldDepartment]
      ? filterOptions.deptBrands[coldDepartment]
      : (filterOptions?.brands || []));

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
        padding: '0.85rem 1.25rem',
        position: 'relative',
        zIndex: 100,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: '8px',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                Estimación de Demanda para Nuevos Productos (Cold Start)
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                Proyectá la demanda mensual y calibrá estacionalidad a partir de artículos similares del catálogo histórico.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleColdStartSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', position: 'relative', zIndex: 100, overflow: 'visible' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '0.75rem', alignItems: 'flex-end', position: 'relative', zIndex: 50, overflow: 'visible' }}>
            
            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', height: '14px', lineHeight: '14px' }}>
                Departamento
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(filterOptions?.departments || []).length || 4}, 1fr)`, gap: '0.35rem', height: '38px', boxSizing: 'border-box' }}>
                {(filterOptions?.departments || []).map(deptId => {
                  const isActive = coldDepartment === deptId;
                  return (
                    <div
                      key={deptId}
                      onClick={() => handleColdDepartmentChange(deptId)}
                      style={{
                        height: '38px',
                        boxSizing: 'border-box',
                        borderRadius: '6px',
                        border: `1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: isActive ? 'rgba(14, 165, 233, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                        color: isActive ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        transition: 'all 0.15s ease',
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

            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
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

            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 1.1fr', gap: '0.75rem', alignItems: 'flex-end', position: 'relative', zIndex: 30, overflow: 'visible' }}>
            
            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', height: '14px', lineHeight: '14px' }}>
                Descripción / Nombre del SKU
              </label>
              <input
                type="text"
                maxLength={150}
                placeholder="Ej: Mayonesa Especial 500g"
                value={coldProductName}
                onChange={(e) => setColdProductName(sanitizeText(e.target.value, 150))}
                required
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  padding: '0 0.75rem',
                  fontSize: '0.82rem',
                  outline: 'none',
                  height: '38px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', height: '14px', lineHeight: '14px' }}>
                Precio Sugerido (₲)
              </label>
              <input
                type="number"
                min="1"
                max="1000000000"
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
                  padding: '0 0.75rem',
                  fontSize: '0.82rem',
                  outline: 'none',
                  height: '38px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.35rem', alignItems: 'flex-end', position: 'relative', zIndex: 35, overflow: 'visible' }}>
              <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', height: '14px', lineHeight: '14px' }}>
                  Contenido
                </label>
                <input
                  type="number"
                  min="0.01"
                  max="10000"
                  step="any"
                  placeholder="1.5"
                  value={coldExpectedWeight}
                  onChange={(e) => setColdExpectedWeight(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    padding: '0 0.5rem',
                    fontSize: '0.82rem',
                    outline: 'none',
                    height: '38px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0, position: 'relative', zIndex: 40, overflow: 'visible' }}>
                <CustomSelect
                  label="Unidad"
                  value={coldUnit}
                  onChange={(e) => setColdUnit(e.target.value)}
                  placeholder="Un."
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

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={coldPredicting}
                style={{
                  width: '100%',
                  height: '38px',
                  minHeight: '38px',
                  maxHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0 1rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
                  transition: 'background 0.2s ease, opacity 0.2s ease',
                  cursor: coldPredicting ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              >
                {!coldPredicting && <TrendingUp size={15} style={{ color: '#040d21', flexShrink: 0 }} />}
                {coldPredicting ? 'Calculando Estimación...' : 'Estimar Demanda'}
              </button>
            </div>
          </div>

          {coldError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#fca5a5',
              fontSize: '0.76rem',
              marginTop: '0.15rem'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, color: '#ef4444' }} />
              <span>{coldError}</span>
            </div>
          )}
        </form>
      </div>

      {coldPredicting ? (
        <div className="card" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px dashed rgba(14, 165, 233, 0.3)',
          borderRadius: '12px',
          padding: '3rem',
          minHeight: '380px',
          position: 'relative',
          zIndex: 1
        }}>
          <Loader2 size={42} className="spinner" style={{ color: '#38bdf8', marginBottom: '1rem' }} />
          <h4 style={{ color: '#38bdf8', fontSize: '1rem', margin: '0 0 0.4rem 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Analizando Potencial de Lanzamiento
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: '1.4', maxWidth: '420px' }}>
            Calibrando elasticidad precio y extrayendo estacionalidad de productos análogos en el catálogo histórico...
          </p>
        </div>
      ) : coldPredictionResult ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1rem', flex: 1, minHeight: '380px', position: 'relative', zIndex: 1 }}>
          
          <div className="card" style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700' }}>
                  Curva de Demanda Proyectada (12 Meses)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Estimación estacional con intervalo de confianza (±20%)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', fontSize: '0.7rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', fontWeight: '600' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#38bdf8' }} />
                  Demanda
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8', fontWeight: '500' }}>
                  <span style={{ width: '9px', height: '5px', borderRadius: '2px', background: 'rgba(56, 189, 248, 0.25)', border: '1px dashed #38bdf8' }} />
                  Confianza ±20%
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Demanda Anual</span>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginTop: '0.1rem' }}>
                  {Math.round(totalUnits12M).toLocaleString('es-PY')} <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>un.</span>
                </span>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Facturación Anual</span>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#34d399', display: 'block', marginTop: '0.1rem' }}>
                  ₲ {Math.round(totalRevenue12M).toLocaleString('es-PY')}
                </span>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Promedio Mensual</span>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#38bdf8', display: 'block', marginTop: '0.1rem' }}>
                  {Math.round(totalUnits12M / 12).toLocaleString('es-PY')} <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>un/m</span>
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: '230px', marginTop: '0.2rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} tickLine={false} axisLine={false} width={45} />
                  <Tooltip content={<CustomColdStartTooltip />} />
                  <Area type="monotone" dataKey="confidenceSup" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3 3" fill="url(#colorColdBand)" fillOpacity={1} name="Límite Superior" />
                  <Area type="monotone" dataKey="units" stroke="#38bdf8" strokeWidth={2.5} fill="url(#colorColdForecast)" fillOpacity={1} name="Demanda Proyectada" activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700' }}>
                  Catálogo de Referencia
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Artículos análogos utilizados para calibrar la proyección
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '600',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px'
              }}>
                {peerProducts.length} productos
              </span>
            </div>

            <div style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '310px' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      color: '#64748b',
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2
                    }}>
                      <th style={{ width: '42%', padding: '0.55rem 0.75rem' }}>Producto</th>
                      <th style={{ width: '20%', padding: '0.55rem 0.6rem' }}>Marca</th>
                      <th style={{ width: '20%', padding: '0.55rem 0.6rem', textAlign: 'right' }}>Ventas</th>
                      <th style={{ width: '18%', padding: '0.55rem 0.75rem', textAlign: 'right' }}>Afinidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerProducts.map((peer, idx) => {
                      const simPct = Number(peer.similitud_pct || 0);
                      return (
                        <tr
                          key={peer.id_producto || peer.sku || idx}
                          style={{
                            borderBottom: idx === peerProducts.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.55rem 0.75rem', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                color: '#38bdf8',
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                padding: '0.08rem 0.3rem',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}>
                                {peer.sku || `SKU-${idx + 1}`}
                              </span>
                              <span style={{
                                fontWeight: '600',
                                color: '#f1f5f9',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={peer.descripcion}>
                                {peer.descripcion}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.55rem 0.6rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={peer.marca}>
                            {peer.marca || 'N/A'}
                          </td>
                          <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: '700', color: '#f8fafc' }}>
                              {Math.round(Number(peer.ventas_promedio_mensual || 0)).toLocaleString('es-PY')}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.65rem', marginLeft: '0.2rem' }}>un.</span>
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>
                            <span style={{
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              color: '#38bdf8'
                            }}>
                              {simPct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Initial Empty State */
        <div className="card" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.35)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '3rem',
          minHeight: '380px'
        }}>
          <HelpCircle size={44} style={{ color: '#475569', marginBottom: '0.75rem' }} />
          <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#cbd5e1', margin: 0 }}>
            Configurá los datos del nuevo producto
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem', margin: 0, maxWidth: '420px', lineHeight: '1.45' }}>
            Ingresá los atributos en la consola superior y hacé click en <strong>Estimar Demanda</strong> para visualizar la proyección estacional a 12 meses y el catálogo de referencia en simultáneo.
          </p>
        </div>
      )}
    </div>
  );
};

export default ColdStartView;
