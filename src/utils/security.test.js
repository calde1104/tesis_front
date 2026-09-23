import { describe, it, expect } from 'vitest'
import {
  sanitizeSearch,
  sanitizeText,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeIsoDate,
} from './security'

describe('sanitizeSearch', () => {
  it('deja intacto un termino de busqueda legitimo del catalogo', () => {
    expect(sanitizeSearch('Coca Cola 2L')).toBe('Coca Cola 2L')
  })

  it('preserva acentos y enies, que son validos en el catalogo paraguayo', () => {
    expect(sanitizeSearch('Jabón Ñandú áéíóú')).toBe('Jabón Ñandú áéíóú')
  })

  it('neutraliza una inyeccion SQL clasica', () => {
    const clean = sanitizeSearch("'; DROP TABLE ventas_mensuales; --")
    expect(clean).not.toContain("'")
    expect(clean).not.toContain(';')
    expect(clean).not.toContain('--')
  })

  it('colapsa cualquier secuencia de comentario SQL a un unico guion', () => {
    expect(sanitizeSearch('lacteos ----- comentario')).toBe('lacteos - comentario')
  })

  it('elimina los delimitadores de tags para cortar el vector XSS', () => {
    const clean = sanitizeSearch('<script>alert(1)</script>')
    expect(clean).not.toContain('<')
    expect(clean).not.toContain('>')
  })

  it('remueve caracteres de control no imprimibles', () => {
    expect(sanitizeSearch('leche\x00\x1Fentera')).toBe('lecheentera')
  })

  it('trunca al limite de longitud indicado', () => {
    expect(sanitizeSearch('a'.repeat(150))).toHaveLength(100)
    expect(sanitizeSearch('a'.repeat(150), 10)).toHaveLength(10)
  })

  it('trunca ANTES de sanitizar, por lo que el limite acota la entrada cruda', () => {
    // Los 3 primeros caracteres son comillas: se recortan y luego se eliminan,
    // de modo que el resultado queda vacio en vez de arrastrar "abc".
    expect(sanitizeSearch("'''abc", 3)).toBe('')
  })

  it('devuelve cadena vacia ante entradas que no son texto', () => {
    expect(sanitizeSearch(null)).toBe('')
    expect(sanitizeSearch(undefined)).toBe('')
    expect(sanitizeSearch(42)).toBe('')
    expect(sanitizeSearch({ sku: 1 })).toBe('')
  })
})

describe('sanitizeText', () => {
  it('conserva una descripcion comercial valida', () => {
    expect(sanitizeText('Gaseosa 1.5L - pack x6')).toBe('Gaseosa 1.5L - pack x6')
  })

  it('elimina tags HTML completos', () => {
    expect(sanitizeText('<b>Promo</b> vigente')).toBe('Promo vigente')
  })

  it('elimina tambien un tag sin cerrar al final de la cadena', () => {
    expect(sanitizeText('Promo <script')).toBe('Promo ')
  })

  it('desarma un payload XSS dejando texto inerte', () => {
    const clean = sanitizeText("<script>alert('xss')</script>")
    expect(clean).not.toContain('<')
    expect(clean).not.toContain("'")
    expect(clean).toBe('alert(xss)')
  })

  it('remueve los vectores principales de SQLi', () => {
    const clean = sanitizeText('Nombre"; DELETE FROM productos')
    expect(clean).not.toContain('"')
    expect(clean).not.toContain(';')
  })

  it('trunca al limite por defecto de 200 caracteres', () => {
    expect(sanitizeText('x'.repeat(300))).toHaveLength(200)
  })

  it('devuelve cadena vacia ante entradas que no son texto', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(99)).toBe('')
  })
})

describe('sanitizeEmail', () => {
  it('conserva un correo valido y recorta espacios de los extremos', () => {
    expect(sanitizeEmail('  felipe@uade.edu.ar  ')).toBe('felipe@uade.edu.ar')
  })

  it('elimina espacios internos', () => {
    expect(sanitizeEmail('feli pe@uade.edu.ar')).toBe('felipe@uade.edu.ar')
  })

  it('remueve delimitadores de tags y comillas', () => {
    expect(sanitizeEmail('<script>@uade.edu.ar')).toBe('script@uade.edu.ar')
  })

  it('devuelve cadena vacia ante entradas que no son texto', () => {
    expect(sanitizeEmail(undefined)).toBe('')
  })
})

describe('sanitizeNumber', () => {
  it('convierte texto numerico a numero', () => {
    expect(sanitizeNumber('42')).toBe(42)
  })

  it('acota al maximo del rango', () => {
    expect(sanitizeNumber(150, 0, 100)).toBe(100)
  })

  it('acota al minimo del rango', () => {
    expect(sanitizeNumber(-5, 0, 100)).toBe(0)
  })

  it('usa el valor por defecto ante entradas vacias', () => {
    expect(sanitizeNumber('', 0, 100, 7)).toBe(7)
    expect(sanitizeNumber(null, 0, 100, 7)).toBe(7)
    expect(sanitizeNumber(undefined, 0, 100, 7)).toBe(7)
  })

  it('usa el valor por defecto ante NaN e Infinity', () => {
    expect(sanitizeNumber('abc', 0, 100, 7)).toBe(7)
    expect(sanitizeNumber(Infinity, 0, 100, 7)).toBe(7)
    expect(sanitizeNumber(-Infinity, 0, 100, 7)).toBe(7)
  })

  it('acepta el cero como valor legitimo y no lo confunde con vacio', () => {
    expect(sanitizeNumber(0, 0, 100, 7)).toBe(0)
  })
})

describe('sanitizeIsoDate', () => {
  it('acepta una fecha ISO bien formada', () => {
    expect(sanitizeIsoDate('2025-03-15')).toBe('2025-03-15')
  })

  it('rechaza formatos que no sean YYYY-MM-DD', () => {
    expect(sanitizeIsoDate('15/03/2025')).toBe('')
    expect(sanitizeIsoDate('2025-3-15')).toBe('')
    expect(sanitizeIsoDate('2025-03-15T00:00:00Z')).toBe('')
  })

  it('rechaza anios fuera de la ventana operativa 2000-2100', () => {
    expect(sanitizeIsoDate('1999-12-31')).toBe('')
    expect(sanitizeIsoDate('2101-01-01')).toBe('')
  })

  it('rechaza meses y dias fuera de rango', () => {
    expect(sanitizeIsoDate('2025-13-01')).toBe('')
    expect(sanitizeIsoDate('2025-00-10')).toBe('')
    expect(sanitizeIsoDate('2025-05-32')).toBe('')
    expect(sanitizeIsoDate('2025-05-00')).toBe('')
  })

  it('valida rango, no calendario: 31 de febrero pasa la validacion', () => {
    // Limitacion conocida y deliberada: el backend es quien valida el
    // calendario real. Se deja fijado para que un cambio futuro sea explicito.
    expect(sanitizeIsoDate('2025-02-31')).toBe('2025-02-31')
  })

  it('devuelve cadena vacia ante entradas que no son texto', () => {
    expect(sanitizeIsoDate(null)).toBe('')
    expect(sanitizeIsoDate(20250315)).toBe('')
  })
})
