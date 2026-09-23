import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Nada = () => null
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Passthrough,
    Cell: Nada,
    LabelList: Nada,
    XAxis: Nada,
    YAxis: Nada,
  }
})

import FeatureImportanceModal from './FeatureImportanceModal'

const XAI = {
  modeloTipo: 'RandomForestRegressor',
  variables: [
    { feature: 'lag_1', nombre: 'Mes anterior', grupo: 'Historial y Tendencia', pct: 62.5 },
    { feature: 'ipc_indice', nombre: 'IPC', grupo: 'Variables Macroeconómicas', pct: 37.5 },
  ],
}

const abrir = (props = {}) =>
  render(
    <FeatureImportanceModal
      open
      onClose={vi.fn()}
      data={XAI}
      loading={false}
      error={null}
      {...props}
    />
  )

describe('FeatureImportanceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.overflow = ''
  })

  describe('visibilidad', () => {
    it('no renderiza nada mientras esta cerrado', () => {
      render(
        <FeatureImportanceModal open={false} onClose={vi.fn()} data={XAI} loading={false} error={null} />
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('se presenta como dialogo modal accesible', () => {
      abrir()
      const dialogo = screen.getByRole('dialog')
      expect(dialogo).toHaveAttribute('aria-modal', 'true')
      expect(dialogo).toHaveAccessibleName('Explicabilidad del modelo')
    })

    it('titula con el tipo de modelo activo', () => {
      abrir()
      expect(screen.getByText('RandomForestRegressor')).toBeInTheDocument()
    })

    it('usa un titulo generico cuando no se conoce el modelo', () => {
      abrir({ data: null })
      expect(screen.getByText('Explicabilidad del modelo')).toBeInTheDocument()
    })
  })

  describe('estados de carga y error', () => {
    it('informa mientras se consulta la explicabilidad', () => {
      abrir({ loading: true, data: null })
      expect(screen.getByText('Cargando...')).toBeInTheDocument()
    })

    it('explica que el motor se esta iniciando ante un 502', () => {
      // tesis_ia reentrena al arrancar y no responde hasta terminar: el
      // mensaje distingue esa espera de una falla real.
      abrir({ error: { status: 502 }, data: null })
      expect(screen.getByText(/el motor de ml se está iniciando/i)).toBeInTheDocument()
    })

    it('usa un mensaje generico ante cualquier otro error', () => {
      abrir({ error: { status: 500 }, data: null })
      expect(screen.getByText(/no se pudo cargar la explicabilidad/i)).toBeInTheDocument()
    })

    it('nunca muestra variables inventadas cuando hubo error', () => {
      // Decision explicita del modulo: una explicabilidad estimada no explica
      // nada, asi que ante un fallo no se dibuja ninguna barra.
      abrir({ error: { status: 502 }, data: null })
      expect(screen.queryByText('Mes anterior')).not.toBeInTheDocument()
    })
  })

  describe('cierre', () => {
    it('se cierra con la tecla Escape', () => {
      const onClose = vi.fn()
      abrir({ onClose })

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(onClose).toHaveBeenCalled()
    })

    it('ignora otras teclas', () => {
      const onClose = vi.fn()
      abrir({ onClose })

      fireEvent.keyDown(window, { key: 'Enter' })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('se cierra con el boton de cerrar', () => {
      const onClose = vi.fn()
      abrir({ onClose })

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))

      expect(onClose).toHaveBeenCalled()
    })

    it('se cierra al pulsar fuera del panel', () => {
      const onClose = vi.fn()
      const { container } = abrir({ onClose })

      fireEvent.mouseDown(document.querySelector('.cmdk-overlay'))

      expect(onClose).toHaveBeenCalled()
      expect(container).toBeDefined()
    })
  })

  describe('bloqueo del desplazamiento de fondo', () => {
    it('inmoviliza la vista de atras mientras esta abierto', () => {
      // Sin esto la pagina sigue desplazandose con la rueda por debajo del
      // overlay mientras el modal esta abierto.
      abrir()
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restaura el desplazamiento al desmontarse', () => {
      const { unmount } = abrir()
      unmount()
      expect(document.body.style.overflow).not.toBe('hidden')
    })
  })
})
