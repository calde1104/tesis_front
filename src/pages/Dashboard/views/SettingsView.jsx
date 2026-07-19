import { useState, useEffect } from 'react';
import { Loader2, Shield, Building2, Bell, Mail, Brain, Server, CheckCircle2, Sliders } from 'lucide-react';
import { getSystemConfig, updateSystemConfig, getMLModels } from '../../../services/settings';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [alertThreshold, setAlertThreshold] = useState(20);
  const [dohThreshold, setDohThreshold] = useState(10);
  const [distributionEmails, setDistributionEmails] = useState("abastecimiento@molinos.com.ar, logistica@molinos.com.ar");

  const [productThresholds, setProductThresholds] = useState({
    'SKU-001': 12000,
    'SKU-002': 25000,
    'SKU-005': 40000,
    'SKU-007': 30000
  });

  const [activeModel, setActiveModel] = useState({
    version: 'v2.4.1',
    mape: '4.85%',
    mae: '14.200',
    rmse: '18.450',
    date: '08/07/2026',
    dataRange: '01/01/2016 a 30/06/2026'
  });

  const fetchData = async () => {
    try {
      const [config, modelsList] = await Promise.all([
        getSystemConfig(),
        getMLModels()
      ]);
      
      setAlertThreshold(config.alertThreshold || 20);
      setDohThreshold(config.dohThreshold || 10);
      setDistributionEmails(config.distributionEmails || "abastecimiento@molinos.com.ar, logistica@molinos.com.ar");

      const active = modelsList.find(m => m.activo || m.active);
      if (active) {
        setActiveModel({
          version: active.version,
          mape: active.mape,
          mae: active.mae,
          rmse: active.rmse,
          date: active.date.split(' ')[0],
          dataRange: active.dataRange
        });
      }

      const savedThresholds = localStorage.getItem('product_thresholds');
      if (savedThresholds) {
        setProductThresholds(JSON.parse(savedThresholds));
      }
    } catch (e) {
      console.error("Error cargando configuración:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    await updateSystemConfig({
      alertThreshold,
      dohThreshold,
      distributionEmails,
      trainingFrequency: 'mensual',
      forecastHorizon: 12,
      currency: 'ARS'
    });

    localStorage.setItem('product_thresholds', JSON.stringify(productThresholds));
    
    setSaving(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando configuraciones y metadatos de la organización...</p>
      </div>
    );
  }

  return (
    <div className="view-container settings-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: 'calc(100vh - 175px)',
      minHeight: '550px',
      padding: '0 0.5rem 0.5rem 0.5rem',
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
          Configuración y umbrales guardados con éxito
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1.5rem',
        flex: 1,
        minHeight: 0
      }}>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', minHeight: 0 }}>
          
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Sliders size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Umbrales de Demanda Máxima por SKU</h3>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Establece el límite de demanda esperada para cada producto. Si el pronóstico del modelo para el mes siguiente supera este valor, se considerará una sobredemanda y se enviará una notificación de alerta al correo de tu usuario activo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem', marginTop: '0.5rem' }} className="custom-scrollbar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: '600' }}>Aceite Girasol 900ml <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>(SKU-001)</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-001']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-001': parseInt(e.target.value) || 0 })}
                    style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#f8fafc', fontSize: '0.82rem', width: '90px', textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>un.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: '600' }}>Fideos Tallarín 500g <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>(SKU-002)</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-002']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-002': parseInt(e.target.value) || 0 })}
                    style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#f8fafc', fontSize: '0.82rem', width: '90px', textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>un.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: '600' }}>Cerveza Lager Lata 473ml <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>(SKU-005)</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-005']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-005': parseInt(e.target.value) || 0 })}
                    style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#f8fafc', fontSize: '0.82rem', width: '90px', textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>un.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
                <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: '600' }}>Gaseosa Cola 2.25L <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>(SKU-007)</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-007']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-007': parseInt(e.target.value) || 0 })}
                    style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: '#f8fafc', fontSize: '0.82rem', width: '90px', textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>un.</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: 'auto', marginBottom: '0.25rem' }}>
              {saving ? <Loader2 size={15} className="spinner" /> : null}
              Guardar Configuración de Umbrales
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', minHeight: 0 }}>
          
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cuenta de la Organización</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Cliente Corporativo:</span>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>Molinos Río de la Plata S.A.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>CUIT Tributario:</span>
                <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>30-50085862-8</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Tenant UUID (SaaS):</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.7rem' }}>tenant_bfd39b82-99a3-4a11-b12e-13c58209bb10</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Políticas RLS Activas:</span>
                <span style={{ color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Shield size={12} /> Habilitado (Aislamiento de BD)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Rol de Sesión:</span>
                <span style={{ color: '#cbd5e1' }}>Analista de Abastecimiento</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Correo de Alertas (Usuario Activo):</span>
                <span style={{ color: '#38bdf8', fontWeight: '600' }}>analista@molinos.com.ar</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Brain size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Especificaciones del Modelo Predictivo</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Framework Base:</span>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>XGBoost Regressor</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Versión del Modelo:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700' }}>{activeModel.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Error Histórico (MAPE):</span>
                <span style={{ color: '#34d399', fontWeight: '700' }}>{activeModel.mape} (Precisión Alta)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Historial del Entrenamiento:</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>{activeModel.dataRange}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Último Reentrenamiento:</span>
                <span style={{ color: '#cbd5e1' }}>{activeModel.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Frecuencia de Cron:</span>
                <span style={{ color: '#cbd5e1' }}>Mensual (Próximo: 02/08/2026 03:00 AM)</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Server size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Estado del Servidor y Base de Datos</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Servicio de Base de Datos:</span>
                <span style={{ color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  ONLINE (12ms latencia)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Sello de Inmutabilidad:</span>
                <span style={{ color: '#34d399', fontWeight: '700' }}>ACTIVO (PostgreSQL triggers integrados)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Scheduler Airflow:</span>
                <span style={{ color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  CONECTADO
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Endpoint API Gateway:</span>
                <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>https://api.vps-prediccion-b2b.net/v1</span>
              </div>
            </div>
          </div>

        </div>

      </div>

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
