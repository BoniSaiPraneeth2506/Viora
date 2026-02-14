import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {MessageSquare} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {CommentForm} from './CommentForm';
import {CommentItem} from './CommentItem';
import {Comment} from '../types';
import {sanityClient} from '../lib/sanity';
import {COMMENTS_BY_STARTUP_QUERY, COMMENTS_BY_REEL_QUERY} from '../lib/queries';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface CommentListProps {
  startupId?: string;
  reelId?: string;
}

export const CommentList: React.FC<CommentListProps> = ({startupId, reelId}) => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [startupId, reelId]);

  const fetchComments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let commentsData: Comment[] = [];
      if (startupId) {
        commentsData = await sanityClient.fetch<Comment[]>(
          COMMENTS_BY_STARTUP_QUERY,
          {startupId}
        );
      } else if (reelId) {
        commentsData = await sanityClient.fetch<Comment[]>(
          COMMENTS_BY_REEL_QUERY,
          {reelId}
        );
      }
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCommentAdded = () => {
    fetchComments(true);
  };

  const handleRefresh = () => {
    fetchComments(true);
  };

  const renderComment = ({item}: {item: Comment}) => (
    <CommentItem
      comment={item}
      startupId={startupId}
      reelId={reelId}
      onCommentAdded={handleCommentAdded}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <MessageSquare size={24} color={colors.primary} />
        <Text style={[styles.title, {color: colors.text}]}>
          Comments ({comments.length})
        </Text>
      </View>

      {/* Comment Form */}
      {user ? (
        <View style={styles.formSection}>
          <CommentForm
            startupId={startupId}
            reelId={reelId}
            onSuccess={handleCommentAdded}
            placeholder="What are your thoughts?"
          />
        </View>
      ) : (
        <View style={[styles.signInPrompt, {backgroundColor: colors.card}]}>
          <Text style={[styles.signInText, {color: colors.textSecondary}]}>
            Please sign in to add comments
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MessageSquare size={48} color={colors.border} />
      <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
        No comments yet. Be the first to comment!
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (loading && comments.length === 0) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading comments...
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {loading && comments.length === 0 ? (
        renderFooter()
      ) : comments.length === 0 ? (
        renderEmptyState()
      ) : (
        <View>
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              startupId={startupId}
              reelId={reelId}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
  },
  formSection: {
    marginBottom: SPACING.lg,
  },
  signInPrompt: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  signInText: {
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  loadingText: {
    fontSize: FONT_SIZES.body,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});