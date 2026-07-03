
export const getKPIs = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        sales: { value: 682500, label: 'Ventas del Mes', trend: 12.5 },
        projections: { value: 720000, label: 'Proyección (Forecast)', trend: 5.2 },
        marketShare: { value: 34.5, label: 'Market Share (%)', trend: -1.2 },
        priceGap: { value: -4.5, label: 'Price Gap vs Promedio (%)', trend: 0.8 },
      });
    }, 600);
  });
};

export const getSalesEvolution = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { month: 'Ene', historical: 400000, forecast: null },
        { month: 'Feb', historical: 450000, forecast: null },
        { month: 'Mar', historical: 420000, forecast: null },
        { month: 'Abr', historical: 480000, forecast: null },
        { month: 'May', historical: 510000, forecast: null },
        { month: 'Jun', historical: 682500, forecast: null },
        { month: 'Jul', historical: null, forecast: 700000, forecastLower: 680000, forecastUpper: 720000 },
        { month: 'Ago', historical: null, forecast: 750000, forecastLower: 710000, forecastUpper: 780000 },
        { month: 'Sep', historical: null, forecast: 820000, forecastLower: 780000, forecastUpper: 860000 },
      ]);
    }, 800);
  });
};

export const getMarketShareComposition = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: 'Nuestra Empresa', value: 34.5, fill: '#38bdf8' },
        { name: 'Competidor A', value: 25.0, fill: '#cbd5e1' },
        { name: 'Competidor B', value: 20.5, fill: '#94a3b8' },
        { name: 'Otros', value: 20.0, fill: '#475569' },
      ]);
    }, 500);
  });
};

export const getContextVariables = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        inflation: { value: 4.2, label: 'Inflación Mensual (%)' },
        exchangeRate: { value: 1050, label: 'Tipo de Cambio (USD)' },
        seasonality: { value: 'Alta', label: 'Estacionalidad' },
      });
    }, 400);
  });
};
