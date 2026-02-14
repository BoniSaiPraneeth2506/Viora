import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {Bookmark} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {handleStartupBookmark} from '../lib/interactions';
import {hasUserSaved} from '../lib/sanity';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface BookmarkButtonProps {
  startupId: string;
  onUpdate?: (isSaved: boolean) => void;
  onSuccess?: () => void;
  variant?: 'default' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  startupId,
  onUpdate,
  onSuccess,
  variant = 'ghost',
  size = 'medium',
  showLabel = false,
}) => {
  const {isDark} = useTheme();
  const {user, updateUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(
    user ? hasUserSaved(user.savedStartups, startupId) : false
  );

  // Sync state when user data changes
  useEffect(() => {
    setIsSaved(user ? hasUserSaved(user.savedStartups, startupId) : false);
  }, [user?.savedStartups, startupId]);

  const handlePress = async () => {
    if (!user) {
      // TODO: Show login prompt
      return;
    }

    if (loading) return;

    // Optimistic update
    const previousIsSaved = isSaved;
    setIsSaved(!isSaved);
    onUpdate?.(!isSaved);

    setLoading(true);
    try {
      const updated = await handleStartupBookmark(
        startupId,
        user._id,
        user.savedStartups,
      );

      if (updated) {
        const newIsSaved = hasUserSaved(updated.savedStartups, startupId);
        setIsSaved(newIsSaved);
        onUpdate?.(newIsSaved);
        
        // Update user context with new savedStartups
        await updateUser({savedStartups: updated.savedStartups});
        
        onSuccess?.();
      } else {
        // Revert on error
        setIsSaved(previousIsSaved);
        onUpdate?.(previousIsSaved);
      }
    } catch (error) {
      // Revert on error
      setIsSaved(previousIsSaved);
      onUpdate?.(previousIsSaved);
      console.error('Error bookmarking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    if (variant === 'default') {
      baseStyle.push(
        isSaved
          ? [styles.buttonDefault, {backgroundColor: colors.warning}]
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

  const getIconColor = () => {
    if (variant === 'default' && isSaved) {
      return '#fff';
    }
    return colors.warning;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          <Bookmark
            size={getIconSize()}
            color={getIconColor()}
            fill={isSaved ? getIconColor() : 'none'}
          />
          {showLabel && (
            <Text
              style={[
                styles.text,
                {
                  color:
                    variant === 'default' && isSaved ? '#fff' : colors.text,
                  fontSize:
                    size === 'small' ? FONT_SIZES.caption : FONT_SIZES.bodySmall,
                },
              ]}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          )}
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
