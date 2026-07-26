import { apiRequest, getEmpresaId } from './api';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const getForecast = async (sku = null) => {
  const empresaId = getEmpresaId();

  try {
    let historicalPoints = [];

    if (!sku) {
      const evoData = await apiRequest(`/v1/${empresaId}/dashboard/sales-evolution`);
      if (evoData && Array.isArray(evoData)) {
        const last12 = evoData.slice(-12);
        historicalPoints = last12.map(p => ({
          month: `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`,
          year: p.anio,
          monthNum: p.mes,
          historical: p.unidadesVendidas !== null && p.unidadesVendidas !== undefined 
            ? Number(p.unidadesVendidas) 
            : (p.montoFacturado ? Number(p.montoFacturado) : 0),
          historicalRevenue: p.montoFacturado !== null && p.montoFacturado !== undefined ? Number(p.montoFacturado) : null,
          forecast: null
        }));
      }
    } else {
      const salesRes = await apiRequest(`/v1/${empresaId}/sales?search=${encodeURIComponent(sku)}&anios=2021,2022,2023,2024,2025&page=0&size=100`);
      if (salesRes && salesRes.content && Array.isArray(salesRes.content)) {
        const skuItems = salesRes.content.filter(item => String(item.sku).trim() === String(sku).trim());
        skuItems.sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
        const last12 = skuItems.slice(-12);
        historicalPoints = last12.map(p => ({
          month: `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`,
          year: p.anio,
          monthNum: p.mes,
          historical: Number(p.unidadesVendidas) || 0,
          historicalRevenue: p.montoFacturado !== null && p.montoFacturado !== undefined ? Number(p.montoFacturado) : null,
          forecast: null
        }));
      }
    }

    let url = `/v1/${empresaId}/forecast`;
    if (sku) {
      url += `?sku=${encodeURIComponent(sku)}`;
    }
    const forecastRes = await apiRequest(url);

    const forecastPoints = (forecastRes && Array.isArray(forecastRes))
      ? forecastRes.map(p => ({
          month: p.mes && p.anio ? `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}` : '',
          year: p.anio,
          monthNum: p.mes,
          historical: null,
          forecast: p.unidadesPredichas !== null && p.unidadesPredichas !== undefined ? Number(p.unidadesPredichas) : null,
          forecastLower: p.intervaloInf !== null && p.intervaloInf !== undefined ? Number(p.intervaloInf) : null,
          forecastUpper: p.intervaloSup !== null && p.intervaloSup !== undefined ? Number(p.intervaloSup) : null
        }))
      : [];

    if (historicalPoints.length > 0 && forecastPoints.length > 0) {
      const lastHist = historicalPoints[historicalPoints.length - 1];
      lastHist.forecast = lastHist.historical;
    }

    return [...historicalPoints, ...forecastPoints];
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
