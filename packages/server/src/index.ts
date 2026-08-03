import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@triominos/shared';
import { registerSocketHandlers } from './socketHandlers.js';
import { sweepEmptyRooms } from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_DIST = path.join(__dirname, '../../client/dist');

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: '*' },
});

app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) res.status(200).send('Tri-Ominos server is running. Start the client dev server separately in dev mode.');
  });
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

setInterval(sweepEmptyRooms, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Tri-Ominos server listening on http://localhost:${PORT}`);
});
