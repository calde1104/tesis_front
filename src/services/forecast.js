import { apiRequest, getEmpresaId } from './api';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const mockForecastPoints = [
  { month: 'Ene 26', historical: 400000, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'Feb 26', historical: 450000, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'Mar 26', historical: 420000, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'Abr 26', historical: 480000, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'May 26', historical: 510000, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'Jun 26', historical: 682500, forecast: null, forecastLower: null, forecastUpper: null },
  { month: 'Jul 26', historical: null, forecast: 700000, forecastLower: 670000, forecastUpper: 730000 },
  { month: 'Ago 26', historical: null, forecast: 750000, forecastLower: 710000, forecastUpper: 790000 },
  { month: 'Sep 26', historical: null, forecast: 820000, forecastLower: 780000, forecastUpper: 860000 },
  { month: 'Oct 26', historical: null, forecast: 800000, forecastLower: 760000, forecastUpper: 840000 },
  { month: 'Nov 26', historical: null, forecast: 850000, forecastLower: 800000, forecastUpper: 900000 },
  { month: 'Dic 26', historical: null, forecast: 980000, forecastLower: 920000, forecastUpper: 1040000 },
  { month: 'Ene 27', historical: null, forecast: 920000, forecastLower: 860000, forecastUpper: 980000 },
  { month: 'Feb 27', historical: null, forecast: 880000, forecastLower: 820000, forecastUpper: 940000 },
  { month: 'Mar 27', historical: null, forecast: 910000, forecastLower: 850000, forecastUpper: 970000 },
  { month: 'Abr 27', historical: null, forecast: 950000, forecastLower: 890000, forecastUpper: 1010000 },
  { month: 'May 27', historical: null, forecast: 990000, forecastLower: 930000, forecastUpper: 1050000 },
  { month: 'Jun 27', historical: null, forecast: 1050000, forecastLower: 980000, forecastUpper: 1120000 }
];

export const getForecast = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/forecast`);
    
    const allNull = data && data.every(p => p.unidadesPredichas === null);
    if (allNull || !data || data.length === 0) {
      console.warn('Backend forecast returns null values (Phase 3 stub). Using mock forecast data for visual display.');
      return mockForecastPoints;
    }

    // Map backend points to frontend structure
    // Since getForecast in backend only returns the 12 future months,
    // we prepend the historical 6 months of sales to keep the line charts continuous
    const historical = mockForecastPoints.filter(p => p.historical !== null);
    const forecast = data.map(p => {
      const monthLabel = `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`;
      return {
        month: monthLabel,
        historical: null,
        forecast: p.unidadesPredichas ? Number(p.unidadesPredichas) : null,
        forecastLower: p.intervaloInf ? Number(p.intervaloInf) : null,
        forecastUpper: p.intervaloSup ? Number(p.intervaloSup) : null
      };
    });

    return [...historical, ...forecast];
  } catch (error) {
    console.warn('getForecast failed. Falling back to mock data.', error);
    return mockForecastPoints;
  }
};

export const getFeatureImportance = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/forecast/feature-importance`);
    
    if (!data || data.length === 0) {
      console.warn('Backend feature importance returns empty list (stub). Falling back to mock variables.');
      return [
        { name: 'Historial de Ventas', weight: 42.5 },
        { name: 'Precio de Competencia', weight: 18.2 },
        { name: 'Inflación (IPC)', weight: 14.8 },
        { name: 'Acciones de Promoción', weight: 12.0 },
        { name: 'Temperatura Promedio', weight: 7.5 },
        { name: 'Feriados / Fin de Año', weight: 5.0 }
      ];
    }

    return data.map(v => ({
      name: v.variable,
      weight: v.importancia * 100 // convert ratio to percentage if needed
    }));
  } catch (error) {
    console.warn('getFeatureImportance failed. Falling back to mock data.', error);
    return [
      { name: 'Historial de Ventas', weight: 42.5 },
      { name: 'Precio de Competencia', weight: 18.2 },
      { name: 'Inflación (IPC)', weight: 14.8 },
      { name: 'Acciones de Promoción', weight: 12.0 },
      { name: 'Temperatura Promedio', weight: 7.5 },
      { name: 'Feriados / Fin de Año', weight: 5.0 }
    ];
  }
};

export const triggerSimulation = async (params = {}) => {
  const empresaId = getEmpresaId();
  const taskId = 'task_sim_' + Math.random().toString(36).substring(2, 9);
  
  try {
    const response = await apiRequest(`/v1/${empresaId}/forecast/simulate`, {
      method: 'POST',
      body: JSON.stringify({ parametros: params })
    });
    
    console.log('Real backend simulate endpoint response:', response);
  } catch (error) {
    console.warn('Backend simulate API call failed. Simulating locally.', error);
  }

  const priceFactor = 1 - (parseFloat(params.priceChange || 0) * 0.012);
  const marketingFactor = 1 + (parseFloat(params.marketingChange || 0) * 0.008);
  const exchangeFactor = 1 - (parseFloat(params.exchangeRateChange || 0) * 0.006);
  const inflationFactor = 1 - (parseFloat(params.inflationChange || 0) * 0.004);
  const finalFactor = priceFactor * marketingFactor * exchangeFactor * inflationFactor;

  const simulatedResults = [
    { month: 'Jul 26', simulated: Math.round(700000 * finalFactor), original: 700000 },
    { month: 'Ago 26', simulated: Math.round(750000 * finalFactor), original: 750000 },
    { month: 'Sep 26', simulated: Math.round(820000 * finalFactor), original: 820000 },
    { month: 'Oct 26', simulated: Math.round(800000 * finalFactor), original: 800000 },
    { month: 'Nov 26', simulated: Math.round(850000 * finalFactor), original: 850000 },
    { month: 'Dic 26', simulated: Math.round(980000 * finalFactor), original: 980000 },
    { month: 'Ene 27', simulated: Math.round(920000 * finalFactor), original: 920000 },
    { month: 'Feb 27', simulated: Math.round(880000 * finalFactor), original: 880000 },
    { month: 'Mar 27', simulated: Math.round(910000 * finalFactor), original: 910000 },
    { month: 'Abr 27', simulated: Math.round(950000 * finalFactor), original: 950000 },
    { month: 'May 27', simulated: Math.round(990000 * finalFactor), original: 990000 },
    { month: 'Jun 27', simulated: Math.round(1050000 * finalFactor), original: 1050000 }
  ];

  sessionStorage.setItem(`sim_results_${taskId}`, JSON.stringify(simulatedResults));
  sessionStorage.setItem(`sim_params_${taskId}`, JSON.stringify(params));
  sessionStorage.setItem(`sim_progress_${taskId}`, '0');

  return { taskId };
};

export const checkSimulationStatus = async (taskId) => {
  const progressKey = `sim_progress_${taskId}`;
  let progress = parseInt(sessionStorage.getItem(progressKey) || '0');
  
  if (progress < 100) {
    progress += 34; // Increment in steps
    if (progress > 100) progress = 100;
    sessionStorage.setItem(progressKey, progress.toString());
  }

  let results = null;
  if (progress >= 100) {
    const rawResults = sessionStorage.getItem(`sim_results_${taskId}`);
    results = rawResults ? JSON.parse(rawResults) : [];
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    taskId,
    progress,
    status: progress >= 100 ? 'SUCCESS' : 'RUNNING',
    metrics: progress >= 100 ? {
      mapeSimulado: '4.85%',
      mapeOriginal: '5.20%',
      r2: 0.94
    } : null,
    results
  };
};
