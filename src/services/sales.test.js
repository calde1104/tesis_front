import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

import {
  getSelectedValues,
  getBrandId,
  getCategoryId,
  getDeptId,
  clearSalesFiltersCache,
  getSalesFilters,
  getSalesSummary,
  getSalesList,
  triggerSalesExport,
  checkExportStatus,
} from './sales'
import { apiRequest } from './api'

const OPCIONES = {
  departamentos: [
    { id: 1, nombre: 'Bebidas' },
    { id: 2, nombre: 'Alimentos' },
  ],
  categorias: [
    { id: 10, nombre: 'Gaseosas', departamentoId: 1 },
    { id: 11, nombre: 'Aguas', departamentoId: 1 },
    { id: 20, nombre: 'Lacteos', departamentoId: 2 },
  ],
  marcas: [
    { id: 'm-1', nombre: 'Coca Cola' },
    { id: 'm-2', nombre: 'Pura' },
  ],
}

const ventaCruda = (extra = {}) => ({
  idProducto: 'p-1',
  sku: 'SKU-001',
  descripcionProducto: 'Gaseosa Cola 2L',
  categoriaNombre: 'Gaseosas',
  marcaNombre: 'Coca Cola',
  contenidoNeto: 2,
  unidadMedida: 'lt',
  unidadesVendidas: 100,
  montoFacturado: 850000,
  precioUnitario: 8500,
  anio: 2025,
  mes: 3,
  ...extra,
})

const responderPorRuta = (rutas) => {
  apiRequest.mockImplementation((url) => {
    for (const [fragmento, valor] of Object.entries(rutas)) {
      if (url.includes(fragmento)) {
        return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor)
      }
    }
    return Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
  })
}

const urlDe = (fragmento) =>
  apiRequest.mock.calls.map((c) => c[0]).find((u) => u.includes(fragmento))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  clearSalesFiltersCache()
})

describe('getSelectedValues', () => {
  it('convierte la seleccion del filtro en numeros', () => {
    expect(getSelectedValues(['2024', '2025'])).toEqual([2024, 2025])
  })

  it('descarta las entradas vacias que deja el selector al limpiarse', () => {
    expect(getSelectedValues(['2024', '', null, undefined, '2025'])).toEqual([2024, 2025])
  })

  it('devuelve una lista vacia ante una seleccion ausente o invalida', () => {
    expect(getSelectedValues(null)).toEqual([])
    expect(getSelectedValues(undefined)).toEqual([])
    expect(getSelectedValues([])).toEqual([])
    expect(getSelectedValues('2025')).toEqual([])
  })
})

describe('getSalesFilters', () => {
  it('consulta las opciones de filtro de la empresa', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })
    await getSalesFilters()
    expect(urlDe('filters/options')).toBe('/v1/7/sales/filters/options')
  })

  it('agrupa las categorias bajo su departamento', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })

    const filtros = await getSalesFilters()

    expect(filtros.departments).toEqual(['Bebidas', 'Alimentos'])
    expect(filtros.categories.Bebidas).toEqual(['Gaseosas', 'Aguas'])
    expect(filtros.categories.Alimentos).toEqual(['Lacteos'])
  })

  it('expone las marcas disponibles', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })
    const filtros = await getSalesFilters()
    expect(filtros.brands).toEqual(['Coca Cola', 'Pura'])
  })

  it('deriva del historial que marcas existen en cada categoria', async () => {
    // Habilita el filtrado en cascada: elegir "Gaseosas" debe ofrecer solo
    // las marcas que efectivamente vendieron en esa categoria.
    responderPorRuta({
      'filters/options': OPCIONES,
      '/sales?': { content: [ventaCruda()], totalElements: 1, totalPages: 1 },
    })

    const filtros = await getSalesFilters()

    expect(filtros.categoryBrands.Gaseosas).toEqual(['Coca Cola'])
    expect(filtros.brandCategories['Coca Cola']).toEqual(['Gaseosas'])
  })

  it('deriva los anios y meses con datos cargados', async () => {
    responderPorRuta({
      'filters/options': OPCIONES,
      '/sales?': {
        content: [ventaCruda(), ventaCruda({ anio: 2024, mes: 7 })],
        totalElements: 2,
        totalPages: 1,
      },
    })

    const filtros = await getSalesFilters()

    expect(filtros.years).toEqual([2024, 2025])
    expect(filtros.yearMonths[2025]).toEqual([3])
  })

  it('ofrece un rango de anios por defecto cuando no hay ventas cargadas', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })
    const filtros = await getSalesFilters()
    expect(filtros.years).toEqual([2021, 2022, 2023, 2024, 2025, 2026])
  })

  it('memoriza el resultado para no reconsultar en cada render', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })

    await getSalesFilters()
    const llamadasPrimera = apiRequest.mock.calls.length
    await getSalesFilters()

    expect(apiRequest.mock.calls.length).toBe(llamadasPrimera)
  })

  it('vuelve a consultar despues de purgar la cache', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })

    await getSalesFilters()
    clearSalesFiltersCache()
    apiRequest.mockClear()
    await getSalesFilters()

    expect(urlDe('filters/options')).toBeDefined()
  })

  it('devuelve una estructura segura si la consulta falla', async () => {
    responderPorRuta({ 'filters/options': new Error('500') })

    const filtros = await getSalesFilters()

    expect(filtros.departments).toEqual([])
    expect(filtros.categories).toEqual({})
    expect(filtros.years).toEqual([2021, 2022, 2023, 2024, 2025, 2026])
  })
})

describe('traduccion de nombres a identificadores', () => {
  it('no resuelve identificadores antes de cargar el catalogo', async () => {
    // Los mapas nombre->ID viven en el modulo, de modo que hay que reimportarlo
    // para observar su estado inicial real.
    vi.resetModules()
    const modulo = await import('./sales')

    expect(modulo.getBrandId('Coca Cola')).toBeNull()
    expect(modulo.getCategoryId('Gaseosas')).toBeNull()
    expect(modulo.getDeptId('Bebidas')).toBeNull()
  })

  it('olvida los mapas nombre-ID al purgar la cache', async () => {
    // Tienen alcance de empresa: si sobrevivieran al cierre de sesion, un
    // nombre de marca seguiria resolviendo al ID de la empresa anterior.
    responderPorRuta({ 'filters/options': OPCIONES })
    await getSalesFilters()
    expect(getBrandId('Coca Cola')).toBe('m-1')

    clearSalesFiltersCache()

    expect(getBrandId('Coca Cola')).toBeNull()
    expect(getCategoryId('Gaseosas')).toBeNull()
    expect(getDeptId('Bebidas')).toBeNull()
  })

  it('resuelve los identificadores una vez cargado el catalogo', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })

    await getSalesFilters()

    expect(getBrandId('Coca Cola')).toBe('m-1')
    expect(getCategoryId('Gaseosas')).toBe(10)
    expect(getDeptId('Bebidas')).toBe(1)
  })

  it('devuelve null ante un nombre que no esta en el catalogo', async () => {
    responderPorRuta({ 'filters/options': OPCIONES })
    await getSalesFilters()
    expect(getBrandId('Marca Inexistente')).toBeNull()
  })
})

describe('getSalesList', () => {
  it('traduce la pagina a la numeracion desde cero que espera Spring', async () => {
    responderPorRuta({ '/sales?': { content: [], totalElements: 0, totalPages: 0 } })
    await getSalesList({}, 1, 10)
    expect(urlDe('/sales?')).toContain('page=0&size=10')
  })

  it('consulta un rango amplio de anios cuando no hay filtro temporal', async () => {
    responderPorRuta({ '/sales?': { content: [], totalElements: 0, totalPages: 0 } })
    await getSalesList({})
    expect(urlDe('/sales?')).toContain('anios=2021,2022,2023,2024,2025,2026,2027,2028,2029,2030')
  })

  it('traslada los filtros seleccionados a la consulta', async () => {
    responderPorRuta({ 'filters/options': OPCIONES, '/sales?': { content: [] } })
    await getSalesFilters()
    apiRequest.mockClear()
    responderPorRuta({ '/sales?': { content: [] } })

    await getSalesList({
      brand: 'Coca Cola',
      category: 'Gaseosas',
      department: 'Bebidas',
      years: [2025],
      months: [3],
      search: 'cola 2L',
    })

    const url = urlDe('/sales?')
    expect(url).toContain('marcaId=m-1')
    expect(url).toContain('categoriaId=10')
    expect(url).toContain('departamentoId=1')
    expect(url).toContain('meses=3')
    expect(url).toContain('search=cola%202L')
  })

  it('traduce los nombres de columna del frontend a los campos de la entidad', async () => {
    responderPorRuta({ '/sales?': { content: [] } })
    await getSalesList({ sortBy: 'revenue', sortOrder: 'asc' })
    expect(urlDe('/sales?')).toContain('sort=montoFacturado,asc')
  })

  it('ordena por anio y mes cuando se pide ordenar por fecha', async () => {
    responderPorRuta({ '/sales?': { content: [] } })
    await getSalesList({ sortBy: 'date', sortOrder: 'desc' })
    expect(urlDe('/sales?')).toContain('sort=anio,desc&sort=mes,desc')
  })

  it('reordena por fecha del lado del cliente como garantia', async () => {
    // Los nombres de campo del backend varian entre entornos: el reordenado
    // local asegura la cronologia aunque el servidor ignore el parametro.
    responderPorRuta({
      '/sales?': {
        content: [
          ventaCruda({ sku: 'B', anio: 2025, mes: 1 }),
          ventaCruda({ sku: 'A', anio: 2024, mes: 12 }),
          ventaCruda({ sku: 'C', anio: 2025, mes: 6 }),
        ],
        totalElements: 3,
        totalPages: 1,
      },
    })

    const res = await getSalesList({ sortBy: 'date', sortOrder: 'asc' })

    expect(res.data.map((v) => v.sku)).toEqual(['A', 'B', 'C'])
  })

  it('traduce el registro de venta a la forma que consume la tabla', async () => {
    responderPorRuta({
      '/sales?': { content: [ventaCruda()], totalElements: 1, totalPages: 1 },
    })

    const res = await getSalesList({})

    expect(res.data[0]).toMatchObject({
      id: 'p-1',
      sku: 'SKU-001',
      name: 'Gaseosa Cola 2L',
      category: 'Gaseosas',
      brand: 'Coca Cola',
      units: 100,
      revenue: 850000,
      avgPrice: 8500,
    })
  })

  it('deriva el precio unitario cuando el backend no lo informa', async () => {
    responderPorRuta({
      '/sales?': {
        content: [
          ventaCruda({ precioUnitario: undefined, unidadesVendidas: 4, montoFacturado: 1000 }),
        ],
      },
    })

    const res = await getSalesList({})

    expect(res.data[0].avgPrice).toBe(250)
  })

  it('completa con etiquetas genericas los campos ausentes', async () => {
    responderPorRuta({ '/sales?': { content: [{ sku: 'SKU-9' }] } })

    const res = await getSalesList({})

    expect(res.data[0]).toMatchObject({
      name: 'Producto',
      category: 'Sin categoría',
      brand: 'Sin marca',
      unit: 'un',
    })
  })

  it('propaga la informacion de paginacion del backend', async () => {
    responderPorRuta({
      '/sales?': { content: [ventaCruda()], totalElements: 250, totalPages: 25 },
    })

    const res = await getSalesList({}, 3, 10)

    expect(res).toMatchObject({ totalItems: 250, totalPages: 25, currentPage: 3 })
  })

  it('devuelve un listado vacio si la consulta falla', async () => {
    responderPorRuta({ '/sales?': new Error('500') })
    await expect(getSalesList({}, 2)).resolves.toEqual({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 2,
    })
  })
})

describe('getSalesSummary', () => {
  it('consulta el resumen global cuando no hay ningun filtro', async () => {
    responderPorRuta({ 'sales/summary': { totalUnidades: 100, totalFacturado: 50000 } })

    const resumen = await getSalesSummary({})

    expect(urlDe('sales/summary')).toBe('/v1/7/sales/summary')
    expect(resumen).toEqual({ totalRevenue: 50000, totalUnits: 100, averagePrice: 500 })
  })

  it('suma un resumen por cada anio seleccionado', async () => {
    responderPorRuta({ 'sales/summary': { totalUnidades: 100, totalFacturado: 50000 } })

    const resumen = await getSalesSummary({ years: [2024, 2025] })

    expect(resumen.totalUnits).toBe(200)
    expect(resumen.totalRevenue).toBe(100000)
  })

  it('combina cada anio con cada mes seleccionado', async () => {
    responderPorRuta({ 'sales/summary': { totalUnidades: 10, totalFacturado: 1000 } })

    await getSalesSummary({ years: [2024, 2025], months: [1, 2] })

    expect(apiRequest).toHaveBeenCalledTimes(4)
    expect(urlDe('anio=2024&mes=1')).toBeDefined()
    expect(urlDe('anio=2025&mes=2')).toBeDefined()
  })

  it('trata la seleccion de los doce meses como ausencia de filtro mensual', async () => {
    responderPorRuta({ 'sales/summary': { totalUnidades: 10, totalFacturado: 1000 } })

    await getSalesSummary({ months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(urlDe('sales/summary')).toBe('/v1/7/sales/summary')
  })

  it('calcula el resumen sobre el listado filtrado cuando hay filtros de producto', async () => {
    // El endpoint de resumen no acepta filtros por SKU ni por marca, de modo
    // que los KPI se recalculan sobre las filas efectivamente listadas.
    responderPorRuta({
      '/sales?': {
        content: [
          ventaCruda({ unidadesVendidas: 10, montoFacturado: 1000 }),
          ventaCruda({ unidadesVendidas: 30, montoFacturado: 5000 }),
        ],
        totalElements: 2,
        totalPages: 1,
      },
    })

    const resumen = await getSalesSummary({ search: 'cola' })

    expect(resumen.totalUnits).toBe(40)
    expect(resumen.totalRevenue).toBe(6000)
    expect(resumen.averagePrice).toBe(150)
  })

  it('evita la division por cero cuando no hay unidades vendidas', async () => {
    responderPorRuta({ 'sales/summary': { totalUnidades: 0, totalFacturado: 0 } })
    const resumen = await getSalesSummary({})
    expect(resumen.averagePrice).toBe(0)
  })

  it('devuelve un resumen en cero si la consulta falla', async () => {
    responderPorRuta({ 'sales/summary': new Error('500') })
    await expect(getSalesSummary({})).resolves.toEqual({
      totalRevenue: 0,
      totalUnits: 0,
      averagePrice: 0,
    })
  })
})

describe('exportacion de ventas (simulada)', () => {
  it('entrega un identificador de tarea', async () => {
    const res = await triggerSalesExport({})
    expect(res.taskId).toMatch(/^task_export_/)
  })

  it('avanza el progreso hasta completar y recien ahi entrega el enlace', async () => {
    const { taskId } = await triggerSalesExport({})

    const p1 = await checkExportStatus(taskId)
    expect(p1.progress).toBe(25)
    expect(p1.status).toBe('RUNNING')
    expect(p1.downloadUrl).toBeNull()

    await checkExportStatus(taskId)
    await checkExportStatus(taskId)
    const p4 = await checkExportStatus(taskId)

    expect(p4.progress).toBe(100)
    expect(p4.status).toBe('SUCCESS')
    expect(p4.downloadUrl).toContain(taskId)
  })
})
