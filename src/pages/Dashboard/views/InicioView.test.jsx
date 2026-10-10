import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { isValidElement, cloneElement, Fragment } from 'react'

const renderInjected = (element, extraProps) =>
  isValidElement(element) ? cloneElement(element, extraProps) : null

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Nada = () => null
  return {
    ResponsiveContainer: Passthrough,
    AreaChart: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    Area: ({ activeDot }) => {
      if (typeof activeDot === 'function') {
        activeDot({ cx: 5, cy: 5, payload: { month: 'Dic 25' } })
        activeDot({ cx: 5, cy: 5, payload: { month: 'Otro mes' } })
      }
      return null
    },
    Cell: Nada,
    XAxis: Nada,
    YAxis: ({ tickFormatter }) => {
      if (typeof tickFormatter === 'function') {
        tickFormatter(0)
        tickFormatter(2_500_000_000)
        tickFormatter(5_000_000)
        tickFormatter(500)
      }
      return null
    },
    CartesianGrid: Nada,
    Tooltip: ({ content, cursor }) => (
      <Fragment>
        {renderInjected(content, { active: false })}
        {renderInjected(content, { active: true, payload: [] })}
        {renderInjected(content, {
          active: true,
          label: 'Ene 26',
          payload: [
            { dataKey: 'historical', name: 'Ventas Históricas', value: 1000, color: '#0ea5e9', payload: { historicalUnits: 100 } },
            { dataKey: 'forecast', name: 'Demanda Proyectada', value: 1100, color: '#818cf8', payload: { historical: 1000 } },
          ],
        })}
        {renderInjected(content, {
          active: true,
          label: 'Dic 25',
          payload: [
            { dataKey: 'forecast', name: 'Demanda Proyectada', value: 1100, color: '#818cf8', payload: { historical: 1000 } },
          ],
        })}
        {renderInjected(cursor, { x: 10, y: 20, height: 30 })}
        {renderInjected(cursor, { points: [{ x: 1, y: 2 }, { x: 1, y: 10 }] })}
        {renderInjected(cursor, { x1: 5, y1: 6, x2: 5, y2: 16 })}
      </Fragment>
    ),
    ReferenceLine: ({ label }) => renderInjected(label, { x: 50, y: 50 }),
    ReferenceDot: Nada,
  }
})

import InicioView from './InicioView'

const KPIS = {
  sales: { value: 1250000, label: 'Ventas del Mes', trend: 12.5 },
  margin: { value: 32.5, label: 'Share of Assortment (SOA)', trend: 2.5 },
  priceGap: { value: -4.2, label: 'Price Gap vs Promedio (%)', trend: -1.1 },
  accuracy: { value: 84.3, label: 'Precisión del Modelo', trend: null },
}

const CONTEXTO = {
  inflation: { value: 4.2, label: 'Inflación Interanual (%)' },
  exchangeRate: { value: 7300, label: 'Tipo de Cambio (USD)' },
  seasonality: { value: 'Alta', label: 'Estacionalidad' },
}

const VENTAS = [
  { month: 'Nov 25', historical: 900, historicalUnits: 90, forecast: null },
  { month: 'Dic 25', historical: 1000, historicalUnits: 100, forecast: null },
  { month: 'Ene 26', historical: null, forecast: 1100 },
]

const renderVista = (props = {}) =>
  render(
    <InicioView
      kpis={KPIS}
      salesData={VENTAS}
      marketShare={[{ name: 'Nuestra Empresa', value: 30, fill: '#38bdf8' }]}
      contextVars={CONTEXTO}
      formatCurrency={(v) => `₲ ${Number(v).toLocaleString('es-PY')}`}
      setActiveTab={vi.fn()}
      {...props}
    />
  )

describe('InicioView', () => {
  describe('indicadores del mes', () => {
    it('rotula cada indicador con la etiqueta que define el servicio', () => {
      renderVista()
      expect(screen.getByText('Ventas del Mes')).toBeInTheDocument()
      expect(screen.getByText('Share of Assortment (SOA)')).toBeInTheDocument()
      expect(screen.getByText('Price Gap vs Promedio (%)')).toBeInTheDocument()
      expect(screen.getByText('Precisión del Modelo')).toBeInTheDocument()
    })

    it('formatea el monto de ventas con la funcion recibida', () => {
      renderVista()
      const tarjeta = screen.getByText('Ventas del Mes').closest('.kpi-card')
      expect(tarjeta).toHaveTextContent('₲ 1.250.000')
    })

    it('antepone el signo a una tendencia positiva', () => {
      renderVista()
      expect(screen.getByText('+12.5% vs mes anterior')).toBeInTheDocument()
    })

    it('muestra la tendencia negativa tal cual', () => {
      renderVista({
        kpis: { ...KPIS, sales: { ...KPIS.sales, trend: -8.3 } },
      })
      expect(screen.getByText('-8.3% vs mes anterior')).toBeInTheDocument()
    })

    it('omite la comparacion cuando no hay mes previo cargado', () => {
      renderVista({ kpis: { ...KPIS, sales: { ...KPIS.sales, trend: null } } })
      const tarjeta = screen.getByText('Ventas del Mes').closest('.kpi-card')
      expect(tarjeta).not.toHaveTextContent('vs mes anterior')
    })
  })

  describe('lectura del price gap', () => {
    it('califica de competitivo un precio por debajo del promedio', () => {
      // Un gap negativo significa vender mas barato que la categoria: es una
      // ventaja, no una alerta, aunque el numero sea negativo.
      renderVista({
        kpis: { ...KPIS, priceGap: { value: -4.2, label: 'Price Gap', trend: null } },
      })
      expect(screen.getByText('Competitivo')).toBeInTheDocument()
    })

    it('advierte cuando el precio queda por encima del promedio', () => {
      renderVista({
        kpis: { ...KPIS, priceGap: { value: 6.1, label: 'Price Gap', trend: null } },
      })
      expect(screen.getByText('Por encima')).toBeInTheDocument()
    })
  })

  describe('precision del modelo', () => {
    it('muestra el porcentaje cuando la precision es utilizable', () => {
      renderVista()
      expect(screen.getByText('84.3%')).toBeInTheDocument()
    })

    it('evita exhibir un porcentaje negativo crudo y habla de calibracion', () => {
      // Con MAPE elevado, 100-MAPE da negativo. Mostrar "-877%" al gerente no
      // comunica nada; la etiqueta cualitativa si.
      renderVista({
        kpis: { ...KPIS, accuracy: { value: -877.3, label: 'Precisión del Modelo', trend: null } },
      })
      expect(screen.getByText('En Calibración')).toBeInTheDocument()
    })

    it('indica ausencia de dato cuando no hay modelo entrenado', () => {
      renderVista({
        kpis: { ...KPIS, accuracy: { value: null, label: 'Precisión del Modelo', trend: null } },
      })
      expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('califica de moderada una precision intermedia', () => {
      renderVista({
        kpis: { ...KPIS, accuracy: { value: 55, label: 'Precisión del Modelo', trend: null } },
      })
      expect(screen.getByText('55%')).toBeInTheDocument()
      expect(screen.getByText('Precisión Moderada')).toBeInTheDocument()
    })
  })

  describe('navegacion desde los indicadores', () => {
    it('lleva a ventas al pulsar el indicador de facturacion', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Ventas del Mes').closest('.kpi-card'))

      expect(setActiveTab).toHaveBeenCalledWith('sales')
    })

    it('lleva a mercado al pulsar el indicador de cuota', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Share of Assortment (SOA)').closest('.kpi-card'))

      expect(setActiveTab).toHaveBeenCalledWith('market')
    })

    it('lleva a la informacion del sistema al pulsar la precision', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Precisión del Modelo').closest('.kpi-card'))

      expect(setActiveTab).toHaveBeenCalledWith('settings-info')
    })

    it('lleva a mercado al pulsar el indicador de price gap', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Price Gap vs Promedio (%)').closest('.kpi-card'))

      expect(setActiveTab).toHaveBeenCalledWith('market')
    })

    it('lleva a forecast al pulsar el grafico de evolucion de ventas', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Evolución de Ventas').closest('.chart-card'))

      expect(setActiveTab).toHaveBeenCalledWith('forecast')
    })

    it('lleva a mercado al pulsar el grafico de composicion de market share', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Composición Market Share').closest('.chart-card'))

      expect(setActiveTab).toHaveBeenCalledWith('market')
    })

    it('lleva a ingestion al pulsar "Ver Historial"', () => {
      const setActiveTab = vi.fn()
      renderVista({ setActiveTab })

      fireEvent.click(screen.getByText('Ver Historial'))

      expect(setActiveTab).toHaveBeenCalledWith('ingestion')
    })
  })

  describe('variables de contexto', () => {
    it('expone las variables exogenas del periodo', () => {
      renderVista()
      expect(screen.getByText('Inflación Interanual (%)')).toBeInTheDocument()
      expect(screen.getByText('Tipo de Cambio (USD)')).toBeInTheDocument()
      expect(screen.getByText('Alta')).toBeInTheDocument()
    })

    it('no se rompe cuando el contexto macro no esta cargado', () => {
      renderVista({
        contextVars: {
          inflation: { value: null, label: 'Inflación Interanual (%)' },
          exchangeRate: { value: null, label: 'Tipo de Cambio (USD)' },
          seasonality: { value: 'Sin datos', label: 'Estacionalidad' },
        },
      })
      expect(screen.getByText('Sin datos')).toBeInTheDocument()
    })
  })

  describe('serie de ventas', () => {
    it('se monta sin datos de ventas cargados', () => {
      renderVista({ salesData: [] })
      expect(screen.getByText('Ventas del Mes')).toBeInTheDocument()
    })
  })

  describe('carga inicial', () => {
    it('no renderiza nada mientras los kpis no llegaron', () => {
      const { container } = renderVista({ kpis: null })
      expect(container).toBeEmptyDOMElement()
    })

    it('no renderiza nada mientras las variables de contexto no llegaron', () => {
      const { container } = renderVista({ contextVars: null })
      expect(container).toBeEmptyDOMElement()
    })
  })
})
