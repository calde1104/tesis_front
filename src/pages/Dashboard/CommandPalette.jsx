import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Home, BarChart3, LineChart, Sparkles, PieChart, UploadCloud,
  SlidersHorizontal, Server, LogOut, Building2, Package, AlertCircle,
  Clock, CornerDownLeft
} from 'lucide-react';

const RECENTS_KEY = 'cmdk:recents';
const MAX_RECENTS = 6;
const MAX_PER_GROUP = 6;

const normalizeWithMap = (str) => {
  const source = String(str ?? '');
  let text = '';
  const map = [];
  for (let i = 0; i < source.length; i++) {
    const chunk = source[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let j = 0; j < chunk.length; j++) {
      text += chunk[j];
      map.push(i);
    }
  }
  return { text, map };
};

const normalize = (str) =>
  String(str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const scoreItem = (item, tokens) => {
  const title = item._title;
  const keywords = item._keywords;
  let total = 0;

  for (const token of tokens) {
    const wordStart = new RegExp(`\\b${escapeRegex(token)}`);
    let best = -1;

    if (title.startsWith(token)) best = 100;
    else if (wordStart.test(title)) best = 80;
    else if (title.includes(token)) best = 55;
    else if (keywords.startsWith(token)) best = 45;
    else if (wordStart.test(keywords)) best = 35;
    else if (keywords.includes(token)) best = 20;

    if (best < 0) return -1;
    total += best;
  }

  return total - Math.min(title.length, 40) * 0.1;
};

const buildHighlight = (text, tokens) => {
  const source = String(text ?? '');
  if (!tokens.length) return [{ text: source, match: false }];

  const { text: normalized, map } = normalizeWithMap(source);
  const flags = new Array(source.length).fill(false);
  let matchedAny = false;

  for (const token of tokens) {
    const at = normalized.indexOf(token);
    if (at === -1) continue;
    matchedAny = true;
    for (let i = at; i < at + token.length && i < map.length; i++) {
      flags[map[i]] = true;
    }
  }

  if (!matchedAny) return [{ text: source, match: false }];

  const segments = [];
  let current = '';
  let currentMatch = flags[0];
  for (let i = 0; i < source.length; i++) {
    if (flags[i] !== currentMatch) {
      segments.push({ text: current, match: currentMatch });
      current = '';
      currentMatch = flags[i];
    }
    current += source[i];
  }
  if (current) segments.push({ text: current, match: currentMatch });
  return segments;
};

const Highlighted = ({ text, tokens }) => (
  <>
    {buildHighlight(text, tokens).map((seg, i) =>
      seg.match ? (
        <mark key={i} className="cmdk-mark">{seg.text}</mark>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    )}
  </>
);

const readRecents = () => {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const pushRecent = (id) => {
  try {
    const next = [id, ...readRecents().filter((r) => r !== id)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage puede no estar disponible (modo privado) */
  }
};

/**
 * Se monta solo mientras esta abierto (el padre lo renderiza condicionalmente),
 * asi que el estado inicial ya es el estado "recien abierto": no hace falta
 * resetearlo con efectos.
 */
const CommandPalette = ({
  onClose,
  products = [],
  notifications = [],
  onNavigate,
  onOpenProduct,
  onOpenNotification,
  onOpenCompany,
  onLogout
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents] = useState(readRecents);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allItems = useMemo(() => {
    const items = [];

    const nav = [
      { tab: 'inicio', icon: Home, title: 'Inicio', subtitle: 'Resumen predictivo y KPIs', keywords: 'dashboard resumen kpi home principal' },
      { tab: 'sales', icon: BarChart3, title: 'Ventas', subtitle: 'Historial comercial por SKU', keywords: 'historial transacciones facturacion ventas' },
      { tab: 'forecast', icon: LineChart, title: 'Simulador de Demanda', subtitle: 'Proyecciones a 12 meses y escenarios', keywords: 'forecast prediccion proyeccion simulacion escenarios' },
      { tab: 'cold-start', icon: Sparkles, title: 'Pre-lanzamiento', subtitle: 'Demanda inicial para SKUs nuevos', keywords: 'cold start nuevo producto lanzamiento clustering' },
      { tab: 'market', icon: PieChart, title: 'Mercado', subtitle: 'Cuota de mercado y competencia', keywords: 'market share competencia posicionamiento cuota' },
      { tab: 'ingestion', icon: UploadCloud, title: 'Ingesta de Datos', subtitle: 'Carga y validacion de archivos', keywords: 'subir cargar importar archivo csv excel pipeline' },
      { tab: 'settings', icon: SlidersHorizontal, title: 'Umbrales por SKU', subtitle: 'Limites de demanda maxima', keywords: 'configuracion limites umbral alertas ajustes' },
      { tab: 'settings-info', icon: Server, title: 'Informacion del Sistema', subtitle: 'Estado de la plataforma y del modelo ML', keywords: 'configuracion sistema modelo version estado empresa' }
    ];

    nav.forEach((n) => {
      items.push({
        id: `nav:${n.tab}`,
        group: 'Navegación',
        icon: n.icon,
        title: n.title,
        subtitle: n.subtitle,
        keywords: n.keywords,
        run: () => onNavigate(n.tab)
      });
    });

    products.forEach((p) => {
      if (!p?.sku) return;
      items.push({
        id: `product:${p.sku}`,
        group: 'Productos',
        icon: Package,
        title: p.name || p.sku,
        subtitle: [p.sku, p.category].filter(Boolean).join(' · '),
        badge: p.brand || null,
        keywords: [p.sku, p.category, p.brand, 'producto sku forecast prediccion'].filter(Boolean).join(' '),
        run: () => onOpenProduct(p.sku)
      });
    });

    notifications
      .filter((n) => n.estado === 'ACTIVA')
      .forEach((n) => {
        const product = products.find((p) => p.sku === n.productoId) || null;
        const label = product?.name || 'Producto';
        items.push({
          id: `alert:${n.id}`,
          group: 'Alertas activas',
          icon: AlertCircle,
          title: `${label} supera el umbral`,
          subtitle: 'Ver la proyeccion que disparo la alerta',
          tone: 'danger',
          keywords: [label, product?.sku, 'alerta notificacion umbral excedido riesgo'].filter(Boolean).join(' '),
          run: () => onOpenNotification(n.id, product?.sku || n.productoId)
        });
      });

    items.push({
      id: 'action:company',
      group: 'Acciones',
      icon: Building2,
      title: 'Ver perfil corporativo',
      subtitle: 'Datos de la organizacion y tenant',
      keywords: 'empresa cuenta perfil razon social ruc cuit tenant foto',
      run: () => onOpenCompany()
    });

    items.push({
      id: 'action:logout',
      group: 'Acciones',
      icon: LogOut,
      title: 'Cerrar sesion',
      subtitle: 'Salir de la plataforma',
      tone: 'danger',
      keywords: 'salir logout desconectar cerrar sesion',
      run: () => onLogout()
    });

    return items.map((item) => ({
      ...item,
      _title: normalize(item.title),
      _keywords: normalize(`${item.title} ${item.subtitle || ''} ${item.keywords || ''}`)
    }));
  }, [products, notifications, onNavigate, onOpenProduct, onOpenNotification, onOpenCompany, onLogout]);

  const tokens = useMemo(
    () => normalize(query).split(/\s+/).filter(Boolean),
    [query]
  );

  const groups = useMemo(() => {
    const order = ['Recientes', 'Alertas activas', 'Productos', 'Navegación', 'Acciones'];

    let visible;
    if (!tokens.length) {
      const recentItems = recents
        .map((id) => allItems.find((item) => item.id === id))
        .filter(Boolean)
        .map((item) => ({ ...item, group: 'Recientes', icon: Clock }));

      // Lo que ya esta en Recientes no se repite abajo como sugerencia
      const recentIds = new Set(recentItems.map((item) => item.id));
      const suggestions = allItems.filter(
        (item) =>
          !recentIds.has(item.id) &&
          (item.group === 'Alertas activas' || item.group === 'Navegación')
      );
      visible = [...recentItems, ...suggestions];
    } else {
      visible = allItems
        .map((item) => ({ item, score: scoreItem(item, tokens) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    }

    const buckets = new Map();
    visible.forEach((item) => {
      if (!buckets.has(item.group)) buckets.set(item.group, []);
      const bucket = buckets.get(item.group);
      if (bucket.length < MAX_PER_GROUP) bucket.push(item);
    });

    return order
      .filter((name) => buckets.get(name)?.length)
      .map((name) => ({ name, items: buckets.get(name) }));
  }, [allItems, tokens, recents]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const node = listRef.current?.querySelector('[data-cmdk-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, groups]);

  const runItem = useCallback(
    (item) => {
      if (!item) return;
      pushRecent(item.id);
      onClose();
      item.run();
    },
    [onClose]
  );

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatItems.length) setActiveIndex((i) => (i + 1) % flatItems.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatItems.length) setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, flatItems.length - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      runItem(flatItems[activeIndex]);
    }
  };

  let cursor = -1;

  return (
    <div className="cmdk-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Buscador de comandos"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <Search size={18} className="cmdk-input-icon" />
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos, vistas o acciones..."
            autoComplete="off"
            spellCheck="false"
            aria-autocomplete="list"
            aria-activedescendant={flatItems[activeIndex] ? `cmdk-item-${activeIndex}` : undefined}
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>

        <div className="cmdk-list custom-scrollbar" ref={listRef} role="listbox">
          {flatItems.length === 0 ? (
            <div className="cmdk-empty">
              <Search size={22} />
              <p>No encontramos nada para “{query}”</p>
              <span>Proba con el nombre del producto, su SKU o el nombre de una vista.</span>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="cmdk-group">
                <div className="cmdk-group-label">{group.name}</div>
                {group.items.map((item) => {
                  cursor += 1;
                  const index = cursor;
                  const isActive = index === activeIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`cmdk-item-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-cmdk-active={isActive}
                      className={`cmdk-item ${isActive ? 'active' : ''} ${item.tone === 'danger' ? 'danger' : ''}`}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => runItem(item)}
                    >
                      <span className="cmdk-item-icon"><Icon size={16} /></span>
                      <span className="cmdk-item-text">
                        <span className="cmdk-item-title">
                          <Highlighted text={item.title} tokens={tokens} />
                        </span>
                        {item.subtitle && (
                          <span className="cmdk-item-subtitle">
                            <Highlighted text={item.subtitle} tokens={tokens} />
                          </span>
                        )}
                      </span>
                      {item.badge && <span className="cmdk-item-badge">{item.badge}</span>}
                      <CornerDownLeft size={14} className="cmdk-item-enter" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmdk-footer">
          <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> navegar</span>
          <span><kbd className="cmdk-kbd">↵</kbd> abrir</span>
          <span><kbd className="cmdk-kbd">esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
