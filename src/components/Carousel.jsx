/**
 * Carousel.jsx — Carrusel de Pokémon con drag y navegación por teclado
 * Usa framer-motion para el arrastre fluido y las flechas laterales.
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PokemonCard from './PokemonCard';

const SCROLL_AMOUNT = 360; // píxeles que avanza cada clic de flecha

export default function Carousel({ pokemons, seleccionado, onSeleccionar }) {
  const trackRef = useRef(null);

  // Desplazamiento suave con las flechas
  function desplazar(dir) {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * SCROLL_AMOUNT, behavior: 'smooth' });
  }

  if (!pokemons.length) {
    return (
      <div style={{
        textAlign: 'center',
        color: 'var(--text-secondary)',
        padding: '60px 0',
        fontSize: '0.95rem',
      }}>
        No se encontraron Pokémon con ese criterio.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Flecha izquierda */}
      <ArrowButton dir={-1} onClick={() => desplazar(-1)} />

      {/* Pista deslizable */}
      <motion.div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBlock: '24px',
          paddingInline: '48px',
          scrollSnapType: 'x mandatory',
          cursor: 'grab',
          // Ocultar scrollbar visualmente
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        // Drag horizontal nativo de framer-motion
        drag="x"
        dragConstraints={trackRef}
        dragElastic={0.08}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {pokemons.map((p, i) => (
          <motion.div
            key={p.id}
            style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.35 }}
          >
            <PokemonCard
              pokemon={p}
              seleccionado={seleccionado}
              onClick={onSeleccionar}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Flecha derecha */}
      <ArrowButton dir={1} onClick={() => desplazar(1)} />

      {/* Efecto de desvanecimiento en los bordes */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(
          to right,
          var(--bg-base) 0%,
          transparent 80px,
          transparent calc(100% - 80px),
          var(--bg-base) 100%
        )`,
      }} />
    </div>
  );
}

/* ── Botón de flecha lateral ── */
function ArrowButton({ dir, onClick }) {
  const isLeft = dir === -1;
  return (
    <button
      onClick={onClick}
      aria-label={isLeft ? 'Anterior' : 'Siguiente'}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [isLeft ? 'left' : 'right']: '0px',
        zIndex: 10,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        transition: 'background 0.2s, color 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.borderColor = 'var(--border-glass)';
      }}
    >
      {isLeft ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}
