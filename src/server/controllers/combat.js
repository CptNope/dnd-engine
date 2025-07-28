// Combat controller
//
// This module encapsulates basic combat mechanics: determining whether
// an attack hits and calculating damage.  The functions here are
// intentionally simple; you should expand them to include initiative,
// critical hits, saving throws and class‑specific modifiers.  They
// operate on the in‑memory models defined in `src/server/models`.

import models from '../models/index.js';
import { rollDie } from './index.js';
import { monsters as monsterRules } from '../rules/index.js';

/**
 * Perform an attack from one player to another.
 * @param {string} gameId
 * @param {string} attackerId
 * @param {string} targetId
 * @returns {object} result summary
 */
export function attack(gameId, attackerId, targetId) {
  const game = models.getGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} does not exist`);
  }
  const attacker = game.players.get(attackerId);
  const target = game.players.get(targetId);
  if (!attacker || !target) {
    throw new Error('Attacker or target not found in this game');
  }
  // Base armour class; in future derive from armour and dexterity
  const targetAC = (target.character && target.character.ac) || 10;
  const attackRoll = rollDie(20);
  let hit = attackRoll >= targetAC;
  let damage = 0;
  if (hit) {
    // Simplistic damage: roll a d6
    damage = rollDie(6);
    // Apply damage to target HP
    if (!target.character) {
      target.character = { hp: 0 };
    }
    if (typeof target.character.hp !== 'number') {
      target.character.hp = 0;
    }
    target.character.hp -= damage;
    // If HP drops below zero, mark as incapacitated
    if (target.character.hp <= 0) {
      target.character.status = 'unconscious';
    }
  }
  return {
    attacker: attacker.name,
    target: target.name,
    roll: attackRoll,
    hit,
    damage,
    targetRemainingHp: target.character ? target.character.hp : null,
  };
}

/**
 * Perform an attack from a player against a monster.  Similar to
 * `attack`, but targets a monster instance rather than another
 * player.  The returned summary includes the attacker name, the
 * monster type, the roll, whether it hit and the damage dealt.  If
 * the monster's hit points drop to zero or below, it is removed from
 * the game state.
 *
 * @param {string} gameId
 * @param {string} attackerId
 * @param {string} monsterInstanceId
 * @returns {object} result summary
 */
export function attackMonster(gameId, attackerId, monsterInstanceId) {
  const game = models.getGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} does not exist`);
  }
  const attacker = game.players.get(attackerId);
  const monster = game.monsters.get(monsterInstanceId);
  if (!attacker) {
    throw new Error('Attacker not found in this game');
  }
  if (!monster) {
    throw new Error('Target monster not found in this game');
  }
  const targetAC = monster.ac || 10;
  const attackRoll = rollDie(20);
  let hit = attackRoll >= targetAC;
  let damage = 0;
  if (hit) {
    damage = rollDie(6);
    monster.hp -= damage;
    if (monster.hp <= 0) {
      monster.status = 'dead';
      // Remove dead monster from game
      game.monsters.delete(monsterInstanceId);
    }
  }
  return {
    attacker: attacker.name,
    target: monster.type,
    roll: attackRoll,
    hit,
    damage,
    monsterRemainingHp: monster.hp,
    monsterStatus: monster.status,
  };
}

/**
 * Monster attacks a player.  Uses the monster's first attack damage
 * notation to determine damage.  Returns a summary similar to
 * `attack`.  If the player is reduced to zero or fewer hit points,
 * their status is set to 'unconscious'.
 *
 * @param {string} gameId
 * @param {string} monsterInstanceId
 * @param {string} targetPlayerId
 */
export function monsterAttack(gameId, monsterInstanceId, targetPlayerId) {
  const game = models.getGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} does not exist`);
  }
  const monster = game.monsters.get(monsterInstanceId);
  const target = game.players.get(targetPlayerId);
  if (!monster) {
    throw new Error('Monster not found');
  }
  if (!target) {
    throw new Error('Target player not found');
  }
  // Determine damage from monster's first attack definition if available
  let damageStr = '1d6';
  const rule = monsterRules[monster.type];
  if (rule && Array.isArray(rule.attacks) && rule.attacks[0] && rule.attacks[0].damage) {
    damageStr = rule.attacks[0].damage;
  }
  // Roll to hit vs player's AC
  const targetAc = (target.character && typeof target.character.ac === 'number') ? target.character.ac : 10;
  const attackRoll = rollDie(20);
  const hit = attackRoll >= targetAc;
  let damage = 0;
  if (hit) {
    // Parse damage notation (e.g. "1d6")
    const match = damageStr.match(/(\d+)d(\d+)(\+(\d+))?/);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const bonus = match[4] ? parseInt(match[4], 10) : 0;
      damage = bonus;
      for (let i = 0; i < count; i++) {
        damage += rollDie(sides);
      }
    } else {
      damage = rollDie(6);
    }
    if (!target.character) {
      target.character = { hp: 0 };
    }
    if (typeof target.character.hp !== 'number') {
      target.character.hp = 0;
    }
    target.character.hp -= damage;
    if (target.character.hp <= 0) {
      target.character.status = 'unconscious';
    }
  }
  return {
    attacker: monster.type,
    target: target.name,
    roll: attackRoll,
    hit,
    damage,
    targetRemainingHp: target.character ? target.character.hp : null,
  };
}