// Load server configuration
//
// This module reads the JSON configuration file at the project root.
// Configuration currently only supports selecting single vs multiplayer
// mode, but you can extend it with more options (database, logging
// levels, etc.).

import fs from 'fs';
import path from 'path';

function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not load config.json, using defaults');
    return { mode: 'multi' };
  }
}

export default loadConfig();