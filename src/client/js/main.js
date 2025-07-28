// Main entry point for the DnD engine client
//
// This file bootstraps the engine, connects to the server via socket.io
// and wires up the DOM.  It demonstrates how to join a game and perform
// a basic action (rolling a die).  Extend this file to add more user
// interactions, UI components or integrate a rendering library.

import { io } from 'socket.io-client';
import Engine from './engine/core.js';
import GameState from './engine/modules/gameState.js';

// Connect to the server.  The empty argument means "connect to the
// origin from which this page was served".
const socket = io();

// Create engine and register the game state module
const engine = new Engine();
const gameState = new GameState();
engine.registerModule(gameState);

// Grab DOM elements
const joinSection = document.getElementById('join-section');
const campaignSection = document.getElementById('campaign-section');
const campaignListDiv = document.getElementById('campaignList');
const mapSection = document.getElementById('map-section');
const mapListDiv = document.getElementById('mapList');
const mapCanvas = document.getElementById('mapCanvas');
const mapModeInputs = document.getElementsByName('renderMode');
const characterSection = document.getElementById('character-section');
const actionsSection = document.getElementById('actions-section');
const gameIdInput = document.getElementById('gameId');
const playerNameInput = document.getElementById('playerName');
const joinBtn = document.getElementById('joinBtn');
const charNameInput = document.getElementById('charName');
const charRaceInput = document.getElementById('charRace');
const charClassInput = document.getElementById('charClass');
const charSTRInput = document.getElementById('charSTR');
const charDEXInput = document.getElementById('charDEX');
const charCONInput = document.getElementById('charCON');
const charINTInput = document.getElementById('charINT');
const charWISInput = document.getElementById('charWIS');
const charCHAInput = document.getElementById('charCHA');
const createCharBtn = document.getElementById('createCharBtn');
const rollBtn = document.getElementById('rollBtn');
const logTextArea = document.getElementById('log');
const renderCanvas = document.getElementById('renderCanvas');
const sheetSection = document.getElementById('sheet-section');
const characterSheetDiv = document.getElementById('characterSheet');
const controlsSection = document.getElementById('controls-section');
const spawnOrcBtn = document.getElementById('spawnOrcBtn');
const attackMonsterBtn = document.getElementById('attackMonsterBtn');
const givePotionBtn = document.getElementById('givePotionBtn');
const usePotionBtn = document.getElementById('usePotionBtn');
const magicMissileBtn = document.getElementById('magicMissileBtn');
const cureWoundsBtn = document.getElementById('cureWoundsBtn');
const startDialogueBtn = document.getElementById('startDialogueBtn');
const exportCharBtn = document.getElementById('exportCharBtn');
const dialogueSection = document.getElementById('dialogue-section');
const dialogueTextDiv = document.getElementById('dialogueText');
const dialogueOptionsDiv = document.getElementById('dialogueOptions');
const closeDialogueBtn = document.getElementById('closeDialogueBtn');

// Hide the actions section until the user joins a game
actionsSection.classList.add('hidden');
characterSection.classList.add('hidden');
renderCanvas.classList.add('hidden');
campaignSection.classList.add('hidden');
controlsSection.classList.add('hidden');
mapSection.classList.add('hidden');
mapCanvas.classList.add('hidden');
sheetSection.classList.add('hidden');
dialogueSection.classList.add('hidden');

joinBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  const playerName = playerNameInput.value.trim();
  if (!gameId) {
    alert('Please enter a Game ID');
    return;
  }
  if (!playerName) {
    alert('Please enter your name');
    return;
  }
  // Emit join event to server
  socket.emit('joinGame', { gameId, playerName });
  // Switch UI panels
  joinSection.classList.add('hidden');
  // Show campaign selection first
  loadCampaigns();
  campaignSection.classList.remove('hidden');
});

rollBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  socket.emit('action', { gameId, action: { type: 'roll', sides: 20 } });
});

// Character creation handler
createCharBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  const name = charNameInput.value.trim();
  const race = charRaceInput.value.trim();
  const cls = charClassInput.value.trim();
  if (!name || !race || !cls) {
    alert('Please enter a name, race and class for your character');
    return;
  }
  // Read ability scores; default to 10 if missing
  const abilityScores = {
    str: parseInt(charSTRInput.value, 10) || 10,
    dex: parseInt(charDEXInput.value, 10) || 10,
    con: parseInt(charCONInput.value, 10) || 10,
    int: parseInt(charINTInput.value, 10) || 10,
    wis: parseInt(charWISInput.value, 10) || 10,
    cha: parseInt(charCHAInput.value, 10) || 10,
  };
  // Emit createCharacter event with ability scores
  socket.emit('createCharacter', {
    gameId,
    character: { name, race, class: cls, abilityScores },
  });
  // Hide character creation and show actions and test controls
  characterSection.classList.add('hidden');
  actionsSection.classList.remove('hidden');
  controlsSection.classList.remove('hidden');
  // Show character sheet section (contents will be populated on next gameState event)
  sheetSection.classList.remove('hidden');
  // Show the appropriate rendering canvas depending on whether a map is selected
  if (currentMap) {
    const mode = getSelectedRenderMode();
    if (mode === '3d') {
      renderCanvas.classList.remove('hidden');
      mapCanvas.classList.add('hidden');
    } else {
      renderCanvas.classList.add('hidden');
      mapCanvas.classList.remove('hidden');
    }
  } else {
    // No map selected: show the default 3D canvas with a rotating box
    renderCanvas.classList.remove('hidden');
    mapCanvas.classList.add('hidden');
    // Initialise Babylon scene if not already done
    if (!window.__babylonInitialized) {
      initBabylonScene();
      window.__babylonInitialized = true;
    }
  }
});

// Render the entire log into the textarea
function renderLog() {
  const lines = gameState.log;
  logTextArea.value = lines.join('\n');
  // Scroll to bottom
  logTextArea.scrollTop = logTextArea.scrollHeight;
}

// Append a single message to the log and update the display
function appendLog(msg) {
  const current = logTextArea.value;
  logTextArea.value = current ? `${current}\n${msg}` : msg;
  logTextArea.scrollTop = logTextArea.scrollHeight;
}

// Listen for game state updates
socket.on('gameState', (state) => {
  engine.update(state);
  renderLog();
  updateCharacterSheet(state);
});

// Listen for individual action results (sent only to this player)
socket.on('actionResult', (result) => {
  if (result && result.message) {
    appendLog(result.message);
  }
});

// Listen for error messages
socket.on('error', (msg) => {
  alert(msg);
});

// Listen for item used events and append message
socket.on('itemUsed', (result) => {
  if (result && result.message) {
    appendLog(result.message);
  }
});

// Listen for monster spawned events and append message (optional)
socket.on('monsterSpawned', (data) => {
  if (data && data.type) {
    appendLog(`A ${data.type} appears!`);
  }
});

/**
 * Initialise a Babylon.js scene with a rotating box.  This function is
 * invoked once after the player creates a character.  Extend this
 * function to add your own meshes, lights and cameras.
 */
function initBabylonScene() {
  if (typeof BABYLON === 'undefined') {
    console.error('BABYLON global not found.  Make sure Babylon.js is loaded.');
    return;
  }
  const canvas = renderCanvas;
  const engine3d = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine3d);
  // Camera
  const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 5, new BABYLON.Vector3(0, 0, 0), scene);
  camera.attachControl(canvas, true);
  // Light
  new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  // Box mesh
  const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
  // Animation
  engine3d.runRenderLoop(() => {
    box.rotation.y += 0.01;
    scene.render();
  });
  window.addEventListener('resize', () => engine3d.resize());
}

/**
 * Fetch the list of campaigns from the server and render buttons for
 * selection.  Called after joining a game.
 */
async function loadCampaigns() {
  try {
    campaignListDiv.textContent = 'Loading campaigns…';
    const res = await fetch('/api/campaigns');
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      campaignListDiv.textContent = 'No campaigns available.';
      return;
    }
    // Clear existing content
    campaignListDiv.innerHTML = '';
    list.forEach((c) => {
      const btn = document.createElement('button');
      btn.textContent = c.name;
      btn.title = c.description;
      btn.addEventListener('click', () => {
        const gameId = gameIdInput.value.trim();
        // Send selectCampaign event
        socket.emit('selectCampaign', { gameId, campaignId: c.id });
      });
      campaignListDiv.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load campaigns:', err);
    campaignListDiv.textContent = 'Error loading campaigns';
  }
}

// Load list of maps from the server and render buttons for selection
async function loadMaps() {
  try {
    mapListDiv.textContent = 'Loading maps…';
    const res = await fetch('/api/maps');
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      mapListDiv.textContent = 'No maps available.';
      return;
    }
    // Clear existing content
    mapListDiv.innerHTML = '';
    list.forEach((m) => {
      const btn = document.createElement('button');
      btn.textContent = m.name;
      btn.title = m.biome || '';
      btn.addEventListener('click', () => {
        selectMap(m.id);
      });
      mapListDiv.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load maps:', err);
    mapListDiv.textContent = 'Error loading maps';
  }
}

// Currently selected map data
let currentMap = null;

// Select a map by id: fetch details, hide map selection and show map and character creation
async function selectMap(mapId) {
  try {
    const res = await fetch(`/api/maps/${mapId}`);
    if (!res.ok) {
      throw new Error('Failed to fetch map');
    }
    currentMap = await res.json();
    // Hide map selection panel
    mapSection.classList.add('hidden');
    // Show character creation
    characterSection.classList.remove('hidden');
    // Render the map in the chosen mode
    renderMap();
  } catch (err) {
    console.error('Error selecting map:', err);
    alert('Failed to load map');
  }
}

// Determine selected render mode ('2d' or '3d')
function getSelectedRenderMode() {
  for (const input of mapModeInputs) {
    if (input.checked) return input.value;
  }
  return '2d';
}

// Render the current map according to the selected mode
function renderMap() {
  if (!currentMap) return;
  const mode = getSelectedRenderMode();
  if (mode === '2d') {
    renderMap2D(currentMap);
  } else {
    renderMap3D(currentMap);
  }
}

// Draw a 2D map on the mapCanvas using colours for each tile type
function renderMap2D(map) {
  // Hide 3D canvas and show 2D canvas
  renderCanvas.classList.add('hidden');
  mapCanvas.classList.remove('hidden');
  const ctx = mapCanvas.getContext('2d');
  const width = map.dimensions.width;
  const height = map.dimensions.height;
  const tileSize = Math.min(mapCanvas.width / width, mapCanvas.height / height);
  // Colour mapping for tile types
  const colours = {
    grass: '#7CFC00',
    road: '#DEB887',
    house: '#8B4513',
    forest: '#228B22',
    water: '#1E90FF',
    rock: '#808080',
    floor: '#A9A9A9',
    // new biomes/tiles
    void: '#000000',
    asteroid: '#505050',
    station: '#A0A0A0',
    sky: '#87CEEB',
    cloud: '#F0F8FF',
    island: '#D2B48C',
    coral: '#FF7F50',
    sand: '#C2B280',
    portal: '#800080',
  };
  ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y][x];
      const colour = colours[tile] || '#CCCCCC';
      ctx.fillStyle = colour;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      // Optional grid lines
      ctx.strokeStyle = '#f0f0f0';
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

// Draw a 3D map using Babylon.js on the renderCanvas
function renderMap3D(map) {
  // Hide 2D canvas and show 3D canvas
  mapCanvas.classList.add('hidden');
  renderCanvas.classList.remove('hidden');
  if (typeof BABYLON === 'undefined') {
    console.error('BABYLON global not found.  Make sure Babylon.js is loaded.');
    return;
  }
  // Dispose any previous map engine to avoid leaking resources
  if (window._mapEngine) {
    window._mapEngine.dispose();
    window._mapEngine = null;
  }
  const engine3d = new BABYLON.Engine(renderCanvas, true);
  window._mapEngine = engine3d;
  const scene = new BABYLON.Scene(engine3d);
  // Camera positioned above the centre of the map
  const width = map.dimensions.width;
  const height = map.dimensions.height;
  const radius = Math.max(width, height) * 1.5;
  const target = new BABYLON.Vector3((width - 1) / 2, 0, (height - 1) / 2);
  const camera = new BABYLON.ArcRotateCamera('mapCamera', -Math.PI / 2, Math.PI / 2.2, radius, target, scene);
  camera.attachControl(renderCanvas, true);
  new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  // Colours mapping
  const colours = {
    grass: '#7CFC00',
    road: '#DEB887',
    house: '#8B4513',
    forest: '#228B22',
    water: '#1E90FF',
    rock: '#808080',
    floor: '#A9A9A9',
    // new biomes/tiles
    void: '#000000',
    asteroid: '#505050',
    station: '#A0A0A0',
    sky: '#87CEEB',
    cloud: '#F0F8FF',
    island: '#D2B48C',
    coral: '#FF7F50',
    sand: '#C2B280',
    portal: '#800080',
  };
  // Create a ground tile for each map cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y][x];
      const ground = BABYLON.MeshBuilder.CreateGround(`tile_${x}_${y}`, { width: 1, height: 1 }, scene);
      ground.position.x = x;
      ground.position.z = y;
      const mat = new BABYLON.StandardMaterial(`mat_${x}_${y}`, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(colours[tile] || '#CCCCCC');
      ground.material = mat;
    }
  }
  engine3d.runRenderLoop(() => {
    scene.render();
  });
  window.addEventListener('resize', () => engine3d.resize());
}

// Update the character sheet display based on the latest game state
function updateCharacterSheet(state) {
  if (!state) return;
  const players = state.players || [];
  const me = players.find((p) => p.id === socket.id);
  if (!me || !me.character) {
    characterSheetDiv.innerHTML = '<p>No character.</p>';
    return;
  }
  const c = me.character;
  let html = '';
  html += `<p><strong>Name:</strong> ${c.name || ''}</p>`;
  html += `<p><strong>Race:</strong> ${c.race || ''}</p>`;
  html += `<p><strong>Class:</strong> ${c.class || ''}</p>`;
  html += `<p><strong>Level:</strong> ${c.level || 1} &nbsp;&nbsp; <strong>XP:</strong> ${c.experience || 0}</p>`;
  html += `<p><strong>HP:</strong> ${c.hp || '?'} &nbsp;&nbsp; <strong>AC:</strong> ${c.ac || 10}</p>`;
  // Ability scores
  if (c.abilityScores) {
    html += '<p><strong>Ability Scores:</strong></p><ul>';
    for (const [key, value] of Object.entries(c.abilityScores)) {
      const label = key.toUpperCase();
      html += `<li>${label}: ${value}</li>`;
    }
    html += '</ul>';
  }
  // Saving throws
  if (c.savingThrows) {
    html += '<p><strong>Saving Throws:</strong></p><ul>';
    for (const [key, value] of Object.entries(c.savingThrows)) {
      html += `<li>${key}: ${value}</li>`;
    }
    html += '</ul>';
  }
  // Inventory
  if (Array.isArray(c.inventory) && c.inventory.length > 0) {
    html += '<p><strong>Inventory:</strong></p><ul>';
    for (const item of c.inventory) {
      html += `<li>${item}</li>`;
    }
    html += '</ul>';
  }
  characterSheetDiv.innerHTML = html;
}

// Re-render the map when the render mode changes
for (const input of mapModeInputs) {
  input.addEventListener('change', () => {
    renderMap();
  });
}

// Hook up test control buttons
spawnOrcBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  socket.emit('spawnMonster', { gameId, monsterType: 'orc' });
});

attackMonsterBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  const monsters = gameState.monsters;
  if (!Array.isArray(monsters) || monsters.length === 0) {
    alert('No monsters to attack.');
    return;
  }
  // Attack the first monster in the list
  const target = monsters[0];
  socket.emit('action', { gameId, action: { type: 'attack', targetType: 'monster', targetId: target.instanceId } });
});

givePotionBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  // Give a healing potion to this player using their socket ID
  socket.emit('giveItem', { gameId, targetPlayerId: socket.id, itemId: 'healingPotion' });
});

usePotionBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  socket.emit('useItem', { gameId, itemId: 'healingPotion' });
});

// Cast Magic Missile at the first monster in the game
magicMissileBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  const monsters = gameState.monsters;
  if (!Array.isArray(monsters) || monsters.length === 0) {
    alert('No monsters to target.');
    return;
  }
  const target = monsters[0];
  socket.emit('action', {
    gameId,
    action: {
      type: 'castSpell',
      spellName: 'Magic Missile',
      targetType: 'monster',
      targetId: target.instanceId,
    },
  });
});

// Cast Cure Light Wounds on yourself
cureWoundsBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  socket.emit('action', {
    gameId,
    action: {
      type: 'castSpell',
      spellName: 'Cure Light Wounds',
      targetType: 'player',
      targetId: socket.id,
    },
  });
});

// Receive campaign selection confirmation from server
socket.on('campaignSelected', (summary) => {
  // Hide campaign selection and show character creation
  campaignSection.classList.add('hidden');
  // Show map selection
  loadMaps();
  mapSection.classList.remove('hidden');
  // Optionally log the campaign name
  appendLog(`Campaign selected: ${summary.name}`);
  // Load dialogues for this campaign
  loadDialogues(summary.id);
});

// Store list of dialogues for the current campaign
let campaignDialogues = [];
async function loadDialogues(campaignId) {
  try {
    const res = await fetch(`/api/dialogues/${campaignId}`);
    const list = await res.json();
    if (Array.isArray(list)) {
      campaignDialogues = list;
    } else {
      campaignDialogues = [];
    }
  } catch (err) {
    console.error('Failed to load dialogues:', err);
    campaignDialogues = [];
  }
}

// Dialogue state variables
let currentDialogueId = null;
let currentConversationId = null;
let currentNodeId = null;

// Start a dialogue when the button is clicked
startDialogueBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  if (!campaignDialogues || campaignDialogues.length === 0) {
    alert('No dialogues available for this campaign.');
    return;
  }
  // Choose the first dialogue file and the first conversation by default
  const dlgFile = campaignDialogues[0];
  const conv = dlgFile.conversations && dlgFile.conversations[0];
  if (!conv) {
    alert('No conversations defined in this dialogue file.');
    return;
  }
  currentDialogueId = dlgFile.id;
  currentConversationId = conv.id;
  // Request the first node from the server
  socket.emit('startDialogue', {
    gameId,
    dialogueId: currentDialogueId,
    conversationId: currentConversationId,
  });
});

// Display a dialogue node returned from the server
socket.on('dialogueNode', (data) => {
  if (!data) return;
  dialogueSection.classList.remove('hidden');
  dialogueTextDiv.textContent = data.text;
  currentNodeId = data.nodeId;
  // Remove old options
  dialogueOptionsDiv.innerHTML = '';
  // Create buttons for options
  if (Array.isArray(data.options) && data.options.length > 0) {
    data.options.forEach((text, idx) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.display = 'block';
      btn.style.marginBottom = '0.25rem';
      btn.addEventListener('click', () => {
        const gameId = gameIdInput.value.trim();
        socket.emit('chooseDialogueOption', {
          gameId,
          dialogueId: currentDialogueId,
          conversationId: currentConversationId,
          nodeId: currentNodeId,
          optionIndex: idx,
        });
      });
      dialogueOptionsDiv.appendChild(btn);
    });
  } else {
    // No options: conversation ended; show close button
    closeDialogueBtn.classList.remove('hidden');
  }
});

// Handle dialogue end
socket.on('dialogueEnd', () => {
  // Hide dialogue section and clear state
  dialogueSection.classList.add('hidden');
  dialogueOptionsDiv.innerHTML = '';
  dialogueTextDiv.textContent = '';
  closeDialogueBtn.classList.add('hidden');
  currentNodeId = null;
});

// Close dialogue manually
closeDialogueBtn.addEventListener('click', () => {
  dialogueSection.classList.add('hidden');
  dialogueOptionsDiv.innerHTML = '';
  dialogueTextDiv.textContent = '';
  closeDialogueBtn.classList.add('hidden');
  currentNodeId = null;
});

// Export character to a JSON file
exportCharBtn.addEventListener('click', () => {
  const gameId = gameIdInput.value.trim();
  if (!gameId) return;
  socket.emit('exportCharacter', { gameId });
});

// Receive exported character and trigger download
socket.on('characterExport', (char) => {
  if (!char) {
    alert('No character to export.');
    return;
  }
  const dataStr = JSON.stringify(char, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = `${char.name || 'character'}.json`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});