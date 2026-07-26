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

export const getBrandId = (name) => brandNameToIdMap[name] || null;
export const getCategoryId = (name) => categoryNameToIdMap[name] || null;
export const getDeptId = (name) => deptNameToIdMap[name] || null;

export const getSelectedValues = (filterArr) => {
  if (!filterArr || !Array.isArray(filterArr) || filterArr.length === 0) return [];
  return filterArr.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v));
};

const mapSaleItemToFrontend = (item) => {
  const units = item.unidadesVendidas !== undefined ? Number(item.unidadesVendidas) : 0;
  const revenue = item.montoFacturado !== undefined ? Number(item.montoFacturado) : 0;
  const price = item.precioUnitario !== undefined ? Number(item.precioUnitario) : (units > 0 ? revenue / units : 0);

  return {
    sku: item.sku || 'SKU-000',
    name: item.descripcionProducto || item.descripcion || 'Producto',
    category: item.categoriaNombre || 'Sin categoría',
    brand: item.marcaNombre || 'Sin marca',
    netContent: item.contenidoNeto || 1.0,
    unit: item.unidadMedida || 'un',
    units: units,
    revenue: revenue,
    avgPrice: Math.round(price),
    year: item.anio,
    month: item.mes
  };
};

let validDeptIds = new Set();

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

    const groupedCategories = {};
    if (data.departamentos && data.categorias) {
      data.departamentos.forEach(d => {
        groupedCategories[d.nombre] = data.categorias
          .filter(c => String(c.departamentoId) === String(d.id))
          .map(c => c.nombre);
      });
    }

    return {
      departments: data.departamentos ? data.departamentos.map(d => d.nombre) : [],
      categories: groupedCategories,
      brands: data.marcas ? data.marcas.map(b => b.nombre) : [],
      years: [2021, 2022, 2023, 2024, 2025],
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
    console.warn('getSalesFilters failed.', error);
    return {
      departments: [],
      categories: {},
      brands: [],
      years: [2021, 2022, 2023, 2024, 2025],
      months: []
    };
  }
};

export const getSalesSummary = async (filters = {}) => {
  const empresaId = getEmpresaId();
  
  const years = getSelectedValues(filters.years);
  const months = getSelectedValues(filters.months);
  const hasProductFilters = (filters.search && filters.search.trim()) || filters.department || filters.category || filters.brand;

  try {
    if (hasProductFilters) {
      const salesRes = await getSalesList(filters, 1, 1000);
      if (salesRes && salesRes.data) {
        const totalUnits = salesRes.data.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
        const totalRevenue = salesRes.data.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
        const averagePrice = totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0;
        return { totalRevenue, totalUnits, averagePrice };
      }
    }

    const isFilteredByYear = years.length > 0 && years.length < 5;
    const isFilteredByMonth = months.length > 0 && months.length < 12;

    if (!isFilteredByYear && !isFilteredByMonth) {
      const data = await apiRequest(`/v1/${empresaId}/sales/summary`);
      const totalUnits = Number(data.totalUnidades) || 0;
      const totalRevenue = Number(data.totalFacturado) || 0;
      const averagePrice = totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0;
      return { totalRevenue, totalUnits, averagePrice };
    }

    const targetYears = isFilteredByYear ? years : [null];
    const targetMonths = isFilteredByMonth ? months : [null];

    const requests = [];
    targetYears.forEach(y => {
      targetMonths.forEach(m => {
        let url = `/v1/${empresaId}/sales/summary`;
        const params = [];
        if (y !== null) params.push(`anio=${y}`);
        if (m !== null) params.push(`mes=${m}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        requests.push(apiRequest(url));
      });
    });

    const summaries = await Promise.all(requests);
    const totalUnits = summaries.reduce((sum, s) => sum + (Number(s.totalUnidades) || 0), 0);
    const totalRevenue = summaries.reduce((sum, s) => sum + (Number(s.totalFacturado) || 0), 0);
    const averagePrice = totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0;

    return {
      totalRevenue,
      totalUnits,
      averagePrice
    };
  } catch (error) {
    console.warn('getSalesSummary failed.', error);
    return {
      totalRevenue: 0,
      totalUnits: 0,
      averagePrice: 0
    };
  }
};

export const getSalesList = async (filters = {}, page = 1, limit = 10) => {
  const empresaId = getEmpresaId();
  
  let years = getSelectedValues(filters.years);
  if (years.length === 0) {
    years = [2021, 2022, 2023, 2024, 2025];
  }
  
  const months = getSelectedValues(filters.months);
  const brandId = getBrandId(filters.brand);
  const categoriaId = getCategoryId(filters.category);
  const departamentoId = getDeptId(filters.department);

  try {
    let sortQuery = '';
    if (filters.sortBy) {
      const sortFieldMap = {
        revenue: 'montoFacturado',
        units: 'unidadesVendidas',
        avgPrice: 'precioUnitario',
        sku: 'sku'
      };
      const fieldName = sortFieldMap[filters.sortBy] || filters.sortBy;
      const order = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      sortQuery = `&sort=${fieldName},${order}`;
    }

    let url = `/v1/${empresaId}/sales?anios=${years.join(',')}&page=${page - 1}&size=${limit}${sortQuery}`;
    if (months.length > 0) {
      url += `&meses=${months.join(',')}`;
    }
    if (brandId) url += `&marcaId=${brandId}`;
    if (categoriaId) url += `&categoriaId=${categoriaId}`;
    if (departamentoId) url += `&departamentoId=${departamentoId}`;
    if (filters.search && filters.search.trim()) {
      url += `&search=${encodeURIComponent(filters.search.trim())}`;
    }

    const data = await apiRequest(url);

    let list = data.content ? data.content.map(mapSaleItemToFrontend) : [];

    if (filters.sortBy && list.length > 0) {
      const isAsc = filters.sortOrder === 'asc';
      list = [...list].sort((a, b) => {
        let valA = a[filters.sortBy];
        let valB = b[filters.sortBy];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return isAsc ? -1 : 1;
        if (valA > valB) return isAsc ? 1 : -1;
        return 0;
      });
    }
    
    return {
      data: list,
      totalItems: data.totalElements !== undefined ? data.totalElements : list.length,
      totalPages: data.totalPages !== undefined ? data.totalPages : 1,
      currentPage: page
    };
  } catch (error) {
    console.warn('getSalesList failed.', error);
    return {
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: page
    };
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
