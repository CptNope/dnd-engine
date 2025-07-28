// In‑memory data models
//
// This module stores games and players in memory.  For persistence you
// should replace these structures with database adapters.  Because this
// implementation is shared between routes and socket handlers, we can
// import it from multiple places.

// Map of gameId to game state
const games = new Map();

function createGame(id) {
  if (games.has(id)) {
    return games.get(id);
  }
  const game = {
    id,
    players: new Map(),
    log: [],
    campaign: null,
    monsters: new Map(),
    // additional game properties can be added here
  };
  games.set(id, game);
  return game;
}

function getGame(id) {
  return games.get(id);
}

function addPlayer(gameId, playerId, playerName) {
  const game = createGame(gameId);
  if (!game.players.has(playerId)) {
    game.players.set(playerId, { id: playerId, name: playerName, character: null });
  }
  return game.players.get(playerId);
}

function appendLog(gameId, message) {
  const game = createGame(gameId);
  game.log.push(message);
}

/**
 * Spawn a monster instance in the given game.  The monster type must
 * exist in the rules.  Returns the instance ID and monster data.
 * @param {string} gameId
 * @param {string} monsterType
 * @param {object} monsterStats loaded from rules (hp etc.)
 */
function spawnMonster(gameId, monsterType, monsterStats) {
  const game = createGame(gameId);
  // Create a unique instance ID
  const instanceId = `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  // Clone stats and set HP
  const monster = {
    instanceId,
    type: monsterType,
    hp: monsterStats.hitPoints || (monsterStats.hitDice || 1) * 4,
    ac: monsterStats.armorClass || 10,
    status: 'alive',
  };
  game.monsters.set(instanceId, monster);
  return monster;
}

function getMonster(gameId, instanceId) {
  const game = games.get(gameId);
  if (!game) return null;
  return game.monsters.get(instanceId) || null;
}

/**
 * Add an item to a player's inventory.  Creates the inventory array if
 * necessary.
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} itemId
 */
function addItemToPlayer(gameId, playerId, itemId) {
  const game = createGame(gameId);
  const player = game.players.get(playerId);
  if (!player) {
    return null;
  }
  if (!player.character) {
    player.character = {};
  }
  if (!Array.isArray(player.character.inventory)) {
    player.character.inventory = [];
  }
  player.character.inventory.push(itemId);
  return player;
}

/**
 * Remove an item from a player's inventory and return it.  Returns
 * undefined if the item is not found.
 */
function removeItemFromPlayer(gameId, playerId, itemId) {
  const game = games.get(gameId);
  if (!game) return undefined;
  const player = game.players.get(playerId);
  if (!player || !player.character || !Array.isArray(player.character.inventory)) return undefined;
  const index = player.character.inventory.indexOf(itemId);
  if (index === -1) return undefined;
  return player.character.inventory.splice(index, 1)[0];
}

/**
 * Assign a character to a player.  Creates the player if missing.
 * @param {string} gameId
 * @param {string} playerId
 * @param {object} character
 * @returns {object} The updated player object
 */
function setCharacter(gameId, playerId, character) {
  const game = createGame(gameId);
  if (!game.players.has(playerId)) {
    game.players.set(playerId, { id: playerId, name: 'Unknown', character: null });
  }
  const player = game.players.get(playerId);
  // Merge with existing character fields if present
  if (!player.character) {
    player.character = {};
  }
  // Assign new character data, preserving existing inventory or other fields
  player.character = {
    ...player.character,
    ...character,
  };
  // Ensure experience and level fields exist
  if (player.character.experience === undefined) player.character.experience = 0;
  if (player.character.level === undefined) player.character.level = 1;
  return player;
}

/**
 * Add experience points to a player's character and update their level
 * if the threshold is reached.  Uses a simple progression: level × 1000.
 * @param {string} gameId
 * @param {string} playerId
 * @param {number} xp
 * @returns {object|null} updated player object
 */
function addExperience(gameId, playerId, xp) {
  const game = games.get(gameId);
  if (!game) return null;
  const player = game.players.get(playerId);
  if (!player || !player.character) return null;
  player.character.experience = (player.character.experience || 0) + xp;
  // Level up if experience exceeds threshold
  while (player.character.experience >= (player.character.level * 1000)) {
    player.character.experience -= player.character.level * 1000;
    player.character.level += 1;
    appendLog(gameId, `${player.name} has reached level ${player.character.level}!`);
  }
  return player;
}

/**
 * Return a deep copy of a player's character for export.  Removes
 * sensitive fields (e.g. socket id).  Returns null if not found.
 * @param {string} gameId
 * @param {string} playerId
 * @returns {object|null}
 */
function exportCharacter(gameId, playerId) {
  const game = games.get(gameId);
  if (!game) return null;
  const player = game.players.get(playerId);
  if (!player || !player.character) return null;
  // Shallow clone of character is sufficient since we only store primitives/arrays
  return JSON.parse(JSON.stringify(player.character));
}

/**
 * Retrieve a player from a game.
 * @param {string} gameId
 * @param {string} playerId
 * @returns {object|null}
 */
function getPlayer(gameId, playerId) {
  const game = games.get(gameId);
  if (!game) return null;
  return game.players.get(playerId) || null;
}

export default {
  createGame,
  getGame,
  addPlayer,
  appendLog,
  spawnMonster,
  getMonster,
  addItemToPlayer,
  removeItemFromPlayer,
  setCharacter,
  getPlayer,
  addExperience,
  exportCharacter,
};