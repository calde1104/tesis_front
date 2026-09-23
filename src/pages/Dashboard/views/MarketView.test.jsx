import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

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
})
