// Item controller
//
// Functions to handle player inventory and using items.

import models from '../models/index.js';
import { items as itemRules } from '../rules/index.js';
import { rollDie } from './index.js';

/**
 * Give an item to a player by ID.  Logs the acquisition.
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} itemId
 */
export function giveItem(gameId, playerId, itemId) {
  const item = itemRules[itemId];
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  const player = models.addItemToPlayer(gameId, playerId, itemId);
  models.appendLog(gameId, `${player.name} obtained ${item.name}.`);
  return player;
}

/**
 * Use an item from the player's inventory.  Returns a result describing
 * the effect.  Currently supports healing potions.
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} itemId
 */
export function useItem(gameId, playerId, itemId) {
  const item = itemRules[itemId];
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  // Remove from inventory
  const removed = models.removeItemFromPlayer(gameId, playerId, itemId);
  if (!removed) {
    throw new Error('Item not in inventory');
  }
  const player = models.getPlayer(gameId, playerId);
  if (!player || !player.character) {
    throw new Error('Player or character missing');
  }
  let message = '';
  const effect = item.effect || {};
  // Healing effect: parse dice notation (e.g. "1d8")
  if (effect.heal) {
    const match = effect.heal.match(/(\d+)d(\d+)/);
    let heal = 0;
    if (match) {
      const [_, countStr, sidesStr] = match;
      const count = parseInt(countStr, 10);
      const sides = parseInt(sidesStr, 10);
      for (let i = 0; i < count; i++) {
        heal += rollDie(sides);
      }
    }
    player.character.hp = (player.character.hp || 0) + heal;
    message = `${player.name} drinks a ${item.name} and heals ${heal} HP.`;
  } else if (effect.acBonus) {
    // Armour class bonus: increase the player's AC
    if (typeof player.character.ac !== 'number') {
      player.character.ac = 10;
    }
    player.character.ac += effect.acBonus;
    message = `${player.name} equips a ${item.name} and gains +${effect.acBonus} armour class.`;
  } else {
    // Other effects are not implemented; log a generic message
    message = `${player.name} uses ${item.name}, but nothing happens.`;
  }
  models.appendLog(gameId, message);
  return { playerId, itemId, message };
}