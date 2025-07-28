// Campaign loader
//
// Provides functions to list available campaigns and load a specific
// campaign from the `campaigns` directory.  Each campaign file is a
// JSON document with at minimum an `id`, `name` and `description`.  See
// `campaigns/test-campaign.json` for an example.

import fs from 'fs';
import path from 'path';

const campaignsDir = path.join(process.cwd(), 'campaigns');

/**
 * List all available campaigns.  Reads every `.json` file in the
 * campaigns directory and returns a summary of each.
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function listCampaigns() {
  try {
    const files = fs.readdirSync(campaignsDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const content = JSON.parse(fs.readFileSync(path.join(campaignsDir, f), 'utf8'));
        return { id: content.id, name: content.name, description: content.description };
      });
  } catch (err) {
    console.error('Failed to list campaigns:', err);
    return [];
  }
}

/**
 * Load a single campaign by its id.  Returns null if not found.
 * @param {string} id
 * @returns {object|null}
 */
export function getCampaign(id) {
  try {
    const filePath = path.join(campaignsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Failed to load campaign ${id}:`, err);
    return null;
  }
}