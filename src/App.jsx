/**
 * App.jsx — Componente raíz del Pokédex
 * Gestiona: carga inicial, búsqueda, selección y panel de detalle.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonList, getPokemonDetail } from './api/pokeApi';
import SearchBar from './components/SearchBar';
import Carousel from './components/Carousel';
import PokemonDetail from './components/PokemonDetail';

export default function App() {
  const [listaPokemon, setListaPokemon]       = useState([]);
  const [cargando, setCargando]               = useState(true);
  const [busqueda, setBusqueda]               = useState('');
  const [seleccionado, setSeleccionado]       = useState(null);

  // Carga la lista base al montar (151 Pokémon de Kanto + tipos)
  useEffect(() => {
    async function cargarLista() {
      try {
        setCargando(true);
        // Primero cargamos la lista básica (id, nombre, imagen)
        const lista = await getPokemonList(151);

        // Enriquecemos con los tipos en paralelo (en lotes de 20 para no saturar la API)
        const enriquecidos = await Promise.all(
          lista.map((p) =>
            getPokemonDetail(p.id)
              .then((d) => ({ ...p, tipos: d.tipos }))
              .catch(() => ({ ...p, tipos: ['Normal'] }))
          )
        );

        setListaPokemon(enriquecidos);
      } catch (err) {
        console.error('Error al cargar Pokémon:', err);
      } finally {
        setCargando(false);
      }
    }

    cargarLista();
  }, []);

  // Filtra la lista según la búsqueda (por nombre o número)
  const pokemonFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return listaPokemon;
    return listaPokemon.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        String(p.id).padStart(3, '0').includes(q)
    );
  }, [busqueda, listaPokemon]);

  // Al seleccionar desde la evolución, busca el Pokémon en la lista o lo añade
  function handleSeleccionarEvolucion(poke) {
    const enLista = listaPokemon.find((p) => p.id === poke.id);
    setSeleccionado(enLista ?? poke);
  }

  const panelAbierto = seleccionado !== null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      // Desplazar contenido a la izquierda cuando el panel está abierto
      transition: 'padding-right 0.4s cubic-bezier(0.4,0,0.2,1)',
      paddingRight: panelAbierto ? 'min(420px, 100vw)' : '0',
    }}>
      {/* ── Encabezado ── */}
      <header style={{
        padding: '32px 40px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Logo / Título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}
        >
          <span style={{ fontSize: '2rem' }}>⚡</span>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Pokédex
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}
        >
          {cargando
            ? 'Cargando Pokémon…'
            : `${listaPokemon.length} Pokémon · Generación I`}
        </motion.p>

        {/* Barra de búsqueda */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <SearchBar valor={busqueda} onChange={setBusqueda} />
        </motion.div>
      </header>

      {/* ── Cuerpo principal ── */}
      <main style={{ flex: 1, padding: '16px 0 40px' }}>
        <AnimatePresence mode="wait">
          {cargando ? (
            <motion.div
              key="cargando"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
                gap: '16px',
                color: 'var(--text-secondary)',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ fontSize: '3rem' }}
              >
                ⚙️
              </motion.div>
              <span style={{ fontSize: '0.9rem' }}>Conectando con la Pokédex…</span>
            </motion.div>
          ) : (
            <motion.div
              key="carrusel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Carousel
                pokemons={pokemonFiltrados}
                seleccionado={seleccionado}
                onSeleccionar={setSeleccionado}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Panel lateral de detalles ── */}
      <PokemonDetail
        pokemon={seleccionado}
        onCerrar={() => setSeleccionado(null)}
        onSeleccionar={handleSeleccionarEvolucion}
      />

      {/* ── Pie de página ── */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        color: 'var(--text-muted)',
        fontSize: '0.72rem',
        borderTop: '1px solid var(--border-glass)',
      }}>
        Datos obtenidos de{' '}
        <a
          href="https://pokeapi.co"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          PokéAPI
        </a>
        {' '}· Pokémon es marca de Nintendo / Game Freak
      </footer>
    </div>
  );
}
