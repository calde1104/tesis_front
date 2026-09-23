import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../services/sales', () => ({
  getSalesFilters: vi.fn(),
  getSalesSummary: vi.fn(),
  getSalesList: vi.fn(),
  triggerSalesExport: vi.fn(),
  checkExportStatus: vi.fn(),
}))

import SalesView from './SalesView'
import {
  getSalesFilters,
  getSalesSummary,
  getSalesList,
} from '../../../services/sales'

const CATALOGO = {
  departments: ['Bebidas', 'Alimentos'],
  categories: { Bebidas: ['Gaseosas'], Alimentos: ['Lacteos'] },
  brands: ['Coca Cola'],
  years: [2024, 2025],
  months: [
    { value: 1, label: 'Enero' },
    { value: 12, label: 'Diciembre' },
  ],
}

const VENTAS = {
  data: [
    {
      id: 'p-1',
      sku: 'SKU-001',
      name: 'Gaseosa Cola 2L',
      category: 'Gaseosas',
      brand: 'Coca Cola',
      units: 100,
      revenue: 850000,
      avgPrice: 8500,
      year: 2025,
      month: 3,
    },
  ],
  totalItems: 45,
  totalPages: 5,
  currentPage: 1,
}

const renderVista = () => render(<SalesView formatCurrency={(v) => `₲ ${v}`} />)

const ultimosFiltros = () => getSalesList.mock.calls.at(-1)[0]
const ultimaPagina = () => getSalesList.mock.calls.at(-1)[1]

describe('SalesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getSalesFilters.mockResolvedValue(CATALOGO)
    getSalesList.mockResolvedValue(VENTAS)
    getSalesSummary.mockResolvedValue({
      totalRevenue: 850000,
      totalUnits: 100,
      averagePrice: 8500,
    })
  })

  describe('carga de datos', () => {
    it('consulta catalogo, resumen y listado al montarse', async () => {
      renderVista()
      await waitFor(() => expect(getSalesList).toHaveBeenCalled())
      expect(getSalesFilters).toHaveBeenCalled()
      expect(getSalesSummary).toHaveBeenCalled()
    })

    it('lista las ventas devueltas por el backend', async () => {
      renderVista()
      expect(await screen.findByText('Gaseosa Cola 2L')).toBeInTheDocument()
      expect(screen.getByText('SKU-001')).toBeInTheDocument()
    })

    it('informa la paginacion disponible', async () => {
      renderVista()
      expect(await screen.findByText('Página 1 de 5')).toBeInTheDocument()
    })
  })

  describe('busqueda', () => {
    it('sanea el termino antes de enviarlo al backend', async () => {
      // El termino viaja como parametro de consulta: se filtran comillas y
      // punto y coma antes de que salgan del cliente.
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.change(screen.getByPlaceholderText('Escribí nombre o SKU...'), {
        target: { value: "cola'; DROP TABLE ventas" },
      })

      await waitFor(() => {
        const termino = ultimosFiltros().search
        expect(termino).not.toContain("'")
        expect(termino).not.toContain(';')
      })
    })

    it('vuelve a la primera pagina al cambiar la busqueda', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Siguiente'))
      await waitFor(() => expect(ultimaPagina()).toBe(2))

      fireEvent.change(screen.getByPlaceholderText('Escribí nombre o SKU...'), {
        target: { value: 'agua' },
      })

      await waitFor(() => expect(ultimaPagina()).toBe(1))
    })
  })

  describe('paginacion', () => {
    it('avanza a la pagina siguiente', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Siguiente'))

      await waitFor(() => expect(ultimaPagina()).toBe(2))
    })

    it('inhabilita el retroceso en la primera pagina', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')
      expect(screen.getByText('Anterior').closest('button')).toBeDisabled()
    })

    it('oculta los controles cuando todo entra en una sola pagina', async () => {
      getSalesList.mockResolvedValue({ ...VENTAS, totalPages: 1 })
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')
      expect(screen.queryByText('Siguiente')).not.toBeInTheDocument()
    })

    it('inhabilita el avance al llegar a la ultima pagina', async () => {
      getSalesList.mockResolvedValue({ ...VENTAS, totalPages: 2 })
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Siguiente'))

      await waitFor(() =>
        expect(screen.getByText('Siguiente').closest('button')).toBeDisabled()
      )
    })
  })

  describe('estados sin datos', () => {
    it('no se rompe cuando el listado viene vacio', async () => {
      getSalesList.mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 })
      renderVista()
      await waitFor(() => expect(getSalesList).toHaveBeenCalled())
      expect(screen.queryByText('Gaseosa Cola 2L')).not.toBeInTheDocument()
    })

    it('se monta aunque el catalogo de filtros falle', async () => {
      getSalesFilters.mockResolvedValue({
        departments: [],
        categories: {},
        brands: [],
        years: [],
        months: [],
      })
      renderVista()
      expect(await screen.findByText('Gaseosa Cola 2L')).toBeInTheDocument()
    })
  })
})
