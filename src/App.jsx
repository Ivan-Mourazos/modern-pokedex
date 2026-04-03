/**
 * App.jsx — v5
 * - Sin generación cargada por defecto (modo buscador)
 * - Ancho máximo centrado con max-width
 * - Selector de Gen + Juego rediseñado y unificado
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  getPokemonList, getPokemonDetail, getPokemonByPokedex, getAllPokemonNames,
  GENERACIONES, JUEGOS, JUEGOS_PLANA, JUEGO_A_GEN,
  TODOS_LOS_TIPOS, COLOR_POR_TIPO, HEX_POR_TIPO,
} from './api/pokeApi';
import SearchBar from './components/SearchBar';
import PokemonGrid from './components/PokemonGrid';
import ExpandedDetail from './components/ExpandedDetail';
import MovesSearch from './components/MovesSearch';
import ItemsSearch from './components/ItemsSearch';
import { SkeletonGrid } from './components/Skeleton';

async function enriquecerEnLotes(lista, tamLote = 30) {
  const resultado = [];
  for (let i = 0; i < lista.length; i += tamLote) {
    const lote = lista.slice(i, i + tamLote);
    const loteEnriquecido = await Promise.allSettled(
      lote.map(p => getPokemonDetail(p.id).then(d => ({ ...p, tipos: d.tipos })))
    );
    loteEnriquecido.forEach((res, idx) => {
      resultado.push(res.status === 'fulfilled' ? res.value : { ...lote[idx], tipos: ['Normal'] });
    });
  }
  return resultado;
}

export default function App() {
  const [modo, setModo]             = useState('pokemon'); // 'pokemon' | 'movimientos' | 'objetos'
  const [listaPokemon, setListaPokemon] = useState([]);
  const [cargando, setCargando]         = useState(false);
  const [busqueda, setBusqueda]         = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [genActiva, setGenActiva]       = useState(null);
  const [juegoId, setJuegoId]           = useState('');
  const [tipoFiltro, setTipoFiltro]     = useState(null);
  const [errorCarga, setErrorCarga]     = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const debounceRef = useRef(null);
  const indiceRef   = useRef([]);          // [{id, nombre, nombreApi, imagen, imagenDefault}]
  const enriqueciendoRef = useRef(false);  // evita peticiones solapadas

  // ── Helpers ──────────────────────────────────────────────

  const hayFiltroActivo = genActiva !== null || juegoId !== '' || busqueda.trim().length >= 2;
  const juegoLabel = juegoId ? JUEGOS_PLANA.find(j => j.id === juegoId)?.label?.replace(' ★', '') ?? juegoId : null;
  const genLabel   = genActiva ? GENERACIONES.find(g => g.id === genActiva)?.label ?? '' : '';

  // Cargar el índice completo de nombres al montar (una vez, en background)
  useEffect(() => {
    getAllPokemonNames()
      .then(lista => { indiceRef.current = lista; })
      .catch(console.error);
  }, []);

  // ── Handlers de filtro ───────────────────────────────────

  function handleSeleccionarJuego(id) {
    setJuegoId(id);
    if (id) {
      const gen = JUEGO_A_GEN[id];
      if (gen) setGenActiva(gen);
    }
    setSeleccionado(null);
  }

  function handleSeleccionarGen(id) {
    setGenActiva(id === genActiva ? null : id);
    setJuegoId('');
    setSeleccionado(null);
  }

  function limpiarFiltros() {
    setGenActiva(null);
    setJuegoId('');
    setBusqueda('');
    setListaPokemon([]);
    setSeleccionado(null);
  }

  // Búsqueda incremental (sin gen/juego): filtra el índice local
  function handleBusqueda(valor) {
    setBusqueda(valor);
    if (genActiva || juegoId) return; // filtrado local en pokemonFiltrados, se aplica abajo

    clearTimeout(debounceRef.current);

    if (valor.trim().length < 2) {
      setListaPokemon([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const q = valor.trim().toLowerCase();
      const indice = indiceRef.current;

      if (!indice.length) {
        // Índice todavía no disponible → esperar y reintentar
        const lista = await getAllPokemonNames();
        indiceRef.current = lista;
      }

      // Filtrado: primero prioridad "empieza por", luego "contiene"
      const empiezaPor = indiceRef.current.filter(p =>
        p.nombreApi.startsWith(q) || p.nombre.toLowerCase().startsWith(q)
      );
      const contiene = indiceRef.current.filter(p =>
        !p.nombreApi.startsWith(q) &&
        !p.nombre.toLowerCase().startsWith(q) &&
        (p.nombreApi.includes(q) || p.nombre.toLowerCase().includes(q))
      );

      // Máx 60 resultados (30 + 30)
      const candidatos = [...empiezaPor.slice(0, 30), ...contiene.slice(0, 30)];

      if (!candidatos.length) {
        setListaPokemon([]);
        return;
      }

      // Mostrar inmediatamente sin tipos (para que aparezcan tarjetas rápido)
      setListaPokemon(candidatos);
      setCargando(true);

      // Enriquecer con tipos en background
      try {
        const enriquecidos = await enriquecerEnLotes(candidatos, 20);
        setListaPokemon(enriquecidos);
      } catch { /* mantener candidatos sin tipos */ }
      finally { setCargando(false); }
    }, 300);
  }

  // ── Carga de datos ────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    // Solo cargar si hay una gen o juego explícitamente seleccionado
    // La búsqueda libre usa su propio flujo (handleBusqueda)
    if (!genActiva && !juegoId) return;
    setCargando(true);
    setListaPokemon([]);
    setErrorCarga(null);
    try {
      let lista = [];
      if (juegoId) {
        const juego = JUEGOS_PLANA.find(j => j.id === juegoId);
        lista = await getPokemonByPokedex(juego.pokedexId);
      } else {
        const gen = GENERACIONES.find(g => g.id === genActiva);
        lista = await getPokemonList(gen.limit, gen.offset);
      }
      const enriquecidos = await enriquecerEnLotes(lista, 30);
      setListaPokemon(enriquecidos);
    } catch (err) {
      console.error(err);
      setErrorCarga('No se pudo conectar con la PokéAPI. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [genActiva, juegoId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    const s = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', s);
    return () => window.removeEventListener('scroll', s);
  }, []);

  // ── Filtro local (tipo + búsqueda) ────────────────────────

  const pokemonFiltrados = useMemo(() => {
    let res = listaPokemon;
    if (tipoFiltro) res = res.filter(p => p.tipos?.includes(tipoFiltro));
    const q = busqueda.trim().toLowerCase();
    if (q) res = res.filter(p =>
      p.nombre.toLowerCase().includes(q) || String(p.id).padStart(3, '0').includes(q)
    );
    return res;
  }, [busqueda, tipoFiltro, listaPokemon]);

  function handleSeleccionarEvolucion(poke) {
    const enLista = listaPokemon.find(p => p.id === poke.id);
    setSeleccionado(enLista ?? poke);
  }

  const colorOrbe = seleccionado?.tipos?.[0] ? HEX_POR_TIPO[seleccionado.tipos[0]] ?? '#e63946' : '#e63946';

  return (
    <LayoutGroup>
    <motion.div layout className="app-root">
      {/* Orbes decorativos */}
      <div className="bg-orb" style={{ width: '600px', height: '600px', top: '-200px', right: '-100px', background: colorOrbe, transition: 'background 1s ease' }} />
      <div className="bg-orb" style={{ width: '350px', height: '350px', bottom: '0', left: '-80px', background: '#4da8ff', opacity: 0.1 }} />

      {/* Botón volver arriba */}
      <AnimatePresence mode="popLayout">
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="scroll-top-btn"
            style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}
            aria-label="Volver arriba"
          >↑</motion.button>
        )}
      </AnimatePresence>

      {/* ── Contenedor centrado ── */}
      <div className="app-container">

        {/* ══ HEADER ══ */}
        <header className="app-header">

          {/* Logo */}
          <motion.div className="logo-container" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="pokeball-logo" />
            <h1 className="app-title">Pokédex</h1>
          </motion.div>

          {/* ── SELECTOR DE MODO ── */}
          <motion.div
            className="mode-selector"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          >
            {[
              { id: 'pokemon',      label: 'Pokémon',     icon: '⬡' },
              { id: 'movimientos',  label: 'Movimientos', icon: '⚡' },
              { id: 'objetos',      label: 'Objetos',     icon: '🎒' },
            ].map(m => (
              <button
                key={m.id}
                className={`mode-tab ${modo === m.id ? 'active' : ''}`}
                onClick={() => setModo(m.id)}
              >
                <span className="mode-tab-icon">{m.icon}</span>
                <span>{m.label}</span>
                {modo === m.id && <motion.div layoutId="mode-indicator" className="mode-indicator" />}
              </button>
            ))}
          </motion.div>

          {/* ── FILTROS POKÉMON (solo si modo pokemon) ── */}
          {modo === 'pokemon' && (
          <motion.div layout className="filter-block" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>

            {/* Fila superior: Gen + Juego */}
            <div className="filter-row-top">

              {/* Grupo Generación */}
              <div className="filter-group">
                <span className="filter-group-label">Generación</span>
                <div className="gen-pills-row">
                  {GENERACIONES.map(g => (
                    <button
                      key={g.id}
                      className={`gen-pill ${genActiva === g.id && !juegoId ? 'active' : ''}`}
                      onClick={() => handleSeleccionarGen(g.id)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="filter-divider" />

              {/* Grupo Juego */}
              <div className="filter-group filter-group-game">
                <span className="filter-group-label">Juego específico</span>
                <div className="game-selector-row">
                  <div className="juego-select-wrap">
                    <select
                      className="juego-select"
                      value={juegoId}
                      onChange={e => handleSeleccionarJuego(e.target.value)}
                      aria-label="Seleccionar juego"
                    >
                      <option value="">— Todos los juegos —</option>
                      {JUEGOS.map(grupo => (
                        <optgroup key={grupo.grupo} label={grupo.grupo}>
                          {grupo.juegos.map(j => (
                            <option key={j.id} value={j.id}>{j.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="juego-select-arrow">▾</span>
                  </div>
                  {hayFiltroActivo && (
                    <button className="clear-filter-btn" onClick={limpiarFiltros} title="Limpiar filtros">
                      ✕ Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chip de contexto activo */}
            <AnimatePresence>
              {hayFiltroActivo && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="active-filter-chip"
                >
                  <span className="chip-dot" />
                  <span>
                    {juegoLabel ? `Juego: ${juegoLabel}` : `Generación: ${genLabel}`}
                    {!cargando && ` · ${pokemonFiltrados.length} Pokémon`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          )}

          {/* Barra de búsqueda Pokémon + filtro de tipo (solo modo pokemon) */}
          {modo === 'pokemon' && (
            <motion.div layout>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '8px' }}
              >
                <SearchBar valor={busqueda} onChange={handleBusqueda} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="type-filter-bar" style={{ marginBottom: '20px' }}
              >
                <button
                  className={`type-filter-btn${tipoFiltro === null ? ' active' : ''}`}
                  style={tipoFiltro === null ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
                  onClick={() => setTipoFiltro(null)}
                >
                  Todos
                </button>
                {TODOS_LOS_TIPOS.map(tipo => (
                  <button
                    key={tipo}
                    className={`type-filter-btn${tipoFiltro === tipo ? ' active' : ''}`}
                    style={tipoFiltro === tipo ? { background: COLOR_POR_TIPO[tipo], borderColor: COLOR_POR_TIPO[tipo] } : {}}
                    onClick={() => setTipoFiltro(tipoFiltro === tipo ? null : tipo)}
                  >
                    {tipo}
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </header>

        {/* ── Modo Movimientos ── */}
        {modo === 'movimientos' && (
          <MovesSearch />
        )}

        {/* ── Modo Objetos ── */}
        {modo === 'objetos' && (
          <ItemsSearch />
        )}

        {/* ── Modo Pokémon ── */}
        {modo === 'pokemon' && (
          <motion.div layout>
        {/* ── Detalle expandido ── */}
        <AnimatePresence mode="popLayout">
          {seleccionado && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ padding: '0 0 12px', position: 'relative', zIndex: 4, overflow: 'hidden' }}
            >
              <ExpandedDetail
                pokemon={seleccionado}
                juegoId={juegoId}
                onCerrar={() => setSeleccionado(null)}
                onSeleccionar={handleSeleccionarEvolucion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cuerpo principal ── */}
        <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <AnimatePresence mode="wait">
            {!hayFiltroActivo ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="empty-state"
              >
                <div className="empty-state-icon">⬡</div>
                <h2 className="empty-state-title">Selecciona una generación o juego</h2>
                <p className="empty-state-sub">Usa los filtros de arriba para explorar la Pokédex o busca directamente por nombre</p>
              </motion.div>
            ) : errorCarga ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--accent)' }}
              >
                <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{errorCarga}</p>
                <button onClick={cargarDatos} className="type-filter-btn" style={{ marginTop: '16px', color: 'var(--text-primary)' }}>
                  Reintentar
                </button>
              </motion.div>
            ) : cargando ? (
              <motion.div
                key="skeleton-grid"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <SkeletonGrid count={20} />
              </motion.div>
            ) : (
              <motion.div
                key={`gen-${genActiva}-${juegoId}-${tipoFiltro}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <PokemonGrid
                  pokemons={pokemonFiltrados}
                  seleccionado={seleccionado}
                  onSeleccionar={handleSeleccionarEvolucion}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
          </motion.div>
        )}
      </div>

      {/* ── Footer ── */}
        <footer className="app-footer">
          Datos de{' '}
          <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a>
          {' '}· Pokémon es marca de Nintendo / Game Freak
        </footer>
      </motion.div>
    </LayoutGroup>
  );
}
