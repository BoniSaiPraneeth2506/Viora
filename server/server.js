// /**
//  * Viora Socket.IO Server - Production Ready
//  * Real-time messaging with instant bidirectional communication
//  * 
//  * CRITICAL: Socket.IO path is '/api/socketio'
//  * Client MUST use: path: '/api/socketio' in its Socket.IO config
//  */

// const express = require('express');
// const { createServer } = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const os = require('os');

// const app = express();
// const server = createServer(app);

// // ============================================================
// // Get local IP addresses for debugging
// // ============================================================
// function getLocalIPs() {
//   const interfaces = os.networkInterfaces();
//   const addresses = [];
//   for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name]) {
//       if (iface.family === 'IPv4' && !iface.internal) {
//         addresses.push({ name, address: iface.address });
//       }
//     }
//   }
//   return addresses;
// }

// const SOCKET_PATH = '/api/socketio';

// // Socket.IO server with React Native optimizations
// const io = new Server(server, {
//   path: SOCKET_PATH,
//   addTrailingSlash: false, // Accept both /api/socketio and /api/socketio/
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST'],
//   },
//   transports: ['polling', 'websocket'],
//   allowUpgrades: true,
//   pingTimeout: 60000,
//   pingInterval: 25000,
//   httpCompression: true,
// });

// // Middleware
// app.use(cors({ origin: '*' }));
// app.use(express.json());

// // ============================================================
// // Trailing slash redirect for Socket.IO path
// // Some clients send /api/socketio without trailing slash -> 404
// // This rewrites the URL to add trailing slash so Socket.IO matches
// // ============================================================
// app.use((req, res, next) => {
//   if (req.url.startsWith(SOCKET_PATH) && !req.url.startsWith(SOCKET_PATH + '/')) {
//     // Rewrite /api/socketio?... to /api/socketio/?...
//     req.url = SOCKET_PATH + '/' + req.url.slice(SOCKET_PATH.length);
//   }
//   next();
// });

// // ============================================================
// // VERBOSE Request Logging - See EVERY request hitting the server
// // ============================================================
// let requestCount = 0;
// app.use((req, res, next) => {
//   requestCount++;
//   const timestamp = new Date().toISOString();
  
//   if (req.url.includes('socket') || req.url.includes(SOCKET_PATH)) {
//     console.log(`\n📥 [REQ #${requestCount}] ${timestamp}`);
//     console.log(`   Method: ${req.method}`);
//     console.log(`   URL: ${req.url}`);
//     console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
//     console.log(`   User-Agent: ${req.headers['user-agent'] || 'none'}`);
//   } else {
//     console.log(`📥 [#${requestCount}] ${req.method} ${req.url} from ${req.ip || req.connection.remoteAddress}`);
//   }
//   next();
// });

// // Connection tracking (support multiple sockets per user, like yc_directory)
// const userSockets = new Map();  // userId -> Set<socketId>
// const socketUsers = new Map();  // socketId -> userId

// // Health endpoint with full diagnostics
// app.get('/health', (req, res) => {
//   const localIPs = getLocalIPs();
//   res.json({
//     status: 'healthy',
//     server: 'Viora Socket.IO Server',
//     socketPath: SOCKET_PATH,
//     connections: userSockets.size,
//     totalSockets: io.engine?.clientsCount || 0,
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString(),
//     localIPs: localIPs.map(i => i.address),
//     transports: ['polling', 'websocket'],
//   });
//   console.log(`💚 Health check from ${req.ip} - OK`);
// });

// // Debug endpoint - shows full server state
// app.get('/debug', (req, res) => {
//   res.json({
//     socketPath: SOCKET_PATH,
//     connectedUsers: Array.from(userSockets.entries()).map(([userId, sockets]) => ({
//       userId,
//       socketCount: sockets.size,
//     })),
//     totalConnections: io.engine?.clientsCount || 0,
//     rooms: Array.from(io.sockets.adapter.rooms.keys()),
//     uptime: process.uptime(),
//     requestCount,
//   });
// });

// // Socket.IO connection handling
// io.on('connection', (socket) => {
//   console.log('\n' + '='.repeat(60));
//   console.log('✅ NEW SOCKET CONNECTION');
//   console.log('='.repeat(60));
//   console.log(`   🆔 Socket ID: ${socket.id}`);
//   console.log(`   🌐 Transport: ${socket.conn.transport.name}`);
//   console.log(`   📍 Remote IP: ${socket.handshake.address}`);
//   console.log(`   🔗 User-Agent: ${socket.handshake.headers['user-agent'] || 'none'}`);
//   console.log(`   📋 Query: ${JSON.stringify(socket.handshake.query)}`);
//   console.log(`   ⏰ Time: ${new Date().toISOString()}`);
//   console.log(`   📊 Total sockets: ${io.engine.clientsCount}`);
//   console.log('='.repeat(60));

//   // Transport upgrade
//   socket.conn.on('upgrade', (transport) => {
//     console.log(`⬆️ Socket ${socket.id} upgraded to: ${transport.name}`);
//   });

//   // Send welcome message
//   socket.emit('welcome', { 
//     message: 'Connected to Viora Socket.IO Server!', 
//     socketId: socket.id,
//     serverTime: new Date().toISOString(),
//     socketPath: SOCKET_PATH,
//   });

//   // User joins
//   socket.on('join', (userId) => {
//     if (!userId) {
//       console.error('❌ Join failed: No userId');
//       socket.emit('error', { message: 'User ID required' });
//       return;
//     }

//     console.log(`\n👤 USER JOIN: ${userId} (socket: ${socket.id})`);

//     // Support multiple sockets per user
//     if (!userSockets.has(userId)) {
//       userSockets.set(userId, new Set());
//     }
//     userSockets.get(userId).add(socket.id);
//     socketUsers.set(socket.id, userId);
    
//     // Join user room
//     socket.join(`user:${userId}`);
    
//     console.log(`   ✅ Joined room: user:${userId}`);
//     console.log(`   📊 User has ${userSockets.get(userId).size} socket(s)`);
//     console.log(`   📊 Total online users: ${userSockets.size}`);

//     // Send confirmation
//     socket.emit('joined', {
//       userId,
//       socketId: socket.id,
//       timestamp: new Date().toISOString()
//     });

//     // Notify others
//     socket.broadcast.emit('user-status', {
//       userId,
//       status: 'online',
//       timestamp: new Date().toISOString()
//     });

//     // Send current online users list
//     const onlineUserIds = Array.from(userSockets.keys());
//     socket.emit('online-users', onlineUserIds);
//   });

//   // Join conversation
//   socket.on('join-conversation', (conversationId) => {
//     if (!conversationId) {
//       socket.emit('error', { message: 'Conversation ID required' });
//       return;
//     }

//     const userId = socketUsers.get(socket.id);
//     const roomName = `conversation:${conversationId}`;
//     console.log(`\n🗨️ JOIN CONVERSATION: ${userId} -> ${conversationId}`);
    
//     socket.join(roomName);
    
//     const room = io.sockets.adapter.rooms.get(roomName);
//     console.log(`   📊 Room members: ${room ? room.size : 0}`);

//     socket.to(roomName).emit('user-joined-conversation', {
//       userId,
//       conversationId,
//       timestamp: new Date().toISOString()
//     });
//   });

//   // Leave conversation
//   socket.on('leave-conversation', (conversationId) => {
//     const userId = socketUsers.get(socket.id);
//     console.log(`👋 LEAVE CONVERSATION: ${userId} -> ${conversationId}`);
//     socket.leave(`conversation:${conversationId}`);
//   });

//   // Send message
//   socket.on('send-message', (messageData) => {
//     const userId = socketUsers.get(socket.id);
    
//     if (!messageData?.conversationId || !messageData?.content) {
//       console.error('❌ Invalid message data:', messageData);
//       socket.emit('error', { message: 'Invalid message data' });
//       return;
//     }

//     const conversationRoom = `conversation:${messageData.conversationId}`;

//     console.log(`\n💬 MESSAGE from ${userId} in ${messageData.conversationId}`);
//     console.log(`   Content: ${messageData.content.substring(0, 50)}...`);

//     const message = {
//       _id: messageData._id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       _type: 'message',
//       conversationId: messageData.conversationId,
//       conversation: messageData.conversation || { _ref: messageData.conversationId, _type: 'reference' },
//       sender: messageData.sender || { _ref: userId, _type: 'reference' },
//       userId,
//       content: messageData.content,
//       messageType: messageData.messageType || messageData.type || 'text',
//       image: messageData.image,
//       readBy: messageData.readBy || [{_ref: userId, _type: 'reference', _key: `${userId}-read`}],
//       _createdAt: messageData._createdAt || new Date().toISOString(),
//       _updatedAt: messageData._createdAt || new Date().toISOString(),
//       timestamp: new Date().toISOString(),
//       delivered: true
//     };

//     // Broadcast to conversation room (exclude sender to avoid duplicate)
//     socket.to(conversationRoom).emit('new-message', message);
    
//     // Also send notification to recipient's personal room
//     if (messageData.recipientId) {
//       io.to(`user:${messageData.recipientId}`).emit('message-notification', {
//         ...message,
//         senderName: messageData.senderName,
//       });
//       console.log(`   📡 Notification -> user:${messageData.recipientId}`);
//     }

//     // Confirm delivery to sender
//     socket.emit('message-sent', {
//       messageId: message._id,
//       conversationId: messageData.conversationId,
//       timestamp: message.timestamp,
//     });

//     console.log(`   ✅ Delivered to room: ${conversationRoom}`);
//   });  

//   // Typing indicators (support both event name patterns)
//   socket.on('typing', (data) => {
//     const userId = socketUsers.get(socket.id);
//     const conversationId = data?.conversationId || data;
//     socket.to(`conversation:${conversationId}`).emit('user-typing', {
//       userId,
//       conversationId,
//       isTyping: data?.isTyping !== false,
//       timestamp: new Date().toISOString()
//     });
//   });

//   socket.on('typing-start', (conversationId) => {
//     const userId = socketUsers.get(socket.id);
//     socket.to(`conversation:${conversationId}`).emit('user-typing', {
//       userId,
//       conversationId,
//       isTyping: true,
//       timestamp: new Date().toISOString()
//     });
//   });

//   socket.on('typing-stop', (conversationId) => {
//     const userId = socketUsers.get(socket.id);
//     socket.to(`conversation:${conversationId}`).emit('user-typing', {
//       userId,
//       conversationId,
//       isTyping: false,
//       timestamp: new Date().toISOString()
//     });
//   });

//   // Read receipts (support all event name patterns)
//   socket.on('messages-read', (data) => {
//     const userId = socketUsers.get(socket.id);
//     if (!data?.conversationId) return;
    
//     socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
//       userId,
//       conversationId: data.conversationId,
//       messageIds: data.messageIds || [],
//       timestamp: new Date().toISOString()
//     });
//   });

//   socket.on('mark-read', (data) => {
//     const userId = socketUsers.get(socket.id);
//     if (!data?.conversationId) return;
    
//     socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
//       userId,
//       conversationId: data.conversationId,
//       messageIds: data.messageIds || [],
//       timestamp: new Date().toISOString()
//     });
//   });

//   socket.on('mark-messages-read', (data) => {
//     const userId = socketUsers.get(socket.id);
    
//     if (!data?.conversationId || !data?.messageIds) {
//       socket.emit('error', { message: 'Invalid read receipt data' });
//       return;
//     }

//     socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
//       userId,
//       conversationId: data.conversationId,
//       messageIds: data.messageIds,
//       timestamp: new Date().toISOString()
//     });
//   });

//   // Check user status
//   socket.on('check-user-status', (targetUserId) => {
//     const isOnline = userSockets.has(targetUserId) && userSockets.get(targetUserId).size > 0;
//     socket.emit('user-status', {
//       userId: targetUserId,
//       status: isOnline ? 'online' : 'offline',
//       timestamp: new Date().toISOString(),
//     });
//   });

//   // Heartbeat
//   socket.on('ping', (data) => {
//     socket.emit('pong', { timestamp: new Date().toISOString(), received: data });
//   });

//   // Disconnect handling
//   socket.on('disconnect', (reason) => {
//     const userId = socketUsers.get(socket.id);
//     console.log(`\n❌ DISCONNECT: socket=${socket.id} user=${userId} reason=${reason}`);

//     if (userId) {
//       const userSocketSet = userSockets.get(userId);
//       if (userSocketSet) {
//         userSocketSet.delete(socket.id);
//         if (userSocketSet.size === 0) {
//           userSockets.delete(userId);
//           socket.broadcast.emit('user-status', {
//             userId,
//             status: 'offline',
//             timestamp: new Date().toISOString()
//           });
//           console.log(`   👤 User ${userId} fully OFFLINE`);
//         } else {
//           console.log(`   👤 User ${userId} still has ${userSocketSet.size} socket(s)`);
//         }
//       }
//       socketUsers.delete(socket.id);
//     }
//     console.log(`   📊 Remaining connections: ${io.engine.clientsCount}`);
//   });

//   socket.on('error', (error) => {
//     console.error(`❌ SOCKET ERROR for ${socket.id}:`, error);
//   });
// });

// // Engine-level error logging
// io.engine.on('connection_error', (err) => {
//   console.error('\n❌ ENGINE CONNECTION ERROR:');
//   console.error('   Code:', err.code);
//   console.error('   Message:', err.message);
//   console.error('   Req URL:', err.req?.url);
//   console.error('   Req Method:', err.req?.method);
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, '0.0.0.0', () => {
//   const localIPs = getLocalIPs();
  
//   console.log('\n' + '='.repeat(60));
//   console.log('🚀 VIORA SOCKET.IO SERVER RUNNING');
//   console.log('='.repeat(60));
//   console.log(`   📍 Host: 0.0.0.0`);
//   console.log(`   🔌 Port: ${PORT}`);
//   console.log(`   🌐 Socket Path: ${SOCKET_PATH}`);
//   console.log(`   ⚡ Transports: websocket + polling`);
//   console.log(`   🔒 CORS: open (all origins)`);
//   console.log(`   ⏰ Started: ${new Date().toISOString()}`);
//   console.log('');
//   console.log('   📡 Server accessible at:');
//   console.log(`      http://localhost:${PORT}`);
//   localIPs.forEach(({ name, address }) => {
//     console.log(`      http://${address}:${PORT}  (${name})`);
//   });
//   console.log('');
//   console.log('   🔗 Socket.IO endpoint:');
//   localIPs.forEach(({ name, address }) => {
//     console.log(`      http://${address}:${PORT}${SOCKET_PATH}  (${name})`);
//   });
//   console.log('');
//   console.log('   🏥 Health: http://localhost:' + PORT + '/health');
//   console.log('   🔍 Debug:  http://localhost:' + PORT + '/debug');
//   console.log('');
//   console.log('   ⚠️  CLIENT MUST USE: path: \'/api/socketio\'');
//   console.log('   ⚠️  Update .env EXPO_PUBLIC_SOCKET_URL to your IP');
//   console.log('='.repeat(60) + '\n');
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('🛑 Shutting down...');
//   io.close(() => server.close(() => process.exit(0)));
// });
// process.on('SIGINT', () => {
//   console.log('\n🛑 Shutting down...');
//   io.close(() => server.close(() => process.exit(0)));
// });

// module.exports = { app, io, server };





/**
 * Viora Socket.IO Server - Production Ready
 * Real-time messaging with instant bidirectional communication
 * 
 * CRITICAL: Socket.IO path is '/api/socketio'
 * Client MUST use: path: '/api/socketio' in its Socket.IO config
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

const app = express();
const server = createServer(app);

// ============================================================
// Get local IP addresses for debugging
// ============================================================
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

const SOCKET_PATH = '/api/socketio';

// Socket.IO server with React Native optimizations
const io = new Server(server, {
  path: SOCKET_PATH,
  addTrailingSlash: false, // Accept both /api/socketio and /api/socketio/
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  httpCompression: true,
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================
// Trailing slash redirect for Socket.IO path
// Some clients send /api/socketio without trailing slash -> 404
// This rewrites the URL to add trailing slash so Socket.IO matches
// ============================================================
app.use((req, res, next) => {
  if (req.url.startsWith(SOCKET_PATH) && !req.url.startsWith(SOCKET_PATH + '/')) {
    // Rewrite /api/socketio?... to /api/socketio/?...
    req.url = SOCKET_PATH + '/' + req.url.slice(SOCKET_PATH.length);
  }
  next();
});

// ============================================================
// VERBOSE Request Logging - See EVERY request hitting the server
// ============================================================
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  const timestamp = new Date().toISOString();
  
  if (req.url.includes('socket') || req.url.includes(SOCKET_PATH)) {
    console.log(`\n📥 [REQ #${requestCount}] ${timestamp}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   URL: ${req.url}`);
    console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`   User-Agent: ${req.headers['user-agent'] || 'none'}`);
  } else {
    console.log(`📥 [#${requestCount}] ${req.method} ${req.url} from ${req.ip || req.connection.remoteAddress}`);
  }
  next();
});

// Connection tracking (support multiple sockets per user, like yc_directory)
const userSockets = new Map();  // userId -> Set<socketId>
const socketUsers = new Map();  // socketId -> userId

// Health endpoint with full diagnostics
app.get('/health', (req, res) => {
  const localIPs = getLocalIPs();
  res.json({
    status: 'healthy',
    server: 'Viora Socket.IO Server',
    socketPath: SOCKET_PATH,
    connections: userSockets.size,
    totalSockets: io.engine?.clientsCount || 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    localIPs: localIPs.map(i => i.address),
    transports: ['polling', 'websocket'],
  });
  console.log(`💚 Health check from ${req.ip} - OK`);
});

// Debug endpoint - shows full server state
app.get('/debug', (req, res) => {
  res.json({
    socketPath: SOCKET_PATH,
    connectedUsers: Array.from(userSockets.entries()).map(([userId, sockets]) => ({
      userId,
      socketCount: sockets.size,
    })),
    totalConnections: io.engine?.clientsCount || 0,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
    uptime: process.uptime(),
    requestCount,
  });
});

// Root endpoint - NEW ADDITION
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    server: 'Viora Socket.IO Server',
    version: '1.0.0',
    socketPath: SOCKET_PATH,
    endpoints: {
      health: '/health',
      debug: '/debug',
      socketio: SOCKET_PATH
    },
    message: 'Socket.IO server is running. Use Socket.IO client to connect.',
    instructions: {
      connect: `Use Socket.IO client with path: '${SOCKET_PATH}'`,
      example: `io('https://viora-ty0m.onrender.com', { path: '${SOCKET_PATH}' })`
    },
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ NEW SOCKET CONNECTION');
  console.log('='.repeat(60));
  console.log(`   🆔 Socket ID: ${socket.id}`);
  console.log(`   🌐 Transport: ${socket.conn.transport.name}`);
  console.log(`   📍 Remote IP: ${socket.handshake.address}`);
  console.log(`   🔗 User-Agent: ${socket.handshake.headers['user-agent'] || 'none'}`);
  console.log(`   📋 Query: ${JSON.stringify(socket.handshake.query)}`);
  console.log(`   ⏰ Time: ${new Date().toISOString()}`);
  console.log(`   📊 Total sockets: ${io.engine.clientsCount}`);
  console.log('='.repeat(60));

  // Transport upgrade
  socket.conn.on('upgrade', (transport) => {
    console.log(`⬆️ Socket ${socket.id} upgraded to: ${transport.name}`);
  });

  // Send welcome message
  socket.emit('welcome', { 
    message: 'Connected to Viora Socket.IO Server!', 
    socketId: socket.id,
    serverTime: new Date().toISOString(),
    socketPath: SOCKET_PATH,
  });

  // User joins
  socket.on('join', (userId) => {
    if (!userId) {
      console.error('❌ Join failed: No userId');
      socket.emit('error', { message: 'User ID required' });
      return;
    }

    console.log(`\n👤 USER JOIN: ${userId} (socket: ${socket.id})`);

    // Support multiple sockets per user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);
    
    // Join user room
    socket.join(`user:${userId}`);
    
    console.log(`   ✅ Joined room: user:${userId}`);
    console.log(`   📊 User has ${userSockets.get(userId).size} socket(s)`);
    console.log(`   📊 Total online users: ${userSockets.size}`);

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

    // Send current online users list
    const onlineUserIds = Array.from(userSockets.keys());
    socket.emit('online-users', onlineUserIds);
  });

  // Join conversation
  socket.on('join-conversation', (conversationId) => {
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID required' });
      return;
    }

    const userId = socketUsers.get(socket.id);
    const roomName = `conversation:${conversationId}`;
    console.log(`\n🗨️ JOIN CONVERSATION: ${userId} -> ${conversationId}`);
    
    socket.join(roomName);
    
    const room = io.sockets.adapter.rooms.get(roomName);
    console.log(`   📊 Room members: ${room ? room.size : 0}`);

    socket.to(roomName).emit('user-joined-conversation', {
      userId,
      conversationId,
      timestamp: new Date().toISOString()
    });
  });

  // Leave conversation
  socket.on('leave-conversation', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    console.log(`👋 LEAVE CONVERSATION: ${userId} -> ${conversationId}`);
    socket.leave(`conversation:${conversationId}`);
  });

  // Send message
  socket.on('send-message', (messageData) => {
    const userId = socketUsers.get(socket.id);
    
    if (!messageData?.conversationId || !messageData?.content) {
      console.error('❌ Invalid message data:', messageData);
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }

    const conversationRoom = `conversation:${messageData.conversationId}`;

    console.log(`\n💬 MESSAGE from ${userId} in ${messageData.conversationId}`);
    console.log(`   Content: ${messageData.content.substring(0, 50)}...`);

    const message = {
      _id: messageData._id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      _type: 'message',
      conversationId: messageData.conversationId,
      conversation: messageData.conversation || { _ref: messageData.conversationId, _type: 'reference' },
      sender: messageData.sender || { _ref: userId, _type: 'reference' },
      userId,
      content: messageData.content,
      messageType: messageData.messageType || messageData.type || 'text',
      image: messageData.image,
      readBy: messageData.readBy || [{_ref: userId, _type: 'reference', _key: `${userId}-read`}],
      _createdAt: messageData._createdAt || new Date().toISOString(),
      _updatedAt: messageData._createdAt || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      delivered: true
    };

    // Broadcast to conversation room (exclude sender to avoid duplicate)
    socket.to(conversationRoom).emit('new-message', message);
    
    // Also send notification to recipient's personal room
    if (messageData.recipientId) {
      io.to(`user:${messageData.recipientId}`).emit('message-notification', {
        ...message,
        senderName: messageData.senderName,
      });
      console.log(`   📡 Notification -> user:${messageData.recipientId}`);
    }

    // Confirm delivery to sender
    socket.emit('message-sent', {
      messageId: message._id,
      conversationId: messageData.conversationId,
      timestamp: message.timestamp,
    });

    console.log(`   ✅ Delivered to room: ${conversationRoom}`);
  });  

  // Typing indicators (support both event name patterns)
  socket.on('typing', (data) => {
    const userId = socketUsers.get(socket.id);
    const conversationId = data?.conversationId || data;
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      isTyping: data?.isTyping !== false,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing-start', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      isTyping: true,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing-stop', (conversationId) => {
    const userId = socketUsers.get(socket.id);
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      conversationId,
      isTyping: false,
      timestamp: new Date().toISOString()
    });
  });

  // Read receipts (support all event name patterns)
  socket.on('messages-read', (data) => {
    const userId = socketUsers.get(socket.id);
    if (!data?.conversationId) return;
    
    socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
      userId,
      conversationId: data.conversationId,
      messageIds: data.messageIds || [],
      timestamp: new Date().toISOString()
    });
  });

  socket.on('mark-read', (data) => {
    const userId = socketUsers.get(socket.id);
    if (!data?.conversationId) return;
    
    socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
      userId,
      conversationId: data.conversationId,
      messageIds: data.messageIds || [],
      timestamp: new Date().toISOString()
    });
  });

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

  // Check user status
  socket.on('check-user-status', (targetUserId) => {
    const isOnline = userSockets.has(targetUserId) && userSockets.get(targetUserId).size > 0;
    socket.emit('user-status', {
      userId: targetUserId,
      status: isOnline ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    });
  });

  // Heartbeat
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: new Date().toISOString(), received: data });
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    const userId = socketUsers.get(socket.id);
    console.log(`\n❌ DISCONNECT: socket=${socket.id} user=${userId} reason=${reason}`);

    if (userId) {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          socket.broadcast.emit('user-status', {
            userId,
            status: 'offline',
            timestamp: new Date().toISOString()
          });
          console.log(`   👤 User ${userId} fully OFFLINE`);
        } else {
          console.log(`   👤 User ${userId} still has ${userSocketSet.size} socket(s)`);
        }
      }
      socketUsers.delete(socket.id);
    }
    console.log(`   📊 Remaining connections: ${io.engine.clientsCount}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ SOCKET ERROR for ${socket.id}:`, error);
  });
});

// Engine-level error logging
io.engine.on('connection_error', (err) => {
  console.error('\n❌ ENGINE CONNECTION ERROR:');
  console.error('   Code:', err.code);
  console.error('   Message:', err.message);
  console.error('   Req URL:', err.req?.url);
  console.error('   Req Method:', err.req?.method);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VIORA SOCKET.IO SERVER RUNNING');
  console.log('='.repeat(60));
  console.log(`   📍 Host: 0.0.0.0`);
  console.log(`   🔌 Port: ${PORT}`);
  console.log(`   🌐 Socket Path: ${SOCKET_PATH}`);
  console.log(`   ⚡ Transports: websocket + polling`);
  console.log(`   🔒 CORS: open (all origins)`);
  console.log(`   ⏰ Started: ${new Date().toISOString()}`);
  console.log('');
  console.log('   📡 Server accessible at:');
  console.log(`      http://localhost:${PORT}`);
  localIPs.forEach(({ name, address }) => {
    console.log(`      http://${address}:${PORT}  (${name})`);
  });
  console.log('');
  console.log('   🔗 Socket.IO endpoint:');
  localIPs.forEach(({ name, address }) => {
    console.log(`      http://${address}:${PORT}${SOCKET_PATH}  (${name})`);
  });
  console.log('');
  console.log('   🏥 Health: http://localhost:' + PORT + '/health');
  console.log('   🔍 Debug:  http://localhost:' + PORT + '/debug');
  console.log('   🏠 Root:   http://localhost:' + PORT + '/');
  console.log('');
  console.log('   ⚠️  CLIENT MUST USE: path: \'/api/socketio\'');
  console.log('   ⚠️  Update .env EXPO_PUBLIC_SOCKET_URL to your IP');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  io.close(() => server.close(() => process.exit(0)));
});
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  io.close(() => server.close(() => process.exit(0)));
});

module.exports = { app, io, server };