import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('../../services/auth', () => ({ login: vi.fn() }))

import Login from './Login'
import { login } from '../../services/auth'

const stubCanvas = () => {
  const noop = () => {}
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({}, { get: () => noop })
  )
}

const escribirCorreo = (valor) =>
  fireEvent.change(screen.getByPlaceholderText('nombre@empresa.com'), {
    target: { value: valor },
  })

const escribirClave = (valor) =>
  fireEvent.change(screen.getByPlaceholderText('••••••••••••'), { target: { value: valor } })

const aceptarTerminos = () => fireEvent.click(document.querySelector('.form-checkbox'))

const enviar = () => fireEvent.submit(document.querySelector('form.login-form'))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    stubCanvas()
    vi.stubGlobal('location', { search: '', pathname: '/login' })
    login.mockResolvedValue({ token: 'jwt-abc' })
  })

  describe('sesion expirada', () => {
    it('avisa cuando se llega con la sesion vencida', () => {
      vi.stubGlobal('location', { search: '?expired=1', pathname: '/login' })

      render(<Login />)

      expect(screen.getByText(/sesion expiro/i)).toBeInTheDocument()
    })

    it('no muestra aviso en un ingreso normal', () => {
      render(<Login />)
      expect(screen.queryByText(/sesion expiro/i)).not.toBeInTheDocument()
    })
  })

  describe('validaciones previas', () => {
    it('exige un correo valido antes de contactar al backend', () => {
      render(<Login />)

      enviar()

      expect(screen.getByText(/correo electrónico válido/i)).toBeInTheDocument()
      expect(login).not.toHaveBeenCalled()
    })

    it('rechaza un correo compuesto solo por caracteres peligrosos', () => {
      // El saneamiento los elimina y deja la cadena vacia, de modo que la
      // validacion los trata como correo ausente.
      render(<Login />)

      escribirCorreo('<>"\'')
      enviar()

      expect(screen.getByText(/correo electrónico válido/i)).toBeInTheDocument()
      expect(login).not.toHaveBeenCalled()
    })

    it('exige la aceptacion de terminos y politicas', () => {
      render(<Login />)

      escribirCorreo('felipe@uade.edu.ar')
      enviar()

      expect(screen.getByText(/aceptar los términos/i)).toBeInTheDocument()
      expect(login).not.toHaveBeenCalled()
    })
  })

  describe('ingreso', () => {
    it('envia las credenciales con el correo ya saneado', async () => {
      render(<Login />)

      escribirCorreo('  felipe@uade.edu.ar  ')
      escribirClave('secreto')
      aceptarTerminos()
      enviar()

      await waitFor(() =>
        expect(login).toHaveBeenCalledWith('felipe@uade.edu.ar', 'secreto')
      )
    })

    it('lleva al tablero tras un ingreso exitoso', async () => {
      render(<Login />)

      escribirCorreo('felipe@uade.edu.ar')
      escribirClave('secreto')
      aceptarTerminos()
      enviar()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
    })

    it('informa el progreso y bloquea el boton durante el intento', async () => {
      let resolver
      login.mockReturnValue(new Promise((r) => { resolver = r }))

      render(<Login />)
      escribirCorreo('felipe@uade.edu.ar')
      escribirClave('secreto')
      aceptarTerminos()
      enviar()

      const boton = await screen.findByRole('button', { name: /iniciando sesión/i })
      expect(boton).toBeDisabled()

      resolver({ token: 'jwt-abc' })
      await waitFor(() => expect(navigate).toHaveBeenCalled())
    })

    it('muestra el motivo del rechazo del backend', async () => {
      login.mockRejectedValue(new Error('Credenciales invalidas'))

      render(<Login />)
      escribirCorreo('felipe@uade.edu.ar')
      escribirClave('mal')
      aceptarTerminos()
      enviar()

      expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument()
      expect(navigate).not.toHaveBeenCalled()
    })

    it('rehabilita el formulario tras un fallo para permitir reintentar', async () => {
      login.mockRejectedValue(new Error('500'))

      render(<Login />)
      escribirCorreo('felipe@uade.edu.ar')
      escribirClave('x')
      aceptarTerminos()
      enviar()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /ingresar a la plataforma/i })).toBeEnabled()
      )
    })
  })

  describe('visibilidad de la clave', () => {
    it('oculta la clave por defecto y permite revelarla', () => {
      render(<Login />)
      const campo = screen.getByPlaceholderText('••••••••••••')

      expect(campo).toHaveAttribute('type', 'password')

      fireEvent.click(document.querySelector('.toggle-password') || campo.parentElement.querySelector('button'))

      expect(campo).toHaveAttribute('type', 'text')
    })
  })
})
