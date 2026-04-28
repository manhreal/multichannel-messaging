import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin:  ['http://localhost:3301', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Agent connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Agent disconnected:', socket.id);
    });
  });

  return io;
}

export function notifyAgents(event: string, data: any) {
  if (io) io.emit(event, data);
}
