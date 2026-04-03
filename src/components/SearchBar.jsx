/**
 * SearchBar.jsx — v2 Premium
 * Barra de búsqueda protagonista con animaciones y glow.
 */
import { useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ valor, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className="searchbar-wrapper" onClick={() => inputRef.current?.focus()}>
      <div className="searchbar-inner">
        {/* Glow de fondo cuando hay texto */}
        <div className={`searchbar-glow ${valor ? 'active' : ''}`} />

        {/* Icono lupa */}
        <Search
          size={18}
          className="searchbar-icon"
          style={{ color: valor ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.25s' }}
        />

        <input
          ref={inputRef}
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar Pokémon por nombre o número..."
          className="searchbar-input"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Botón limpiar */}
        {valor && (
          <button
            className="searchbar-clear"
            onClick={e => { e.stopPropagation(); onChange(''); inputRef.current?.focus(); }}
            aria-label="Limpiar búsqueda"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
