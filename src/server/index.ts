import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Game } from './game.js';
import { ServerToClientEvents, ClientToServerEvents } from '../shared/types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

const game = new Game(io);
game.start();

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Shatter server listening on port ${PORT}`);
});
