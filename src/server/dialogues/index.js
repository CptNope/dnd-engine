// Dialogue loader
//
// This module loads dialogue definitions from JSON files stored in the
// `dialogues` directory.  Each file associates dialogues with a specific
// campaign via a `campaignId` field.  Dialogues consist of one or more
// conversation trees with nodes, options and optional rewards.  See
// `dialogues/test.json` for an example.

import fs from 'fs';
import path from 'path';

const dialogues = new Map();

// Immediately read all dialogue files at module load time
(() => {
  const dir = path.join(process.cwd(), 'dialogues');
  if (!fs.existsSync(dir)) {
    console.warn('Dialogues directory not found:', dir);
    return;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const data = JSON.parse(raw);
      if (data && data.id) {
        dialogues.set(data.id, data);
      }
    } catch (err) {
      console.error('Failed to load dialogue', file, err);
    }
  }
})();

/**
 * Return a list of dialogue summaries for a given campaign.  Each
 * summary includes the dialogue file id and a list of conversation
 * identifiers with names.  Use `getDialogue(id)` to retrieve the full
 * object.
 * @param {string} campaignId
 * @returns {Array<{id: string, conversations: Array<{id: string, name: string}>}>}
 */
export function getDialoguesForCampaign(campaignId) {
  const list = [];
  for (const dialogue of dialogues.values()) {
    if (dialogue.campaignId === campaignId) {
      const conversations = [];
      if (Array.isArray(dialogue.dialogues)) {
        for (const conv of dialogue.dialogues) {
          conversations.push({ id: conv.id, name: conv.name });
        }
      }
      list.push({ id: dialogue.id, conversations });
    }
  }
  return list;
}

/**
 * Retrieve a dialogue file by its id.  Returns the full object or
 * null if missing.
 * @param {string} id
 * @returns {object|null}
 */
export function getDialogue(id) {
  return dialogues.get(id) || null;
}