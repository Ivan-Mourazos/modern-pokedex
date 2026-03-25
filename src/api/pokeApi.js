/**
 * pokeApi.js — Capa de acceso a PokeAPI
 * Centraliza todas las llamadas de red para mantener los componentes limpios.
 */

const BASE_URL = 'https://pokeapi.co/api/v2';

// Caché en memoria para evitar peticiones duplicadas durante la sesión
const cache = new Map();

async function fetchCached(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al cargar: ${url}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

/**
 * Obtiene la lista básica de Pokémon con id, nombre e imagen oficial.
 * @param {number} limit  Cantidad de Pokémon a cargar (por defecto 151 — Kanto original)
 * @param {number} offset Desplazamiento para paginación
 */
export async function getPokemonList(limit = 151, offset = 0) {
  const data = await fetchCached(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);

  // Extraemos el id de cada URL para construir la imagen directamente
  const pokemons = data.results.map((p) => {
    const id = parseInt(p.url.split('/').filter(Boolean).pop(), 10);
    return {
      id,
      nombre: capitalizarNombre(p.name),
      nombreApi: p.name,
      imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      imagenDefault: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    };
  });

  return pokemons;
}

/**
 * Obtiene los detalles completos de un Pokémon por id o nombre.
 * Incluye tipos, estadísticas base y forma de los sprites.
 */
export async function getPokemonDetail(idONombre) {
  const data = await fetchCached(`${BASE_URL}/pokemon/${idONombre}`);

  return {
    id: data.id,
    nombre: capitalizarNombre(data.name),
    nombreApi: data.name,
    altura: (data.height / 10).toFixed(1),   // en metros
    peso: (data.weight / 10).toFixed(1),      // en kilogramos
    imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`,
    imagenShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${data.id}.png`,
    tipos: data.types.map((t) => traducirTipo(t.type.name)),
    tiposApi: data.types.map((t) => t.type.name),
    estadisticas: data.stats.map((s) => ({
      nombre: traducirEstadistica(s.stat.name),
      valor: s.base_stat,
    })),
    habilidades: data.abilities.map((a) =>
      capitalizarNombre(a.ability.name.replace('-', ' '))
    ),
    urlEspecie: data.species.url,
  };
}

/**
 * Obtiene la cadena evolutiva a partir de la URL de especie.
 * Devuelve un array plano: [nombre1, nombre2, nombre3]
 */
export async function getCadenaEvolutiva(urlEspecie) {
  const especie = await fetchCached(urlEspecie);
  const cadena = await fetchCached(especie.evolution_chain.url);

  const nombres = [];
  let actual = cadena.chain;

  while (actual) {
    const id = await getIdPorNombre(actual.species.name);
    nombres.push({
      nombre: capitalizarNombre(actual.species.name),
      nombreApi: actual.species.name,
      id,
      imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    });
    actual = actual.evolves_to?.[0] ?? null;
  }

  return nombres;
}

/**
 * Devuelve el id numérico de un Pokémon dado su nombre.
 * Útil para construir URLs de sprites en la cadena evolutiva.
 */
async function getIdPorNombre(nombre) {
  const data = await fetchCached(`${BASE_URL}/pokemon/${nombre}`);
  return data.id;
}

// ── Traducciones ─────────────────────────────────────────

const TIPOS_ES = {
  normal:   'Normal',   fire:     'Fuego',    water:    'Agua',
  grass:    'Planta',   electric: 'Eléctrico',ice:      'Hielo',
  fighting: 'Lucha',    poison:   'Veneno',   ground:   'Tierra',
  flying:   'Volador',  psychic:  'Psíquico', bug:      'Bicho',
  rock:     'Roca',     ghost:    'Fantasma', dragon:   'Dragón',
  dark:     'Siniestro',steel:   'Acero',    fairy:    'Hada',
};

const STATS_ES = {
  hp:              'PS',
  attack:          'Ataque',
  defense:         'Defensa',
  'special-attack':'At. Esp.',
  'special-defense':'Def. Esp.',
  speed:           'Velocidad',
};

function traducirTipo(tipo) {
  return TIPOS_ES[tipo] ?? capitalizarNombre(tipo);
}

function traducirEstadistica(stat) {
  return STATS_ES[stat] ?? capitalizarNombre(stat);
}

function capitalizarNombre(nombre) {
  return nombre
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// Color CSS asociado a cada tipo para los badges
export const COLOR_POR_TIPO = {
  Normal:    'var(--type-normal)',
  Fuego:     'var(--type-fuego)',
  Agua:      'var(--type-agua)',
  Planta:    'var(--type-planta)',
  Eléctrico: 'var(--type-electrico)',
  Hielo:     'var(--type-hielo)',
  Lucha:     'var(--type-lucha)',
  Veneno:    'var(--type-veneno)',
  Tierra:    'var(--type-tierra)',
  Volador:   'var(--type-volador)',
  Psíquico:  'var(--type-psiquico)',
  Bicho:     'var(--type-bicho)',
  Roca:      'var(--type-roca)',
  Fantasma:  'var(--type-fantasma)',
  Dragón:    'var(--type-dragon)',
  Siniestro: 'var(--type-siniestro)',
  Acero:     'var(--type-acero)',
  Hada:      'var(--type-hada)',
};
