
export const getForecast = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { month: 'Ene', historical: 400000, forecast: null, lower: null, upper: null },
        { month: 'Feb', historical: 450000, forecast: null, lower: null, upper: null },
        { month: 'Mar', historical: 420000, forecast: null, lower: null, upper: null },
        { month: 'Abr', historical: 480000, forecast: null, lower: null, upper: null },
        { month: 'May', historical: 510000, forecast: null, lower: null, upper: null },
        { month: 'Jun', historical: 682500, forecast: null, lower: null, upper: null },
        { month: 'Jul', historical: null, forecast: 700000, lower: 660000, upper: 740000 },
        { month: 'Ago', historical: null, forecast: 750000, lower: 700000, upper: 800000 },
        { month: 'Sep', historical: null, forecast: 820000, lower: 760000, upper: 880000 },
        { month: 'Oct', historical: null, forecast: 800000, lower: 730000, upper: 870000 },
        { month: 'Nov', historical: null, forecast: 850000, lower: 780000, upper: 920000 },
        { month: 'Dic', historical: null, forecast: 980000, lower: 890000, upper: 1070000 }
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
        
        // Calcular un factor basado en los parámetros para cambiar la proyección
        // Ej: priceChange (deslizador -10 a 10%), marketingSpend (deslizador -20 a 50%)
        const priceFactor = 1 - (parseFloat(params.priceChange || 0) * 0.015); // mayor precio, baja volumen ligeramente
        const marketingFactor = 1 + (parseFloat(params.marketingChange || 0) * 0.008); // más marketing, sube volumen
        const finalFactor = priceFactor * marketingFactor;

        results = [
          { month: 'Jul', simulated: Math.round(700000 * finalFactor), original: 700000 },
          { month: 'Ago', simulated: Math.round(750000 * finalFactor), original: 750000 },
          { month: 'Sep', simulated: Math.round(820000 * finalFactor), original: 820000 },
          { month: 'Oct', simulated: Math.round(800000 * finalFactor), original: 800000 },
          { month: 'Nov', simulated: Math.round(850000 * finalFactor), original: 850000 },
          { month: 'Dic', simulated: Math.round(980000 * finalFactor), original: 980000 }
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
