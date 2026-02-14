/**
 * MINIMAL Socket.IO Server - Bulletproof Configuration
 * This is the simplest possible working setup
 */

const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  path: '/socket.io/',
  serveClient: false
});

console.log('\n🚀 MINIMAL Socket.IO Server Starting...');
console.log('📍 This is a bare-bones test server\n');

io.on('connection', (socket) => {
  console.log('\n✅✅✅ CLIENT CONNECTED! ✅✅✅');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.conn.transport.name);
  console.log('   Time:', new Date().toISOString());
  
  socket.emit('welcome', { message: 'You are connected!', id: socket.id });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

io.engine.on('connection_error', (err) => {
  console.error('\n❌ ENGINE ERROR:', err.message);
  console.error('   Code:', err.code);
  console.error('   Context:', err.context);
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server listening on 0.0.0.0:${PORT}`);
  console.log(`🌐 Test URL: http://192.168.0.30:${PORT}/socket.io/`);
  console.log('\n⏳ Waiting for connections...\n');
});
