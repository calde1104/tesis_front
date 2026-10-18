import { apiRequest, getEmpresaId } from './api';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Helper to map backend KPIs to frontend expected structure
// Helper to map backend KPIs to frontend expected structure
const mapBackendKpisToFrontend = (kpis, prevKpis = null, modelAccuracy = null) => {
  let salesTrend = null;
  if (kpis && prevKpis && prevKpis.ventasFacturado > 0 && kpis.ventasFacturado !== null && kpis.ventasFacturado !== undefined) {
    const currentVal = Number(kpis.ventasFacturado);
    const prevVal = Number(prevKpis.ventasFacturado);
    salesTrend = parseFloat((((currentVal - prevVal) / prevVal) * 100).toFixed(1));
  }

  let marginTrend = null;
  const currentSoa = kpis && kpis.shareOfAssortmentPct !== undefined && kpis.shareOfAssortmentPct !== null
    ? kpis.shareOfAssortmentPct
    : (kpis && kpis.marketShareUnidadesPromedio !== undefined && kpis.marketShareUnidadesPromedio !== null
      ? kpis.marketShareUnidadesPromedio * 100
      : null);

  const prevSoa = prevKpis && prevKpis.shareOfAssortmentPct !== undefined && prevKpis.shareOfAssortmentPct !== null
    ? prevKpis.shareOfAssortmentPct
    : (prevKpis && prevKpis.marketShareUnidadesPromedio !== undefined && prevKpis.marketShareUnidadesPromedio !== null
      ? prevKpis.marketShareUnidadesPromedio * 100
      : null);

  if (currentSoa !== null && prevSoa !== null) {
    marginTrend = parseFloat((currentSoa - prevSoa).toFixed(1));
  }

  let priceGapTrend = null;
  if (kpis && kpis.priceGapPctPromedio !== null && kpis.priceGapPctPromedio !== undefined &&
      prevKpis && prevKpis.priceGapPctPromedio !== null && prevKpis.priceGapPctPromedio !== undefined) {
    priceGapTrend = parseFloat((kpis.priceGapPctPromedio - prevKpis.priceGapPctPromedio).toFixed(1));
  }

  return {
    sales: {
      value: kpis ? kpis.ventasFacturado || 0 : 0,
      label: 'Ventas del Mes',
      trend: salesTrend
    },
    margin: {
      value: currentSoa !== null ? parseFloat(currentSoa.toFixed(1)) : 0,
      label: 'Share of Assortment (SOA)',
      trend: marginTrend
    },
    priceGap: {
      value: kpis && kpis.priceGapPctPromedio !== undefined && kpis.priceGapPctPromedio !== null
        ? parseFloat(kpis.priceGapPctPromedio.toFixed(1))
        : 0,
      label: 'Price Gap vs Promedio (%)',
      trend: priceGapTrend
    },
    accuracy: {
      value: modelAccuracy !== null && modelAccuracy !== undefined ? parseFloat(modelAccuracy.toFixed(1)) : null,
      label: 'Error del Modelo (MAPE)',
      trend: null
    }
  };
};

const mapSalesEvolutionToFrontend = (points) => {
  if (!points || points.length === 0) return [];
  
  return points.map(p => {
    const monthLabel = `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`;
    const hasForecast = p.unidadesPronosticadas !== null && p.unidadesPronosticadas !== undefined;
    
    return {
      month: monthLabel,
      rawAnio: p.anio,
      rawMes: p.mes,
      historical: hasForecast ? null : (p.montoFacturado ? Number(p.montoFacturado) : null),
      historicalUnits: p.unidadesVendidas !== null && p.unidadesVendidas !== undefined ? Number(p.unidadesVendidas) : null,
      forecast: hasForecast ? Number(p.unidadesPronosticadas) : null,
      forecastLower: hasForecast ? Number(p.unidadesPronosticadas) * 0.96 : null,
      forecastUpper: hasForecast ? Number(p.unidadesPronosticadas) * 1.04 : null
    };
  });
};

const mapMarketShareToFrontend = (compositionList, currentEmpresaId) => {
  if (!compositionList || compositionList.length === 0) return [];
  
  const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#475569'];

  const rawItems = compositionList.map(c => {
    const pctVal = Number(c.marketShareUnidadesPromedio || 0);
    return {
      empresaId: c.empresaId,
      name: c.empresaId === currentEmpresaId ? 'Nuestra Empresa' : c.empresaNombre,
      isOurCompany: c.empresaId === currentEmpresaId,
      value: pctVal
    };
  }).sort((a, b) => b.value - a.value);

  const totalMarketVal = rawItems.reduce((sum, item) => sum + item.value, 0);
  const items = totalMarketVal > 0 
    ? rawItems.map(item => ({ ...item, value: (item.value / totalMarketVal) * 100 }))
    : rawItems;

  const topLeaders = items.slice(0, 3);
  const isInTopLeaders = topLeaders.some(item => item.isOurCompany);

  let selected = [...topLeaders];

  if (!isInTopLeaders) {
    const ourCompany = items.find(item => item.isOurCompany);
    if (ourCompany) {
      selected.push(ourCompany);
    }
  }

  const selectedIds = new Set(selected.map(s => s.empresaId));
  const othersValue = items
    .filter(item => !selectedIds.has(item.empresaId))
    .reduce((sum, item) => sum + item.value, 0);

  let colorIdx = 0;
  const result = selected.map((item) => ({
    name: item.name,
    value: parseFloat(item.value.toFixed(1)),
    fill: item.isOurCompany ? '#38bdf8' : (colors[colorIdx++] || '#475569')
  }));

  if (othersValue > 0) {
    result.push({
      name: 'Otros',
      value: parseFloat(othersValue.toFixed(1)),
      fill: '#334155'
    });
  }
  
  return result;
};

const mapContextVariablesToFrontend = (context) => {
  const inflationValue = context && context.macro ? context.macro.ipcVarInteranual : null;
  const exchangeRateValue = context && context.macro ? context.macro.tipoCambioPygUsd : null;
  const mes = context && context.macro ? context.macro.mes : null;
  
  const seasonalityLabel = mes ? ([12, 1, 2, 7].includes(mes) ? 'Alta' : 'Media') : 'Sin datos';

  return {
    inflation: { value: inflationValue, label: 'Inflación Interanual (%)' },
    exchangeRate: { value: exchangeRateValue, label: 'Tipo de Cambio (USD)' },
    seasonality: { value: seasonalityLabel, label: 'Estacionalidad' },
  };
};

export const getKPIs = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/kpis?anio=${anio}&mes=${mes}`);
    
    let prevData = null;
    try {
      let prevAnio = anio;
      let prevMes = mes - 1;
      if (prevMes < 1) {
        prevMes = 12;
        prevAnio = anio - 1;
      }
      prevData = await apiRequest(`/v1/${empresaId}/dashboard/kpis?anio=${prevAnio}&mes=${prevMes}`);
    } catch (e) {
      // Previous month might not exist in database, prevData stays null
    }

    // Tomar el MAPE (h=1) del modelo activo tal cual se reporta, sin derivar
    // una "precisión" (100 - MAPE) que no es una equivalencia estándar.
    let accuracy = null;
    try {
      const models = await apiRequest(`/v1/${empresaId}/models`);
      if (models && models.length > 0) {
        const active = models.find(m => m.activo || m.active) || models[0];
        if (active && active.mape !== undefined && active.mape !== null) {
          accuracy = typeof active.mape === 'string' ? parseFloat(active.mape) : active.mape;
        }
      }
    } catch (e) {
      // Fallback if models endpoint is unavailable
    }

    return mapBackendKpisToFrontend(data, prevData, accuracy);
  } catch (error) {
    console.error('Error al obtener KPIs:', error);
    throw error;
  }
};

export const getSalesEvolution = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/sales-evolution`);
    return mapSalesEvolutionToFrontend(data);
  } catch (error) {
    console.error('Error al obtener evolución de ventas:', error);
    return [];
  }
};

export const getMarketShareComposition = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/market-share-composition?anio=${anio}&mes=${mes}`);
    return mapMarketShareToFrontend(data, empresaId);
  } catch (error) {
    console.error('Error al obtener composición de mercado:', error);
    return [];
  }
};

export const getContextVariables = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/context-variables?anio=${anio}&mes=${mes}`);
    return mapContextVariablesToFrontend(data);
  } catch (error) {
    console.error('Error al obtener variables de contexto:', error);
    return {
      inflation: { value: null, label: 'Inflación Mensual (%)' },
      exchangeRate: { value: null, label: 'Tipo de Cambio (USD)' },
      seasonality: { value: 'Sin datos', label: 'Estacionalidad' }
    };
  }
};
