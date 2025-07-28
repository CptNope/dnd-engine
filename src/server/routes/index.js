// API routes
//
// This file defines RESTful endpoints used by the client or administrative
// interfaces.  Keeping API routes separate from socket handlers allows
// REST and WebSocket code to evolve independently.

import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listCampaigns, getCampaign } from '../campaigns/index.js';
import { getMaps, getMap } from '../maps/index.js';
import { getDialoguesForCampaign, getDialogue } from '../dialogues/index.js';

const router = express.Router();

// Resolve package.json location relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');

// Read version from package.json once at module load
let version = 'unknown';
try {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  version = pkg.version;
} catch (err) {
  console.error('Failed to read package.json:', err);
}

// Example endpoint: return server and engine version
router.get('/version', (req, res) => {
  res.json({
    name: 'dnd-engine',
    version,
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List available campaigns
router.get('/campaigns', (req, res) => {
  const list = listCampaigns();
  res.json(list);
});

// Fetch a single campaign by id
router.get('/campaigns/:id', (req, res) => {
  const { id } = req.params;
  const campaign = getCampaign(id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

// List available maps
router.get('/maps', (req, res) => {
  const list = getMaps();
  res.json(list);
});

// Fetch a single map by id
router.get('/maps/:id', (req, res) => {
  const { id } = req.params;
  const map = getMap(id);
  if (!map) {
    return res.status(404).json({ error: 'Map not found' });
  }
  res.json(map);
});

// List dialogues for a campaign
router.get('/dialogues/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const list = getDialoguesForCampaign(campaignId);
  res.json(list);
});

// Fetch a single dialogue file by id
router.get('/dialogue/:id', (req, res) => {
  const { id } = req.params;
  const dialogue = getDialogue(id);
  if (!dialogue) {
    return res.status(404).json({ error: 'Dialogue not found' });
  }
  res.json(dialogue);
});

export default router;