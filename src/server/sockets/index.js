// WebSocket handlers
//
// This module registers event listeners for each client connection.  Using
// socket.io allows easy room management and automatic reconnection.  Each
// event handler calls into the controllers to perform game logic and then
// emits updates back to the appropriate room.

import { joinGame, handleAction, getGameState, createCharacter } from '../controllers/index.js';
import { selectCampaign as selectCampaignController, spawnMonster as spawnMonsterController, giveItem as giveItemController, useItem as useItemController, startDialogue as startDialogueController, chooseDialogueOption as chooseDialogueOptionController } from '../controllers/index.js';
import { monsterAttack } from '../controllers/combat.js';
import models from '../models/index.js';

export default function registerSockets(io) {
  // Track active AI intervals for monsters.  Keys are `${gameId}_${monsterId}`.
  const monsterIntervals = {};
  io.on('connection', (socket) => {
    console.log('🧙 A client connected:', socket.id);

    // Join a game.  The client should emit an object with the gameId and
    // playerName.  We use socket.id as the playerId to simplify the
    // association between socket and player.
    socket.on('joinGame', ({ gameId, playerName }) => {
      try {
        joinGame(gameId, socket.id, playerName);
        socket.join(gameId);
        // Broadcast the updated game state to everyone in the room
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Player performs an action.  The payload should include the gameId and
    // the action object.  See controllers/index.js for action types.
    socket.on('action', ({ gameId, action }) => {
      try {
        const result = handleAction(gameId, socket.id, action);
        // Inform this player of their result
        socket.emit('actionResult', result);
        // Broadcast the updated game state to everyone in the room
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Player selects a campaign
    socket.on('selectCampaign', ({ gameId, campaignId }) => {
      try {
        const summary = selectCampaignController(gameId, campaignId);
        // Broadcast campaign selection to all players in the room
        io.to(gameId).emit('campaignSelected', summary);
        // Also broadcast updated game state (includes campaign)
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Spawn a monster (DM or test command)
    socket.on('spawnMonster', ({ gameId, monsterType }) => {
      try {
        const monster = spawnMonsterController(gameId, monsterType);
        // Broadcast updated state
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
        // Optionally notify clients of monster spawn
        io.to(gameId).emit('monsterSpawned', { instanceId: monster.instanceId, type: monster.type });

        // Start simple AI: periodically attack a random player
        const key = `${gameId}_${monster.instanceId}`;
        // Clear any existing interval for this monster
        if (monsterIntervals[key]) {
          clearInterval(monsterIntervals[key]);
          delete monsterIntervals[key];
        }
        // Only enable AI in multi mode or if there are players to attack
        monsterIntervals[key] = setInterval(() => {
          try {
            const currentState = getGameState(gameId);
            if (!currentState) {
              clearInterval(monsterIntervals[key]);
              delete monsterIntervals[key];
              return;
            }
            // Check if the monster still exists
            const monsterStill = currentState.monsters.find((m) => m.instanceId === monster.instanceId);
            if (!monsterStill) {
              clearInterval(monsterIntervals[key]);
              delete monsterIntervals[key];
              return;
            }
            // Choose a target player who is conscious (hp > 0)
            const availablePlayers = currentState.players.filter((p) => p.character && (p.character.hp === undefined || p.character.hp > 0) && (!p.character.status || p.character.status !== 'unconscious'));
            if (availablePlayers.length === 0) {
              return;
            }
            const target = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
            const result = monsterAttack(gameId, monster.instanceId, target.id);
            const msg = result.hit
              ? `The ${result.attacker} hits ${result.target} for ${result.damage} damage (roll ${result.roll}).`
              : `The ${result.attacker} misses ${result.target} (roll ${result.roll}).`;
            models.appendLog(gameId, msg);
            // Broadcast updated state after attack
            const newState = getGameState(gameId);
            io.to(gameId).emit('gameState', newState);
          } catch (err) {
            console.error('Monster AI error:', err.message);
            clearInterval(monsterIntervals[key]);
            delete monsterIntervals[key];
          }
        }, 15000); // attack every 15 seconds
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Give an item to a player (DM command)
    socket.on('giveItem', ({ gameId, targetPlayerId, itemId }) => {
      try {
        giveItemController(gameId, targetPlayerId, itemId);
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Use an item from the player's own inventory
    socket.on('useItem', ({ gameId, itemId }) => {
      try {
        const result = useItemController(gameId, socket.id, itemId);
        socket.emit('itemUsed', result);
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Start a dialogue.  Client must provide campaign dialogue id and conversation id
    socket.on('startDialogue', ({ gameId, dialogueId, conversationId }) => {
      try {
        const node = startDialogueController(gameId, socket.id, dialogueId, conversationId);
        // Send the first node back only to the requesting client
        socket.emit('dialogueNode', node);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Player chooses an option in a dialogue
    socket.on('chooseDialogueOption', ({ gameId, dialogueId, conversationId, nodeId, optionIndex }) => {
      try {
        const result = chooseDialogueOptionController(gameId, socket.id, dialogueId, conversationId, nodeId, optionIndex);
        // Broadcast updated game state if rewards were applied
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
        if (result.end) {
          // Notify only the player that the dialogue has ended
          socket.emit('dialogueEnd');
        } else {
          // Send next node to the player
          socket.emit('dialogueNode', result);
        }
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Export the current player's character.  Returns a JSON object.
    socket.on('exportCharacter', ({ gameId }) => {
      try {
        const char = models.exportCharacter(gameId, socket.id);
        if (!char) {
          socket.emit('error', 'Character not found');
          return;
        }
        socket.emit('characterExport', char);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Player creates a character
    socket.on('createCharacter', ({ gameId, character }) => {
      try {
        createCharacter(gameId, socket.id, character);
        // Broadcast the updated game state to everyone in the room
        const state = getGameState(gameId);
        io.to(gameId).emit('gameState', state);
      } catch (err) {
        console.error(err);
        socket.emit('error', err.message);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🧞 Client disconnected:', socket.id);
      // Note: For simplicity we do not remove the player from the game on
      // disconnect.  You may want to clean up the game state or mark
      // players as inactive here.
    });
  });
}