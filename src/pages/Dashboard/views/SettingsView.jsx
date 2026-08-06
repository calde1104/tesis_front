import { useState, useEffect } from 'react';
import { Loader2, Sliders, CheckCircle2, Search, X, Plus, Minus, AlertTriangle } from 'lucide-react';
import { saveProductThresholds } from '../../../services/settings';
import { getSalesList } from '../../../services/sales';
import { getForecast } from '../../../services/forecast';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [productThresholds, setProductThresholds] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'RISK' | 'SAFE'

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
      const savedThresholds = localStorage.getItem('product_thresholds');
      if (savedThresholds) {
        try {
          initialThresholds = JSON.parse(savedThresholds);
        } catch (e) {
          console.error("Error leyendo umbrales de localStorage:", e);
        }
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
              } catch (e) {
                // Fallback si la API de forecast falla para ese SKU
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
            if (newThresholds[prod.id] === undefined && newThresholds[prod.sku] === undefined) {
              const baseDemand = prod.estimatedDemand || 1000;
              newThresholds[prod.id] = Math.max(1000, Math.ceil((baseDemand * 1.2) / 500) * 500);
            }
          });
          setProductThresholds(newThresholds);
        } else {
          useFallbackProducts(initialThresholds);
        }
      } catch (err) {
        console.warn("Error cargando productos reales. Usando catálogo por defecto.", err);
        useFallbackProducts(initialThresholds);
      } finally {
        setLoading(false);
      }
    };

    const useFallbackProducts = (initialThresholds) => {
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
    };

    loadProductsAndThresholds();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    await saveProductThresholds(productThresholds);
    
    setSaving(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const adjustThreshold = (prodId, delta) => {
    const current = productThresholds[prodId] !== undefined ? productThresholds[prodId] : 0;
    const nextVal = Math.max(0, current + delta);
    setProductThresholds(prev => ({ ...prev, [prodId]: nextVal }));
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
      
      {showToast && (
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
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '920px', width: '100%', margin: '0 auto' }}>
        
        <div className="card interactive-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={22} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Umbrales de Demanda Máxima por SKU
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Establece el límite de demanda esperada para cada producto. Si la proyección del modelo supera este valor, se disparará una alerta de sobredemanda.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  background: statusFilter === 'ALL' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  color: statusFilter === 'ALL' ? '#38bdf8' : '#94a3b8',
                  border: statusFilter === 'ALL' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                Todos <span style={{ opacity: 0.75, fontSize: '0.72rem' }}>({productsList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RISK')}
                style={{
                  background: statusFilter === 'RISK' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                  color: statusFilter === 'RISK' ? '#f87171' : '#94a3b8',
                  border: statusFilter === 'RISK' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertTriangle size={13} style={{ color: statusFilter === 'RISK' ? '#f87171' : '#64748b' }} />
                En Riesgo <span style={{ opacity: 0.9, fontSize: '0.72rem', background: statusFilter === 'RISK' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)', padding: '0.05rem 0.4rem', borderRadius: '10px' }}>{riskCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SAFE')}
                style={{
                  background: statusFilter === 'SAFE' ? 'rgba(52, 211, 153, 0.18)' : 'transparent',
                  color: statusFilter === 'SAFE' ? '#34d399' : '#94a3b8',
                  border: statusFilter === 'SAFE' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid transparent',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <CheckCircle2 size={13} style={{ color: statusFilter === 'SAFE' ? '#34d399' : '#64748b' }} />
                Seguros <span style={{ opacity: 0.9, fontSize: '0.72rem', background: statusFilter === 'SAFE' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255,255,255,0.05)', padding: '0.05rem 0.4rem', borderRadius: '10px' }}>{safeCount}</span>
              </button>
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No se encontraron productos que coincidan con los filtros aplicados.
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const currentVal = productThresholds[prod.id] !== undefined ? productThresholds[prod.id] : (productThresholds[prod.sku] !== undefined ? productThresholds[prod.sku] : 0);
                const demand = estimatedDemands[prod.sku] || estimatedDemands[prod.id] || prod.estimatedDemand || 1000;
                const isAtRisk = demand > currentVal;
                const formattedNum = Number(currentVal).toLocaleString('es-PY');
                const formattedDemand = Number(demand).toLocaleString('es-PY');

                return (
                  <div 
                    key={prod.id || prod.sku} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: isAtRisk ? 'rgba(239, 68, 68, 0.03)' : 'rgba(255,255,255,0.02)', 
                      padding: '0.85rem 1.15rem', 
                      borderRadius: '10px', 
                      border: `1px solid ${isAtRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                      borderLeft: `4px solid ${isAtRisk ? '#ef4444' : '#10b981'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600' }}>{prod.name}</span>
                        {isAtRisk ? (
                          <span title="Demanda estimada supera el umbral (Riesgo de Sobredemanda)" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.12rem 0.45rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)' }}>
                            ✕
                          </span>
                        ) : (
                          <span title="Demanda en rango seguro" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '0.12rem 0.45rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(52, 211, 153, 0.2)' }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem', display: 'block' }}>
                        {prod.sku} {prod.category ? `• ${prod.category}` : ''} {prod.brand ? `• ${prod.brand}` : ''} <span style={{ color: '#94a3b8' }}>• Predicción: <strong style={{ color: '#38bdf8' }}>{formattedDemand} un.</strong></span>
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      
                      <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '700', fontFamily: 'monospace', background: 'rgba(14, 165, 233, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        {formattedNum} un.
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => adjustThreshold(prod.id, -1000)}
                          style={{
                            background: 'rgba(14, 165, 233, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            borderRadius: '6px',
                            width: '32px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            userSelect: 'none'
                          }}
                          title="Disminuir 1,000 unidades"
                        >
                          <Minus size={14} />
                        </button>

                        <input 
                          type="number" 
                          step="1000"
                          value={currentVal} 
                          onChange={(e) => setProductThresholds({ 
                            ...productThresholds, 
                            [prod.id]: parseInt(e.target.value) || 0 
                          })}
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.6)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px', 
                            padding: '0.45rem 0.5rem', 
                            color: '#f8fafc', 
                            fontSize: '0.88rem', 
                            width: '95px', 
                            textAlign: 'right', 
                            outline: 'none' 
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => adjustThreshold(prod.id, 1000)}
                          style={{
                            background: 'rgba(14, 165, 233, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            borderRadius: '6px',
                            width: '32px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            userSelect: 'none'
                          }}
                          title="Aumentar 1,000 unidades"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: 'auto' }}>
            {saving ? <Loader2 size={16} className="spinner" /> : null}
            Guardar Umbrales por SKU
          </button>
        </div>

      </form>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SettingsView;
