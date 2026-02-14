/**
 * MessagesScreen — Instagram-style DM tab
 * Clean dark-themed conversations list with search, filters, and real-time updates
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Search,
  X,
  SlidersHorizontal,
  SquarePen,
  WifiOff,
  MessageCircle,
  Check,
  CircleDot,
  MailOpen,
  BellOff,
} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useSocket} from '../contexts/SocketContext';
import {useAuth} from '../contexts/AuthContext';
import {BottomNav} from '../components/BottomNav';
import {COLORS} from '../constants/theme';
import {CreateModalContext} from '../contexts/CreateModalContext';
import {RootStackParamList} from '../types/navigation';
import {
  getConversations,
  searchUsers,
  getOrCreateConversation,
  ConversationWithDetails,
} from '../lib/chat-actions';

type MessagesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Messages'
>;

export const MessagesScreen: React.FC = () => {
  const {isDark} = useTheme();
  const {openModal} = React.useContext(CreateModalContext);
  const colors = isDark ? COLORS.dark : COLORS.light;
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  const {socket, isConnected} = useSocket();
  const {user} = useAuth();
  const currentUserId = user?._id || '';

  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const searchInputRef = useRef<TextInput>(null);

  // ── Data ──────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const convos = await getConversations(currentUserId);
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Reload whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) loadConversations();
    }, [currentUserId, loadConversations]),
  );

  useEffect(() => {
    if (currentUserId) loadConversations();
  }, [currentUserId, loadConversations]);

  // Socket real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;
    const reload = () => loadConversations();
    socket.on('new-message', reload);
    socket.on('message-notification', reload);
    return () => {
      socket.off('new-message', reload);
      socket.off('message-notification', reload);
    };
  }, [socket, isConnected, loadConversations]);

  // ── Search ────────────────────────────────────────────
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(query, currentUserId);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  // ── Navigation ────────────────────────────────────────
  const handleStartChat = async (otherUser: any) => {
    try {
      const conversation = await getOrCreateConversation(
        currentUserId,
        otherUser._id,
      );
      setSearchQuery('');
      setSearchResults([]);
      navigation.navigate('Chat', {
        conversationId: conversation._id,
        otherUserId: otherUser._id,
        otherUserName: otherUser.name,
        otherUserImage: otherUser.image,
      });
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleOpenConversation = (convo: ConversationWithDetails) => {
    navigation.navigate('Chat', {
      conversationId: convo._id,
      otherUserId: convo.otherUser?._id || '',
      otherUserName: convo.otherUser?.name,
      otherUserImage: convo.otherUser?.image,
    });
  };

  // ── Helpers ───────────────────────────────────────────
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    const weeks = Math.floor(days / 7);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    if (days < 7) return `${days}d`;
    if (weeks < 52) return `${weeks}w`;
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  /** Instagram-style message preview: "4+ new messages · 15m" */
  const getPreview = (convo: ConversationWithDetails) => {
    const text = convo.lastMessageText;
    const time = formatTime(convo.lastMessageTime);
    const unread = convo.unreadCount || 0;

    if (!text) return 'Tap to start chatting';

    if (unread >= 4) return `4+ new messages · ${time}`;
    if (unread > 1) return `${unread} new messages · ${time}`;
    if (unread === 1) {
      const short = text.length > 25 ? text.substring(0, 25) + '…' : text;
      return `${short} · ${time}`;
    }

    // No unread — show "Sent 2h ago" style
    const short = text.length > 30 ? text.substring(0, 30) + '…' : text;
    return `Sent · ${short} · ${time}`;
  };

  // Filter
  const filteredConversations =
    filter === 'unread'
      ? conversations.filter(c => (c.unreadCount || 0) > 0)
      : conversations;

  const isSearchActive = searchQuery.trim().length >= 2;

  const handleMarkAllRead = () => {
    setShowFilterMenu(false);
    // TODO: bulk mark-as-read implementation
  };

  // ── Render: Conversation Row ──────────────────────────
  const renderConversation = ({item}: {item: ConversationWithDetails}) => {
    const hasUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleOpenConversation(item)}
        activeOpacity={0.6}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {item.otherUser?.image ? (
            <Image
              source={{uri: item.otherUser.image}}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>
                {item.otherUser?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Name + preview */}
        <View style={styles.rowCenter}>
          <Text
            style={[
              styles.name,
              {color: colors.text},
              hasUnread && styles.nameBold,
            ]}
            numberOfLines={1}>
            {item.otherUser?.name || 'Unknown'}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {getPreview(item)}
          </Text>
        </View>

        {/* Unread dot */}
        <View style={styles.rowEnd}>
          {hasUnread && <View style={styles.dot} />}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render: Search Result Row ─────────────────────────
  const renderSearchResult = ({item}: {item: any}) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => handleStartChat(item)}
      activeOpacity={0.6}>
      <View style={styles.avatarWrap}>
        {item.image ? (
          <Image source={{uri: item.image}} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>
              {item.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.name, {color: colors.text}]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ── Render: Bottom-sheet filter menu ──────────────────
  const FilterSheet = () => (
    <Modal
      visible={showFilterMenu}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterMenu(false)}>
      <Pressable
        style={styles.overlay}
        onPress={() => setShowFilterMenu(false)}>
        <View
          style={[styles.sheet, {backgroundColor: isDark ? '#1C1C1E' : '#FFF'}]}>
          {/* Grab handle */}
          <View style={styles.sheetHandle} />

          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => {
              setFilter('all');
              setShowFilterMenu(false);
            }}>
            <MessageCircle
              size={22}
              color={
                filter === 'all' ? '#0095F6' : isDark ? '#8E8E93' : '#666'
              }
            />
            <Text
              style={[
                styles.sheetLabel,
                {color: colors.text},
                filter === 'all' && {color: '#0095F6', fontWeight: '600'},
              ]}>
              All messages
            </Text>
            {filter === 'all' && <Check size={18} color="#0095F6" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => {
              setFilter('unread');
              setShowFilterMenu(false);
            }}>
            <CircleDot
              size={22}
              color={
                filter === 'unread' ? '#0095F6' : isDark ? '#8E8E93' : '#666'
              }
            />
            <Text
              style={[
                styles.sheetLabel,
                {color: colors.text},
                filter === 'unread' && {color: '#0095F6', fontWeight: '600'},
              ]}>
              Unread
            </Text>
            {filter === 'unread' && <Check size={18} color="#0095F6" />}
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              {backgroundColor: isDark ? '#38383A' : '#E5E5EA'},
            ]}
          />

          <TouchableOpacity style={styles.sheetRow} onPress={handleMarkAllRead}>
            <MailOpen
              size={22}
              color={isDark ? '#8E8E93' : '#666'}
            />
            <Text style={[styles.sheetLabel, {color: colors.text}]}>
              Mark all as read
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => setShowFilterMenu(false)}>
            <BellOff
              size={22}
              color={isDark ? '#8E8E93' : '#666'}
            />
            <Text style={[styles.sheetLabel, {color: colors.text}]}>
              Notification settings
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.fill} edges={['top']}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0095F6" />
          </View>
        </SafeAreaView>
        <BottomNav onCreatePress={openModal} />
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* ── Header: name + compose button ── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {user?.name || user?.username || 'Messages'}
          </Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => searchInputRef.current?.focus()}>
            <SquarePen size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchPill,
              {backgroundColor: isDark ? '#262626' : '#EFEFEF'},
            ]}>
            <Search size={16} color="#8E8E93" />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, {color: colors.text}]}
              placeholder="Search"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
            {searching && (
              <ActivityIndicator
                size="small"
                color="#0095F6"
                style={{marginLeft: 4}}
              />
            )}
          </View>
        </View>

        {/* ── Section label: "Messages" + filter icon ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, {color: colors.text}]}>
            {filter === 'unread' ? 'Unread' : 'Messages'}
          </Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowFilterMenu(true)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SlidersHorizontal size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Offline banner ── */}
        {!isConnected && (
          <View style={styles.offline}>
            <WifiOff size={14} color="#fff" />
            <Text style={styles.offlineLabel}>
              Offline — reconnecting…
            </Text>
          </View>
        )}

        {/* ── List ── */}
        {isSearchActive ? (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listGrow}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{color: colors.textSecondary, fontSize: 15}}>
                  {searching ? 'Searching…' : 'No users found'}
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listGrow}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadConversations();
                }}
                tintColor="#0095F6"
                colors={['#0095F6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <MessageCircle
                  size={56}
                  color={isDark ? '#333' : '#CCC'}
                  strokeWidth={1.5}
                />
                <Text
                  style={[styles.emptyTitle, {color: colors.text}]}>
                  {filter === 'unread'
                    ? 'No unread messages'
                    : 'Your messages'}
                </Text>
                <Text
                  style={[
                    styles.emptySub,
                    {color: colors.textSecondary},
                  ]}>
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : 'Tap the compose icon to start a conversation'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <BottomNav onCreatePress={openModal} />
      <FilterSheet />
    </View>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const styles = StyleSheet.create({
  container: {flex: 1},
  fill: {flex: 1},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Search ── */
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: 42,
  },

  /* ── Section label ── */
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Offline ── */
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    gap: 6,
  },
  offlineLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  /* ── Conversation row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '600',
  },
  rowCenter: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 3,
  },
  nameBold: {
    fontWeight: '700',
  },
  preview: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  rowEnd: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0095F6',
  },

  /* ── List / empty ── */
  listGrow: {flexGrow: 1},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Filter bottom sheet ── */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  sheetLabel: {
    fontSize: 16,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 4,
  },
});
