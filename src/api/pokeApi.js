/**
 * pokeApi.js — Capa de acceso a PokeAPI v3
 * - Caché en memoria
 * - Multi-generación
 * - Métodos de evolución completos en español
 * - Soporte de selector de juego (movimientos + stats Gen I)
 */

const BASE_URL = 'https://pokeapi.co/api/v2';

const cache = new Map();

async function fetchCached(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al cargar: ${url}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

// ── Generaciones de Pokémon (para el listado) ──────────────
// Offsets y límites según la Pokédex Nacional
// Gen I  : #001–151  | Gen II : #152–251  | Gen III: #252–386
// Gen IV : #387–493  | Gen V  : #494–649  | Gen VI : #650–721
// Gen VII: #722–809  | Gen VIII:#810–905  | Gen IX : #906–1025

export const GENERACIONES = [
  { id: 1, label: 'Gen I',    limit: 151, offset: 0   },
  { id: 2, label: 'Gen II',   limit: 100, offset: 151 },
  { id: 3, label: 'Gen III',  limit: 135, offset: 251 },
  { id: 4, label: 'Gen IV',   limit: 107, offset: 386 },
  { id: 5, label: 'Gen V',    limit: 156, offset: 493 },
  { id: 6, label: 'Gen VI',   limit: 72,  offset: 649 },
  { id: 7, label: 'Gen VII',  limit: 88,  offset: 721 },
  { id: 8, label: 'Gen VIII', limit: 96,  offset: 809 },
  { id: 9, label: 'Gen IX',   limit: 120, offset: 905 },
];

/**
 * Mapea cada juego a la generación de Pokémon que debería mostrar.
 * Los remakes usan la gen de la región original:
 *   FRLg→I  |  HGSS→II  |  ORAS→III  |  BDSP+LArceus→IV
 */
export const JUEGO_A_GEN = {
  'red-blue': 1, 'yellow': 1,
  'gold-silver': 2, 'crystal': 2,
  'ruby-sapphire': 3, 'emerald': 3,
  'firered-leafgreen': 1,          // remake Kanto
  'diamond-pearl': 4, 'platinum': 4,
  'heartgold-soulsilver': 2,       // remake Johto
  'black-white': 5, 'black-2-white-2': 5,
  'x-y': 6,
  'omegaruby-alphasapphire': 3,    // remake Hoenn
  'sun-moon': 7, 'ultra-sun-ultra-moon': 7,
  'sword-shield': 8,
  'brilliant-diamond-and-shining-pearl': 4, // remake Sinnoh
  'legends-arceus': 4,             // Hisui = Sinnoh antiguo
  'scarlet-violet': 9,
};

// ── Juegos disponibles agrupados ───────────────────────────

export const JUEGOS = [
  {
    grupo: 'Generación I',
    juegos: [
      { id: 'red-blue', label: 'Rojo / Azul' },
      { id: 'yellow',   label: 'Amarillo' },
    ],
  },
  {
    grupo: 'Generación II',
    juegos: [
      { id: 'gold-silver', label: 'Oro / Plata' },
      { id: 'crystal',     label: 'Cristal' },
    ],
  },
  {
    grupo: 'Generación III',
    juegos: [
      { id: 'ruby-sapphire',     label: 'Rubí / Zafiro' },
      { id: 'emerald',           label: 'Esmeralda' },
      { id: 'firered-leafgreen', label: 'RojoFuego / VerdeHoja ★' },
    ],
  },
  {
    grupo: 'Generación IV',
    juegos: [
      { id: 'diamond-pearl',        label: 'Diamante / Perla' },
      { id: 'platinum',             label: 'Platino' },
      { id: 'heartgold-soulsilver', label: 'OroCorazón / PlataAlma' },
    ],
  },
  {
    grupo: 'Generación V',
    juegos: [
      { id: 'black-white',     label: 'Negro / Blanco' },
      { id: 'black-2-white-2', label: 'Negro 2 / Blanco 2' },
    ],
  },
  {
    grupo: 'Generación VI',
    juegos: [
      { id: 'x-y',                    label: 'X / Y' },
      { id: 'omegaruby-alphasapphire', label: 'Rubí Omega / Zafiro Alfa' },
    ],
  },
  {
    grupo: 'Generación VII',
    juegos: [
      { id: 'sun-moon',             label: 'Sol / Luna' },
      { id: 'ultra-sun-ultra-moon', label: 'Ultrasol / Ultraluna' },
    ],
  },
  {
    grupo: 'Generación VIII',
    juegos: [
      { id: 'sword-shield',                        label: 'Espada / Escudo' },
      { id: 'brilliant-diamond-and-shining-pearl', label: 'Diamante Brillante / Perla Reluciente' },
      { id: 'legends-arceus',                      label: 'Leyendas: Arceus' },
    ],
  },
  {
    grupo: 'Generación IX',
    juegos: [
      { id: 'scarlet-violet', label: 'Escarlata / Púrpura' },
    ],
  },
];

export const JUEGOS_PLANA = JUEGOS.flatMap((g) => g.juegos);

/** Indica si el juego seleccionado es de Generación I (stats unificadas). */
export function esGenI(juegoId) {
  return ['red-blue', 'yellow'].includes(juegoId);
}

// ── Endpoints principales ──────────────────────────────────

export async function getPokemonList(limit = 151, offset = 0) {
  const data = await fetchCached(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);

  return data.results.map((p) => {
    const id = parseInt(p.url.split('/').filter(Boolean).pop(), 10);
    return {
      id,
      nombre: capitalizarNombre(p.name),
      nombreApi: p.name,
      imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      imagenDefault: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    };
  });
}

export async function getPokemonDetail(idONombre) {
  const data = await fetchCached(`${BASE_URL}/pokemon/${idONombre}`);

  return {
    id: data.id,
    nombre: capitalizarNombre(data.name),
    nombreApi: data.name,
    altura: (data.height / 10).toFixed(1),
    peso: (data.weight / 10).toFixed(1),
    imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`,
    imagenShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${data.id}.png`,
    tipos: data.types.map((t) => traducirTipo(t.type.name)),
    tiposApi: data.types.map((t) => t.type.name),
    estadisticas: data.stats.map((s) => ({
      nombre: traducirEstadistica(s.stat.name),
      nombreApi: s.stat.name,
      valor: s.base_stat,
    })),
    habilidades: data.abilities.map((a) => ({
      nombreApi: a.ability.name,
      urlHabilidad: a.ability.url,
      nombre: capitalizarNombre(a.ability.name.replace(/-/g, ' ')), // fallback en inglés
      oculta: a.is_hidden,
    })),
    movimientosRaw: data.moves,
    urlEspecie: data.species.url,
    experienciaBase: data.base_experience,
  };
}

/**
 * Obtiene el nombre de una habilidad en español usando la URL de su endpoint.
 * Cachea el resultado para no repetir peticiones.
 */
export async function getNombreHabilidadEs(urlHabilidad, nombreFallback) {
  try {
    const data = await fetchCached(urlHabilidad);
    const es = data.names.find((n) => n.language.name === 'es');
    return es?.name ?? nombreFallback;
  } catch {
    return nombreFallback;
  }
}

export async function getEspecie(urlEspecie) {
  const data = await fetchCached(urlEspecie);

  const entradas = data.flavor_text_entries;
  const es = entradas.find((e) => e.language.name === 'es');
  const en = entradas.find((e) => e.language.name === 'en');
  const descripcion =
    (es ?? en)?.flavor_text
      ?.replace(/\f|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? '';

  const categoriaEs =
    data.genera.find((g) => g.language.name === 'es')?.genus ??
    data.genera.find((g) => g.language.name === 'en')?.genus ??
    '';

  return {
    descripcion,
    categoria: categoriaEs,
    tasaCaptura: data.capture_rate,
    felicidadBase: data.base_happiness,
    urlCadenaEvolutiva: data.evolution_chain.url,
  };
}

export async function getCadenaEvolutiva(urlCadena) {
  const cadena = await fetchCached(urlCadena);

  const evoluciones = [];
  let actual = cadena.chain;

  while (actual) {
    const nombre = actual.species.name;
    const id = await getIdPorNombre(nombre);
    const detalles = actual.evolution_details?.[0] ?? null;

    evoluciones.push({
      nombre: capitalizarNombre(nombre),
      nombreApi: nombre,
      id,
      imagen: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      metodo: detalles ? describirEvolucion(detalles) : null,
      esPorNivel: detalles?.trigger?.name === 'level-up' && !!detalles.min_level,
    });

    actual = actual.evolves_to?.[0] ?? null;
  }

  return evoluciones;
}

async function getIdPorNombre(nombre) {
  const data = await fetchCached(`${BASE_URL}/pokemon/${nombre}`);
  return data.id;
}

// ── Movimientos filtrados por grupo de versión ─────────────

export const METODOS_APRENDIZAJE_ES = {
  'level-up': 'Por nivel',
  'machine':  'MT / MO',
  'egg':      'Por huevo',
  'tutor':    'Tutor',
};

/**
 * Filtra los movimientos crudos de la API por versión de juego.
 * @param {Array}  movimientosRaw  - Propiedad `moves` del endpoint /pokemon
 * @param {string} versionGroupId  - e.g. 'red-blue', 'gold-silver', 'scarlet-violet'
 * @returns {{ nivelUp, maquina, huevo, tutor }} Objeto con arrays por método
 */
export function filtrarMovimientos(movimientosRaw, versionGroupId) {
  if (!movimientosRaw || !versionGroupId) return null;

  const grupos = { nivelUp: [], maquina: [], huevo: [], tutor: [] };

  for (const entry of movimientosRaw) {
    const detallesVersion = entry.version_group_details.filter(
      (vgd) => vgd.version_group.name === versionGroupId
    );
    if (!detallesVersion.length) continue;

    const nombre = capitalizarNombre(entry.move.name.replace(/-/g, ' '));

    for (const vgd of detallesVersion) {
      const metodo = vgd.move_learn_method.name;
      const nivel = vgd.level_learned_at;

      if (metodo === 'level-up')       grupos.nivelUp.push({ nombre, nivel });
      else if (metodo === 'machine')   grupos.maquina.push({ nombre });
      else if (metodo === 'egg')       grupos.huevo.push({ nombre });
      else                             grupos.tutor.push({ nombre });
    }
  }

  grupos.nivelUp.sort((a, b) => a.nivel - b.nivel);
  grupos.maquina.sort((a, b) => a.nombre.localeCompare(b.nombre));
  grupos.huevo.sort((a, b) => a.nombre.localeCompare(b.nombre));
  grupos.tutor.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return grupos;
}

// ── Descripción de métodos de evolución ───────────────────

function describirEvolucion(d) {
  if (!d) return null;

  const trigger = d.trigger?.name;
  const partes = [];

  if (trigger === 'level-up') {
    if (d.min_level)  partes.push(`Nv. ${d.min_level}`);
    else              partes.push('Subir de nivel');

    if (d.min_happiness)  partes.push(`Felicidad ≥ ${d.min_happiness}`);
    if (d.min_affection)  partes.push(`Afinidad ≥ ${d.min_affection}`);
    if (d.min_beauty)     partes.push(`Belleza ≥ ${d.min_beauty}`);

    if (d.time_of_day === 'day')   partes.push('De día');
    if (d.time_of_day === 'night') partes.push('De noche');
    if (d.time_of_day === 'dusk')  partes.push('Al anochecer');

    if (d.location)         partes.push(`En ${traducirUbicacion(d.location.name)}`);
    if (d.known_move)       partes.push(`Conociendo ${capitalizarNombre(d.known_move.name.replace(/-/g, ' '))}`);
    if (d.known_move_type)  partes.push(`Con mov. tipo ${TIPOS_ES[d.known_move_type.name] ?? d.known_move_type.name}`);
    if (d.needs_overworld_rain)   partes.push('Con lluvia');
    if (d.relative_physical_stats === 1)  partes.push('Ataque > Defensa');
    if (d.relative_physical_stats === -1) partes.push('Defensa > Ataque');
    if (d.relative_physical_stats === 0)  partes.push('Ataque = Defensa');
    if (d.turn_upside_down) partes.push('Consola al revés');
    if (d.party_species)    partes.push(`Con ${capitalizarNombre(d.party_species.name)} en equipo`);
    if (d.party_type)       partes.push(`Con tipo ${TIPOS_ES[d.party_type.name] ?? d.party_type.name} en equipo`);

  } else if (trigger === 'trade') {
    partes.push('Intercambio');
    if (d.held_item)      partes.push(`sosteniendo ${traducirObjeto(d.held_item.name)}`);
    if (d.trade_species)  partes.push(`por ${capitalizarNombre(d.trade_species.name)}`);

  } else if (trigger === 'use-item') {
    partes.push(traducirObjeto(d.item?.name ?? ''));

  } else if (trigger === 'shed') {
    partes.push('Al mudar (hueco libre + Poké Ball disponible)');

  } else if (trigger === 'spin') {
    partes.push('Dar vueltas sosteniendo un objeto misterioso');

  } else if (trigger === 'tower-of-darkness') {
    partes.push('Torre de la Oscuridad (Espada)');

  } else if (trigger === 'tower-of-waters') {
    partes.push('Torre de las Aguas (Escudo)');

  } else if (trigger === 'three-critical-hits') {
    partes.push('3 golpes críticos en una batalla');

  } else if (trigger === 'take-damage') {
    partes.push('Recibir ≥ 49 de daño y visitar el Monumento');

  } else if (trigger === 'agile-style-move') {
    const mov = d.known_move?.name
      ? capitalizarNombre(d.known_move.name.replace(/-/g, ' '))
      : 'movimiento';
    partes.push(`Usar ${mov} en estilo ágil (Leyendas)`);

  } else if (trigger === 'strong-style-move') {
    const mov = d.known_move?.name
      ? capitalizarNombre(d.known_move.name.replace(/-/g, ' '))
      : 'movimiento';
    partes.push(`Usar ${mov} en estilo fuerte (Leyendas)`);

  } else if (trigger === 'recoil-damage') {
    partes.push('Acumular daño de retroceso en batallas');

  } else {
    partes.push('Método especial');
  }

  return partes.join(' · ');
}

// ── Traducciones de objetos ────────────────────────────────

const OBJETOS_ES = {
  'fire-stone': 'Piedra Fuego', 'water-stone': 'Piedra Agua',
  'thunder-stone': 'Piedra Trueno', 'leaf-stone': 'Piedra Hoja',
  'moon-stone': 'Piedra Lunar', 'sun-stone': 'Piedra Solar',
  'oval-stone': 'Piedra Oval', 'shiny-stone': 'Piedra Brillo',
  'dusk-stone': 'Piedra Noche', 'dawn-stone': 'Piedra Amanecer',
  'ice-stone': 'Piedra Hielo',
  'metal-coat': 'Barrera Metálica', 'kings-rock': 'Roca Rey',
  'deep-sea-tooth': 'Diente Abisal', 'deep-sea-scale': 'Escama Abisal',
  'dragon-scale': 'Escama Dragón', 'up-grade': 'Actualizador',
  'dubious-disc': 'Disco Raro', 'electirizer': 'Electrizador',
  'magmarizer': 'Magmarizador', 'protector': 'Protector',
  'razor-fang': 'Colmillo Filo', 'razor-claw': 'Garfio Filo',
  'reaper-cloth': 'Tela Parca', 'prism-scale': 'Escama Prisma',
  'whipped-dream': 'Ensueño Batido', 'sachet': 'Saquito Aromático',
  'linking-cord': 'Cable Eslabón', 'chipped-pot': 'Cuenco Rajado',
  'cracked-pot': 'Cuenco Resquebrajado', 'sweet-apple': 'Manzana Dulce',
  'tart-apple': 'Manzana Ácida', 'galarica-cuff': 'Brazal Galarica',
  'galarica-wreath': 'Guirnalda Galarica',
  'auspicious-armor': 'Armadura Propicia', 'malicious-armor': 'Armadura Maligna',
  'peat-block': 'Bloque Pantanoso', 'black-augurite': 'Augüerita Negra',
  'scroll-of-darkness': 'Pergamino Oscuro', 'scroll-of-waters': 'Pergamino Acuoso',
  'strawberry-sweet': 'Caramelo Fresa', 'berry-sweet': 'Caramelo Baya',
  'love-sweet': 'Caramelo Amor', 'star-sweet': 'Caramelo Estrella',
  'ribbon-sweet': 'Caramelo Lazo', 'flower-sweet': 'Caramelo Flor',
  'clover-sweet': 'Caramelo Trébol',
};

function traducirObjeto(nombre) {
  return OBJETOS_ES[nombre] ?? capitalizarNombre(nombre.replace(/-/g, ' '));
}

// ── Traducciones de ubicaciones ────────────────────────────

const UBICACIONES_ES = {
  'mt-coronet':          'Monte Coronet',
  'eterna-forest':       'Bosque Eterno',
  'fuego-ironworks':     'Forja Fuego',
  'sinnoh-route-217':    'Ruta 217 (Sinnoh)',
  'kalos-route-20':      'Ruta 20 (Kalos)',
  'mossy-rock':          'Roca Musgosa',
  'icy-rock':            'Roca Helada',
  'magnetic-field':      'Campo Magnético',
  'giant-chasm':         'Cueva Abismo',
  'twist-mountain':      'Monte Tortuoso',
  'poni-meadow':         'Pradera Poni',
  'ancient-tower':       'Torre Antigua',
  'three-point-pass':    'Paso Tres Lagos',
  'ne-of-geosenge-town': 'Nordeste de Pueblo Geoforma',
};

function traducirUbicacion(nombre) {
  return UBICACIONES_ES[nombre] ?? capitalizarNombre(nombre.replace(/-/g, ' '));
}

// ── Traducciones base ──────────────────────────────────────

export const TIPOS_ES = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua',
  grass: 'Planta', electric: 'Eléctrico', ice: 'Hielo',
  fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra',
  flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
};

export const TODOS_LOS_TIPOS = Object.values(TIPOS_ES);

const STATS_ES = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
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

export const COLOR_POR_TIPO = {
  Normal: 'var(--type-normal)', Fuego: 'var(--type-fuego)',
  Agua: 'var(--type-agua)', Planta: 'var(--type-planta)',
  Eléctrico: 'var(--type-electrico)', Hielo: 'var(--type-hielo)',
  Lucha: 'var(--type-lucha)', Veneno: 'var(--type-veneno)',
  Tierra: 'var(--type-tierra)', Volador: 'var(--type-volador)',
  Psíquico: 'var(--type-psiquico)', Bicho: 'var(--type-bicho)',
  Roca: 'var(--type-roca)', Fantasma: 'var(--type-fantasma)',
  Dragón: 'var(--type-dragon)', Siniestro: 'var(--type-siniestro)',
  Acero: 'var(--type-acero)', Hada: 'var(--type-hada)',
};

export const HEX_POR_TIPO = {
  Normal: '#9a9a7a', Fuego: '#ff5c35', Agua: '#4da8ff',
  Planta: '#3dca6e', Eléctrico: '#f5d020', Hielo: '#69d4f0',
  Lucha: '#e84b3a', Veneno: '#b85ee0', Tierra: '#d4a04a',
  Volador: '#89a7e0', Psíquico: '#f85888', Bicho: '#a8b820',
  Roca: '#b8a038', Fantasma: '#7c5faa', Dragón: '#7038f8',
  Siniestro: '#705848', Acero: '#b8b8d0', Hada: '#f5a0c0',
};
