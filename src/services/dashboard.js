import { apiRequest, getEmpresaId } from './api';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Helper to map backend KPIs to frontend expected structure
// Helper to map backend KPIs to frontend expected structure
const mapBackendKpisToFrontend = (kpis, modelAccuracy = 94.2) => {
  return {
    sales: {
      value: kpis.ventasFacturado || 0,
      label: 'Ventas del Mes',
      trend: 12.5
    },
    margin: {
      value: kpis.shareOfAssortmentPct !== undefined && kpis.shareOfAssortmentPct !== null
        ? parseFloat(kpis.shareOfAssortmentPct.toFixed(1))
        : (kpis.marketShareUnidadesPromedio !== undefined && kpis.marketShareUnidadesPromedio !== null
          ? parseFloat((kpis.marketShareUnidadesPromedio * 100).toFixed(1))
          : 0),
      label: 'Share of Assortment (SOA)',
      trend: 1.5
    },
    priceGap: {
      value: kpis.priceGapPctPromedio !== undefined && kpis.priceGapPctPromedio !== null
        ? parseFloat(kpis.priceGapPctPromedio.toFixed(1))
        : 0,
      label: 'Price Gap vs Promedio (%)',
      trend: 0.8
    },
    accuracy: {
      value: parseFloat(modelAccuracy.toFixed(1)),
      label: 'Precisión del Modelo',
      trend: 0.8
    }
  };
};

const mapSalesEvolutionToFrontend = (points) => {
  if (!points || points.length === 0) return [];
  
  const mappedPoints = points.map(p => {
    const monthLabel = `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`;
    const hasForecast = p.unidadesPronosticadas !== null && p.unidadesPronosticadas !== undefined;
    
    return {
      month: monthLabel,
      rawAnio: p.anio,
      rawMes: p.mes,
      historical: hasForecast ? null : (p.montoFacturado ? Number(p.montoFacturado) : null),
      forecast: hasForecast ? Number(p.unidadesPronosticadas) : null,
      forecastLower: hasForecast ? Number(p.unidadesPronosticadas) * 0.96 : null,
      forecastUpper: hasForecast ? Number(p.unidadesPronosticadas) * 1.04 : null
    };
  });

  const hasFutureForecast = mappedPoints.some(p => p.forecast !== null);

  if (!hasFutureForecast && mappedPoints.length > 0) {
    const lastHistorical = points[points.length - 1];
    let currentAnio = lastHistorical.anio;
    let currentMes = lastHistorical.mes;
    const baseValue = Number(lastHistorical.montoFacturado) || 3000000000;

    const seasonalFactors = [1.05, 1.08, 1.15, 1.22, 1.30, 1.25, 1.18, 1.12, 1.08, 1.15, 1.28, 1.35];

    for (let i = 0; i < 12; i++) {
      currentMes += 1;
      if (currentMes > 12) {
        currentMes = 1;
        currentAnio += 1;
      }
      const monthLabel = `${monthsEs[currentMes - 1]} ${String(currentAnio).slice(-2)}`;
      const forecastVal = Math.round(baseValue * (seasonalFactors[i % 12] || 1.1));

      mappedPoints.push({
        month: monthLabel,
        historical: null,
        forecast: forecastVal,
        forecastLower: Math.round(forecastVal * 0.96),
        forecastUpper: Math.round(forecastVal * 1.04)
      });
    }
  }

  return mappedPoints;
};

const mapMarketShareToFrontend = (compositionList, currentEmpresaId) => {
  if (!compositionList || compositionList.length === 0) return [];
  
  const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#475569'];

  const items = compositionList.map(c => ({
    empresaId: c.empresaId,
    name: c.empresaId === currentEmpresaId ? 'Nuestra Empresa' : c.empresaNombre,
    isOurCompany: c.empresaId === currentEmpresaId,
    value: (c.marketShareUnidadesPromedio || 0) * 100
  })).sort((a, b) => b.value - a.value);

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
  const inflationValue = context && context.macro ? context.macro.ipcVarInteranual : 4.2;
  const exchangeRateValue = context && context.macro ? context.macro.tipoCambioPygUsd : 1050;
  const mes = context && context.macro ? context.macro.mes : 12;
  
  const seasonalityLabel = [12, 1, 2, 7].includes(mes) ? 'Alta' : 'Media';

  return {
    inflation: { value: inflationValue, label: 'Inflación Mensual (%)' },
    exchangeRate: { value: exchangeRateValue, label: 'Tipo de Cambio (USD)' },
    seasonality: { value: seasonalityLabel, label: 'Estacionalidad' },
  };
};

export const getKPIs = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/kpis?anio=${anio}&mes=${mes}`);
    
    let accuracy = 94.2;
    try {
      const models = await apiRequest(`/v1/${empresaId}/models`);
      if (models && models.length > 0) {
        const active = models.find(m => m.activo || m.active) || models[0];
        if (active && active.mape !== undefined) {
          const mapeVal = typeof active.mape === 'string' ? parseFloat(active.mape) : active.mape;
          accuracy = 100 - mapeVal;
        }
      }
    } catch (e) {
      // Fallback if models endpoint is unavailable
    }

    return mapBackendKpisToFrontend(data, accuracy);
  } catch (error) {
    console.warn('getKPIs failed. Falling back to mock data.', error);
    return {
      sales: { value: 682500, label: 'Ventas del Mes', trend: 12.5 },
      margin: { value: 32.8, label: 'Share of Assortment (SOA)', trend: 1.5 },
      accuracy: { value: 94.2, label: 'Precisión del Modelo', trend: 0.8 },
      priceGap: { value: -4.5, label: 'Price Gap vs Promedio (%)', trend: 0.8 }
    };
  }
};

export const getSalesEvolution = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/sales-evolution`);
    return mapSalesEvolutionToFrontend(data);
  } catch (error) {
    console.warn('getSalesEvolution failed. Falling back to mock data.', error);
    return [
      { month: 'Ene 26', historical: 400000, forecast: null },
      { month: 'Feb 26', historical: 450000, forecast: null },
      { month: 'Mar 26', historical: 420000, forecast: null },
      { month: 'Abr 26', historical: 480000, forecast: null },
      { month: 'May 26', historical: 510000, forecast: null },
      { month: 'Jun 26', historical: 682500, forecast: null }
    ];
  }
};

export const getMarketShareComposition = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/market-share-composition?anio=${anio}&mes=${mes}`);
    return mapMarketShareToFrontend(data, empresaId);
  } catch (error) {
    console.warn('getMarketShareComposition failed. Falling back to mock data.', error);
    return [
      { name: 'Nuestra Empresa', value: 34.5, fill: '#38bdf8' },
      { name: 'Competidor A', value: 25.0, fill: '#cbd5e1' },
      { name: 'Competidor B', value: 20.5, fill: '#94a3b8' },
      { name: 'Otros', value: 20.0, fill: '#475569' }
    ];
  }
};

export const getContextVariables = async (anio = 2025, mes = 12) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/dashboard/context-variables?anio=${anio}&mes=${mes}`);
    return mapContextVariablesToFrontend(data);
  } catch (error) {
    console.warn('getContextVariables failed. Falling back to mock data.', error);
    return {
      inflation: { value: 4.2, label: 'Inflación Mensual (%)' },
      exchangeRate: { value: 1050, label: 'Tipo de Cambio (USD)' },
      seasonality: { value: 'Alta', label: 'Estacionalidad' }
    };
  }
};
