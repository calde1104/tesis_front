import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

import { getForecast, getFeatureImportance, triggerSimulation } from './forecast'
import { apiRequest } from './api'

const responderPorRuta = (rutas) => {
  apiRequest.mockImplementation((url) => {
    for (const [fragmento, valor] of Object.entries(rutas)) {
      if (url.includes(fragmento)) {
        return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor)
      }
    }
    return Promise.resolve(null)
  })
}

const evolucion = [
  { anio: 2025, mes: 11, unidadesVendidas: 900, montoFacturado: 9000 },
  { anio: 2025, mes: 12, unidadesVendidas: 1000, montoFacturado: 10000 },
]

const prediccionesDesdeEnero2026 = Array.from({ length: 12 }, (_, i) => ({
  anio: 2026,
  mes: i + 1,
  unidadesPredichas: 1100 + i * 10,
}))

describe('getForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('serie historica', () => {
    it('consulta la evolucion consolidada cuando no se indica un SKU', async () => {
      responderPorRuta({ 'sales-evolution': evolucion, forecast: [] })
      await getForecast()
      expect(apiRequest).toHaveBeenCalledWith('/v1/7/dashboard/sales-evolution')
    })

    it('rotula los meses en espanol con el anio abreviado', async () => {
      responderPorRuta({ 'sales-evolution': evolucion, forecast: [] })
      const serie = await getForecast()
      expect(serie[0].month).toBe('Nov 25')
      expect(serie[1].month).toBe('Dic 25')
    })

    it('se queda con los ultimos 12 meses de una serie mas larga', async () => {
      const larga = Array.from({ length: 20 }, (_, i) => ({
        anio: 2024,
        mes: (i % 12) + 1,
        unidadesVendidas: i,
      }))
      responderPorRuta({ 'sales-evolution': larga, forecast: [] })
      const serie = await getForecast()
      expect(serie).toHaveLength(12)
    })

    it('cae al monto facturado cuando no hay unidades vendidas', async () => {
      responderPorRuta({
        'sales-evolution': [{ anio: 2025, mes: 1, unidadesVendidas: null, montoFacturado: 4500 }],
        forecast: [],
      })
      const serie = await getForecast()
      expect(serie[0].historical).toBe(4500)
    })

    it('consulta el historico del SKU y descarta coincidencias parciales', async () => {
      // El endpoint de ventas busca por texto: "ABC" tambien trae "ABC-99",
      // que corresponde a otro producto y distorsionaria la serie.
      responderPorRuta({
        '/sales?': {
          content: [
            { sku: 'ABC', anio: 2025, mes: 1, unidadesVendidas: 10, montoFacturado: 100 },
            { sku: 'ABC-99', anio: 2025, mes: 1, unidadesVendidas: 999, montoFacturado: 9990 },
          ],
        },
        forecast: [],
      })

      const serie = await getForecast('ABC')

      expect(serie).toHaveLength(1)
      expect(serie[0].historical).toBe(10)
    })

    it('ordena cronologicamente el historico del SKU', async () => {
      responderPorRuta({
        '/sales?': {
          content: [
            { sku: 'ABC', anio: 2025, mes: 3, unidadesVendidas: 30 },
            { sku: 'ABC', anio: 2024, mes: 12, unidadesVendidas: 10 },
            { sku: 'ABC', anio: 2025, mes: 1, unidadesVendidas: 20 },
          ],
        },
        forecast: [],
      })

      const serie = await getForecast('ABC')

      expect(serie.map((p) => p.historical)).toEqual([10, 20, 30])
    })
  })

  describe('proyeccion futura', () => {
    it('agrega el SKU como parametro al consultar las predicciones', async () => {
      responderPorRuta({ '/sales?': { content: [] }, forecast: [] })
      await getForecast('SKU 01')
      expect(apiRequest).toHaveBeenCalledWith('/v1/7/forecast?sku=SKU%2001')
    })

    it('encadena los 12 meses siguientes al ultimo historico, cruzando el anio', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: prediccionesDesdeEnero2026,
      })

      const serie = await getForecast()
      const proyectados = serie.filter((p) => p.forecast !== null && p.historical === null)

      expect(proyectados).toHaveLength(12)
      expect(proyectados[0].month).toBe('Ene 26')
      expect(proyectados[11].month).toBe('Dic 26')
    })

    it('acepta la proyeccion envuelta en {data} o en {content}', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: { data: prediccionesDesdeEnero2026 },
      })
      const conData = await getForecast()
      expect(conData.some((p) => p.forecast === 1100)).toBe(true)

      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: { content: prediccionesDesdeEnero2026 },
      })
      const conContent = await getForecast()
      expect(conContent.some((p) => p.forecast === 1100)).toBe(true)
    })

    it('reconoce los distintos alias del valor predicho', async () => {
      // El backend fue cambiando el nombre del campo; el cliente tolera todos
      // para no romperse ante un despliegue desfasado.
      for (const alias of ['unidades_predichas', 'unidades', 'prediccion', 'forecast']) {
        responderPorRuta({
          'sales-evolution': evolucion,
          forecast: [{ anio: 2026, mes: 1, [alias]: 777 }],
        })
        const serie = await getForecast()
        expect(serie.some((p) => p.forecast === 777)).toBe(true)
      }
    })

    it('respeta los intervalos de confianza que emite el modelo', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: [
          {
            anio: 2026,
            mes: 1,
            unidadesPredichas: 1000,
            intervaloConfianzaInf: 700,
            intervaloConfianzaSup: 1400,
          },
        ],
      })

      const serie = await getForecast()
      const enero = serie.find((p) => p.month === 'Ene 26')

      expect(enero.forecastLower).toBe(700)
      expect(enero.forecastUpper).toBe(1400)
    })

    it('deriva una banda de +/-15% cuando el modelo no envia intervalos', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: [{ anio: 2026, mes: 1, unidadesPredichas: 1000 }],
      })

      const serie = await getForecast()
      const enero = serie.find((p) => p.month === 'Ene 26')

      expect(enero.forecastLower).toBe(850)
      expect(enero.forecastUpper).toBe(1150)
    })

    it('descarta los meses del horizonte sin prediccion cargada', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: [{ anio: 2026, mes: 1, unidadesPredichas: 1100 }],
      })

      const serie = await getForecast()

      expect(serie.filter((p) => p.historical === null)).toHaveLength(1)
    })

    it('empalma la curva historica con la proyectada en el mes de transicion', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: prediccionesDesdeEnero2026,
      })

      const serie = await getForecast()
      const ultimoHistorico = serie.find((p) => p.month === 'Dic 25')

      expect(ultimoHistorico.forecast).toBe(ultimoHistorico.historical)
    })
  })

  describe('tolerancia a fallos', () => {
    it('conserva el historico aunque el endpoint de proyeccion falle', async () => {
      responderPorRuta({
        'sales-evolution': evolucion,
        forecast: new Error('502 Bad Gateway'),
      })

      const serie = await getForecast()

      expect(serie).toHaveLength(2)
      expect(serie.every((p) => p.historical !== null)).toBe(true)
    })

    it('devuelve una serie vacia si falla la consulta del historico', async () => {
      responderPorRuta({ 'sales-evolution': new Error('sin conexion') })
      await expect(getForecast()).resolves.toEqual([])
    })

    it('no se rompe cuando no hay historico ni proyeccion', async () => {
      responderPorRuta({ 'sales-evolution': [], forecast: [] })
      await expect(getForecast()).resolves.toEqual([])
    })
  })
})

describe('getFeatureImportance', () => {
  const respuestaXai = {
    modelo_tipo: 'RandomForestRegressor',
    total_variables: 2,
    resumen_por_grupo: { Autorregresivas: 62.5, Exogenas: 37.5 },
    importancia_variables: [
      {
        feature: 'lag_1',
        nombre_descriptivo: 'Ventas del mes anterior',
        grupo: 'Autorregresivas',
        importancia_pct: 62.5,
        nivel_impacto: 'ALTO',
      },
      { feature: 'ipc_indice', importancia_pct: 37.5 },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('consulta el endpoint de explicabilidad del modelo activo', async () => {
    apiRequest.mockResolvedValue(respuestaXai)
    await getFeatureImportance()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/forecast/feature-importance')
  })

  it('traduce el snake_case del microservicio a la forma que usa la vista', async () => {
    apiRequest.mockResolvedValue(respuestaXai)

    const xai = await getFeatureImportance()

    expect(xai.modeloTipo).toBe('RandomForestRegressor')
    expect(xai.totalVariables).toBe(2)
    expect(xai.variables[0]).toEqual({
      feature: 'lag_1',
      nombre: 'Ventas del mes anterior',
      grupo: 'Autorregresivas',
      pct: 62.5,
      nivelImpacto: 'ALTO',
    })
  })

  it('usa el nombre tecnico cuando no hay descripcion legible', async () => {
    apiRequest.mockResolvedValue(respuestaXai)
    const xai = await getFeatureImportance()
    expect(xai.variables[1].nombre).toBe('ipc_indice')
    expect(xai.variables[1].grupo).toBe('Sin grupo')
  })

  it('preserva el orden de importancia que ya trae el modelo', async () => {
    apiRequest.mockResolvedValue(respuestaXai)
    const xai = await getFeatureImportance()
    expect(xai.variables.map((v) => v.feature)).toEqual(['lag_1', 'ipc_indice'])
  })

  it('ordena los grupos de mayor a menor peso', async () => {
    apiRequest.mockResolvedValue({
      ...respuestaXai,
      resumen_por_grupo: { Exogenas: 20, Autorregresivas: 80 },
    })

    const xai = await getFeatureImportance()

    expect(xai.resumenPorGrupo.map((g) => g.grupo)).toEqual(['Autorregresivas', 'Exogenas'])
  })

  it('propaga el error en vez de inventar datos cuando el motor no responde', async () => {
    // Decision explicita del servicio: la explicabilidad no admite un valor
    // simulado de reemplazo, la vista debe mostrar "no disponible".
    const err = new Error('Bad Gateway')
    err.status = 502
    apiRequest.mockRejectedValue(err)

    await expect(getFeatureImportance()).rejects.toMatchObject({ status: 502 })
  })

  it('rechaza una respuesta con formato inesperado', async () => {
    apiRequest.mockResolvedValue({ modelo_tipo: 'X' })
    await expect(getFeatureImportance()).rejects.toThrow(/formato inesperado/i)
  })

  it('rechaza una respuesta vacia', async () => {
    apiRequest.mockResolvedValue(null)
    await expect(getFeatureImportance()).rejects.toThrow(/formato inesperado/i)
  })
})

describe('triggerSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockResolvedValue({ status: 'success' })
  })

  const cuerpoEnviado = () => JSON.parse(apiRequest.mock.calls[0][1].body)

  it('envia el escenario al endpoint de simulacion de la empresa', async () => {
    await triggerSimulation({ id_producto: 'SKU-7', precio_pct: 10 })
    expect(apiRequest).toHaveBeenCalledWith(
      '/v1/7/forecast/simulate',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('serializa el escenario en snake_case', async () => {
    await triggerSimulation({ id_producto: 'SKU-7', precio_pct: 10, usd_pct: -5, ipc_pct: 3 })
    expect(cuerpoEnviado()).toEqual({
      id_producto: 'SKU-7',
      precio_pct: 10,
      usd_pct: -5,
      ipc_pct: 3,
    })
  })

  it('acepta los nombres en camelCase que usan los deslizadores de la vista', async () => {
    await triggerSimulation({
      idProducto: 'SKU-7',
      priceChange: 12,
      exchangeRateChange: -8,
      inflationChange: 4,
    })
    expect(cuerpoEnviado()).toEqual({
      id_producto: 'SKU-7',
      precio_pct: 12,
      usd_pct: -8,
      ipc_pct: 4,
    })
  })

  it('completa con cero las variables que el analista no movio', async () => {
    await triggerSimulation({ id_producto: 'SKU-7' })
    expect(cuerpoEnviado()).toMatchObject({ precio_pct: 0, usd_pct: 0, ipc_pct: 0 })
  })

  it('conserva un cero explicito y no lo reemplaza por el alias', async () => {
    await triggerSimulation({ id_producto: 'SKU-7', precio_pct: 0, priceChange: 25 })
    expect(cuerpoEnviado().precio_pct).toBe(0)
  })

  it('propaga el error para que la vista pueda avisar al analista', async () => {
    apiRequest.mockRejectedValue(new Error('microservicio caido'))
    await expect(triggerSimulation({ id_producto: 'SKU-7' })).rejects.toThrow('microservicio caido')
  })
})
