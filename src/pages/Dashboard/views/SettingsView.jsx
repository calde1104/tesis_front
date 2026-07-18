import { useState, useEffect } from 'react';
import { Loader2, Settings, Shield, Activity, RefreshCw, Sparkles } from 'lucide-react';
import { 
  BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { getSystemConfig, updateSystemConfig, getMLModels, triggerRetraining, activateModelVersion } from '../../../services/settings';
import { getFeatureImportance } from '../../../services/forecast';

const SettingsView = () => {
  const [alertThreshold, setAlertThreshold] = useState(20);
  const [trainingFrequency, setTrainingFrequency] = useState('semanal');
  const [forecastHorizon, setForecastHorizon] = useState(6);
  
  const [productThresholds, setProductThresholds] = useState({
    'SKU-001': 12000,
    'SKU-002': 25000,
    'SKU-005': 40000,
    'SKU-007': 30000
  });
  
  const [models, setModels] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [actionModelId, setActionModelId] = useState(null);

  const handleSaveProductThresholds = () => {
    localStorage.setItem('product_thresholds', JSON.stringify(productThresholds));
    alert("Umbrales de stock de seguridad guardados correctamente.");
  };

  const fetchConfigAndModels = async () => {
    const [config, modelsList, featureRes] = await Promise.all([
      getSystemConfig(),
      getMLModels(),
      getFeatureImportance()
    ]);
    setAlertThreshold(config.alertThreshold);
    setTrainingFrequency(config.trainingFrequency);
    setForecastHorizon(config.forecastHorizon);
    setModels(modelsList);
    setFeatureImportance(featureRes);
    
    const saved = localStorage.getItem('product_thresholds');
    if (saved) {
      setProductThresholds(JSON.parse(saved));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigAndModels();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    await updateSystemConfig({
      alertThreshold,
      trainingFrequency,
      forecastHorizon,
      currency: 'ARS'
    });
    setSavingConfig(false);
    alert("Configuración guardada correctamente en base de datos.");
  };

  const handleRetrain = async () => {
    setRetraining(true);
    await triggerRetraining();
    const updatedModels = await getMLModels();
    setModels(updatedModels);
    setRetraining(false);
  };

  const handleActivate = async (modelId) => {
    setActionModelId(modelId);
    await activateModelVersion(modelId);
    const updatedModels = await getMLModels();
    setModels(updatedModels);
    setActionModelId(null);
  };

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando configuraciones y metadatos de modelos...</p>
      </div>
    );
  }

  const activeModel = models.find(m => m.activo || m.active);

  return (
    <div className="view-container settings-view">

      <div className="settings-layout-grid">
        
        <div className="settings-left-col">
          <form className="card config-form-card" onSubmit={handleSaveConfig}>
            <div className="card-header">
              <div className="header-title-flex">
                <Settings size={20} className="icon-blue" />
                <h3>Parámetros de Negocio</h3>
              </div>
            </div>
            
            <div className="form-group-settings">
              <label>Umbral de Alerta de Desvío de Stock (%)</label>
              <div className="input-with-suffix">
                <input 
                  type="number" 
                  value={alertThreshold} 
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  min="5" 
                  max="100" 
                  required
                />
                <span className="input-suffix">%</span>
              </div>
              <span className="help-text">Define la tolerancia de desviación permitida entre las ventas reales y el pronóstico oficial antes de disparar correcciones en la cadena.</span>
            </div>

            <div className="form-group-settings">
              <label>Frecuencia de Reentrenamiento ML</label>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: '#94a3b8',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                Mensual (Fijo)
              </div>
              <span className="help-text">Frecuencia fija del pipeline de Airflow para actualizar las ponderaciones (definido en la arquitectura del VPS).</span>
            </div>

            <div className="form-group-settings">
              <label>Horizonte Temporal del Pronóstico</label>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: '#94a3b8',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                12 Meses (Fijo)
              </div>
              <span className="help-text">Horizonte temporal fijo configurado en el modelo de Machine Learning (XGBoost Regressor).</span>
            </div>

            <button type="submit" className="btn-primary form-submit-btn" disabled={savingConfig}>
              {savingConfig ? <Loader2 size={16} className="spinner" /> : null}
              Guardar Configuración
            </button>
          </form>
          
          <div className="card settings-card" style={{ marginTop: '1.25rem' }}>
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <div className="header-title-flex" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} className="icon-blue" style={{ color: '#38bdf8' }} />
                <h3>Umbrales de Stock por SKU</h3>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Establece el stock de seguridad proyectado para cada SKU. Si la predicción a 12 meses supera este valor, se generará una alerta de desabastecimiento (stockout) en el sistema.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group-settings">
                  <label>Aceite de Girasol (SKU-001)</label>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-001']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-001': parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group-settings">
                  <label>Fideos Tallarín (SKU-002)</label>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-002']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-002': parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group-settings">
                  <label>Cerveza Lager Lata (SKU-005)</label>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-005']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-005': parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group-settings">
                  <label>Gaseosa Cola (SKU-007)</label>
                  <input 
                    type="number" 
                    value={productThresholds['SKU-007']} 
                    onChange={(e) => setProductThresholds({ ...productThresholds, 'SKU-007': parseInt(e.target.value) || 0 })}
                  />
                </div>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleSaveProductThresholds}
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}
                >
                  Guardar Umbrales por Producto
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-right-col">
          <div className="card models-management-card">
            <div className="card-header">
              <div className="header-title-flex">
                <Activity size={20} className="icon-purple" />
                <h3>Control de Modelos ML</h3>
              </div>
            </div>
            
            <p className="subtitle">Historial de modelos generados y estado de activación en el microservicio. El reentrenamiento es automático y asíncrono.</p>
            <div className="scheduler-info-box" style={{ 
              background: 'rgba(129, 140, 248, 0.05)', 
              border: '1px solid rgba(129, 140, 248, 0.1)', 
              padding: '0.6rem 0.75rem', 
              borderRadius: '6px', 
              fontSize: '0.8rem', 
              color: '#cbd5e1',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Loader2 size={14} className="spinner" style={{ color: '#818cf8' }} />
              <span>Próximo reentrenamiento programado: <strong>02/08/2026 03:00 AM</strong> (Mensual, asíncrono de madrugada).</span>
            </div>

            <div className="models-list-wrapper">
              <table className="custom-table models-table">
                <thead>
                  <tr>
                    <th>Versión</th>
                    <th>Fecha</th>
                    <th>Rango de Datos</th>
                    <th className="number-col">MAPE (%)</th>
                    <th className="number-col">MAE</th>
                    <th className="number-col">RMSE</th>
                    <th className="center-col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className={model.active ? 'active-model-row' : ''}>
                      <td className="version-cell font-bold">{model.version}</td>
                      <td>{model.date}</td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{model.dataRange}</td>
                      <td className="number-col color-green font-bold">{model.mape}</td>
                      <td className="number-col">{model.mae}</td>
                      <td className="number-col">{model.rmse}</td>
                      <td className="center-col">
                        {model.active ? (
                          <span className="status-badge success-fill">Activo</span>
                        ) : (
                          <button 
                            className="btn-activate-model"
                            onClick={() => handleActivate(model.id)}
                            disabled={actionModelId !== null}
                          >
                            {actionModelId === model.id ? <Loader2 size={12} className="spinner" /> : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="security-notice">
              <Shield size={16} className="notice-icon" />
              <span>Cualquier cambio de modelo requiere permisos de Admin. La activación de un nuevo modelo impactará inmediatamente en el gráfico de Forecast.</span>
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
        
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
          <div className="simulator-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>{activeModel ? activeModel.version : 'v2.4.1'}</span>
            </div>
            <div className="info-item-tech">
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precisión MAPE</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399' }}>{activeModel ? activeModel.mape : '4.85%'}</span>
            </div>
            <div className="info-item-tech">
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrenado</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#cbd5e1' }}>{activeModel ? activeModel.date : '08/07/2026'}</span>
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

export default SettingsView;
