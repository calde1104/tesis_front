import { apiRequest, getEmpresaId } from './api';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const getForecast = async (sku = null) => {
  const empresaId = getEmpresaId();
  try {
    let url = `/v1/${empresaId}/forecast`;
    if (sku) {
      url += `?sku=${encodeURIComponent(sku)}`;
    }
    const data = await apiRequest(url);
    
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(p => {
      const monthLabel = p.mes && p.anio ? `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}` : '';
      return {
        month: monthLabel,
        year: p.anio,
        monthNum: p.mes,
        forecast: p.unidadesPredichas !== null && p.unidadesPredichas !== undefined ? Number(p.unidadesPredichas) : null,
        forecastLower: p.intervaloInf !== null && p.intervaloInf !== undefined ? Number(p.intervaloInf) : null,
        forecastUpper: p.intervaloSup !== null && p.intervaloSup !== undefined ? Number(p.intervaloSup) : null
      };
    });
  } catch (error) {
    console.warn('getForecast API call failed:', error);
    return [];
  }
};

export const getFeatureImportance = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/forecast/feature-importance`);
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(v => ({
      name: v.variable || 'Variable',
      weight: v.importancia ? Number(v.importancia) * 100 : 0
    }));
  } catch (error) {
    console.warn('getFeatureImportance API call failed:', error);
    return [];
  }
};

export const triggerSimulation = async (params = {}) => {
  const empresaId = getEmpresaId();
  try {
    const response = await apiRequest(`/v1/${empresaId}/forecast/simulate`, {
      method: 'POST',
      body: JSON.stringify({ parametros: params })
    });
    return response;
  } catch (error) {
    console.warn('triggerSimulation API call failed:', error);
    throw error;
  }
};
