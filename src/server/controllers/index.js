// Core game logic
//
// This module provides functions that encapsulate the rules of your
// campaign.  Each function should be pure or at least deterministic
// whenever possible; for side effects (like updating a database or
// emitting socket events) use the caller context (routes or sockets).

import models from '../models/index.js';
import { classes as classRules } from '../rules/index.js';
import { attack as performAttack, attackMonster as performAttackMonster } from './combat.js';
import { castSpell } from './spells.js';
import { getCampaign } from '../campaigns/index.js';
import { spawnMonster } from './monster.js';
import { giveItem, useItem } from './items.js';
import { startDialogue, chooseDialogueOption } from './dialogue.js';

// Roll a single die with a given number of sides (default d20)
export function rollDie(sides = 20) {
  const n = Math.floor(Math.random() * sides) + 1;
  return n;
}

// Join a player to a game, creating the game if necessary
export function joinGame(gameId, playerId, playerName) {
  const player = models.addPlayer(gameId, playerId, playerName);
  models.appendLog(gameId, `${playerName} joined the game.`);
  return player;
}

// Handle a generic player action.  For now we simply log it.  You can
// extend this function to handle specific actions like "attack",
// "castSpell" or "move".  The `action` parameter should be an object
// describing what the player intends to do.
export function handleAction(gameId, playerId, action) {
  const game = models.getGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} does not exist`);
  }
  const player = game.players.get(playerId);
  if (!player) {
    throw new Error(`Player ${playerId} is not in game ${gameId}`);
  }
  // Example: if the action is roll a die
  if (action.type === 'roll') {
    const result = rollDie(action.sides);
    const msg = `${player.name} rolled a ${result} (d${action.sides}).`;
    models.appendLog(gameId, msg);
    return { result, message: msg };
  }
  if (action.type === 'attack') {
    const { targetId, targetType } = action;
    // If the targetType is 'monster', attack a monster instance
    if (targetType === 'monster') {
      const result = performAttackMonster(gameId, playerId, targetId);
      const msg = result.hit
        ? `${result.attacker} hit the ${result.target} for ${result.damage} damage (roll ${result.roll}).`
        : `${result.attacker} missed the ${result.target} (roll ${result.roll}).`;
      models.appendLog(gameId, msg);
      return { message: msg, result };
    }
    // Otherwise default to attacking another player
    const result = performAttack(gameId, playerId, targetId);
    const msg = result.hit
      ? `${result.attacker} hit ${result.target} for ${result.damage} damage (roll ${result.roll}).`
      : `${result.attacker} missed ${result.target} (roll ${result.roll}).`;
    models.appendLog(gameId, msg);
    return { message: msg, result };
  }
  if (action.type === 'castSpell') {
    const { spellName, targetType, targetId } = action;
    // Use spellName or fall back to spellId for backwards compatibility
    const name = spellName || action.spellId;
    if (!name) {
      const msg = `${player.name} tried to cast a spell, but no spell name was provided.`;
      models.appendLog(gameId, msg);
      return { message: msg };
    }
    const { message, result } = castSpell(gameId, playerId, name, targetType, targetId);
    return { message, result };
  }
  // Unknown action
  const msg = `${player.name} performed an unknown action: ${JSON.stringify(action)}.`;
  models.appendLog(gameId, msg);
  return { message: msg };
}

// Create or update a character for the given player.  The character
// object should contain name, race, class and any other fields you wish
// to support.  Returns the updated player.
export function createCharacter(gameId, playerId, character) {
  // Determine initial hit points from rules
  const clsKey = (character.class || '').toLowerCase();
  const rule = classRules[clsKey];
  if (rule && rule.hitDie) {
    // Roll hit points once for level 1
    character.hp = rollDie(rule.hitDie);
  }
  // Basic armour class; may be modified by equipment and dexterity
  if (!character.ac) character.ac = 10;
  // Ensure ability scores exist (placeholders if not provided)
  if (!character.abilityScores) {
    character.abilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  }
  // Assign saving throws from class rules if available; placeholder otherwise
  if (rule && rule.savingThrows) {
    character.savingThrows = { ...rule.savingThrows };
  } else if (!character.savingThrows) {
    // Provide generic placeholder values
    character.savingThrows = { deathRay: 12, magic: 12, paralysis: 12 };
  }
  const player = models.setCharacter(gameId, playerId, character);
  // Log the creation
  const race = character.race || 'unknown race';
  const cls = character.class || 'unknown class';
  models.appendLog(gameId, `${player.name} created a character: ${character.name} (${race} ${cls}) with ${character.hp || '?'} HP.`);
  return player;
}

// Select a campaign for a game.  Loads the campaign data and attaches
// it to the game.  Returns the campaign summary.
export function selectCampaign(gameId, campaignId) {
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} does not exist`);
  }
  const game = models.createGame(gameId);
  game.campaign = campaign;
  models.appendLog(gameId, `Campaign '${campaign.name}' selected.`);
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
  };
}

// Re-export monster and item helpers for use in sockets or routes
export { spawnMonster, giveItem, useItem };

// Re-export dialogue helpers
export { startDialogue, chooseDialogueOption };

// Get the current state of a game suitable for broadcasting to clients
export function getGameState(gameId) {
  const game = models.getGame(gameId);
  if (!game) return null;
  return {
    id: game.id,
    players: Array.from(game.players.values()),
    monsters: Array.from(game.monsters.values()),
    log: game.log,
  };
}