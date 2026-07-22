import { useState, useEffect } from 'react';
import { Loader2, Sliders, CheckCircle2 } from 'lucide-react';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [productThresholds, setProductThresholds] = useState({
    'SKU-001': 12000,
    'SKU-002': 25000,
    'SKU-005': 40000,
    'SKU-007': 30000
  });

  useEffect(() => {
    const savedThresholds = localStorage.getItem('product_thresholds');
    if (savedThresholds) {
      try {
        setProductThresholds(JSON.parse(savedThresholds));
      } catch (e) {
        console.error("Error leyendo umbrales de localStorage:", e);
      }
    }
    setLoading(false);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    localStorage.setItem('product_thresholds', JSON.stringify(productThresholds));
    
    setTimeout(() => {
      setSaving(false);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }, 400);
  };

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600', display: 'block' }}>Aceite Girasol 1.5L</span>
                <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>SKU-001 • Alimentos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={productThresholds['SKU-001']} 
                  onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-001': parseInt(e.target.value) || 0 })}
                  style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#f8fafc', fontSize: '0.88rem', width: '120px', textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>un.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600', display: 'block' }}>Fideos Tallarín 500g</span>
                <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>SKU-002 • Alimentos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={productThresholds['SKU-002']} 
                  onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-002': parseInt(e.target.value) || 0 })}
                  style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#f8fafc', fontSize: '0.88rem', width: '120px', textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>un.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600', display: 'block' }}>Cerveza Lager Lata 473ml</span>
                <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>SKU-005 • Bebidas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={productThresholds['SKU-005']} 
                  onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-005': parseInt(e.target.value) || 0 })}
                  style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#f8fafc', fontSize: '0.88rem', width: '120px', textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>un.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600', display: 'block' }}>Gaseosa Cola 2.25L</span>
                <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>SKU-007 • Bebidas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={productThresholds['SKU-007']} 
                  onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-007': parseInt(e.target.value) || 0 })}
                  style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#f8fafc', fontSize: '0.88rem', width: '120px', textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>un.</span>
              </div>
            </div>

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
