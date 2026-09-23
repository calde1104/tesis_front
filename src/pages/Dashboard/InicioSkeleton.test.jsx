import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import InicioSkeleton from './InicioSkeleton'

describe('InicioSkeleton', () => {
  it('reproduce la grilla de la vista de inicio para evitar saltos de layout', () => {
    // Cuando llegan los datos reales, InicioView ocupa exactamente estos
    // huecos: si el esqueleto no los replica, el contenido salta de lugar.
    const { container } = render(<InicioSkeleton />)

    expect(container.querySelectorAll('.kpi-card')).toHaveLength(4)
    expect(container.querySelector('.charts-row')).toBeInTheDocument()
    expect(container.querySelector('.bottom-row')).toBeInTheDocument()
  })

  it('reusa las clases reales de tarjeta para heredar fondo, borde y radio', () => {
    const { container } = render(<InicioSkeleton />)
    expect(container.querySelectorAll('.card').length).toBeGreaterThan(0)
  })
})
