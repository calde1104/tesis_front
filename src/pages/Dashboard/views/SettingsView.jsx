import { useState, useEffect } from 'react';
import { Loader2, Sliders, CheckCircle2, Search, X, Plus, Minus } from 'lucide-react';
import { saveProductThresholds } from '../../../services/settings';
import { getSalesList } from '../../../services/sales';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [productThresholds, setProductThresholds] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

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
            if (item.sku && !uniqueProductsMap[item.sku]) {
              uniqueProductsMap[item.sku] = {
                sku: item.sku,
                name: item.name || item.sku,
                category: item.category || 'General',
                brand: item.brand || ''
              };
            }
          });

          const uniqueList = Object.values(uniqueProductsMap);
          setProductsList(uniqueList);

          const newThresholds = { ...initialThresholds };
          uniqueList.forEach((prod, idx) => {
            if (newThresholds[prod.sku] === undefined) {
              newThresholds[prod.sku] = (idx + 1) * 10000;
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
        { sku: 'SKU-001', name: 'Aceite Girasol 1.5L', category: 'Alimentos', brand: 'Vicentin' },
        { sku: 'SKU-002', name: 'Fideos Tallarín 500g', category: 'Alimentos', brand: 'Molinos' },
        { sku: 'SKU-005', name: 'Cerveza Lager Lata 473ml', category: 'Bebidas', brand: 'Quilmes' },
        { sku: 'SKU-007', name: 'Gaseosa Cola 2.25L', category: 'Bebidas', brand: 'Coca-Cola' }
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

  const adjustThreshold = (sku, delta) => {
    const current = productThresholds[sku] !== undefined ? productThresholds[sku] : 0;
    const nextVal = Math.max(0, current + delta);
    setProductThresholds(prev => ({ ...prev, [sku]: nextVal }));
  };

  // Filtrar productos en tiempo real según la búsqueda del usuario
  const filteredProducts = productsList.filter(prod => {
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
          Umbrales guardados con éxito en MySQL
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        
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
                Establece el límite de demanda esperada para cada producto. Si la proyección del modelo para el mes siguiente supera este valor, se disparará una alerta de sobredemanda.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto por nombre, SKU, categoría o marca..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 2.5rem 0.65rem 2.75rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No se encontraron productos que coincidan con "<span style={{ color: '#38bdf8' }}>{searchQuery}</span>"
              </div>
            ) : (
              filteredProducts.map((prod) => (
                <div 
                  key={prod.sku} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '0.85rem 1.15rem', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600', display: 'block' }}>{prod.name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>
                      {prod.sku} {prod.category ? `• ${prod.category}` : ''} {prod.brand ? `• ${prod.brand}` : ''}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => adjustThreshold(prod.sku, -1000)}
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
                      value={productThresholds[prod.sku] !== undefined ? productThresholds[prod.sku] : 0} 
                      onChange={(e) => setProductThresholds({ 
                        ...productThresholds, 
                        [prod.sku]: parseInt(e.target.value) || 0 
                      })}
                      style={{ 
                        background: 'rgba(15, 23, 42, 0.6)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '6px', 
                        padding: '0.45rem 0.5rem', 
                        color: '#f8fafc', 
                        fontSize: '0.88rem', 
                        width: '100px', 
                        textAlign: 'right', 
                        outline: 'none' 
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => adjustThreshold(prod.sku, 1000)}
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

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', marginLeft: '0.2rem' }}>un.</span>
                  </div>
                </div>
              ))
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
