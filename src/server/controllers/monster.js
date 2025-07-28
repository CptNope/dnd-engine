// Monster controller
//
// Functions to manipulate monsters in games: spawning and (future) AI.

import models from '../models/index.js';
import { monsters as monsterRules } from '../rules/index.js';

/**
 * Spawn a monster of the given type into the specified game.  Logs the
 * creation and returns the instance.  Throws if the monster type is
 * unknown.
 * @param {string} gameId
 * @param {string} monsterType
 */
export function spawnMonster(gameId, monsterType) {
  const rules = monsterRules[monsterType];
  if (!rules) {
    throw new Error(`Unknown monster type: ${monsterType}`);
  }
  const instance = models.spawnMonster(gameId, monsterType, rules);
  models.appendLog(gameId, `A ${monsterType} appears!`);
  return instance;
}