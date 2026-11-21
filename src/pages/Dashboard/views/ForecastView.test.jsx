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

vi.mock('./FeatureImportanceModal', () => ({
  default: ({ open, onClose }) =>
    open ? (
      <div data-testid="explainability-modal">
        <button onClick={onClose}>Cerrar modal</button>
      </div>
    ) : null,
}))
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

const abrirSelector = (etiqueta) => {
  const label = screen.getByText(etiqueta)
  fireEvent.click(label.nextElementSibling)
}
const elegirDeSelector = async (etiqueta, opcion) => {
  abrirSelector(etiqueta)
  fireEvent.click(await screen.findByText(opcion))
}

describe('ForecastView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getSalesFilters.mockResolvedValue(CATALOGO)
    getSalesList.mockResolvedValue(PRODUCTOS)
    getForecast.mockResolvedValue(PROYECCION)
    triggerSimulation.mockResolvedValue({ simulacion: [] })
  })

  describe('carga inicial', () => {
    it('consulta el catalogo de filtros', async () => {
      renderVista()
      await waitFor(() => expect(getSalesFilters).toHaveBeenCalled())
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

    it('sanea el texto buscado antes de pedir la lista filtrada al backend', async () => {
      renderVista()
      await screen.findByText('SKU-001')

      fireEvent.change(screen.getByPlaceholderText('Buscar SKU o nombre...'), {
        target: { value: "Gaseosa<script>" },
      })

      await waitFor(() => expect(getSalesList).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: expect.not.stringContaining('<') }),
        1,
        100
      ))
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

  describe('filtros en cascada', () => {
    it('filtra el catalogo de productos por departamento, categoria y marca', async () => {
      renderVista()
      await screen.findByText('SKU-001')

      await elegirDeSelector('Departamento', 'Bebidas')

      await waitFor(() =>
        expect(getSalesList).toHaveBeenCalledWith(
          expect.objectContaining({ department: 'Bebidas' }),
          1,
          100
        )
      )
    })

    it('una vez elegida la categoria, el selector de departamento solo ofrece los compatibles', async () => {
      getSalesFilters.mockResolvedValue({
        departments: ['Bebidas', 'Alimentos'],
        categories: { Bebidas: ['Gaseosas'], Alimentos: ['Lacteos'] },
        brands: ['Coca Cola', 'La Serenisima'],
      })

      renderVista()
      await screen.findByText('SKU-001')

      // Sin departamento elegido, el selector de categoria ofrece la union
      // de todas las categorias del catalogo.
      await elegirDeSelector('Categoría', 'Gaseosas')
      await waitFor(() => expect(getSalesList).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Gaseosas' }), 1, 100
      ))

      abrirSelector('Departamento')
      expect(screen.getByText('Bebidas')).toBeInTheDocument()
      expect(screen.queryByText('Alimentos')).not.toBeInTheDocument()
    })

    it('muestra el boton de limpiar filtros solo cuando hay algo para limpiar', async () => {
      renderVista()
      await screen.findByText('SKU-001')

      expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument()

      await elegirDeSelector('Departamento', 'Bebidas')
      const limpiar = await screen.findByRole('button', { name: /limpiar filtros/i })

      fireEvent.click(limpiar)

      expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument()
      await waitFor(() => expect(getSalesList).toHaveBeenLastCalledWith(
        expect.objectContaining({ department: '', category: '', brand: '', search: '' }), 1, 100
      ))
    })

    it('informa cuando ningun producto matchea los filtros aplicados', async () => {
      getSalesList.mockResolvedValue({ data: [] })

      renderVista()

      expect(await screen.findByText('No se encontraron productos')).toBeInTheDocument()
    })

    it('volver al consolidado total oculta el panel de simulacion', async () => {
      renderVista()
      await elegirProducto('SKU-001')
      expect(botonSimular()).toBeInTheDocument()

      fireEvent.click(screen.getByText('Consolidado Total General'))

      expect(screen.queryByRole('button', { name: /correr simulación/i })).not.toBeInTheDocument()
    })
  })

  describe('presets de escenario', () => {
    it('el preset Optimista carga sus tres variables de un solo click', async () => {
      renderVista()
      await elegirProducto('SKU-001')

      fireEvent.click(screen.getByRole('button', { name: 'Optimista' }))

      expect(sliders()[0]).toHaveValue('-5')
      expect(sliders()[1]).toHaveValue('-5')
      expect(sliders()[2]).toHaveValue('2')
    })

    it('el preset Precio y el preset Recorte cargan variables distintas', async () => {
      renderVista()
      await elegirProducto('SKU-001')

      fireEvent.click(screen.getByRole('button', { name: 'Precio' }))
      expect(sliders()[0]).toHaveValue('5')
      expect(sliders()[1]).toHaveValue('2')
      expect(sliders()[2]).toHaveValue('4')

      fireEvent.click(screen.getByRole('button', { name: 'Recorte' }))
      expect(sliders()[0]).toHaveValue('0')
      expect(sliders()[1]).toHaveValue('8')
      expect(sliders()[2]).toHaveValue('8')
    })

    it('el preset Base vuelve a dejar las tres variables en cero', async () => {
      renderVista()
      await elegirProducto('SKU-001')
      moverSlider(0, 10)

      fireEvent.click(screen.getByRole('button', { name: 'Base' }))

      expect(sliders()[0]).toHaveValue('0')
    })
  })

  describe('explicabilidad del modelo', () => {
    it('la pildora del modelo abre el modal y el boton de cerrar lo cierra', async () => {
      renderVista()
      await screen.findByText('SKU-001')

      fireEvent.click(screen.getByRole('button', { name: /forecast \(12 meses\)/i }))
      expect(screen.getByTestId('explainability-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }))
      expect(screen.queryByTestId('explainability-modal')).not.toBeInTheDocument()
    })
  })

  describe('estado de carga de la serie', () => {
    it('muestra un indicador mientras llega la proyeccion del SKU elegido', async () => {
      let resolverForecast
      getForecast.mockReturnValue(new Promise((r) => { resolverForecast = r }))

      renderVista()
      await screen.findByText('SKU-001')

      expect(await screen.findByText(/cargando serie del sku/i)).toBeInTheDocument()

      resolverForecast(PROYECCION)
      await waitFor(() =>
        expect(screen.queryByText(/cargando serie del sku/i)).not.toBeInTheDocument()
      )
    })
  })

  describe('paneles redimensionables', () => {
    it('arrastrar el separador izquierdo ensancha la columna de SKUs dentro del rango permitido', async () => {
      const { container } = renderVista()
      await screen.findByText('SKU-001')

      const [separadorIzquierdo] = container.querySelectorAll('.resizer-handle')
      const tarjeta = container.querySelector('.interactive-card')
      const anchoInicial = tarjeta.style.gridTemplateColumns

      fireEvent.mouseDown(separadorIzquierdo)
      fireEvent.mouseMove(window, { clientX: 300 })

      expect(tarjeta.style.gridTemplateColumns).not.toBe(anchoInicial)
      expect(document.body.style.cursor).toBe('col-resize')

      fireEvent.mouseUp(window)
      expect(document.body.style.cursor).toBe('')
    })

    it('el ancho izquierdo nunca baja de 180px aunque se arrastre mas alla del limite', async () => {
      const { container } = renderVista()
      await screen.findByText('SKU-001')

      const [separadorIzquierdo] = container.querySelectorAll('.resizer-handle')
      const tarjeta = container.querySelector('.interactive-card')

      fireEvent.mouseDown(separadorIzquierdo)
      fireEvent.mouseMove(window, { clientX: -500 })

      expect(tarjeta.style.gridTemplateColumns).toMatch(/^180px/)
      fireEvent.mouseUp(window)
    })

    it('arrastrar el separador derecho ensancha el panel del simulador', async () => {
      const { container } = renderVista()
      await screen.findByText('SKU-001')

      const [, separadorDerecho] = container.querySelectorAll('.resizer-handle')
      const tarjeta = container.querySelector('.interactive-card')

      fireEvent.mouseDown(separadorDerecho)
      fireEvent.mouseMove(window, { clientX: -600 })

      expect(tarjeta.style.gridTemplateColumns).toMatch(/500px$/)
      fireEvent.mouseUp(window)
    })
  })
})
