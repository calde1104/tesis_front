
export const getKPIs = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        sales: { value: 682500, label: 'Ventas del Mes', trend: 12.5 },
        margin: { value: 32.8, label: 'Share of Assortment (SOA)', trend: 1.5 },
        accuracy: { value: 94.2, label: 'Precisión del Modelo', trend: 0.8 },
        priceGap: { value: -4.5, label: 'Price Gap vs Promedio (%)', trend: 0.8 },
      });
    }, 600);
  });
};

export const getSalesEvolution = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { month: 'Ene 26', historical: 400000, forecast: null },
        { month: 'Feb 26', historical: 450000, forecast: null },
        { month: 'Mar 26', historical: 420000, forecast: null },
        { month: 'Abr 26', historical: 480000, forecast: null },
        { month: 'May 26', historical: 510000, forecast: null },
        { month: 'Jun 26', historical: 682500, forecast: null }, // Se calcula dinámicamente en el cliente
        { month: 'Jul 26', historical: null, forecast: 700000, forecastLower: 680000, forecastUpper: 720000 },
        { month: 'Ago 26', historical: null, forecast: 750000, forecastLower: 710000, forecastUpper: 780000 },
        { month: 'Sep 26', historical: null, forecast: 820000, forecastLower: 780000, forecastUpper: 860000 },
        { month: 'Oct 26', historical: null, forecast: 800000, forecastLower: 760000, forecastUpper: 840000 },
        { month: 'Nov 26', historical: null, forecast: 850000, forecastLower: 810000, forecastUpper: 890000 },
        { month: 'Dic 26', historical: null, forecast: 900000, forecastLower: 850000, forecastUpper: 950000 },
        { month: 'Ene 27', historical: null, forecast: 880000, forecastLower: 830000, forecastUpper: 930000 },
        { month: 'Feb 27', historical: null, forecast: 920000, forecastLower: 870000, forecastUpper: 970000 },
        { month: 'Mar 27', historical: null, forecast: 950000, forecastLower: 900000, forecastUpper: 1000000 },
        { month: 'Abr 27', historical: null, forecast: 980000, forecastLower: 930000, forecastUpper: 1030000 },
        { month: 'May 27', historical: null, forecast: 1020000, forecastLower: 970000, forecastUpper: 1070000 },
        { month: 'Jun 27', historical: null, forecast: 1050000, forecastLower: 1000000, forecastUpper: 1100000 },
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
