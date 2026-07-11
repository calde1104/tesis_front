import { useState, useEffect } from 'react';
import { Loader2, Settings, Shield, Activity, RefreshCw } from 'lucide-react';
import { getSystemConfig, updateSystemConfig, getMLModels, triggerRetraining, activateModelVersion } from '../../../services/settings';

const SettingsView = () => {
  const [alertThreshold, setAlertThreshold] = useState(20);
  const [trainingFrequency, setTrainingFrequency] = useState('semanal');
  const [forecastHorizon, setForecastHorizon] = useState(6);
  
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [actionModelId, setActionModelId] = useState(null);

  const fetchConfigAndModels = async () => {
    const [config, modelsList] = await Promise.all([
      getSystemConfig(),
      getMLModels()
    ]);
    setAlertThreshold(config.alertThreshold);
    setTrainingFrequency(config.trainingFrequency);
    setForecastHorizon(config.forecastHorizon);
    setModels(modelsList);
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
              <select value={trainingFrequency} onChange={(e) => setTrainingFrequency(e.target.value)}>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
              <span className="help-text">La frecuencia en que el pipeline de Airflow dispara un script de Python para actualizar las ponderaciones.</span>
            </div>

            <div className="form-group-settings">
              <label>Horizonte Temporal del Pronóstico (Meses)</label>
              <div className="input-with-suffix">
                <input 
                  type="number" 
                  value={forecastHorizon} 
                  onChange={(e) => setForecastHorizon(parseInt(e.target.value))}
                  min="3" 
                  max="24" 
                  required
                />
                <span className="input-suffix">Meses</span>
              </div>
              <span className="help-text">El número de períodos hacia el futuro que calcula y visualiza el gráfico de proyecciones.</span>
            </div>

            <button type="submit" className="btn-primary form-submit-btn" disabled={savingConfig}>
              {savingConfig ? <Loader2 size={16} className="spinner" /> : null}
              Guardar Configuración
            </button>
          </form>
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
                    <th className="number-col">MAPE (%)</th>
                    <th className="number-col">MAE</th>
                    <th className="center-col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className={model.active ? 'active-model-row' : ''}>
                      <td className="version-cell font-bold">{model.version}</td>
                      <td>{model.date}</td>
                      <td className="number-col color-green font-bold">{model.mape}</td>
                      <td className="number-col">{model.mae}</td>
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
    </div>
  );
};

export default SettingsView;
