import fetch from 'node-fetch';

const BASE_URL = 'https://pokeapi.co/api/v2';

async function test() {
  try {
    const res = await fetch(`${BASE_URL}/pokedex/2`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    console.log('Total entries:', data.pokemon_entries.length);
    const p = data.pokemon_entries[0].pokemon_species;
    const id = parseInt(p.url.split('/').filter(Boolean).pop(), 10);
    console.log('First pokemon:', p.name, 'ID:', id);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
