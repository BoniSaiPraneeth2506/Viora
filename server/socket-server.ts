/**
 * Socket.IO Server Implementation for Real-Time Messaging
 * Production-ready bidirectional messaging with instant delivery
 * Based on yc_directory patterns - optimized for React Native
 */

import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';

// Extend NextApiResponse to include socket server
export interface NextApiResponseServerIO extends Response {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
}

// User connection tracking
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, string>(); // socketId -> userId

// Active conversations per socket
const socketConversations = new Map<string, Set<string>>(); // socketId -> Set of conversationIds

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log('✅ Socket.IO server already initialized');
    res.end();
    return;
  }

  console.log('🚀 Initializing Socket.IO server...');

  const io = new ServerIO(res.socket.server, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Production optimizations
    transports: ['websocket', 'polling'],
    upgradeTimeout: 30000,
    pingTimeout: 25000,
    pingInterval: 20000,
    maxHttpBufferSize: 1e6, // 1MB
    connectTimeout: 45000,
  });

  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Handle user join
    socket.on('join', (userId: string) => {
      console.log(`👤 User ${userId} joined (socket: ${socket.id})`);
      
      // Update user mappings
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
      
      // Join user's personal room
      socket.join(`user:${userId}`);
      
      // Emit online status to connections
      socket.broadcast.emit('user-status', {
        userId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ User ${userId} joined personal room`);
    });

    // Handle conversation room joining
    socket.on('join-conversation', (conversationId: string) => {
      const userId = socketUsers.get(socket.id);
      console.log(`🗨️ User ${userId} joining conversation: ${conversationId}`);
      
      socket.join(`conversation:${conversationId}`);
      
      // Track conversation for this socket
      if (!socketConversations.has(socket.id)) {
        socketConversations.set(socket.id, new Set());
      }
      socketConversations.get(socket.id)!.add(conversationId);
      
      console.log(`✅ Socket ${socket.id} joined conversation:${conversationId}`);
    });

    // Handle leaving conversations
    socket.on('leave-conversation', (conversationId: string) => {
      const userId = socketUsers.get(socket.id);
      console.log(`🚪 User ${userId} leaving conversation: ${conversationId}`);
      
      socket.leave(`conversation:${conversationId}`);
      socketConversations.get(socket.id)?.delete(conversationId);
    });

    // Handle sending messages
    socket.on('send-message', async (data: {
      conversationId: string;
      message: any;
      recipientId: string;
    }) => {
      const senderId = socketUsers.get(socket.id);
      const { conversationId, message, recipientId } = data;

      console.log(`📨 Message from ${senderId} in conversation ${conversationId}`);

      try {
        // Broadcast to conversation room (all participants)
        socket.to(`conversation:${conversationId}`).emit('new-message', message);
        
        // Send to recipient's personal room (if not in conversation)
        io.to(`user:${recipientId}`).emit('new-message', message);
        
        // Emit back to sender for confirmation
        socket.emit('message-sent', {
          messageId: message._id,
          timestamp: new Date().toISOString(),
        });

        console.log(`✅ Message ${message._id} delivered successfully`);
      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('message-error', {
          messageId: message._id,
          error: 'Failed to send message',
        });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      const { conversationId, userId, isTyping } = data;
      
      // Broadcast typing status to other participants in conversation
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId,
        conversationId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      // Auto-clear typing after 3 seconds if still typing
      if (isTyping) {
        setTimeout(() => {
          socket.to(`conversation:${conversationId}`).emit('user-typing', {
            userId,
            conversationId,
            isTyping: false,
            timestamp: new Date().toISOString(),
          });
        }, 3000);
      }
    });

    // Handle message read receipts
    socket.on('messages-read', (data: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => {
      const { conversationId, messageIds, userId } = data;
      
      console.log(`✓✓ User ${userId} read ${messageIds.length} messages`);
      
      // Broadcast read receipt to conversation
      socket.to(`conversation:${conversationId}`).emit('messages-read', {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle getting online users for conversation
    socket.on('get-conversation-users', (conversationId: string) => {
      const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      const onlineUserIds: string[] = [];
      
      if (room) {
        for (const socketId of room) {
          const userId = socketUsers.get(socketId);
          if (userId) {
            onlineUserIds.push(userId);
          }
        }
      }
      
      socket.emit('conversation-users', {
        conversationId,
        onlineUsers: onlineUserIds,
      });
    });

    // Handle user status check
    socket.on('check-user-status', (userId: string) => {
      const isOnline = userSockets.has(userId);
      socket.emit('user-status', {
        userId,
        status: isOnline ? 'online' : 'offline',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      const userId = socketUsers.get(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id} (user: ${userId}, reason: ${reason})`);
      
      if (userId) {
        // Remove user mappings
        userSockets.delete(userId);
        socketUsers.delete(socket.id);
        
        // Leave all conversation rooms
        const conversations = socketConversations.get(socket.id);
        if (conversations) {
          conversations.forEach(conversationId => {
            socket.leave(`conversation:${conversationId}`);
          });
          socketConversations.delete(socket.id);
        }
        
        // Broadcast offline status
        socket.broadcast.emit('user-status', {
          userId,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
        
        console.log(`👋 User ${userId} went offline`);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  // Server-level logging
  io.engine.on('connection_error', (err) => {
    console.error('❌ Connection error:', err.req, err.code, err.message, err.context);
  });

  console.log('✅ Socket.IO server initialized successfully');
  console.log(`🌐 Server listening on path: /api/socket/io`);
  console.log(`📊 CORS enabled for: ${process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : '*'}`);

  res.end();
}

// Export for external monitoring
export function getServerStats() {
  return {
    activeConnections: userSockets.size,
    totalSockets: socketUsers.size,
    activeConversations: Array.from(socketConversations.values())
      .reduce((total, convos) => total + convos.size, 0),
  };
}