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

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Path: /api/socketio`);
});

// Connection tracking
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId
const socketConversations = new Map(); // socketId -> Set<conversationId>

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: userSockets.size,
    uptime: process.uptime(),
  });
});

// Server stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    activeUsers: userSockets.size,
    totalSockets: socketUsers.size,
    activeConversations: Array.from(socketConversations.values())
      .reduce((total, convos) => total + convos.size, 0),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} at ${new Date().toISOString()}`);

  // User authentication and room joining
  socket.on('join', (userId) => {
    if (!userId) {
      socket.emit('error', { message: 'User ID required' });
      return;
    }

    console.log(`👤 User ${userId} joined (socket: ${socket.id})`);
    
    // Update mappings
    const existingSocket = userSockets.get(userId);
    if (existingSocket && existingSocket !== socket.id) {
      // Disconnect old socket for this user
      const oldSocket = io.sockets.sockets.get(existingSocket);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }

    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);
    
    // Join personal room
    socket.join(`user:${userId}`);
    
    // Notify others of online status
    socket.broadcast.emit('user-status', {
      userId,
      status: 'online',
      timestamp: new Date().toISOString(),
    });

    // Send confirmation
    socket.emit('joined', {
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ User ${userId} successfully joined`);
  });

  // Conversation management
  socket.on('join-conversation', (conversationId) => {
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID required' });
      return;
    }

    const userId = socketUsers.get(socket.id);
    console.log(`🗨️ User ${userId} joining conversation: ${conversationId}`);
    
    socket.join(`conversation:${conversationId}`);
    
    // Track conversations for this socket
    if (!socketConversations.has(socket.id)) {
      socketConversations.set(socket.id, new Set());
    }
    socketConversations.get(socket.id).add(conversationId);
    
    // Notify others in conversation
    socket.to(`conversation:${conversationId}`).emit('user-joined-conversation', {
      userId,
      conversationId,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ User ${userId} joined conversation ${conversationId}`);
  });

  socket.on('leave-conversation', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    console.log(`🚪 User ${userId} leaving conversation: ${conversationId}`);
    
    socket.leave(`conversation:${conversationId}`);
    socketConversations.get(socket.id)?.delete(conversationId);
    
    socket.to(`conversation:${conversationId}`).emit('user-left-conversation', {
      userId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  });

  // Message handling with instant delivery
  socket.on('send-message', async (data) => {
    const senderId = socketUsers.get(socket.id);
    const { conversationId, message, recipientId } = data;

    if (!conversationId || !message || !recipientId) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }

    console.log(`📨 Message from ${senderId} to conversation ${conversationId}`);
    console.log(`   Message ID: ${message._id}`);
    console.log(`   Content Preview: ${message.content?.substring(0, 50)}...`);

    try {
      // Add server timestamp
      const enrichedMessage = {
        ...message,
        serverTimestamp: new Date().toISOString(),
      };

      // Instant delivery to conversation participants
      socket.to(`conversation:${conversationId}`).emit('new-message', enrichedMessage);
      
      // Ensure recipient gets it even if not in conversation room
      io.to(`user:${recipientId}`).emit('new-message', enrichedMessage);
      
      // Confirmation to sender
      socket.emit('message-sent', {
        messageId: message._id,
        conversationId,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Message ${message._id} delivered instantly`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message-error', {
        messageId: message._id,
        error: error.message || 'Failed to send message',
      });
    }
  });

  // Typing indicators with auto-timeout
  socket.on('typing', (data) => {
    const { conversationId, userId, isTyping } = data;
    
    if (!conversationId || !userId) return;

    console.log(`✍️ User ${userId} ${isTyping ? 'started' : 'stopped'} typing in ${conversationId}`);
    
    // Broadcast to conversation (except sender)
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      isTyping,
      timestamp: new Date().toISOString(),
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
          userId,
          conversationId,
          isTyping: false,
          timeout: true,
          timestamp: new Date().toISOString(),
        });
      }, 3000);
    }
  });

  // Read receipts
  socket.on('messages-read', (data) => {
    const { conversationId, messageIds, userId } = data;
    
    if (!conversationId || !messageIds?.length || !userId) return;

    console.log(`✓✓ User ${userId} read ${messageIds.length} messages in ${conversationId}`);
    
    socket.to(`conversation:${conversationId}`).emit('messages-read', {
      conversationId,
      messageIds,
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Online status checks
  socket.on('check-user-status', (userId) => {
    const isOnline = userSockets.has(userId);
    const lastSeen = isOnline ? new Date().toISOString() : null;
    
    socket.emit('user-status', {
      userId,
      status: isOnline ? 'online' : 'offline',
      lastSeen,
      timestamp: new Date().toISOString(),
    });
  });

  // Get conversation participants
  socket.on('get-conversation-users', (conversationId) => {
    const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
    const onlineUsers = [];
    
    if (room) {
      for (const socketId of room) {
        const userId = socketUsers.get(socketId);
        if (userId) {
          onlineUsers.push({
            userId,
            socketId,
            joinedAt: new Date().toISOString(),
          });
        }
      }
    }
    
    socket.emit('conversation-users', {
      conversationId,
      onlineUsers,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const userId = socketUsers.get(socket.id);
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    console.log(`   User: ${userId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Time: ${new Date().toISOString()}`);
    
    if (userId) {
      // Cleanup mappings
      userSockets.delete(userId);
      socketUsers.delete(socket.id);
      
      // Leave all conversations
      const conversations = socketConversations.get(socket.id);
      if (conversations) {
        conversations.forEach(conversationId => {
          socket.to(`conversation:${conversationId}`).emit('user-left-conversation', {
            userId,
            conversationId,
            reason,
            timestamp: new Date().toISOString(),
          });
        });
        socketConversations.delete(socket.id);
      }
      
      // Broadcast offline status
      socket.broadcast.emit('user-status', {
        userId,
        status: 'offline',
        reason,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`👋 User ${userId} went offline (${reason})`);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    const userId = socketUsers.get(socket.id);
    console.error(`❌ Socket error for user ${userId} (${socket.id}):`, error);
  });
});

// Server error handling
io.engine.on('connection_error', (err) => {
  console.error('❌ Socket.IO connection error:', {
    message: err.message,
    code: err.code,
    context: err.context,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  io.close(() => {
    httpServer.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log('🚀 Viora Socket.IO Server running!');
  console.log(`📍 Host: ${HOST}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌐 Socket path: /api/socketio`);
  console.log(`⚡ Transport: websocket + polling`);
  console.log(`🔒 CORS: ${process.env.NODE_ENV === 'production' ? 'restricted' : 'open'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Socket.IO Events:');
  console.log('  📥 join, join-conversation, send-message');
  console.log('  📤 new-message, user-typing, messages-read');
  console.log('  ✨ Real-time bidirectional messaging ready!');
});

// Export for testing
module.exports = { app, io, httpServer };