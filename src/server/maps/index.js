// Map loader
//
// This module loads map definitions from JSON files stored in the
// `maps` directory.  Each map file describes the biome, dimensions
// and a 2D array of tile types.  See the files in `maps/` for
// examples.  The functions here return either a list of maps
// (summarised) or a specific map by id.

import fs from 'fs';
import path from 'path';

// Load all maps at startup.  The `maps` directory is expected to
// reside in the project root (process.cwd()).  Each JSON file should
// contain an object with at least an `id` and `name` field.
const maps = new Map();

(() => {
  const dir = path.join(process.cwd(), 'maps');
  if (!fs.existsSync(dir)) {
    console.warn('Maps directory not found:', dir);
    return;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const data = JSON.parse(raw);
      if (data && data.id) {
        maps.set(data.id, data);
      }
    } catch (err) {
      console.error('Failed to load map', file, err);
    }
  }
})();

/**
 * Return a summary list of maps.  Each entry includes the id,
 * name, biome and dimensions of the map.  Use `getMap(id)` to
 * retrieve the full map definition.
 * @returns {Array<{id: string, name: string, biome?: string, dimensions?: object}>}
 */
export function getMaps() {
  const list = [];
  for (const map of maps.values()) {
    list.push({
      id: map.id,
      name: map.name,
      biome: map.biome,
      dimensions: map.dimensions,
    });
  }
  return list;
}

/**
 * Retrieve a map by id.  Returns the full map object or null if
 * missing.
 * @param {string} id
 * @returns {object|null}
 */
export function getMap(id) {
  return maps.get(id) || null;
}