import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sliders, CheckCircle2, Search, X, Plus, Minus, AlertTriangle } from 'lucide-react';
import { saveProductThresholds, getProductThresholds } from '../../../services/settings';
import { getSalesList } from '../../../services/sales';
import { getForecast } from '../../../services/forecast';
import { sanitizeSearch, sanitizeNumber } from '../../../utils/security';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [productThresholds, setProductThresholds] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'RISK' | 'SAFE'
  // Copia de lo ultimo persistido, para saber que filas quedaron sin guardar.
  const [savedThresholds, setSavedThresholds] = useState({});

  const estimatedDemands = {
    'SKU-001': 14200,
    'SKU-002': 28500,
    'SKU-005': 45000,
    'SKU-007': 35600
  };

  useEffect(() => {
    const loadProductsAndThresholds = async () => {
      setLoading(true);
      
      let initialThresholds = {};
      try {
        initialThresholds = await getProductThresholds();
      } catch (e) {
        console.error("Error cargando umbrales desde servicios:", e);
      }

      try {
        const salesRes = await getSalesList({}, 1, 50);
        if (salesRes && salesRes.data && salesRes.data.length > 0) {
          const uniqueProductsMap = {};
          salesRes.data.forEach(item => {
            const prodId = item.id || item.id_producto || item.idProducto || item.sku;
            if (prodId && !uniqueProductsMap[prodId]) {
              const unitsVal = item.units !== undefined ? Number(item.units) : 0;
              uniqueProductsMap[prodId] = {
                id: prodId,
                sku: item.sku || 'SKU-000',
                name: item.name || item.sku,
                category: item.category || 'General',
                brand: item.brand || '',
                estimatedDemand: estimatedDemands[item.sku] || unitsVal || 1000
              };
            }
          });

          const uniqueList = Object.values(uniqueProductsMap);

          const forecastResults = await Promise.all(
            uniqueList.map(async (prod) => {
              try {
                const points = await getForecast(prod.sku);
                const firstForecastPoint = points.find(p => p.forecast !== null && p.forecast !== undefined && (p.historical === null || p.historical === undefined));
                if (firstForecastPoint && firstForecastPoint.forecast !== null) {
                  return { id: prod.id, forecastDemand: Math.round(firstForecastPoint.forecast) };
                }
              } catch {
                // sin forecast para este SKU: queda en null
              }
              return { id: prod.id, forecastDemand: null };
            })
          );

          const forecastMap = {};
          forecastResults.forEach(res => {
            if (res && res.forecastDemand !== null) {
              forecastMap[res.id] = res.forecastDemand;
            }
          });

          const updatedList = uniqueList.map(prod => ({
            ...prod,
            estimatedDemand: forecastMap[prod.id] !== undefined ? forecastMap[prod.id] : prod.estimatedDemand
          }));

          setProductsList(updatedList);

          const newThresholds = { ...initialThresholds };
          updatedList.forEach((prod) => {
            const savedVal = initialThresholds[prod.id] !== undefined 
              ? initialThresholds[prod.id] 
              : (initialThresholds[prod.sku] !== undefined ? initialThresholds[prod.sku] : undefined);

            if (savedVal !== undefined) {
              newThresholds[prod.id] = savedVal;
              newThresholds[prod.sku] = savedVal;
            } else {
              const baseDemand = prod.estimatedDemand || 1000;
              const defaultVal = Math.max(1000, Math.ceil((baseDemand * 1.2) / 500) * 500);
              newThresholds[prod.id] = defaultVal;
              newThresholds[prod.sku] = defaultVal;
            }
          });
          setProductThresholds(newThresholds);
          setSavedThresholds(newThresholds);
        } else {
          cargarCatalogoPorDefecto(initialThresholds);
        }
      } catch (err) {
        console.warn("Error cargando productos reales. Usando catálogo por defecto.", err);
        cargarCatalogoPorDefecto(initialThresholds);
      } finally {
        setLoading(false);
      }
    };

    const cargarCatalogoPorDefecto = (initialThresholds) => {
      const fallbackList = [
        { id: 'SKU-001', sku: 'SKU-001', name: 'Aceite Girasol 1.5L', category: 'Alimentos', brand: 'Vicentin', estimatedDemand: 14200 },
        { id: 'SKU-002', sku: 'SKU-002', name: 'Fideos Tallarín 500g', category: 'Alimentos', brand: 'Molinos', estimatedDemand: 28500 },
        { id: 'SKU-005', sku: 'SKU-005', name: 'Cerveza Lager Lata 473ml', category: 'Bebidas', brand: 'Quilmes', estimatedDemand: 45000 },
        { id: 'SKU-007', sku: 'SKU-007', name: 'Gaseosa Cola 2.25L', category: 'Bebidas', brand: 'Coca-Cola', estimatedDemand: 35600 }
      ];
      setProductsList(fallbackList);
      const defaults = {
        'SKU-001': 12000,
        'SKU-002': 25000,
        'SKU-005': 40000,
        'SKU-007': 30000,
        ...initialThresholds
      };
      setProductThresholds(defaults);
      setSavedThresholds(defaults);
    };

    loadProductsAndThresholds();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga única al montar la vista
  }, []);

  // El mapa se indexa por id y por sku a la vez, asi que se prueban los dos.
  const readThreshold = (map, prod) => {
    if (map[prod.id] !== undefined) return map[prod.id];
    if (map[prod.sku] !== undefined) return map[prod.sku];
    return 0;
  };

  const getDemand = (prod) =>
    estimatedDemands[prod.sku] || estimatedDemands[prod.id] || prod.estimatedDemand || 1000;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    await saveProductThresholds(productThresholds);
    setSavedThresholds(productThresholds);

    setSaving(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const adjustThreshold = (prodId, delta) => {
    const prod = productsList.find(p => p.id === prodId || p.sku === prodId);

    // El valor se lee dentro del updater: leerlo del closure hacia que dos clicks
    // seguidos (que React agrupa en un mismo batch) calcularan ambos desde el
    // mismo valor y se pisaran, perdiendo un incremento.
    setProductThresholds(prev => {
      const current = prev[prodId] !== undefined
        ? prev[prodId]
        : (prod && prev[prod.sku] !== undefined ? prev[prod.sku] : 0);
      const nextVal = Math.max(0, current + delta);
      const updated = { ...prev, [prodId]: nextVal };
      if (prod) {
        if (prod.id) updated[prod.id] = nextVal;
        if (prod.sku) updated[prod.sku] = nextVal;
      }
      return updated;
    });
  };

  const getProductRiskStatus = (prod) => {
    const thresholdVal = productThresholds[prod.id] !== undefined 
      ? productThresholds[prod.id] 
      : (productThresholds[prod.sku] !== undefined ? productThresholds[prod.sku] : 0);
    const demand = estimatedDemands[prod.sku] || estimatedDemands[prod.id] || prod.estimatedDemand || 1000;
    return demand > thresholdVal;
  };

  const riskCount = productsList.filter(p => getProductRiskStatus(p)).length;
  const safeCount = productsList.length - riskCount;

  const dirtyProducts = productsList.filter(
    (prod) => readThreshold(productThresholds, prod) !== readThreshold(savedThresholds, prod)
  );
  const dirtyCount = dirtyProducts.length;

  const handleDiscard = () => setProductThresholds(savedThresholds);

  // Filtrar productos en tiempo real según la búsqueda y el filtro de estado
  const filteredProducts = productsList.filter(prod => {
    const isAtRisk = getProductRiskStatus(prod);
    if (statusFilter === 'RISK' && !isAtRisk) return false;
    if (statusFilter === 'SAFE' && isAtRisk) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (prod.name && prod.name.toLowerCase().includes(q)) ||
      (prod.sku && prod.sku.toLowerCase().includes(q)) ||
      (prod.category && prod.category.toLowerCase().includes(q)) ||
      (prod.brand && prod.brand.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando umbrales de demanda por SKU...</p>
      </div>
    );
  }

  return (
    <div className="view-container settings-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      flex: 1,
      minHeight: '100%',
      position: 'relative'
    }}>
      
      {showToast && createPortal(
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 10000,
          fontSize: '0.85rem',
          fontWeight: '600',
          animation: 'fade-in 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} />
          Umbrales guardados con éxito
        </div>,
        document.body
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        
        <div className="card interactive-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={22} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Si la proyección del modelo supera el umbral que definas para un producto,
                se dispara una alerta de sobredemanda.
              </p>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                La barra es el umbral que fijás;
                <span style={{ display: 'inline-block', width: '2px', height: '12px', background: 'rgba(248,250,252,0.75)', borderRadius: '1px' }} />
                marca la demanda proyectada, y el número es la distancia hasta ella.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(sanitizeSearch(e.target.value))}
                placeholder="Buscar por nombre, SKU, categoría..."
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '0.55rem 2.25rem 0.55rem 2.75rem',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  background: statusFilter === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: statusFilter === 'ALL' ? '#f8fafc' : '#94a3b8',
                  border: statusFilter === 'ALL' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Todos ({productsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RISK')}
                style={{
                  background: statusFilter === 'RISK' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  color: statusFilter === 'RISK' ? '#f87171' : '#94a3b8',
                  border: statusFilter === 'RISK' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                En Riesgo ({riskCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SAFE')}
                style={{
                  background: statusFilter === 'SAFE' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: statusFilter === 'SAFE' ? '#f8fafc' : '#94a3b8',
                  border: statusFilter === 'SAFE' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Seguros ({safeCount})
              </button>
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No se encontraron productos que coincidan con los filtros aplicados.
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const currentVal = readThreshold(productThresholds, prod);
                const demand = getDemand(prod);
                const isAtRisk = demand > currentVal;
                const formattedDemand = Number(demand).toLocaleString('es-PY');
                const isDirty = currentVal !== readThreshold(savedThresholds, prod);

                // La barra representa EL UMBRAL (lo que el usuario controla) y la marca
                // fija es la demanda proyectada. Asi subir el numero agranda la barra.
                // El dominio se ancla a la demanda, no al umbral, para que la marca no
                // se mueva mientras se edita: queda siempre en demanda / (demanda*1.6).
                // Lineal hasta la marca (ahi es donde importa afinar), y asintotica por
                // encima: con una escala lineal con tope, pasado cierto umbral subir el
                // numero dejaba de mover la barra. Asi siempre se mueve, con retorno
                // decreciente, y nunca llega a saturar del todo.
                const MARK = 62.5;
                const over = demand > 0 ? currentVal / demand - 1 : 0;
                const fillPct = demand <= 0
                  ? 0
                  : currentVal <= demand
                    ? (currentVal / demand) * MARK
                    : MARK + (100 - MARK) * (over / (over + 1));
                const gap = currentVal - demand;
                const diff = Math.abs(demand - currentVal).toLocaleString('es-PY');

                return (
                  <div 
                    key={prod.id || prod.sku} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.7rem', 
                      background: isAtRisk ? 'rgba(239, 68, 68, 0.03)' : 'rgba(255, 255, 255, 0.02)', 
                      padding: '0.85rem 1.15rem', 
                      borderRadius: '10px', 
                      border: `1px solid ${isAtRisk ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)'}`,
                      borderLeft: `3px solid ${isAtRisk ? '#ef4444' : 'transparent'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {prod.name}
                        {isDirty && (
                          <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '0.1rem 0.45rem', whiteSpace: 'nowrap' }}>
                            sin guardar
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        <span style={{ fontFamily: 'monospace' }}>{prod.sku}</span>
                        {prod.category ? ` · ${prod.category}` : ''}{prod.brand ? ` · ${prod.brand}` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginRight: '0.3rem', letterSpacing: '0.04em' }}>Umbral</span>
                      <button
                        type="button"
                        onClick={() => adjustThreshold(prod.id, -100)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          width: '30px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = '#cbd5e1'; }}
                        title="Disminuir 100 un."
                      >
                        <Minus size={14} />
                      </button>

                      <input 
                        type="number" 
                        step="100"
                        min="0"
                        max="100000000"
                        value={currentVal} 
                        onChange={(e) => {
                          const val = sanitizeNumber(e.target.value, 0, 100000000, 0);
                          setProductThresholds(prev => ({
                            ...prev,
                            [prod.id]: val,
                            [prod.sku]: val
                          }));
                        }}
                        style={{ 
                          background: 'rgba(15, 23, 42, 0.7)', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          borderRadius: '6px', 
                          padding: '0.4rem 0.5rem', 
                          color: '#f8fafc', 
                          fontSize: '0.85rem', 
                          width: '90px', 
                          textAlign: 'right', 
                          outline: 'none',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: '600'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => adjustThreshold(prod.id, 100)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          width: '30px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = '#cbd5e1'; }}
                        title="Aumentar 100 un."
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{ position: 'relative', flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px' }}>
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0, left: 0,
                          width: `${fillPct}%`,
                          background: isAtRisk
                            ? 'linear-gradient(90deg, rgba(239,68,68,0.45), #ef4444)'
                            : 'linear-gradient(90deg, rgba(56,189,248,0.35), #38bdf8)',
                          borderRadius: '999px',
                          transition: 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                        }} />
                        <div
                          title={`Demanda proyectada: ${formattedDemand} un.`}
                          style={{ position: 'absolute', top: '-5px', bottom: '-5px', left: `${MARK}%`, width: '2px', background: 'rgba(248,250,252,0.75)', borderRadius: '1px' }}
                        />
                      </div>

                      {/* La distancia al proyectado, en las mismas unidades que edita
                          el stepper: dice directamente cuanto falta o cuanto sobra. */}
                      <span style={{ fontSize: '0.95rem', fontWeight: '700', minWidth: '104px', textAlign: 'right', color: isAtRisk ? '#f87171' : '#38bdf8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {gap < 0 ? '−' : '+'}{diff} un.
                      </span>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', minWidth: '104px', fontSize: '0.72rem', fontWeight: '600', color: isAtRisk ? '#f87171' : '#64748b' }}>
                        {isAtRisk && <AlertTriangle size={13} />}
                        {isAtRisk ? 'en riesgo' : 'de margen'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{formattedDemand} un.</span>
                      {' proyectadas por el modelo'}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Barra de guardado: queda visible sin importar cuanto midan las filas */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(23, 34, 56, 0.95) 100%)',
            border: `1px solid ${dirtyCount > 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.07)'}`,
            boxShadow: '0 -8px 24px -12px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            transition: 'border-color 0.25s ease'
          }}
        >
          <span style={{ fontSize: '0.82rem', color: dirtyCount > 0 ? '#e2e8f0' : '#64748b', fontWeight: dirtyCount > 0 ? '600' : '500' }}>
            {dirtyCount === 0
              ? 'No hay cambios sin guardar'
              : `${dirtyCount} umbral${dirtyCount === 1 ? '' : 'es'} modificado${dirtyCount === 1 ? '' : 's'}`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={dirtyCount === 0 || saving}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: dirtyCount === 0 ? '#475569' : '#cbd5e1',
                borderRadius: '8px',
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: dirtyCount === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Descartar
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving || dirtyCount === 0}
              style={{
                padding: '0.55rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: saving || dirtyCount === 0 ? 'not-allowed' : 'pointer',
                opacity: dirtyCount === 0 ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              {saving ? <Loader2 size={16} className="spinner" /> : null}
              Guardar cambios
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};

export default SettingsView;
