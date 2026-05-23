const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  pingInterval: 10000,
  pingTimeout: 5000,
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

  socket.on('friend_request:send', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend_request:new', data);
    }
  });

  socket.on('friend_request:accept', (data) => {
    const senderSocketId = onlineUsers.get(data.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('friend_request:accepted', data);
    }
  });

  socket.on('friend_request:decline', (data) => {
    const senderSocketId = onlineUsers.get(data.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('friend_request:declined', data);
    }
  });

  socket.on('friend:added', (data) => {
    const friendSocketId = onlineUsers.get(data.friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friend:added', data);
    }
  });

  socket.on('friend:removed', (data) => {
    const friendSocketId = onlineUsers.get(data.friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friend:removed', data);
    }
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
