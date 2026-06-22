import { Server } from 'socket.io';
import server from '../serverHttp.js';

export const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
