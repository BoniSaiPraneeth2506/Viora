import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import {
  Bell,
  UserPlus,
  ThumbsUp,
  MessageCircle,
  AtSign,
  FileText,
  Video,
  Bookmark,
  Award,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {Notification} from '../types';
import {formatRelativeTime} from '../lib/sanity';
import {sanityWriteClient} from '../lib/write-client';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface NotificationItemProps {
  notification: Notification;
  onRead?: () => void;
}

const getNotificationIcon = (type: string) => {
  const iconSize = 20;
  
  switch (type) {
    case 'follow':
      return <UserPlus size={iconSize} color="#3B82F6" />;
    case 'upvote':
    case 'reel_upvote':
      return <ThumbsUp size={iconSize} color="#10B981" />;
    case 'comment':
    case 'reel_comment':
    case 'reply':
      return <MessageCircle size={iconSize} color="#8B5CF6" />;
    case 'mention':
      return <AtSign size={iconSize} color="#EC4899" />;
    case 'new_post':
      return <FileText size={iconSize} color="#059669" />;
    case 'new_reel':
      return <Video size={iconSize} color="#EA580C" />;
    case 'save':
    case 'reel_save':
      return <Bookmark size={iconSize} color="#F59E0B" />;
    case 'milestone':
      return <Award size={iconSize} color="#EAB308" />;
    default:
      return <Bell size={iconSize} color="#6B7280" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [isRead, setIsRead] = useState(notification.read);

  const handlePress = async () => {
    if (!isRead) {
      setIsRead(true);
      try {
        await sanityWriteClient
          .patch(notification._id)
          .set({read: true})
          .commit();
        onRead?.();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        setIsRead(false);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'follow' || notification.type === 'milestone') {
      navigation.navigate('Profile', {id: notification.sender?._id} as never);
    } else if (
      (notification.type === 'reel_upvote' ||
        notification.type === 'reel_comment' ||
        notification.type === 'reel_save' ||
        notification.type === 'new_reel') &&
      notification.reel
    ) {
      // Navigate to reel - for now go to Reels screen
      navigation.navigate('Reels' as never);
    } else if (notification.startup) {
      navigation.navigate(
        'StartupDetail',
        {slug: notification.startup.slug.current} as never
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: !isRead
            ? isDark
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(59, 130, 246, 0.05)'
            : colors.card,
          borderColor: !isRead ? colors.primary + '30' : colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        {notification.sender?.image && notification.type !== 'milestone' ? (
          <Image
            source={{uri: notification.sender.image}}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[styles.avatarPlaceholder, {backgroundColor: colors.card}]}>
            {notification.type === 'milestone' ? (
              <Award size={24} color="#EAB308" />
            ) : (
              <Bell size={24} color={colors.textSecondary} />
            )}
          </View>
        )}
        <View style={styles.iconBadge}>{getNotificationIcon(notification.type)}</View>
      </View>

      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Text style={[styles.senderName, {color: colors.text}]}>
            {notification.sender?.name || 'System'}
          </Text>
          <Text style={[styles.message, {color: colors.textSecondary}]}>
            {' '}
            {notification.message
              .replace(notification.sender?.name || 'System', '')
              .trim()}
          </Text>
        </View>

        {/* Related content preview */}
        {(notification.startup?.title || notification.reel?.title) && (
          <View style={[styles.contentPreview, {backgroundColor: isDark ? colors.background : colors.border + '40'}]}>
            <Text
              style={[styles.contentPreviewText, {color: colors.text}]}
              numberOfLines={1}>
              {notification.startup?.title || notification.reel?.title}
            </Text>
          </View>
        )}

        {/* Milestone badge */}
        {notification.type === 'milestone' && notification.milestoneValue && (
          <View style={styles.milestoneBadge}>
            <Award size={14} color="#EAB308" />
            <Text style={styles.milestoneText}>
              {notification.milestoneValue.toLocaleString()}{' '}
              {notification.milestoneType}
            </Text>
          </View>
        )}

        <Text style={[styles.timestamp, {color: colors.textSecondary}]}>
          {formatRelativeTime(notification._createdAt)}
        </Text>
      </View>

      {!isRead && (
        <View style={styles.unreadIndicator}>
          <View style={[styles.unreadDot, {backgroundColor: colors.primary}]} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  messageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xs,
  },
  senderName: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  message: {
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: 20,
  },
  contentPreview: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.medium,
    alignSelf: 'flex-start',
  },
  contentPreviewText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '500',
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignSelf: 'flex-start',
  },
  milestoneText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: '#92400E',
  },
  timestamp: {
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  unreadIndicator: {
    paddingTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
