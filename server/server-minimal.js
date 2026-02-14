const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

const io = new Server(server, {
  path: '/api/socketio',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Basic logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket connection
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);
  
  socket.emit('welcome', { message: 'Connected successfully!', socketId: socket.id });
  
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Path: /api/socketio`);
});