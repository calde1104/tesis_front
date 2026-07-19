
const generateMarketShareHistory = () => {
  const history = [];
  const years = [2024, 2025, 2026];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  years.forEach(year => {
    const maxMonth = year === 2026 ? 6 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const factor = 1 + 0.05 * Math.sin((month / 6) * Math.PI) + (Math.sin(year + month) * 0.02);
      
      const ourShareBase = 32.5;
      const compABase = 26.0;
      const compBBase = 21.0;
      
      const ourShare = parseFloat((ourShareBase * factor).toFixed(1));
      const compA = parseFloat((compABase * (2 - factor)).toFixed(1));
      const compB = parseFloat((compBBase * (0.95 + 0.05 * Math.sin(month))).toFixed(1));
      const otros = parseFloat((100 - ourShare - compA - compB).toFixed(1));
      
      history.push({
        month: `${months[month - 1]} ${year.toString().slice(-2)}`, // String label (e.g. "Feb 25")
        'Nuestra Empresa': ourShare,
        'Competidor A': compA,
        'Competidor B': compB,
        'Otros': otros,
        year,
        monthNum: month // Numeric month index (1-12)
      });
    }
  });
  return history;
};

const marketShareHistory = generateMarketShareHistory();

export const getMarketShareOverview = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = marketShareHistory;
      
      if (filters.year) {
        filtered = filtered.filter(item => item.year === parseInt(filters.year));
      } else if (filters.years && filters.years.length > 0) {
        const selectedYears = filters.years.map(y => parseInt(y));
        filtered = filtered.filter(item => selectedYears.includes(item.year));
      }
      
      if (filters.month) {
        filtered = filtered.filter(item => item.monthNum === parseInt(filters.month));
      } else if (filters.months && filters.months.length > 0) {
        const selected = filters.months.map(m => parseInt(m));
        filtered = filtered.filter(item => selected.includes(item.monthNum));
      }
      
      resolve(filtered);
    }, 450);
  });
};

export const getPriceGap = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let yr = 2026;
      if (filters.year) {
        yr = parseInt(filters.year);
      } else if (filters.years && filters.years.length > 0) {
        yr = parseInt(filters.years[filters.years.length - 1]);
      }
      
      let mo = 6;
      if (filters.month) {
        mo = parseInt(filters.month);
      } else if (filters.months && filters.months.length > 0) {
        mo = parseInt(filters.months[filters.months.length - 1]);
      }
      
      const seed = yr * 12 + mo;
      const fluctuation = parseFloat((Math.sin(seed) * 2.2).toFixed(1)); // -2.2% to +2.2%
      
      resolve([
        { category: 'Aceites', gap: parseFloat((-3.8 + fluctuation).toFixed(1)) },
        { category: 'Fideos', gap: parseFloat((5.2 - fluctuation).toFixed(1)) },
        { category: 'Arroz', gap: parseFloat((-6.5 + fluctuation * 0.5).toFixed(1)) },
        { category: 'Salsas', gap: parseFloat((8.4 + fluctuation * 0.8).toFixed(1)) },
        { category: 'Cervezas', gap: parseFloat((-1.2 - fluctuation).toFixed(1)) },
        { category: 'Vinos', gap: parseFloat((12.0 + fluctuation * 1.2).toFixed(1)) },
        { category: 'Gaseosas', gap: parseFloat((2.5 - fluctuation * 0.6).toFixed(1)) }
      ]);
    }, 400);
  });
};

export const predictColdStart = async (productData = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const expectedPrice = parseFloat(productData.expectedPrice || 1000);
      const isPremium = expectedPrice > 5000;
      
      resolve({
        productId: 'cold_start_' + Math.random().toString(36).substring(2, 9),
        clusterName: isPremium ? 'Cluster Premium - Alta Elasticidad' : 'Cluster Masivo - Baja Elasticidad',
        recommendedPrice: isPremium ? Math.round(expectedPrice * 0.95) : Math.round(expectedPrice * 1.02),
        predictedShares: [
          { month: 'Mes 1', share: isPremium ? 1.5 : 4.2, sales: isPremium ? 1200 : 8500 },
          { month: 'Mes 2', share: isPremium ? 2.8 : 5.8, sales: isPremium ? 2200 : 9200 },
          { month: 'Mes 3', share: isPremium ? 3.5 : 6.5, sales: isPremium ? 2900 : 9900 },
          { month: 'Mes 4', share: isPremium ? 4.2 : 7.1, sales: isPremium ? 3500 : 10400 },
          { month: 'Mes 5', share: isPremium ? 4.8 : 7.6, sales: isPremium ? 4100 : 10800 },
          { month: 'Mes 6', share: isPremium ? 5.2 : 8.0, sales: isPremium ? 4500 : 11100 }
        ],
        salesVolume: isPremium ? 1200 : 8500,
        confidenceLevel: '84.2%'
      });
    }, 600);
  });
};
