/**
 * PokemonDetail.jsx — v3
 * - Tabs en español: Datos / Estadísticas / Evolución / Movimientos
 * - Métodos de evolución detallados
 * - Stats adaptados para Gen I (solo "Especial")
 * - Movimientos filtrados por juego seleccionado
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, Sword, Wind, Info, BarChart2, GitMerge, BookOpen } from 'lucide-react';
import {
  getPokemonDetail, getEspecie, getCadenaEvolutiva,
  getNombreHabilidadEs, getNombreMovimientoEs,
  filtrarMovimientos, METODOS_APRENDIZAJE_ES,
  COLOR_POR_TIPO, HEX_POR_TIPO,
  esGenI,
} from '../api/pokeApi';

// ── Utilidades ────────────────────────────────────────────

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`;
}

const STAT_ICONS = {
  'PS':       <Zap size={12} />,
  'Ataque':   <Sword size={12} />,
  'Defensa':  <Shield size={12} />,
  'Velocidad':<Wind size={12} />,
};

function barColor(valor) {
  if (valor >= 100) return '#3dca6e';
  if (valor >= 60)  return '#f5d020';
  return '#ff5c35';
}

// ── Componente principal ──────────────────────────────────

export default function PokemonDetail({ pokemon, juegoId, onCerrar, onSeleccionar }) {
  const [detalle, setDetalle]     = useState(null);
  const [especie, setEspecie]     = useState(null);
  const [evolucion, setEvolucion] = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [shiny, setShiny]         = useState(false);
  const [tabActiva, setTabActiva] = useState('datos');

  useEffect(() => {
    if (!pokemon) return;
    setDetalle(null);
    setEspecie(null);
    setEvolucion([]);
    setShiny(false);
    setTabActiva('datos');
    setCargando(true);

    getPokemonDetail(pokemon.nombreApi ?? pokemon.id)
      .then(async (d) => {
        // Resolvemos nombres de habilidades en español en paralelo
        const habilidadesEs = await Promise.all(
          d.habilidades.map(async (h) => ({
            ...h,
            nombre: await getNombreHabilidadEs(h.urlHabilidad, h.nombre),
          }))
        );
        const detalleEnriquecido = { ...d, habilidades: habilidadesEs };
        setDetalle(detalleEnriquecido);
        const esp = await getEspecie(d.urlEspecie);
        setEspecie(esp);
        const evo = await getCadenaEvolutiva(esp.urlCadenaEvolutiva);
        setEvolucion(evo);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [pokemon?.id]);

  return (
    <AnimatePresence>
      {pokemon && (
        <motion.aside
          key="detalle"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(520px, 100vw)',
            background: 'rgba(7, 7, 16, 0.95)',
            backdropFilter: 'blur(48px)',
            WebkitBackdropFilter: 'blur(48px)',
            borderLeft: '1px solid var(--border-glass)',
            overflowY: 'auto', zIndex: 100,
            display: 'flex', flexDirection: 'column',
          }}
          role="complementary"
          aria-label={`Detalles de ${pokemon.nombre}`}
        >
          {/* Botón cerrar */}
          <button
            onClick={onCerrar}
            aria-label="Cerrar panel"
            style={{
              position: 'sticky', top: '12px',
              alignSelf: 'flex-end', marginRight: '14px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid var(--border-glass)',
              borderRadius: '50%', width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)',
              zIndex: 10, transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background='var(--accent)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='var(--text-secondary)'; }}
          >
            <X size={15} />
          </button>

          {cargando || !detalle ? (
            <EstadoCarga nombre={pokemon.nombre} />
          ) : (
            <ContenidoDetalle
              detalle={detalle}
              especie={especie}
              evolucion={evolucion}
              shiny={shiny}
              juegoId={juegoId}
              onToggleShiny={() => setShiny((s) => !s)}
              onSeleccionar={onSeleccionar}
              tabActiva={tabActiva}
              setTabActiva={setTabActiva}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ── Estado de carga ── */
function EstadoCarga({ nombre }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '16px', color: 'var(--text-secondary)', padding: '40px',
    }}>
      <div className="spinner" />
      <span style={{ fontSize: '0.88rem' }}>Cargando {nombre}…</span>
    </div>
  );
}

/* ── Contenido principal ── */
function ContenidoDetalle({
  detalle, especie, evolucion,
  shiny, juegoId, onToggleShiny, onSeleccionar, tabActiva, setTabActiva,
}) {
  const colorPrimario = HEX_POR_TIPO[detalle.tipos[0]] ?? '#e63946';

  const movimientos = useMemo(
    () => filtrarMovimientos(detalle.movimientosRaw, juegoId),
    [detalle.movimientosRaw, juegoId]
  );

  const tabs = [
    { id: 'datos',         label: 'Datos',         Icon: Info },
    { id: 'estadisticas',  label: 'Estadísticas',  Icon: BarChart2 },
    { id: 'evolucion',     label: 'Evolución',      Icon: GitMerge },
    { id: 'movimientos',   label: 'Movimientos',    Icon: BookOpen },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Hero */}
      <div style={{
        position: 'relative', padding: '4px 24px 20px',
        background: `linear-gradient(180deg, rgba(${hexToRgb(colorPrimario)},0.2) 0%, transparent 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      }}>
        <span className="poke-number" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          #{String(detalle.id).padStart(3, '0')}
        </span>

        <AnimatePresence mode="wait">
          <motion.img
            key={shiny ? 'shiny' : 'normal'}
            src={shiny ? detalle.imagenShiny : detalle.imagen}
            alt={detalle.nombre}
            initial={{ opacity: 0, scale: 0.82, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.88, rotate: 4 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '160px', height: '160px', objectFit: 'contain',
              filter: `drop-shadow(0 10px 30px ${colorPrimario}55)`,
            }}
          />
        </AnimatePresence>

        <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          {detalle.nombre}
        </h2>

        {especie?.categoria && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '-6px' }}>
            {especie.categoria}
          </span>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {detalle.tipos.map((t) => (
            <span key={t} className="type-badge" style={{ backgroundColor: COLOR_POR_TIPO[t] }}>
              {t}
            </span>
          ))}
        </div>

        <button
          onClick={onToggleShiny}
          style={{
            padding: '5px 16px',
            background: shiny ? 'rgba(245,208,32,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${shiny ? '#f5d020' : 'var(--border-glass)'}`,
            borderRadius: '999px',
            color: shiny ? '#f5d020' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.75rem',
            fontFamily: 'var(--font-main)', fontWeight: 600, transition: 'all 0.2s',
          }}
        >
          ✨ {shiny ? 'Viendo forma Variocolor' : 'Ver forma Variocolor'}
        </button>
      </div>

      {/* Tabs */}
      <div className="detail-tabs" style={{ margin: '0 12px' }}>
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`detail-tab${tabActiva === id ? ' active' : ''}`}
            onClick={() => setTabActiva(id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Icon size={11} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tabActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          style={{ padding: '14px 18px 32px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}
        >
          {tabActiva === 'datos' && (
            <TabDatos detalle={detalle} especie={especie} />
          )}
          {tabActiva === 'estadisticas' && (
            <TabEstadisticas detalle={detalle} colorPrimario={colorPrimario} juegoId={juegoId} />
          )}
          {tabActiva === 'evolucion' && (
            <TabEvolucion
              evolucion={evolucion}
              detalle={detalle}
              colorPrimario={colorPrimario}
              onSeleccionar={onSeleccionar}
            />
          )}
          {tabActiva === 'movimientos' && (
            <TabMovimientos movimientos={movimientos} juegoId={juegoId} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Tab Datos ── */
function TabDatos({ detalle, especie }) {
  return (
    <>
      {especie?.descripcion && (
        <p style={{
          fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '13px',
        }}>
          {especie.descripcion}
        </p>
      )}

      {/* Medidas */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {[
          { etiqueta: 'Altura',    valor: `${detalle.altura} m` },
          { etiqueta: 'Peso',      valor: `${detalle.peso} kg` },
          { etiqueta: 'Exp. base', valor: detalle.experienciaBase ?? '—' },
        ].map(({ etiqueta, valor }) => (
          <TarjetaDato key={etiqueta} etiqueta={etiqueta} valor={valor} />
        ))}
      </div>

      {/* Datos de especie */}
      {especie && (
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { etiqueta: 'Tasa captura', valor: especie.tasaCaptura ?? '—' },
            { etiqueta: 'Felicidad',    valor: especie.felicidadBase ?? '—' },
          ].map(({ etiqueta, valor }) => (
            <TarjetaDato key={etiqueta} etiqueta={etiqueta} valor={valor} />
          ))}
        </div>
      )}

      {/* Habilidades */}
      <TituloSeccion>Habilidades</TituloSeccion>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '-8px' }}>
        {detalle.habilidades.map((h) => (
          <span key={h.nombre} style={{
            padding: '5px 12px',
            background: h.oculta ? 'rgba(245,208,32,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${h.oculta ? 'rgba(245,208,32,0.35)' : 'var(--border-glass)'}`,
            borderRadius: '999px', fontSize: '0.77rem',
            color: h.oculta ? '#f5d020' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {h.oculta && <span title="Habilidad oculta">✦</span>}
            {h.nombre}
          </span>
        ))}
      </div>
    </>
  );
}

/* ── Tab Estadísticas ── */
function TabEstadisticas({ detalle, colorPrimario, juegoId }) {
  const genUno = esGenI(juegoId);

  // En Gen I, unificamos At. Esp. y Def. Esp. en "Especial"
  const stats = genUno
    ? detalle.estadisticas
        .filter((s) => s.nombreApi !== 'special-defense')
        .map((s) =>
          s.nombreApi === 'special-attack'
            ? { ...s, nombre: 'Especial' }
            : s
        )
    : detalle.estadisticas;

  const total = stats.reduce((acc, s) => acc + s.valor, 0);

  return (
    <>
      {genUno && (
        <div style={{
          padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem',
          background: 'rgba(245,208,32,0.08)', border: '1px solid rgba(245,208,32,0.25)',
          color: '#f5d020',
        }}>
          ⚠️ En Generación I, Ataque Especial y Defensa Especial eran un único stat: <strong>Especial</strong>.
        </div>
      )}

      <TituloSeccion>Estadísticas base</TituloSeccion>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-8px' }}>
        {stats.map((s) => (
          <div key={s.nombre}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                {STAT_ICONS[s.nombre] ?? null}
                {s.nombre}
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.valor}</span>
            </div>
            <div className="stat-bar-track">
              <motion.div
                className="stat-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((s.valor / 255) * 100, 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                style={{ backgroundColor: barColor(s.valor) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px', marginTop: '-4px',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total</span>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: colorPrimario }}>{total}</span>
      </div>
    </>
  );
}

/* ── Tab Evolución ── */
function TabEvolucion({ evolucion, detalle, colorPrimario, onSeleccionar }) {
  if (evolucion.length <= 1) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px' }}>
        Este Pokémon no tiene evoluciones conocidas.
      </div>
    );
  }

  return (
    <>
      <TituloSeccion>Cadena evolutiva</TituloSeccion>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '-6px' }}>
        {evolucion.map((evo, i) => (
          <div key={evo.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
            {i > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>↓</span>
                {evo.metodo && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px', padding: '3px 10px',
                    textAlign: 'center', maxWidth: '320px',
                  }}>
                    {evo.metodo}
                  </span>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSeleccionar(evo)}
              style={{
                background: detalle.id === evo.id
                  ? `rgba(${hexToRgb(colorPrimario)}, 0.15)`
                  : 'rgba(255,255,255,0.04)',
                border: detalle.id === evo.id
                  ? `1px solid ${colorPrimario}`
                  : '1px solid var(--border-glass)',
                borderRadius: '16px', padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', transition: 'all 0.2s',
              }}
              aria-label={`Ver ${evo.nombre}`}
            >
              <img
                src={evo.imagen} alt={evo.nombre}
                style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                <span className="poke-number">#{String(evo.id).padStart(3, '0')}</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {evo.nombre}
                </span>
                {detalle.id === evo.id && (
                  <span style={{ fontSize: '0.68rem', color: colorPrimario, fontWeight: 600 }}>
                    ← Seleccionado ahora
                  </span>
                )}
              </div>
            </motion.button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Tab Movimientos ── */
function TabMovimientos({ movimientos, juegoId }) {
  const [metodoActivo, setMetodoActivo] = useState('nivelUp');
  const [nombresEs, setNombresEs]       = useState({});

  useEffect(() => {
    if (!movimientos) return;
    
    // Solo traducimos los movimientos del método activo para no saturar
    const lista = movimientos[metodoActivo] || [];
    
    lista.forEach(async (mov) => {
      if (nombresEs[mov.urlApi]) return;
      const nombreEs = await getNombreMovimientoEs(mov.urlApi, mov.nombre);
      setNombresEs(prev => ({ ...prev, [mov.urlApi]: nombreEs }));
    });
  }, [movimientos, metodoActivo]);

  if (!juegoId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', padding: '28px 16px',
        color: 'var(--text-secondary)', textAlign: 'center',
      }}>
        <BookOpen size={32} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
          Selecciona un juego en la parte superior de la Pokédex para ver los movimientos disponibles en ese título.
        </p>
      </div>
    );
  }

  if (!movimientos) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px' }}>
        Sin datos de movimientos para este juego.
      </div>
    );
  }

  const secciones = [
    { key: 'nivelUp', label: 'Por nivel' },
    { key: 'maquina', label: 'MT / MO' },
    { key: 'huevo',   label: 'Por huevo' },
    { key: 'tutor',   label: 'Tutor' },
  ].filter(({ key }) => movimientos[key]?.length > 0);

  if (!secciones.length) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px' }}>
        Este Pokémon no tiene movimientos registrados en este juego.
      </div>
    );
  }

  const activo = secciones.find((s) => s.key === metodoActivo) ? metodoActivo : secciones[0].key;
  const lista = movimientos[activo] ?? [];

  return (
    <>
      {/* Sub-tabs de métodos */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {secciones.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetodoActivo(key)}
            style={{
              padding: '5px 12px', borderRadius: '999px',
              border: '1px solid var(--border-glass)',
              background: activo === key ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
              color: activo === key ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-main)', fontSize: '0.73rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
          >
            {label}
            <span style={{ marginLeft: '5px', opacity: 0.7, fontSize: '0.65rem' }}>
              ({movimientos[key].length})
            </span>
          </button>
        ))}
      </div>

      {/* Lista de movimientos */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        maxHeight: '340px', overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {lista.map((mov, i) => (
          <div key={`${mov.nombre}-${i}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 12px',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {nombresEs[mov.urlApi] || mov.nombre}
            </span>
            {activo === 'nivelUp' && mov.nivel > 0 && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)',
                background: 'rgba(230,57,70,0.1)',
                border: '1px solid rgba(230,57,70,0.2)',
                borderRadius: '6px', padding: '2px 7px',
              }}>
                Nv. {mov.nivel}
              </span>
            )}
            {activo === 'nivelUp' && mov.nivel === 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>inicial</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Sub-componentes reutilizables ── */

function TarjetaDato({ etiqueta, valor }) {
  return (
    <div style={{
      flex: 1, padding: '11px', textAlign: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {etiqueta}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{valor}</div>
    </div>
  );
}

function TituloSeccion({ children }) {
  return (
    <h3 style={{
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--accent)',
    }}>
      {children}
    </h3>
  );
}
