import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getEmpresaId: vi.fn(() => '7'),
}))

vi.mock('./sales', () => ({
  getDeptId: vi.fn(),
  getCategoryId: vi.fn(),
  getBrandId: vi.fn(),
}))

import { predictColdStart } from './coldStart'
import { apiRequest } from './api'
import { getDeptId, getCategoryId, getBrandId } from './sales'

const productoValido = {
  idDepartamento: 3,
  idCategoria: 12,
  idMarca: 'marca-uuid-001',
  descripcion: 'Gaseosa Cola 2L',
  contenidoNeto: 2,
  unidadMedida: 'lt',
  valorUnitario: 8500,
}

const payloadEnviado = () => JSON.parse(apiRequest.mock.calls[0][1].body)

describe('predictColdStart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockResolvedValue({ predicciones: [] })
  })

  describe('construccion de la peticion', () => {
    it('apunta al endpoint multi-tenant con el empresaId de la sesion', async () => {
      await predictColdStart(productoValido)
      expect(apiRequest).toHaveBeenCalledWith(
        '/v1/7/cold-start/predict',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('serializa el payload en snake_case, que es el contrato de FastAPI', async () => {
      await predictColdStart(productoValido)
      expect(payloadEnviado()).toEqual({
        id_departamento: 3,
        id_categoria: 12,
        id_marca: 'marca-uuid-001',
        descripcion: 'Gaseosa Cola 2L',
        contenido_neto: 2,
        unidad_medida: 'lt',
        valor_unitario: 8500,
        horizonte_meses: 12,
      })
    })

    it('devuelve la respuesta del backend sin alterarla', async () => {
      apiRequest.mockResolvedValue({ predicciones: [{ mes: 1, unidades: 340 }] })
      await expect(predictColdStart(productoValido)).resolves.toEqual({
        predicciones: [{ mes: 1, unidades: 340 }],
      })
    })

    it('usa un horizonte de 12 meses por defecto', async () => {
      await predictColdStart(productoValido)
      expect(payloadEnviado().horizonte_meses).toBe(12)
    })

    it('respeta un horizonte explicito', async () => {
      await predictColdStart({ ...productoValido, horizonteMeses: 6 })
      expect(payloadEnviado().horizonte_meses).toBe(6)
    })
  })

  describe('resolucion de identificadores', () => {
    it('traduce nombres a IDs cuando no se pasan los IDs', async () => {
      getDeptId.mockReturnValue(3)
      getCategoryId.mockReturnValue(12)
      getBrandId.mockReturnValue('marca-uuid-001')

      await predictColdStart({
        department: 'Bebidas',
        category: 'Gaseosas',
        brand: 'Coca Cola',
        name: 'Gaseosa Cola 2L',
        weight: 2,
        expectedPrice: 8500,
      })

      expect(getDeptId).toHaveBeenCalledWith('Bebidas')
      expect(payloadEnviado()).toMatchObject({
        id_departamento: 3,
        id_categoria: 12,
        id_marca: 'marca-uuid-001',
      })
    })

    it('da prioridad al ID explicito por sobre el nombre', async () => {
      getDeptId.mockReturnValue(99)
      await predictColdStart({ ...productoValido, department: 'Bebidas' })
      expect(getDeptId).not.toHaveBeenCalled()
      expect(payloadEnviado().id_departamento).toBe(3)
    })

    it('acepta tambien los alias snake_case de los IDs', async () => {
      await predictColdStart({
        id_departamento: 4,
        id_categoria: 15,
        id_marca: 'marca-uuid-002',
        descripcion: 'Agua 1L',
        contenidoNeto: 1,
        valorUnitario: 3000,
      })
      expect(payloadEnviado()).toMatchObject({
        id_departamento: 4,
        id_categoria: 15,
        id_marca: 'marca-uuid-002',
      })
    })

    it('usa el nombre de marca como identificador si el catalogo no lo resuelve', async () => {
      // Marca nueva todavia no presente en el mapa local: se manda el nombre
      // crudo y el backend decide, en vez de cortar el flujo de pre-lanzamiento.
      getBrandId.mockReturnValue(null)
      await predictColdStart({ ...productoValido, idMarca: undefined, brand: 'Marca Nueva' })
      expect(payloadEnviado().id_marca).toBe('Marca Nueva')
    })
  })

  describe('normalizacion de unidades de medida', () => {
    it('expande la abreviatura "l" a "lt"', async () => {
      await predictColdStart({ ...productoValido, unidadMedida: 'l' })
      expect(payloadEnviado().unidad_medida).toBe('lt')
    })

    it('expande la abreviatura "g" a "gr"', async () => {
      await predictColdStart({ ...productoValido, unidadMedida: 'g' })
      expect(payloadEnviado().unidad_medida).toBe('gr')
    })

    it('normaliza a minusculas', async () => {
      await predictColdStart({ ...productoValido, unidadMedida: 'ML' })
      expect(payloadEnviado().unidad_medida).toBe('ml')
    })

    it('usa "lt" como unidad por defecto', async () => {
      const sinUnidad = { ...productoValido }
      delete sinUnidad.unidadMedida
      await predictColdStart(sinUnidad)
      expect(payloadEnviado().unidad_medida).toBe('lt')
    })
  })

  describe('validaciones previas al envio', () => {
    it('rechaza un departamento ausente o no numerico', async () => {
      getDeptId.mockReturnValue(null)
      await expect(
        predictColdStart({ ...productoValido, idDepartamento: undefined })
      ).rejects.toThrow(/departamento/i)
    })

    it('rechaza un departamento no positivo', async () => {
      await expect(
        predictColdStart({ ...productoValido, idDepartamento: 0 })
      ).rejects.toThrow(/departamento/i)
    })

    it('rechaza una categoria invalida', async () => {
      getCategoryId.mockReturnValue(null)
      await expect(
        predictColdStart({ ...productoValido, idCategoria: undefined })
      ).rejects.toThrow(/categor/i)
    })

    it('rechaza la ausencia de marca', async () => {
      await expect(
        predictColdStart({ ...productoValido, idMarca: '   ' })
      ).rejects.toThrow(/marca/i)
    })

    it('rechaza una descripcion en blanco', async () => {
      await expect(
        predictColdStart({ ...productoValido, descripcion: '   ' })
      ).rejects.toThrow(/descripci/i)
    })

    it('rechaza un contenido neto no positivo', async () => {
      await expect(
        predictColdStart({ ...productoValido, contenidoNeto: 0 })
      ).rejects.toThrow(/contenido neto/i)
    })

    it('rechaza un contenido neto no numerico', async () => {
      await expect(
        predictColdStart({ ...productoValido, contenidoNeto: 'dos litros' })
      ).rejects.toThrow(/contenido neto/i)
    })

    it('rechaza un precio sugerido no positivo', async () => {
      await expect(
        predictColdStart({ ...productoValido, valorUnitario: 0 })
      ).rejects.toThrow(/precio/i)
    })

    it('no llega a golpear la API cuando la validacion falla', async () => {
      await expect(
        predictColdStart({ ...productoValido, valorUnitario: -1 })
      ).rejects.toThrow()
      expect(apiRequest).not.toHaveBeenCalled()
    })
  })
})
