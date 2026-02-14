import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {X, Send} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {CommentItem} from './CommentItem';
import {Comment} from '../types';
import {sanityClient, urlFor} from '../lib/sanity';
import {COMMENTS_BY_REEL_QUERY} from '../lib/queries';
import {createComment} from '../lib/write-client';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  reelId: string;
  reelTitle: string;
  authorUsername?: string;
  onCommentCountChange?: (count: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  reelId,
  reelTitle,
  authorUsername,
  onCommentCountChange,
}) => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userAvatarError, setUserAvatarError] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible, reelId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsData = await sanityClient.fetch<Comment[]>(
        COMMENTS_BY_REEL_QUERY,
        {reelId}
      );
      setComments(commentsData || []);
      
      // Notify parent about comment count change
      if (onCommentCountChange) {
        onCommentCountChange(commentsData?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;

    setSubmitting(true);
    
    // Optimistically increment count immediately    
    const optimisticCount = (comments.length || 0) + 1;
    console.log('💬 Optimistically updating comment count to:', optimisticCount);
    if (onCommentCountChange) {
      onCommentCountChange(optimisticCount);
    }
    
    try {
      await createComment({
        content: commentText.trim(),
        authorId: user._id,
        reelId: reelId,
      });
      setCommentText('');
      console.log('💬 Comment created, fetching updated comments...');
      await fetchComments(); // This will update with actual count
    } catch (error) {
      console.error('❌ Error creating comment:', error);
      // Revert optimistic update on error
      if (onCommentCountChange) {
        onCommentCountChange(comments.length || 0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({item}: {item: Comment}) => (
    <CommentItem
      comment={item}
      reelId={reelId}
      onCommentAdded={fetchComments}
    />
  );

  const renderHeader = () => (
    <View style={[styles.header, {borderBottomColor: colors.border}]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Comments</Text>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <X size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
        No comments yet. Be the first to comment!
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.container, {backgroundColor: colors.background}]}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, {backgroundColor: colors.border}]} />
          </View>
          {renderHeader()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Comment Input */}
        {user && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={[styles.inputContainer, {borderTopColor: colors.border}]}>
              {user.image && !userAvatarError ? (
                <Image
                  source={{uri: urlFor(user.image).url()}}
                  style={styles.userAvatar}
                  onError={() => setUserAvatarError(true)}
                />
              ) : (
                <View style={[styles.userAvatar, styles.avatarPlaceholder, {backgroundColor: colors.card}]}>
                  <Text style={[styles.avatarText, {color: colors.textSecondary}]}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={authorUsername ? `Add a comment` : 'Add a comment...'}
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: commentText.trim() && !submitting ? colors.primary : colors.border,
                  },
                ]}>
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {!user && (
          <View style={[styles.signInPrompt, {backgroundColor: colors.card}]}>
            <Text style={[styles.signInText, {color: colors.textSecondary}]}>
              Sign in to add comments
            </Text>
          </View>
        )}
      </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '75%',
    borderTopLeftRadius: BORDER_RADIUS.pill,
    borderTopRightRadius: BORDER_RADIUS.pill,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
    position: 'relative',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  emptyState: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.bodySmall,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 0.5,
    gap: SPACING.sm,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 0.5,
    fontSize: FONT_SIZES.bodySmall,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrompt: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  signInText: {
    fontSize: FONT_SIZES.body,
  },
});
