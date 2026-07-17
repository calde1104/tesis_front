import { getSalesFilters } from './sales';

export const getForecast = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { month: 'Ene 26', historical: 400000, forecast: null },
        { month: 'Feb 26', historical: 450000, forecast: null },
        { month: 'Mar 26', historical: 420000, forecast: null },
        { month: 'Abr 26', historical: 480000, forecast: null },
        { month: 'May 26', historical: 510000, forecast: null },
        { month: 'Jun 26', historical: 682500, forecast: null },
        { month: 'Jul 26', historical: null, forecast: 700000 },
        { month: 'Ago 26', historical: null, forecast: 750000 },
        { month: 'Sep 26', historical: null, forecast: 820000 },
        { month: 'Oct 26', historical: null, forecast: 800000 },
        { month: 'Nov 26', historical: null, forecast: 850000 },
        { month: 'Dic 26', historical: null, forecast: 980000 },
        { month: 'Ene 27', historical: null, forecast: 920000 },
        { month: 'Feb 27', historical: null, forecast: 880000 },
        { month: 'Mar 27', historical: null, forecast: 910000 },
        { month: 'Abr 27', historical: null, forecast: 950000 },
        { month: 'May 27', historical: null, forecast: 990000 },
        { month: 'Jun 27', historical: null, forecast: 1050000 }
      ]);
    }, 500);
  });
};

export const getFeatureImportance = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: 'Historial de Ventas', weight: 42.5 },
        { name: 'Precio de Competencia', weight: 18.2 },
        { name: 'Inflación (IPC)', weight: 14.8 },
        { name: 'Acciones de Promoción', weight: 12.0 },
        { name: 'Temperatura Promedio', weight: 7.5 },
        { name: 'Feriados / Fin de Año', weight: 5.0 }
      ]);
    }, 300);
  });
};

export const triggerSimulation = async (params = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const taskId = 'task_sim_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem(`sim_params_${taskId}`, JSON.stringify(params));
      resolve({ taskId });
    }, 400);
  });
};

export const checkSimulationStatus = async (taskId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const progressKey = `sim_progress_${taskId}`;
      let progress = parseInt(sessionStorage.getItem(progressKey) || '0');
      if (progress < 100) {
        progress += 34; // Incrementa en 3 pasos aproximadamente
        if (progress > 100) progress = 100;
        sessionStorage.setItem(progressKey, progress.toString());
      }

      let results = null;
      if (progress >= 100) {
        const rawParams = sessionStorage.getItem(`sim_params_${taskId}`);
        const params = rawParams ? JSON.parse(rawParams) : {};
        
        const priceFactor = 1 - (parseFloat(params.priceChange || 0) * 0.012);
        const marketingFactor = 1 + (parseFloat(params.marketingChange || 0) * 0.008);
        const exchangeFactor = 1 - (parseFloat(params.exchangeRateChange || 0) * 0.006);
        const inflationFactor = 1 - (parseFloat(params.inflationChange || 0) * 0.004);
        
        const finalFactor = priceFactor * marketingFactor * exchangeFactor * inflationFactor;

        results = [
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
      }

      resolve({
        taskId,
        progress,
        status: progress >= 100 ? 'SUCCESS' : 'RUNNING',
        metrics: progress >= 100 ? {
          mapeSimulado: '4.85%',
          mapeOriginal: '5.20%',
          r2: 0.94
        } : null,
        results
      });
    }, 450);
  });
};
