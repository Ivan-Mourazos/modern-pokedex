/**
 * MovesSearch.jsx — v3
 * Arquitectura: cacheVersion como disparador de re-renders.
 * Los nombres se cargan en español via batch y se muestran
 * conforme llegan, sin perder actualizaciones de estado.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Zap, Shield, Star } from 'lucide-react';
import {
  getAllMoveNames, getMoveDetail,
  COLOR_POR_TIPO, HEX_POR_TIPO, TODOS_LOS_TIPOS,
} from '../api/pokeApi';
import { SkeletonIndexGrid } from './Skeleton';

// ── Caché persistente (módulo-level, sobrevive re-renders) ──
const moveCache = new Map(); // id → MoveDetail completo

// ── Utilidades de API ───────────────────────────────────────
const TIPOS_API_NAME = {
  'Normal': 'normal', 'Fuego': 'fire', 'Agua': 'water', 'Planta': 'grass',
  'Eléctrico': 'electric', 'Hielo': 'ice', 'Lucha': 'fighting', 'Veneno': 'poison',
  'Tierra': 'ground', 'Volador': 'flying', 'Psíquico': 'psychic', 'Bicho': 'bug',
  'Roca': 'rock', 'Fantasma': 'ghost', 'Dragón': 'dragon', 'Siniestro': 'dark',
  'Acero': 'steel', 'Hada': 'fairy', 'Estelar': 'stellar'
};

const fetchCachedAux = async (url) => {
  const cached = sessionStorage.getItem(url);
  if (cached) return JSON.parse(cached);
  const res = await fetch(url);
  const data = await res.json();
  sessionStorage.setItem(url, JSON.stringify(data));
  return data;
};

async function getMoveDetailCached(id) {
  if (moveCache.has(id)) return moveCache.get(id);
  const d = await getMoveDetail(id);
  moveCache.set(id, d);
  return d;
}

// ── Utilidades ──────────────────────────────────────────────
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '100,100,100';
}

const CAT_COLORS = { 'Físico': '#e84b3a', 'Especial': '#7038f8', 'Estado': '#a8a878' };

// ── SearchBar local ─────────────────────────────────────────
function SearchBar({ valor, onChange }) {
  const ref = useRef(null);
  return (
    <div className="searchbar-wrapper" onClick={() => ref.current?.focus()}>
      <div className="searchbar-inner">
        <div className={`searchbar-glow ${valor ? 'active' : ''}`} />
        <Search size={18} className="searchbar-icon"
          style={{ color: valor ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.25s' }} />
        <input ref={ref} type="text" value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder="Buscar movimiento en español o inglés..."
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
export default function MovesSearch() {
  const [busqueda, setBusqueda]       = useState('');
  const [tipoFiltro, setTipoFiltro]   = useState(null);
  const [baseList, setBaseList]       = useState([]);   // items del índice
  const [cacheVer, setCacheVer]       = useState(0);    // dispara re-render cuando caché se actualiza
  const [movSelec, setMovSelec]       = useState(null);
  const [detalle, setDetalle]         = useState(null);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [cargandoIndice, setCargandoIndice] = useState(false);

  const indiceRef  = useRef([]);
  const abortRef   = useRef(false);
  const debounceRef = useRef(null);

  // Carga del índice ligero al montar
  useEffect(() => {
    getAllMoveNames()
      .then(lista => { indiceRef.current = lista; })
      .catch(console.error);
  }, []);

  // ── Búsqueda con debounce ───────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    abortRef.current = true; // cancela batch anterior

    debounceRef.current = setTimeout(async () => {
      abortRef.current = false;
      const q = busqueda.trim().toLowerCase();

      if (!q && !tipoFiltro) { setBaseList([]); setCargandoIndice(false); return; }

      setCargandoIndice(true);
      let lista = indiceRef.current;

      // 1. Filtrado por tipo usando el endpoint /type/ de la API (mucho más rápido)
      if (tipoFiltro) {
        try {
          const apiType = TIPOS_API_NAME[tipoFiltro];
          if (apiType) {
            const typeData = await fetchCachedAux(`https://pokeapi.co/api/v2/type/${apiType}`);
            const typeMoveIds = new Set(typeData.moves.map(m => parseInt(m.url.split('/').filter(Boolean).pop(), 10)));
            lista = lista.filter(m => typeMoveIds.has(m.id));
          }
        } catch (err) { console.error("Error filtrando por tipo:", err); }
      }

      // 2. Filtrar por nombre (si hay query)
      if (q) {
        lista = lista.filter(m => {
          const nombreApi = m.nombreApi.toLowerCase();
          const nombreEs  = moveCache.get(m.id)?.nombre.toLowerCase() ?? m.nombre.toLowerCase();
          return nombreApi.includes(q) || nombreEs.includes(q);
        });
      }

      // 3. Limitar a un número mayor para no omitir resultados importantes
      const listaFinal = lista.slice(0, 500);

      setBaseList(listaFinal);
      setCargandoIndice(false);

      // 4. Enriquecer (solo los que no están en caché de los mostrados)
      const needed = listaFinal.filter(m => !moveCache.has(m.id)).map(m => m.id);
      const BATCH = 15;
      for (let i = 0; i < needed.length; i += BATCH) {
        if (abortRef.current) break;
        await Promise.allSettled(needed.slice(i, i + BATCH).map(id => getMoveDetailCached(id)));
        if (!abortRef.current) setCacheVer(v => v + 1);
      }
    }, 300);
  }, [busqueda, tipoFiltro]);


  // ── Lista a mostrar (con caché aplicado) ────────────────
  const displayList = useMemo(() => {
    let items = baseList.map(m => {
      const cached = moveCache.get(m.id);
      return cached
        ? { ...m, nombre: cached.nombre, tipo: cached.tipo, tipoApi: cached.tipoApi }
        : m;
    });

    if (tipoFiltro) {
      items = items.filter(m => m.tipo === tipoFiltro);
    }

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseList, cacheVer, tipoFiltro]);

  // ── Detalle del movimiento seleccionado ─────────────────
  useEffect(() => {
    if (!movSelec) return;
    if (moveCache.has(movSelec.id)) { setDetalle(moveCache.get(movSelec.id)); return; }
    setCargandoDet(true);
    setDetalle(null);
    getMoveDetailCached(movSelec.id)
      .then(d => { setDetalle(d); setCacheVer(v => v + 1); })
      .catch(console.error)
      .finally(() => setCargandoDet(false));
  }, [movSelec]);

  const hayBusqueda = busqueda.trim().length >= 1 || tipoFiltro;

  return (
    <motion.div layout className="moves-search-root">
      {/* Barra de búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 12px' }}>
        <SearchBar valor={busqueda} onChange={setBusqueda} />
      </div>

      {/* Filtros tipo */}
      <div className="type-filter-bar" style={{ marginBottom: '16px' }}>
        {['Todos', ...TODOS_LOS_TIPOS].map(t => (
          <button
            key={t}
            className={`type-filter-btn ${(tipoFiltro === null && t === 'Todos') || tipoFiltro === t ? 'active' : ''}`}
            style={(tipoFiltro === null && t === 'Todos')
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
              : tipoFiltro === t
                ? { background: COLOR_POR_TIPO[t], borderColor: COLOR_POR_TIPO[t] }
                : {}}
            onClick={() => setTipoFiltro(t === 'Todos' ? null : tipoFiltro === t ? null : t)}
          >{t}</button>
        ))}
      </div>

      {/* Panel de detalle */}
      <AnimatePresence mode="popLayout">
        {movSelec && (
          <motion.div
            key="move-detail"
            initial={{ opacity: 0, height: 0, scale: 0.96 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1 }}
            style={{ overflow: 'hidden', transformOrigin: 'top center', marginBottom: '24px' }}
          >
            <MoveDetailPanel
              detalle={detalle}
              cargando={cargandoDet}
              onCerrar={() => { setMovSelec(null); setDetalle(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados / empty state */}
      {!hayBusqueda ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <h2 className="empty-state-title">Busca un movimiento</h2>
          <p className="empty-state-sub">Escribe el nombre en español o inglés, o filtra por tipo</p>
        </div>
      ) : cargandoIndice ? (
        <SkeletonIndexGrid count={24} />
      ) : displayList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h2 className="empty-state-title">Sin resultados</h2>
          <p className="empty-state-sub">Prueba con otro nombre o tipo</p>
        </div>
      ) : (
        <motion.div
          layout
          key={busqueda + tipoFiltro + cacheVer}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="moves-index-grid"
        >
          {displayList.map((m, i) => (
            <MoveIndexCard
              key={m.id}
              move={m}
              isSelected={movSelec?.id === m.id}
              onClick={() => setMovSelec(movSelec?.id === m.id ? null : m)}
              delay={Math.min(i * 0.005, 0.18)}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Tarjeta de índice ────────────────────────────────────────
function MoveIndexCard({ move, isSelected, onClick, delay }) {
  const color = move.tipoApi ? (HEX_POR_TIPO[move.tipo] ?? null) : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      onClick={onClick}
      className={`move-index-card ${isSelected ? 'selected' : ''}`}
      style={isSelected && color
        ? { borderColor: `${color}55`, background: `${color}16` }
        : {}}
    >
      {color && <span className="mic-type-dot" style={{ background: color }} />}
      <span className="mic-name">{move.nombre}</span>
      <span className="mic-id">#{String(move.id).padStart(3, '0')}</span>
    </motion.button>
  );
}

// ── Panel de detalle ─────────────────────────────────────────
function MoveDetailPanel({ detalle, cargando, onCerrar }) {
  const accent = detalle ? (HEX_POR_TIPO[detalle.tipo] ?? '#e63946') : '#e63946';

  return (
    <div className="detail-spotlight-wrapper" style={{ '--accent-color': accent }}>
      <div className="detail-spotlight-bg" style={{ '--accent-rgb': hexToRgb(accent) }} />
      <button className="detail-close-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>

      {cargando || !detalle ? (
        <div className="detail-loading"><div className="spinner" /></div>
      ) : (
        <div className="move-detail-layout">

          {/* ── HÉROE ── */}
          <div className="move-detail-hero">
            <div className="detail-hero-glow" style={{ background: accent }} />
            <span className="detail-pokenum">#{String(detalle.id).padStart(3, '0')}</span>
            <h2 className="move-hero-name">{detalle.nombre}</h2>

            <div className="detail-types" style={{ justifyContent: 'center', marginBottom: '4px' }}>
              <span className="type-badge"
                style={{ backgroundColor: COLOR_POR_TIPO[detalle.tipo] ?? '#888', padding: '5px 14px', fontSize: '0.78rem', fontWeight: 800 }}>
                {detalle.tipo}
              </span>
              <span className="type-badge"
                style={{ backgroundColor: CAT_COLORS[detalle.categoria] ?? '#666', padding: '5px 14px', fontSize: '0.78rem', fontWeight: 800 }}>
                {detalle.categoria}
              </span>
            </div>

            <div className="detail-quick-stats" style={{ marginTop: '14px' }}>
              <div className="qs-item">
                <span className="qs-label">Potencia</span>
                <span className="qs-value">{detalle.potencia ?? '—'}</span>
              </div>
              <div className="qs-sep" />
              <div className="qs-item">
                <span className="qs-label">Precisión</span>
                <span className="qs-value">{detalle.precision != null ? `${detalle.precision}%` : '—'}</span>
              </div>
              <div className="qs-sep" />
              <div className="qs-item">
                <span className="qs-label">PP</span>
                <span className="qs-value">{detalle.pp ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* ── DATOS ── */}
          <div className="move-detail-data">
            {detalle.descripcion && (
              <>
                <h4 className="section-head" style={{ '--sec-color': accent }}>Descripción</h4>
                <p className="desc-card">{detalle.descripcion}</p>
              </>
            )}
            {detalle.efecto && (
              <>
                <h4 className="section-head" style={{ '--sec-color': accent }}>Efecto</h4>
                <p className="desc-card" style={{ fontSize: '0.84rem' }}>{detalle.efecto}</p>
              </>
            )}
            <div className="move-meta-row">
              <div className="data-box">
                <span className="data-box-label">Prioridad</span>
                <strong className="data-box-value">
                  {detalle.prioridad > 0 ? `+${detalle.prioridad}` : detalle.prioridad}
                </strong>
              </div>
              <div className="data-box">
                <span className="data-box-label">Generación</span>
                <strong className="data-box-value" style={{ fontSize: '0.78rem' }}>
                  {detalle.generacion?.replace('generation-', 'Gen ').toUpperCase() ?? '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
