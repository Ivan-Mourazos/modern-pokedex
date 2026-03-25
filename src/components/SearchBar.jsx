/**
 * SearchBar.jsx — Barra de búsqueda con efecto glassmorphism
 * Filtra los Pokémon por nombre o número al escribir.
 */
import { Search, X } from 'lucide-react';

export default function SearchBar({ valor, onChange }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
    }}>
      {/* Icono de lupa */}
      <Search
        size={18}
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)',
          pointerEvents: 'none',
        }}
      />

      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar Pokémon por nombre o número..."
        style={{
          width: '100%',
          padding: '12px 44px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
          borderRadius: '999px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-main)',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.background = 'rgba(255,255,255,0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-glass)';
          e.target.style.background = 'rgba(255,255,255,0.05)';
        }}
      />

      {/* Botón de limpiar búsqueda */}
      {valor && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '50%',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          aria-label="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
