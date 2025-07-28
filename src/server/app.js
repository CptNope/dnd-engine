// Entry point for the Node.js server
//
// This file sets up an Express application, serves static files for the
// client, mounts REST routes and initialises socket.io for WebSocket
// communications.  It demonstrates how to integrate both HTTP and
// real‑time messaging in a single process.

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import our routes and socket handlers
import routes from './routes/index.js';
import registerSockets from './sockets/index.js';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Create a new socket.io server and attach it to the HTTP server
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
  },
});

// Serve static files for the client (HTML, CSS, JS)
// We serve both the client directory and the public directory so that
// `manifest.json` and `sw.js` are accessible at the root of the site.
const clientDir = path.join(__dirname, '..', 'client');
const publicDir = path.join(__dirname, '..', '..', 'public');

app.use(express.static(clientDir));
app.use(express.static(publicDir));

// Mount JSON body parser (for POST requests)
app.use(express.json());

// Mount API routes under /api
app.use('/api', routes);

// Register WebSocket handlers
registerSockets(io);

// Catch‑all route to serve index.html for client‑side routing (if you add
// a front‑end router).  Must come after API routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});