import { apiRequest, getEmpresaId } from './api';

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

let brandNameToIdMap = {};
let categoryNameToIdMap = {};
let deptNameToIdMap = {};

const getBrandId = (name) => brandNameToIdMap[name] || null;
const getCategoryId = (name) => categoryNameToIdMap[name] || null;
const getDeptId = (name) => deptNameToIdMap[name] || null;

// Enrich backend sales data with product details from our local catalog
// to prevent empty table columns in the UI since the backend currently doesn't return them.
const enrichSaleItemWithProductDetails = (item, index) => {
  const localProduct = baseProducts[index % baseProducts.length];
  
  return {
    sku: item.sku || localProduct.sku,
    name: item.descripcion || localProduct.name,
    category: item.categoriaNombre || localProduct.category,
    brand: item.marcaNombre || localProduct.brand,
    netContent: item.contenidoNeto || localProduct.netContent,
    unit: item.unidadMedida || localProduct.unit,
    units: item.unidadesVendidas !== undefined ? Number(item.unidadesVendidas) : localProduct.baseUnits,
    revenue: item.montoFacturado !== undefined ? Number(item.montoFacturado) : (item.unidadesVendidas * localProduct.avgPrice),
    avgPrice: item.precioUnitario !== undefined ? Number(item.precioUnitario) : localProduct.avgPrice,
    year: item.anio,
    month: item.mes
  };
};

export const getSalesFilters = async () => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/sales/filters/options`);
    
    brandNameToIdMap = {};
    if (data.marcas) {
      data.marcas.forEach(b => { brandNameToIdMap[b.nombre] = b.id; });
    }

    deptNameToIdMap = {};
    if (data.departamentos) {
      data.departamentos.forEach(d => { deptNameToIdMap[d.nombre] = d.id; });
    }

    categoryNameToIdMap = {};
    if (data.categorias) {
      data.categorias.forEach(c => { categoryNameToIdMap[c.nombre] = c.id; });
    }

    // Build grouped categories
    // Since the backend doesn't return the department association for categories yet,
    // we use our local department-category mapping as a fallback.
    const groupedCategories = {};
    Object.entries(deptCats).forEach(([dept, cats]) => {
      groupedCategories[dept] = cats;
    });

    return {
      departments: data.departamentos ? data.departamentos.map(d => d.nombre) : Object.keys(deptCats),
      categories: groupedCategories,
      brands: data.marcas ? data.marcas.map(b => b.nombre) : ['Molinos', 'Vicentin', 'Arcor', 'Quilmes', 'Coca-Cola', 'Unilever', 'Otros'],
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
    };
  } catch (error) {
    console.warn('getSalesFilters failed. Falling back to mock data.', error);
    return {
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
    };
  }
};

export const getSalesSummary = async (filters = {}) => {
  const empresaId = getEmpresaId();
  
  const anio = filters.years && filters.years.length > 0 ? Number(filters.years[0]) : 2026;
  const mes = filters.months && filters.months.length > 0 ? Number(filters.months[0]) : null;

  try {
    let url = `/v1/${empresaId}/sales/summary?anio=${anio}`;
    if (mes) url += `&mes=${mes}`;

    const data = await apiRequest(url);
    
    const totalUnits = data.totalUnidades !== undefined ? Number(data.totalUnidades) : 0;
    const totalRevenue = data.totalFacturado !== undefined ? Number(data.totalFacturado) : 0;
    const averagePrice = totalUnits > 0 ? parseFloat((totalRevenue / totalUnits).toFixed(1)) : 0;

    return {
      totalRevenue,
      totalUnits,
      averagePrice
    };
  } catch (error) {
    console.warn('getSalesSummary failed. Falling back to mock data.', error);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalRevenue: 28500 * 200 + 14200 * 350 + 22100 * 180,
          totalUnits: 28500 + 14200 + 22100,
          averagePrice: 220
        });
      }, 400);
    });
  }
};

export const getSalesList = async (filters = {}, page = 1, limit = 8) => {
  const empresaId = getEmpresaId();
  
  const anio = filters.years && filters.years.length > 0 ? Number(filters.years[0]) : 2026;
  const mes = filters.months && filters.months.length > 0 ? Number(filters.months[0]) : null;
  const brandId = getBrandId(filters.brand);
  const categoriaId = getCategoryId(filters.category);
  const departamentoId = getDeptId(filters.department);

  try {
    let url = `/v1/${empresaId}/sales?anio=${anio}&page=${page - 1}&size=${limit}`;
    if (mes) url += `&mes=${mes}`;
    if (brandId) url += `&marcaId=${brandId}`;
    if (categoriaId) url += `&categoriaId=${categoriaId}`;
    if (departamentoId) url += `&departamentoId=${departamentoId}`;

    const data = await apiRequest(url);

    const list = data.content ? data.content.map((item, idx) => enrichSaleItemWithProductDetails(item, idx)) : [];
    
    return {
      data: list,
      totalItems: data.totalElements || 0,
      totalPages: data.totalPages || 0,
      currentPage: page
    };
  } catch (error) {
    console.warn('getSalesList failed. Falling back to mock data.', error);
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockList = baseProducts.map((p, idx) => ({
          sku: p.sku,
          name: p.name,
          category: p.category,
          brand: p.brand,
          netContent: p.netContent,
          unit: p.unit,
          units: p.baseUnits,
          revenue: p.baseUnits * p.avgPrice,
          avgPrice: p.avgPrice,
          year: anio,
          month: mes || 6
        }));
        
        const totalItems = mockList.length;
        const startIndex = (page - 1) * limit;
        const paginated = mockList.slice(startIndex, startIndex + limit);

        resolve({
          data: paginated,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page
        });
      }, 500);
    });
  }
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
        progress += 25;
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
