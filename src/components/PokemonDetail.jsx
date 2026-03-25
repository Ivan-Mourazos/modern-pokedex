/**
 * PokemonDetail.jsx — Panel lateral de detalles del Pokémon seleccionado
 * Muestra imagen shiny, estadísticas, habilidades y cadena evolutiva.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, Sword, Wind } from 'lucide-react';
import { getPokemonDetail, getCadenaEvolutiva, COLOR_POR_TIPO } from '../api/pokeApi';

// Icono UTILidad para cada estadística
const STAT_ICONS = {
  'PS':       <Zap size={13} />,
  'Ataque':   <Sword size={13} />,
  'Defensa':  <Shield size={13} />,
  'Velocidad':<Wind size={13} />,
};

// Color de la barra según el valor
function barColor(valor) {
  if (valor >= 100) return '#3dca6e';
  if (valor >= 60)  return '#f5d020';
  return '#ff5c35';
}

export default function PokemonDetail({ pokemon, onCerrar, onSeleccionar }) {
  const [detalle, setDetalle] = useState(null);
  const [evolucion, setEvolucion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [shiny, setShiny] = useState(false);

  // Carga los datos completos cada vez que cambia el Pokémon seleccionado
  useEffect(() => {
    if (!pokemon) return;
    setDetalle(null);
    setEvolucion([]);
    setShiny(false);
    setCargando(true);

    getPokemonDetail(pokemon.nombreApi ?? pokemon.id)
      .then(async (d) => {
        setDetalle(d);
        const evo = await getCadenaEvolutiva(d.urlEspecie);
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
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(420px, 100vw)',
            background: 'rgba(12, 12, 20, 0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderLeft: '1px solid var(--border-glass)',
            overflowY: 'auto',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
          role="complementary"
          aria-label={`Detalles de ${pokemon.nombre}`}
        >
          {/* Botón cerrar */}
          <button
            onClick={onCerrar}
            aria-label="Cerrar panel"
            style={{
              position: 'sticky',
              top: '16px',
              alignSelf: 'flex-end',
              marginRight: '16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-glass)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              zIndex: 10,
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <X size={16} />
          </button>

          {cargando || !detalle ? (
            <LoadingState nombre={pokemon.nombre} />
          ) : (
            <ContenidoDetalle
              detalle={detalle}
              evolucion={evolucion}
              shiny={shiny}
              onToggleShiny={() => setShiny((s) => !s)}
              onSeleccionar={onSeleccionar}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ── Estado de carga ── */
function LoadingState({ nombre }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      color: 'var(--text-secondary)', padding: '40px',
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ fontSize: '2.5rem' }}
      >
        ⚙️
      </motion.div>
      <span>Cargando {nombre}…</span>
    </div>
  );
}

/* ── Contenido principal del panel ── */
function ContenidoDetalle({ detalle, evolucion, shiny, onToggleShiny, onSeleccionar }) {
  const colorPrincipal = COLOR_POR_TIPO[detalle.tipos[0]] ?? 'var(--accent)';

  return (
    <div style={{ padding: '8px 24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado con imagen */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '20px',
        background: `radial-gradient(ellipse at top, ${colorPrincipal}25 0%, transparent 70%)`,
        borderRadius: '20px',
        border: '1px solid var(--border-glass)',
      }}>
        <span className="poke-number" style={{ fontSize: '0.8rem' }}>
          #{String(detalle.id).padStart(3, '0')}
        </span>

        <motion.img
          key={shiny ? 'shiny' : 'normal'}
          src={shiny ? detalle.imagenShiny : detalle.imagen}
          alt={detalle.nombre}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            width: '160px',
            height: '160px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
          }}
        />

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{detalle.nombre}</h2>

        {/* Tipos */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {detalle.tipos.map((t) => (
            <span key={t} className="type-badge" style={{ backgroundColor: COLOR_POR_TIPO[t] }}>
              {t}
            </span>
          ))}
        </div>

        {/* Botón shiny */}
        <button
          onClick={onToggleShiny}
          style={{
            marginTop: '4px',
            padding: '6px 16px',
            background: shiny ? 'rgba(245,208,32,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${shiny ? '#f5d020' : 'var(--border-glass)'}`,
            borderRadius: '999px',
            color: shiny ? '#f5d020' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-main)',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          ✨ {shiny ? 'Viendo shiny' : 'Ver shiny'}
        </button>
      </div>

      {/* Medidas */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { etiqueta: 'Altura', valor: `${detalle.altura} m` },
          { etiqueta: 'Peso',   valor: `${detalle.peso} kg` },
        ].map(({ etiqueta, valor }) => (
          <div key={etiqueta} style={{
            flex: 1, padding: '12px', textAlign: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '4px' }}>{etiqueta}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{valor}</div>
          </div>
        ))}
      </div>

      {/* Estadísticas base */}
      <SeccionTitulo>Estadísticas base</SeccionTitulo>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {detalle.estadisticas.map((s) => (
          <div key={s.nombre}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                {STAT_ICONS[s.nombre] ?? null}
                {s.nombre}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{s.valor}</span>
            </div>
            <div className="stat-bar-track">
              <motion.div
                className="stat-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((s.valor / 255) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ backgroundColor: barColor(s.valor) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Habilidades */}
      <SeccionTitulo>Habilidades</SeccionTitulo>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {detalle.habilidades.map((h) => (
          <span key={h} style={{
            padding: '5px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: '999px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Cadena evolutiva */}
      {evolucion.length > 1 && (
        <>
          <SeccionTitulo>Evoluciones</SeccionTitulo>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}>
            {evolucion.map((evo, i) => (
              <div key={evo.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSeleccionar(evo)}
                  style={{
                    background: detalle.id === evo.id
                      ? `radial-gradient(ellipse, ${colorPrincipal}30, transparent)`
                      : 'rgba(255,255,255,0.04)',
                    border: detalle.id === evo.id
                      ? `1px solid ${colorPrincipal}`
                      : '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '72px',
                    transition: 'all 0.2s',
                  }}
                  aria-label={`Ver ${evo.nombre}`}
                >
                  <img
                    src={evo.imagen}
                    alt={evo.nombre}
                    style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {evo.nombre}
                  </span>
                  <span className="poke-number">#{String(evo.id).padStart(3, '0')}</span>
                </motion.button>
                {/* Flecha entre evoluciones */}
                {i < evolucion.length - 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Título de sección reutilizable ── */
function SeccionTitulo({ children }) {
  return (
    <h3 style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      marginBottom: '-12px',
    }}>
      {children}
    </h3>
  );
}
