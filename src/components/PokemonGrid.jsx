/**
 * PokemonGrid.jsx — Grid limpio de tarjetas (sin detalle inline)
 */
import { motion } from 'framer-motion';
import PokemonCard from './PokemonCard';

export default function PokemonGrid({ pokemons, seleccionado, onSeleccionar }) {
  if (!pokemons.length) {
    return (
      <div style={{
        textAlign: 'center', color: 'var(--text-secondary)',
        padding: '80px 24px', fontSize: '0.95rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        <span style={{ fontSize: '2.5rem' }}>🔍</span>
        <span>No se encontraron Pokémon con ese criterio.</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Prueba con otro nombre, número o tipo.
        </span>
      </div>
    );
  }

  return (
    <div className="pokemon-grid">
      {pokemons.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.012, 0.4), duration: 0.28 }}
        >
          <PokemonCard
            pokemon={p}
            seleccionado={seleccionado}
            onClick={onSeleccionar}
          />
        </motion.div>
      ))}
    </div>
  );
}
