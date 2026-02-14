/**
 * NotificationsScreen — YouTube-style notification list
 * Avatar | multi-line text (username, action, time) | post/reel thumbnail
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ArrowLeft} from 'lucide-react-native';
import {RootStackParamList} from '../types/navigation';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {BottomNav} from '../components/BottomNav';
import {CreateModalContext} from '../contexts/CreateModalContext';
import {Notification} from '../types';
import {sanityClient} from '../lib/sanity';
import {sanityWriteClient} from '../lib/write-client';
import {NOTIFICATIONS_BY_USER_QUERY} from '../lib/queries';
import {COLORS} from '../constants/theme';

/* ── helpers ── */

const timeAgo = (iso: string): string => {
  const now = new Date();
  const d = new Date(iso);
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

/** Section label */
const getSection = (iso: string): string => {
  const now = new Date();
  const d = new Date(iso);
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 1 && now.getDate() === d.getDate()) return 'Today';
  if (diffDays < 2) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  return 'Earlier';
};

/** Build the action line shown under the username */
const actionLine = (n: Notification): string => {
  switch (n.type) {
    case 'follow':
      return 'Started following you';
    case 'upvote':
      return 'Liked your post';
    case 'reel_upvote':
      return 'Liked your reel';
    case 'comment':
      return n.comment?.content
        ? `Commented: "${n.comment.content.length > 60 ? n.comment.content.slice(0, 60) + '…' : n.comment.content}"`
        : 'Commented on your post';
    case 'reel_comment':
      return n.comment?.content
        ? `Commented: "${n.comment.content.length > 60 ? n.comment.content.slice(0, 60) + '…' : n.comment.content}"`
        : 'Commented on your reel';
    case 'reply':
      return n.comment?.content
        ? `Replied: "${n.comment.content.length > 60 ? n.comment.content.slice(0, 60) + '…' : n.comment.content}"`
        : 'Replied to your comment';
    case 'mention':
      return 'Mentioned you in a comment';
    case 'new_post':
      return n.startup?.title
        ? `Shared a new post: "${n.startup.title}"`
        : 'Shared a new post';
    case 'new_reel':
      return n.reel?.title
        ? `Uploaded a new reel: "${n.reel.title}"`
        : 'Uploaded a new reel';
    case 'save':
      return 'Saved your post';
    case 'reel_save':
      return 'Saved your reel';
    case 'milestone':
      return `Reached ${n.milestoneValue?.toLocaleString() || ''} ${n.milestoneType || 'milestone'}!`;
    default:
      return n.message || 'Interacted with your content';
  }
};

/** Get thumbnail URI for the notification (post image or reel thumbnail) */
const getThumbnail = (n: Notification): string | null => {
  if (n.startup?.image) return n.startup.image;
  if (n.reel?.thumbnail) return n.reel.thumbnail;
  return null;
};

/* ═══════════════════ Component ═══════════════════ */

export const NotificationsScreen: React.FC = () => {
  const {isDark} = useTheme();
  const {openModal} = React.useContext(CreateModalContext);
  const colors = isDark ? COLORS.dark : COLORS.light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user} = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ── fetch ── */
  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      const data = await sanityClient.fetch<Notification[]>(
        NOTIFICATIONS_BY_USER_QUERY,
        {userId: user._id},
      );
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      if (user?._id) fetchNotifications();
    }, [user?._id, fetchNotifications]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  /* ── mark read ── */
  const markRead = async (id: string) => {
    try {
      await sanityWriteClient.patch(id).set({read: true}).commit();
      setNotifications(prev =>
        prev.map(n => (n._id === id ? {...n, read: true} : n)),
      );
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  };

  /* ── navigation on tap ── */
  const handlePress = (n: Notification) => {
    if (!n.read) markRead(n._id);

    if (n.type === 'follow' || n.type === 'milestone') {
      navigation.navigate('Profile' as any, {id: n.sender?._id});
    } else if (
      ['reel_upvote', 'reel_comment', 'reel_save', 'new_reel'].includes(n.type) &&
      n.reel
    ) {
      navigation.navigate('Reels');
    } else if (n.startup) {
      navigation.navigate('StartupDetail', {
        id: n.startup.slug?.current || n.startup._id,
      });
    }
  };

  /* ── build sections ── */
  type ListItem =
    | {kind: 'header'; title: string}
    | {kind: 'item'; notification: Notification};
  const listItems: ListItem[] = [];
  const sectionMap = new Map<string, Notification[]>();
  (notifications || []).forEach(n => {
    const sec = getSection(n._createdAt);
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec)!.push(n);
  });
  sectionMap.forEach((data, title) => {
    listItems.push({kind: 'header', title});
    data.forEach(n => listItems.push({kind: 'item', notification: n}));
  });

  /* ── render card ── */
  const renderRow = ({item}: {item: ListItem}) => {
    if (item.kind === 'header') {
      return (
        <Text style={[styles.sectionTitle, {color: colors.text}]}>
          {item.title}
        </Text>
      );
    }

    const n = item.notification;
    const unread = !n.read;
    const thumb = getThumbnail(n);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          unread && {
            backgroundColor: isDark
              ? 'rgba(0,149,246,0.06)'
              : 'rgba(0,149,246,0.04)',
          },
        ]}
        onPress={() => handlePress(n)}
        activeOpacity={0.6}>
        {/* ── Unread dot ── */}
        <View style={styles.dotCol}>
          {unread && <View style={styles.unreadDot} />}
        </View>

        {/* ── Avatar ── */}
        {n.sender?.image ? (
          <Image source={{uri: n.sender.image}} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              {backgroundColor: getAvatarColor(n.sender?.name)},
            ]}>
            <Text style={styles.avatarLetter}>
              {n.sender?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        {/* ── Text column ── */}
        <View style={styles.textCol}>
          <Text
            style={[styles.username, {color: colors.text}]}
            numberOfLines={1}>
            @{n.sender?.username || n.sender?.name || 'someone'}
          </Text>
          <Text
            style={[styles.action, {color: colors.textSecondary}]}
            numberOfLines={2}>
            {actionLine(n)}
          </Text>
          <Text style={styles.time}>{timeAgo(n._createdAt)}</Text>
        </View>

        {/* ── Thumbnail ── */}
        {thumb ? (
          <Image source={{uri: thumb}} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
      </TouchableOpacity>
    );
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.fill} edges={['top']}>
          <View style={styles.loadWrap}>
            <ActivityIndicator size="large" color="#0095F6" />
          </View>
        </SafeAreaView>
        <BottomNav onCreatePress={openModal} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Notifications
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* ── List ── */}
        <FlatList
          data={listItems}
          renderItem={renderRow}
          keyExtractor={(item, i) =>
            item.kind === 'header' ? `h-${item.title}` : item.notification._id
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0095F6"
              colors={['#0095F6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, {color: colors.text}]}>
                No notifications yet
              </Text>
              <Text
                style={[styles.emptySub, {color: colors.textSecondary}]}>
                When people interact with your content, you'll see it
                here.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
      <BottomNav onCreatePress={openModal} />
    </View>
  );
};

/* ── Deterministic avatar color from name ── */
const AVATAR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#009688',
  '#4CAF50', '#FF9800', '#FF5722', '#795548',
];
const getAvatarColor = (name?: string) => {
  if (!name) return '#666';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/* ═══════════════════ Styles ═══════════════════ */
const styles = StyleSheet.create({
  container: {flex: 1},
  fill: {flex: 1},
  loadWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},

  /* List */
  list: {paddingBottom: 100},

  /* Section header */
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
  },

  /* ── YouTube-style notification card ── */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },

  /* Unread dot column (narrow fixed width) */
  dotCol: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0095F6',
  },

  /* Avatar */
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },

  /* Text column (flex) */
  textCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  action: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },

  /* ── Thumbnail (right side) ── */
  thumbnail: {
    width: 100,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  thumbPlaceholder: {
    width: 100,
    height: 60,
  },

  /* Empty */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  emptySub: {fontSize: 14, textAlign: 'center', lineHeight: 20},
});

