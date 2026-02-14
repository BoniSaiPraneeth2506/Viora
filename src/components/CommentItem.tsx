import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {ThumbsUp, Reply, Trash2} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {CommentForm} from './CommentForm';
import {Comment} from '../types';
import {urlFor, formatRelativeTime, hasUserUpvoted, formatCount} from '../lib/sanity';
import {handleCommentUpvote} from '../lib/interactions';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface CommentItemProps {
  comment: Comment;
  startupId?: string;
  reelId?: string;
  level?: number;
  onCommentAdded?: () => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  startupId,
  reelId,
  level = 0,
  onCommentAdded,
}) => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(comment.upvotes || 0);
  const [isUpvoted, setIsUpvoted] = useState(
    user ? hasUserUpvoted(comment.upvotedBy, user._id) : false
  );
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isAuthor = user?._id === comment.author?._id;
  const canNest = level < 3; // Limit nesting to 3 levels
  const marginLeft = level * SPACING.lg;

  const handleUpvote = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to upvote comments');
      return;
    }

    if (isActionLoading) return;

    // Optimistic update
    const newUpvoted = !isUpvoted;
    setIsUpvoted(newUpvoted);
    setOptimisticUpvotes(prev => newUpvoted ? prev + 1 : prev - 1);

    setIsActionLoading(true);
    try {
      await handleCommentUpvote(comment._id, user._id, comment.upvotedBy || []);
    } catch (error) {
      // Revert on error
      setIsUpvoted(!newUpvoted);
      setOptimisticUpvotes(prev => newUpvoted ? prev - 1 : prev + 1);
      Alert.alert('Error', 'Failed to upvote comment. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    onCommentAdded?.();
  };

  const handleAuthorPress = () => {
    // TODO: Navigate to user profile
    console.log('Navigate to user:', comment.author._id);
  };

  return (
    <View style={[styles.container, {marginLeft}]}>
      <View style={styles.commentContent}>
        {/* Author Avatar */}
        <TouchableOpacity onPress={handleAuthorPress} style={styles.avatarContainer}>
          <Image
            source={{
              uri: urlFor(comment.author?.image).url() || 'https://via.placeholder.com/36',
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>

        {/* Comment Body */}
        <View style={styles.commentBody}>
          {/* Author Info */}
          <View style={styles.authorInfo}>
            <TouchableOpacity onPress={handleAuthorPress}>
              <Text style={[styles.authorName, {color: colors.text}]}>
                {comment.author?.name}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.separator, {color: colors.textSecondary}]}>•</Text>
            <Text style={[styles.timestamp, {color: colors.textSecondary}]}>
              {formatRelativeTime(comment._createdAt)}
            </Text>
          </View>

          {/* Comment Content */}
          <Text style={[styles.content, {color: colors.text}]}>
            {comment.content || '[No content]'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isUpvoted && {backgroundColor: colors.primary + '15'},
              ]}
              onPress={handleUpvote}
              disabled={isActionLoading || !user}
              activeOpacity={0.7}>
              {isActionLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <ThumbsUp
                  size={16}
                  color={isUpvoted ? colors.primary : colors.textSecondary}
                  fill={isUpvoted ? colors.primary : 'none'}
                />
              )}
              <Text
                style={[
                  styles.actionText,
                  {
                    color: isUpvoted ? colors.primary : colors.textSecondary,
                    fontWeight: isUpvoted ? '600' : '400',
                  },
                ]}>
                {formatCount(optimisticUpvotes)}
              </Text>
            </TouchableOpacity>

            {canNest && user && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowReplyForm(!showReplyForm)}
                activeOpacity={0.7}>
                <Reply size={16} color={colors.textSecondary} />
                <Text style={[styles.actionText, {color: colors.textSecondary}]}>
                  Reply
                </Text>
              </TouchableOpacity>
            )}

            {isAuthor && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Comment',
                    'Are you sure you want to delete this comment?',
                    [
                      {text: 'Cancel', style: 'cancel'},
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          // TODO: Implement delete comment
                          console.log('Delete comment:', comment._id);
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.7}>
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.actionText, {color: colors.error}]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reply Form */}
          {showReplyForm && (
            <View style={styles.replyForm}>
              <CommentForm
                startupId={startupId}
                reelId={reelId}
                parentCommentId={comment._id}
                placeholder={`Reply to ${comment.author?.name}...`}
                onSuccess={handleReplySuccess}
              />
            </View>
          )}
        </View>
      </View>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              startupId={startupId}
              reelId={reelId}
              level={level + 1}
              onCommentAdded={onCommentAdded}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  commentContent: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  avatarContainer: {
    marginTop: SPACING.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentBody: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  separator: {
    fontSize: FONT_SIZES.caption,
  },
  timestamp: {
    fontSize: FONT_SIZES.caption,
  },
  content: {
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * 1.4,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.small,
  },
  actionText: {
    fontSize: FONT_SIZES.caption,
  },
  replyForm: {
    marginTop: SPACING.md,
  },
  replies: {
    marginTop: SPACING.sm,
  },
});