import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'

vi.mock('../../../services/ingestion', () => ({
  uploadFile: vi.fn(),
  checkPipelineStatus: vi.fn(),
  getIngestionHistory: vi.fn(),
  retryFailedIngestion: vi.fn(),
  deleteIngestionHistory: vi.fn(),
}))

vi.mock('../../../services/sales', () => ({ clearSalesFiltersCache: vi.fn() }))
vi.mock('../../../services/marketShare', () => ({ clearMarketShareCache: vi.fn() }))

import IngestionView from './IngestionView'
import {
  uploadFile,
  checkPipelineStatus,
  getIngestionHistory,
  retryFailedIngestion,
  deleteIngestionHistory,
} from '../../../services/ingestion'

const HISTORIAL = [
  {
    id: 'arch-001',
    name: 'ventas_marzo.csv',
    size: 2048,
    frequency: 'MENSUAL',
    periodoDesde: '2025-03-01',
    periodoHasta: '2025-03-31',
    date: '15/03/2025 14:30',
    records: 1500,
    status: 'SUCCESS',
  },
  {
    id: 'arch-002',
    name: 'ventas_abril.csv',
    size: 4096,
    frequency: 'MENSUAL',
    date: '15/04/2025 10:00',
    records: 0,
    status: 'FAILED',
  },
]

const planilla = (nombre = 'ventas_marzo.csv') =>
  new File(['sku,anio,mes'], nombre, { type: 'text/csv' })

const entradaArchivo = () => document.querySelector('input[type="file"]')

const seleccionarArchivo = (archivo) =>
  fireEvent.change(entradaArchivo(), { target: { files: [archivo] } })

// La etiqueta tambien aparece como insignia en cada fila del historial,
// asi que se acota por rol: solo el selector es un boton.
const elegirFrecuencia = (etiqueta) =>
  fireEvent.click(screen.getByRole('button', { name: etiqueta }))

const confirmarIngesta = () =>
  fireEvent.click(screen.getByText(/confirmar e iniciar ingesta/i))

describe('IngestionView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getIngestionHistory.mockResolvedValue(HISTORIAL)
    uploadFile.mockResolvedValue({ taskId: 'arch-003', estado: 'PENDIENTE' })
    checkPipelineStatus.mockResolvedValue({
      taskId: 'arch-003',
      progress: 100,
      stage: 'SUCCESS',
      stages: { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'SUCCESS' },
      status: 'SUCCESS',
    })
  })

  describe('historial de ingestas', () => {
    it('informa mientras se conecta al pipeline', () => {
      getIngestionHistory.mockReturnValue(new Promise(() => {}))
      render(<IngestionView />)
      expect(screen.getByText(/conectando al pipeline/i)).toBeInTheDocument()
    })

    it('lista las ingestas previas de la organizacion', async () => {
      render(<IngestionView />)
      expect(await screen.findByText('ventas_marzo.csv')).toBeInTheDocument()
      expect(screen.getByText('ventas_abril.csv')).toBeInTheDocument()
    })

    it('reprocesa un archivo fallido y refresca el historial', async () => {
      retryFailedIngestion.mockResolvedValue({ success: true })
      render(<IngestionView />)
      await screen.findByText('ventas_abril.csv')

      fireEvent.click(screen.getAllByTitle('Opciones de archivo')[1])
      fireEvent.click(await screen.findByText(/re-intentar/i))

      await waitFor(() => expect(retryFailedIngestion).toHaveBeenCalledWith('arch-002'))
      await waitFor(() => expect(getIngestionHistory).toHaveBeenCalledTimes(2))
    })
  })

  describe('seleccion del archivo', () => {
    it('acepta una planilla y la propone para ingerir', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      seleccionarArchivo(planilla('ventas_mayo.csv'))

      expect(await screen.findByText(/confirmar e iniciar ingesta/i)).toBeInTheDocument()
    })

    it('rechaza una extension no admitida al soltarla sobre el area', async () => {
      // El backend solo procesa CSV y Excel: cortar aca evita un viaje
      // inutil y un mensaje de error tardio.
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      const zona = document.querySelector('.upload-box-card')
      fireEvent.drop(zona, { dataTransfer: { files: [planilla('notas.txt')] } })

      expect(await screen.findByText(/únicamente archivos csv o de excel/i)).toBeInTheDocument()
    })

    it('acepta un archivo .xlsx soltado sobre el area', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      const zona = document.querySelector('.upload-box-card')
      fireEvent.drop(zona, { dataTransfer: { files: [planilla('ventas.xlsx')] } })

      expect(await screen.findByText(/confirmar e iniciar ingesta/i)).toBeInTheDocument()
    })
  })

  describe('ingesta', () => {
    it('exige elegir la frecuencia antes de enviar', async () => {
      // La granularidad determina en que tabla aterrizan las filas; sin ella
      // el backend no puede decidir.
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')
      seleccionarArchivo(planilla())

      confirmarIngesta()

      expect(await screen.findByText(/seleccioná la frecuencia/i)).toBeInTheDocument()
      expect(uploadFile).not.toHaveBeenCalled()
    })

    it('envia el archivo con la frecuencia y el periodo elegidos', async () => {
      const anio = new Date().getFullYear()
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      seleccionarArchivo(planilla())
      elegirFrecuencia('Mensual')
      confirmarIngesta()

      await waitFor(() =>
        expect(uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          'MENSUAL',
          `${anio}-01-01`,
          `${anio}-12-31`
        )
      )
    })

    it('admite tambien la granularidad semanal', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      seleccionarArchivo(planilla())
      elegirFrecuencia('Semanal')
      confirmarIngesta()

      await waitFor(() =>
        expect(uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          'SEMANAL',
          expect.any(String),
          expect.any(String)
        )
      )
    })

    it('no celebra una ingesta que el servidor nunca confirmo', async () => {
      checkPipelineStatus.mockResolvedValue({
        taskId: 'arch-003',
        progress: 60,
        stage: 'UNKNOWN',
        stages: { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'RUNNING' },
        status: 'UNKNOWN',
      })

      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')
      seleccionarArchivo(planilla())
      elegirFrecuencia('Mensual')
      confirmarIngesta()

      await waitFor(() => expect(checkPipelineStatus.mock.calls.length).toBeGreaterThan(1), {
        timeout: 4000,
      })

      expect(screen.queryByText(/ingesta completada/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/no pudimos confirmar el estado/i)).not.toBeInTheDocument()
    }, 10000)

    it('muestra el motivo cuando el servidor rechaza la planilla', async () => {
      uploadFile.mockRejectedValue(new Error('El archivo ya fue ingerido'))

      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')
      seleccionarArchivo(planilla())
      elegirFrecuencia('Mensual')
      confirmarIngesta()

      expect(await screen.findByText('El archivo ya fue ingerido')).toBeInTheDocument()
    })

    it('marca el error como fallo del pipeline cuando el servidor responde FAILED', async () => {
      checkPipelineStatus.mockResolvedValue({
        taskId: 'arch-003',
        progress: 100,
        stage: 'FAILED',
        stages: { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'FAILED' },
        status: 'FAILED',
      })

      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')
      seleccionarArchivo(planilla())
      elegirFrecuencia('Mensual')
      confirmarIngesta()

      expect(
        await screen.findByText(/rechazada por el servidor/i, {}, { timeout: 5000 })
      ).toBeInTheDocument()
    }, 10000)

    it('se rinde tras repetidos sondeos sin confirmar y avisa en vez de girar para siempre', async () => {
      checkPipelineStatus.mockResolvedValue({
        taskId: 'arch-003',
        progress: 60,
        stage: 'UNKNOWN',
        stages: { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'RUNNING' },
        status: 'UNKNOWN',
      })

      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')
      seleccionarArchivo(planilla())
      elegirFrecuencia('Mensual')
      confirmarIngesta()

      expect(
        await screen.findByText(/no pudimos confirmar el estado de la ingesta/i, {}, { timeout: 15000 })
      ).toBeInTheDocument()
    }, 20000)
  })

  describe('arrastrar y soltar', () => {
    it('resalta la zona mientras se arrastra un archivo encima', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      const zona = document.querySelector('.upload-box-card')
      fireEvent.dragOver(zona)
      expect(zona.className).toContain('drag-over')

      fireEvent.dragLeave(zona)
      expect(zona.className).not.toContain('drag-over')
    })
  })

  describe('menu de acciones', () => {
    it('cierra el menu contextual al hacer click afuera', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_abril.csv')

      fireEvent.click(screen.getAllByTitle('Opciones de archivo')[1])
      expect(await screen.findByText(/re-intentar/i)).toBeInTheDocument()

      fireEvent.click(document.body)
      await waitFor(() => expect(screen.queryByText(/re-intentar/i)).not.toBeInTheDocument())
    })

    it('permite cambiar de archivo antes de confirmar la ingesta', async () => {
      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      seleccionarArchivo(planilla())
      expect(await screen.findByText(/confirmar e iniciar ingesta/i)).toBeInTheDocument()

      fireEvent.click(screen.getByText(/cambiar archivo/i))

      await waitFor(() =>
        expect(screen.queryByText(/confirmar e iniciar ingesta/i)).not.toBeInTheDocument()
      )
    })
  })

  describe('eliminacion de una ingesta', () => {
    const abrirDialogoDeBorrado = async (nombreArchivo) => {
      render(<IngestionView />)
      await screen.findByText(nombreArchivo)
      const fila = screen.getByText(nombreArchivo).closest('tr')
      fireEvent.click(within(fila).getByTitle('Opciones de archivo'))
      fireEvent.click(await screen.findByText(/eliminar$/i))
      return screen.findByText(/confirmar eliminación de ingesta/i)
    }

    it('exige tildar el acuse y escribir ELIMINAR antes de habilitar el boton', async () => {
      await abrirDialogoDeBorrado('ventas_marzo.csv')

      const botonConfirmar = screen.getByRole('button', { name: /eliminar definitivamente/i })
      expect(botonConfirmar).toBeDisabled()

      fireEvent.click(screen.getByRole('checkbox'))
      expect(botonConfirmar).toBeDisabled()

      fireEvent.change(screen.getByPlaceholderText('ELIMINAR'), { target: { value: 'eliminar' } })
      expect(botonConfirmar).not.toBeDisabled()
    })

    it('elimina la ingesta y refresca el historial al confirmar', async () => {
      deleteIngestionHistory.mockResolvedValue({ success: true })
      await abrirDialogoDeBorrado('ventas_marzo.csv')

      fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.change(screen.getByPlaceholderText('ELIMINAR'), { target: { value: 'ELIMINAR' } })
      fireEvent.click(screen.getByRole('button', { name: /eliminar definitivamente/i }))

      await waitFor(() => expect(deleteIngestionHistory).toHaveBeenCalledWith('arch-001'))
      await waitFor(() => expect(getIngestionHistory).toHaveBeenCalledTimes(2))
      await waitFor(() =>
        expect(screen.queryByText(/confirmar eliminación de ingesta/i)).not.toBeInTheDocument()
      )
    })

    it('cancela sin eliminar nada', async () => {
      await abrirDialogoDeBorrado('ventas_marzo.csv')

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(screen.queryByText(/confirmar eliminación de ingesta/i)).not.toBeInTheDocument()
      expect(deleteIngestionHistory).not.toHaveBeenCalled()
    })
  })

  describe('plantilla de ejemplo', () => {
    it('descarga la plantilla CSV al hacer click', async () => {
      const urlMock = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      render(<IngestionView />)
      await screen.findByText('ventas_marzo.csv')

      fireEvent.click(screen.getByText(/descargar plantilla/i))

      expect(urlMock).toHaveBeenCalled()
      urlMock.mockRestore()
      revokeMock.mockRestore()
    })
  })
})
