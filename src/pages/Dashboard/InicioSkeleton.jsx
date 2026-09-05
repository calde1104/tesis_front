/**
 * Placeholder de la vista Inicio mientras resuelven los fetches.
 *
 * Reproduce la misma grilla que InicioView (4 KPIs -> charts-row 2fr/1fr ->
 * bottom-row 1.2fr/0.8fr) para que al llegar los datos nada cambie de lugar.
 * Reusa .card y .kpi-card, asi que hereda fondo, borde y radio reales.
 */
const Bar = ({ w, h = 12, className = '' }) => (
  <div className={`skel-bar ${className}`} style={{ width: w, height: h }} />
);

const KpiSkeleton = () => (
  <div className="card kpi-card skel-card">
    <div className="kpi-header">
      <Bar w="55%" h={11} />
      <Bar w="18px" h={18} className="skel-round" />
    </div>
    <Bar w="70%" h={22} />
    <Bar w="45%" h={10} />
  </div>
);

const PanelSkeleton = ({ lines = 0 }) => (
  <div className="card skel-card">
    <div className="card-header">
      <Bar w="38%" h={13} />
      <Bar w="90px" h={20} className="skel-pill" />
    </div>
    {lines > 0 ? (
      <div className="skel-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} w={`${88 - i * 11}%`} h={11} />
        ))}
      </div>
    ) : (
      <div className="skel-plot" />
    )}
  </div>
);

const InicioSkeleton = () => (
  <div className="skel-view" aria-busy="true" aria-label="Cargando panel">
    <div className="kpi-cards">
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiSkeleton key={i} />
      ))}
    </div>

    <div className="charts-row">
      <PanelSkeleton />
      <PanelSkeleton />
    </div>

    <div className="bottom-row">
      <PanelSkeleton lines={4} />
      <PanelSkeleton lines={4} />
    </div>
  </div>
);

export default InicioSkeleton;
