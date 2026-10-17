import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
  getAuthToken: vi.fn(() => 'jwt-abc'),
}))

import { getProfile, uploadProfilePhoto, deleteProfilePhoto, deleteAccount } from './profile'
import { apiRequest } from './api'

const foto = () => new File(['binario'], 'perfil.png', { type: 'image/png' })

describe('getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('consulta el perfil del usuario de la empresa activa', async () => {
    apiRequest.mockResolvedValue({ nombre: 'Felipe' })
    await getProfile()
    expect(apiRequest).toHaveBeenCalledWith('/v1/7/profile')
  })

  it('devuelve los datos del perfil', async () => {
    apiRequest.mockResolvedValue({ nombre: 'Felipe' })
    await expect(getProfile()).resolves.toEqual({ nombre: 'Felipe' })
  })

  it('devuelve null si la consulta falla, sin tumbar el encabezado', async () => {
    apiRequest.mockRejectedValue(new Error('500'))
    await expect(getProfile()).resolves.toBeNull()
  })
})

describe('uploadProfilePhoto', () => {
  let fetchMock

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('envia la imagen por PUT con el token de sesion', async () => {
    // Esta funcion no usa apiRequest: arma la peticion a mano para poder
    // mandar el multipart, de modo que el header va explicito.
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '/fotos/1.png' }) })

    await uploadProfilePhoto(foto())

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/v1/7/profile/foto')
    expect(options.method).toBe('PUT')
    expect(options.headers.Authorization).toBe('Bearer jwt-abc')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBeInstanceOf(File)
  })

  it('devuelve los datos de la imagen almacenada', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '/fotos/1.png' }) })
    await expect(uploadProfilePhoto(foto())).resolves.toEqual({ url: '/fotos/1.png' })
  })

  it('propaga el detalle del rechazo del backend', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Formato de imagen no admitido' }),
    })

    await expect(uploadProfilePhoto(foto())).rejects.toEqual({
      message: 'Formato de imagen no admitido',
    })
  })
})

describe('deleteProfilePhoto', () => {
  let fetchMock

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('elimina la imagen por DELETE con el token de sesion', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    await deleteProfilePhoto()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/v1/7/profile/foto')
    expect(options.method).toBe('DELETE')
    expect(options.headers.Authorization).toBe('Bearer jwt-abc')
  })

  it('confirma la eliminacion', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await expect(deleteProfilePhoto()).resolves.toBe(true)
  })

  it('falla de forma explicita si el backend rechaza la baja', async () => {
    fetchMock.mockResolvedValue({ ok: false })
    await expect(deleteProfilePhoto()).rejects.toThrow(/failed to delete/i)
  })
})

describe('deleteAccount', () => {
  let fetchMock

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('da de baja la cuenta por DELETE con el token de sesion', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    await deleteAccount()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/v1/7/profile')
    expect(options.method).toBe('DELETE')
    expect(options.headers.Authorization).toBe('Bearer jwt-abc')
  })

  it('confirma la baja', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await expect(deleteAccount()).resolves.toBe(true)
  })

  it('falla de forma explicita si el backend rechaza la baja', async () => {
    fetchMock.mockResolvedValue({ ok: false })
    await expect(deleteAccount()).rejects.toThrow(/failed to delete/i)
  })
})
