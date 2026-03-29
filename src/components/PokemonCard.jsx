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
    <motion.div
      onClick={() => onClick(pokemon)}
      whileHover={{ scale: 1.05, y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      style={{
        cursor: 'pointer',
        background: esSeleccionado
          ? `rgba(${hexToRgb(colorPrimario)}, 0.12)`
          : 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: esSeleccionado
          ? `1px solid ${colorPrimario}`
          : '1px solid var(--border-glass)',
        borderRadius: '20px',
        padding: '18px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '7px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: esSeleccionado
          ? `0 0 28px ${colorPrimario}44`
          : '0 6px 24px rgba(0,0,0,0.4)',
        backgroundImage: `radial-gradient(ellipse at top, ${colorPrimario}1e 0%, transparent 65%)`,
        width: '100%',
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

      {/* Número */}
      <span className="poke-number">
        #{String(pokemon.id).padStart(3, '0')}
      </span>

      {/* Imagen oficial */}
      <img
        src={pokemon.imagen}
        alt={pokemon.nombre}
        loading="lazy"
        style={{
          width: '90px',
          height: '90px',
          objectFit: 'contain',
          filter: `drop-shadow(0 4px 14px ${colorPrimario}55)`,
        }}
        onError={(e) => { e.target.src = pokemon.imagenDefault; }}
      />

      {/* Nombre */}
      <span style={{
        fontWeight: 700,
        fontSize: '0.83rem',
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {pokemon.nombre}
      </span>

      {/* Badges de tipo */}
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
    </motion.div>
  );
}

// Utilidad para convertir hex a rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
