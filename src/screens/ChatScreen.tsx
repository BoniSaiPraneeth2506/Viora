/**
 * ChatScreen — Instagram-style individual chat
 * Clean, dark-themed conversation with typing indicator, read receipts, keyboard handling
 */

import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  Dimensions,
  Keyboard,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  Info,
  Camera,
  Mic,
  ImageIcon,
  Heart,
  CheckCheck,
  Check,
} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useSocket} from '../contexts/SocketContext';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants/theme';
import {RootStackParamList} from '../types/navigation';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUserById,
  Message,
  incrementUnreadCount,
} from '../lib/chat-actions';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const MAX_BUBBLE = SCREEN_WIDTH * 0.75;

/* ── helpers ── */
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
};

const formatLastSeen = (lastSeenStr: string): string => {
  const lastSeen = new Date(lastSeenStr);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return lastSeen.toLocaleDateString();
};

const isSameDay = (a: string, b: string) => {
  const dA = new Date(a);
  const dB = new Date(b);
  return (
    dA.getFullYear() === dB.getFullYear() &&
    dA.getMonth() === dB.getMonth() &&
    dA.getDate() === dB.getDate()
  );
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(iso, now.toISOString())) return 'Today';
  if (isSameDay(iso, yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
};

export const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const {conversationId, otherUserId, otherUserName, otherUserImage} = route.params;
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const {socket, isConnected} = useSocket();
  const {user} = useAuth();
  const currentUserId = user?._id || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isViewingConversation = useRef(true);
  const inputRef = useRef<TextInput>(null);

  /* ── keyboard listeners (Android) ── */
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 150);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Optimized message list with real-time updates
  const allMessages = useMemo(() => {
    return [...messages, ...optimisticMessages].sort(
      (a, b) => new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime(),
    );
  }, [messages, optimisticMessages]);

  // Load other user details
  useEffect(() => {
    if (otherUserName && otherUserImage) {
      setOtherUser({_id: otherUserId, name: otherUserName, image: otherUserImage});
    } else {
      getUserById(otherUserId).then(u => u && setOtherUser(u));
    }
    if (socket) socket.emit('check-user-status', otherUserId);
  }, [otherUserId, otherUserName, otherUserImage, socket]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const msgs = await getMessages(conversationId, 100);
      setMessages(msgs);

      const unreadIds = msgs
        .filter(
          msg =>
            msg.sender._ref !== currentUserId &&
            !msg.readBy?.some(r => r._ref === currentUserId),
        )
        .map(msg => msg._id);

      if (unreadIds.length > 0) {
        await markMessagesAsRead(conversationId, currentUserId, unreadIds);
        if (socket) {
          socket.emit('messages-read', {conversationId, messageIds: unreadIds, userId: currentUserId});
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId, socket]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join-conversation', conversationId);
    isViewingConversation.current = true;

    const handleNewMessage = (message: Message) => {
      setOptimisticMessages(prev => prev.filter(opt => opt.tempId !== message._id));
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        const updated = [...prev, message];
        setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
        if (message.sender._ref !== currentUserId && isViewingConversation.current) {
          setTimeout(() => {
            markMessagesAsRead(conversationId, currentUserId, [message._id]);
            socket.emit('messages-read', {conversationId, messageIds: [message._id], userId: currentUserId});
          }, 500);
        }
        return updated;
      });
    };

    const handleUserTyping = (data: {userId: string; conversationId: string; isTyping: boolean}) => {
      if (data.conversationId === conversationId && data.userId === otherUserId) {
        setOtherUserTyping(data.isTyping);
        if (data.isTyping) setTimeout(() => setOtherUserTyping(false), 4000);
      }
    };

    const handleUserStatus = (data: {userId: string; status: 'online' | 'offline'; lastSeen?: string}) => {
      if (data.userId === otherUserId) {
        setOnlineStatus(data.status);
        if (data.lastSeen) setLastSeen(data.lastSeen);
      }
    };

    const handleMessagesRead = (data: {conversationId: string; messageIds: string[]; userId: string}) => {
      if (data.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg => {
            if (data.messageIds.includes(msg._id)) {
              const readBy = msg.readBy || [];
              if (!readBy.some(r => r._ref === data.userId)) {
                return {
                  ...msg,
                  readBy: [...readBy, {_ref: data.userId, _type: 'reference' as const, _key: `${data.userId}-read`}],
                };
              }
            }
            return msg;
          }),
        );
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-status', handleUserStatus);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      isViewingConversation.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        socket.emit('typing', {conversationId, isTyping: false});
      }
      socket.emit('leave-conversation', conversationId);
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-status', handleUserStatus);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, isConnected, conversationId, currentUserId, otherUserId]);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const messageText = newMessage.trim();
    setNewMessage('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      _rev: 'temp',
      content: messageText,
      messageType: 'text',
      sender: {_ref: currentUserId, _type: 'reference'},
      conversation: {_ref: conversationId, _type: 'reference'},
      timestamp: new Date().toISOString(),
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
      _type: 'message',
      readBy: [{_ref: currentUserId, _type: 'reference', _key: `${currentUserId}-read`}],
    };

    setOptimisticMessages(prev => [...prev, {...optimisticMessage, tempId}]);
    setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);

    try {
      setSending(true);
      const savedMessage = await sendMessage({conversationId, senderId: currentUserId, content: messageText, messageType: 'text'});
      if (savedMessage) {
        setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
        setMessages(prev => (prev.some(m => m._id === savedMessage._id) ? prev : [...prev, savedMessage]));
        await incrementUnreadCount(conversationId, otherUserId);
        if (socket && isConnected) {
          socket.emit('send-message', {...savedMessage, conversationId, recipientId: otherUserId, senderName: user?.name || 'Unknown'});
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  /* ── Typing indicator ── */
  const handleInputChange = useCallback(
    (text: string) => {
      setNewMessage(text);
      if (socket && isConnected) {
        if (!typingTimeoutRef.current && text.length > 0) {
          socket.emit('typing', {conversationId, isTyping: true});
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (text.length > 0) {
          typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', {conversationId, isTyping: false});
            typingTimeoutRef.current = null;
          }, 2000);
        } else {
          socket.emit('typing', {conversationId, isTyping: false});
          typingTimeoutRef.current = null;
        }
      }
    },
    [socket, isConnected, conversationId],
  );

  const handleInputBlur = useCallback(() => {
    if (socket && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', {conversationId, isTyping: false});
      typingTimeoutRef.current = null;
    }
  }, [socket, conversationId]);

  /* ── find last read message index from the other user ── */
  const lastReadByOtherIdx = useMemo(() => {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const m = allMessages[i];
      if (m.sender._ref === currentUserId && m.readBy && m.readBy.length > 1) return i;
    }
    return -1;
  }, [allMessages, currentUserId]);

  /* ── render single message ── */
  const renderMessage = useCallback(
    ({item, index}: {item: Message; index: number}) => {
      const isMe = item.sender._ref === currentUserId;
      const isOptimistic = item._id.startsWith('temp_');
      const showDateLabel =
        index === 0 || !isSameDay(allMessages[index - 1]._createdAt, item._createdAt);

      // Grouped bubbles: if same sender as next, shrink bottom margin
      const nextMsg = allMessages[index + 1];
      const sameSenderNext = nextMsg && nextMsg.sender._ref === item.sender._ref;
      const prevMsg = allMessages[index - 1];
      const sameSenderPrev = prevMsg && prevMsg.sender._ref === item.sender._ref;

      // Show small avatar for the LAST message in a group from the other user
      const showAvatar = !isMe && !sameSenderNext;

      // Show "Seen" indicator only under the last message I sent that the other user has read
      const showSeen = isMe && index === lastReadByOtherIdx;

      return (
        <>
          {showDateLabel && (
            <View style={styles.dateLabelWrap}>
              <Text style={[styles.dateLabel, {color: colors.textSecondary}]}>
                {formatDateLabel(item._createdAt)}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.row,
              isMe ? styles.rowMe : styles.rowThem,
              {marginBottom: sameSenderNext ? 2 : 10},
            ]}>
            {/* Avatar gutter */}
            {!isMe && (
              <View style={styles.avatarGutter}>
                {showAvatar ? (
                  otherUser?.image ? (
                    <Image source={{uri: otherUser.image}} style={styles.msgAvatar} />
                  ) : (
                    <View style={[styles.msgAvatar, {backgroundColor: colors.primary}]}>
                      <Text style={styles.msgAvatarLetter}>
                        {otherUser?.name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )
                ) : null}
              </View>
            )}

            {/* Bubble */}
            <View
              style={[
                styles.bubble,
                isMe
                  ? {
                      backgroundColor: colors.primary,
                      borderBottomRightRadius: sameSenderNext ? 6 : 20,
                      borderTopRightRadius: sameSenderPrev && !showDateLabel ? 6 : 20,
                    }
                  : {
                      backgroundColor: isDark ? COLORS.gray[800] : COLORS.gray[100],
                      borderBottomLeftRadius: sameSenderNext ? 6 : 20,
                      borderTopLeftRadius: sameSenderPrev && !showDateLabel ? 6 : 20,
                    },
                isOptimistic && {opacity: 0.6},
              ]}>
              <Text style={[styles.bubbleText, {color: isMe ? '#fff' : colors.text}]}>
                {item.content}
              </Text>
            </View>
          </View>

          {/* Seen indicator — Instagram style: small avatar below last-read message */}
          {showSeen && otherUser && (
            <View style={styles.seenRow}>
              {otherUser.image ? (
                <Image source={{uri: otherUser.image}} style={styles.seenAvatar} />
              ) : (
                <View style={[styles.seenAvatar, {backgroundColor: colors.primary}]}>
                  <Text style={{color: '#fff', fontSize: 8, fontWeight: '700'}}>
                    {otherUser.name?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      );
    },
    [allMessages, currentUserId, otherUser, lastReadByOtherIdx, colors, isDark],
  );

  /* ── Typing dots animation ── */
  const TypingIndicator = () => {
    if (!otherUserTyping) return null;
    return (
      <View style={[styles.row, styles.rowThem, {marginBottom: 10}]}>
        <View style={styles.avatarGutter}>
          {otherUser?.image ? (
            <Image source={{uri: otherUser.image}} style={styles.msgAvatar} />
          ) : (
            <View style={[styles.msgAvatar, {backgroundColor: colors.primary}]}>
              <Text style={styles.msgAvatarLetter}>
                {otherUser?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.bubble,
            {backgroundColor: isDark ? COLORS.gray[800] : COLORS.gray[100], paddingVertical: 12, paddingHorizontal: 16},
          ]}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, {backgroundColor: colors.textSecondary, opacity: 0.4}]} />
            <View style={[styles.dot, {backgroundColor: colors.textSecondary, opacity: 0.6}]} />
            <View style={[styles.dot, {backgroundColor: colors.textSecondary, opacity: 0.9}]} />
          </View>
        </View>
      </View>
    );
  };

  /* ── Header status text ── */
  const statusText = otherUserTyping
    ? 'typing...'
    : onlineStatus === 'online'
    ? 'Active now'
    : lastSeen
    ? `Active ${formatLastSeen(lastSeen)}`
    : '';

  /* ── Loading ── */
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* ── Header ── */}
        <View style={[styles.header, {backgroundColor: colors.background, borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.8}>
            {otherUser?.image ? (
              <View style={styles.headerAvatarWrap}>
                <Image source={{uri: otherUser.image}} style={styles.headerAvatar} />
                {onlineStatus === 'online' && <View style={[styles.onlineDot, {borderColor: colors.background}]} />}
              </View>
            ) : (
              <View style={styles.headerAvatarWrap}>
                <View style={[styles.headerAvatar, {backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'}]}>
                  <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>
                    {otherUser?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                {onlineStatus === 'online' && <View style={[styles.onlineDot, {borderColor: colors.background}]} />}
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={[styles.headerName, {color: colors.text}]} numberOfLines={1}>
                {otherUser?.name || 'Chat'}
              </Text>
              {statusText !== '' && (
                <Text style={[styles.headerStatus, {color: colors.textSecondary}]} numberOfLines={1}>
                  {statusText}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
              <Phone size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
              <Video size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={allMessages}
          renderItem={renderMessage}
          keyExtractor={item => item._id || item.tempId}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: false})}
          onLayout={() => flatListRef.current?.scrollToEnd({animated: false})}
          removeClippedSubviews={Platform.OS === 'android'}
          windowSize={12}
          maxToRenderPerBatch={20}
          initialNumToRender={30}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<TypingIndicator />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyAvatarBig}>
                {otherUser?.image ? (
                  <Image source={{uri: otherUser.image}} style={styles.emptyImg} />
                ) : (
                  <View style={[styles.emptyImg, {backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'}]}>
                    <Text style={{color: '#fff', fontSize: 28, fontWeight: '700'}}>
                      {otherUser?.name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.emptyName, {color: colors.text}]}>{otherUser?.name}</Text>
              <Text style={[styles.emptyHint, {color: colors.textSecondary}]}>
                Send a message to start the conversation
              </Text>
            </View>
          }
        />

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, {backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom + 16, 34)}]}>
          <View style={[styles.inputPill, {backgroundColor: isDark ? COLORS.gray[800] : COLORS.gray[100], borderColor: colors.border}]}>
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
              <Camera size={22} color={colors.primary} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={[styles.input, {color: colors.text}]}
              placeholder="Message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={handleInputChange}
              onBlur={handleInputBlur}
              multiline
              maxLength={1000}
              blurOnSubmit={false}
            />

            {newMessage.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSend}
                disabled={sending}
                style={styles.sendBtn}
                activeOpacity={0.7}>
                {sending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Send size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.inputTrailing}>
                <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
                  <Mic size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
                  <ImageIcon size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ═══════════════════════════ Styles ═══════════════════════════ */
const styles = StyleSheet.create({
  container: {flex: 1},
  flex1: {flex: 1},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatarWrap: {position: 'relative'},
  headerAvatar: {width: 36, height: 36, borderRadius: 18},
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#44b700',
    borderWidth: 2,
  },
  headerText: {marginLeft: 10, flex: 1},
  headerName: {fontSize: 16, fontWeight: '700', letterSpacing: -0.2},
  headerStatus: {fontSize: 12, marginTop: 1},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 4},
  headerIconBtn: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},

  /* ── Message list ── */
  list: {paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexGrow: 1},

  /* ── Date labels ── */
  dateLabelWrap: {alignItems: 'center', marginVertical: 16},
  dateLabel: {fontSize: 12, fontWeight: '500'},

  /* ── Message row ── */
  row: {flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2},
  rowMe: {justifyContent: 'flex-end'},
  rowThem: {justifyContent: 'flex-start'},

  avatarGutter: {width: 30, marginRight: 6},
  msgAvatar: {width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center'},
  msgAvatarLetter: {color: '#fff', fontSize: 11, fontWeight: '700'},

  /* ── Bubble ── */
  bubble: {
    maxWidth: MAX_BUBBLE,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleText: {fontSize: 15, lineHeight: 21},

  /* ── Seen indicator ── */
  seenRow: {alignItems: 'flex-end', marginRight: 4, marginTop: 2, marginBottom: 6},
  seenAvatar: {width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center'},

  /* ── Typing indicator ── */
  typingDots: {flexDirection: 'row', gap: 4, alignItems: 'center'},
  dot: {width: 7, height: 7, borderRadius: 3.5},

  /* ── Empty state ── */
  emptyWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60},
  emptyAvatarBig: {marginBottom: 16},
  emptyImg: {width: 80, height: 80, borderRadius: 40},
  emptyName: {fontSize: 18, fontWeight: '700', marginBottom: 4},
  emptyHint: {fontSize: 14},

  /* ── Input bar ── */
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  inputIcon: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 110,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    paddingHorizontal: 6,
    lineHeight: 22,
  },
  inputTrailing: {flexDirection: 'row'},
  sendBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
});

export default ChatScreen;
