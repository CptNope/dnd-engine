// Dialogue controller
//
// This module processes dialogue interactions.  It looks up
// conversations from the dialogues files, returns dialogue nodes to
// clients, and awards experience or items based on choices.  See
// `dialogues/test.json` for a sample structure.

import { getDialogue } from '../dialogues/index.js';
import models from '../models/index.js';

/**
 * Start a dialogue by returning the first node of a conversation.
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} dialogueId – the id of the dialogue file
 * @param {string} conversationId – the id of the conversation within the file
 * @returns {object} { dialogueId, conversationId, nodeId, text, options }
 */
export function startDialogue(gameId, playerId, dialogueId, conversationId) {
  const file = getDialogue(dialogueId);
  if (!file) {
    throw new Error(`Dialogue file ${dialogueId} not found`);
  }
  const conv = (file.dialogues || []).find((d) => d.id === conversationId);
  if (!conv) {
    throw new Error(`Dialogue ${conversationId} not found in file ${dialogueId}`);
  }
  const startNodeId = conv.start;
  const node = conv.nodes[startNodeId];
  if (!node) {
    throw new Error(`Start node ${startNodeId} not found in dialogue ${conversationId}`);
  }
  return {
    dialogueId,
    conversationId,
    nodeId: startNodeId,
    text: node.text,
    options: (node.options || []).map((opt) => opt.text),
  };
}

/**
 * Process a player's choice within a dialogue.  Awards any rewards and
 * returns the next node or indicates the conversation has ended.
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} dialogueId
 * @param {string} conversationId
 * @param {string} nodeId – current node id
 * @param {number} optionIndex – index in options array
 * @returns {object} { end?: boolean, dialogueId, conversationId, nodeId, text, options }
 */
export function chooseDialogueOption(gameId, playerId, dialogueId, conversationId, nodeId, optionIndex) {
  const file = getDialogue(dialogueId);
  if (!file) {
    throw new Error(`Dialogue file ${dialogueId} not found`);
  }
  const conv = (file.dialogues || []).find((d) => d.id === conversationId);
  if (!conv) {
    throw new Error(`Dialogue ${conversationId} not found in file ${dialogueId}`);
  }
  const node = conv.nodes[nodeId];
  if (!node) {
    throw new Error(`Node ${nodeId} not found in dialogue ${conversationId}`);
  }
  const options = node.options || [];
  const option = options[optionIndex];
  if (!option) {
    throw new Error(`Option index ${optionIndex} is invalid for node ${nodeId}`);
  }
  // Award rewards if present
  if (option.reward) {
    const { xp, items } = option.reward;
    if (xp) {
      models.addExperience(gameId, playerId, xp);
      models.appendLog(gameId, `${models.getPlayer(gameId, playerId).name} gained ${xp} XP.`);
    }
    if (Array.isArray(items)) {
      for (const item of items) {
        models.addItemToPlayer(gameId, playerId, item);
        models.appendLog(gameId, `${models.getPlayer(gameId, playerId).name} received item ${item}.`);
      }
    }
  }
  // Determine next node
  const nextId = option.next;
  if (!nextId || !conv.nodes[nextId]) {
    // Conversation ends
    return { end: true };
  }
  const next = conv.nodes[nextId];
  return {
    dialogueId,
    conversationId,
    nodeId: nextId,
    text: next.text,
    options: (next.options || []).map((opt) => opt.text),
  };
}