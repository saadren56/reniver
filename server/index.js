const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('presence:online', Array.from(onlineUsers.keys()));
    console.log('Online users:', Array.from(onlineUsers.keys()));
  });

  socket.on('message:send', (message) => {
    socket.broadcast.emit('message:new', message);
  });

  socket.on('typing:start', (data) => {
    socket.broadcast.emit('typing:start', data);
  });

  socket.on('typing:stop', (data) => {
    socket.broadcast.emit('typing:stop', data);
  });

  socket.on('message:seen', (data) => {
    socket.broadcast.emit('message:seen', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('presence:offline', userId);
        console.log('User disconnected:', userId);
        break;
      }
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
