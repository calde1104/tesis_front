import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => 'emp-7'),
}))

import {
  getKPIs,
  getSalesEvolution,
  getMarketShareComposition,
  getContextVariables,
} from './dashboard'
import { apiRequest } from './api'

const responderPorRuta = (rutas) => {
  apiRequest.mockImplementation((url) => {
    for (const [fragmento, valor] of Object.entries(rutas)) {
      if (url.includes(fragmento)) {
        return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor)
      }
    }
    return Promise.reject(new Error(`sin ruta simulada para ${url}`))
  })
}

describe('getKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('consulta el periodo pedido y tambien el mes anterior para calcular tendencia', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { ventasFacturado: 1200 },
      'kpis?anio=2025&mes=11': { ventasFacturado: 1000 },
      models: [],
    })

    await getKPIs(2025, 12)

    expect(apiRequest).toHaveBeenCalledWith('/v1/emp-7/dashboard/kpis?anio=2025&mes=12')
    expect(apiRequest).toHaveBeenCalledWith('/v1/emp-7/dashboard/kpis?anio=2025&mes=11')
  })

  it('retrocede al diciembre anterior cuando el periodo es enero', async () => {
    responderPorRuta({
      'kpis?anio=2026&mes=1': { ventasFacturado: 100 },
      'kpis?anio=2025&mes=12': { ventasFacturado: 80 },
      models: [],
    })

    await getKPIs(2026, 1)

    expect(apiRequest).toHaveBeenCalledWith('/v1/emp-7/dashboard/kpis?anio=2025&mes=12')
  })

  it('calcula la variacion porcentual de ventas contra el mes previo', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { ventasFacturado: 1200 },
      'kpis?anio=2025&mes=11': { ventasFacturado: 1000 },
      models: [],
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.sales.value).toBe(1200)
    expect(kpis.sales.trend).toBe(20)
  })

  it('expresa la variacion de SOA en puntos porcentuales, no en porcentaje', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { shareOfAssortmentPct: 32.5 },
      'kpis?anio=2025&mes=11': { shareOfAssortmentPct: 30 },
      models: [],
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.margin.value).toBe(32.5)
    expect(kpis.margin.trend).toBe(2.5)
  })

  it('deriva el SOA del market share de unidades cuando no viene explicito', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { marketShareUnidadesPromedio: 0.25 },
      'kpis?anio=2025&mes=11': { marketShareUnidadesPromedio: 0.2 },
      models: [],
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.margin.value).toBe(25)
    expect(kpis.margin.trend).toBe(5)
  })

  it('toma el MAPE del modelo activo tal cual, sin derivar una "precision"', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { ventasFacturado: 100 },
      'kpis?anio=2025&mes=11': { ventasFacturado: 100 },
      models: [
        { version: 'baseline', mape: 90, activo: false },
        { version: 'champion', mape: 15.66, activo: true },
      ],
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.accuracy.value).toBe(15.7)
  })

  it('no informa tendencia cuando no hay mes previo cargado', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { ventasFacturado: 1200 },
      'kpis?anio=2025&mes=11': new Error('sin datos'),
      models: [],
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.sales.value).toBe(1200)
    expect(kpis.sales.trend).toBeNull()
  })

  it('deja la precision en null si el catalogo de modelos no responde', async () => {
    responderPorRuta({
      'kpis?anio=2025&mes=12': { ventasFacturado: 100 },
      'kpis?anio=2025&mes=11': { ventasFacturado: 100 },
      models: new Error('502'),
    })

    const kpis = await getKPIs(2025, 12)

    expect(kpis.accuracy.value).toBeNull()
  })

  it('propaga el error cuando falla la consulta principal', async () => {
    // A diferencia del resto, aca no hay degradacion posible: sin KPIs la
    // pantalla de inicio no tiene nada que mostrar.
    responderPorRuta({ 'kpis?anio=2025&mes=12': new Error('500') })
    await expect(getKPIs(2025, 12)).rejects.toThrow('500')
  })
})

describe('getSalesEvolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('rotula los meses en espanol con el anio abreviado', async () => {
    apiRequest.mockResolvedValue([
      { anio: 2025, mes: 3, unidadesVendidas: 100, montoFacturado: 1000 },
    ])
    const [p] = await getSalesEvolution()
    expect(p.month).toBe('Mar 25')
  })

  it('separa el tramo historico del pronosticado', async () => {
    // Un punto con pronostico no debe dibujarse como linea historica: si no,
    // el grafico muestra una serie continua que mezcla dato real y estimado.
    apiRequest.mockResolvedValue([
      { anio: 2025, mes: 11, unidadesVendidas: 100, montoFacturado: 1000 },
      { anio: 2025, mes: 12, unidadesPronosticadas: 1500 },
    ])

    const [historico, pronostico] = await getSalesEvolution()

    expect(historico.historical).toBe(1000)
    expect(historico.forecast).toBeNull()
    expect(pronostico.historical).toBeNull()
    expect(pronostico.forecast).toBe(1500)
  })

  it('construye una banda de +/-4% alrededor del pronostico', async () => {
    apiRequest.mockResolvedValue([{ anio: 2025, mes: 12, unidadesPronosticadas: 1000 }])
    const [p] = await getSalesEvolution()
    expect(p.forecastLower).toBe(960)
    expect(p.forecastUpper).toBe(1040)
  })

  it('devuelve una serie vacia ante una respuesta vacia o un fallo', async () => {
    apiRequest.mockResolvedValue([])
    await expect(getSalesEvolution()).resolves.toEqual([])

    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getSalesEvolution()).resolves.toEqual([])
  })
})

describe('getMarketShareComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const competidor = (id, nombre, share) => ({
    empresaId: id,
    empresaNombre: nombre,
    marketShareUnidadesPromedio: share,
  })

  it('normaliza las cuotas para que el total sume cien', async () => {
    apiRequest.mockResolvedValue([
      competidor('a', 'Alfa', 20),
      competidor('b', 'Beta', 20),
    ])

    const torta = await getMarketShareComposition()

    expect(torta.reduce((s, x) => s + x.value, 0)).toBeCloseTo(100, 1)
  })

  it('identifica a la empresa propia con una etiqueta y un color distintivos', async () => {
    apiRequest.mockResolvedValue([
      competidor('emp-7', 'CCR Paraguay', 40),
      competidor('b', 'Beta', 60),
    ])

    const torta = await getMarketShareComposition()
    const propia = torta.find((x) => x.name === 'Nuestra Empresa')

    expect(propia).toBeDefined()
    expect(propia.fill).toBe('#38bdf8')
  })

  it('agrupa en "Otros" a los competidores fuera del podio', async () => {
    apiRequest.mockResolvedValue([
      competidor('a', 'Alfa', 40),
      competidor('b', 'Beta', 30),
      competidor('c', 'Gama', 20),
      competidor('d', 'Delta', 6),
      competidor('e', 'Epsilon', 4),
    ])

    const torta = await getMarketShareComposition()
    const otros = torta.find((x) => x.name === 'Otros')

    expect(torta.map((x) => x.name)).toEqual(['Alfa', 'Beta', 'Gama', 'Otros'])
    expect(otros.value).toBeCloseTo(10, 1)
  })

  it('incorpora a la empresa propia aunque no entre en el podio', async () => {
    // Es el caso habitual de un cliente chico: si no se la agrega de forma
    // explicita, el analista no se ve a si mismo en su propio grafico.
    apiRequest.mockResolvedValue([
      competidor('a', 'Alfa', 40),
      competidor('b', 'Beta', 30),
      competidor('c', 'Gama', 20),
      competidor('emp-7', 'CCR Paraguay', 5),
      competidor('d', 'Delta', 5),
    ])

    const torta = await getMarketShareComposition()

    expect(torta.map((x) => x.name)).toContain('Nuestra Empresa')
  })

  it('devuelve una composicion vacia ante una respuesta vacia o un fallo', async () => {
    apiRequest.mockResolvedValue([])
    await expect(getMarketShareComposition()).resolves.toEqual([])

    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getMarketShareComposition()).resolves.toEqual([])
  })
})

describe('getContextVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('expone la inflacion y el tipo de cambio del periodo', async () => {
    apiRequest.mockResolvedValue({
      macro: { ipcVarInteranual: 4.2, tipoCambioPygUsd: 7300, mes: 5 },
    })

    const ctx = await getContextVariables()

    expect(ctx.inflation.value).toBe(4.2)
    expect(ctx.exchangeRate.value).toBe(7300)
  })

  it('marca como alta la estacionalidad de los meses pico del retail paraguayo', async () => {
    // Diciembre, enero, febrero (fiestas y verano) y julio (San Juan y
    // aguinaldo) concentran los picos de consumo.
    for (const mes of [12, 1, 2, 7]) {
      apiRequest.mockResolvedValue({ macro: { mes } })
      const ctx = await getContextVariables()
      expect(ctx.seasonality.value).toBe('Alta')
    }
  })

  it('marca como media la estacionalidad del resto del anio', async () => {
    apiRequest.mockResolvedValue({ macro: { mes: 5 } })
    const ctx = await getContextVariables()
    expect(ctx.seasonality.value).toBe('Media')
  })

  it('informa ausencia de datos cuando no hay contexto macro cargado', async () => {
    apiRequest.mockResolvedValue({})
    const ctx = await getContextVariables()
    expect(ctx.seasonality.value).toBe('Sin datos')
    expect(ctx.inflation.value).toBeNull()
  })

  it('devuelve una estructura vacia consistente si la consulta falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    const ctx = await getContextVariables()
    expect(ctx.seasonality.value).toBe('Sin datos')
    expect(ctx.exchangeRate.value).toBeNull()
  })
})
