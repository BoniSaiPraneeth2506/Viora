# 📱 Real-Time Messaging Implementation

A complete Socket.IO-based instant messaging system for Viora React Native app with WhatsApp-style features.

## ✨ Features

- **Instant Messaging**: Real-time bidirectional communication
- **Typing Indicators**: See when someone is typing
- **Read Receipts**: ✓ sent, ✓✓ read status
- **Online Status**: Real-time connection status
- **Conversation Lists**: All chats with unread counts
- **User Search**: Find and start new conversations
- **Offline Support**: Messages queue when offline
- **Clean UI**: Modern, intuitive interface

## 🏗️ Architecture

### Client-Side Components

#### 1. Socket Client (`src/lib/socket-client.ts`)
- **Singleton Pattern**: Single socket instance across app
- **Auto-Reconnection**: Exponential backoff with 10 attempts
- **Mobile Lifecycle**: Handles app background/foreground
- **Production Ready**: Configurable server URL via env vars

#### 2. Socket Context Provider (`src/contexts/SocketContext.tsx`)
- **React Context**: Global socket access
- **User Authentication**: Auto-joins user rooms
- **App State Management**: Maintains connection during lifecycle changes
- **NetInfo Integration**: Network-aware reconnection

#### 3. Chat Actions (`src/lib/chat-actions.ts`)
- **Sanity Integration**: All messages persist to Sanity CMS
- **Type-Safe Operations**: Full TypeScript support
- **Real-time Sync**: Socket events + Sanity storage
- **Conversation Management**: Create, list, search conversations

### Sanity Schemas

#### Conversation Schema (`src/sanity/schemas/conversation.ts`)
```typescript
{
  _type: 'conversation',
  participants: [AuthorRef, AuthorRef], // Exactly 2 users
  lastMessage: MessageRef,
  lastMessageAt: datetime,
  unreadCounts: [{userId: string, count: number}]
}
```

#### Message Schema (`src/sanity/schemas/message.ts`)
```typescript
{
  _type: 'message',
  conversation: ConversationRef,
  sender: AuthorRef,
  content: string,
  image?: {url: string, alt?: string},
  readBy: [AuthorRef],
  messageType: 'text' | 'image' | 'system',
  createdAt: datetime
}
```

## 🔧 Setup & Configuration

### 1. Environment Variables

Create `.env` file:
```env
# Socket.IO Server URL
EXPO_PUBLIC_SOCKET_URL=http://your-server.com

# For local development:
# EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:3000
```

### 2. Install Dependencies 

```bash
npm install socket.io-client @expo/vector-icons --legacy-peer-deps
```

### 3. Wrap App with SocketProvider

```tsx
// App.tsx
import {SocketProvider} from './src/contexts/SocketContext';

<AuthProvider>
  <SocketProvider>
    <AppContent />
  </SocketProvider>
</AuthProvider>
```

### 4. Add Navigation Routes

```tsx
// navigation/AppNavigator.tsx
import {ChatScreen} from '../screens/ChatScreen';

<Stack.Screen name="Chat" component={ChatScreen} />
```

## 📡 Socket Events

### Client → Server Events
- `join` - Join user room on connect
- `join-conversation` - Join specific conversation room  
- `send-message` - Send new message to conversation
- `typing` - Send typing indicator
- `messages-read` - Mark messages as read
- `leave-conversation` - Leave conversation room

### Server → Client Events
- `new-message` - Receive new message
- `user-typing` - Receive typing indicator
- `messages-read` - Receive read receipts
- `user-status` - User online/offline status

## 💻 Usage Examples

### Send a Message
```tsx
const {socket} = useSocket();

// Create in Sanity
const message = await sendMessage({
  conversationId,
  senderId: userId,
  content: messageText
});

// Broadcast via Socket.IO
socket.emit('send-message', {
  conversationId,
  message,
  recipientId: otherUserId
});
```

### Handle Incoming Messages
```tsx
useEffect(() => {
  if (!socket) return;
  
  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    markMessagesAsRead(conversationId, userId, [message._id]);
  };
  
  socket.on('new-message', handleNewMessage);
  return () => socket.off('new-message', handleNewMessage);
}, [socket]);
```

### Typing Indicators
```tsx
const handleTyping = (text) => {
  setMessage(text);
  
  if (!isTyping && text.length > 0) {
    setIsTyping(true);
    socket.emit('typing', {conversationId, userId, isTyping: true});
  }
  
  // Stop typing after 2s of inactivity
  clearTimeout(typingTimeout.current);
  typingTimeout.current = setTimeout(() => {
    setIsTyping(false);
    socket.emit('typing', {conversationId, userId, isTyping: false});
  }, 2000);
};
```

## 🎯 User Flow

### Starting a Chat
1. Tap **+** in MessagesScreen
2. Search for users by name/username
3. Select user → Creates conversation
4. Navigate to ChatScreen

### Messaging Flow
1. Type message → Shows typing indicator to other user
2. Send message → Saves to Sanity + broadcasts via Socket.IO
3. Other user receives real-time → Auto-marks as read
4. Read receipts update (✓ → ✓✓)

### Real-time Updates
- **New messages**: Instant delivery with sound/vibration
- **Typing indicators**: "User is typing..." with 2s timeout  
- **Read receipts**: Automatic when viewing conversation
- **Online status**: Connection state in header
- **Unread counts**: Badge with count in conversation list

## 🔄 Offline Behavior

- **Queue messages**: Store locally when offline
- **Auto-retry**: Send when connection restored  
- **Visual feedback**: "Offline" banner shows connection state
- **Graceful degradation**: UI remains functional

## 🎨 UI Components

### ChatScreen
- **Header**: User avatar, name, typing/online status
- **Message list**: Bubbles with timestamps and read receipts  
- **Input**: Type area with send button
- **Real-time**: Auto-scroll to bottom on new messages

### MessagesScreen  
- **Search**: User search with instant results
- **Conversation list**: Avatar, name, last message, unread count
- **Real-time updates**: Live last message and unread count updates

## 🔐 Security Considerations

- **User rooms**: Users auto-join personal rooms on connect
- **Conversation rooms**: Users join/leave specific conversation rooms
- **Authentication**: User ID verified on socket connection
- **Persistence**: All messages stored in Sanity with proper access control

## 🚀 Performance

- **Optimized FlatList**: Efficient message rendering
- **Debounced typing**: 2s timeout prevents spam
- **Automatic cleanup**: Socket listeners removed on unmount
- **Memory management**: Messages loaded in batches

## 🐛 Troubleshooting

### Common Issues

**Socket not connecting:**
- Check `EXPO_PUBLIC_SOCKET_URL` in environment
- Verify server is running and accessible
- Check network permissions

**Messages not sending:**
- Verify Sanity write permissions
- Check user authentication
- Ensure conversation exists

**Typing indicators not working:**
- Verify socket connection
- Check conversation room joining
- Ensure proper event listeners

### Debug Mode
Enable socket debug logs:
```tsx
// In socket-client.ts
console.log('🚀 Socket events...') // Already included
```

## 📊 Analytics & Monitoring

Track key metrics:
- **Message delivery time**: Socket emit → receive
- **Connection reliability**: Reconnection frequency  
- **User engagement**: Messages per conversation
- **Error rates**: Failed sends, connection drops

---

## 🎯 Next Steps

### Potential Enhancements
1. **Image/Video Messages**: Media sharing with Sanity assets
2. **Voice Messages**: Audio recording and playback
3. **Push Notifications**: Background message alerts
4. **Message Reactions**: Emoji reactions on messages  
5. **Group Chats**: Multi-participant conversations
6. **Message Encryption**: End-to-end encryption
7. **Message Search**: Full-text search across conversations
8. **Chat Backup**: Export/import conversation history

This implementation provides a solid foundation for real-time messaging with room to grow based on user needs and feedback.