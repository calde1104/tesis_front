import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../services/settings', () => ({
  getSystemInfo: vi.fn(),
  getMLModels: vi.fn(),
}))
vi.mock('../../../services/dashboard', () => ({ getSalesEvolution: vi.fn() }))

import SettingsInfoView from './SettingsInfoView'
import { getSystemInfo, getMLModels } from '../../../services/settings'
import { getSalesEvolution } from '../../../services/dashboard'

const MODELOS = [
  { id: 'm0', version: 'baseline_linear', mape: '927.35%', active: false },
  {
    id: 'm1',
    version: 'random_forest_2025_12',
    mape: '15.66%',
    mae: '209',
    rmse: '2.509',
    dataRange: '2021-2024',
    date: '2026-09-09 18:30',
    active: true,
  },
]

const EVOLUCION = [
  { month: 'Ene 21', historical: 100, forecast: null },
  { month: 'Dic 25', historical: 900, forecast: null },
  { month: 'Ene 26', historical: null, forecast: 1000 },
]

describe('SettingsInfoView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getSystemInfo.mockResolvedValue({ dbStatus: 'ONLINE' })
    getMLModels.mockResolvedValue(MODELOS)
    getSalesEvolution.mockResolvedValue(EVOLUCION)
  })

  describe('modelo activo', () => {
    it('consulta sistema, modelos y evolucion al montarse', async () => {
      render(<SettingsInfoView />)
      await waitFor(() => expect(getMLModels).toHaveBeenCalled())
      expect(getSystemInfo).toHaveBeenCalled()
      expect(getSalesEvolution).toHaveBeenCalled()
    })

    it('expone la version del modelo marcado como activo, no la primera', async () => {
      // Conviven varias versiones entrenadas; la pantalla debe reflejar la
      // que efectivamente esta sirviendo predicciones.
      render(<SettingsInfoView />)
      expect(await screen.findByText(/random_forest_2025_12/)).toBeInTheDocument()
    })

    it('muestra las metricas de error del modelo activo', async () => {
      render(<SettingsInfoView />)
      expect(await screen.findByText('15.66%')).toBeInTheDocument()
    })

    it('recurre al primer modelo cuando ninguno figura como activo', async () => {
      getMLModels.mockResolvedValue([
        { id: 'm0', version: 'baseline_linear', mape: '927.35%', active: false },
      ])
      render(<SettingsInfoView />)
      expect(await screen.findByText(/baseline_linear/)).toBeInTheDocument()
    })
  })

  describe('rango historico', () => {
    it('prioriza el rango declarado por el propio modelo', async () => {
      render(<SettingsInfoView />)
      expect(await screen.findByText('2021-2024')).toBeInTheDocument()
    })

    it('deriva el rango de los puntos historicos cuando el modelo no lo declara', async () => {
      const { dataRange, ...sinRango } = MODELOS[1]
      getMLModels.mockResolvedValue([sinRango])

      render(<SettingsInfoView />)

      expect(await screen.findByText('Ene 21 a Dic 25')).toBeInTheDocument()
    })

    it('informa la ausencia de rango cuando no hay ventas ni rango declarado', async () => {
      const { dataRange, ...sinRango } = MODELOS[1]
      getMLModels.mockResolvedValue([sinRango])
      getSalesEvolution.mockResolvedValue([])

      render(<SettingsInfoView />)

      expect(await screen.findByText('No disponible')).toBeInTheDocument()
    })

    it('tolera un fallo en la consulta de evolucion', async () => {
      getSalesEvolution.mockRejectedValue(new Error('500'))
      render(<SettingsInfoView />)
      await waitFor(() => expect(getMLModels).toHaveBeenCalled())
      expect(await screen.findByText(/random_forest_2025_12/)).toBeInTheDocument()
    })
  })

  describe('comprobacion manual de conexion', () => {
    it('vuelve a consultar el estado al pedirlo', async () => {
      render(<SettingsInfoView />)
      await screen.findByText(/random_forest_2025_12/)

      fireEvent.click(screen.getByText(/comprobar conexión/i))

      await waitFor(() => expect(getSystemInfo).toHaveBeenCalledTimes(2))
    })

    it('informa el progreso durante la verificacion', async () => {
      render(<SettingsInfoView />)
      await screen.findByText(/random_forest_2025_12/)

      getSystemInfo.mockReturnValue(new Promise(() => {}))
      fireEvent.click(screen.getByText(/comprobar conexión/i))

      expect(await screen.findByText(/verificando/i)).toBeInTheDocument()
    })
  })

  describe('degradacion', () => {
    it('se monta aunque no haya ningun modelo registrado', async () => {
      getMLModels.mockResolvedValue([])
      getSystemInfo.mockResolvedValue(null)
      render(<SettingsInfoView />)
      expect(await screen.findByText(/comprobar conexión/i)).toBeInTheDocument()
    })
  })
})
