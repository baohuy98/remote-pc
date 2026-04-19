import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandler } from './socket/handler';

const SECRET = process.env.RPC_SECRET;
if (!SECRET) {
  console.error('RPC_SECRET env var is required. Refusing to start.');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
  if (token === SECRET) return next();
  next(new Error('unauthorized'));
});

const PORT = 3000;

app.get('/', (_req, res) => {
  res.json({ status: 'Remote PC Server running', connections: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerSocketHandler(io, socket);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
