/**
 * Socket.IO Client for React Native
 * Production-optimized real-time messaging with instant bidirectional communication
 * 
 * CRITICAL: path MUST match server's path: '/api/socketio'
 * This was the root cause of timeout errors - path mismatch between client and server
 */

import {io, Socket} from 'socket.io-client';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// CRITICAL: react-native-dotenv only works with STATIC imports
// require('@env') does NOT work - babel transforms import statements at compile time
import {EXPO_PUBLIC_SOCKET_URL, SOCKET_URL} from '@env';

// Global socket instance
let globalSocketInstance: Socket | null = null;
let globalSocketUserId: string | null = null;
let reconnectAttempts = 0;
let isDestroyed = false;

// Connection state tracking
let connectionState = {
  isConnected: false,
  isConnecting: false,
  lastConnectedAt: null as Date | null,
  reconnectCount: 0,
};

export class SocketClient {
  private static instance: SocketClient | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private networkListener: any = null;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public async initialize(userId?: string | null, serverUrl?: string): Promise<Socket> {
    // Don't reinitialize if socket exists and connected
    if (globalSocketInstance?.connected && globalSocketUserId === userId) {
      console.log('🔄 Socket already connected for user:', userId);
      return globalSocketInstance;
    }

    // Clean up existing socket if needed
    if (globalSocketInstance) {
      this.cleanup();
    }

    isDestroyed = false;
    
    // Get server URL from env or parameter
    // Priority: 1. serverUrl parameter, 2. EXPO_PUBLIC_SOCKET_URL env var, 3. platform default
    // For React Native development:
    // - Use EXPO_PUBLIC_SOCKET_URL in .env (your computer's IP:port)
    // - Android Emulator fallback: use 10.0.2.2 instead of localhost
    // - iOS Simulator fallback: localhost works
    const defaultUrl = Platform.OS === 'android' 
      ? 'http://10.0.2.2:3000'  // Android emulator localhost alias (default port 3000)
      : 'http://localhost:3000'; // iOS simulator (default port 3000)
    
    // CRITICAL FIX: In React Native, process.env.X does NOT work!
    // Must use static import from '@env' (react-native-dotenv babel plugin)
    const envUrl = EXPO_PUBLIC_SOCKET_URL || SOCKET_URL;
    const socketUrl = serverUrl || envUrl || defaultUrl;
    
    console.log('🔍 ENV debug:');
    console.log('   EXPO_PUBLIC_SOCKET_URL from @env:', EXPO_PUBLIC_SOCKET_URL || 'NOT SET');
    console.log('   SOCKET_URL from @env:', SOCKET_URL || 'NOT SET');
    console.log('   serverUrl param:', serverUrl || 'NOT SET');
    console.log('   Final socketUrl:', socketUrl);
    
    // Store last connection info
    if (userId) {
      await AsyncStorage.setItem('socket_last_user', userId);
      await AsyncStorage.setItem('socket_last_url', socketUrl);
    }

    console.log('\n='.repeat(50));
    console.log('🚀 Initializing Viora Socket.IO Client');
    console.log('='.repeat(50));
    console.log('   🌐 Server URL:', socketUrl);
    console.log('   👤 User ID:', userId);
    console.log('   📱 Platform:', Platform.OS);
    console.log('   🔧 React Native version:', Platform.Version);
    console.log('   🚀 Transport: Polling first, then WebSocket');
    console.log('   ⚡ Mode: React Native Optimized');
    console.log('   ⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(50) + '\n');

    // ================================================================
    // PRE-CONNECTION: Health check to verify server is reachable
    // ================================================================
    try {
      console.log('🏥 Running pre-connection health check...');
      const healthUrl = `${socketUrl}/health`;
      console.log('   URL:', healthUrl);
      
      const controller = new AbortController();
      const healthTimeout = setTimeout(() => controller.abort(), 5000);
      
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(healthTimeout);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Server health check PASSED!');
        console.log('   Server status:', healthData.status);
        console.log('   Socket path:', healthData.socketPath);
        console.log('   Connections:', healthData.connections);
        console.log('   Server IPs:', healthData.localIPs?.join(', '));
      } else {
        console.warn('⚠️ Health check returned status:', healthResponse.status);
      }
    } catch (healthError: any) {
      console.error('❌ HEALTH CHECK FAILED - Server may not be reachable!');
      console.error('   URL:', socketUrl);
      console.error('   Error:', healthError.message);
      console.error('   ⚠️ Make sure:');
      console.error('     1. Server is running: cd server && node server.js');
      console.error('     2. EXPO_PUBLIC_SOCKET_URL in .env matches your PC IP');
      console.error('     3. Phone/emulator and PC are on same WiFi network');
      console.error('     4. Firewall allows port 3000');
      // Don't return - still try to connect, health check failure might be a false positive
    }

    // ================================================================
    // CRITICAL FIX: path MUST match server's path: '/api/socketio'
    // Without this, client connects to default '/socket.io/' which doesn't exist
    // on the server, causing EVERY request to timeout
    // ================================================================
    const SOCKET_PATH = '/api/socketio';
    
    console.log('🔧 Creating Socket.IO instance with config:');
    const socketConfig = {
      // ★★★ THIS IS THE CRITICAL FIX ★★★
      // Server uses path: '/api/socketio'
      // Client MUST use the SAME path, otherwise -> timeout!
      path: SOCKET_PATH,
      // addTrailingSlash must be true (default) — server requires trailing slash
      // /api/socketio/ → 200, /api/socketio → 404
      
      // Transport: polling first for React Native reliability, then upgrade to websocket
      transports: ['polling', 'websocket'] as string[],
      
      // Timeout for initial connection
      timeout: 20000,
      
      // Reconnection settings (optimized for mobile)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      
      // Allow upgrade from polling to websocket
      upgrade: true,
      rememberUpgrade: false,
      forceNew: false,
      
      // React Native specific
      withCredentials: false,
      
      // Auto-connect
      autoConnect: true,
    };
    
    console.log('📋 Socket config:', JSON.stringify(socketConfig, null, 2));
    const socket = io(socketUrl, socketConfig);
    console.log('✅ Socket instance created');
    console.log('🔍 Socket.IO will connect to:', (socket.io as any)._uri || socketUrl);
    console.log('🔍 Socket.IO path:', SOCKET_PATH);
    console.log('🔍 Full endpoint:', `${socketUrl}${SOCKET_PATH}`);
    console.log('🔍 Engine URI:', socket.io.engine ? 'engine created' : 'engine pending');

    globalSocketInstance = socket;
    globalSocketUserId = userId || null;
    connectionState.isConnecting = true;
    
    console.log('🔌 Attempting connection...');

    // Set up comprehensive event handlers
    this.setupEventHandlers(socket, userId, socketUrl);
    this.setupEngineDebugListeners(socket);
    this.setupNetworkMonitoring();
    this.startHeartbeat();

    return socket;
  }

  private setupEventHandlers(socket: Socket, userId?: string | null, serverUrl?: string) {
    // Connection success
    socket.on('connect', () => {
      console.log('\n' + '='.repeat(50));
      console.log('✅ Viora Socket CONNECTED!');
      console.log('='.repeat(50));
      console.log('   🆔 Socket ID:', socket.id);
      console.log('   🌐 Transport:', socket.io.engine.transport.name);
      console.log('   🔗 Path:', socket.io.opts.path || '/socket.io');
      console.log('   ⏱️ Connected at:', new Date().toISOString());
      
      connectionState.isConnected = true;
      connectionState.isConnecting = false;
      connectionState.lastConnectedAt = new Date();
      connectionState.reconnectCount = 0;
      reconnectAttempts = 0;

      // Auto-join user room with retry
      if (globalSocketUserId) {
        this.joinUserWithRetry(globalSocketUserId);
      }

      // Store connection success
      AsyncStorage.setItem('socket_last_connected', new Date().toISOString());
    });

    // Disconnection
    socket.on('disconnect', (reason, details) => {
      console.log('🔌 Socket DISCONNECTED');
      console.log('   📋 Reason:', reason);
      console.log('   📊 Details:', details);
      console.log('   ⏱️ Duration:', connectionState.lastConnectedAt ? 
        new Date().getTime() - connectionState.lastConnectedAt.getTime() + 'ms' : 'N/A');
      
      connectionState.isConnected = false;
      connectionState.isConnecting = false;
    });

    // Connection error with detailed logging
    socket.on('connect_error', (error) => {
      reconnectAttempts++;
      console.error('\n' + '='.repeat(50));
      console.error('❌ Socket connection error (#' + reconnectAttempts + ')');
      console.error('='.repeat(50));
      console.error('   📋 Message:', error.message);
      console.error('   🔍 Type:', (error as any).type || 'unknown');
      console.error('   📊 Description:', (error as any).description || error.toString());
      console.error('   🌐 URL:', serverUrl || (socket.io as any)._uri || 'unknown');
      console.error('   🔗 Path:', socket.io.opts.path || '/socket.io (DEFAULT - check if matches server!)');
      console.error('   🚗 Transport:', socket.io.engine?.transport?.name || 'not established');
      console.error('   ⏰ Timestamp:', new Date().toISOString());
      
      // Diagnostic hints
      if (error.message === 'timeout') {
        console.error('\n   💡 TIMEOUT TROUBLESHOOTING:');
        console.error('   1. Is server running? Check: node server/server.js');
        console.error('   2. Path match? Server path must = client path');
        console.error(`   3. Current client path: ${socket.io.opts.path}`);
        console.error('   4. Server IP correct? Check EXPO_PUBLIC_SOCKET_URL in .env');
        console.error('   5. Same network? Phone/emulator must reach server IP');
        console.error('   6. Firewall? Port 3000 must be open');
      }
      
      console.error('='.repeat(50) + '\n');
      
      connectionState.isConnecting = false;
    });

    // Successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket RECONNECTED successfully!');
      console.log('   🔢 Attempts:', attemptNumber);
      console.log('   ⏱️ Time:', new Date().toISOString());
      
      connectionState.reconnectCount++;
      
      // Rejoin user room after reconnection
      if (globalSocketUserId) {
        this.joinUserWithRetry(globalSocketUserId);
      }
    });

    // Reconnection attempts
    socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnect attempt #${attemptNumber}`);
      connectionState.isConnecting = true;
    });

    socket.io.on('reconnect_error', (error) => {
      console.error('❌ Reconnect failed:', error.message);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('❌ Reconnect FAILED after all attempts');
      console.error('   💡 Consider checking network or server status');
      connectionState.isConnecting = false;
    });

    // Server acknowledgments
    socket.on('joined', (data) => {
      console.log('✅ Successfully joined server:', data);
    });

    socket.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data.messageId);
    });

    socket.on('message-error', (data) => {
      console.error('❌ Message send error:', data);
    });

    // Transport upgrade
    socket.io.engine?.on('upgrade', (transport: any) => {
      console.log('⬆️ Transport upgraded to:', transport.name);
    });

    // Server errors
    socket.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  }

  private setupEngineDebugListeners(socket: Socket) {
    console.log('🔧 Setting up engine-level debug listeners...');
    console.log('🔍 Engine exists:', !!socket.io.engine);
    console.log('🔍 Socket.io URI:', (socket.io as any)._uri || 'unknown');
    console.log('🔍 Socket.io path:', socket.io.opts.path || '/socket.io (DEFAULT)');
    console.log('🔍 Socket.io opts:', JSON.stringify({
      path: socket.io.opts.path,
      transports: socket.io.opts.transports,
      timeout: socket.io.opts.timeout,
      reconnection: socket.io.opts.reconnection,
    }, null, 2));
    
    // Monitor engine lifecycle
    socket.io.on('open', () => {
      console.log('🌟 Socket.IO Manager OPENED');
    });

    socket.io.on('error', (error) => {
      console.error('🌟 Socket.IO Manager ERROR:', error);
    });

    socket.io.on('close', (reason) => {
      console.log('🌟 Socket.IO Manager CLOSED:', reason);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('🌟 Socket.IO Manager RECONNECTED after', attempt, 'attempts');
    });
    
    // Wait for engine to be created
    const checkEngine = () => {
      if (socket.io.engine) {
        console.log('✅ Engine created and available');
        this.attachEngineListeners(socket);
      } else {
        console.log('⏳ Engine not yet created, checking again...');
        setTimeout(checkEngine, 100);
      }
    };
    checkEngine();
  }

  private attachEngineListeners(socket: Socket) {
    console.log('🔗 Attaching engine listeners...');
    
    // Only log important engine events (open/close/error)
    // Removed per-packet logging to prevent OOM on Android
    socket.io.engine.on('open', () => {
      console.log('🔓 Engine OPEN - Connection established');
      console.log('   Transport:', socket.io.engine.transport.name);
    });

    socket.io.engine.on('close', (reason: string) => {
      console.log('🔒 Engine CLOSED:', reason);
    });

    socket.io.engine.on('error', (error: any) => {
      console.error('❌ Engine ERROR:', error);
    });

    // Log upgrade only
    socket.io.engine.on('upgrade', (transport: any) => {
      console.log('⬆️ Engine upgraded to:', transport.name);
    });
  }

  private setupNetworkMonitoring() {
    // Monitor network changes
    this.networkListener = NetInfo.addEventListener(state => {
      console.log('📶 Network state changed: ' + state.type + ' | Connected: ' + state.isConnected);
      
      if (state.isConnected && globalSocketInstance && !globalSocketInstance.connected) {
        console.log('🔄 Network restored, attempting reconnection...');
        globalSocketInstance.connect();
      }
    });
  }

  private startHeartbeat() {
    // Heartbeat to detect connection issues
    this.heartbeatInterval = setInterval(() => {
      if (globalSocketInstance?.connected && globalSocketUserId) {
        // Ping server to ensure connection is alive
        globalSocketInstance.emit('ping', {
          userId: globalSocketUserId,
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // Every 30 seconds
  }

  private async joinUserWithRetry(userId: string, retryCount = 0) {
    if (!globalSocketInstance?.connected || retryCount > 3) {
      if (retryCount > 3) {
        console.error('❌ Failed to join user room after 3 retries');
      }
      return;
    }

    try {
      console.log(`👤 Joining user room: ${userId} (attempt ${retryCount + 1})`);
      globalSocketInstance.emit('join', userId);
      
      // Store successful join
      await AsyncStorage.setItem('socket_joined', new Date().toISOString());
    } catch (error) {
      console.error('❌ Error joining user room:', error);
      
      // Retry after delay
      setTimeout(() => {
        this.joinUserWithRetry(userId, retryCount + 1);
      }, 1000 * (retryCount + 1));
    }
  }

  public getSocket(): Socket | null {
    return globalSocketInstance;
  }

  public isConnected(): boolean {
    return globalSocketInstance?.connected || false;
  }

  public getUserId(): string | null {
    return globalSocketUserId;
  }

  public getConnectionState() {
    return {
      ...connectionState,
      socketId: globalSocketInstance?.id,
      transport: globalSocketInstance?.io?.engine?.transport?.name,
    };
  }

  // Enhanced disconnect with cleanup
  public disconnect(): void {
    console.log('🔌 Manually disconnecting socket...');
    
    isDestroyed = true;
    this.cleanup();
  }

  private cleanup() {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove network listener
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }

    // Disconnect socket
    if (globalSocketInstance) {
      globalSocketInstance.removeAllListeners();
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
    }

    // Reset state
    globalSocketUserId = null;
    connectionState = {
      isConnected: false,
      isConnecting: false,
      lastConnectedAt: null,
      reconnectCount: 0,
    };
  }

  // Utility method for debugging
  public async getDebugInfo() {
    const lastConnected = await AsyncStorage.getItem('socket_last_connected');
    const lastUser = await AsyncStorage.getItem('socket_last_user');
    const lastJoined = await AsyncStorage.getItem('socket_joined');
    
    return {
      connectionState: this.getConnectionState(),
      lastConnected,
      lastUser,
      lastJoined,
      reconnectAttempts,
      isDestroyed,
    };
  }
}

// Export singleton instance
export const socketClient = SocketClient.getInstance();
