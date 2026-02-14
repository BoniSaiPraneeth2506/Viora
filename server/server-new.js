/**
 * Viora Socket.IO Server - Production Ready
 * Real-time messaging with instant bidirectional communication
 */

// Enable Socket.IO debug logging
process.env.DEBUG = 'socket.io:*,engine:*';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Socket.IO server with React Native optimizations
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true // Support older clients
});

// Socket.IO error logging
io.engine.on('connection_error', (err) => {
  console.error('❌ Socket.IO connection error:', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// IMPORTANT: Middleware AFTER Socket.IO initialization
// This prevents middleware from interfering with Socket.IO handshakes
app.use(cors({ origin: '*' }));
app.use(express.json());

// Simple request logger (non-interfering)  
app.use((req, res, next) => {
  // Don't log Socket.IO requests to reduce noise
  if (!req.url.startsWith('/socket.io')) {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Connection tracking
const userSockets = new Map();
const socketUsers = new Map();

// Health endpoint  
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connections: userSockets.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('\n✅ Socket connected:', socket.id);
  console.log('   🔗 Transport:', socket.conn.transport.name);
  console.log('   🌐 Remote IP:', socket.handshake.address);
  console.log('   📋 Handshake:', JSON.stringify(socket.handshake, null, 2));
  
  // Send welcome message
  socket.emit('welcome', { 
    message: 'Connected successfully!', 
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // User joins
  socket.on('join', (userId) => {
    if (!userId) {
      socket.emit('error', { message: 'User ID required' });
      return;
    }

    console.log(`👤 User ${userId} joined (socket: ${socket.id})`);
    
    // Update mappings
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);
    
    // Join user room
    socket.join(`user:${userId}`);
    
    // Send confirmation
    socket.emit('joined', {
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Notify others
    socket.broadcast.emit('user-status', {
      userId,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  });

  // Join conversation
  socket.on('join-conversation', (conversationId) => {
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID required' });
      return;
    }

    const userId = socketUsers.get(socket.id);
    console.log(`🗨️ User ${userId} joining conversation: ${conversationId}`);
    
    socket.join(`conversation:${conversationId}`);
    
    socket.to(`conversation:${conversationId}`).emit('user-joined-conversation', {
      userId,
      conversationId,
      timestamp: new Date().toISOString()
    });
  });

  // Send message
  socket.on('send-message', (messageData) => {
    const userId = socketUsers.get(socket.id);
    
    if (!messageData?.conversationId || !messageData?.content) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }

    console.log(`💬 Message from ${userId} to conversation ${messageData.conversationId}`);

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: messageData.conversationId,
      userId,
      content: messageData.content,
      type: messageData.type || 'text',
      timestamp: new Date().toISOString(),
      delivered: true
    };

    // Broadcast to conversation
    io.to(`conversation:${messageData.conversationId}`).emit('new-message', message);
    
    console.log(`✅ Message ${message.id} delivered`);
  });  

  // Typing indicators
  socket.on('typing-start', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      typing: true,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing-stop', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      typing: false,
      timestamp: new Date().toISOString()
    });
  });

  // Read receipts
  socket.on('mark-messages-read', (data) => {
    const userId = socketUsers.get(socket.id);
    
    if (!data?.conversationId || !data?.messageIds) {
      socket.emit('error', { message: 'Invalid read receipt data' });
      return;
    }

    socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
      userId,
      conversationId: data.conversationId,
      messageIds: data.messageIds,
      timestamp: new Date().toISOString()
    });
  });

  // Heartbeat
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    const userId = socketUsers.get(socket.id);
    console.log(`❌ Socket disconnected: ${socket.id}, User: ${userId}, Reason: ${reason}`);

    if (userId) {
      userSockets.delete(userId);
      socketUsers.delete(socket.id);
      
      // Notify offline status
      socket.broadcast.emit('user-status', {
        userId,
        status: 'offline',
        timestamp: new Date().toISOString()
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Viora Socket.IO Server running!');
  console.log(`📍 Host: 0.0.0.0`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌐 Socket path: /socket.io (standard)`);
  console.log(`⚡ Transport: websocket + polling`);
  console.log(`🔒 CORS: open`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Socket.IO Events:');
  console.log('  📥 join, join-conversation, send-message');
  console.log('  📤 new-message, user-typing, messages-read');
  console.log('  ✨ Real-time bidirectional messaging ready!');
});

module.exports = { app, io, server };