import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../services/coldStart', () => ({
  predictColdStart: vi.fn(),
}))

vi.mock('../../../services/sales', () => ({
  getSalesFilters: vi.fn(),
  getDeptId: vi.fn(),
  getCategoryId: vi.fn(),
  getBrandId: vi.fn(),
}))

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Nada = () => null
  return {
    ResponsiveContainer: Passthrough,
    AreaChart: Passthrough,
    Area: Nada,
    XAxis: Nada,
    YAxis: Nada,
    CartesianGrid: Nada,
    Tooltip: Nada,
  }
})

import ColdStartView from './ColdStartView'
import { predictColdStart } from '../../../services/coldStart'
import { getSalesFilters } from '../../../services/sales'

const CATALOGO = {
  departments: ['Bebidas', 'Alimentos'],
  categories: { Bebidas: ['Gaseosas', 'Aguas'], Alimentos: ['Lacteos'] },
  brands: ['Coca Cola', 'Pepsi'],
  categoryBrands: { Gaseosas: ['Coca Cola', 'Pepsi'] },
  deptBrands: { Bebidas: ['Coca Cola', 'Pepsi'] },
}

const RESPUESTA_IA = {
  producto_nuevo: {
    cluster_asignado: 4,
    unidades_base_estimadas: 1250,
    factor_elasticidad_precio: 0.92,
  },
  proyeccion_12_meses: Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    unidades_estimadas: 1000 + i * 25,
  })),
  productos_similares_gemelos: [{ descripcion: 'Gaseosa Cola 1.5L', similitud: 0.94 }],
}

const elegirEnSelect = async (placeholder, opcion) => {
  fireEvent.click(screen.getByText(placeholder))
  fireEvent.click(await screen.findByText(opcion))
}

const escribir = (placeholder, valor) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: valor } })

const completarFormularioValido = async () => {
  fireEvent.click(screen.getByText('Bebidas'))
  await elegirEnSelect('Seleccionar Categoría', 'Gaseosas')
  await elegirEnSelect('Seleccionar Marca', 'Coca Cola')
  escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
  escribir('Ej: 12500', '8500')
  escribir('1.5', '2')
}

const botonEstimar = () => screen.getByRole('button', { name: /estimar demanda/i })

const estimar = () => fireEvent.submit(botonEstimar().closest('form'))

describe('ColdStartView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSalesFilters.mockResolvedValue(CATALOGO)
    predictColdStart.mockResolvedValue(RESPUESTA_IA)
  })

  describe('carga inicial del catalogo', () => {
    it('ofrece los departamentos que devuelve el catalogo', async () => {
      render(<ColdStartView />)
      expect(await screen.findByText('Bebidas')).toBeInTheDocument()
      expect(screen.getByText('Alimentos')).toBeInTheDocument()
    })

    it('no se rompe si el catalogo falla al cargar', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      getSalesFilters.mockRejectedValue(new Error('backend caido'))

      render(<ColdStartView />)

      expect(
        await screen.findByRole('button', { name: /estimar demanda/i })
      ).toBeInTheDocument()
    })

    it('acota las categorias al departamento elegido', async () => {
      render(<ColdStartView />)
      fireEvent.click(await screen.findByText('Alimentos'))
      fireEvent.click(screen.getByText('Seleccionar Categoría'))

      expect(await screen.findByText('Lacteos')).toBeInTheDocument()
      expect(screen.queryByText('Gaseosas')).not.toBeInTheDocument()
    })

    it('elige un icono segun el rubro del departamento', async () => {
      getSalesFilters.mockResolvedValue({
        ...CATALOGO,
        departments: ['Limpieza del Hogar', 'Cuidado Personal'],
      })
      render(<ColdStartView />)

      expect(await screen.findByText('Limpieza del Hogar')).toBeInTheDocument()
      expect(screen.getByText('Cuidado Personal')).toBeInTheDocument()
    })
  })

  describe('validaciones del formulario', () => {
    it('exige el nombre del producto antes de llamar al modelo', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      estimar()

      expect(await screen.findByText(/ingrese el nombre o descripción/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })

    it('exige el departamento comercial cuando el catalogo no trae ninguno', async () => {
      getSalesFilters.mockResolvedValue({ ...CATALOGO, departments: [] })
      render(<ColdStartView />)
      await screen.findByRole('button', { name: /estimar demanda/i })

      escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
      estimar()

      expect(await screen.findByText(/seleccione el departamento comercial/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })

    it('exige la categoria objetivo', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
      estimar()

      expect(await screen.findByText(/seleccione la categoría objetivo/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })

    it('exige la marca del nuevo SKU', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      await elegirEnSelect('Seleccionar Categoría', 'Gaseosas')
      escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
      estimar()

      expect(await screen.findByText(/seleccione la marca/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })

    it('exige un precio sugerido mayor a cero', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      await elegirEnSelect('Seleccionar Categoría', 'Gaseosas')
      await elegirEnSelect('Seleccionar Marca', 'Coca Cola')
      escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
      escribir('Ej: 12500', '0')
      estimar()

      expect(await screen.findByText(/precio sugerido válido/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })

    it('exige un contenido neto mayor a cero', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      await elegirEnSelect('Seleccionar Categoría', 'Gaseosas')
      await elegirEnSelect('Seleccionar Marca', 'Coca Cola')
      escribir('Ej: Mayonesa Especial 500g', 'Gaseosa Cola 2L')
      escribir('Ej: 12500', '8500')
      escribir('1.5', '0')
      estimar()

      expect(await screen.findByText(/contenido neto válido/i)).toBeInTheDocument()
      expect(predictColdStart).not.toHaveBeenCalled()
    })
  })

  describe('ejecucion de la estimacion', () => {
    it('envia al servicio los atributos cargados por el analista', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      await completarFormularioValido()
      estimar()

      await waitFor(() => expect(predictColdStart).toHaveBeenCalledTimes(1))
      expect(predictColdStart).toHaveBeenCalledWith(
        expect.objectContaining({
          department: 'Bebidas',
          category: 'Gaseosas',
          brand: 'Coca Cola',
          name: 'Gaseosa Cola 2L',
          expectedPrice: 8500,
          weight: 2,
          horizonteMeses: 12,
        })
      )
    })

    it('muestra la proyeccion devuelta por el microservicio', async () => {
      render(<ColdStartView />)
      await screen.findByText('Bebidas')

      await completarFormularioValido()
      estimar()

      expect(await screen.findByText(/curva de demanda proyectada/i)).toBeInTheDocument()
    })

    it('deshabilita el boton e informa el progreso mientras el modelo responde', async () => {
      let resolver
      predictColdStart.mockReturnValue(new Promise((r) => { resolver = r }))

      render(<ColdStartView />)
      await screen.findByText('Bebidas')
      await completarFormularioValido()
      estimar()

      const boton = await screen.findByRole('button', { name: /calculando estimación/i })
      expect(boton).toBeDisabled()

      resolver(RESPUESTA_IA)
      await waitFor(() => expect(botonEstimar()).toBeEnabled())
    })

    it('muestra el mensaje del backend cuando la estimacion falla', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      predictColdStart.mockRejectedValue(new Error('El motor de IA no esta disponible'))

      render(<ColdStartView />)
      await screen.findByText('Bebidas')
      await completarFormularioValido()
      estimar()

      expect(await screen.findByText('El motor de IA no esta disponible')).toBeInTheDocument()
    })

    it('rehabilita el boton tras un fallo, permitiendo reintentar', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      predictColdStart.mockRejectedValue(new Error('timeout'))

      render(<ColdStartView />)
      await screen.findByText('Bebidas')
      await completarFormularioValido()
      estimar()

      await waitFor(() => expect(botonEstimar()).toBeEnabled())
    })
  })
})
