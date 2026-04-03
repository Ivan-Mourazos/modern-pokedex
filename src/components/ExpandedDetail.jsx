/**
 * ExpandedDetail.jsx — v2 Premium
 * Diseño tipo "spotlight panel" que aparece ENCIMA del grid,
 * debajo del filtro de tipos. Animación de apertura tipo portal/iris.
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, Sword, Wind, Info, BarChart2, GitMerge, BookOpen } from 'lucide-react';
import {
  getPokemonDetail, getEspecie, getCadenaEvolutiva,
  getHabilidadInfoEs, getNombreHabilidadEs, getNombreMovimientoEs,
  filtrarMovimientos, COLOR_POR_TIPO, HEX_POR_TIPO, esGenI,
} from '../api/pokeApi';

const STAT_ICONS = {
  'PS': <Zap size={13} />, 'Ataque': <Sword size={13} />,
  'Defensa': <Shield size={13} />, 'Velocidad': <Wind size={13} />,
};

/* Convierte hex → rgb para CSS variables */
function parseRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '100,100,100';
  return `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`;
}

/* Etiqueta bonita para el tipo de variedad */
function etiquetaVariedad(nombreApi, baseNombre) {
  const label = nombreApi
    .replace(new RegExp(`^${baseNombre.toLowerCase()}-?`, 'i'), '')
    .replace(/-/g, ' ')
    .trim();
  if (!label) return 'Normal';
  if (label === 'mega') return 'Mega';
  if (label === 'mega-x' || label === 'megax') return 'Mega X';
  if (label === 'mega-y' || label === 'megay') return 'Mega Y';
  if (label.includes('gmax') || label.includes('gigantamax')) return 'Gigamax';
  if (label.includes('alola') || label.includes('alolan')) return 'Forma Alola';
  if (label.includes('galar') || label.includes('galarian')) return 'Forma Galar';
  if (label.includes('hisui') || label.includes('hisuian')) return 'Forma Hisui';
  if (label.includes('paldea') || label.includes('paldean')) return 'Forma Paldea';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ExpandedDetail({ pokemon, juegoId, onCerrar, onSeleccionar }) {
  const [detalle, setDetalle]     = useState(null);
  const [especie, setEspecie]     = useState(null);
  const [evolucion, setEvolucion] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [tab, setTab]             = useState('info');
  const [habAbierta, setHabAbierta] = useState(null);
  const [descHab, setDescHab]     = useState('');
  const panelRef = useRef(null);

  // --- Carga de datos con traducción de habilidades ---
  useEffect(() => {
    if (!pokemon) return;
    setCargando(true);
    setDetalle(null);
    setHabAbierta(null);
    setTab('info');

    getPokemonDetail(pokemon.nombreApi ?? pokemon.id)
      .then(async (d) => {
        const [habsEs, esp] = await Promise.all([
          Promise.all(d.habilidades.map(async h => ({
            ...h,
            nombre: await getNombreHabilidadEs(h.urlHabilidad, h.nombre),
          }))),
          getEspecie(d.urlEspecie),
        ]);

        setDetalle({ ...d, habilidades: habsEs, variedades: esp.variedades });
        setEspecie(esp);

        getCadenaEvolutiva(esp.urlCadenaEvolutiva)
          .then(setEvolucion)
          .catch(() => {});
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [pokemon?.id]);

  // --- Cambiar variedad (Mega, etc.) ---
  const cambiarVariedad = async (nombreApi) => {
    if (nombreApi === detalle?.nombreApi) return;
    setCargando(true);
    try {
      const d = await getPokemonDetail(nombreApi);
      const habsEs = await Promise.all(
        d.habilidades.map(async h => ({
          ...h,
          nombre: await getNombreHabilidadEs(h.urlHabilidad, h.nombre),
        }))
      );
      setDetalle(prev => ({ ...d, habilidades: habsEs, variedades: prev.variedades }));
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  // --- Toggle descripción de habilidad ---
  const toggleHab = async (h) => {
    if (habAbierta === h.nombreApi) { setHabAbierta(null); return; }
    setHabAbierta(h.nombreApi);
    setDescHab('Cargando…');
    setDescHab(await getHabilidadInfoEs(h.urlHabilidad));
  };

  if (!pokemon) return null;

  const accentColor = detalle ? (HEX_POR_TIPO[detalle.tipos?.[0]] ?? '#e63946') : '#e63946';
  const accentRgb   = parseRgb(accentColor);
  const baseNombre  = (detalle?.nombre ?? pokemon.nombre).toLowerCase();

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        key="detail-panel"
        initial={{ opacity: 0, scaleY: 0.85, y: -20 }}
        animate={{ opacity: 1, scaleY: 1, y: 0 }}
        exit={{ opacity: 0, scaleY: 0.9, y: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ transformOrigin: 'top center' }}
        className="detail-spotlight-wrapper"
      >
        {/* ── FONDO GLASSMORPHISM CON ACENTO ── */}
        <div
          className="detail-spotlight-bg"
          style={{
            '--accent-color': accentColor,
            '--accent-rgb': accentRgb,
          }}
        />

        {/* ── BOTÓN CERRAR ── */}
        <button className="detail-close-btn" onClick={onCerrar} aria-label="Cerrar detalle">
          <X size={18} />
        </button>

        {cargando ? (
          <div className="detail-loading">
            <div className="spinner" />
          </div>
        ) : detalle ? (
          <div className="detail-layout">

            {/* ══ LEFT: HERO ══ */}
            <div className="detail-hero">
              {/* Glow de fondo */}
              <div className="detail-hero-glow" />

              {/* Número */}
              <span className="detail-pokenum">
                #{String(detalle.id).padStart(4, '0')}
              </span>

              {/* Imagen */}
              <motion.img
                key={detalle.imagen}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                src={detalle.imagen}
                alt={detalle.nombre}
                className="detail-hero-img"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${detalle.id}.png`; }}
              />

              {/* Nombre + Tipos */}
              <h2 className="detail-name">{detalle.nombre}</h2>
              <div className="detail-types">
                {detalle.tipos.map(t => (
                  <span key={t} className="type-badge" style={{ backgroundColor: COLOR_POR_TIPO[t], padding: '5px 16px', fontSize: '0.82rem', fontWeight: 800 }}>{t}</span>
                ))}
              </div>

              {/* Selector de variedades */}
              {detalle.variedades?.length > 1 && (
                <div className="vars-block">
                  <span className="vars-label">Formas</span>
                  <div className="vars-row">
                    {detalle.variedades.map(v => (
                      <button
                        key={v.nombreApi}
                        onClick={() => cambiarVariedad(v.nombreApi)}
                        className={`var-pill ${detalle.nombreApi === v.nombreApi ? 'active' : ''}`}
                        style={detalle.nombreApi === v.nombreApi ? { '--pill-accent': accentColor } : {}}
                      >
                        {etiquetaVariedad(v.nombreApi, baseNombre)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats compactos (Altura/Peso) */}
              <div className="detail-quick-stats">
                <div className="qs-item">
                  <span className="qs-label">Altura</span>
                  <span className="qs-value">{detalle.altura}m</span>
                </div>
                <div className="qs-sep" />
                <div className="qs-item">
                  <span className="qs-label">Peso</span>
                  <span className="qs-value">{detalle.peso}kg</span>
                </div>
                <div className="qs-sep" />
                <div className="qs-item">
                  <span className="qs-label">Exp.</span>
                  <span className="qs-value">{detalle.experienciaBase}</span>
                </div>
              </div>
            </div>

            {/* ══ RIGHT: DATOS ══ */}
            <div className="detail-data">

              {/* TABS */}
              <div className="detail-tabs" style={{ '--tab-accent': accentColor }}>
                {[
                  { id: 'info',  icon: <Info size={15} />,      label: 'Info' },
                  { id: 'stats', icon: <BarChart2 size={15} />, label: 'Stats' },
                  { id: 'evo',   icon: <GitMerge size={15} />,  label: 'Evolución' },
                  { id: 'moves', icon: <BookOpen size={15} />,  label: 'Movimientos' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`dtab ${tab === t.id ? 'active' : ''}`}
                  >
                    {t.icon}<span>{t.label}</span>
                    {tab === t.id && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="dtab-indicator"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* CONTENIDO DE TABS */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="dtab-content"
                >
                  {tab === 'info' && (
                    <InfoTab detalle={detalle} especie={especie}
                      habAbierta={habAbierta} descHab={descHab} onHabClick={toggleHab}
                      accentColor={accentColor}
                    />
                  )}
                  {tab === 'stats' && <StatsTab detalle={detalle} juegoId={juegoId} accentColor={accentColor} />}
                  {tab === 'evo'   && <EvoTab evolucion={evolucion} currentId={detalle.id} onSeleccionar={onSeleccionar} accentColor={accentColor} />}
                  {tab === 'moves' && <MovesTab movimientosRaw={detalle.movimientosRaw} juegoId={juegoId} accentColor={accentColor} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── INFO TAB ── */
function InfoTab({ detalle, especie, habAbierta, descHab, onHabClick, accentColor }) {
  return (
    <div className="tab-scroll">
      {especie?.descripcion && (
        <p className="desc-card">{especie.descripcion}</p>
      )}
      <h4 className="section-head" style={{ '--sec-color': accentColor }}>Habilidades</h4>
      <div className="hab-list">
        {detalle.habilidades.map(h => (
          <div key={h.nombreApi} className="hab-item">
            <button
              className={`hab-btn ${habAbierta === h.nombreApi ? 'open' : ''}`}
              onClick={() => onHabClick(h)}
              style={habAbierta === h.nombreApi ? { borderColor: accentColor + '66', color: accentColor } : {}}
            >
              <span>{h.nombre}</span>
              {h.oculta && <span className="hidden-badge">Oculta</span>}
              <span className="hab-chevron">{habAbierta === h.nombreApi ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {habAbierta === h.nombreApi && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="hab-desc"
                >
                  {descHab}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── STATS TAB ── */
function StatsTab({ detalle, juegoId, accentColor }) {
  const stats = esGenI(juegoId)
    ? detalle.estadisticas
        .filter(s => s.nombreApi !== 'special-defense')
        .map(s => s.nombreApi === 'special-attack' ? { ...s, nombre: 'Especial' } : s)
    : detalle.estadisticas;

  const total = stats.reduce((acc, s) => acc + s.valor, 0);

  return (
    <div className="tab-scroll">
      <div className="stats-stack">
        {stats.map(s => {
          const pct = Math.min((s.valor / 255) * 100, 100);
          const barColor = s.valor >= 100 ? '#4da8ff' : s.valor >= 70 ? '#3dca6e' : '#ff9f43';
          return (
            <div key={s.nombre} className="stat-row">
              <div className="stat-label-cell">
                {STAT_ICONS[s.nombre]}
                <span>{s.nombre}</span>
              </div>
              <div className="stat-bar-track">
                <motion.div
                  className="stat-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ background: barColor, boxShadow: `0 0 8px ${barColor}88` }}
                />
              </div>
              <span className="stat-val">{s.valor}</span>
            </div>
          );
        })}
      </div>
      <div className="stat-total" style={{ borderColor: accentColor + '33', color: accentColor }}>
        Total · <strong>{total}</strong>
      </div>
    </div>
  );
}

/* ── EVOLUCIÓN TAB ── */
function EvoTab({ evolucion, currentId, onSeleccionar, accentColor }) {
  if (!evolucion.length) return <div className="empty-tab">Sin datos de evolución</div>;
  return (
    <div className="tab-scroll evo-chain">
      {evolucion.map((evo, i) => (
        <div key={evo.id} className="evo-step">
          {i > 0 && (
            <div className="evo-arrow-block">
              <div className="evo-arrow-line" style={{ background: accentColor }} />
              {evo.metodo && <span className="evo-method">{evo.metodo}</span>}
            </div>
          )}
          <button
            className={`evo-poke ${currentId === evo.id ? 'current' : ''}`}
            onClick={() => onSeleccionar(evo)}
            style={currentId === evo.id ? { borderColor: accentColor, backgroundColor: accentColor + '18' } : {}}
          >
            <img src={evo.imagen} alt={evo.nombre} />
            <span>{evo.nombre}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── MOVIMIENTOS TAB ── */
function MovesTab({ movimientosRaw, juegoId, accentColor }) {
  const [metodo, setMetodo] = useState('nivelUp');
  const [nombresEs, setNombresEs] = useState({});

  const movs = useMemo(() => filtrarMovimientos(movimientosRaw, juegoId), [movimientosRaw, juegoId]);

  useEffect(() => {
    if (!movs) return;
    const lista = (movs[metodo] ?? []).slice(0, 80); // límite para no saturar
    lista.forEach(async m => {
      if (nombresEs[m.urlApi]) return;
      const nombre = await getNombreMovimientoEs(m.urlApi, m.nombre);
      setNombresEs(prev => ({ ...prev, [m.urlApi]: nombre }));
    });
  }, [movs, metodo]);

  if (!juegoId) return <div className="empty-tab">Selecciona un juego para ver los movimientos</div>;
  if (!movs) return <div className="empty-tab">Sin datos</div>;

  const tabs = [
    { key: 'nivelUp', label: 'Por nivel' },
    { key: 'maquina', label: 'MT / MO' },
    { key: 'huevo',   label: 'Huevo' },
    { key: 'tutor',   label: 'Tutor' },
  ].filter(t => movs[t.key]?.length > 0);

  return (
    <div className="tab-scroll">
      <div className="move-method-bar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setMetodo(t.key)}
            className={`mmethod-btn ${metodo === t.key ? 'active' : ''}`}
            style={metodo === t.key ? { borderColor: accentColor, color: accentColor } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="moves-grid">
        {(movs[metodo] ?? []).map(m => (
          <div key={m.urlApi} className="move-chip">
            <span className="move-name">{nombresEs[m.urlApi] || m.nombre}</span>
            {metodo === 'nivelUp' && (
              <span className="move-lv" style={{ color: accentColor }}>Lv. {m.nivel || '—'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
