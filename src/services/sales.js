
const deptCats = {
  'Alimentos': ['Aceites', 'Fideos', 'Arroz', 'Salsas', 'Lácteos', 'Fiambres', 'Carnes'],
  'Bebidas': ['Cervezas', 'Vinos', 'Aperitivos', 'Gaseosas', 'Aguas', 'Jugos'],
  'Limpieza': ['Jabón Líquido', 'Suavizantes', 'Desinfectantes', 'Limpiadores Multiuso'],
  'Cuidado Personal': ['Cabello', 'Higiene', 'Oral']
};

const allItems = [
  { sku: 'SKU-001', name: 'Aceite de Girasol', netContent: 1.5, unit: 'lt', category: 'Aceites', brand: 'Vicentin', units: 14200, revenue: 4970000, avgPrice: 350 },
  { sku: 'SKU-002', name: 'Fideos Tallarín', netContent: 500, unit: 'gr', category: 'Fideos', brand: 'Molinos', units: 28500, revenue: 5700000, avgPrice: 200 },
  { sku: 'SKU-003', name: 'Arroz Largo Fino', netContent: 1, unit: 'kg', category: 'Arroz', brand: 'Molinos', units: 22100, revenue: 3978000, avgPrice: 180 },
  { sku: 'SKU-004', name: 'Puré de Tomate', netContent: 520, unit: 'gr', category: 'Salsas', brand: 'Arcor', units: 31000, revenue: 4650000, avgPrice: 150 },
  { sku: 'SKU-005', name: 'Cerveza Lager Lata', netContent: 473, unit: 'ml', category: 'Cervezas', brand: 'Quilmes', units: 45000, revenue: 11250000, avgPrice: 250 },
  { sku: 'SKU-006', name: 'Vino Malbec Reserva', netContent: 750, unit: 'ml', category: 'Vinos', brand: 'Otros', units: 8200, revenue: 6560000, avgPrice: 800 },
  { sku: 'SKU-007', name: 'Gaseosa Cola', netContent: 2.25, unit: 'lt', category: 'Gaseosas', brand: 'Coca-Cola', units: 35600, revenue: 10680000, avgPrice: 300 },
  { sku: 'SKU-008', name: 'Agua Mineral Sin Gas', netContent: 1.5, unit: 'lt', category: 'Aguas', brand: 'Coca-Cola', units: 18900, revenue: 2835000, avgPrice: 150 },
  { sku: 'SKU-009', name: 'Jabón Líquido p/Ropa', netContent: 3, unit: 'lt', category: 'Jabón Líquido', brand: 'Unilever', units: 6200, revenue: 7440000, avgPrice: 1200 },
  { sku: 'SKU-010', name: 'Desinfectante de Ambientes', netContent: 360, unit: 'ml', category: 'Desinfectantes', brand: 'Unilever', units: 12400, revenue: 3720000, avgPrice: 300 },
  { sku: 'SKU-011', name: 'Suavizante Floral', netContent: 3, unit: 'lt', category: 'Suavizantes', brand: 'Unilever', units: 4500, revenue: 4500000, avgPrice: 1000 },
  { sku: 'SKU-012', name: 'Limpiador de Pisos', netContent: 1, unit: 'lt', category: 'Limpiadores Multiuso', brand: 'Otros', units: 9800, revenue: 1960000, avgPrice: 200 }
];

const getFilteredItems = (filters = {}) => {
  let filtered = allItems;
  
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
        brands: ['Molinos', 'Vicentin', 'Arcor', 'Quilmes', 'Coca-Cola', 'Unilever', 'Otros']
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
      
      let baseMargin = 28.4;
      if (filters.brand === 'Unilever') baseMargin = 31.2;
      if (filters.brand === 'Molinos') baseMargin = 26.8;
      if (filters.brand === 'Quilmes') baseMargin = 27.5;
      if (filters.department === 'Limpieza') baseMargin = 29.8;
      if (filtered.length === 0) baseMargin = 0;
      
      resolve({
        totalRevenue,
        totalUnits,
        averageMargin: parseFloat(baseMargin.toFixed(1))
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
