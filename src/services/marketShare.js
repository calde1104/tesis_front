
export const getMarketShareOverview = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { month: 'Ene', 'Nuestra Empresa': 33.2, 'Competidor A': 26.5, 'Competidor B': 21.0, 'Otros': 19.3 },
        { month: 'Feb', 'Nuestra Empresa': 33.8, 'Competidor A': 26.0, 'Competidor B': 20.8, 'Otros': 19.4 },
        { month: 'Mar', 'Nuestra Empresa': 34.0, 'Competidor A': 25.8, 'Competidor B': 20.5, 'Otros': 19.7 },
        { month: 'Abr', 'Nuestra Empresa': 34.2, 'Competidor A': 25.5, 'Competidor B': 20.3, 'Otros': 20.0 },
        { month: 'May', 'Nuestra Empresa': 34.1, 'Competidor A': 25.4, 'Competidor B': 20.5, 'Otros': 20.0 },
        { month: 'Jun', 'Nuestra Empresa': 34.5, 'Competidor A': 25.0, 'Competidor B': 20.5, 'Otros': 20.0 }
      ]);
    }, 450);
  });
};

export const getPriceGap = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { category: 'Aceites', gap: -3.8 },
        { category: 'Fideos', gap: 5.2 },
        { category: 'Arroz', gap: -6.5 },
        { category: 'Salsas', gap: 8.4 },
        { category: 'Cervezas', gap: -1.2 },
        { category: 'Vinos', gap: 12.0 },
        { category: 'Gaseosas', gap: 2.5 }
      ]);
    }, 400);
  });
};

export const predictColdStart = async (productData = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simula predicción de Cold Start basada en clustering
      // (ej: si se elije categoría Almacén vs Bebidas, o precio esperado)
      const expectedPrice = parseFloat(productData.expectedPrice || 1000);
      const isPremium = expectedPrice > 5000;
      
      resolve({
        productId: 'cold_start_' + Math.random().toString(36).substring(2, 9),
        clusterName: isPremium ? 'Cluster Premium - Alta Elasticidad' : 'Cluster Masivo - Baja Elasticidad',
        recommendedPrice: isPremium ? Math.round(expectedPrice * 0.95) : Math.round(expectedPrice * 1.02),
        predictedShares: [
          { month: 'Mes 1', share: isPremium ? 1.5 : 4.2 },
          { month: 'Mes 2', share: isPremium ? 2.8 : 5.8 },
          { month: 'Mes 3', share: isPremium ? 3.5 : 6.5 }
        ],
        salesVolume: isPremium ? 1200 : 8500,
        confidenceLevel: '84.2%'
      });
    }, 600);
  });
};
