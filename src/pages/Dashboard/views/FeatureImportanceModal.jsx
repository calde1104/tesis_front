import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

// `grupo` es texto libre del backend, no un enum cerrado: los conocidos tienen
// color fijo y cualquier grupo nuevo cae en la paleta de reserva por hash.
const GRUPO_COLORS = {
  'Historial y Tendencia': '#0ea5e9',
  'Variables Climáticas': '#34d399',
  'Variables Macroeconómicas': '#a78bfa',
  'Calendario y Festividades': '#fbbf24'
};
const FALLBACK_COLORS = ['#f472b6', '#fb923c', '#22d3ee', '#c084fc', '#4ade80'];

const colorForGrupo = (grupo) => {
  if (GRUPO_COLORS[grupo]) return GRUPO_COLORS[grupo];
  const key = String(grupo);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
};

const fmtPct = (n) => `${Number(n).toFixed(2)}%`;

/**
 * Modal de explicabilidad: qué variables pesan en el modelo Champion y cuánto.
 * Se abre desde la píldora del modelo en la leyenda del gráfico de pronóstico.
 *
 * Los datos vienen de tesis_ia vía el backend y no hay fallback simulado a
 * propósito (una explicabilidad inventada no explica nada), así que cuando el
 * motor no responde se dice, no se estima.
 */
const FeatureImportanceModal = ({ open, onClose, data, loading, error }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Sin esto la vista de atras sigue scrolleando con la rueda por debajo del
    // overlay mientras el modal esta abierto.
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = scrollPrevio;
    };
  }, [open, onClose]);

  if (!open) return null;

  const variables = data?.variables || [];

  // Portal a body: .dashboard-grid abre su propio contexto de apilamiento
  // (position: relative + z-index: 0), asi que un overlay fixed montado dentro
  // de la vista queda atrapado debajo del sidebar por mas z-index que tenga.
  return createPortal(
    <div className="cmdk-overlay" onMouseDown={onClose} role="presentation" style={{ alignItems: 'center', padding: '5vh 1rem' }}>
      <div
        className="cmdk-panel custom-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-label="Explicabilidad del modelo"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', maxHeight: '82vh', overflowY: 'auto', padding: '1.3rem 1.5rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700' }}>
              {data?.modeloTipo || 'Explicabilidad del modelo'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Peso de cada variable en la predicción</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ marginTop: '1.2rem' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#64748b', padding: '2.5rem 0' }}>
              <Loader2 className="spinner" size={16} />
              <span style={{ fontSize: '0.8rem' }}>Cargando...</span>
            </div>
          )}

          {!loading && error && (
            <p style={{ margin: 0, padding: '2rem 0', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.6' }}>
              {/* tesis_ia reentrena el modelo al arrancar y no responde hasta
                  terminar, asi que tras un restart esto puede tardar minutos. */}
              {error.status === 502
                ? 'La explicabilidad no está disponible ahora. El motor de ML se está iniciando.'
                : 'No se pudo cargar la explicabilidad del modelo.'}
            </p>
          )}

          {!loading && !error && variables.length > 0 && (
            <div style={{ width: '100%', height: `${variables.length * 28 + 10}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={variables} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap="22%">
                  {/* Con layout="vertical" el eje numerico es el XAxis, y sin
                      declararlo recharts lo asume category y mide las barras
                      contra indices en vez de contra el porcentaje. Va oculto,
                      pero tiene que existir. Escala real 0-100: una variable se
                      lleva casi todo el peso y se muestra tal cual. */}
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={180}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} minPointSize={2} isAnimationActive={false}>
                    {variables.map(v => (
                      <Cell key={v.feature} fill={colorForGrupo(v.grupo)} />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="right"
                      formatter={fmtPct}
                      style={{ fill: '#64748b', fontSize: 10.5 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FeatureImportanceModal;
