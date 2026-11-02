import http from 'http';
import app from './app';
import { initSocketServer } from './sockets/socket.server';

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// Iniciar Socket.io
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`⚡ Socket.io listo para tiempo real`);
});
