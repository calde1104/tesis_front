
export const getSalesFilters = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        departments: ['Alimentos', 'Bebidas', 'Limpieza', 'Cuidado Personal'],
        families: {
          'Alimentos': ['Almacén', 'Frescos', 'Congelados'],
          'Bebidas': ['Con Alcohol', 'Sin Alcohol', 'Infusiones'],
          'Limpieza': ['Ropa', 'Superficies', 'Vajilla'],
          'Cuidado Personal': ['Cabello', 'Higiene', 'Oral']
        },
        categories: {
          'Almacén': ['Aceites', 'Fideos', 'Arroz', 'Salsas'],
          'Frescos': ['Lácteos', 'Fiambres', 'Carnes'],
          'Con Alcohol': ['Cervezas', 'Vinos', 'Aperitivos'],
          'Sin Alcohol': ['Gaseosas', 'Aguas', 'Jugos'],
          'Ropa': ['Jabón Líquido', 'Suavizantes'],
          'Superficies': ['Desinfectantes', 'Limpiadores Multiuso']
        }
      });
    }, 300);
  });
};

export const getSalesSummary = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const factor = filters.department === 'Bebidas' ? 0.4 : 1.0;
      resolve({
        totalRevenue: 45000000 * factor,
        totalUnits: 152000 * factor,
        averageMargin: 28.4
      });
    }, 400);
  });
};

export const getSalesList = async (filters = {}, page = 1, limit = 10) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allItems = [
        { sku: 'SKU-001', name: 'Aceite de Girasol 1.5L', category: 'Aceites', units: 14200, revenue: 4970000, margin: 24.5 },
        { sku: 'SKU-002', name: 'Fideos Tallarín 500g', category: 'Fideos', units: 28500, revenue: 5700000, margin: 30.2 },
        { sku: 'SKU-003', name: 'Arroz Largo Fino 1kg', category: 'Arroz', units: 22100, revenue: 3978000, margin: 18.0 },
        { sku: 'SKU-004', name: 'Puré de Tomate 520g', category: 'Salsas', units: 31000, revenue: 4650000, margin: 35.5 },
        { sku: 'SKU-005', name: 'Cerveza Lager Lata 473ml', category: 'Cervezas', units: 45000, revenue: 11250000, margin: 26.8 },
        { sku: 'SKU-006', name: 'Vino Malbec Reserva 750ml', category: 'Vinos', units: 8200, revenue: 6560000, margin: 42.0 },
        { sku: 'SKU-007', name: 'Gaseosa Cola 2.25L', category: 'Gaseosas', units: 35600, revenue: 10680000, margin: 22.1 },
        { sku: 'SKU-008', name: 'Agua Mineral Sin Gas 1.5L', category: 'Aguas', units: 18900, revenue: 2835000, margin: 15.4 },
        { sku: 'SKU-009', name: 'Jabón Líquido p/Ropa 3L', category: 'Jabón Líquido', units: 6200, revenue: 7440000, margin: 32.5 },
        { sku: 'SKU-010', name: 'Desinfectante de Ambientes 360ml', category: 'Desinfectantes', units: 12400, revenue: 3720000, margin: 29.0 },
        { sku: 'SKU-011', name: 'Suavizante Floral 3L', category: 'Suavizantes', units: 4500, revenue: 4500000, margin: 28.0 },
        { sku: 'SKU-012', name: 'Limpiador de Pisos 1L', category: 'Limpiadores Multiuso', units: 9800, revenue: 1960000, margin: 20.0 }
      ];

      let filtered = allItems;
      if (filters.category) {
        filtered = allItems.filter(item => item.category === filters.category);
      } else if (filters.department) {
        const deptCats = {
          'Alimentos': ['Aceites', 'Fideos', 'Arroz', 'Salsas', 'Lácteos', 'Fiambres', 'Carnes'],
          'Bebidas': ['Cervezas', 'Vinos', 'Aperitivos', 'Gaseosas', 'Aguas', 'Jugos'],
          'Limpieza': ['Jabón Líquido', 'Suavizantes', 'Desinfectantes', 'Limpiadores Multiuso'],
          'Cuidado Personal': ['Cabello', 'Higiene', 'Oral']
        };
        const allowedCats = deptCats[filters.department] || [];
        filtered = allItems.filter(item => allowedCats.includes(item.category));
      }

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
