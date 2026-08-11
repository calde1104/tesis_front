import { apiRequest, getEmpresaId } from './api';

const configParamKeys = {
  alertThreshold: 'ALERTA_STOCK_MINIMO_PCT',
  trainingFrequency: 'FRECUENCIA_ENTRENAMIENTO_MODELO',
  forecastHorizon: 'HORIZONTE_PRONOSTICO_MESES',
  currency: 'MONEDA_VISUALIZACION'
};

export const getSystemInfo = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/system-info`);
    return data;
  } catch (error) {
    console.warn('getSystemInfo API call failed:', error);
    return null;
  }
};

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
  const empresaId = getEmpresaId();
  
  try {
    const promises = Object.entries(newConfig).map(([key, value]) => {
      const dbParamKey = configParamKeys[key];
      if (dbParamKey) {
        return apiRequest(`/v1/${empresaId}/config`, {
          method: 'POST',
          body: JSON.stringify({
            parametro: dbParamKey,
            valor: value.toString(),
            productoId: null
          })
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    localStorage.setItem('system_config', JSON.stringify(newConfig));
    return { success: true, message: 'Configuración guardada correctamente en el servidor' };
  } catch (error) {
    console.warn('Failed to update system config in backend. Saving locally.', error);
    localStorage.setItem('system_config', JSON.stringify(newConfig));
    return { success: true, message: 'Configuración guardada localmente' };
  }
};

export const getProductThresholds = async () => {
  const empresaId = getEmpresaId();
  const storageKey = `product_thresholds_${empresaId}`;
  
  try {
    let data = await apiRequest(`/v1/${empresaId}/config`);
    if (data && !Array.isArray(data) && Array.isArray(data.data)) {
      data = data.data;
    }
    
    if (Array.isArray(data)) {
      const thresholdsMap = {};
      data.forEach(item => {
        if (item.parametro === 'UMBRAL_DEMANDA_MAXIMA' && item.valor) {
          const key = item.productoId || item.producto_id || item.sku;
          if (key) {
            thresholdsMap[key] = parseInt(item.valor, 10);
          }
        }
      });
      if (Object.keys(thresholdsMap).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(thresholdsMap));
        localStorage.setItem('product_thresholds', JSON.stringify(thresholdsMap));
        return thresholdsMap;
      }
    }
  } catch (error) {
    console.warn('getProductThresholds API call failed:', error);
  }

  const saved = localStorage.getItem(storageKey) || localStorage.getItem('product_thresholds');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing saved thresholds:", e);
    }
  }
  return {};
};

export const saveProductThresholds = async (thresholdsMap) => {
  const empresaId = getEmpresaId();
  const storageKey = `product_thresholds_${empresaId}`;

  localStorage.setItem(storageKey, JSON.stringify(thresholdsMap));
  localStorage.setItem('product_thresholds', JSON.stringify(thresholdsMap));

  try {
    const promises = Object.entries(thresholdsMap).map(([productoId, valor]) => {
      return apiRequest(`/v1/${empresaId}/config`, {
        method: 'POST',
        body: JSON.stringify({
          productoId,
          parametro: 'UMBRAL_DEMANDA_MAXIMA',
          valor: valor.toString()
        })
      });
    });

    // Usar allSettled para evitar que un fallo en un SKU (ej. ID vs String) rompa todo el lote
    await Promise.allSettled(promises);
    return { success: true, message: 'Umbrales procesados en la base de datos' };
  } catch (error) {
    console.warn('Failed to persist thresholds to backend. Saving to localStorage fallback.', error);
    return { success: true, message: 'Umbrales guardados localmente' };
  }
};

export const getMLModels = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/models`);
    
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((m) => {
      const formattedDate = m.fechaEntrenamiento 
        ? String(m.fechaEntrenamiento).replace('T', ' ').substring(0, 16) 
        : (m.fechaCreacion ? String(m.fechaCreacion).replace('T', ' ').substring(0, 16) : null);

      return {
        id: m.id,
        version: m.version,
        date: formattedDate,
        dataRange: m.rangoEntrenamiento || m.dataRange || null,
        mape: m.mape != null ? `${m.mape.toFixed(2)}%` : null,
        mae: m.mae != null ? Math.round(m.mae).toLocaleString('es-AR') : null,
        rmse: m.rmse != null ? Math.round(m.rmse).toLocaleString('es-AR') : null,
        active: m.activo || m.active || false,
        desalineado: m.mape != null ? m.mape > 5.0 : false
      };
    });
  } catch (error) {
    console.warn('getMLModels API request failed:', error);
    return [];
  }
};


