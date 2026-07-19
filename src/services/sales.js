
const deptCats = {
  'Alimentos': ['Aceites', 'Fideos', 'Arroz', 'Salsas', 'Lácteos', 'Fiambres', 'Carnes'],
  'Bebidas': ['Cervezas', 'Vinos', 'Aperitivos', 'Gaseosas', 'Aguas', 'Jugos'],
  'Limpieza': ['Jabón Líquido', 'Suavizantes', 'Desinfectantes', 'Limpiadores Multiuso'],
  'Cuidado Personal': ['Cabello', 'Higiene', 'Oral']
};

const baseProducts = [
  { sku: 'SKU-001', name: 'Aceite de Girasol', netContent: 1.5, unit: 'lt', category: 'Aceites', brand: 'Vicentin', baseUnits: 14200, avgPrice: 350 },
  { sku: 'SKU-002', name: 'Fideos Tallarín', netContent: 500, unit: 'gr', category: 'Fideos', brand: 'Molinos', baseUnits: 28500, avgPrice: 200 },
  { sku: 'SKU-003', name: 'Arroz Largo Fino', netContent: 1, unit: 'kg', category: 'Arroz', brand: 'Molinos', baseUnits: 22100, avgPrice: 180 },
  { sku: 'SKU-004', name: 'Puré de Tomate', netContent: 520, unit: 'gr', category: 'Salsas', brand: 'Arcor', baseUnits: 31000, avgPrice: 150 },
  { sku: 'SKU-005', name: 'Cerveza Lager Lata', netContent: 473, unit: 'ml', category: 'Cervezas', brand: 'Quilmes', baseUnits: 45000, avgPrice: 250 },
  { sku: 'SKU-006', name: 'Vino Malbec Reserva', netContent: 750, unit: 'ml', category: 'Vinos', brand: 'Otros', baseUnits: 8200, avgPrice: 800 },
  { sku: 'SKU-007', name: 'Gaseosa Cola', netContent: 2.25, unit: 'lt', category: 'Gaseosas', brand: 'Coca-Cola', baseUnits: 35600, avgPrice: 300 },
  { sku: 'SKU-008', name: 'Agua Mineral Sin Gas', netContent: 1.5, unit: 'lt', category: 'Aguas', brand: 'Coca-Cola', baseUnits: 18900, avgPrice: 150 },
  { sku: 'SKU-009', name: 'Jabón Líquido p/Ropa', netContent: 3, unit: 'lt', category: 'Jabón Líquido', brand: 'Unilever', baseUnits: 6200, avgPrice: 1200 },
  { sku: 'SKU-010', name: 'Desinfectante de Ambientes', netContent: 360, unit: 'ml', category: 'Desinfectantes', brand: 'Unilever', baseUnits: 12400, avgPrice: 300 },
  { sku: 'SKU-011', name: 'Suavizante Floral', netContent: 3, unit: 'lt', category: 'Suavizantes', brand: 'Unilever', baseUnits: 4500, avgPrice: 1000 },
  { sku: 'SKU-012', name: 'Limpiador de Pisos', netContent: 1, unit: 'lt', category: 'Limpiadores Multiuso', brand: 'Otros', baseUnits: 9800, avgPrice: 200 }
];

const generateSalesHistory = () => {
  const history = [];
  const years = [2024, 2025, 2026];
  
  years.forEach(year => {
    const maxMonth = year === 2026 ? 6 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      baseProducts.forEach(prod => {
        const seasonality = 1 + 0.15 * Math.sin((month / 12) * 2 * Math.PI);
        const randomNoise = 0.9 + (Math.sin(month + year) * 0.05) + (month % 3 === 0 ? 0.05 : -0.05); // pseudo-random stable
        const units = Math.round(prod.baseUnits * seasonality * randomNoise);
        const revenue = units * prod.avgPrice;
        
        history.push({
          sku: prod.sku,
          name: prod.name,
          netContent: prod.netContent,
          unit: prod.unit,
          category: prod.category,
          brand: prod.brand,
          units,
          revenue,
          avgPrice: prod.avgPrice,
          year,
          month
        });
      });
    }
  });
  return history;
};

const allSalesRecords = generateSalesHistory();

const getFilteredItems = (filters = {}) => {
  let records = allSalesRecords;
  
  if (filters.year) {
    records = records.filter(item => item.year === parseInt(filters.year));
  } else if (filters.years && filters.years.length > 0) {
    const selectedYears = filters.years.map(y => parseInt(y));
    records = records.filter(item => selectedYears.includes(item.year));
  }
  
  if (filters.month) {
    records = records.filter(item => item.month === parseInt(filters.month));
  } else if (filters.months && filters.months.length > 0) {
    const selectedMonths = filters.months.map(m => parseInt(m));
    records = records.filter(item => selectedMonths.includes(item.month));
  }
  
  const skuMap = {};
  records.forEach(item => {
    if (!skuMap[item.sku]) {
      skuMap[item.sku] = {
        sku: item.sku,
        name: item.name,
        netContent: item.netContent,
        unit: item.unit,
        category: item.category,
        brand: item.brand,
        units: 0,
        revenue: 0,
        avgPrice: item.avgPrice
      };
    }
    skuMap[item.sku].units += item.units;
    skuMap[item.sku].revenue += item.revenue;
  });
  
  let filtered = Object.values(skuMap).map(item => ({
    ...item,
    avgPrice: item.units > 0 ? Math.round(item.revenue / item.units) : item.avgPrice
  }));
  
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(item => 
      item.sku.toLowerCase().includes(q) || 
      item.name.toLowerCase().includes(q)
    );
  }
  
  if (filters.brand) {
    filtered = filtered.filter(item => item.brand === filters.brand);
  }
  if (filters.category) {
    filtered = filtered.filter(item => item.category === filters.category);
  } else if (filters.department) {
    const allowedCats = deptCats[filters.department] || [];
    filtered = filtered.filter(item => allowedCats.includes(item.category));
  }

  if (filters.sortBy) {
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const valA = a[filters.sortBy];
      const valB = b[filters.sortBy];
      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * order;
      }
      return (valA - valB) * order;
    });
  }
  
  return filtered;
};

export const getSalesFilters = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        departments: ['Alimentos', 'Bebidas', 'Limpieza', 'Cuidado Personal'],
        categories: deptCats,
        brands: ['Molinos', 'Vicentin', 'Arcor', 'Quilmes', 'Coca-Cola', 'Unilever', 'Otros'],
        years: [2024, 2025, 2026],
        months: [
          { value: 1, label: 'Enero' },
          { value: 2, label: 'Febrero' },
          { value: 3, label: 'Marzo' },
          { value: 4, label: 'Abril' },
          { value: 5, label: 'Mayo' },
          { value: 6, label: 'Junio' },
          { value: 7, label: 'Julio' },
          { value: 8, label: 'Agosto' },
          { value: 9, label: 'Septiembre' },
          { value: 10, label: 'Octubre' },
          { value: 11, label: 'Noviembre' },
          { value: 12, label: 'Diciembre' }
        ]
      });
    }, 300);
  });
};

export const getSalesSummary = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = getFilteredItems(filters);
      const totalRevenue = filtered.reduce((acc, item) => acc + item.revenue, 0);
      const totalUnits = filtered.reduce((acc, item) => acc + item.units, 0);
      
      const averagePrice = totalUnits > 0 ? parseFloat((totalRevenue / totalUnits).toFixed(1)) : 0;
      
      resolve({
        totalRevenue,
        totalUnits,
        averagePrice
      });
    }, 400);
  });
};

export const getSalesList = async (filters = {}, page = 1, limit = 10) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = getFilteredItems(filters);
      const totalItems = filtered.length;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      resolve({
        data: paginated,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      });
    }, 500);
  });
};

export const triggerSalesExport = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const taskId = 'task_export_' + Math.random().toString(36).substring(2, 9);
      resolve({ taskId });
    }, 300);
  });
};

export const checkExportStatus = async (taskId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const progressKey = `export_progress_${taskId}`;
      let progress = parseInt(sessionStorage.getItem(progressKey) || '0');
      if (progress < 100) {
        progress += 25; // Incrementa de a 25%
        sessionStorage.setItem(progressKey, progress.toString());
      }
      
      resolve({
        taskId,
        progress,
        status: progress >= 100 ? 'SUCCESS' : 'RUNNING',
        downloadUrl: progress >= 100 ? `https://predictive-b2b-exports.s3.amazonaws.com/${taskId}.xlsx` : null
      });
    }, 400);
  });
};
