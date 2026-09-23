import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

import {
  getNotificaciones,
  marcarNotificacionVista,
  marcarNotificacionResuelta,
} from './notificaciones'
import { apiRequest } from './api'

const VACIO = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

describe('getNotificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('pide la primera pagina ordenada por fecha descendente', async () => {
    apiRequest.mockResolvedValue(VACIO)
    await getNotificaciones()
    expect(apiRequest).toHaveBeenCalledWith(
      '/v1/7/notificaciones?page=0&size=20&sort=fechaGeneracion,desc'
    )
  })

  it('respeta la paginacion solicitada', async () => {
    apiRequest.mockResolvedValue(VACIO)
    await getNotificaciones(2, 50)
    expect(apiRequest).toHaveBeenCalledWith(
      '/v1/7/notificaciones?page=2&size=50&sort=fechaGeneracion,desc'
    )
  })

  it('devuelve la pagina tal como la entrega el backend', async () => {
    const pagina = { content: [{ id: 'n1' }], totalElements: 1, totalPages: 1, page: 0, size: 20 }
    apiRequest.mockResolvedValue(pagina)
    await expect(getNotificaciones()).resolves.toEqual(pagina)
  })

  it('devuelve una pagina vacia ante una respuesta nula', async () => {
    apiRequest.mockResolvedValue(null)
    await expect(getNotificaciones()).resolves.toEqual(VACIO)
  })

  it('devuelve una pagina vacia si la consulta falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getNotificaciones()).resolves.toEqual(VACIO)
  })
})

describe('marcarNotificacionVista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('marca la alerta mediante PATCH sobre su identificador', async () => {
    apiRequest.mockResolvedValue({ id: 'n1', estado: 'VISTA' })
    await marcarNotificacionVista('n1')
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/notificaciones/n1/vista', { method: 'PATCH' })
  })

  it('devuelve la notificacion actualizada', async () => {
    apiRequest.mockResolvedValue({ id: 'n1', estado: 'VISTA' })
    await expect(marcarNotificacionVista('n1')).resolves.toEqual({ id: 'n1', estado: 'VISTA' })
  })

  it('no llama al backend sin identificador', async () => {
    await expect(marcarNotificacionVista(undefined)).resolves.toBeNull()
    await expect(marcarNotificacionVista('')).resolves.toBeNull()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('devuelve null si el backend falla, sin interrumpir la navegacion', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(marcarNotificacionVista('n1')).resolves.toBeNull()
  })
})

describe('marcarNotificacionResuelta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('resuelve la alerta mediante PATCH sobre su identificador', async () => {
    apiRequest.mockResolvedValue({ id: 'n1', estado: 'RESUELTA' })
    await marcarNotificacionResuelta('n1')
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/notificaciones/n1/resuelta', {
      method: 'PATCH',
    })
  })

  it('no llama al backend sin identificador', async () => {
    await expect(marcarNotificacionResuelta(null)).resolves.toBeNull()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('devuelve null si el backend falla', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(marcarNotificacionResuelta('n1')).resolves.toBeNull()
  })
})
