import { apiRequest, getEmpresaId } from './api';

let brandNameToIdMap = {};
let categoryNameToIdMap = {};
let deptNameToIdMap = {};

// Traducen un nombre a su identificador (null si no existe)
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
    id: item.idProducto || item.id_producto || item.productoId || item.id || item.sku,
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

let cachedFiltersResult = null;

export const clearSalesFiltersCache = () => {
  cachedFiltersResult = null;
  // Los mapas nombre->ID tienen alcance de empresa. Si sobreviven al cierre de
  // sesion, un nombre de marca sigue resolviendo al ID de la empresa anterior
  // hasta que la nueva sesion recargue el catalogo.
  brandNameToIdMap = {};
  categoryNameToIdMap = {};
  deptNameToIdMap = {};
};

export const getSalesFilters = async () => {
  if (cachedFiltersResult) {
    return cachedFiltersResult;
  }

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

    const categoryBrandsSet = {};
    const brandCategoriesSet = {};
    const brandDepartmentsSet = {};
    const deptBrandsSet = {};
    const availableYearsSet = new Set();
    const yearMonthsSet = {};

    try {
      const allSales = await getSalesList({}, 1, 1000);
      if (allSales && allSales.data) {
        allSales.data.forEach(item => {
          if (item.year) availableYearsSet.add(item.year);
          if (item.year && item.month) {
            if (!yearMonthsSet[item.year]) yearMonthsSet[item.year] = new Set();
            yearMonthsSet[item.year].add(item.month);
          }

          if (item.category && item.brand) {
            if (!categoryBrandsSet[item.category]) categoryBrandsSet[item.category] = new Set();
            categoryBrandsSet[item.category].add(item.brand);

            if (!brandCategoriesSet[item.brand]) brandCategoriesSet[item.brand] = new Set();
            brandCategoriesSet[item.brand].add(item.category);
          }
          if (item.department && item.brand) {
            if (!brandDepartmentsSet[item.brand]) brandDepartmentsSet[item.brand] = new Set();
            brandDepartmentsSet[item.brand].add(item.department);

            if (!deptBrandsSet[item.department]) deptBrandsSet[item.department] = new Set();
            deptBrandsSet[item.department].add(item.brand);
          }
        });
      }
    } catch (e) {
      console.warn('Error al mapear filtros bidireccionales:', e);
    }

    const categoryBrandsMap = {};
    Object.keys(categoryBrandsSet).forEach(cat => {
      categoryBrandsMap[cat] = Array.from(categoryBrandsSet[cat]).sort();
    });

    const brandCategoriesMap = {};
    Object.keys(brandCategoriesSet).forEach(b => {
      brandCategoriesMap[b] = Array.from(brandCategoriesSet[b]).sort();
    });

    const brandDepartmentsMap = {};
    Object.keys(brandDepartmentsSet).forEach(b => {
      brandDepartmentsMap[b] = Array.from(brandDepartmentsSet[b]).sort();
    });

    const deptBrandsMap = {};
    Object.keys(deptBrandsSet).forEach(d => {
      deptBrandsMap[d] = Array.from(deptBrandsSet[d]).sort();
    });

    const yearMonthsMap = {};
    Object.keys(yearMonthsSet).forEach(yr => {
      yearMonthsMap[yr] = Array.from(yearMonthsSet[yr]).sort((a, b) => a - b);
    });

    const realYears = availableYearsSet.size > 0 
      ? Array.from(availableYearsSet).sort((a, b) => a - b)
      : [2021, 2022, 2023, 2024, 2025, 2026];

    const result = {
      departments: data.departamentos ? data.departamentos.map(d => d.nombre) : [],
      categories: groupedCategories,
      categoryBrands: categoryBrandsMap,
      brandCategories: brandCategoriesMap,
      brandDepartments: brandDepartmentsMap,
      deptBrands: deptBrandsMap,
      yearMonths: yearMonthsMap,
      brands: data.marcas ? data.marcas.map(b => b.nombre) : [],
      years: realYears,
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

    cachedFiltersResult = result;
    return result;
  } catch (error) {
    console.warn('getSalesFilters failed.', error);
    return {
      departments: [],
      categories: {},
      brands: [],
      years: [2021, 2022, 2023, 2024, 2025, 2026],
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

    const isFilteredByYear = years.length > 0;
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
    years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  }
  
  const months = getSelectedValues(filters.months);
  const brandId = getBrandId(filters.brand);
  const categoriaId = getCategoryId(filters.category);
  const departamentoId = getDeptId(filters.department);

  try {
    let sortQuery = '';
    if (filters.sortBy) {
      const order = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      if (filters.sortBy === 'date') {
        sortQuery = `&sort=anio,${order}&sort=mes,${order}`;
      } else {
        const sortFieldMap = {
          revenue: 'montoFacturado',
          units: 'unidadesVendidas',
          avgPrice: 'precioUnitario',
          sku: 'sku',
        };
        const fieldName = sortFieldMap[filters.sortBy] || filters.sortBy;
        sortQuery = `&sort=${fieldName},${order}`;
      }
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

    // Para el orden por fecha se ordena también en el cliente, porque los nombres
    // de los campos de año y mes del backend pueden variar según el entorno
    if (filters.sortBy === 'date' && list.length > 0) {
      const isAsc = filters.sortOrder === 'asc';
      list = [...list].sort((a, b) => {
        const valA = (a.year || 0) * 100 + (a.month || 0);
        const valB = (b.year || 0) * 100 + (b.month || 0);
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

export const triggerSalesExport = async () => {
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
