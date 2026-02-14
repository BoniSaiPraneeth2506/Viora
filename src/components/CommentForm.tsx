import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import {Send} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {createComment} from '../lib/write-client';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface CommentFormProps {
  startupId?: string;
  reelId?: string;
  parentCommentId?: string;
  onSuccess?: () => void;
  placeholder?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  startupId,
  reelId,
  parentCommentId,
  onSuccess,
  placeholder = 'Add a comment...',
}) => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add comments');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Empty Comment', 'Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({
        content: content.trim(),
        authorId: user._id,
        startupId,
        reelId,
        parentCommentId,
      });

      setContent('');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = content.length;
  const maxLength = 1000;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={[styles.formContainer, {borderColor: colors.border}]}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          value={content}
          onChangeText={setContent}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          maxLength={maxLength}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isSubmitting}
        />
        
        <View style={styles.footer}>
          <Text style={[styles.characterCount, {color: colors.textSecondary}]}>
            {characterCount}/{maxLength}
          </Text>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: content.trim() && !isSubmitting
                  ? colors.primary
                  : colors.border,
              },
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            activeOpacity={0.7}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Send size={16} color={COLORS.white} />
                <Text style={[styles.submitText, {color: COLORS.white}]}>
                  {parentCommentId ? 'Reply' : 'Comment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  formContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
  },
  textInput: {
    fontSize: FONT_SIZES.body,
    minHeight: 80,
    maxHeight: 120,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
    }),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  characterCount: {
    fontSize: FONT_SIZES.caption,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
  },
  submitText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
});