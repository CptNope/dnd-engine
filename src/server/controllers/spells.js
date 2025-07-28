// Spell controller
//
// Functions for casting spells.  Spells are defined in
// `rules/spells.json` and may heal or damage a target.  This module
// provides a simple implementation suitable for demonstrating spell
// casting.  It does not handle spell slots, memorisation or
// resistances—you can extend it to support those rules.

import models from '../models/index.js';
import { spells as spellRules } from '../rules/index.js';
import { rollDie } from './index.js';

/**
 * Find a spell definition by name, ignoring class and level.  The
 * spells.json structure nests spells by caster class and level.  This
 * helper searches all entries for a matching name (case
 * insensitive).  Returns the spell object or null if not found.
 *
 * @param {string} name
 * @returns {object|null}
 */
function findSpellByName(name) {
  const lower = name.toLowerCase();
  for (const cls of Object.values(spellRules)) {
    for (const lvl of Object.values(cls)) {
      for (const spell of lvl) {
        if (spell.name.toLowerCase() === lower) {
          return spell;
        }
      }
    }
  }
  return null;
}

/**
 * Roll dice based on a string like "1d6+1" or "2d4".  Returns the
 * total result.  Supports optional +bonus after the dice.  Ignores
 * invalid strings.
 *
 * @param {string} notation
 * @returns {number}
 */
function rollFromNotation(notation) {
  const match = notation.match(/(\d+)d(\d+)(\+(\d+))?/);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[4] ? parseInt(match[4], 10) : 0;
  let total = bonus;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/**
 * Cast a spell from a player.  Supports damage and healing effects.
 * Other effects are currently ignored.  Returns a result object
 * describing the outcome.  Throws if the spell is unknown or target
 * cannot be found.
 *
 * @param {string} gameId
 * @param {string} casterId
 * @param {string} spellName
 * @param {string} targetType 'player' or 'monster'
 * @param {string} targetId playerId or monster instanceId
 */
export function castSpell(gameId, casterId, spellName, targetType, targetId) {
  const spell = findSpellByName(spellName);
  if (!spell) {
    throw new Error(`Unknown spell: ${spellName}`);
  }
  const game = models.getGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} does not exist`);
  }
  const caster = game.players.get(casterId);
  if (!caster) {
    throw new Error('Caster not found');
  }
  let target;
  if (targetType === 'player') {
    target = game.players.get(targetId);
  } else if (targetType === 'monster') {
    target = game.monsters.get(targetId);
  }
  if (!target) {
    throw new Error('Target not found');
  }
  let message = '';
  let result = {};
  // Healing effect
  if (spell.effect && spell.effect.heal) {
    const healAmount = rollFromNotation(spell.effect.heal);
    // Apply healing to players only
    if (targetType !== 'player') {
      throw new Error('Healing spells can only target players');
    }
    if (!target.character) {
      target.character = { hp: 0 };
    }
    target.character.hp = (target.character.hp || 0) + healAmount;
    message = `${caster.name} casts ${spell.name} on ${target.name}, healing ${healAmount} HP.`;
    result = { caster: caster.name, target: target.name, heal: healAmount };
  }
  // Damage effect
  else if (spell.effect && spell.effect.damage) {
    const damageAmount = rollFromNotation(spell.effect.damage);
    // Apply damage to players or monsters
    // Determine armour class: for players we use character.ac, for monsters use monster.ac
    let targetAc;
    if (targetType === 'player') {
      const player = target;
      targetAc = (player.character && typeof player.character.ac === 'number') ? player.character.ac : 10;
    } else {
      targetAc = target.ac || 10;
    }
    // Roll to hit (simplistic, spells typically auto-hit but we allow a roll for demonstration)
    const attackRoll = rollDie(20);
    const hit = attackRoll >= targetAc;
    let damageDealt = 0;
    if (hit) {
      damageDealt = damageAmount;
      // Apply damage
      if (targetType === 'player') {
        const player = target;
        if (!player.character) {
          player.character = { hp: 0 };
        }
        player.character.hp -= damageDealt;
        if (player.character.hp <= 0) {
          player.character.status = 'unconscious';
        }
      } else {
        // Monster target
        target.hp -= damageDealt;
        if (target.hp <= 0) {
          target.status = 'dead';
          // Remove dead monster from game
          game.monsters.delete(targetId);
        }
      }
    }
    const targetName = targetType === 'player' ? target.name : target.type;
    message = hit
      ? `${caster.name} casts ${spell.name} and hits ${targetName} for ${damageDealt} damage.`
      : `${caster.name} casts ${spell.name} but misses ${targetName}.`;
    result = { caster: caster.name, target: targetName, roll: attackRoll, hit, damage: damageDealt };
  } else {
    message = `${caster.name} casts ${spell.name}, but nothing happens.`;
    result = { caster: caster.name, spell: spell.name };
  }
  // Append to game log
  models.appendLog(gameId, message);
  return { message, result };
}