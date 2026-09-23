import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom no implementa el desplazamiento del layout. Los componentes que
// mantienen visible el elemento activo (la paleta de comandos, las listas
// navegables por teclado) lo invocan en cada cambio de seleccion.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// Cada test arranca con el DOM y el almacenamiento limpios: de lo contrario un
// token dejado por un test anterior hace pasar (o fallar) al siguiente por
// motivos que no tienen que ver con lo que ese test afirma.
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
