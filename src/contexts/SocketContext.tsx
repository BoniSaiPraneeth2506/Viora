/**
 * Socket Context Provider for React Native
 * Production-optimized Socket.IO integration with full real-time messaging features
 */

import React, {createContext, useContext, useEffect, useState, ReactNode, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {Socket} from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import {socketClient} from '../lib/socket-client';
import {useAuth} from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  userId: string | null;
  connectionState: any;
  lastMessageTimestamp: number;
  // Methods
  reconnect: () => void;
  getDebugInfo: () => Promise<any>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  userId: null,
  connectionState: null,
  lastMessageTimestamp: 0,
  reconnect: () => {},
  getDebugInfo: async () => ({}),
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<any>(null);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0);
  const [networkState, setNetworkState] = useState<any>(null);

  const {user} = useAuth();
  const userId = user?._id || null;
  const appStateRef = useRef(AppState.currentState);
  const initializationRef = useRef(false);

  // Initialize socket when user is available
  useEffect(() => {
    if (!userId || initializationRef.current) {
      return;
    }

    initializationRef.current = true;

    console.log('🚀 SocketProvider: Starting initialization for user:', userId);
    setIsConnecting(true);

    initializeSocket();

    return () => {
      console.log('🧹 SocketProvider: Cleaning up socket connection');
      socketClient.disconnect();
    };
  }, [userId, serverUrl]);

  const initializeSocket = async () => {
    try {
      const socketInstance = await socketClient.initialize(userId, serverUrl);
      setSocket(socketInstance);

      // Set up real-time event listeners
      setupSocketEventListeners(socketInstance);

      // Monitor connection state
      monitorConnectionState(socketInstance);

      setIsConnecting(false);
    } catch (error) {
      console.error('❌ SocketProvider: Failed to initialize socket:', error);
      setIsConnecting(false);
    }
  };

  const setupSocketEventListeners = (socketInstance: Socket) => {
    // Connection events
    const handleConnect = () => {
      console.log('✅ SocketProvider: Socket connected');
      setIsConnected(true);
      setIsConnecting(false);
      updateConnectionState();
    };

    const handleDisconnect = () => {
      console.log('🔌 SocketProvider: Socket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
      updateConnectionState();
    };

    const handleConnecting = () => {
      console.log('🔄 SocketProvider: Socket connecting...');
      setIsConnecting(true);
      updateConnectionState();
    };

    const handleReconnect = () => {
      console.log('🔄 SocketProvider: Socket reconnected successfully');
      setIsConnected(true);
      setIsConnecting(false);
      updateConnectionState();
    };

    // Message events for real-time UI updates
    const handleNewMessage = (message: any) => {
      console.log('📨 SocketProvider: New message received');
      setLastMessageTimestamp(Date.now());
    };

    const handleUserTyping = (data: any) => {
      console.log('✍️ SocketProvider: User typing event:', data.userId);
    };

    const handleMessagesRead = (data: any) => {
      console.log('✓✓ SocketProvider: Messages read event:', data.userId);
    };

    const handleUserStatus = (data: any) => {
      console.log('👤 SocketProvider: User status changed:', data.userId, data.status);
    };

    // Bind events
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connecting', handleConnecting);
    socketInstance.on('reconnect', handleReconnect);
    socketInstance.on('new-message', handleNewMessage);
    socketInstance.on('user-typing', handleUserTyping);
    socketInstance.on('messages-read', handleMessagesRead);
    socketInstance.on('user-status', handleUserStatus);

    // Cleanup function
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connecting', handleConnecting);
      socketInstance.off('reconnect', handleReconnect);
      socketInstance.off('new-message', handleNewMessage);
      socketInstance.off('user-typing', handleUserTyping);
      socketInstance.off('messages-read', handleMessagesRead);
      socketInstance.off('user-status', handleUserStatus);
    };
  };

  const updateConnectionState = () => {
    const state = socketClient.getConnectionState();
    setConnectionState(state);
    console.log('📊 Connection state updated:', state);
  };

  const monitorConnectionState = (socketInstance: Socket) => {
    // Only poll connection state as a fallback safety net — primary updates
    // happen via connect/disconnect event handlers above
    const interval = setInterval(() => {
      const connected = socketInstance.connected;
      if (connected !== isConnected) {
        setIsConnected(connected);
        const state = socketClient.getConnectionState();
        setConnectionState(state);
      }
    }, 10000); // Check every 10 seconds (reduced from 2s to prevent log spam)

    return () => clearInterval(interval);
  };

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log(`📱 App state: ${previousState} → ${nextAppState}`);

      if (socket && userId) {
        if (nextAppState === 'active' && previousState.match(/inactive|background/)) {
          // App came to foreground
          console.log('📱 App foregrounded - ensuring socket connection');
          if (!socket.connected) {
            console.log('🔄 Reconnecting socket after foreground...');
            socket.connect();
          } else {
            // Rejoin user room
            socket.emit('join', userId);
          }
        } else if (nextAppState.match(/inactive|background/) && previousState === 'active') {
          // App going to background
          console.log('📱 App backgrounded - socket stays connected for notifications');
          // Keep socket alive for push notifications
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [socket, userId]);

  // Network state monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('📶 Network state:', state.type, '| Connected:', state.isConnected);
      setNetworkState(state);

      // Attempt reconnection when network is restored
      if (state.isConnected && socket && !socket.connected && userId) {
        console.log('🔄 Network restored - attempting socket reconnection');
        setTimeout(() => {
          socket.connect();
        }, 1000);
      }
    });

    return unsubscribe;
  }, [socket, userId]);

  // Methods exposed to components
  const reconnect = () => {
    console.log('🔄 Manual reconnect requested');
    if (socket) {
      socket.disconnect();
      socket.connect();
    } else {
      initializeSocket();
    }
  };

  const getDebugInfo = async () => {
    const socketDebugInfo = await socketClient.getDebugInfo();
    return {
      ...socketDebugInfo,
      networkState,
      appState: appStateRef.current,
      lastMessageTimestamp,
    };
  };

  const value: SocketContextValue = {
    socket,
    isConnected,
    isConnecting,
    userId,
    connectionState,
    lastMessageTimestamp,
    reconnect,
    getDebugInfo,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
