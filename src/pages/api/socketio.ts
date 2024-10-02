// src/pages/api/socketio.ts
import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '../../types/next';

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
      });

      socket.on('code-change', (data) => {
        socket.to(data.roomId).emit('code-update', data.code);
      });
    });
  }

  res.end();
};

export default ioHandler;

