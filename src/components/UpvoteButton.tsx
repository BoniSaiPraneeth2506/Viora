import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, View} from 'react-native';
import {ThumbsUp} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {handleStartupUpvote} from '../lib/interactions';
import {hasUserUpvoted, formatCount} from '../lib/sanity';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface UpvoteButtonProps {
  startupId: string;
  initialUpvotes: number;
  upvotedBy?: Array<{_ref: string}>;
  onUpdate?: (newUpvotes: number) => void;
  onSuccess?: () => void;
  variant?: 'default' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}

export const UpvoteButton: React.FC<UpvoteButtonProps> = ({
  startupId,
  initialUpvotes,
  upvotedBy,
  onUpdate,
  onSuccess,
  variant = 'default',
  size = 'medium',
}) => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [upvotes, setUpvotes] = useState(initialUpvotes || 0);
  const [isUpvoted, setIsUpvoted] = useState(
    user ? hasUserUpvoted(upvotedBy, user._id) : false
  );
  const [loading, setLoading] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setUpvotes(initialUpvotes || 0);
  }, [initialUpvotes]);

  useEffect(() => {
    setIsUpvoted(user ? hasUserUpvoted(upvotedBy, user._id) : false);
  }, [upvotedBy, user?._id]);

  const handlePress = async () => {
    if (!user) {
      // TODO: Show login prompt
      return;
    }

    if (loading) return;

    // Optimistic update
    const previousUpvotes = upvotes;
    const previousIsUpvoted = isUpvoted;
    const newUpvotes = isUpvoted ? upvotes - 1 : upvotes + 1;
    const newIsUpvoted = !isUpvoted;
    
    setUpvotes(newUpvotes);
    setIsUpvoted(newIsUpvoted);
    onUpdate?.(newUpvotes);

    setLoading(true);
    try {
      const updated = await handleStartupUpvote(startupId, user._id, upvotedBy);

      if (updated) {
        setUpvotes(updated.upvotes || 0);
        setIsUpvoted(
          user ? hasUserUpvoted(updated.upvotedBy, user._id) : false
        );
        onUpdate?.(updated.upvotes || 0);
        onSuccess?.();
      } else {
        // Revert on error
        setUpvotes(previousUpvotes);
        setIsUpvoted(previousIsUpvoted);
        onUpdate?.(previousUpvotes);
      }
    } catch (error) {
      // Revert on error
      setUpvotes(previousUpvotes);
      setIsUpvoted(previousIsUpvoted);
      onUpdate?.(previousUpvotes);
      console.error('Error upvoting:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (variant === 'default') {
      baseStyle.push(
        isUpvoted
          ? [styles.buttonDefault, {backgroundColor: colors.primary}]
          : [styles.buttonDefault, {backgroundColor: colors.card}]
      );
    } else {
      baseStyle.push(styles.buttonGhost);
    }

    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    }

    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const getTextStyle = () => {
    return [
      styles.text,
      {
        color: variant === 'default' && isUpvoted ? '#fff' : colors.text,
        fontSize: size === 'small' ? FONT_SIZES.caption : FONT_SIZES.bodySmall,
      },
    ];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' && isUpvoted ? '#fff' : colors.primary}
        />
      ) : (
        <>
          <ThumbsUp
            size={getIconSize()}
            color={variant === 'default' && isUpvoted ? '#fff' : colors.primary}
            fill={isUpvoted ? (variant === 'default' ? '#fff' : colors.primary) : 'none'}
          />
          <Text style={getTextStyle()}>{formatCount(upvotes)}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  buttonDefault: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
  },
  buttonGhost: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  buttonSmall: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  buttonLarge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  text: {
    fontWeight: '600',
  },
});
