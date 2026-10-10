import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

vi.mock('../../../services/marketShare', () => ({
  getMarketShareOverview: vi.fn(),
  getPriceGap: vi.fn(),
  getMarketShareComposition: vi.fn(),
  getShareOfAssortment: vi.fn(),
  getCategoriesSummary: vi.fn(),
}))
vi.mock('../../../services/sales', () => ({ getSalesFilters: vi.fn() }))
vi.mock('../../../services/api', () => ({ getEmpresaId: vi.fn(() => 'emp-7') }))

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Nada = () => null
  return {
    ResponsiveContainer: Passthrough,
    AreaChart: Passthrough,
    BarChart: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    LineChart: Passthrough,
    ComposedChart: Passthrough,
    Area: Nada,
    Bar: Nada,
    Line: Nada,
    Cell: Nada,
    LabelList: Nada,
    XAxis: Nada,
    YAxis: Nada,
    CartesianGrid: Nada,
    Tooltip: Nada,
    Legend: Nada,
    ReferenceLine: Nada,
  }
})

import MarketView from './MarketView'
import {
  getMarketShareOverview,
  getPriceGap,
  getMarketShareComposition,
  getShareOfAssortment,
  getCategoriesSummary,
} from '../../../services/marketShare'
import { getSalesFilters } from '../../../services/sales'

const CATALOGO = {
  departments: ['Bebidas'],
  categories: { Bebidas: ['Gaseosas'] },
  brands: ['Coca Cola'],
  years: [2024, 2025],
  months: [{ value: 12, label: 'Diciembre' }],
}

const EVOLUCION = [
  { month: 'Nov 25', 'Nuestra Empresa': 28.5, year: 2025, monthNum: 11 },
  { month: 'Dic 25', 'Nuestra Empresa': 30.2, year: 2025, monthNum: 12 },
]

const competidor = (id, nombre, share) => ({ empresaId: id, name: nombre, share })

// Varias etiquetas de filtro coinciden tambien con encabezados de tabla
// ("Categoría", "Líder"); se restringe la busqueda al <label> del filtro.
const abrirFiltro = (etiqueta) => {
  const label = screen.getAllByText(etiqueta).find(el => el.tagName === 'LABEL')
  fireEvent.click(label.nextSibling)
}

const elegirOpcion = (etiqueta, texto) => {
  const label = screen.getAllByText(etiqueta).find(el => el.tagName === 'LABEL')
  const lista = label.nextSibling.nextSibling
  fireEvent.click(within(lista).getByText(texto))
}

const RANKING = [
  competidor('a', 'Alfa', 40),
  competidor('b', 'Beta', 25),
  competidor('emp-7', 'CCR Paraguay', 20),
  competidor('d', 'Delta', 10),
  competidor('e', 'Epsilon', 3),
  competidor('f', 'Zeta', 2),
]

describe('MarketView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getSalesFilters.mockResolvedValue(CATALOGO)
    getMarketShareOverview.mockResolvedValue(EVOLUCION)
    getPriceGap.mockResolvedValue([
      { id: 'p1', shortLabel: 'P1', productName: 'Gaseosa Cola 2L', unitPrice: 8500, gap: 12.4 },
    ])
    getMarketShareComposition.mockResolvedValue(RANKING)
    getShareOfAssortment.mockResolvedValue(RANKING)
    getCategoriesSummary.mockResolvedValue([])
  })

  describe('carga inicial', () => {
    it('informa mientras consulta la informacion competitiva', () => {
      getSalesFilters.mockReturnValue(new Promise(() => {}))
      render(<MarketView />)
      expect(screen.getByText(/cargando información competitiva/i)).toBeInTheDocument()
    })

    it('consulta evolucion, brecha de precios, composicion y surtido', async () => {
      render(<MarketView />)
      await waitFor(() => expect(getMarketShareOverview).toHaveBeenCalled())
      expect(getPriceGap).toHaveBeenCalled()
      expect(getMarketShareComposition).toHaveBeenCalled()
      expect(getShareOfAssortment).toHaveBeenCalled()
    })

    it('resuelve el periodo a partir del ultimo mes con datos reales', async () => {
      // Sin esto, al filtrar solo por año el mes se forzaba a diciembre y las
      // marcas que vendieron antes aparecian en cero.
      render(<MarketView />)

      await waitFor(() => expect(getPriceGap).toHaveBeenCalled())
      expect(getMarketShareComposition).toHaveBeenCalledWith(
        2025,
        12,
        expect.any(Object)
      )
    })
  })

  describe('ranking competitivo', () => {
    it('muestra a los competidores del mercado', async () => {
      render(<MarketView />)
      expect(await screen.findAllByText('Alfa')).not.toHaveLength(0)
    })

    it('limita el surtido al podio y permite desplegar el resto', async () => {
      render(<MarketView />)

      const verTodos = await screen.findByText(/ver todos \(\d+ en total\)/i)
      fireEvent.click(verTodos)

      expect(await screen.findByText(/ver menos \(top 5\)/i)).toBeInTheDocument()
    })
  })

  describe('degradacion', () => {
    it('se monta aunque no haya datos de mercado cargados', async () => {
      getMarketShareOverview.mockResolvedValue([])
      getMarketShareComposition.mockResolvedValue([])
      getShareOfAssortment.mockResolvedValue([])
      getPriceGap.mockResolvedValue([])

      render(<MarketView />)

      await waitFor(() => expect(getMarketShareOverview).toHaveBeenCalled())
      expect(screen.queryByText(/cargando información competitiva/i)).not.toBeInTheDocument()
    })

    it('tolera que el surtido llegue como escalar en vez de ranking', async () => {
      getShareOfAssortment.mockResolvedValue(27.89)

      render(<MarketView />)

      await waitFor(() => expect(getShareOfAssortment).toHaveBeenCalled())
      expect(screen.queryByText(/cargando información competitiva/i)).not.toBeInTheDocument()
    })
  })

  describe('filtros', () => {
    it('limpia todos los filtros con el boton Limpiar Filtros', async () => {
      render(<MarketView />)
      await screen.findAllByText('Alfa')

      fireEvent.click(screen.getByText('Departamento').nextSibling)
      fireEvent.click(screen.getByText('Bebidas'))

      expect(await screen.findByText(/limpiar filtros/i)).toBeInTheDocument()
      fireEvent.click(screen.getByText(/limpiar filtros/i))

      await waitFor(() => expect(screen.queryByText(/limpiar filtros/i)).not.toBeInTheDocument())
    })

    it('filtrar por departamento resetea categoria y marca, y vuelve a consultar', async () => {
      render(<MarketView />)
      await screen.findAllByText('Alfa')
      getMarketShareComposition.mockClear()

      fireEvent.click(screen.getByText('Departamento').nextSibling)
      fireEvent.click(screen.getByText('Bebidas'))

      await waitFor(() => expect(getMarketShareComposition).toHaveBeenCalledWith(
        2025, 12, expect.objectContaining({ department: 'Bebidas' })
      ))
    })

    it('filtrar por categoria resetea la marca seleccionada', async () => {
      render(<MarketView />)
      await screen.findAllByText('Alfa')

      abrirFiltro('Categoría')
      elegirOpcion('Categoría', 'Gaseosas')

      await waitFor(() => expect(getMarketShareOverview).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Gaseosas' })
      ))
    })

    it('filtrar por marca consulta el SOA especifico de esa marca', async () => {
      getShareOfAssortment.mockResolvedValue([
        competidor('a', 'Coca Cola', 55),
        competidor('b', 'Pepsi', 20),
      ])
      render(<MarketView />)
      await screen.findByText('Departamento')

      abrirFiltro('Marca')
      elegirOpcion('Marca', 'Coca Cola')

      expect(await screen.findByText('Surtido (Coca Cola)')).toBeInTheDocument()
    })

    it('selecciona multiples anios desde el combo multi-select', async () => {
      render(<MarketView />)
      await screen.findAllByText('Alfa')
      getMarketShareOverview.mockClear()

      abrirFiltro('Año')
      elegirOpcion('Año', '2024')

      await waitFor(() => expect(getMarketShareOverview).toHaveBeenCalledWith(
        expect.objectContaining({ years: ['2024'] })
      ))

      // El combo multi-select queda abierto tras elegir: deseleccionar el
      // mismo valor sin volver a abrirlo lo quita de la lista.
      elegirOpcion('Año', '2024')
      await waitFor(() => expect(getMarketShareOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({ years: [] })
      ))
    })

    it('selecciona un mes desde el combo multi-select', async () => {
      render(<MarketView />)
      await screen.findAllByText('Alfa')

      abrirFiltro('Mes')
      elegirOpcion('Mes', 'Diciembre')

      await waitFor(() => expect(getMarketShareOverview).toHaveBeenCalledWith(
        expect.objectContaining({ months: ['12'] })
      ))
    })
  })

  describe('tabla de competitividad con categoriesSummary real', () => {
    it('muestra el lider real de la categoria cuando no somos lideres', async () => {
      getCategoriesSummary.mockResolvedValue([
        {
          categoria: 'Gaseosas',
          nuestraCuota: 10,
          rankingCompetencia: [{ empresaNombre: 'Alfa', cuota: 40 }],
        },
      ])
      render(<MarketView />)

      expect(await screen.findByText(/alfa \(40%\)/i)).toBeInTheDocument()
      expect(screen.getByText('Seguidor')).toBeInTheDocument()
    })

    it('se declara lider cuando nuestra cuota iguala o supera al lider de la categoria', async () => {
      getCategoriesSummary.mockResolvedValue([
        { categoria: 'Gaseosas', nuestraCuota: 50, rankingCompetencia: [{ empresaNombre: 'Alfa', cuota: 40 }] },
      ])
      render(<MarketView />)

      await screen.findByText('Gaseosas')
      const estados = screen.getAllByText('Líder')
      expect(estados.some(el => el.tagName === 'SPAN')).toBe(true)
    })

    it('muestra la composicion al pasar el mouse sobre una fila de la tabla', async () => {
      getCategoriesSummary.mockResolvedValue([
        {
          categoria: 'Gaseosas',
          nuestraCuota: 50,
          rankingCompetencia: [{ empresaNombre: 'A.G.DEHEZA', cuota: 50 }, { empresaNombre: 'Alfa', cuota: 40 }],
        },
      ])
      render(<MarketView />)
      const fila = await screen.findByText('Gaseosas')

      fireEvent.mouseEnter(fila.closest('tr'), { clientX: 500, clientY: 300 })

      expect(await screen.findByText(/composición por empresa - gaseosas/i)).toBeInTheDocument()

      fireEvent.mouseLeave(fila.closest('tr'))
      await waitFor(
        () => expect(screen.queryByText(/composición por empresa/i)).not.toBeInTheDocument(),
        { timeout: 3000 }
      )
    })
  })

  describe('casos limite del ranking SOA', () => {
    it('ancla nuestra empresa al final del top cuando no entra en el top 5', async () => {
      getShareOfAssortment.mockResolvedValue([
        competidor('a', 'Alfa', 40), competidor('b', 'Beta', 25), competidor('c', 'Gamma', 20),
        competidor('d', 'Delta', 10), competidor('e', 'Epsilon', 9),
        competidor('emp-7', 'A.G.DEHEZA', 3),
      ])
      render(<MarketView />)

      expect(await screen.findByText(/ver todos \(6 en total\)/i)).toBeInTheDocument()
      const nombres = screen.getAllByText('A.G.DEHEZA')
      expect(nombres.length).toBeGreaterThan(0)
    })

    it('agrega sintéticamente a nuestra empresa si el backend no la incluyó', async () => {
      getShareOfAssortment.mockResolvedValue([
        competidor('a', 'Alfa', 40), competidor('b', 'Beta', 25),
      ])
      render(<MarketView />)

      expect(await screen.findByText('A.G.DEHEZA')).toBeInTheDocument()
    })
  })

  describe('variación de precio', () => {
    it('informa cuando no hay variacion de precio calculable', async () => {
      getPriceGap.mockResolvedValue([])
      render(<MarketView />)

      expect(await screen.findByText(/sin variación de precio calculable/i)).toBeInTheDocument()
    })
  })
})
