import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({ apiRequest: vi.fn() }))
vi.mock('./sales', () => ({ clearSalesFiltersCache: vi.fn() }))
vi.mock('./marketShare', () => ({ clearMarketShareCache: vi.fn() }))

import { login, logout } from './auth'
import { apiRequest } from './api'
import { clearSalesFiltersCache } from './sales'
import { clearMarketShareCache } from './marketShare'

const SESION = {
  token: 'jwt-abc',
  empresaId: '7',
  usuarioId: 'u-1',
  rol: 'ANALISTA',
}

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockResolvedValue(SESION)
  })

  it('envia las credenciales al endpoint de autenticacion', async () => {
    await login('felipe@uade.edu.ar', 'secreto')
    expect(apiRequest).toHaveBeenCalledWith('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'felipe@uade.edu.ar', password: 'secreto' }),
    })
  })

  it('persiste el token y los datos de sesion', async () => {
    await login('felipe@uade.edu.ar', 'secreto')

    expect(localStorage.getItem('token')).toBe('jwt-abc')
    expect(localStorage.getItem('userEmail')).toBe('felipe@uade.edu.ar')
    expect(localStorage.getItem('empresaId')).toBe('7')
    expect(localStorage.getItem('usuarioId')).toBe('u-1')
    expect(localStorage.getItem('rol')).toBe('ANALISTA')
  })

  it('guarda el nombre de la empresa cuando viene anidado', async () => {
    apiRequest.mockResolvedValue({ ...SESION, empresa: { id: '9', nombre: 'CCR Paraguay' } })

    await login('felipe@uade.edu.ar', 'secreto')

    expect(localStorage.getItem('empresaNombre')).toBe('CCR Paraguay')
    expect(localStorage.getItem('empresaId')).toBe('9')
  })

  it('no escribe nada en el almacenamiento si la respuesta no trae token', async () => {
    apiRequest.mockResolvedValue({ mensaje: 'credenciales invalidas' })
    await login('felipe@uade.edu.ar', 'mal')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('devuelve la respuesta del backend al llamador', async () => {
    await expect(login('a@b.c', 'x')).resolves.toEqual(SESION)
  })

  it('propaga el rechazo de credenciales para que el login lo muestre', async () => {
    apiRequest.mockRejectedValue(new Error('Credenciales invalidas'))
    await expect(login('a@b.c', 'mal')).rejects.toThrow('Credenciales invalidas')
  })
})

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockResolvedValue(null)
  })

  it('notifica el cierre de sesion al backend', async () => {
    await logout()
    expect(apiRequest).toHaveBeenCalledWith('/v1/auth/logout', { method: 'POST' })
  })

  it('vacia el almacenamiento de la sesion', async () => {
    localStorage.setItem('token', 'jwt-abc')
    localStorage.setItem('empresaId', '7')
    sessionStorage.setItem('algo', 'x')

    await logout()

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('empresaId')).toBeNull()
    expect(sessionStorage.getItem('algo')).toBeNull()
  })

  it('purga las caches de catalogo y de mercado', async () => {
    // Sin esto, al reingresar con otra empresa la interfaz seguia mostrando
    // los filtros y datos de la empresa anterior.
    await logout()
    expect(clearSalesFiltersCache).toHaveBeenCalled()
    expect(clearMarketShareCache).toHaveBeenCalled()
  })

  it('conserva los umbrales por SKU configurados localmente', async () => {
    localStorage.setItem('product_thresholds_7', '{"SKU-1":100}')
    localStorage.setItem('token', 'jwt-abc')

    await logout()

    expect(localStorage.getItem('product_thresholds_7')).toBe('{"SKU-1":100}')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('completa la limpieza local aunque el endpoint falle', async () => {
    // La sesion tiene que cerrarse igual: si el backend no responde, dejar el
    // token en el navegador seria peor que no avisarle.
    apiRequest.mockRejectedValue(new Error('sin conexion'))
    localStorage.setItem('token', 'jwt-abc')

    await logout()

    expect(localStorage.getItem('token')).toBeNull()
    expect(clearSalesFiltersCache).toHaveBeenCalled()
  })
})
