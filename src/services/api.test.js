import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAuthToken, getEmpresaId, apiRequest } from './api'

const fakeJwt = (payload) => {
  const b64url = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma-no-verificada`
}

const mockResponse = ({ ok = true, status = 200, statusText = 'OK', body = null }) => ({
  ok,
  status,
  statusText,
  json: async () => {
    if (body === null) throw new Error('not json')
    return body
  },
  text: async () => (body === null ? '' : JSON.stringify(body)),
})

describe('getAuthToken', () => {
  it('lee el token del almacenamiento local', () => {
    localStorage.setItem('token', 'abc123')
    expect(getAuthToken()).toBe('abc123')
  })

  it('devuelve null cuando no hay sesion', () => {
    expect(getAuthToken()).toBeNull()
  })
})

describe('getEmpresaId', () => {
  it('da prioridad al claim del JWT por sobre el valor guardado', () => {
    // Este es el caso que provoca TenantMismatchException (403) en Spring si
    // se resuelve al reves: el token manda, no el localStorage residual.
    localStorage.setItem('empresaId', '99')
    localStorage.setItem('token', fakeJwt({ empresaId: '7' }))
    expect(getEmpresaId()).toBe('7')
  })

  it('persiste el empresaId del token para las llamadas siguientes', () => {
    localStorage.setItem('token', fakeJwt({ empresaId: '7' }))
    getEmpresaId()
    expect(localStorage.getItem('empresaId')).toBe('7')
  })

  it('cae al empresaId guardado cuando no hay token', () => {
    localStorage.setItem('empresaId', '42')
    expect(getEmpresaId()).toBe('42')
  })

  it('cae al objeto de usuario cuando no hay token ni empresaId suelto', () => {
    localStorage.setItem('user', JSON.stringify({ empresaId: '13' }))
    expect(getEmpresaId()).toBe('13')
  })

  it('acepta tambien la forma anidada empresa.id del objeto de usuario', () => {
    localStorage.setItem('user', JSON.stringify({ empresa: { id: '21' } }))
    expect(getEmpresaId()).toBe('21')
  })

  it('no explota ante un token corrupto: degrada al fallback', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('token', 'esto.no-es-base64-valido.nada')
    localStorage.setItem('empresaId', '42')
    expect(getEmpresaId()).toBe('42')
  })

  it('no explota ante un objeto de usuario corrupto', () => {
    localStorage.setItem('user', '{{{no es json')
    expect(getEmpresaId()).toBe('1')
  })

  it('devuelve "1" cuando no hay ninguna fuente disponible', () => {
    expect(getEmpresaId()).toBe('1')
  })
})

describe('apiRequest', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', {
      pathname: '/dashboard',
      replace: vi.fn(),
    })
  })

  it('adjunta el bearer token cuando hay sesion activa', async () => {
    localStorage.setItem('token', 'abc123')
    fetchMock.mockResolvedValue(mockResponse({ body: { ok: true } }))

    await apiRequest('/v1/7/dashboard/kpis')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer abc123')
  })

  it('omite el header Authorization cuando no hay sesion', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: { ok: true } }))

    await apiRequest('/v1/7/dashboard/kpis')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('declara Content-Type JSON para un body comun', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: {} }))

    await apiRequest('/v1/7/forecast/simulate', {
      method: 'POST',
      body: JSON.stringify({ sku: 'X' }),
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('NO declara Content-Type con FormData, para no romper el boundary del multipart', async () => {
    // Si se fuerza application/json en la ingesta de ventas, el navegador no
    // agrega el boundary y el upload del .xlsx falla del lado de Spring.
    fetchMock.mockResolvedValue(mockResponse({ body: {} }))

    await apiRequest('/v1/7/ingestion/upload', {
      method: 'POST',
      body: new FormData(),
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBeUndefined()
  })

  it('devuelve el JSON parseado en una respuesta exitosa', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: { unidades: 120 } }))
    await expect(apiRequest('/v1/7/forecast')).resolves.toEqual({ unidades: 120 })
  })

  it('devuelve null ante un 204 sin contenido', async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 204, statusText: 'No Content' }))
    await expect(apiRequest('/v1/7/notificaciones/1/vista')).resolves.toBeNull()
  })

  it('devuelve null ante un 200 con cuerpo vacio', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
    })
    await expect(apiRequest('/v1/7/config')).resolves.toBeNull()
  })

  it('propaga el status en el error para que quien llama pueda discriminar', async () => {
    // feature-importance necesita distinguir un 502 ("el modelo todavia no
    // expone XAI") de un error de red generico.
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 502, statusText: 'Bad Gateway', body: {} })
    )

    await expect(apiRequest('/v1/7/forecast/feature-importance')).rejects.toMatchObject({
      status: 502,
    })
  })

  it('usa el mensaje del backend cuando viene en el cuerpo del error', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        body: { message: 'El archivo ya fue ingerido' },
      })
    )

    await expect(apiRequest('/v1/7/ingestion/upload')).rejects.toThrow(
      'El archivo ya fue ingerido'
    )
  })

  it('cae a un mensaje generico si el cuerpo del error no es JSON', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' })
    )

    await expect(apiRequest('/v1/7/dashboard/kpis')).rejects.toThrow(/500/)
  })

  it('ante un 401 limpia la sesion y redirige al login', async () => {
    localStorage.setItem('token', 'expirado')
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 401, statusText: 'Unauthorized', body: {} })
    )

    await expect(apiRequest('/v1/7/dashboard/kpis')).rejects.toThrow()

    expect(localStorage.getItem('token')).toBeNull()
    expect(location.replace).toHaveBeenCalledWith('/login?expired=1')
  })

  it('ante un 401 del propio login NO redirige, para no tapar el mensaje de credenciales invalidas', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 401, statusText: 'Unauthorized', body: {} })
    )

    await expect(apiRequest('/v1/auth/login', { method: 'POST' })).rejects.toThrow()

    expect(location.replace).not.toHaveBeenCalled()
  })

  it('ante un 401 estando ya en /login no vuelve a redirigir', async () => {
    vi.stubGlobal('location', { pathname: '/login', replace: vi.fn() })
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 401, statusText: 'Unauthorized', body: {} })
    )

    await expect(apiRequest('/v1/7/dashboard/kpis')).rejects.toThrow()

    expect(location.replace).not.toHaveBeenCalled()
  })
})
