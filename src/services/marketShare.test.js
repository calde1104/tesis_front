import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

vi.mock('./sales', () => ({
  getBrandId: vi.fn(() => null),
  getCategoryId: vi.fn(() => null),
  getDeptId: vi.fn(() => null),
  getSelectedValues: vi.fn((arr) =>
    !arr || !Array.isArray(arr) ? [] : arr.filter((v) => v !== '' && v != null).map(Number)
  ),
}))

vi.mock('./coldStart', () => ({ predictColdStart: vi.fn() }))

import {
  clearMarketShareCache,
  getMarketShareOverview,
  getPriceGap,
  getMarketShareComposition,
  getShareOfAssortment,
  getCategoriesSummary,
} from './marketShare'
import { apiRequest } from './api'
import { getBrandId, getCategoryId, getDeptId } from './sales'

const urlLlamada = (i = 0) => apiRequest.mock.calls[i][0]

describe('marketShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Las cachés viven en el módulo: sin vaciarlas, un test contamina al
    // siguiente devolviendo el resultado memorizado en vez de llamar a la API.
    clearMarketShareCache()
    getBrandId.mockReturnValue(null)
    getCategoryId.mockReturnValue(null)
    getDeptId.mockReturnValue(null)
  })

  describe('getMarketShareOverview', () => {
    const serie = [{ anio: 2025, mes: 3, marketShareUnidadesPromedio: 12.345 }]

    it('consulta sin parametros cuando no hay filtros aplicados', async () => {
      apiRequest.mockResolvedValue([])
      await getMarketShareOverview()
      expect(urlLlamada()).toBe('/v1/7/market-share/overview')
    })

    it('traslada a la consulta solo los filtros efectivamente seleccionados', async () => {
      getDeptId.mockReturnValue(3)
      getCategoryId.mockReturnValue(12)
      apiRequest.mockResolvedValue([])

      await getMarketShareOverview({
        department: 'Bebidas',
        category: 'Gaseosas',
        years: [2024, 2025],
      })

      const url = urlLlamada()
      expect(url).toContain('departamentoId=3')
      expect(url).toContain('categoriaId=12')
      expect(url).toContain('anios=2024%2C2025')
      expect(url).not.toContain('marcaId')
    })

    it('rotula el periodo y redondea la cuota a dos decimales', async () => {
      apiRequest.mockResolvedValue(serie)
      const [p] = await getMarketShareOverview()
      expect(p.month).toBe('Mar 25')
      expect(p['Nuestra Empresa']).toBe(12.35)
    })

    it('memoriza el resultado y no vuelve a consultar con los mismos filtros', async () => {
      apiRequest.mockResolvedValue(serie)

      await getMarketShareOverview()
      await getMarketShareOverview()

      expect(apiRequest).toHaveBeenCalledTimes(1)
    })

    it('vuelve a consultar cuando cambian los filtros', async () => {
      apiRequest.mockResolvedValue(serie)

      await getMarketShareOverview()
      getDeptId.mockReturnValue(3)
      await getMarketShareOverview({ department: 'Bebidas' })

      expect(apiRequest).toHaveBeenCalledTimes(2)
    })

    it('vuelve a consultar despues de purgar la cache', async () => {
      // Es lo que ocurre al cerrar sesion: la empresa siguiente no puede
      // heredar los datos memorizados de la anterior.
      apiRequest.mockResolvedValue(serie)

      await getMarketShareOverview()
      clearMarketShareCache()
      await getMarketShareOverview()

      expect(apiRequest).toHaveBeenCalledTimes(2)
    })

    it('devuelve una serie vacia ante una respuesta no esperada o un fallo', async () => {
      apiRequest.mockResolvedValue({ mensaje: 'sin datos' })
      await expect(getMarketShareOverview()).resolves.toEqual([])

      clearMarketShareCache()
      apiRequest.mockRejectedValue(new Error('500'))
      await expect(getMarketShareOverview()).resolves.toEqual([])
    })
  })

  describe('getPriceGap', () => {
    it('numera los productos para el eje del grafico', async () => {
      apiRequest.mockResolvedValue([
        { productoId: 'p1', nombreProducto: 'Gaseosa 2L', precioUnitario: 8500, priceGapPct: 12.34 },
        { productoId: 'p2', nombreProducto: 'Agua 1L', precioUnitario: 3000, priceGapPct: -5.67 },
      ])

      const barras = await getPriceGap()

      expect(barras.map((b) => b.shortLabel)).toEqual(['P1', 'P2'])
      expect(barras[0].productName).toBe('Gaseosa 2L')
    })

    it('redondea la brecha a un decimal', async () => {
      apiRequest.mockResolvedValue([{ productoId: 'p1', priceGapPct: 12.36 }])
      const [b] = await getPriceGap()
      expect(b.gap).toBe(12.4)
    })

    it('completa el nombre y los valores ausentes', async () => {
      apiRequest.mockResolvedValue([{ productoId: 'p1' }])
      const [b] = await getPriceGap()
      expect(b.productName).toBe('Producto 1')
      expect(b.unitPrice).toBe(0)
      expect(b.gap).toBe(0)
    })

    it('devuelve una lista vacia si la consulta falla', async () => {
      apiRequest.mockRejectedValue(new Error('500'))
      await expect(getPriceGap()).resolves.toEqual([])
    })

    it('devuelve una lista vacia si la respuesta no es un arreglo', async () => {
      apiRequest.mockResolvedValue({ mensaje: 'sin datos' })
      await expect(getPriceGap()).resolves.toEqual([])
    })

    it('traslada los filtros de marca, categoria, departamento, anios y meses', async () => {
      getBrandId.mockReturnValue(5)
      getCategoryId.mockReturnValue(12)
      getDeptId.mockReturnValue(3)
      apiRequest.mockResolvedValue([])

      await getPriceGap({ brand: 'Coca Cola', category: 'Gaseosas', department: 'Bebidas', years: [2025], months: [3] })

      const url = urlLlamada()
      expect(url).toContain('marcaId=5')
      expect(url).toContain('categoriaId=12')
      expect(url).toContain('departamentoId=3')
      expect(url).toContain('anios=2025')
      expect(url).toContain('meses=3')
    })

    it('memoriza el resultado por combinacion de filtros', async () => {
      apiRequest.mockResolvedValue([])
      await getPriceGap()
      await getPriceGap()
      expect(apiRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMarketShareComposition', () => {
    it('incluye el periodo en la consulta', async () => {
      apiRequest.mockResolvedValue([])
      await getMarketShareComposition(2025, 12)
      expect(urlLlamada()).toContain('anio=2025')
      expect(urlLlamada()).toContain('mes=12')
    })

    it('prioriza el nombre de la marca sobre el de la empresa', async () => {
      // Al filtrar por marca el backend devuelve un ranking de marcas; sin
      // esta precedencia la leyenda mostraria el nombre de la empresa.
      apiRequest.mockResolvedValue([
        { empresaId: 'a', marcaNombre: 'Coca Cola', empresaNombre: 'Alfa', marketShareUnidadesPromedio: 30 },
      ])

      const [c] = await getMarketShareComposition(2025, 12)

      expect(c.name).toBe('Coca Cola')
    })

    it('usa una etiqueta generica cuando no hay ningun nombre', async () => {
      apiRequest.mockResolvedValue([{ empresaId: 'a', marketShareUnidadesPromedio: 30 }])
      const [c] = await getMarketShareComposition(2025, 12)
      expect(c.name).toBe('Otra Marca')
    })

    it('devuelve una composicion vacia si la consulta falla', async () => {
      apiRequest.mockRejectedValue(new Error('500'))
      await expect(getMarketShareComposition(2025, 12)).resolves.toEqual([])
    })

    it('devuelve una composicion vacia si la respuesta no es un arreglo', async () => {
      apiRequest.mockResolvedValue({ mensaje: 'sin datos' })
      await expect(getMarketShareComposition(2025, 12)).resolves.toEqual([])
    })

    it('traslada los filtros de marca, categoria y departamento', async () => {
      getBrandId.mockReturnValue(5)
      getCategoryId.mockReturnValue(12)
      getDeptId.mockReturnValue(3)
      apiRequest.mockResolvedValue([])

      await getMarketShareComposition(2025, 12, { brand: 'Coca Cola', category: 'Gaseosas', department: 'Bebidas' })

      const url = urlLlamada()
      expect(url).toContain('marcaId=5')
      expect(url).toContain('categoriaId=12')
      expect(url).toContain('departamentoId=3')
    })

    it('memoriza el resultado por combinacion de filtros', async () => {
      apiRequest.mockResolvedValue([])
      await getMarketShareComposition(2025, 12)
      await getMarketShareComposition(2025, 12)
      expect(apiRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('getShareOfAssortment', () => {
    it('devuelve un ranking cuando el backend responde una lista', async () => {
      apiRequest.mockResolvedValue([
        { empresaId: 'a', empresaNombre: 'Alfa', shareOfAssortmentPct: 33.333 },
      ])

      const soa = await getShareOfAssortment(2025, 12)

      expect(Array.isArray(soa)).toBe(true)
      expect(soa[0]).toEqual({ empresaId: 'a', name: 'Alfa', share: 33.33 })
    })

    it('devuelve un escalar cuando el backend responde un unico valor', async () => {
      // El endpoint cambia de forma segun los filtros: sin marca devuelve el
      // SOA propio como objeto; con marca, el ranking completo.
      apiRequest.mockResolvedValue({ shareOfAssortmentPct: 27.891 })

      const soa = await getShareOfAssortment(2025, 12)

      expect(soa).toBe(27.89)
    })

    it('devuelve una lista vacia ante una respuesta nula o un fallo', async () => {
      apiRequest.mockResolvedValue(null)
      await expect(getShareOfAssortment(2025, 12)).resolves.toEqual([])

      clearMarketShareCache()
      apiRequest.mockRejectedValue(new Error('500'))
      await expect(getShareOfAssortment(2025, 12)).resolves.toEqual([])
    })

    it('traslada los filtros de marca, categoria y departamento', async () => {
      getBrandId.mockReturnValue(5)
      getCategoryId.mockReturnValue(12)
      getDeptId.mockReturnValue(3)
      apiRequest.mockResolvedValue({ shareOfAssortmentPct: 10 })

      await getShareOfAssortment(2025, 12, { brand: 'Coca Cola', category: 'Gaseosas', department: 'Bebidas' })

      const url = urlLlamada()
      expect(url).toContain('marcaId=5')
      expect(url).toContain('categoriaId=12')
      expect(url).toContain('departamentoId=3')
    })

    it('memoriza el resultado por combinacion de filtros', async () => {
      apiRequest.mockResolvedValue({ shareOfAssortmentPct: 10 })
      await getShareOfAssortment(2025, 12)
      await getShareOfAssortment(2025, 12)
      expect(apiRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCategoriesSummary', () => {
    it('consulta el desglose por categoria del periodo', async () => {
      apiRequest.mockResolvedValue([])
      await getCategoriesSummary(2025, 12)
      expect(urlLlamada()).toContain('/market-share/categories-summary?')
      expect(urlLlamada()).toContain('anio=2025')
    })

    it('acota el desglose al departamento indicado', async () => {
      getDeptId.mockReturnValue(3)
      apiRequest.mockResolvedValue([])
      await getCategoriesSummary(2025, 12, 'Bebidas')
      expect(urlLlamada()).toContain('departamentoId=3')
    })

    it('devuelve una lista vacia ante una respuesta nula o un fallo', async () => {
      apiRequest.mockResolvedValue(null)
      await expect(getCategoriesSummary(2025, 12)).resolves.toEqual([])

      apiRequest.mockRejectedValue(new Error('500'))
      await expect(getCategoriesSummary(2025, 12)).resolves.toEqual([])
    })
  })
})
