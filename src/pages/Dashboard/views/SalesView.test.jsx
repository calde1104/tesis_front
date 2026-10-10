import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

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
  triggerSalesExport,
  checkExportStatus,
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

const abrirSelect = (etiqueta) => {
  const label = [...document.querySelectorAll('.filter-group label')].find(
    (el) => el.textContent === etiqueta
  )
  const grupo = label.closest('.filter-group')
  fireEvent.click(grupo.querySelector(':scope > div'))
  return grupo
}

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

    it('muestra "Consolidado" cuando la fila no trae mes/anio', async () => {
      getSalesList.mockResolvedValue({
        ...VENTAS,
        data: [{ ...VENTAS.data[0], month: undefined, year: undefined }],
      })
      renderVista()
      expect(await screen.findByText('Consolidado')).toBeInTheDocument()
    })
  })

  describe('desplegable personalizado (CustomSelect)', () => {
    it('abre y cierra la lista de opciones al hacer click en el control', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Departamento')
      expect(within(grupo).getByText('Bebidas')).toBeInTheDocument()

      fireEvent.click(grupo.querySelector(':scope > div'))
      expect(within(grupo).queryByText('Bebidas')).not.toBeInTheDocument()
    })

    it('cierra el desplegable al clickear fuera de el', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Departamento')
      expect(within(grupo).getByText('Bebidas')).toBeInTheDocument()

      window.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      await waitFor(() => expect(within(grupo).queryByText('Bebidas')).not.toBeInTheDocument())
    })

    it('selecciona una opcion simple y cierra el desplegable', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Departamento')
      fireEvent.click(within(grupo).getByText('Bebidas'))

      await waitFor(() => expect(ultimosFiltros().department).toBe('Bebidas'))
      expect(within(grupo).queryByText('Alimentos')).not.toBeInTheDocument()
    })

    it('acumula selecciones en un filtro multiple (Año) sin cerrar el desplegable', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Año')
      fireEvent.click(within(grupo).getByText('2024'))
      await waitFor(() => expect(ultimosFiltros().years).toEqual(['2024']))

      fireEvent.click(within(grupo).getByText('2025'))
      await waitFor(() => expect(ultimosFiltros().years).toEqual(['2024', '2025']))

      fireEvent.click(within(grupo).getByText('2024'))
      await waitFor(() => expect(ultimosFiltros().years).toEqual(['2025']))
    })

    it('la opcion "Todos" de un filtro multiple limpia la seleccion', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Año')
      fireEvent.click(within(grupo).getByText('2024'))
      await waitFor(() => expect(ultimosFiltros().years).toEqual(['2024']))

      fireEvent.click(within(grupo).getByText('Todos los Años'))
      await waitFor(() => expect(ultimosFiltros().years).toEqual([]))
    })

    it('resalta la opcion al pasar el mouse y la vuelve a su estado normal al salir', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      const grupo = abrirSelect('Departamento')
      const opcion = within(grupo).getByText('Bebidas').closest('div')

      fireEvent.mouseEnter(opcion)
      expect(opcion.style.background).toContain('rgba(255, 255, 255, 0.04)')

      fireEvent.mouseLeave(opcion)
      expect(opcion.style.background).toBe('transparent')
    })
  })

  describe('ordenamiento', () => {
    it('cicla entre descendente, ascendente y sin orden al clickear la misma columna', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Unidades'))
      await waitFor(() => {
        expect(ultimosFiltros().sortBy).toBe('units')
        expect(ultimosFiltros().sortOrder).toBe('desc')
      })

      fireEvent.click(screen.getByText('Unidades'))
      await waitFor(() => expect(ultimosFiltros().sortOrder).toBe('asc'))

      fireEvent.click(screen.getByText('Unidades'))
      await waitFor(() => {
        expect(ultimosFiltros().sortBy).toBe('')
        expect(ultimosFiltros().sortOrder).toBe('desc')
      })
    })
  })

  describe('limpiar filtros', () => {
    it('muestra el boton solo con filtros activos y restablece todo al clickearlo', async () => {
      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      expect(screen.queryByText('Limpiar Filtros')).not.toBeInTheDocument()

      fireEvent.change(screen.getByPlaceholderText('Escribí nombre o SKU...'), {
        target: { value: 'cola' },
      })

      const boton = await screen.findByText('Limpiar Filtros')
      fireEvent.click(boton)

      await waitFor(() => {
        expect(ultimosFiltros().search).toBe('')
        expect(ultimosFiltros().department).toBe('')
      })
      expect(screen.getByPlaceholderText('Escribí nombre o SKU...').value).toBe('')
      expect(screen.queryByText('Limpiar Filtros')).not.toBeInTheDocument()
    })
  })

  describe('exportacion', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('dispara la exportacion y hace polling hasta SUCCESS, habilitando la descarga', async () => {
      triggerSalesExport.mockResolvedValue({ taskId: 'task-1' })
      checkExportStatus
        .mockResolvedValueOnce({ progress: 40, status: 'RUNNING' })
        .mockResolvedValueOnce({ progress: 100, status: 'SUCCESS', downloadUrl: 'blob:reporte' })

      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Exportar Selección'))
      await vi.waitFor(() => expect(triggerSalesExport).toHaveBeenCalled())

      await vi.advanceTimersByTimeAsync(1000)
      await vi.waitFor(() => expect(screen.getByText(/Generando/)).toBeInTheDocument())

      await vi.advanceTimersByTimeAsync(1000)
      await vi.waitFor(() => expect(screen.getByText('Descargar Reporte')).toBeInTheDocument())
    })

    it('genera y descarga el CSV al clickear "Descargar Reporte"', async () => {
      triggerSalesExport.mockResolvedValue({ taskId: 'task-1' })
      checkExportStatus.mockResolvedValue({
        progress: 100,
        status: 'SUCCESS',
        downloadUrl: 'blob:reporte',
      })
      const createObjectURL = vi.fn(() => 'blob:local')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

      renderVista()
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.click(screen.getByText('Exportar Selección'))
      await vi.advanceTimersByTimeAsync(1000)
      await vi.waitFor(() => expect(screen.getByText('Descargar Reporte')).toBeInTheDocument())

      fireEvent.click(screen.getByText('Descargar Reporte'))

      expect(createObjectURL).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:local')

      vi.unstubAllGlobals()
    })
  })
})
