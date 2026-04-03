/**
 * ItemsSearch.jsx — v1
 * Búsqueda incremental de objetos con panel de detalle premium.
 * Localización completa en español via PokeAPI.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package, Tag, Coins, Zap } from 'lucide-react';
import {
  getAllItemNames, getItemDetail, getItemsByCategory,
  CATEGORIAS_OBJETOS_ES,
} from '../api/pokeApi';
import { SkeletonIndexGrid } from './Skeleton';

// ── Caché persistente ────────────────────────────────────────
const itemCache = new Map(); // id → ItemDetail

async function getItemDetailCached(id) {
  if (itemCache.has(id)) return itemCache.get(id);
  const d = await getItemDetail(id);
  itemCache.set(id, d);
  return d;
}

// ── Caché auxiliar para sessionStorage ──────────────────────
const fetchCachedAux = async (url) => {
  const cached = sessionStorage.getItem(url);
  if (cached) return JSON.parse(cached);
  const res = await fetch(url);
  const data = await res.json();
  sessionStorage.setItem(url, JSON.stringify(data));
  return data;
};

// ── Categorías principales para el filtro rápido ────────────
const FILTROS_RAPIDOS = [
  { key: null,               label: 'Todos',          icon: '🎒' },
  { key: 'pocket:medicine',  label: 'Medicinas',      icon: '💊' },
  { key: 'pocket:berries',   label: 'Bayas',          icon: '🍇' },
  { key: 'pocket:pokeballs', label: 'Poké Balls',     icon: '⚾' },
  { key: 'mega-stones',      label: 'Megapiedras',    icon: '💎' },
  { key: 'z-crystals',       label: 'Cristales Z',    icon: '💠' },
  { key: 'tera-shard',       label: 'Fragmentos Tera',icon: '🔮' },
  { key: 'held-items',       label: 'Equipables',     icon: '🛡️' },
  { key: 'evolution',        label: 'Evolución',      icon: '✨' },
  { key: 'loot',             label: 'Botín',          icon: '💰' },
];

// ── Colores por categoría ────────────────────────────────────
const CAT_COLORS = {
  'medicine': '#ff7675', 'healing': '#e17055', 'held-items': '#74b9ff',
  'evolution': '#a29bfe', 'vitamins': '#fd79a8', 'standard-balls': '#fab1a0',
  'special-balls': '#0984e3', 'mega-stones': '#6c5ce7', 'berries': '#55efc4',
  'z-crystals': '#00cec9', 'tera-shards': '#e84393', 'stat-boosts': '#fdcb6e',
  'loot': '#f9ca24', 'choice': '#e17055', 'plates': '#dfe6e9',
};

function getCatColor(categoriaApi) {
  return CAT_COLORS[categoriaApi] ?? '#a0a0c0';
}

// ── SearchBar local ─────────────────────────────────────────
function SearchBar({ valor, onChange, placeholder }) {
  const ref = useRef(null);
  return (
    <div className="searchbar-wrapper" onClick={() => ref.current?.focus()}>
      <div className="searchbar-inner">
        <div className={`searchbar-glow ${valor ? 'active' : ''}`} />
        <Search size={18} className="searchbar-icon"
          style={{ color: valor ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.25s' }} />
        <input ref={ref} type="text" value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Buscar objeto en español o inglés...'}
          className="searchbar-input" autoComplete="off" spellCheck="false" />
        {valor && (
          <button className="searchbar-clear"
            onClick={e => { e.stopPropagation(); onChange(''); ref.current?.focus(); }}>
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function ItemsSearch() {
  const [busqueda, setBusqueda]       = useState('');
  const [catFiltro, setCatFiltro]     = useState(null);
  const [baseList, setBaseList]       = useState([]);
  const [cacheVer, setCacheVer]       = useState(0);
  const [itemSelec, setItemSelec]     = useState(null);
  const [detalle, setDetalle]         = useState(null);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [cargandoItems, setCargandoItems] = useState(false);

  const indiceRef   = useRef([]);
  const abortRef    = useRef(false);
  const debounceRef = useRef(null);

  // Cargar índice al montar
  useEffect(() => {
    getAllItemNames()
      .then(lista => { indiceRef.current = lista; })
      .catch(console.error);
  }, []);

  // ── Búsqueda con debounce ─────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    abortRef.current = true;

    debounceRef.current = setTimeout(async () => {
      abortRef.current = false;
      const q = busqueda.trim().toLowerCase();

      if (!q && !catFiltro) {
        setCargandoItems(false);
        setBaseList([]);
        return;
      }

      setCargandoItems(true);
      let lista = indiceRef.current;

      // 1. Filtro por categoría o bolsillo usando la API
      if (catFiltro) {
        try {
          const esBolsillo = catFiltro.startsWith('pocket:');
          const endpoint = esBolsillo ? 'item-pocket' : 'item-category';
          const valor = esBolsillo ? catFiltro.split(':')[1] : catFiltro;
          
          const data = await fetchCachedAux(`https://pokeapi.co/api/v2/${endpoint}/${valor}`);
          
          let catIds = new Set();
          if (esBolsillo) {
            // Un bolsillo tiene múltiples categorías. Obtenemos los items de cada una.
            const results = await Promise.allSettled(
              data.categories.map(c => fetchCachedAux(c.url))
            );
            results.forEach(res => {
              if (res.status === 'fulfilled') {
                res.value.items.forEach(it => {
                  catIds.add(parseInt(it.url.split('/').filter(Boolean).pop(), 10));
                });
              }
            });
            lista = lista.filter(it => catIds.has(it.id));
          } else {
            const items = data.items || [];
            catIds = new Set(items.map(it => 
              parseInt(it.url.split('/').filter(Boolean).pop(), 10)
            ));
            lista = lista.filter(it => catIds.has(it.id));
          }
        } catch (err) { 
          console.error('Error cargando filtro:', err); 
          // Fallback para fragmentos tera si falla la API
          if (catFiltro === 'tera-shard') {
            lista = lista.filter(it => it.nombreApi.includes('tera-shard'));
          }
        }
      }

      // 2. Filtro por nombre
      if (q) {
        lista = lista.filter(it => {
          const api = it.nombreApi.toLowerCase();
          const es  = itemCache.get(it.id)?.nombre.toLowerCase() ?? it.nombre.toLowerCase();
          return api.includes(q) || es.includes(q);
        });
      }

      const listaFinal = lista.slice(0, 300);
      setBaseList(listaFinal);
      setCargandoItems(false);

      // 3. Enriquecer en batches para obtener nombres en ES
      const needed = listaFinal.filter(it => !itemCache.has(it.id)).map(it => it.id);
      const BATCH = 20;
      for (let i = 0; i < needed.length; i += BATCH) {
        if (abortRef.current) break;
        await Promise.allSettled(needed.slice(i, i + BATCH).map(id => getItemDetailCached(id)));
        if (!abortRef.current) setCacheVer(v => v + 1);
      }
    }, 300);
  }, [busqueda, catFiltro]);

  // ── Lista enriquecida ─────────────────────────────────────
  const displayList = useMemo(() => {
    return baseList.map(it => {
      const cached = itemCache.get(it.id);
      return cached
        ? { ...it, nombre: cached.nombre, categoria: cached.categoria, categoriaApi: cached.categoriaApi, sprite: cached.sprite }
        : it;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseList, cacheVer]);

  // ── Detalle del objeto seleccionado ──────────────────────
  useEffect(() => {
    if (!itemSelec) return;
    if (itemCache.has(itemSelec.id)) { setDetalle(itemCache.get(itemSelec.id)); return; }
    setCargandoDet(true);
    setDetalle(null);
    getItemDetailCached(itemSelec.id)
      .then(d => { setDetalle(d); setCacheVer(v => v + 1); })
      .catch(console.error)
      .finally(() => setCargandoDet(false));
  }, [itemSelec]);

  const hayBusqueda = busqueda.trim().length >= 1 || catFiltro;

  return (
    <motion.div layout className="moves-search-root">
      {/* Barra de búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 12px' }}>
        <SearchBar valor={busqueda} onChange={setBusqueda} placeholder="Buscar objeto en español o inglés..." />
      </div>

      {/* Filtros de categoría */}
      <div className="item-cat-filter-bar">
        {FILTROS_RAPIDOS.map(f => (
          <button
            key={f.key ?? 'todos'}
            className={`item-cat-btn ${catFiltro === f.key ? 'active' : ''}`}
            style={catFiltro === f.key && f.key
              ? { background: getCatColor(f.key), borderColor: getCatColor(f.key), color: '#fff' }
              : catFiltro === f.key && !f.key
                ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                : {}}
            onClick={() => setCatFiltro(catFiltro === f.key ? null : f.key)}
          >
            <span className="item-cat-icon">{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Panel de detalle */}
      <AnimatePresence>
        {itemSelec && (
          <motion.div
            key="item-detail"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1 }}
            style={{ overflow: 'hidden', transformOrigin: 'top center', marginBottom: '24px' }}
          >
            <ItemDetailPanel
              detalle={detalle}
              cargando={cargandoDet}
              onCerrar={() => { setItemSelec(null); setDetalle(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados */}
      {!hayBusqueda ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎒</div>
          <h2 className="empty-state-title">Explora los objetos</h2>
          <p className="empty-state-sub">Busca por nombre o filtra por categoría para encontrar cualquier objeto de la franquicia</p>
        </div>
      ) : cargandoItems ? (
        <SkeletonIndexGrid count={24} />
      ) : displayList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h2 className="empty-state-title">Sin resultados</h2>
          <p className="empty-state-sub">Prueba con otro nombre o categoría</p>
        </div>
      ) : (
        <motion.div
          layout
          key={busqueda + catFiltro + cacheVer}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="items-index-grid"
        >
          {displayList.map((it, i) => (
            <ItemIndexCard
              key={it.id}
              item={it}
              isSelected={itemSelec?.id === it.id}
              onClick={() => setItemSelec(itemSelec?.id === it.id ? null : it)}
              delay={Math.min(i * 0.004, 0.15)}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Tarjeta de índice ────────────────────────────────────────
function ItemIndexCard({ item, isSelected, onClick, delay }) {
  const color = item.categoriaApi ? getCatColor(item.categoriaApi) : '#a0a0c0';

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      onClick={onClick}
      className={`item-index-card ${isSelected ? 'selected' : ''}`}
      style={isSelected ? { borderColor: `${color}55`, background: `${color}18` } : {}}
    >
      {item.sprite ? (
        <img src={item.sprite} alt={item.nombre} className="iic-sprite" loading="lazy" />
      ) : (
        <div className="iic-sprite-placeholder">
          <Package size={16} style={{ opacity: 0.4 }} />
        </div>
      )}
      <div className="iic-content">
        <span className="iic-name">{item.nombre}</span>
        {item.categoria && (
          <span className="iic-badge" style={{ background: `${color}15`, color }}>
            {item.categoria}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ── Panel de detalle ─────────────────────────────────────────
function ItemDetailPanel({ detalle, cargando, onCerrar }) {
  const color = detalle?.categoriaApi ? getCatColor(detalle.categoriaApi) : '#a29bfe';

  const atributos = useMemo(() => {
    if (!detalle?.atributosApi?.length) return [];
    const MAP = {
      'holdable': 'Se puede equipar', 'holdable-active': 'Efecto al equipar',
      'holdable-passive': 'Efecto pasivo', 'usable-in-battle': 'Usable en batalla',
      'usable-overworld': 'Usable fuera de batalla', 'consumable': 'Consumible',
      'countable': 'Apilable', 'underground': 'Gran Bola de la Tierra',
    };
    return detalle.atributosApi.map(a => MAP[a] ?? a).filter(Boolean);
  }, [detalle?.atributosApi]);

  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '160,160,192';
  }

  return (
    <div className="detail-spotlight-wrapper" style={{ '--accent-color': color }}>
      <div className="detail-spotlight-bg" style={{ '--accent-rgb': hexToRgb(color) }} />
      <button className="detail-close-btn" onClick={onCerrar} aria-label="Cerrar">
        <X size={18} />
      </button>

      {cargando || !detalle ? (
        <div className="detail-loading"><div className="spinner" /></div>
      ) : (
        <div className="item-detail-layout">

          {/* ── HÉROE ── */}
          <div className="item-detail-hero">
            <div className="detail-hero-glow" style={{ background: color, opacity: 0.25, borderRadius: '50%', width: '200px', height: '200px', position: 'absolute', filter: 'blur(80px)' }} />

            {detalle.sprite ? (
              <motion.img
                key={detalle.sprite}
                src={detalle.sprite}
                alt={detalle.nombre}
                className="item-hero-sprite"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            ) : (
              <div className="item-hero-placeholder">
                <Package size={56} style={{ opacity: 0.25 }} />
              </div>
            )}

            <h2 className="item-hero-name">{detalle.nombre}</h2>

            <span className="item-hero-cat" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {detalle.categoria}
            </span>

            {/* Stats rápidos */}
            <div className="detail-quick-stats" style={{ marginTop: '14px' }}>
              <div className="qs-item">
                <span className="qs-label">ID</span>
                <span className="qs-value">#{String(detalle.id).padStart(3, '0')}</span>
              </div>
              <div className="qs-sep" />
              <div className="qs-item">
                <span className="qs-label">Precio</span>
                <span className="qs-value" style={{ fontSize: '0.9rem' }}>
                  {detalle.precio === 0 ? '—' : `${detalle.precio.toLocaleString('es')}₽`}
                </span>
              </div>
            </div>
          </div>

          {/* ── DATOS ── */}
          <div className="item-detail-data">
            {detalle.descripcion && (
              <>
                <h4 className="section-head" style={{ '--sec-color': color }}>Descripción</h4>
                <p className="desc-card">{detalle.descripcion}</p>
              </>
            )}

            {detalle.efecto && detalle.efecto !== detalle.descripcion && (
              <>
                <h4 className="section-head" style={{ '--sec-color': color }}>Efecto</h4>
                <p className="desc-card" style={{ fontSize: '0.84rem' }}>{detalle.efecto}</p>
              </>
            )}

            {atributos.length > 0 && (
              <>
                <h4 className="section-head" style={{ '--sec-color': color }}>Atributos</h4>
                <div className="item-atributos-row">
                  {atributos.map(a => (
                    <span key={a} className="item-atributo-chip" style={{ borderColor: `${color}44`, color }}>
                      {a}
                    </span>
                  ))}
                </div>
              </>
            )}

            {!detalle.descripcion && !detalle.efecto && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem', marginTop: '20px' }}>
                Sin descripción disponible para este objeto.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
