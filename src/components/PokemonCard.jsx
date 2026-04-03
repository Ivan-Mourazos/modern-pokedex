/**
 * PokemonCard.jsx — Tarjeta glassmorphic mejorada
 * Gradiente dinámico por tipo, nummer prominente, micro-animaciones.
 */
import { motion } from 'framer-motion';
import { COLOR_POR_TIPO, HEX_POR_TIPO } from '../api/pokeApi';

export default function PokemonCard({ pokemon, seleccionado, onClick }) {
  const esSeleccionado = seleccionado?.id === pokemon.id;
  const colorPrimario = HEX_POR_TIPO[pokemon.tipos?.[0]] ?? '#e63946';

  return (
    <motion.button
      type="button"
      onClick={() => onClick(pokemon)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`pokemon-card${esSeleccionado ? ' selected' : ''}`}
      style={{
        appearance: 'none',
        textAlign: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        '--card-selected-bg': `rgba(${hexToRgb(colorPrimario)}, 0.12)`,
        '--card-selected-color': colorPrimario,
        '--card-selected-glow': `${colorPrimario}44`,
        backgroundImage: `radial-gradient(ellipse at top, ${colorPrimario}1e 0%, transparent 65%)`,
      }}
      aria-label={`Ver detalles de ${pokemon.nombre}`}
      aria-pressed={esSeleccionado}
    >
      {/* Destellos de fondo */}
      <div style={{
        position: 'absolute',
        top: '-20px', right: '-20px',
        width: '80px', height: '80px',
        background: `radial-gradient(circle, ${colorPrimario}18, transparent 70%)`,
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <span className="poke-number">
        #{String(pokemon.id).padStart(3, '0')}
      </span>

      <img
        src={pokemon.imagen}
        alt={pokemon.nombre}
        loading="lazy"
        className="pokemon-card-image"
        style={{
          filter: `drop-shadow(0 4px 14px ${colorPrimario}55)`,
        }}
        onError={(e) => { e.target.src = pokemon.imagenDefault; }}
      />

      {/* Nombre y Tipos (Contenedor con altura mínima) */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        minHeight: '60px',
        justifyContent: 'center'
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: '0.83rem',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.2,
          fontFamily: 'var(--font-main)'
        }}>
          {pokemon.nombre}
        </span>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(pokemon.tipos ?? []).map((tipo) => (
            <span
              key={tipo}
              className="type-badge"
              style={{ backgroundColor: COLOR_POR_TIPO[tipo] ?? '#888' }}
            >
              {tipo}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

// Utilidad para convertir hex a rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
