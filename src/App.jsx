/**
 * App.jsx — v4
 * - Generaciones I–IX completas
 * - Selector de juego sincronizado con la generación correspondiente
 *   (los remakes muestran los Pokémon de la región original)
 * - Carga en lotes para no saturar la API
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPokemonList, getPokemonDetail,
  GENERACIONES, JUEGOS, JUEGOS_PLANA, JUEGO_A_GEN,
  TODOS_LOS_TIPOS, COLOR_POR_TIPO, HEX_POR_TIPO,
} from './api/pokeApi';
import SearchBar from './components/SearchBar';
import PokemonGrid from './components/PokemonGrid';
import PokemonDetail from './components/PokemonDetail';

// Carga en lotes para no saturar la API
async function enriquecerEnLotes(lista, tamLote = 20) {
  const resultado = [];
  for (let i = 0; i < lista.length; i += tamLote) {
    const lote = lista.slice(i, i + tamLote);
    const loteEnriquecido = await Promise.all(
      lote.map((p) =>
        getPokemonDetail(p.id)
          .then((d) => ({ ...p, tipos: d.tipos }))
          .catch(() => ({ ...p, tipos: ['Normal'] }))
      )
    );
    resultado.push(...loteEnriquecido);
  }
  return resultado;
}

export default function App() {
  const [listaPokemon, setListaPokemon] = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [genActiva, setGenActiva]       = useState(1);
  const [tipoFiltro, setTipoFiltro]     = useState(null);
  const [juegoId, setJuegoId]           = useState('');

  const juegoLabel = juegoId
    ? JUEGOS_PLANA.find((j) => j.id === juegoId)?.label?.replace(' ★', '') ?? juegoId
    : null;

  // ── Sincronización juego ↔ generación ────────────────────

  // Al seleccionar un juego → cambiar automáticamente la generación
  function handleSeleccionarJuego(nuevoJuegoId) {
    setJuegoId(nuevoJuegoId);
    if (nuevoJuegoId) {
      const gen = JUEGO_A_GEN[nuevoJuegoId];
      if (gen && gen !== genActiva) {
        setGenActiva(gen);
      }
    }
  }

  // Al cambiar la generación manualmente → limpiar juego solo si no coincide
  function handleSeleccionarGen(nuevaGen) {
    if (nuevaGen === genActiva) return;
    setGenActiva(nuevaGen);
    // Si el juego activo no pertenece a esta gen, lo limpiamos
    if (juegoId && JUEGO_A_GEN[juegoId] !== nuevaGen) {
      setJuegoId('');
    }
  }

  // ── Carga de Pokémon ──────────────────────────────────────

  const cargarGen = useCallback(async (genId) => {
    const gen = GENERACIONES.find((g) => g.id === genId);
    if (!gen) return;
    setCargando(true);
    setListaPokemon([]);
    setSeleccionado(null);
    setTipoFiltro(null);
    setBusqueda('');
    try {
      const lista = await getPokemonList(gen.limit, gen.offset);
      const enriquecidos = await enriquecerEnLotes(lista, 20);
      setListaPokemon(enriquecidos);
    } catch (err) {
      console.error('Error al cargar generación:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarGen(genActiva); }, [genActiva, cargarGen]);

  // ── Filtros ───────────────────────────────────────────────

  const pokemonFiltrados = useMemo(() => {
    let res = listaPokemon;
    if (tipoFiltro) res = res.filter((p) => p.tipos?.includes(tipoFiltro));
    const q = busqueda.trim().toLowerCase();
    if (q) res = res.filter(
      (p) => p.nombre.toLowerCase().includes(q) || String(p.id).padStart(3, '0').includes(q)
    );
    return res;
  }, [busqueda, tipoFiltro, listaPokemon]);

  function handleSeleccionarEvolucion(poke) {
    const enLista = listaPokemon.find((p) => p.id === poke.id);
    setSeleccionado(enLista ?? poke);
  }

  const panelAbierto = seleccionado !== null;
  const colorOrbe = seleccionado?.tipos?.[0]
    ? HEX_POR_TIPO[seleccionado.tipos[0]] ?? '#e63946'
    : '#e63946';

  const genLabel = GENERACIONES.find((g) => g.id === genActiva)?.label ?? '';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      position: 'relative',
      transition: 'padding-right 0.4s cubic-bezier(0.4,0,0.2,1)',
      paddingRight: panelAbierto ? 'min(var(--sidebar-w), 100vw)' : '0',
    }}>
      {/* Orbes de fondo */}
      <div className="bg-orb" style={{
        width: '600px', height: '600px',
        top: '-200px',
        right: panelAbierto ? 'calc(min(var(--sidebar-w), 100vw) - 80px)' : '-100px',
        background: colorOrbe,
        transition: 'background 1s ease, right 0.4s ease',
      }} />
      <div className="bg-orb" style={{
        width: '350px', height: '350px',
        bottom: '0', left: '-80px',
        background: '#4da8ff', opacity: 0.1,
      }} />

      {/* ── Encabezado ── */}
      <header className="app-header">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
        >
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent) 50%, #fff 50%)',
            border: '3px solid #fff',
            boxShadow: '0 0 24px var(--accent-glow)',
            position: 'relative', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: '10px', height: '10px',
              borderRadius: '50%', background: '#fff', border: '2px solid #888',
            }} />
          </div>
          <h1 style={{
            fontSize: 'clamp(1.7rem, 4vw, 2.6rem)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #fff 0%, rgba(230,57,70,0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}>
            Pokédex
          </h1>
        </motion.div>

        {/* Selector de juego + generación */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}
        >
          {/* Selector de juego */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '0.72rem', color: 'var(--text-muted)',
              fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Juego
            </span>
            <div className="juego-select-wrap">
              <select
                className="juego-select"
                value={juegoId}
                onChange={(e) => handleSeleccionarJuego(e.target.value)}
                aria-label="Seleccionar juego"
              >
                <option value="">— Sin filtro de juego —</option>
                {JUEGOS.map((grupo) => (
                  <optgroup key={grupo.grupo} label={grupo.grupo}>
                    {grupo.juegos.map((j) => (
                      <option key={j.id} value={j.id}>{j.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="juego-select-arrow">▾</span>
            </div>
            {juegoId && (
              <button
                onClick={() => setJuegoId('')}
                title="Quitar filtro de juego"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1,
                  padding: '4px', borderRadius: '50%',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            )}
          </div>

          {/* Nota de remake */}
          {juegoId && JUEGO_A_GEN[juegoId] && (
            <AnimatePresence mode="wait">
              <motion.div
                key={juegoId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>⬡</span>
                Mostrando Pokémon de {genLabel}
                {['firered-leafgreen','heartgold-soulsilver','omegaruby-alphasapphire','brilliant-diamond-and-shining-pearl','legends-arceus'].includes(juegoId) && (
                  <span style={{ color: 'var(--text-muted)' }}>(remake)</span>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Tabs de generación */}
          <div className="gen-tabs" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {GENERACIONES.map((g) => (
              <button
                key={g.id}
                className={`gen-tab${genActiva === g.id ? ' active' : ''}`}
                onClick={() => handleSeleccionarGen(g.id)}
                title={`Ver Pokémon de ${g.label}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Contador */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '10px' }}
        >
          {cargando
            ? `Cargando ${genLabel}…`
            : `${pokemonFiltrados.length} de ${listaPokemon.length} Pokémon`}
          {juegoLabel && !cargando && (
            <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>· {juegoLabel}</span>
          )}
        </motion.p>

        {/* Barra de búsqueda */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '16px' }}
        >
          <SearchBar valor={busqueda} onChange={setBusqueda} />
        </motion.div>

        {/* Filtro por tipo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="type-filter-bar"
          style={{ marginBottom: '20px' }}
        >
          <button
            className={`type-filter-btn${tipoFiltro === null ? ' active' : ''}`}
            style={tipoFiltro === null
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
              : {}}
            onClick={() => setTipoFiltro(null)}
          >
            Todos
          </button>
          {TODOS_LOS_TIPOS.map((tipo) => (
            <button
              key={tipo}
              className={`type-filter-btn${tipoFiltro === tipo ? ' active' : ''}`}
              style={tipoFiltro === tipo
                ? { background: COLOR_POR_TIPO[tipo], borderColor: COLOR_POR_TIPO[tipo] }
                : {}}
              onClick={() => setTipoFiltro(tipoFiltro === tipo ? null : tipo)}
            >
              {tipo}
            </button>
          ))}
        </motion.div>
      </header>

      {/* ── Cuerpo ── */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {cargando ? (
            <motion.div
              key="cargando"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '40vh', gap: '20px', color: 'var(--text-secondary)',
              }}
            >
              <div className="spinner" />
              <span style={{ fontSize: '0.88rem' }}>Cargando {genLabel}…</span>
            </motion.div>
          ) : (
            <motion.div
              key={`gen-${genActiva}-${tipoFiltro}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PokemonGrid
                pokemons={pokemonFiltrados}
                seleccionado={seleccionado}
                onSeleccionar={setSeleccionado}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Panel lateral ── */}
      <PokemonDetail
        pokemon={seleccionado}
        juegoId={juegoId}
        onCerrar={() => setSeleccionado(null)}
        onSeleccionar={handleSeleccionarEvolucion}
      />

      {/* ── Pie ── */}
      <footer style={{
        textAlign: 'center', padding: '16px',
        color: 'var(--text-muted)', fontSize: '0.72rem',
        borderTop: '1px solid var(--border-glass)',
        position: 'relative', zIndex: 1,
      }}>
        Datos de{' '}
        <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          PokéAPI
        </a>
        {' '}· Pokémon es marca de Nintendo / Game Freak
      </footer>
    </div>
  );
}
