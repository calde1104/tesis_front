import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../services/settings', () => ({
  getProductThresholds: vi.fn(),
  saveProductThresholds: vi.fn(),
}))
vi.mock('../../../services/sales', () => ({ getSalesList: vi.fn() }))
vi.mock('../../../services/forecast', () => ({ getForecast: vi.fn() }))

import SettingsView from './SettingsView'
import { getProductThresholds, saveProductThresholds } from '../../../services/settings'
import { getSalesList } from '../../../services/sales'
import { getForecast } from '../../../services/forecast'

const producto = (id, sku, nombre, units) => ({
  id,
  sku,
  name: nombre,
  category: 'Gaseosas',
  brand: 'Coca Cola',
  units,
})

const CATALOGO = {
  data: [
    producto('p-1', 'SKU-001', 'Gaseosa Cola 2L', 1000),
    producto('p-2', 'SKU-002', 'Agua Mineral 1L', 500),
  ],
  totalItems: 2,
  totalPages: 1,
  currentPage: 1,
}

const proyeccion = (unidades) => [
  { month: 'Dic 25', historical: 900, forecast: null },
  { month: 'Ene 26', historical: null, forecast: unidades },
]

// Se envia el formulario en lugar de pulsar el boton: jsdom no ejecuta el
// algoritmo de envio ante un click sintetico sobre un `type="submit"`.
const guardar = () => fireEvent.submit(document.querySelector('form'))

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getProductThresholds.mockResolvedValue({})
    getSalesList.mockResolvedValue(CATALOGO)
    getForecast.mockImplementation((sku) =>
      Promise.resolve(proyeccion(sku === 'SKU-001' ? 1200 : 400))
    )
    saveProductThresholds.mockResolvedValue({ success: true })
  })

  describe('carga del catalogo', () => {
    it('lista los productos de la empresa con su umbral', async () => {
      render(<SettingsView />)
      expect(await screen.findByText('Gaseosa Cola 2L')).toBeInTheDocument()
      expect(screen.getByText('Agua Mineral 1L')).toBeInTheDocument()
    })

    it('consulta la proyeccion del modelo para cada SKU', async () => {
      // El riesgo de quiebre se evalua contra la demanda predicha M+1, no
      // contra las ventas historicas.
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      expect(getForecast).toHaveBeenCalledWith('SKU-001')
      expect(getForecast).toHaveBeenCalledWith('SKU-002')
    })

    it('respeta los umbrales ya persistidos en lugar de recalcularlos', async () => {
      getProductThresholds.mockResolvedValue({ 'p-1': 40000 })

      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.some((i) => i.value === '40000')).toBe(true)
    })

    it('propone un umbral por defecto cuando el producto no tiene uno guardado', async () => {
      // Regla del cliente: 20% por encima de la demanda predicha, redondeado
      // al medio millar, con un piso de 1000 unidades.
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.some((i) => i.value === '1500')).toBe(true)
    })

    it('no se rompe si falla la consulta de umbrales guardados', async () => {
      getProductThresholds.mockRejectedValue(new Error('500'))
      render(<SettingsView />)
      expect(await screen.findByText('Gaseosa Cola 2L')).toBeInTheDocument()
    })

    it('tolera que la proyeccion falle para un SKU puntual', async () => {
      getForecast.mockRejectedValue(new Error('502'))
      render(<SettingsView />)
      expect(await screen.findByText('Gaseosa Cola 2L')).toBeInTheDocument()
    })
  })

  describe('filtrado del catalogo', () => {
    it('busca por nombre de producto', async () => {
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
        target: { value: 'Agua' },
      })

      expect(screen.queryByText('Gaseosa Cola 2L')).not.toBeInTheDocument()
      expect(screen.getByText('Agua Mineral 1L')).toBeInTheDocument()
    })

    it('sanea el termino de busqueda', async () => {
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      const campo = screen.getByPlaceholderText(/buscar por nombre/i)
      fireEvent.change(campo, { target: { value: "cola'; DROP" } })

      expect(campo.value).not.toContain("'")
      expect(campo.value).not.toContain(';')
    })

    it('ofrece contadores por estado de riesgo', async () => {
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      expect(screen.getByText(/^Todos \(2\)/)).toBeInTheDocument()
    })
  })

  describe('persistencia de umbrales', () => {
    it('guarda el mapa completo de umbrales', async () => {
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      guardar()

      await waitFor(() => expect(saveProductThresholds).toHaveBeenCalled())
      const mapa = saveProductThresholds.mock.calls[0][0]
      expect(mapa).toHaveProperty('p-1')
    })

    it('persiste el valor que el analista edito', async () => {
      render(<SettingsView />)
      await screen.findByText('Gaseosa Cola 2L')

      const input = screen.getAllByRole('spinbutton')[0]
      fireEvent.change(input, { target: { value: '25000' } })
      guardar()

      await waitFor(() => expect(saveProductThresholds).toHaveBeenCalled())
      const mapa = saveProductThresholds.mock.calls[0][0]
      expect(Object.values(mapa)).toContain(25000)
    })
  })
})
