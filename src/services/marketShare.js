import { apiRequest, getEmpresaId } from './api';
import { getBrandId, getCategoryId, getDeptId, getSelectedValues } from './sales';

const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const getMarketShareOverview = async (filters = {}) => {
  const empresaId = getEmpresaId();
  try {
    const params = new URLSearchParams();
    
    const brandId = getBrandId(filters.brand);
    const categoriaId = getCategoryId(filters.category);
    const departamentoId = getDeptId(filters.department);
    const years = getSelectedValues(filters.years);
    const months = getSelectedValues(filters.months);

    if (brandId) params.append('marcaId', brandId);
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (departamentoId) params.append('departamentoId', departamentoId);
    if (years.length > 0) params.append('anios', years.join(','));
    if (months.length > 0) params.append('meses', months.join(','));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await apiRequest(`/v1/${empresaId}/market-share/overview${queryString}`);
    if (!data || !Array.isArray(data)) return [];

    return data.map(p => {
      const monthLabel = `${monthsEs[p.mes - 1]} ${String(p.anio).slice(-2)}`;
      const rawShare = Number(p.marketShareUnidadesPromedio) || 0;
      const ourShare = parseFloat((rawShare * 100).toFixed(2));

      return {
        month: monthLabel,
        'Nuestra Empresa': ourShare,
        year: p.anio,
        monthNum: p.mes
      };
    });
  } catch (error) {
    console.warn('getMarketShareOverview API call failed:', error);
    return [];
  }
};

export const getPriceGap = async (filters = {}) => {
  const empresaId = getEmpresaId();
  try {
    const params = new URLSearchParams();

    const brandId = getBrandId(filters.brand);
    const categoriaId = getCategoryId(filters.category);
    const departamentoId = getDeptId(filters.department);
    const years = getSelectedValues(filters.years);
    const months = getSelectedValues(filters.months);

    if (brandId) params.append('marcaId', brandId);
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (departamentoId) params.append('departamentoId', departamentoId);
    if (years.length > 0) params.append('anios', years.join(','));
    if (months.length > 0) params.append('meses', months.join(','));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await apiRequest(`/v1/${empresaId}/market-share/price-gap${queryString}`);
    if (!data || !Array.isArray(data)) return [];

    return data.map((p, idx) => ({
      id: p.productoId,
      shortLabel: `P${idx + 1}`,
      productName: p.nombreProducto || `Producto ${idx + 1}`,
      label: p.nombreProducto || `Producto ${idx + 1}`,
      unitPrice: p.precioUnitario ? Number(p.precioUnitario) : 0,
      gap: p.priceGapPct ? parseFloat(Number(p.priceGapPct).toFixed(1)) : 0,
      year: p.anio,
      month: p.mes
    }));
  } catch (error) {
    console.warn('getPriceGap API call failed:', error);
    return [];
  }
};

export const getMarketShareComposition = async (anio = 2025, mes = 12, filters = {}) => {
  const empresaId = getEmpresaId();
  try {
    const params = new URLSearchParams();
    params.append('anio', anio);
    params.append('mes', mes);

    const brandId = getBrandId(filters.brand);
    const categoriaId = getCategoryId(filters.category);
    const departamentoId = getDeptId(filters.department);

    if (brandId) params.append('marcaId', brandId);
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (departamentoId) params.append('departamentoId', departamentoId);

    const data = await apiRequest(`/v1/${empresaId}/dashboard/market-share-composition?${params.toString()}`);
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => {
      const rawShare = Number(item.marketShareUnidadesPromedio) || 0;
      return {
        empresaId: item.empresaId,
        name: item.empresaNombre || 'Otra Empresa',
        share: parseFloat((rawShare * 100).toFixed(2))
      };
    });
  } catch (error) {
    console.warn('getMarketShareComposition API call failed:', error);
    return [];
  }
};

export const predictColdStart = async (productData = {}) => {
  const empresaId = getEmpresaId();
  try {
    const response = await apiRequest(`/v1/${empresaId}/forecast/cold-start`, {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    return response;
  } catch (error) {
    console.warn('predictColdStart API call failed:', error);
    return null;
  }
};
