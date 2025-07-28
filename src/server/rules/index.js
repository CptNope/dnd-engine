// Rules loader
//
// This module loads game rules from JSON files stored in the `rules`
// directory.  By externalising the rules you can modify or replace
// the data without changing the server or client code.  The JSON
// files should contain objects keyed by category (class name, spell
// caster type, monster name, etc.).  See `rules/` for examples.

import fs from 'fs';
import path from 'path';

function loadJson(fileName) {
  // Compute path relative to the project root.  When the server is
  // started from the repository directory, process.cwd() points to
  // `dnd-engine`, so we can join directly with `rules`.
  const filePath = path.join(process.cwd(), 'rules', fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Failed to load ${fileName}:`, err);
    return {};
  }
}

export const classes = loadJson('classes.json');
export const spells = loadJson('spells.json');
export const monsters = loadJson('monsters.json');
export const items = loadJson('items.json');