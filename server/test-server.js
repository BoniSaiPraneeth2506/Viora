const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Minimal Socket.IO server
const io = new Server(httpServer, {
  path: '/api/socketio',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.headers['user-agent']}`);
  next();
});

io.on('connection', (socket) => {
  console.log('✅ SOCKET CONNECTED:', socket.id);
  
  socket.on('test', (data) => {
    console.log('📨 Test message:', data);
    socket.emit('test-response', { received: data, timestamp: Date.now() });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Test server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Socket.IO path: /api/socketio`);
});