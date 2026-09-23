import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../../services/forecast', () => ({
  getFeatureImportance: vi.fn(),
}))

import { useFeatureImportance } from './useFeatureImportance'
import { getFeatureImportance } from '../../../services/forecast'

const XAI = {
  modeloTipo: 'RandomForestRegressor',
  totalVariables: 2,
  resumenPorGrupo: [{ grupo: 'Historial y Tendencia', pct: 62.5 }],
  variables: [{ feature: 'lag_1', nombre: 'Mes anterior', grupo: 'Historial', pct: 62.5 }],
}

describe('useFeatureImportance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('consulta la explicabilidad al montarse', async () => {
    getFeatureImportance.mockResolvedValue(XAI)

    const { result } = renderHook(() => useFeatureImportance())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getFeatureImportance).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(XAI)
    expect(result.current.error).toBeNull()
  })

  it('arranca en estado de carga', () => {
    getFeatureImportance.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeatureImportance())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('expone el error y deja los datos en nulo cuando el motor no responde', async () => {
    const err = new Error('Bad Gateway')
    err.status = 502
    getFeatureImportance.mockRejectedValue(err)

    const { result } = renderHook(() => useFeatureImportance())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toMatchObject({ status: 502 })
  })

  it('consulta una sola vez, no en cada render', async () => {
    // La vista necesita el `modeloTipo` para rotular la leyenda, de modo que
    // el gancho se monta junto con el grafico y no al abrir el modal.
    getFeatureImportance.mockResolvedValue(XAI)

    const { result, rerender } = renderHook(() => useFeatureImportance())
    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender()
    rerender()

    expect(getFeatureImportance).toHaveBeenCalledTimes(1)
  })

  it('permite reintentar tras un fallo', async () => {
    // Es el caso real: tras reiniciar el motor de ML, el primer intento da 502
    // y el reintento posterior ya trae los datos.
    const err = new Error('Bad Gateway')
    err.status = 502
    getFeatureImportance.mockRejectedValueOnce(err).mockResolvedValue(XAI)

    const { result } = renderHook(() => useFeatureImportance())
    await waitFor(() => expect(result.current.error).not.toBeNull())

    await act(async () => { await result.current.reload() })

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(XAI)
  })
})
