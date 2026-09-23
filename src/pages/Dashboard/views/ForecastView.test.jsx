import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../services/forecast', () => ({
  getForecast: vi.fn(),
  triggerSimulation: vi.fn(),
  getFeatureImportance: vi.fn(),
}))

vi.mock('../../../services/sales', () => ({
  getSalesFilters: vi.fn(),
  getSalesList: vi.fn(),
}))

vi.mock('../../../services/settings', () => ({
  getMLModels: vi.fn(),
}))

// El modal de explicabilidad y su hook resuelven aparte; se neutralizan para
// que estas pruebas se concentren en el simulador de escenarios.
vi.mock('./FeatureImportanceModal', () => ({ default: () => null }))
vi.mock('./useFeatureImportance', () => ({
  useFeatureImportance: () => ({ data: null, loading: false, error: null, reload: vi.fn() }),
}))

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Nada = () => null
  return {
    ResponsiveContainer: Passthrough,
    AreaChart: Passthrough,
    BarChart: Passthrough,
    Area: Nada,
    Bar: Nada,
    Cell: Nada,
    LabelList: Nada,
    ReferenceLine: Nada,
    ReferenceDot: Nada,
    XAxis: Nada,
    YAxis: Nada,
    CartesianGrid: Nada,
    Tooltip: Nada,
  }
})

import ForecastView from './ForecastView'
import { getForecast, triggerSimulation } from '../../../services/forecast'
import { getSalesFilters, getSalesList } from '../../../services/sales'
import { getMLModels } from '../../../services/settings'

const CATALOGO = {
  departments: ['Bebidas'],
  categories: { Bebidas: ['Gaseosas'] },
  brands: ['Coca Cola'],
}

const PRODUCTOS = {
  data: [
    { sku: 'SKU-001', name: 'Gaseosa Cola 2L', category: 'Gaseosas', brand: 'Coca Cola' },
    { sku: 'SKU-002', name: 'Agua Mineral 1L', category: 'Aguas', brand: 'Pura' },
  ],
}

const PROYECCION = [
  { month: 'Dic 25', year: 2025, monthNum: 12, historical: 900, forecast: null },
  { month: 'Ene 26', year: 2026, monthNum: 1, historical: null, forecast: 1000 },
]

const renderVista = (props = {}) =>
  render(<ForecastView formatCurrency={(v) => `₲ ${v}`} {...props} />)

const elegirProducto = async (sku) => fireEvent.click(await screen.findByText(sku))
const botonSimular = () => screen.getByRole('button', { name: /correr simulación/i })
const sliders = () => screen.getAllByRole('slider')
const moverSlider = (indice, valor) =>
  fireEvent.change(sliders()[indice], { target: { value: String(valor) } })

describe('ForecastView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getMLModels.mockResolvedValue([
      { nombre: 'baseline_linear', activo: false },
      { nombre: 'random_forest_champion', activo: true },
    ])
    getSalesFilters.mockResolvedValue(CATALOGO)
    getSalesList.mockResolvedValue(PRODUCTOS)
    getForecast.mockResolvedValue(PROYECCION)
    triggerSimulation.mockResolvedValue({ simulacion: [] })
  })

  describe('carga inicial', () => {
    it('consulta el modelo activo y el catalogo de filtros', async () => {
      renderVista()
      await waitFor(() => expect(getMLModels).toHaveBeenCalled())
      expect(getSalesFilters).toHaveBeenCalled()
    })

    it('arranca con la proyeccion consolidada de la empresa', async () => {
      renderVista()
      await waitFor(() => expect(getForecast).toHaveBeenCalledWith(null))
    })

    it('lista los productos del catalogo', async () => {
      renderVista()
      expect(await screen.findByText('SKU-001')).toBeInTheDocument()
      expect(screen.getByText('Agua Mineral 1L')).toBeInTheDocument()
    })

    it('deduplica los SKU repetidos que devuelve el listado de ventas', async () => {
      // El endpoint devuelve una fila por mes vendido: sin deduplicar, el
      // selector mostraria el mismo producto decenas de veces.
      getSalesList.mockResolvedValue({
        data: [
          { sku: 'SKU-001', name: 'Gaseosa Cola 2L' },
          { sku: 'SKU-001', name: 'Gaseosa Cola 2L' },
          { sku: 'SKU-001', name: 'Gaseosa Cola 2L' },
        ],
      })

      renderVista()

      expect(await screen.findAllByText('SKU-001')).toHaveLength(1)
    })
  })

  describe('seleccion de producto', () => {
    it('vuelve a pedir la proyeccion acotada al SKU elegido', async () => {
      renderVista()
      await elegirProducto('SKU-001')
      await waitFor(() => expect(getForecast).toHaveBeenCalledWith('SKU-001'))
    })

    it('preselecciona el SKU que llega desde una notificacion', async () => {
      renderVista({ initialSku: 'SKU-002', skuRequestId: 1 })
      await waitFor(() => expect(getForecast).toHaveBeenCalledWith('SKU-002'))
    })
  })

  describe('simulador de escenarios', () => {
    it('ni siquiera ofrece el simulador en la vista consolidada', async () => {
      renderVista()
      await screen.findByText('SKU-001')

      expect(
        screen.queryByRole('button', { name: /correr simulación/i })
      ).not.toBeInTheDocument()
      expect(triggerSimulation).not.toHaveBeenCalled()
    })

    it('envia al motor el SKU y las tres variables del escenario', async () => {
      renderVista()
      await elegirProducto('SKU-001')

      moverSlider(0, 10)
      moverSlider(1, -5)
      moverSlider(2, 3)
      fireEvent.click(botonSimular())

      await waitFor(() =>
        expect(triggerSimulation).toHaveBeenCalledWith({
          sku: 'SKU-001',
          priceChange: 10,
          exchangeRateChange: -5,
          inflationChange: 3,
        })
      )
    })

    it('acota el escenario al rango del deslizador, que es de -10% a +10%', async () => {
      renderVista()
      await elegirProducto('SKU-001')

      moverSlider(0, 500)
      fireEvent.click(botonSimular())

      await waitFor(() =>
        expect(triggerSimulation).toHaveBeenCalledWith(
          expect.objectContaining({ priceChange: 10 })
        )
      )
    })

    it('calcula el impacto a partir de la simulacion que devuelve el motor', async () => {
      triggerSimulation.mockResolvedValue({
        simulacion: [{ anio: 2026, mes: 1, unidades_simuladas: 800 }],
      })

      renderVista()
      await elegirProducto('SKU-001')
      fireEvent.click(botonSimular())

      expect(await screen.findByText('-20.0%')).toBeInTheDocument()
      expect(screen.getByText(/^800/)).toBeInTheDocument()
    })

    it('acepta tambien el campo en camelCase del motor', async () => {
      triggerSimulation.mockResolvedValue({
        simulacion: [{ anio: 2026, mes: 1, unidadesSimuladas: 1200 }],
      })

      renderVista()
      await elegirProducto('SKU-001')
      fireEvent.click(botonSimular())

      expect(await screen.findByText('+20.0%')).toBeInTheDocument()
    })

    it('aplica la elasticidad local cuando el motor responde sin datos', async () => {
      triggerSimulation.mockResolvedValue({ simulacion: [] })

      renderVista()
      await elegirProducto('SKU-001')
      moverSlider(0, 10)
      fireEvent.click(botonSimular())

      expect(await screen.findByText('-15.0%')).toBeInTheDocument()
    })

    it('informa el progreso mientras el motor resuelve', async () => {
      let resolver
      triggerSimulation.mockReturnValue(new Promise((r) => { resolver = r }))

      renderVista()
      await elegirProducto('SKU-001')
      fireEvent.click(botonSimular())

      expect(await screen.findByText(/simulando ml/i)).toBeInTheDocument()

      resolver({ simulacion: [] })
      await waitFor(() => expect(screen.queryByText(/simulando ml/i)).not.toBeInTheDocument())
    })

    it('no muestra metricas de impacto si la simulacion falla', async () => {
      triggerSimulation.mockRejectedValue(new Error('microservicio caido'))

      renderVista()
      await elegirProducto('SKU-001')
      fireEvent.click(botonSimular())

      await waitFor(() => expect(triggerSimulation).toHaveBeenCalled())
      expect(screen.queryByText(/métricas de impacto real/i)).not.toBeInTheDocument()
    })

    it('permite restaurar el escenario original tras una simulacion', async () => {
      triggerSimulation.mockResolvedValue({
        simulacion: [{ anio: 2026, mes: 1, unidades_simuladas: 800 }],
      })

      renderVista()
      await elegirProducto('SKU-001')
      moverSlider(0, 10)
      fireEvent.click(botonSimular())

      await screen.findByText('-20.0%')
      fireEvent.click(screen.getByRole('button', { name: /restaurar original/i }))

      expect(screen.queryByText(/métricas de impacto real/i)).not.toBeInTheDocument()
      expect(sliders()[0]).toHaveValue('0')
    })
  })
})
