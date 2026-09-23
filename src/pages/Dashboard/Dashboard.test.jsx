import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

vi.mock('../../services/dashboard', () => ({
  getKPIs: vi.fn(),
  getSalesEvolution: vi.fn(),
  getMarketShareComposition: vi.fn(),
  getContextVariables: vi.fn(),
}))
vi.mock('../../services/settings', () => ({ getSystemInfo: vi.fn() }))
vi.mock('../../services/auth', () => ({ logout: vi.fn() }))
vi.mock('../../services/profile', () => ({
  getProfile: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  deleteProfilePhoto: vi.fn(),
}))
vi.mock('../../services/notificaciones', () => ({
  getNotificaciones: vi.fn(),
  marcarNotificacionVista: vi.fn(),
  marcarNotificacionResuelta: vi.fn(),
}))
vi.mock('../../services/sales', () => ({ getSalesList: vi.fn() }))

// Las vistas tienen su propia bateria de pruebas; aca interesa el contenedor:
// que monte la correcta, navegue y cierre sesion.
vi.mock('./views/InicioView', () => ({ default: () => <div>vista inicio</div> }))
vi.mock('./views/SalesView', () => ({ default: () => <div>vista ventas</div> }))
vi.mock('./views/ForecastView', () => ({ default: () => <div>vista proyecciones</div> }))
vi.mock('./views/ColdStartView', () => ({ default: () => <div>vista pre-lanzamiento</div> }))
vi.mock('./views/IngestionView', () => ({ default: () => <div>vista ingesta</div> }))
vi.mock('./views/MarketView', () => ({ default: () => <div>vista mercado</div> }))
vi.mock('./views/SettingsView', () => ({ default: () => <div>vista umbrales</div> }))
vi.mock('./views/SettingsInfoView', () => ({ default: () => <div>vista sistema</div> }))

import Dashboard from './Dashboard'
import {
  getKPIs,
  getSalesEvolution,
  getMarketShareComposition,
  getContextVariables,
} from '../../services/dashboard'
import { logout } from '../../services/auth'
import { getProfile } from '../../services/profile'
import { getNotificaciones } from '../../services/notificaciones'
import { getSalesList } from '../../services/sales'
import { getSystemInfo } from '../../services/settings'

const KPIS = {
  sales: { value: 1250000, label: 'Ventas del Mes', trend: 12.5 },
  margin: { value: 32.5, label: 'Share of Assortment (SOA)', trend: 2.5 },
  priceGap: { value: -4.2, label: 'Price Gap vs Promedio (%)', trend: -1.1 },
  accuracy: { value: 84.3, label: 'Precisión del Modelo', trend: null },
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getKPIs.mockResolvedValue(KPIS)
    getSalesEvolution.mockResolvedValue([])
    getMarketShareComposition.mockResolvedValue([])
    getContextVariables.mockResolvedValue({
      inflation: { value: 4.2, label: 'Inflación' },
      exchangeRate: { value: 7300, label: 'Tipo de Cambio' },
      seasonality: { value: 'Alta', label: 'Estacionalidad' },
    })
    getSystemInfo.mockResolvedValue({})
    getProfile.mockResolvedValue({ nombre: 'Felipe', empresaNombre: 'CCR Paraguay' })
    getNotificaciones.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 20,
    })
    getSalesList.mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 })
    localStorage.setItem('token', 'jwt-abc')
  })

  describe('guarda de sesion', () => {
    it('expulsa al login cuando no hay sesion activa', async () => {
      localStorage.clear()

      render(<Dashboard />)

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
      )
      expect(getKPIs).not.toHaveBeenCalled()
    })
  })

  describe('carga inicial', () => {
    it('consulta los indicadores del tablero al montarse', async () => {
      render(<Dashboard />)
      await waitFor(() => expect(getKPIs).toHaveBeenCalled())
      expect(getSalesEvolution).toHaveBeenCalled()
      expect(getContextVariables).toHaveBeenCalled()
    })

    it('abre en la vista de inicio', async () => {
      render(<Dashboard />)
      expect(await screen.findByText('vista inicio')).toBeInTheDocument()
    })

    it('consulta el perfil y las notificaciones de la empresa', async () => {
      render(<Dashboard />)
      await waitFor(() => expect(getProfile).toHaveBeenCalled())
      expect(getNotificaciones).toHaveBeenCalled()
    })

    it('se monta aunque fallen los indicadores', async () => {
      getKPIs.mockRejectedValue(new Error('500'))
      render(<Dashboard />)
      expect(await screen.findByText('Inicio')).toBeInTheDocument()
    })
  })

  describe('navegacion entre vistas', () => {
    const casos = [
      ['Ventas', 'vista ventas'],
      ['Proyecciones', 'vista proyecciones'],
      ['Mercado', 'vista mercado'],
      ['Ingesta de Datos', 'vista ingesta'],
    ]

    it.each(casos)('monta la vista al elegir "%s"', async (etiqueta, contenido) => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByText(etiqueta))

      expect(await screen.findByText(contenido)).toBeInTheDocument()
    })

    it('desmonta la vista anterior al cambiar de pestana', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByText('Ventas'))

      await screen.findByText('vista ventas')
      expect(screen.queryByText('vista inicio')).not.toBeInTheDocument()
    })

    it('despliega el sub-menu de proyecciones al entrar en la seccion', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByText('Proyecciones'))

      expect(await screen.findByText('Pre-lanzamiento')).toBeInTheDocument()
    })

    it('permite pasar al asistente de pre-lanzamiento', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByText('Proyecciones'))
      fireEvent.click(await screen.findByText('Pre-lanzamiento'))

      expect(await screen.findByText('vista pre-lanzamiento')).toBeInTheDocument()
    })
  })

  describe('cierre de sesion', () => {
    it('cierra la sesion y vuelve al login sin dejar historial', async () => {
      // `replace` evita que el boton Atras del navegador reingrese al tablero
      // con la sesion ya cerrada.
      logout.mockResolvedValue(undefined)
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      // El rotulo se repite en la barra lateral y en el modal de confirmacion:
      // el ultimo en el DOM es el del modal.
      fireEvent.click(document.querySelector('.logout-btn'))
      const botones = await screen.findAllByRole('button', { name: /^cerrar sesión$/i })
      fireEvent.click(botones[botones.length - 1])

      await waitFor(() => expect(logout).toHaveBeenCalled())
      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
      )
    })
  })
})
