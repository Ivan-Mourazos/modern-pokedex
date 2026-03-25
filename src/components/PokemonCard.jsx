/**
 * PokemonCard.jsx — Tarjeta glassmorphic para cada Pokémon en el carrusel
 * Muestra imagen oficial, nombre, número y tipos con color dinámico.
 */
import { motion } from 'framer-motion';
import { COLOR_POR_TIPO } from '../api/pokeApi';

// Color de fondo dominante según el primer tipo del Pokémon
function getBgGradient(tipos) {
  const color = COLOR_POR_TIPO[tipos[0]] ?? 'var(--accent)';
  return `radial-gradient(ellipse at top, ${color}22 0%, transparent 70%)`;
}

export default function PokemonCard({ pokemon, seleccionado, onClick }) {
  const esSeleccionado = seleccionado?.id === pokemon.id;

  return (
    <motion.div
      onClick={() => onClick(pokemon)}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        cursor: 'pointer',
        background: esSeleccionado
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: esSeleccionado
          ? '1px solid var(--accent)'
          : '1px solid var(--border-glass)',
        borderRadius: '20px',
        padding: '20px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '160px',
        minWidth: '160px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: esSeleccionado
          ? '0 0 24px var(--accent-glow)'
          : 'var(--shadow-card)',
        backgroundImage: getBgGradient(pokemon.tipos ?? ['Normal']),
      }}
      aria-label={`Ver detalles de ${pokemon.nombre}`}
      aria-pressed={esSeleccionado}
    >
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
          width: '96px',
          height: '96px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}
        onError={(e) => { e.target.src = pokemon.imagenDefault; }}
      />

      {/* Nombre */}
      <span style={{
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
        textAlign: 'center',
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
