import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

import {
  getSystemInfo,
  getProductThresholds,
  saveProductThresholds,
  getMLModels,
} from './settings'
import { apiRequest } from './api'

const umbral = (extra) => ({
  parametro: 'UMBRAL_DEMANDA_MAXIMA',
  valor: '40000',
  ...extra,
})

describe('getSystemInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('consulta la informacion del sistema de la empresa activa', async () => {
    apiRequest.mockResolvedValue({ version: '1.0' })
    await getSystemInfo()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/system-info')
  })

  it('devuelve null si la consulta falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getSystemInfo()).resolves.toBeNull()
  })
})

describe('getProductThresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('consulta la configuracion persistida de la empresa', async () => {
    apiRequest.mockResolvedValue([])
    await getProductThresholds()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/config')
  })

  it('arma el mapa de umbrales por producto', async () => {
    apiRequest.mockResolvedValue([umbral({ productoId: 'SKU-1', valor: '40000' })])
    await expect(getProductThresholds()).resolves.toEqual({ 'SKU-1': 40000 })
  })

  it('ignora los parametros de configuracion ajenos al umbral', async () => {
    apiRequest.mockResolvedValue([
      umbral({ productoId: 'SKU-1' }),
      { parametro: 'OTRO_PARAMETRO', valor: '999', productoId: 'SKU-2' },
    ])
    await expect(getProductThresholds()).resolves.toEqual({ 'SKU-1': 40000 })
  })

  it('acepta la clave del producto en sus tres formas', async () => {
    apiRequest.mockResolvedValue([
      umbral({ productoId: 'A', valor: '10' }),
      umbral({ producto_id: 'B', valor: '20' }),
      umbral({ sku: 'C', valor: '30' }),
    ])
    await expect(getProductThresholds()).resolves.toEqual({ A: 10, B: 20, C: 30 })
  })

  it('acepta la respuesta envuelta en {data}', async () => {
    apiRequest.mockResolvedValue({ data: [umbral({ productoId: 'SKU-1' })] })
    await expect(getProductThresholds()).resolves.toEqual({ 'SKU-1': 40000 })
  })

  it('deja copia local para que la vista abra sin esperar al backend', async () => {
    apiRequest.mockResolvedValue([umbral({ productoId: 'SKU-1' })])
    await getProductThresholds()
    expect(JSON.parse(localStorage.getItem('product_thresholds_7'))).toEqual({ 'SKU-1': 40000 })
  })

  it('usa la copia local de la empresa cuando el backend falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    localStorage.setItem('product_thresholds_7', JSON.stringify({ 'SKU-9': 500 }))
    await expect(getProductThresholds()).resolves.toEqual({ 'SKU-9': 500 })
  })

  it('devuelve un mapa vacio si no hay nada guardado en ningun lado', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getProductThresholds()).resolves.toEqual({})
  })

  it('no se rompe ante una copia local corrupta', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    localStorage.setItem('product_thresholds_7', '{{{roto')
    await expect(getProductThresholds()).resolves.toEqual({})
  })
})

describe('saveProductThresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockResolvedValue(null)
  })

  it('persiste una fila de configuracion por cada SKU', async () => {
    await saveProductThresholds({ 'SKU-1': 40000, 'SKU-2': 15000 })

    expect(apiRequest).toHaveBeenCalledTimes(2)
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/config', {
      method: 'POST',
      body: JSON.stringify({
        productoId: 'SKU-1',
        parametro: 'UMBRAL_DEMANDA_MAXIMA',
        valor: '40000',
      }),
    })
  })

  it('guarda la copia local antes de contactar al backend', async () => {
    await saveProductThresholds({ 'SKU-1': 40000 })
    expect(JSON.parse(localStorage.getItem('product_thresholds_7'))).toEqual({ 'SKU-1': 40000 })
  })

  it('no aborta el lote si falla el guardado de un SKU', async () => {
    // Se usa allSettled justamente para esto: un ID invalido no puede
    // impedir que se guarden los umbrales del resto del catalogo.
    apiRequest.mockRejectedValueOnce(new Error('400')).mockResolvedValue(null)

    await expect(
      saveProductThresholds({ 'SKU-1': 1, 'SKU-2': 2, 'SKU-3': 3 })
    ).resolves.toMatchObject({ success: true })
    expect(apiRequest).toHaveBeenCalledTimes(3)
  })
})

describe('getMLModels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const modelo = {
    id: 'm1',
    version: 'random_forest_2025_12',
    fechaEntrenamiento: '2026-09-09T18:30:45',
    rangoEntrenamiento: '2021-2024',
    mape: 15.66,
    mae: 209.22,
    rmse: 2509.1,
    activo: true,
  }

  it('consulta los modelos registrados de la empresa', async () => {
    apiRequest.mockResolvedValue([])
    await getMLModels()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/models')
  })

  it('formatea las metricas del modelo para la vista', async () => {
    apiRequest.mockResolvedValue([modelo])

    const [m] = await getMLModels()

    expect(m).toMatchObject({
      id: 'm1',
      version: 'random_forest_2025_12',
      date: '2026-09-09 18:30',
      dataRange: '2021-2024',
      mape: '15.66%',
      active: true,
    })
  })

  it('cae a la fecha de creacion cuando no hay fecha de entrenamiento', async () => {
    apiRequest.mockResolvedValue([
      { ...modelo, fechaEntrenamiento: null, fechaCreacion: '2026-08-01T10:15:00' },
    ])
    const [m] = await getMLModels()
    expect(m.date).toBe('2026-08-01 10:15')
  })

  it('deja las metricas en null cuando el modelo no las reporta', async () => {
    apiRequest.mockResolvedValue([{ id: 'm2', version: 'v', mape: null, mae: null, rmse: null }])
    const [m] = await getMLModels()
    expect(m.mape).toBeNull()
    expect(m.mae).toBeNull()
    expect(m.rmse).toBeNull()
  })

  it('marca como desalineado todo modelo con MAPE superior al 5%', async () => {
    // Umbral fijo del cliente. Se deja fijado porque el champion actual
    // (MAPE 15,66%) queda marcado como desalineado de forma permanente.
    apiRequest.mockResolvedValue([
      { ...modelo, id: 'alto', mape: 15.66 },
      { ...modelo, id: 'bajo', mape: 4.9 },
    ])

    const [alto, bajo] = await getMLModels()

    expect(alto.desalineado).toBe(true)
    expect(bajo.desalineado).toBe(false)
  })

  it('devuelve una lista vacia ante una respuesta vacia o un fallo', async () => {
    apiRequest.mockResolvedValue([])
    await expect(getMLModels()).resolves.toEqual([])

    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getMLModels()).resolves.toEqual([])
  })
})
