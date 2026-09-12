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
      const salesRes = await apiRequest(`/v1/${empresaId}/sales?search=${encodeURIComponent(sku)}&anios=2021,2022,2023,2024,2025,2026,2027,2028,2029,2030&page=0&size=100`);
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
    
    let rawForecastRes = null;
    try {
      rawForecastRes = await apiRequest(url);
    } catch (err) {
      console.warn('Endpoint forecast sin datos o inactivo:', err);
    }

    let forecastList = [];
    if (Array.isArray(rawForecastRes)) {
      forecastList = rawForecastRes;
    } else if (rawForecastRes && Array.isArray(rawForecastRes.data)) {
      forecastList = rawForecastRes.data;
    } else if (rawForecastRes && Array.isArray(rawForecastRes.content)) {
      forecastList = rawForecastRes.content;
    }

    const getVal = (obj, keys) => {
      if (!obj) return null;
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return Number(obj[k]);
      }
      return null;
    };

    const lastHist = historicalPoints.length > 0 ? historicalPoints[historicalPoints.length - 1] : null;
    let currYear = lastHist ? lastHist.year : 2025;
    let currMonth = lastHist ? lastHist.monthNum : 12;

    const forecastPoints = [];
    for (let i = 0; i < 12; i++) {
      currMonth++;
      if (currMonth > 12) {
        currMonth = 1;
        currYear++;
      }
      
      const rawMatch = forecastList.length > 0 
        ? forecastList.find(p => Number(p.anio) === currYear && Number(p.mes) === currMonth)
        : null;

      const predicted = getVal(rawMatch, ['unidadesPredichas', 'unidades_predichas', 'unidades', 'montoPredicho', 'monto_predicho', 'cantidad', 'valor', 'forecast', 'prediccion']);
      const rawLower = getVal(rawMatch, ['intervaloConfianzaInf', 'intervalo_confianza_inf', 'intervaloInf', 'inf']);
      const rawUpper = getVal(rawMatch, ['intervaloConfianzaSup', 'intervalo_confianza_sup', 'intervaloSup', 'sup']);

      const lower = rawLower !== null && rawLower !== undefined ? rawLower : (predicted !== null ? Math.round(predicted * 0.85) : null);
      const upper = rawUpper !== null && rawUpper !== undefined ? rawUpper : (predicted !== null ? Math.round(predicted * 1.15) : null);

      forecastPoints.push({
        month: `${monthsEs[currMonth - 1]} ${String(currYear).slice(-2)}`,
        year: currYear,
        monthNum: currMonth,
        historical: null,
        forecast: predicted,
        forecastLower: lower,
        forecastUpper: upper
      });
    }

    const validForecastPoints = forecastPoints.filter(p => p.forecast !== null && p.forecast !== undefined);

    if (lastHist && validForecastPoints.length > 0 && (lastHist.forecast === null || lastHist.forecast === undefined)) {
      lastHist.forecast = lastHist.historical;
    }

    return [...historicalPoints, ...validForecastPoints];
  } catch (error) {
    console.warn('getForecast API call failed:', error);
    return [];
  }
};

// Los campos llegan en snake_case porque el backend no los traduce. Si el
// servicio de IA no responde, el backend contesta 502 y se propaga el error:
// no hay datos simulados.
export const getFeatureImportance = async () => {
  const empresaId = getEmpresaId();
  const data = await apiRequest(`/v1/${empresaId}/forecast/feature-importance`);

  if (!data || !Array.isArray(data.importancia_variables)) {
    const error = new Error('Respuesta de explicabilidad con formato inesperado');
    error.status = 0;
    throw error;
  }

  return {
    modeloTipo: data.modelo_tipo || null,
    totalVariables: Number(data.total_variables) || data.importancia_variables.length,
    resumenPorGrupo: Object.entries(data.resumen_por_grupo || {})
      .map(([grupo, pct]) => ({ grupo, pct: Number(pct) || 0 }))
      .sort((a, b) => b.pct - a.pct),
    variables: data.importancia_variables.map(v => ({
      feature: v.feature,
      nombre: v.nombre_descriptivo || v.feature,
      grupo: v.grupo || 'Sin grupo',
      pct: Number(v.importancia_pct) || 0,
      nivelImpacto: v.nivel_impacto || null
    }))
  };
};

export const triggerSimulation = async (params = {}) => {
  const empresaId = getEmpresaId();
  try {
    const payload = {
      id_producto: String(params.id_producto || params.idProducto || params.sku || 'SKU-001'),
      precio_pct: Number(params.precio_pct !== undefined ? params.precio_pct : (params.priceChange || 0)),
      usd_pct: Number(params.usd_pct !== undefined ? params.usd_pct : (params.exchangeRateChange || 0)),
      ipc_pct: Number(params.ipc_pct !== undefined ? params.ipc_pct : (params.inflationChange || 0))
    };

    const response = await apiRequest(`/v1/${empresaId}/forecast/simulate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response;
  } catch (error) {
    console.warn('triggerSimulation API call failed:', error);
    throw error;
  }
};
