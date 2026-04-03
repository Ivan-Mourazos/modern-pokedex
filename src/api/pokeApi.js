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

/** 
 * Traducciones manuales para movimientos recientes (Gen IX) 
 * ya que PokeAPI aún no tiene todas en español.
 */
const TRADUCCIONES_MANUALES_MOVS = {
  // LEYENDAS ARCEUS (Gen 8.5)
  'ceaseless-edge': 'Tajo Ceceante', 'victory-dance': 'Danza Victoria', 'barrage-fury': 'Furia Barrage',
  'triple-arrows': 'Triple Flecha', 'infernal-parade': 'Desfile Infernal', 'barb-barrage': 'Mil Púas Tóxicas',
  'esper-wing': 'Ala Psíquica', 'bitter-malice': 'Rencor Reprimido', 'mountain-gale': 'Vendaval Gélido',
  'raging-fury': 'Furia Rabiosa', 'wave-crash': 'Envite Acuático', 'chloroblast': 'Clorobláster',
  'shelter': 'Refugio', 'headlong-rush': 'Arremetida', 'wildbolt-storm': 'Erosión de Rayos',
  'sandsear-storm': 'Erosión de Arena', 'bleakwind-storm': 'Erosión de Viento', 'springtide-storm': 'Erosión de Amor',
  'lunar-blessing': 'Plegaria Lunar', 'take-heart': 'Ánimo', 'dire-claw': 'Garras Funestas',
  'mystical-power': 'Poder Místico', 'stone-axe': 'Hacha de Piedra',

  // ESCARLATA Y PÚRPURA (Gen 9)
  'matcha-gotcha': 'Matcha Gótica', 'syrup-bomb': 'Bomba Caramelo', 'ivy-cudgel': 'Garrote Liana',
  'flower-trick': 'Truco Floral', 'trailblaze': 'Abrecaminos', 'spicy-extract': 'Extracto Picante',
  'raging-bull': 'Furia Taurina', 'make-it-rain': 'Fiebre Dorada', 'psyblade': 'Psicohoja',
  'hydro-steam': 'Hidrovapor', 'electro-shot': 'Electropitón', 'tera-starstorm': 'Teraturbión',
  'fickle-beam': 'Láser Caprichoso', 'burning-bulwark': 'Baluarte Ígneo', 'thunderclap': 'Electrogala',
  'tachyon-cutter': 'Tajo Taquiónico', 'upper-hand': 'Puño Certero', 'psychic-noise': 'Ruido Psíquico',
  'pounce': 'Brinco', 'trailblaze': 'Abrecaminos', 'chilling-water': 'Agua Fría', 'mortal-spin': 'Giro Mortal',
  'population-bomb': 'Prole de Bombas', 'ice-spinner': 'Giro Gélido', 'glaive-rush': 'Asalto Espadón',
  'revival-blessing': 'Plegaria Vital', 'salt-cure': 'Salazón', 'triple-dive': 'Triple Zambullida',
  'last-respects': 'Homenaje Póstumo', 'lumina-crash': 'Choque Lumínico', 'armor-cannon': 'Cañón de Armadura',
  'bitter-blade': 'Espada Lamento', 'double-shock': 'Doble Rayo', 'gigaton-hammer': 'Martillo Gigante',
  'comeuppance': 'Venganza Relámpago', 'aqua-cutter': 'Tajo Acuático', 'blazing-torque': 'Torque Ígneo',
  'wicked-torque': 'Torque Maligno', 'noxious-torque': 'Torque Nocivo', 'combat-torque': 'Torque Combate',
  'magical-torque': 'Torque Mágico', 'spin-out': 'Derrape', 'order-up': 'Marchando', 
  'jet-punch': 'Puño Jet', 'rage-fist': 'Puño Furia', 'kowtow-cleave': 'Genuflexión',
  'collision-course': 'Nitrochoque', 'electro-drift': 'Electroderrape', 'shed-tail': 'Autotomía',
  'snowscape': 'Paisaje Nevado', 'presents-from-paldea': 'Regalos de Paldea', 'tera-blast': 'Teraexplosión',
  'dragon-cheer': 'Bramido Dragón', 'hard-press': 'Presión Pesada', 'alluring-voice': 'Voz Cautivadora',
  'temper-flare': 'Llamarada Temeraria', 'supercell-slam': 'Impacto Supercelular', 'electro-shot': 'Electropitón',
};

const DESC_MANUALES_MOVS = {
  'matcha-gotcha': 'Dispara una ráfaga de té matcha. Restaura PS al usuario por valor de la mitad del daño causado. Puede quemar al objetivo.',
  'flower-trick': 'Lanza una flor trucada que siempre resulta en un golpe crítico y nunca falla.',
  'trailblaze': 'Ataca con ímpetu saltando obstáculos. Aumenta la Velocidad del usuario al impactar.',
  'syrup-bomb': 'Lanza una bomba de sirope pegajoso que reduce la Velocidad del objetivo durante tres turnos.',
  'ivy-cudgel': 'Un golpe con un garrote de lianas cuya probabilidad de crítico es alta y su tipo cambia según la máscara.',
};

// ── Juegos disponibles agrupados ───────────────────────────

export const JUEGOS = [
  {
    grupo: 'Generación I',
    juegos: [
      { id: 'red-blue', label: 'Rojo / Azul', pokedexId: 2 },
      { id: 'yellow',   label: 'Amarillo', pokedexId: 2 },
    ],
  },
  {
    grupo: 'Generación II',
    juegos: [
      { id: 'gold-silver', label: 'Oro / Plata', pokedexId: 3 },
      { id: 'crystal',     label: 'Cristal', pokedexId: 3 },
    ],
  },
  {
    grupo: 'Generación III',
    juegos: [
      { id: 'ruby-sapphire',     label: 'Rubí / Zafiro', pokedexId: 4 },
      { id: 'emerald',           label: 'Esmeralda', pokedexId: 4 },
      { id: 'firered-leafgreen', label: 'RojoFuego / VerdeHoja ★', pokedexId: 2 },
    ],
  },
  {
    grupo: 'Generación IV',
    juegos: [
      { id: 'diamond-pearl',        label: 'Diamante / Perla', pokedexId: 5 },
      { id: 'platinum',             label: 'Platino', pokedexId: 6 },
      { id: 'heartgold-soulsilver', label: 'OroCorazón / PlataAlma', pokedexId: 7 },
    ],
  },
  {
    grupo: 'Generación V',
    juegos: [
      { id: 'black-white',     label: 'Negro / Blanco', pokedexId: 8 },
      { id: 'black-2-white-2', label: 'Negro 2 / Blanco 2', pokedexId: 9 },
    ],
  },
  {
    grupo: 'Generación VI',
    juegos: [
      { id: 'x-y',                    label: 'X / Y', pokedexId: 12 }, // Kalos Central
      { id: 'omegaruby-alphasapphire', label: 'Rubí Omega / Zafiro Alfa', pokedexId: 15 }, // Hoenn actualizado
    ],
  },
  {
    grupo: 'Generación VII',
    juegos: [
      { id: 'sun-moon',             label: 'Sol / Luna', pokedexId: 16 }, // Alola
      { id: 'ultra-sun-ultra-moon', label: 'Ultrasol / Ultraluna', pokedexId: 21 }, // Alola actualizado
    ],
  },
  {
    grupo: 'Generación VIII',
    juegos: [
      { id: 'sword-shield',                        label: 'Espada / Escudo', pokedexId: 27 }, // Galar
      { id: 'brilliant-diamond-and-shining-pearl', label: 'Diamante Brillante / Perla Reluciente', pokedexId: 5 },
      { id: 'legends-arceus',                      label: 'Leyendas: Arceus', pokedexId: 30 }, // Hisui
    ],
  },
  {
    grupo: 'Generación IX',
    juegos: [
      { id: 'scarlet-violet', label: 'Escarlata / Púrpura', pokedexId: 31 }, // Paldea
    ],
  },
];

export const JUEGOS_PLANA = JUEGOS.flatMap((g) => g.juegos);

/** Indica si el juego seleccionado es de Generación I (stats unificadas). */
export function esGenI(juegoId) {
  return ['red-blue', 'yellow'].includes(juegoId);
}

// ── ITEMS / OBJETOS ───────────────────────────────────────

/** Categorías de objetos en español */
export const CATEGORIAS_OBJETOS_ES = {
  'stat-boosts': 'Potenciadores',
  'effort-drop': 'Reductores EV',
  'medicine': 'Medicinas',
  'other': 'Varios',
  'in-a-pinch': 'Bayas de apuro',
  'picky-healing': 'Cura selectiva',
  'type-protection': 'Protección tipo',
  'baking-only': 'Poffins',
  'collectibles': 'Coleccionables',
  'evolution': 'Evolución',
  'spelunking': 'Exploración',
  'held-items': 'Objetos equipables',
  'choice': 'Pañuelos',
  'effort-training': 'Entrenamiento',
  'bad-held-items': 'Objetos trampa',
  'training': 'Entrenamiento',
  'plates': 'Tablas',
  'species-specific': 'Especie específica',
  'type-enhancement': 'Potenciador de tipo',
  'event-items': 'Eventos',
  'gameplay': 'Juego',
  'plot-advancement': 'Historia',
  'unused': 'Sin uso',
  'loot': 'Botín',
  'all-mail': 'Correo',
  'vitamins': 'Vitaminas',
  'healing': 'Curación',
  'pp-recovery': 'Recuperación PP',
  'revival': 'Revivir',
  'status-cures': 'Cura estado',
  'mulch': 'Compost',
  'scarves': 'Bufandas',
  'jewels': 'Gemas',
  'berries': 'Bayas',
  'apricorns': 'Tupper',
  'data-cards': 'Tarjetas datos',
  'miracle-shooter': 'Lanzador Milagro',
  'dex-completion': 'Pokédex',
  'mega-stones': 'Megapiedras',
  'memories': 'Memorias',
  'z-crystals': 'Cristales Z',
  'dynamax-crystals': 'Cristales Dinamax',
  'tera-shards': 'Fragmentos Tera',
  'nature-mints': 'Mentas personalidad',
  'items': 'Objetos',
  'standard-balls': 'Poké Balls básicas',
  'special-balls': 'Poké Balls especiales',
  'apricorn-balls': 'Balls de Tupper',
  'ultra-balls': 'Ultra Balls',
  'cave': 'Cueva',
  'tm-materials': 'Materiales MT',
  'sandwiches': 'Sánduiches',
  'curry-ingredients': 'Ingredientes curry',
  'picnic': 'Pícnic',
};

/**
 * Descripciones manuales en español para objetos que PokeAPI
 * no tiene traducidos correctamente (megapiedras, cristales Z, etc.)
 */
const DESCRIPCIONES_MANUALES_ITEMS = {
  // Megapiedras genéricas
  'mega-stones': 'Si la lleva un Pokémon compatible, le permite Megaevolucionar en batalla.',
  // Megapiedras específicas
  'venusaurite':  'Megapiedra que permite la Megaevolución de Venusaur en Mega-Venusaur.',
  'charizardite-x': 'Megapiedra que permite la Megaevolución de Charizard en Mega-Charizard X.',
  'charizardite-y': 'Megapiedra que permite la Megaevolución de Charizard en Mega-Charizard Y.',
  'blastoisinite': 'Megapiedra que permite la Megaevolución de Blastoise en Mega-Blastoise.',
  'beedrillite': 'Megapiedra que permite la Megaevolución de Beedrill en Mega-Beedrill.',
  'pidgeotite': 'Megapiedra que permite la Megaevolución de Pidgeot en Mega-Pidgeot.',
  'alakazite': 'Megapiedra que permite la Megaevolución de Alakazam en Mega-Alakazam.',
  'slowbronite': 'Megapiedra que permite la Megaevolución de Slowbro en Mega-Slowbro.',
  'gengarite': 'Megapiedra que permite la Megaevolución de Gengar en Mega-Gengar.',
  'kangaskhanite': 'Megapiedra que permite la Megaevolución de Kangaskhan en Mega-Kangaskhan.',
  'pinsirite': 'Megapiedra que permite la Megaevolución de Pinsir en Mega-Pinsir.',
  'gyaradosite': 'Megapiedra que permite la Megaevolución de Gyarados en Mega-Gyarados.',
  'aerodactylite': 'Megapiedra que permite la Megaevolución de Aerodactyl en Mega-Aerodactyl.',
  'mewtwonite-x': 'Megapiedra que permite la Megaevolución de Mewtwo en Mega-Mewtwo X.',
  'mewtwonite-y': 'Megapiedra que permite la Megaevolución de Mewtwo en Mega-Mewtwo Y.',
  'ampharosite': 'Megapiedra que permite la Megaevolución de Ampharos en Mega-Ampharos.',
  'steelixite': 'Megapiedra que permite la Megaevolución de Steelix en Mega-Steelix.',
  'scizorite': 'Megapiedra que permite la Megaevolución de Scizor en Mega-Scizor.',
  'heracronite': 'Megapiedra que permite la Megaevolución de Heracross en Mega-Heracross.',
  'houndoominite': 'Megapiedra que permite la Megaevolución de Houndoom en Mega-Houndoom.',
  'tyranitarite': 'Megapiedra que permite la Megaevolución de Tyranitar en Mega-Tyranitar.',
  'blazikenite': 'Megapiedra que permite la Megaevolución de Blaziken en Mega-Blaziken.',
  'gardevoirite': 'Megapiedra que permite la Megaevolución de Gardevoir en Mega-Gardevoir.',
  'mawilite': 'Megapiedra que permite la Megaevolución de Mawile en Mega-Mawile.',
  'aggronite': 'Megapiedra que permite la Megaevolución de Aggron en Mega-Aggron.',
  'medichamite': 'Megapiedra que permite la Megaevolución de Medicham en Mega-Medicham.',
  'manectite': 'Megapiedra que permite la Megaevolución de Manectric en Mega-Manectric.',
  'sharpedonite': 'Megapiedra que permite la Megaevolución de Sharpedo en Mega-Sharpedo.',
  'cameruptite': 'Megapiedra que permite la Megaevolución de Camerupt en Mega-Camerupt.',
  'altarianite': 'Megapiedra que permite la Megaevolución de Altaria en Mega-Altaria.',
  'banettite': 'Megapiedra que permite la Megaevolución de Banette en Mega-Banette.',
  'absolite': 'Megapiedra que permite la Megaevolución de Absol en Mega-Absol.',
  'glalitite': 'Megapiedra que permite la Megaevolución de Glalie en Mega-Glalie.',
  'salamencite': 'Megapiedra que permite la Megaevolución de Salamence en Mega-Salamence.',
  'metagrossite': 'Megapiedra que permite la Megaevolución de Metagross en Mega-Metagross.',
  'latiasite': 'Megapiedra que permite la Megaevolución de Latias en Mega-Latias.',
  'latiosite': 'Megapiedra que permite la Megaevolución de Latios en Mega-Latios.',
  'lopunnite': 'Megapiedra que permite la Megaevolución de Lopunny en Mega-Lopunny.',
  'garchompite': 'Megapiedra que permite la Megaevolución de Garchomp en Mega-Garchomp.',
  'lucarionite': 'Megapiedra que permite la Megaevolución de Lucario en Mega-Lucario.',
  'abomasite': 'Megapiedra que permite la Megaevolución de Abomasnow en Mega-Abomasnow.',
  'galladite': 'Megapiedra que permite la Megaevolución de Gallade en Mega-Gallade.',
  'audinite': 'Megapiedra que permite la Megaevolución de Audino en Mega-Audino.',
  'diancite': 'Megapiedra que permite la Megaevolución de Diancie en Mega-Diancie.',
  'swampertite': 'Megapiedra que permite la Megaevolución de Swampert en Mega-Swampert.',
  'sceptilite': 'Megapiedra que permite la Megaevolución de Sceptile en Mega-Sceptile.',
  'sablenite': 'Megapiedra que permite la Megaevolución de Sableye en Mega-Sableye.',
  'glalitite': 'Megapiedra que permite la Megaevolución de Glalie en Mega-Glalie.',
  // Cristales Z
  'normalium-z': 'Cristal Z de tipo Normal. Permite usar el Z-Movimiento correspondiente.',
  'firium-z': 'Cristal Z de tipo Fuego. Permite usar el Z-Movimiento de tipo Fuego.',
  'waterium-z': 'Cristal Z de tipo Agua. Permite usar el Z-Movimiento de tipo Agua.',
  'grassium-z': 'Cristal Z de tipo Planta. Permite usar el Z-Movimiento de tipo Planta.',
  'electrium-z': 'Cristal Z de tipo Eléctrico. Permite usar el Z-Movimiento eléctrico.',
  'icium-z': 'Cristal Z de tipo Hielo. Permite usar el Z-Movimiento de tipo Hielo.',
  'fightinium-z': 'Cristal Z de tipo Lucha. Permite usar el Z-Movimiento de tipo Lucha.',
  'poisonium-z': 'Cristal Z de tipo Veneno. Permite usar el Z-Movimiento de tipo Veneno.',
  'groundium-z': 'Cristal Z de tipo Tierra. Permite usar el Z-Movimiento de tipo Tierra.',
  'flyinium-z': 'Cristal Z de tipo Volador. Permite usar el Z-Movimiento de tipo Volador.',
  'psychium-z': 'Cristal Z de tipo Psíquico. Permite usar el Z-Movimiento psíquico.',
  'buginium-z': 'Cristal Z de tipo Bicho. Permite usar el Z-Movimiento de tipo Bicho.',
  'rockium-z': 'Cristal Z de tipo Roca. Permite usar el Z-Movimiento de tipo Roca.',
  'ghostium-z': 'Cristal Z de tipo Fantasma. Permite usar el Z-Movimiento fantasma.',
  'dragonium-z': 'Cristal Z de tipo Dragón. Permite usar el Z-Movimiento de tipo Dragón.',
  'darkinium-z': 'Cristal Z de tipo Siniestro. Permite usar el Z-Movimiento siniestro.',
  'steelium-z': 'Cristal Z de tipo Acero. Permite usar el Z-Movimiento de tipo Acero.',
  'fairium-z': 'Cristal Z de tipo Hada. Permite usar el Z-Movimiento de tipo Hada.',
  // Memorias de Silvally
  'fire-memory': 'Memoria de Fuego. Permite a Silvally cambiar su tipo a Fuego.',
  'water-memory': 'Memoria de Agua. Permite a Silvally cambiar su tipo a Agua.',
  'grass-memory': 'Memoria de Planta. Permite a Silvally cambiar su tipo a Planta.',
  'electric-memory': 'Memoria Eléctrica. Permite a Silvally cambiar su tipo a Eléctrico.',
  'ice-memory': 'Memoria de Hielo. Permite a Silvally cambiar su tipo a Hielo.',
  'fighting-memory': 'Memoria de Lucha. Permite a Silvally cambiar su tipo a Lucha.',
  'poison-memory': 'Memoria Veneno. Permite a Silvally cambiar su tipo a Veneno.',
  'ground-memory': 'Memoria de Tierra. Permite a Silvally cambiar su tipo a Tierra.',
  'flying-memory': 'Memoria Voladora. Permite a Silvally cambiar su tipo a Volador.',
  'psychic-memory': 'Memoria Psíquica. Permite a Silvally cambiar su tipo a Psíquico.',
  'bug-memory': 'Memoria Bicho. Permite a Silvally cambiar su tipo a Bicho.',
  'rock-memory': 'Memoria de Roca. Permite a Silvally cambiar su tipo a Roca.',
  'ghost-memory': 'Memoria Fantasma. Permite a Silvally cambiar su tipo a Fantasma.',
  'dragon-memory': 'Memoria Dragón. Permite a Silvally cambiar su tipo a Dragón.',
  'dark-memory': 'Memoria Siniestra. Permite a Silvally cambiar su tipo a Siniestro.',
  'steel-memory': 'Memoria de Acero. Permite a Silvally cambiar su tipo a Acero.',
  'fairy-memory': 'Memoria Hada. Permite a Silvally cambiar su tipo a Hada.',
  // Fragmentos Tera
  'fire-tera-shard': 'Fragmento Tera de tipo Fuego. Se usa para cambiar la Teracristalización de un Pokémon a tipo Fuego.',
  'water-tera-shard': 'Fragmento Tera de tipo Agua. Se usa para cambiar la Teracristalización a tipo Agua.',
  'grass-tera-shard': 'Fragmento Tera de tipo Planta. Se usa para cambiar la Teracristalización a tipo Planta.',
  'electric-tera-shard': 'Fragmento Tera Eléctrico. Se usa para cambiar la Teracristalización a tipo Eléctrico.',
  'normal-tera-shard': 'Fragmento Tera Normal. Se usa para cambiar la Teracristalización a tipo Normal.',
  'fighting-tera-shard': 'Fragmento Tera de Lucha. Se usa para cambiar la Teracristalización a tipo Lucha.',
  'poison-tera-shard': 'Fragmento Tera Veneno. Se usa para cambiar la Teracristalización a tipo Veneno.',
  'ground-tera-shard': 'Fragmento Tera Tierra. Se usa para cambiar la Teracristalización a tipo Tierra.',
  'flying-tera-shard': 'Fragmento Tera Volador. Se usa para cambiar la Teracristalización a tipo Volador.',
  'psychic-tera-shard': 'Fragmento Tera Psíquico. Se usa para cambiar la Teracristalización a tipo Psíquico.',
  'bug-tera-shard': 'Fragmento Tera Bicho. Se usa para cambiar la Teracristalización a tipo Bicho.',
  'rock-tera-shard': 'Fragmento Tera Roca. Se usa para cambiar la Teracristalización a tipo Roca.',
  'ghost-tera-shard': 'Fragmento Tera Fantasma. Se usa para cambiar la Teracristalización a tipo Fantasma.',
  'dragon-tera-shard': 'Fragmento Tera Dragón. Se usa para cambiar la Teracristalización a tipo Dragón.',
  'dark-tera-shard': 'Fragmento Tera Siniestro. Se usa para cambiar la Teracristalización a tipo Siniestro.',
  'steel-tera-shard': 'Fragmento Tera Acero. Se usa para cambiar la Teracristalización a tipo Acero.',
  'fairy-tera-shard': 'Fragmento Tera Hada. Se usa para cambiar la Teracristalización a tipo Hada.',
  'ice-tera-shard': 'Fragmento Tera Hielo. Se usa para cambiar la Teracristalización a tipo Hielo.',
  'stellar-tera-shard': 'Fragmento Tera Estelar. Solo lo puede usar Terapagos para cambiar su Teracristalización.',
  // Bayas más comunes
  'oran-berry': 'Una baya que restaura 10 PS si el Pokémon tiene poca salud.',
  'sitrus-berry': 'Una baya que restaura un 25% de los PS máximos si el Pokémon tiene poca salud.',
  'lum-berry': 'Una baya que cura cualquier estado alterado (parálisis, quemadura, etc.).',
  'leppa-berry': 'Una baya que restaura 10 PP de un movimiento si se agotan.',
  'pecha-berry': 'Una baya que cura el envenenamiento de forma instantánea.',
  'cheri-berry': 'Una baya que cura la parálisis de forma instantánea.',
  'chesto-berry': 'Una baya que despierta al Pokémon si se queda dormido.',
  'rawst-berry': 'Una baya que cura las quemaduras de forma instantánea.',
  'aspear-berry': 'Una baya que descongela al Pokémon de forma instantánea.',
  'persim-berry': 'Una baya que cura la confusión de forma instantánea.',
  'enigma-berry': 'Una baya misteriosa que restaura PS al recibir un ataque supereficaz.',
  // Objetos equipables comunes
  'leftovers': 'Restauran un poco de PS en cada turno si el Pokémon los lleva equipados.',
  'life-orb': 'Potencia los ataques pero el Pokémon pierde un poco de PS al usarlos.',
  'focus-sash': 'Si el Pokémon tiene todos sus PS, evita que se debilite de un solo golpe dejándolo con 1 PS.',
  'choice-band': 'Potencia el Ataque pero solo permite usar un movimiento.',
  'choice-specs': 'Potencia el Ataque Especial pero solo permite usar un movimiento.',
  'choice-scarf': 'Potencia la Velocidad pero solo permite usar un movimiento.',
  'assault-vest': 'Potencia la Defensa Especial pero impide usar movimientos de estado.',
  'eviolite': 'Potencia la Defensa y Defensa Especial si el Pokémon aún puede evolucionar.',
  'rocky-helmet': 'Daña al oponente si este usa un ataque de contacto contra el portador.',
  'expert-belt': 'Potencia los movimientos que son supereficaces contra el rival.',
  'muscle-band': 'Potencia ligeramente los ataques físicos.',
  'wise-glasses': 'Potencia ligeramente los ataques especiales.',
};

/**
 * Obtiene el detalle completo de un objeto en español.
 * Prioridad: traducción manual → ES oficial → EN como fallback.
 */
export async function getItemDetail(idONombre) {
  const data = await fetchCached(`${BASE_URL}/item/${idONombre}`);

  const nombreEs = data.names.find(n => n.language.name === 'es')?.name
    ?? capitalizarNombre(data.name.replace(/-/g, ' '));

  // Descripción: español > inglés en flavor_text (son los textos del juego)
  // IMPORTANTE: Buscamos de atrás hacia adelante para obtener la descripción de la generación más reciente
  const flavorEs = [...data.flavor_text_entries].reverse().find(e => e.language.name === 'es')
    ?.text?.replace(/\f|\n|\r/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
  const flavorEn = [...data.flavor_text_entries].reverse().find(e => e.language.name === 'en')
    ?.text?.replace(/\f|\n|\r/g, ' ').replace(/\s+/g, ' ').trim() ?? '';

  // Efecto: solo español. Si no existe, lo dejamos vacío (no mostramos inglés en efecto)
  const efectoEs = data.effect_entries.find(e => e.language.name === 'es')?.effect
    ?.replace(/\s+/g, ' ').trim() ?? '';
  const efectoCortoEs = data.effect_entries.find(e => e.language.name === 'es')?.short_effect
    ?.replace(/\s+/g, ' ').trim() ?? '';

  // Traducción manual como prioridad máxima
  const descManual = DESCRIPCIONES_MANUALES_ITEMS[data.name];

  const descripcion = descManual ?? flavorEs ?? flavorEn;
  
  // Para el efecto: usamos español si existe.
  const efecto = efectoEs || efectoCortoEs || (descManual && descManual !== flavorEs ? descManual : flavorEs) || '';

  const categoriaApi = data.category?.name ?? '';

  return {
    id: data.id,
    nombre: nombreEs,
    nombreApi: data.name,
    sprite: data.sprites?.default ?? null,
    categoria: CATEGORIAS_OBJETOS_ES[categoriaApi] ?? capitalizarNombre(categoriaApi.replace(/-/g, ' ')),
    categoriaApi,
    descripcion,
    efecto: efecto !== descripcion ? efecto : '', // evitar duplicados
    precio: data.cost,
    atributosApi: data.attributes?.map(a => a.name) ?? [],
    pokemonUsoPocket: data.held_by_pokemon ?? [],
  };
}

/**
 * Descarga el índice de objetos de una categoría específica.
 */
export async function getItemsByCategory(categoriaApi) {
  const data = await fetchCached(`${BASE_URL}/item-category/${categoriaApi}`);
  return data.items.map(item => {
    const id = parseInt(item.url.split('/').filter(Boolean).pop(), 10);
    return { id, nombreApi: item.name, nombre: capitalizarNombre(item.name.replace(/-/g, ' ')), url: item.url };
  });
}

/**
 * Descarga el índice completo de objetos (cacheado).
 */
export async function getAllItemNames() {
  const data = await fetchCached(`${BASE_URL}/item?limit=2000&offset=0`);
  return data.results.map(item => {
    const id = parseInt(item.url.split('/').filter(Boolean).pop(), 10);
    return { id, nombreApi: item.name, nombre: capitalizarNombre(item.name.replace(/-/g, ' ')), url: item.url };
  });
}

/**
 * Descarga la lista de categorías de objetos disponibles.
 */
export async function getItemCategoryList() {
  const data = await fetchCached(`${BASE_URL}/item-category?limit=200&offset=0`);
  return data.results.map(c => ({
    nombreApi: c.name,
    nombre: CATEGORIAS_OBJETOS_ES[c.name] ?? capitalizarNombre(c.name.replace(/-/g, ' ')),
  }));
}

// ── Endpoints principales ──────────────────────────────────

export async function getPokemonByPokedex(pokedexIdOrName) {
  const data = await fetchCached(`${BASE_URL}/pokedex/${pokedexIdOrName}`);
  return data.pokemon_entries.map((entry) => {
    const p = entry.pokemon_species;
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

// ── MOVIMIENTOS ───────────────────────────────────────────

/** Descarga el índice completo de movimientos (~920) — petición única, cacheada */
export async function getAllMoveNames() {
  const data = await fetchCached(`${BASE_URL}/move?limit=2000&offset=0`);
  return data.results.map((m) => {
    const id = parseInt(m.url.split('/').filter(Boolean).pop(), 10);
    const nombreManual = TRADUCCIONES_MANUALES_MOVS[m.name];
    const nombreFinal = nombreManual ?? capitalizarNombre(m.name.replace(/-/g, ' '));
    return { id, nombreApi: m.name, nombre: nombreFinal, url: m.url };
  });
}

/** Obtiene el detalle completo de un movimiento en español */
export async function getMoveDetail(idONombre) {
  const data = await fetchCached(`${BASE_URL}/move/${idONombre}`);

  const nombreManual = TRADUCCIONES_MANUALES_MOVS[data.name];
  const nombreEs = nombreManual ?? data.names.find(n => n.language.name === 'es')?.name
    ?? capitalizarNombre(data.name.replace(/-/g, ' '));

  const descManual = DESC_MANUALES_MOVS[data.name];
  const descripcionEs = descManual ?? (data.flavor_text_entries.find(e => e.language.name === 'es')
    ?? data.flavor_text_entries.find(e => e.language.name === 'en'))
    ?.flavor_text?.replace(/\f|\n/g, ' ') ?? '';

  // Muchos movimientos solo tienen efecto en inglés. Priorizamos español aunque sea de flavor_text.
  const shortEffectEs = data.effect_entries.find(e => e.language.name === 'es')?.short_effect;
  const shortEffectEn = data.effect_entries.find(e => e.language.name === 'en')?.short_effect;

  const efectoFinal = (shortEffectEs ?? descripcionEs ?? shortEffectEn ?? '')
    .replace(/\$effect_chance%?/g, `${data.effect_chance ?? ''}%`);

  return {
    id: data.id,
    nombre: nombreEs,
    nombreApi: data.name,
    tipo: TIPOS_ES[data.type?.name] ?? data.type?.name ?? '—',
    tipoApi: data.type?.name,
    categoria: traducirCategoria(data.damage_class?.name),
    categoriaApi: data.damage_class?.name,
    potencia: data.power,
    precision: data.accuracy,
    pp: data.pp,
    prioridad: data.priority,
    descripcion: descripcionEs,
    efecto: efectoFinal,
    generacion: data.generation?.name,
  };
}

function traducirCategoria(cat) {
  const map = { physical: 'Físico', special: 'Especial', status: 'Estado' };
  return map[cat] ?? cat ?? '—';
}

/** Descarga el índice completo de nombres (1-1302) — petición única, cacheada */
export async function getAllPokemonNames() {
  const data = await fetchCached(`${BASE_URL}/pokemon?limit=1302&offset=0`);
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
    variedades: [], // se llenará al cargar la especie
  };
}

/** Obtiene el nombre de una habilidad en español. */
export async function getNombreHabilidadEs(urlHabilidad, nombreFallback) {
  try {
    const data = await fetchCached(urlHabilidad);
    const es = data.names.find((n) => n.language.name === 'es');
    return es?.name ?? nombreFallback;
  } catch {
    return nombreFallback;
  }
}

/** Obtiene descripción completa de una habilidad en español. */
export async function getHabilidadInfoEs(urlHabilidad) {
  try {
    const data = await fetchCached(urlHabilidad);
    const es = data.flavor_text_entries.find((e) => e.language.name === 'es');
    const en = data.flavor_text_entries.find((e) => e.language.name === 'en');
    return (es ?? en)?.flavor_text?.replace(/\f|\n/g, ' ') ?? 'Sin descripción disponible.';
  } catch {
    return 'Error al cargar habilidad.';
  }
}

/** Obtiene el nombre de un movimiento en español. */
export async function getNombreMovimientoEs(urlMovimiento, nombreFallback) {
  try {
    const data = await fetchCached(urlMovimiento);
    const manual = TRADUCCIONES_MANUALES_MOVS[data.name];
    if (manual) return manual;
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
    variedades: data.varieties.map((v) => ({
      nombre: capitalizarNombre(v.pokemon.name.replace(/-/g, ' ')),
      nombreApi: v.pokemon.name,
      esDefault: v.is_default
    })),
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
    const url = entry.move.url;

    for (const vgd of detallesVersion) {
      const metodo = vgd.move_learn_method.name;
      const nivel = vgd.level_learned_at;

      const movObj = { nombre, nivel, urlApi: url };

      if (metodo === 'level-up')       grupos.nivelUp.push(movObj);
      else if (metodo === 'machine')   grupos.maquina.push(movObj);
      else if (metodo === 'egg')       grupos.huevo.push(movObj);
      else                             grupos.tutor.push(movObj);
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
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada', stellar: 'Estelar',
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

