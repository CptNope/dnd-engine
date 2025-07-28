# DnD‑Engine

A **modular JavaScript engine** for building **Dungeons & Dragons®‑style** games.  The
engine is designed around the early editions of D&D and aims to be flexible
enough to support both **2‑D** and **3‑D** play, synchronous and asynchronous
multiplayer, and extensible rulesets.  It ships with a Node.js server,
a vanilla‑JS client and a PWA companion so you can run campaigns in a browser
or as an installable app.

> **Disclaimer:** this repository does **not** contain the original Dungeons
> and Dragons books.  It merely defines data structures and modules that can
> be used to load your own legally obtained rulebooks.  Check the terms of
> your local copyright law before distributing any of the original content.

## Motivation

The classic tabletop experience combines rules, imagination, and social
interaction.  When playing remotely or asynchronously it is useful to have
an engine that:

- **Encapsulates game logic** (turn order, combat resolution, saving throws,
  spell and ability usage, etc.) without forcing a specific UI.
- **Supports real‑time and asynchronous play**—players can connect via
  WebSockets for live sessions or make their moves later and have the state
  persist.
- **Separates rules from presentation** so you can render maps in 2‑D with
  Canvas or 3‑D with WebGL (e.g. [Three.js](https://threejs.org/)) without
  rewriting the core logic.
- **Is extendable**: you can add new modules for additional classes, races,
  items, monsters or even variant rulesets.

## Project structure

This repository uses a **mono‑repo** layout with separate folders for the
server and client.  Use this as a skeleton for your own game.  You can add
more folders or files as your campaign grows.

```
├── README.md           – this file
├── package.json        – Node.js dependencies and scripts
├── .gitignore          – files to be ignored by git
├── config.json         – server configuration (e.g. single vs multi‑player)
├── rules               – JSON files defining classes, spells, monsters and items
│   ├── classes.json
│   ├── spells.json
│   ├── monsters.json
│   └── items.json
├── maps                – JSON files defining maps and biomes
│   ├── town.json       – sample town map
│   ├── cave.json       – sample cave/dungeon map
│   └── overworld.json  – sample overworld map
├── campaigns           – JSON files defining pre‑made campaigns
│   └── test-campaign.json
├── src
│   ├── server
│   │   ├── app.js     – Express app and server bootstrap
│   │   ├── sockets
│   │   │   └── index.js – WebSocket (socket.io) handlers
│   │   ├── routes
│   │   │   └── index.js – REST API endpoints
│   │   ├── models
│   │   │   └── index.js – example in‑memory models
│   │   └── controllers
│   │       └── index.js – example controllers
│   └── client
│       ├── index.html – entry point for the client
│       ├── js
│       │   ├── main.js – bootstraps the client and connects to the server
│       │   └── engine
│       │       ├── core.js – game engine core
│       │       └── modules
│       │           └── gameState.js – example module for tracking state
│       └── css
│           └── styles.css – basic styling
└── public
    ├── sw.js          – service worker for PWA support
    └── manifest.json  – web app manifest

If you enable 3‑D rendering with Babylon.js (see the **Babylon.js integration**
section below) you will also find a `<canvas id="renderCanvas">` element in
`src/client/index.html`.  The Babylon scene is initialised in
`src/client/js/main.js` after a player has created a character.

### Rules directory

The `rules/` folder contains JSON files that describe the fundamental
elements of your campaign—character classes, spells and monsters.  The
server loads these files at startup and exposes them through the
`src/server/rules/index.js` module.  Each file uses a simple schema:

- **classes.json:** maps a class name to its attributes (`hitDie`,
  `experienceTable`, `savingThrows` and optional `spellSlots` and
  `abilities`.  Expand this file with additional classes or variant
  rules.  The provided entries for *cleric*, *fighter* and *thief* are
  merely examples.  The thief example includes a sample `abilities`
  object which lists the base success percentages for common thief
  skills.  Replace these numbers with the correct values from the
  Expert rulebook.
- **spells.json:** groups spells by caster type and spell level.  Each
  spell defines a `name`, `range`, `duration` and `description`.  You
  should populate this file with the spells from your rulebooks.
- **monsters.json:** defines monsters and their statistics
  (`armorClass`, `hitDice`, `attacks`, `movement`, etc.).  The
  examples include an *orc* and a *wolf* to illustrate the structure.
- **items.json:** describes equipment, treasure and consumables.  Each
  item includes properties such as `type` (e.g. `weapon`, `armour`,
  `potion`), `damage` or `effect` (dice notation), and optional
  modifiers to armour class or attributes.  Examples include a short
  sword, shield, healing potion and potion of strength.

By externalising rules into JSON you can update the game content
without changing any code.  A future enhancement could allow the
client to request rules from the server via an API endpoint and
display them in a rulebook viewer.

### Configuration file

The `config.json` file controls certain aspects of the server at runtime.
Currently it exposes a single setting `mode` which can be either
`"single"` or `"multi"`.  In *single* mode the server may impose
restrictions (such as allowing only one player per game) or enable AI
modules to simulate a Dungeon Master.  In *multi* mode it permits
multiple players to join the same game.  You can extend the
configuration with additional options such as database credentials or
logging levels.  See `src/server/config.js` for how the configuration
is loaded.

## Campaigns

A **campaign** is a collection of maps, quests, monsters and items
packaged into a single JSON document.  Campaigns live in the
`campaigns/` folder and have at minimum an `id`, `name` and
`description`.  A campaign file can include additional fields such as
`startingLocation` (the map ID where players begin), an array of
`maps` (each with an `id`, `name`, `description`, optional `npcs` and
`monsters`), and top‑level arrays for `monsters`, `items` and
`quests`.  The maps referenced in a campaign correspond to the map
definitions in the `maps/` folder—this lets you compose adventures
from multiple biomes and environments.

The server exposes an API (`GET /api/campaigns`) that returns the
list of available campaigns, and clients can request a specific
campaign by ID (`GET /api/campaigns/:id`).  During a game session the
players select a campaign using the WebSocket event `selectCampaign`.
The server then attaches the campaign data to the game state and
broadcasts a `campaignSelected` event to all participants.

The example `campaigns/test-campaign.json` defines a tiny sample
adventure (“Test Campaign”) with a single map.  To create your own
campaign, add another `.json` file to the `campaigns/` folder following
the same schema: assign it a unique `id`, provide a friendly
`name` and `description`, list the maps it includes, and specify any
monsters, items or quests relevant to your adventure.  You can embed
arbitrary data as needed—this repository does not enforce a strict
schema beyond the basics.  In the future you might build a
campaign editor that exports JSON into this folder, enabling Dungeon
Masters to design their own adventures.

## Monsters and Items

The `rules/monsters.json` and `rules/items.json` files store the
statistics and effects of the creatures and equipment available in
your world.  Monsters include armour class, hit dice and attacks,
while items describe potions, weapons, armour and treasure.  The
provided examples include *orc*, *wolf*, *goblin* and *skeleton*
monsters along with a **Potion of Healing**, a **Short Sword**, a
**Shield** and a **Potion of Strength**.  Extend these files with
your own creatures and gear as desired.

The server exposes helpers to spawn monsters and give or use items via
WebSocket events:

| Action         | Description                                                    |
|----------------|----------------------------------------------------------------|
| `spawnMonster` | Adds a monster to the current game using data from your rules. |
| `giveItem`     | Gives an item to a player’s inventory.                         |
| `useItem`      | Consumes an item (e.g. a healing potion) and applies effects. |

On the client you can emit these events like this:

```js
socket.emit('spawnMonster', { gameId, monsterType: 'orc' });
socket.emit('giveItem', { gameId, targetPlayerId: somePlayerId, itemId: 'healingPotion' });
socket.emit('useItem', { gameId, itemId: 'healingPotion' });
```

Spawning monsters and giving items are typically Dungeon Master or testing
commands—you may want to restrict them to authorised users.  Items
include simple weapons and armour (e.g. the short sword and shield),
healing potions and ability potions.  When a healing potion is used
the server rolls the appropriate dice and adds the result to the
character’s hit points.  Shields currently grant a passive +1 bonus to
armour class when equipped—implement the logic for equipping items in
your controllers if you wish to support this fully.  The potion of
strength is defined in the rules file but its effect has not yet been
implemented.

For convenience the demo client includes a **Test controls** panel that
appears after you create a character.  From this panel you can:

- **Spawn Orc** – emits `spawnMonster` with `monsterType: 'orc'`.
- **Attack Monster** – targets the first monster in the game
  (if any) and emits an `action` of type `attack` with
  `targetType: 'monster'`.
- **Get Healing Potion** – gives the current player a `healingPotion`.
- **Use Healing Potion** – consumes a `healingPotion` from your
  inventory.  The healing amount is rolled on the server and logged.

Use these buttons to test the combat and item subsystems.  In a real
campaign you would likely provide a Dungeon Master interface or
contextual controls rather than exposing these actions to all players.

As you expand the rules to include more powerful monsters, exotic
weapons and magical artefacts, implement their behaviour in

`src/server/controllers/combat.js`, `src/server/controllers/items.js` and
your client logic.  For monster AI, create functions to decide how and
when monsters act (attack, flee, cast spells) and hook them into the
game loop.

## Maps and biomes

The `maps/` folder stores JSON files that describe the physical layout of
your game world.  Each map defines an `id`, `name`, `biome`,
`dimensions` (width and height) and a 2‑D array of `tiles`.  The server
loads all maps at startup and exposes them through the REST API—`GET
/api/maps` returns a summary list and `GET /api/maps/:id` returns the
full details.  After selecting a campaign, the client presents a
**Map Selection** panel from which players can choose a map and select
whether to render it in 2‑D or 3‑D.

Several sample maps are provided:

- **town.json** – a 10 × 10 overworld representing a small town with
  grass, roads and houses.
- **cave.json** – a cave or dungeon environment with rock walls, floors
  and pools of water.
- **overworld.json** – an exterior biome with grass, forest and water.

You can add your own maps by placing additional `.json` files into the
`maps/` directory.  To create more exotic environments—such as
space, sky, other dimensions or underwater realms—define appropriate
`tiles` (`void`, `asteroid`, `cloud`, `island`, `coral`, etc.) and set
the `biome` field accordingly.  A map file may look like this:

```json
{
  "id": "space",
  "name": "Space Station",
  "biome": "space",
  "dimensions": { "width": 12, "height": 12 },
  "tiles": [
    ["void", "void", "void", /* ... */],
    ["void", "asteroid", "void", /* ... */],
    /* ... */
  ]
}
```

On the client you can render maps in **2‑D** or **3‑D**.  The map
selection panel includes radio buttons to toggle the mode.  In 2‑D mode
the client uses the Canvas API to draw a top‑down grid with colours
mapped to tile types.  In 3‑D mode the client leverages Babylon.js to
create a ground mesh for each tile and allows the camera to orbit the
scene.  The map is rendered as soon as you select it, and character
creation occurs afterwards.  When you create your character the engine
either continues displaying the selected map or shows the default
rotating box if no map was chosen.

As you build out your world, consider creating additional biomes such
as dungeons, towns, caves, underwater realms, floating islands and
alternate dimensions.  These maps can be swapped in and out during a
campaign or combined into a single adventure by referencing multiple
map files in your campaign definition.

## Dialogue system, experience and character export

To support interactive storytelling and persistent adventurers, the
engine now includes a **dialogue system**, **experience/level
tracking** and **character export**.

### Dialogues

Dialogue files live in the `dialogues/` folder.  Each file ties a set of
conversations to a campaign via a `campaignId` field.  A dialogue
contains one or more conversations, each with a unique `id`, a
`name`, a `start` node, and a `nodes` object.  Every node has
`text` and an array of `options`.  Options may specify a `next`
node and an optional `reward` object with `xp` and a list of `items`.
When a player chooses an option, any rewards are applied and the
conversation moves to the next node.  See
`dialogues/test.json` for an example conversation with an old man
offering either a small reward or a larger reward based on the
player’s response.

The server loads all dialogue files at startup and provides API
endpoints (`GET /api/dialogues/:campaignId` and `GET /api/dialogue/:id`) to
enumerate and fetch them.  Clients start a conversation by emitting
the `startDialogue` WebSocket event with the game ID, dialogue file
ID and conversation ID.  The server returns the starting node via
`dialogueNode`.  Players respond using the `chooseDialogueOption` event,
passing the index of the selected option.  The server resolves the
choice, awards any rewards, updates the game state and returns the
next node or `dialogueEnd` when the conversation finishes.

The demo client adds a **Start Dialogue** button in the Test controls
panel.  After selecting a campaign and map and creating your
character, click this button to begin the first conversation defined
for that campaign.  A panel will display the NPC’s dialogue and
present options.  Selecting an option applies the reward (experience
points or items) and advances the conversation.  When the dialogue
ends the panel hides automatically.

### Experience and leveling

Each character now tracks `experience` and `level` in addition to hit
points and armour class.  Experience is awarded when certain
actions—such as completing a dialogue or defeating a monster—grant
XP.  A simple progression system increases a character’s level
whenever their accumulated experience meets or exceeds the threshold
(`level × 1000` by default).  Level‑up messages are appended to the
game log.  You can adjust the experience thresholds or implement the
official D&D progression tables in `src/server/models/index.js`.

### Character export

Players may wish to carry their adventurers from one campaign to
another.  Clicking the **Export Character** button in the Test
controls triggers the `exportCharacter` WebSocket event.  The server
responds with the player’s character data (name, race, class, level,
experience, hit points and inventory) and the client initiates a
download of a JSON file.  This file can later be imported into
another campaign (not yet implemented) or simply kept as a record of
the character’s progress.

These features lay the groundwork for rich role‑playing experiences.
Future enhancements could include branching dialogues, skill checks
within conversations, persistent databases for character storage and
DM tools for managing rewards and progression.

## Spellcasting and Monster AI

The engine now supports simple spellcasting and automated monster
behaviour.  Spells are defined in `rules/spells.json` alongside their
effects.  In the provided example, *Cure Light Wounds* heals a target
for `1d6+1` and *Magic Missile* deals `1d4+1` damage to a single
target.  Each spell entry can include an `effect` with either a
`heal` or `damage` field specifying dice notation.

To cast a spell, the client emits an `action` with type
`castSpell`, supplying the `spellName`, `targetType` and `targetId`.
For example, to cast Magic Missile at a monster:

```js
socket.emit('action', {
  gameId,
  action: {
    type: 'castSpell',
    spellName: 'Magic Missile',
    targetType: 'monster',
    targetId: someMonsterId,
  },
});
```

On the server, the spell controller looks up the spell by name, rolls
the appropriate dice and applies damage or healing.  Damage spells
perform a simple attack roll against the target’s armour class and
apply the result.  Healing spells currently only target players.

The demo client’s Test controls panel includes buttons for **Cast Magic
Missile** and **Cast Cure Wounds**.  *Magic Missile* targets the first
monster in the encounter, while *Cure Wounds* heals the caster.

### Monster AI

When a monster is spawned via `spawnMonster` the server starts a
background interval that causes the monster to attack a random player
every 15 seconds.  The AI uses the monster’s first attack entry in
`rules/monsters.json` to determine damage.  If the monster dies or
there are no valid player targets, the interval is cancelled.  This
simple loop demonstrates how you might structure more sophisticated
behaviour—adding movement, targeting priorities or spellcasting.
```

### Server (`src/server`)

The server is written using [Express](https://expressjs.com/) for HTTP
endpoints and [socket.io](https://socket.io/) for WebSocket messaging.  By
default it stores everything in memory.  For persistent campaigns you can
swap in a database (see below).

- **app.js** initializes the Express app, serves static files from the
  client, binds the REST routes and the WebSocket server and starts
  listening on a port (default: `3000`).
- **routes/index.js** defines REST endpoints (e.g. `GET /api/version` returns
  version information).  Add additional routes here for admin tasks,
  uploading campaign data or retrieving a list of active games.
- **sockets/index.js** contains all WebSocket event handlers.  For example,
  when a user joins a game the client emits `"joinGame"` with a game ID.
  The server then adds the player to a room, updates the game state and
  emits updates to the other players.
- **models/index.js** demonstrates a very simple in‑memory game model.  Real
  campaigns will likely need persistent storage (see the **Data
  persistence** section below).  You might start with a JSON file or
  integrate a database driver here.
- **controllers/index.js** is where you encapsulate your core game logic.
  The provided example includes a rudimentary `rollDie` function and turn
  management.  Expand this module to include combat, spells, skill checks,
  saving throws and so on.

### Client (`src/client`)

The client is kept intentionally simple and uses no framework.  It uses
native `ES6` modules and the [socket.io client](https://socket.io/docs/v4/client-api/)
to communicate with the server.  You can replace or enhance this with a
framework (React, Vue, Svelte) if you wish, but starting from vanilla
JavaScript ensures that the engine can run in constrained environments.

- **index.html** includes the initial markup, links to the CSS and JS
  bundles, registers the service worker and defines basic UI elements.  At
  this stage it only provides a text area and a log for messages.
- **js/main.js** imports the engine, connects to the WebSocket, wires up
  DOM events and propagates messages back and forth.
- **js/engine/core.js** defines the engine object.  The core handles the
  game loop, state management, and interaction between modules.  At
  present it offers a minimal API (`start()`, `stop()`, `registerModule()`)
  but you are expected to extend it.
- **js/engine/modules/gameState.js** is an example module.  It exports a
  class that can be registered with the core engine to manage shared state.
  Additional modules might implement pathfinding, character sheets,
  random treasure generation or map rendering.  By keeping modules
  independent you can swap them out or write tests for each one.
- **css/styles.css** provides the bare minimum styling.  Use your own
  framework or plain CSS here.  The PWA manifest refers to the icons in
  `/public` – you can generate these using tools like
  [maskable.app](https://maskable.app/editor) or `pwa-asset-generator`.

### Public assets (`public`)

Any files in the `public` folder are served verbatim by Express.  The
provided `manifest.json` makes the client installable as a **Progressive
Web App (PWA)** and `sw.js` implements a simple cache strategy so the
client works offline after the first load.  Feel free to customise the
manifest with your own icons, name and theme colours.

## Getting started

### Prerequisites

- **Node.js** ≥ 18.  Use [nvm](https://github.com/nvm-sh/nvm) to manage
  versions if required.
- **npm** comes bundled with Node.  Yarn or pnpm will also work.

### Installation

Clone or download this repository and install the dependencies:

```bash
git clone https://github.com/yourname/dnd‑engine.git
cd dnd‑engine
npm install
```

Start the development server:

```bash
npm start
```

Open <http://localhost:3000> in your browser.  The server will
automatically serve the client files.  If you edit any file the
server will restart thanks to `nodemon` configured in `package.json` (see
the `scripts` section).  WebSocket connections will automatically
reconnect.

### Extending the engine

The provided code is just a scaffold.  Here are some ideas on how to
extend it:

1. **Implement the core mechanics.**  Use early D&D rulebooks to
   implement the logic for ability checks, combat (initiative, attack and
   damage rolls, armour class), spells (casting time, saving throws,
   durations) and experience points.  Keep the core generic so that it
   doesn’t care whether the players are using a 2‑D map or 3‑D scene.
2. **Design the data format.**  Create JSON or YAML files for monsters,
   spells, classes and items based on your source material.  This way you
   can load content without hard‑coding it in the engine.  Consider using
   a schema (e.g. with [JSON Schema](https://json-schema.org/)) so the
   engine can validate custom content.
3. **Add a database layer.**  For casual use a JSON file may suffice.  For
   persistent, asynchronous campaigns, consider integrating a database.
   Cheap and/or free options include:

   | Option            | Notes                                                     |
   |-------------------|-----------------------------------------------------------|
   | **SQLite**        | Runs in‑process and requires no separate server.  Great for prototyping.  Node has the [better‑sqlite3](https://github.com/WiseLibs/better-sqlite3) package. |
   | **PostgreSQL**    | A powerful relational database.  [Supabase](https://supabase.com/) offers a generous free tier which you can connect to using the `pg` package. |
   | **MongoDB Atlas** | A document database with a free tier.  Node integration via the `mongodb` driver or `mongoose`. |
   | **Firebase Firestore** | Serverless NoSQL store with generous quotas.  Good for real‑time updates. |
   | **Lowdb**         | A lightweight JSON database.  Great for small campaigns or offline desktop use. |

4. **Render the map.**  The demo client currently prints messages only.  To
   visualise the world you could:

   - Use the `<canvas>` API or [PixiJS](https://pixijs.com/) for
     isometric or top‑down 2‑D maps.
   - Use [Three.js](https://threejs.org/) to render 3‑D scenes.  The
     modular design means that your rendering layer can subscribe to
     engine updates and draw accordingly.  Import the library in
     `main.js` and create a `Renderer` module.

5. **Asynchronous play.**  For play‑by‑post or asynchronous campaigns you
   need to persist the game state.  When a player takes an action the
   server should store it and apply it to the next game state.  You can
   schedule reminders or send notifications to players when it is their
   turn.  A database is essential for this feature.

6. **PWA enhancements.**  Customise the service worker to pre‑cache
   campaign assets (maps, character portraits) and push updates to users.
   The manifest includes placeholders for icons and names—replace these
   with your own.  You can generate icons using `pwa‑asset‑generator`.

## Babylon.js integration

If you wish to present your world in **3‑D**, this repository includes a
starter hook for [Babylon.js](https://www.babylonjs.com/), a powerful
WebGL engine.  By default Babylon.js is loaded via a CDN in
`index.html` and `main.js` initialises a simple rotating box to confirm
that the engine works.  To enable Babylon in your own campaign:

1. **Extend the scene.**  Modify the `initBabylonScene()` function in
   `src/client/js/main.js` to create your own meshes, lights and
   cameras.  Consult Babylon’s documentation to learn about materials,
   physics and model loaders (GLTF, OBJ, etc.).
2. **Use your assets.**  Replace the placeholder box with your own
   terrain and character models.  Many community assets are available
   under permissive licences.  Load models asynchronously and attach
   them to the scene once they are ready.
3. **Synchronise with the game state.**  Subscribe to engine updates and
   move your Babylon meshes to reflect player and monster positions.
   You can create a `Renderer` module that listens for state changes
   and updates the scene accordingly.
4. **Install Babylon locally (optional).**  The current setup loads
   Babylon from a CDN.  If you prefer to bundle it locally, run
   `npm install babylonjs` and then `import * as BABYLON from
   'babylonjs';` in your client code.

## Character creation

An example character creation flow has been added to demonstrate how
players can define their adventurers before entering the world.  After
joining a game the client displays a **Character Creation** panel where
players can enter a character name, race and class.  These details are
sent to the server via a new WebSocket event (`createCharacter`).  The
server stores the character in its in‑memory model and broadcasts the
updated state to all players.  The engine then initialises the 3‑D
scene.

You should extend this functionality to include ability scores,
equipment and other attributes according to the source material.  To
persist characters across sessions, save them in your database (see the
**Add a database layer** section).  You could also implement a
front‑end character builder that enforces the rules from the early D&D
books, helping players generate valid characters.

### Hosting suggestions

Here are some affordable or free hosting options for different parts of
your stack:

- **Static front end:** [Vercel](https://vercel.com/) and
  [Netlify](https://www.netlify.com/) both offer generous free tiers for
  static sites.  They support deploying custom Node API routes as
  serverless functions if you only need limited backend features.
- **Full Node server:** [Render](https://render.com/) and
  [Fly.io](https://fly.io/) provide free services for small Node
  applications with minimal concurrency.  [Railway](https://railway.app/)
  also has a community plan.  Traditional providers like
  [Heroku](https://www.heroku.com/) used to offer free dynos but now
  require payment; however they still have a generous free database
  tier (e.g. Postgres) that you can couple with a cheap server elsewhere.
- **Databases:** In addition to Supabase, MongoDB Atlas and Firestore
  mentioned above, you can spin up an SQLite database on disk or use
  serverless solutions like [PocketBase](https://pocketbase.io/).

## Contributing

Pull requests are welcome!  When adding new features please try to keep
modules independent and document any public APIs.  Tests (e.g. using
Jest) are encouraged.  If you find a bug or have a feature request open
an issue describing it.

## License

This project is licensed under the [MIT License](LICENSE).  Dungeons &
Dragons® is a trademark of Wizards of the Coast, LLC.  This project is
unofficial and not endorsed by Wizards of the Coast.