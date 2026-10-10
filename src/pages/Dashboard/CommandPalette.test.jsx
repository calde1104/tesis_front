import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import CommandPalette from './CommandPalette'

const PRODUCTOS = [
  { sku: 'SKU-001', name: 'Gaseosa Cola 2L', category: 'Gaseosas', brand: 'Coca Cola' },
  { sku: 'SKU-002', name: 'Agua Mineral 1L', category: 'Aguas', brand: 'Pura' },
]

const NOTIFICACIONES = [
  { id: 'n1', titulo: 'Riesgo de quiebre en SKU-001', sku: 'SKU-001', estado: 'NUEVA' },
]

const abrir = (props = {}) => {
  const acciones = {
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    onOpenProduct: vi.fn(),
    onOpenNotification: vi.fn(),
    onOpenCompany: vi.fn(),
    onLogout: vi.fn(),
  }
  render(
    <CommandPalette
      {...acciones}
      products={PRODUCTOS}
      notifications={NOTIFICACIONES}
      {...props}
    />
  )
  return { ...acciones, ...props }
}

// El manejador de teclado vive en el propio buscador, no en window: la
// paleta ya nace con el foco puesto ahi.
const teclear = (key) =>
  fireEvent.keyDown(screen.getByPlaceholderText(/buscar productos, vistas o acciones/i), { key })

const buscar = (texto) =>
  fireEvent.change(screen.getByPlaceholderText(/buscar productos, vistas o acciones/i), {
    target: { value: texto },
  })

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('presentacion', () => {
    it('se presenta como dialogo con buscador enfocable', () => {
      abrir()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/buscar productos, vistas o acciones/i)
      ).toBeInTheDocument()
    })

    it('ofrece las vistas de la plataforma como comandos de navegacion', () => {
      abrir()
      expect(screen.getByText('Simulador de Demanda')).toBeInTheDocument()
      expect(screen.getByText('Ingesta de Datos')).toBeInTheDocument()
    })
  })

  describe('busqueda', () => {
    it('encuentra una vista por su nombre', () => {
      abrir()
      buscar('mercado')
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })

    it('encuentra una vista por palabras clave que no estan en el titulo', () => {
      // "cold start" no figura en el rotulo "Pre-lanzamiento", pero es como
      // el equipo nombra la funcionalidad en el dia a dia.
      abrir()
      buscar('cold start')
      expect(screen.getByText('Pre-lanzamiento')).toBeInTheDocument()
    })

    it('encuentra un producto del catalogo por SKU', () => {
      abrir()
      buscar('SKU-002')
      expect(screen.getByText(/Agua Mineral 1L/)).toBeInTheDocument()
    })

    it('no ofrece resultados irrelevantes ante un termino sin coincidencias', () => {
      abrir()
      buscar('xyzqwerty')
      expect(screen.queryByText('Simulador de Demanda')).not.toBeInTheDocument()
    })
  })

  describe('teclado', () => {
    it('se cierra con Escape', () => {
      const { onClose } = abrir()
      teclear('Escape')
      expect(onClose).toHaveBeenCalled()
    })

    it('desplaza la seleccion hacia atras con la flecha hacia arriba', () => {
      const { onNavigate } = abrir()

      teclear('ArrowUp')
      teclear('Enter')

      expect(onNavigate).toHaveBeenCalled()
      expect(onNavigate.mock.calls[0][0]).not.toBe('inicio')
    })

    it('ejecuta el comando resaltado con Enter', () => {
      const { onNavigate, onClose } = abrir()

      buscar('mercado')
      teclear('Enter')

      expect(onNavigate).toHaveBeenCalledWith('market')
      expect(onClose).toHaveBeenCalled()
    })

    it('desplaza la seleccion con las flechas', () => {
      const { onNavigate } = abrir()

      teclear('ArrowDown')
      teclear('Enter')

      expect(onNavigate).toHaveBeenCalled()
      expect(onNavigate.mock.calls[0][0]).not.toBe('inicio')
    })

    it('salta al primer y al ultimo comando con Home y End', () => {
      const { onNavigate } = abrir()

      teclear('End')
      teclear('Home')
      teclear('Enter')

      expect(onNavigate).toHaveBeenCalledWith('inicio')
    })
  })

  describe('ejecucion con el puntero', () => {
    it('navega al pulsar un comando de vista', () => {
      const { onNavigate, onClose } = abrir()

      fireEvent.click(screen.getByText('Ingesta de Datos'))

      expect(onNavigate).toHaveBeenCalledWith('ingestion')
      expect(onClose).toHaveBeenCalled()
    })

    it('abre el producto elegido del catalogo', () => {
      const { onOpenProduct } = abrir()

      buscar('SKU-001')
      fireEvent.click(screen.getByText(/Gaseosa Cola 2L/))

      expect(onOpenProduct).toHaveBeenCalled()
    })

    it('se cierra al pulsar fuera del panel', () => {
      const { onClose } = abrir()
      fireEvent.mouseDown(document.querySelector('.cmdk-overlay'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('recientes', () => {
    it('no falla cuando el almacenamiento local guarda basura', () => {
      localStorage.setItem('cmdk_recents', '{{{roto')
      expect(() => abrir()).not.toThrow()
    })

    it('no falla cuando el almacenamiento local guarda un objeto en vez de una lista', () => {
      localStorage.setItem('cmdk_recents', '{"a":1}')
      expect(() => abrir()).not.toThrow()
    })

    it('muestra el ultimo comando ejecutado bajo "Recientes" al reabrir', () => {
      abrir()
      fireEvent.click(screen.getByText('Ingesta de Datos'))

      abrir()

      expect(screen.getByText('Recientes')).toBeInTheDocument()
    })
  })

  describe('alertas activas', () => {
    it('ofrece una alerta activa como comando y abre la notificacion al ejecutarla', () => {
      const { onOpenNotification, onClose } = abrir({
        notifications: [{ id: 'n1', estado: 'ACTIVA', productoId: 'SKU-001' }],
      })

      buscar('alerta')
      fireEvent.click(screen.getByText(/supera el umbral/))

      expect(onOpenNotification).toHaveBeenCalledWith('n1', 'SKU-001')
      expect(onClose).toHaveBeenCalled()
    })

    it('ignora las notificaciones que no estan activas', () => {
      abrir({ notifications: [{ id: 'n1', estado: 'VISTA', productoId: 'SKU-001' }] })
      buscar('alerta')
      expect(screen.queryByText(/supera el umbral/)).not.toBeInTheDocument()
    })
  })

  describe('acciones de cuenta', () => {
    it('abre el perfil corporativo', () => {
      const { onOpenCompany, onClose } = abrir()
      buscar('empresa')
      fireEvent.click(screen.getByText('Ver perfil corporativo'))
      expect(onOpenCompany).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('cierra la sesion', () => {
      const { onLogout, onClose } = abrir()
      buscar('desconectar')
      fireEvent.click(screen.getByText('Cerrar sesion'))
      expect(onLogout).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
