
export const getSystemConfig = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let config = localStorage.getItem('system_config');
      if (!config) {
        const initial = {
          alertThreshold: 20,
          trainingFrequency: 'mensual',
          forecastHorizon: 12,
          currency: 'ARS'
        };
        localStorage.setItem('system_config', JSON.stringify(initial));
        config = JSON.stringify(initial);
      }
      resolve(JSON.parse(config));
    }, 200);
  });
};

export const updateSystemConfig = async (newConfig) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.setItem('system_config', JSON.stringify(newConfig));
      resolve({ success: true, message: 'Configuración guardada correctamente' });
    }, 300);
  });
};

export const getMLModels = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let models = localStorage.getItem('ml_models');
      if (!models) {
        const initial = [
          { id: 'm-001', version: 'v2.4.1', date: '08/07/2026 14:32', dataRange: '01/01/2016 a 30/06/2026', mape: '4.85%', mae: '14.200', rmse: '18.450', active: true, desalineado: true },
          { id: 'm-002', version: 'v2.4.0', date: '01/07/2026 09:15', dataRange: '01/01/2016 a 31/05/2026', mape: '5.20%', mae: '15.800', rmse: '20.110', active: false, desalineado: false },
          { id: 'm-003', version: 'v2.3.5', date: '15/06/2026 11:45', dataRange: '01/01/2016 a 30/04/2026', mape: '5.95%', mae: '18.100', rmse: '23.050', active: false, desalineado: false }
        ];
        localStorage.setItem('ml_models', JSON.stringify(initial));
        models = JSON.stringify(initial);
      }
      resolve(JSON.parse(models));
    }, 300);
  });
};

export const triggerRetraining = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const models = JSON.parse(localStorage.getItem('ml_models') || '[]');
      const newVersion = `v2.4.${models.length + 1}`;
      const newModel = {
        id: 'm-' + Math.random().toString(36).substring(2, 5),
        version: newVersion,
        date: new Date().toLocaleDateString('es-AR') + ' 03:00',
        dataRange: '01/01/2016 a ' + new Date().toLocaleDateString('es-AR'),
        mape: (4.0 + Math.random() * 0.7).toFixed(2) + '%',
        mae: Math.floor(12000 + Math.random() * 2000).toLocaleString('es-AR'),
        rmse: Math.floor(16000 + Math.random() * 2000).toLocaleString('es-AR'),
        active: false
      };
      models.unshift(newModel);
      localStorage.setItem('ml_models', JSON.stringify(models));
      resolve({ success: true, newModel });
    }, 600);
  });
};

export const activateModelVersion = async (modelId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const models = JSON.parse(localStorage.getItem('ml_models') || '[]');
      const updated = models.map(m => ({
        ...m,
        active: m.id === modelId
      }));
      localStorage.setItem('ml_models', JSON.stringify(updated));
      resolve({ success: true, message: 'Modelo activado correctamente' });
    }, 300);
  });
};
