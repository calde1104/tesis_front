import { useState, useEffect } from 'react';
import { Sparkles, Loader2, TrendingUp, HelpCircle, Utensils, GlassWater, User, Droplet, Folder } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { predictColdStart } from '../../../services/marketShare';
import { getSalesFilters } from '../../../services/sales';

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
  const [coldUnit, setColdUnit] = useState('L');
  const [coldPredicting, setColdPredicting] = useState(false);
  const [coldPredictionResult, setColdPredictionResult] = useState(null);

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
        console.error("Error al cargar filtros:", err);
      }
    };
    fetchData();
  }, []);

  const handleColdStartSubmit = async (e) => {
    e.preventDefault();
    if (!coldProductName || !coldExpectedPrice || !coldTargetCategory || !coldBrand) {
      alert("Por favor rellene todos los campos, incluyendo categoría y marca.");
      return;
    }
    setColdPredicting(true);
    setColdPredictionResult(null);

    setTimeout(async () => {
      const result = await predictColdStart({
        name: coldProductName,
        department: coldDepartment,
        category: coldTargetCategory,
        brand: coldBrand,
        expectedPrice: coldExpectedPrice,
        weight: coldExpectedWeight,
        unit: coldUnit
      });
      setColdPredictionResult(result);
      setColdPredicting(false);
    }, 1000);
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
              Inferencia de demanda inicial para nuevos SKUs mediante algoritmos de agrupamiento de similitud física y marcaria.
            </p>
          </div>
        </div>

        <div className="cold-start-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', flex: 1, minHeight: 0, overflow: 'visible' }}>
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
                  onFocus={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    Precio Sugerido ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 1250"
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
                      marginTop: '0.2rem'
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    Contenido Neto
                  </label>
                  <input
                    type="number"
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
                      marginTop: '0.2rem'
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <CustomSelect
                    label="Medida"
                    value={coldUnit}
                    onChange={(e) => setColdUnit(e.target.value)}
                    placeholder="Unidad"
                    direction="down"
                    options={[
                      { value: 'L', label: 'L' },
                      { value: 'ml', label: 'ml' },
                      { value: 'g', label: 'g' },
                      { value: 'kg', label: 'kg' },
                      { value: 'un', label: 'un' }
                    ]}
                  />
                </div>
              </div>
            </div>

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
                zIndex: 1
              }}
            >
              {coldPredicting ? <Loader2 size={16} className="spinner" /> : <TrendingUp size={16} />}
              {coldPredicting ? 'Calculando Clusters...' : 'Predecir Lanzamiento'}
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
                <Loader2 size={40} className="spinner" style={{ color: '#38bdf8', marginBottom: '1rem' }} />
                <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ejecutando Modelado</h4>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
                  El motor de IA está procesando el algoritmo K-Medoids para agrupar el nuevo SKU en el cluster adecuado...
                </p>
              </div>
            ) : coldPredictionResult ? (
              /* Gorgeous Result Card */
              <div className="prediction-success-box" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '1.25rem',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.05)',
                minHeight: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#34d399', fontWeight: '700', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                    {coldProductName ? `Proyección: ${coldProductName}` : 'Clasificación Exitosa'}
                  </h4>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem' }}>
                    Cluster Activo
                  </span>
                </div>

                <div className="result-metric-large" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span className="metric-label" style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Grupo de Comportamiento</span>
                  <span className="metric-value" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399' }}>{coldPredictionResult.clusterName}</span>
                </div>

                <div className="result-stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Precio Óptimo</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginTop: '0.15rem' }}>
                      ${coldPredictionResult.recommendedPrice.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Ventas Est. M1</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginTop: '0.15rem' }}>
                      {coldPredictionResult.salesVolume.toLocaleString('es-AR')} un.
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Confianza</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8', display: 'block', marginTop: '0.15rem' }}>
                      {coldPredictionResult.confidenceLevel}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <h5 style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                      Rampa: {coldProductName || 'Nuevo SKU'} (6M)
                    </h5>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                        Ventas (un.)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399' }}>
                        <span style={{ width: '6px', height: '2px', borderTop: '2px dashed #34d399' }} />
                        Market Share (%)
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={coldPredictionResult.predictedShares}
                        margin={{ top: 10, right: -15, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorColdSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorColdShare" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#64748b', fontSize: 9 }} />

                        <YAxis
                          yAxisId="left"
                          stroke="#38bdf8"
                          tick={{ fill: '#64748b', fontSize: 9 }}
                          tickFormatter={(val) => val.toLocaleString('es-AR')}
                          width={40}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#34d399"
                          tick={{ fill: '#64748b', fontSize: 9 }}
                          tickFormatter={(val) => `${val}%`}
                          width={35}
                        />

                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                          formatter={(value, name) => {
                            if (name === 'sales') return [`${value.toLocaleString('es-AR')} un.`, 'Ventas Estimadas'];
                            if (name === 'share') return [`${value}%`, 'Market Share'];
                            return [value, name];
                          }}
                        />

                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="sales"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorColdSales)"
                          activeDot={{ r: 4 }}
                        />

                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="share"
                          stroke="#34d399"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#colorColdShare)"
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              /* Original Clean Welcome Placeholder */
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
                <p style={{ fontSize: '0.92rem', fontWeight: '600', color: '#cbd5e1', margin: 0 }}>Cargá los datos del nuevo producto</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem', margin: 0, lineHeight: '1.45', maxWidth: '340px' }}>
                  Completá el formulario a la izquierda con las especificaciones físicas y comerciales del SKU para agruparlo en un cluster de ventas histórico.
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
