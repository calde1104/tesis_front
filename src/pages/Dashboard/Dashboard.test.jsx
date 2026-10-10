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

    it('cancela el cierre de sesion sin desloguear', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.logout-btn'))
      fireEvent.click(await screen.findByRole('button', { name: /^cancelar$/i }))

      expect(screen.queryByText('¿Cerrar Sesión?')).not.toBeInTheDocument()
      expect(logout).not.toHaveBeenCalled()
    })
  })

  describe('submenu de configuracion', () => {
    it('despliega el submenu y permite ir a informacion del sistema', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByText('Configuración'))
      expect(await screen.findByText('vista umbrales')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Información del Sistema'))
      expect(await screen.findByText('vista sistema')).toBeInTheDocument()
    })
  })

  describe('barra lateral', () => {
    it('colapsa y expande la barra lateral', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      const layout = document.querySelector('.dashboard-layout')
      const toggle = document.querySelector('.sidebar-toggle-edge')

      fireEvent.click(toggle)
      expect(layout.className).toContain('sidebar-collapsed')

      fireEvent.click(toggle)
      expect(layout.className).not.toContain('sidebar-collapsed')
    })
  })

  describe('notificaciones', () => {
    const notifConPayload = {
      id: 'n1',
      estado: 'ACTIVA',
      productoId: 'sku-1',
      fechaGeneracion: '2025-06-01T00:00:00Z',
      payload: JSON.stringify({ unidadesPredichas: 120, umbralDemandaMaxima: 100, mes: 6, anio: 2025 }),
    }

    it('muestra el estado vacio cuando no hay notificaciones', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.icon-btn[title="Notificaciones y Alertas"]'))

      expect(await screen.findByText('Sin notificaciones pendientes')).toBeInTheDocument()
    })

    it('muestra el badge y el detalle de una notificacion activa, y la marca como vista al hacer click', async () => {
      getNotificaciones.mockResolvedValue({ content: [notifConPayload], totalElements: 1 })
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      expect(await screen.findByText('1')).toBeInTheDocument() // badge

      fireEvent.click(document.querySelector('.icon-btn[title="Notificaciones y Alertas"]'))
      expect(await screen.findByText(/supera el límite de/)).toBeInTheDocument()

      fireEvent.click(screen.getByText(/supera el límite de/).closest('.notification-item'))

      expect(await screen.findByText('vista proyecciones')).toBeInTheDocument()
    })

    it('cierra el desplegable al hacer click afuera', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.icon-btn[title="Notificaciones y Alertas"]'))
      expect(await screen.findByText('Sin notificaciones pendientes')).toBeInTheDocument()

      fireEvent.mouseDown(document.body)

      await waitFor(() =>
        expect(screen.queryByText('Sin notificaciones pendientes')).not.toBeInTheDocument()
      )
    })
  })

  describe('perfil corporativo', () => {
    it('carga y muestra los datos de la empresa al abrir el modal', async () => {
      getSystemInfo.mockResolvedValue({
        razonSocial: 'CCR Paraguay S.A.',
        rolUsuario: 'ADMIN',
        cuit: '80012345-6',
        tenantUuid: 'tenant-123',
      })
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.user-profile-nav'))

      expect(await screen.findByText('CCR Paraguay S.A.')).toBeInTheDocument()
      expect(screen.getByText('tenant-123')).toBeInTheDocument()
    })

    it('copia el tenant id al portapapeles', async () => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
      getSystemInfo.mockResolvedValue({ tenantUuid: 'tenant-123' })
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.user-profile-nav'))
      await screen.findByText('tenant-123')
      fireEvent.click(screen.getByText('Copiar'))

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('tenant-123')
      expect(await screen.findByText('Copiado')).toBeInTheDocument()
    })

    it('resuelve el email de sesion desde el token JWT cuando no hay otra fuente', async () => {
      const payload = btoa(JSON.stringify({ sub: 'user@empresa.com' }))
      localStorage.setItem('token', `header.${payload}.sig`)
      getSystemInfo.mockResolvedValue({})
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(document.querySelector('.user-profile-nav'))

      expect(await screen.findByText('user@empresa.com')).toBeInTheDocument()
    })
  })

  describe('foto de perfil', () => {
    const abrirModal = async () => {
      getSystemInfo.mockResolvedValue({})
      render(<Dashboard />)
      await screen.findByText('vista inicio')
      fireEvent.click(document.querySelector('.user-profile-nav'))
      await screen.findByText('Foto de Perfil')
    }

    it('rechaza un formato de archivo no permitido', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {})
      await abrirModal()

      const input = document.querySelector('input[type="file"]')
      const archivo = new File(['x'], 'foto.gif', { type: 'image/gif' })
      fireEvent.change(input, { target: { files: [archivo] } })

      expect(window.alert).toHaveBeenCalledWith('Formato no permitido (JPG, PNG o WebP).')
    })

    it('rechaza un archivo que supera los 2MB', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {})
      await abrirModal()

      const input = document.querySelector('input[type="file"]')
      const archivoGrande = new File([new Uint8Array(3 * 1024 * 1024)], 'foto.png', { type: 'image/png' })
      fireEvent.change(input, { target: { files: [archivoGrande] } })

      expect(window.alert).toHaveBeenCalledWith('La imagen supera los 2 MB.')
    })

    it('sube una foto valida y actualiza el perfil', async () => {
      const { uploadProfilePhoto } = await import('../../services/profile')
      uploadProfilePhoto.mockResolvedValue({ foto: 'https://cdn/foto.png' })
      await abrirModal()

      const input = document.querySelector('input[type="file"]')
      const archivo = new File(['x'], 'foto.png', { type: 'image/png' })
      fireEvent.change(input, { target: { files: [archivo] } })

      await waitFor(() => expect(uploadProfilePhoto).toHaveBeenCalledWith(archivo))
    })

    it('borra la foto de perfil existente', async () => {
      const { getProfile, deleteProfilePhoto } = await import('../../services/profile')
      getProfile.mockResolvedValue({ foto: 'https://cdn/foto.png' })
      deleteProfilePhoto.mockResolvedValue(undefined)
      await abrirModal()

      fireEvent.click(await screen.findByText('Quitar'))

      await waitFor(() => expect(deleteProfilePhoto).toHaveBeenCalled())
    })
  })

  describe('fecha de datos y catalogo de productos', () => {
    it('usa el ultimo mes historico real para la fecha del tablero', async () => {
      getSalesEvolution.mockResolvedValue([
        { historical: 100, rawAnio: 2025, rawMes: 6 },
        { historical: null, rawAnio: 2025, rawMes: 7 },
      ])
      render(<Dashboard />)

      await waitFor(() => expect(getKPIs).toHaveBeenCalledWith(2025, 6))
    })

    it('construye el catalogo de productos para las notificaciones', async () => {
      getSalesList.mockResolvedValue({
        data: [{ id: 'p1', sku: 'SKU-1', name: 'Producto 1', category: 'Cat A', brand: 'Marca X' }],
      })
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      await waitFor(() => expect(getSalesList).toHaveBeenCalled())
    })
  })

  describe('buscador (command palette)', () => {
    it('abre el buscador con el boton de la cabecera', async () => {
      render(<Dashboard />)
      await screen.findByText('vista inicio')

      fireEvent.click(screen.getByTitle('Buscar productos, vistas y acciones'))

      expect(await screen.findByPlaceholderText(/buscar/i)).toBeInTheDocument()
    })
  })
})
