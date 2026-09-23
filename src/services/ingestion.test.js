import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

import {
  uploadFile,
  checkPipelineStatus,
  getIngestionHistory,
  retryFailedIngestion,
  deleteIngestionHistory,
} from './ingestion'
import { apiRequest } from './api'

const planilla = () =>
  new File(['sku,anio,mes,unidades_vendidas,monto_facturado'], 'ventas_marzo.csv', {
    type: 'text/csv',
  })

const formularioEnviado = () => apiRequest.mock.calls[0][1].body

const historialCon = (items) => ({ content: items })

describe('uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockResolvedValue({ archivoId: 'arch-001', estado: 'PENDIENTE', mensaje: 'Recibido' })
  })

  it('publica la planilla en el endpoint de ingesta de la empresa', async () => {
    await uploadFile(planilla())
    expect(apiRequest).toHaveBeenCalledWith(
      '/v1/7/ingestion/upload',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('envia el archivo como FormData y no como JSON', async () => {
    // Es lo que permite al navegador generar el boundary del multipart; el
    // cliente HTTP depende de este tipo para omitir el Content-Type.
    await uploadFile(planilla())
    expect(formularioEnviado()).toBeInstanceOf(FormData)
    expect(formularioEnviado().get('file')).toBeInstanceOf(File)
  })

  it('usa granularidad mensual por defecto', async () => {
    await uploadFile(planilla())
    expect(formularioEnviado().get('granularidad')).toBe('MENSUAL')
  })

  it('normaliza la granularidad a mayusculas', async () => {
    await uploadFile(planilla(), 'semanal')
    expect(formularioEnviado().get('granularidad')).toBe('SEMANAL')
  })

  it('acota el periodo al anio en curso cuando no se indica', async () => {
    const anio = new Date().getFullYear()
    await uploadFile(planilla())
    expect(formularioEnviado().get('periodoDesde')).toBe(`${anio}-01-01`)
    expect(formularioEnviado().get('periodoHasta')).toBe(`${anio}-12-31`)
  })

  it('respeta el periodo indicado por el analista', async () => {
    await uploadFile(planilla(), 'MENSUAL', '2025-03-01', '2025-03-31')
    expect(formularioEnviado().get('periodoDesde')).toBe('2025-03-01')
    expect(formularioEnviado().get('periodoHasta')).toBe('2025-03-31')
  })

  it('expone el identificador del archivo para poder seguir el pipeline', async () => {
    const res = await uploadFile(planilla())
    expect(res).toEqual({ taskId: 'arch-001', estado: 'PENDIENTE', mensaje: 'Recibido' })
  })

  it('completa estado y mensaje cuando el backend no los envia', async () => {
    apiRequest.mockResolvedValue({ archivoId: 'arch-002' })
    const res = await uploadFile(planilla())
    expect(res).toMatchObject({ estado: 'OK', mensaje: 'Archivo recibido' })
  })

  it('propaga el rechazo del backend en vez de silenciarlo', async () => {
    apiRequest.mockRejectedValue(new Error('El archivo ya fue ingerido'))
    await expect(uploadFile(planilla())).rejects.toThrow('El archivo ya fue ingerido')
  })
})

describe('checkPipelineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('informa progreso completo y exito cuando el archivo termino OK', async () => {
    apiRequest.mockResolvedValue(historialCon([{ archivoId: 'arch-001', estado: 'OK' }]))

    const estado = await checkPipelineStatus('arch-001')

    expect(estado).toMatchObject({ progress: 100, stage: 'SUCCESS', status: 'SUCCESS' })
    expect(estado.stages.insertion).toBe('SUCCESS')
  })

  it('informa fallo cuando el procesamiento termino en ERROR', async () => {
    apiRequest.mockResolvedValue(historialCon([{ archivoId: 'arch-001', estado: 'ERROR' }]))

    const estado = await checkPipelineStatus('arch-001')

    expect(estado).toMatchObject({ progress: 100, stage: 'FAILED', status: 'FAILED' })
    expect(estado.stages.insertion).toBe('FAILED')
  })

  it('informa progreso parcial mientras el archivo sigue procesandose', async () => {
    apiRequest.mockResolvedValue(historialCon([{ archivoId: 'arch-001', estado: 'PROCESANDO' }]))

    const estado = await checkPipelineStatus('arch-001')

    expect(estado).toMatchObject({ progress: 60, stage: 'INSERTING', status: 'RUNNING' })
    expect(estado.stages.insertion).toBe('RUNNING')
  })

  it('declara desconocido el estado cuando el archivo no figura en el historial', async () => {
    // Nunca SUCCESS: el servidor puede no haber registrado todavia el archivo,
    // y dar por buena una ingesta sin confirmarla es peor que seguir esperando.
    apiRequest.mockResolvedValue(historialCon([{ archivoId: 'otro', estado: 'ERROR' }]))

    await expect(checkPipelineStatus('arch-001')).resolves.toMatchObject({
      status: 'UNKNOWN',
    })
  })

  it('declara desconocido el estado cuando la consulta al historial falla', async () => {
    apiRequest.mockRejectedValue(new Error('sin conexion'))

    await expect(checkPipelineStatus('arch-001')).resolves.toMatchObject({
      status: 'UNKNOWN',
    })
  })

  it('no confunde un estado desconocido con un pipeline terminado', async () => {
    // La vista corta el sondeo con SUCCESS o FAILED: UNKNOWN debe quedar fuera
    // de ambos para que siga esperando.
    apiRequest.mockResolvedValue(historialCon([]))

    const estado = await checkPipelineStatus('arch-001')

    expect(estado.status).not.toBe('SUCCESS')
    expect(estado.status).not.toBe('FAILED')
  })
})

describe('getIngestionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const archivo = {
    archivoId: 'arch-001',
    nombreArchivo: 'ventas_marzo.csv',
    tamanioBytes: 2048,
    granularidad: 'MENSUAL',
    periodoDesde: '2025-03-01',
    periodoHasta: '2025-03-31',
    fechaRecepcion: '2025-03-15T14:30:00Z',
    cantRegistros: 1500,
    estado: 'OK',
  }

  it('consulta el historial paginado de la empresa', async () => {
    apiRequest.mockResolvedValue(historialCon([]))
    await getIngestionHistory()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/ingestion/history?page=0&size=100')
  })

  it('traduce el registro del backend a la forma que consume la vista', async () => {
    apiRequest.mockResolvedValue(historialCon([archivo]))

    const [fila] = await getIngestionHistory()

    expect(fila).toMatchObject({
      id: 'arch-001',
      name: 'ventas_marzo.csv',
      size: 2048,
      frequency: 'MENSUAL',
      records: 1500,
      status: 'SUCCESS',
    })
  })

  it('oculta los archivos dados de baja logicamente', async () => {
    apiRequest.mockResolvedValue(
      historialCon([archivo, { ...archivo, archivoId: 'arch-002', estado: 'ELIMINADO' }])
    )

    const historial = await getIngestionHistory()

    expect(historial).toHaveLength(1)
    expect(historial[0].id).toBe('arch-001')
  })

  it('mapea los estados del backend a los de la interfaz', async () => {
    apiRequest.mockResolvedValue(
      historialCon([
        { ...archivo, archivoId: 'a', estado: 'OK' },
        { ...archivo, archivoId: 'b', estado: 'ERROR' },
        { ...archivo, archivoId: 'c', estado: 'PROCESANDO' },
      ])
    )

    const historial = await getIngestionHistory()

    expect(historial.map((f) => f.status)).toEqual(['SUCCESS', 'FAILED', 'PROCESSING'])
  })

  it('formatea la fecha de recepcion de forma legible', async () => {
    apiRequest.mockResolvedValue(historialCon([archivo]))
    const [fila] = await getIngestionHistory()
    expect(fila.date).not.toBe('-')
    expect(fila.date).toMatch(/\d/)
  })

  it('muestra un guion cuando la fecha de recepcion es invalida', async () => {
    apiRequest.mockResolvedValue(historialCon([{ ...archivo, fechaRecepcion: 'fecha-rota' }]))
    const [fila] = await getIngestionHistory()
    expect(fila.date).toBe('-')
  })

  it('completa los campos opcionales ausentes', async () => {
    apiRequest.mockResolvedValue(
      historialCon([{ archivoId: 'x', nombreArchivo: 'v.csv', estado: 'OK' }])
    )

    const [fila] = await getIngestionHistory()

    expect(fila.records).toBe(0)
    expect(fila.frequency).toBe('MENSUAL')
    expect(fila.size).toBe(1048576)
  })

  it('devuelve un historial vacio ante una respuesta sin contenido', async () => {
    apiRequest.mockResolvedValue({ mensaje: 'sin datos' })
    await expect(getIngestionHistory()).resolves.toEqual([])
  })

  it('devuelve un historial vacio si la consulta falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getIngestionHistory()).resolves.toEqual([])
  })
})

describe('retryFailedIngestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('solicita el reprocesamiento del archivo indicado', async () => {
    apiRequest.mockResolvedValue(null)
    await retryFailedIngestion('arch-001')
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/ingestion/arch-001/resync', {
      method: 'POST',
    })
  })

  it('confirma el reintento exitoso', async () => {
    apiRequest.mockResolvedValue(null)
    await expect(retryFailedIngestion('arch-001')).resolves.toEqual({ success: true })
  })

  it('informa el fallo sin propagar la excepcion a la vista', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(retryFailedIngestion('arch-001')).resolves.toEqual({ success: false })
  })
})

describe('deleteIngestionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('solicita la baja logica del archivo mediante DELETE', async () => {
    apiRequest.mockResolvedValue(null)
    await deleteIngestionHistory('arch-001')
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/ingestion/arch-001/borrado', {
      method: 'DELETE',
    })
  })

  it('confirma la baja exitosa', async () => {
    apiRequest.mockResolvedValue(null)
    await expect(deleteIngestionHistory('arch-001')).resolves.toEqual({ success: true })
  })

  it('informa el fallo sin propagar la excepcion a la vista', async () => {
    apiRequest.mockRejectedValue(new Error('403'))
    await expect(deleteIngestionHistory('arch-001')).resolves.toEqual({ success: false })
  })
})
