import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {Eye, ImageOff} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {Startup} from '../types';
import {urlFor, formatCount, formatRelativeTime} from '../lib/sanity';
import {UpvoteButton} from './UpvoteButton';
import {BookmarkButton} from './BookmarkButton';
import {TagList} from './TagBadge';
import {COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES} from '../constants/theme';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;

interface StartupCardProps {
  startup: Startup;
}

const StartupCardComponent: React.FC<StartupCardProps> = ({startup}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handlePress = () => {
    navigation.navigate('StartupDetail', {id: startup._id} as never);
  };

  const handleAuthorPress = () => {
    navigation.navigate('Profile', {id: startup.author._id} as never);
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {backgroundColor: colors.background},
        SHADOWS.medium,
      ]}
      onPress={handlePress}
      activeOpacity={0.95}>
      
      {/* Draft Badge */}
      {startup.isDraft && (
        <View style={[styles.draftBadge, {backgroundColor: colors.warning}]}>
          <Text style={styles.draftText}>Draft</Text>
        </View>
      )}

      {/* Cover Image */}
      {(() => {
        const imageUrl = urlFor(startup.image).url();
        const hasValidImage = imageUrl && imageUrl.length > 0 && !imageError;

        if (!hasValidImage) {
          // Show placeholder for missing or failed images
          return (
            <View style={[styles.coverImage, styles.imagePlaceholder, {backgroundColor: colors.card}]}>
              <ImageOff size={48} color={colors.textSecondary} opacity={0.5} />
              <Text style={[styles.placeholderText, {color: colors.textSecondary}]}>
                No Image
              </Text>
            </View>
          );
        }

        return (
          <Image
            source={{uri: imageUrl}}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        );
      })()}

      {/* Content */}
      <View style={styles.content}>
        {/* Date and Stats Header */}
        <View style={styles.header}>
          <Text style={[styles.date, {color: colors.textSecondary}]}>
            {formatRelativeTime(startup._createdAt)}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.stat}>
              <Eye size={16} color={colors.textSecondary} />
              <Text style={[styles.statText, {color: colors.textSecondary}]}>
                {formatCount(startup.views || 0)}
              </Text>
            </View>
            <UpvoteButton
              startupId={startup._id}
              initialUpvotes={startup.upvotes || 0}
              upvotedBy={startup.upvotedBy}
              variant="ghost"
              size="small"
            />
          </View>
        </View>

        {/* Author & Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleContent}>
            <TouchableOpacity
              onPress={handleAuthorPress}
              activeOpacity={0.7}>
              <Text style={[styles.authorName, {color: colors.text}]} numberOfLines={1}>
                {startup.author.name}
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.title, {color: colors.text}]}
              numberOfLines={2}>
              {startup.title}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAuthorPress}
            activeOpacity={0.7}>
            {startup.author.image ? (
              <Image
                source={{uri: startup.author.image}}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: '#3B82F6'}]}>
                <Text style={styles.avatarText}>
                  {(startup.author.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text
          style={[styles.description, {color: colors.textSecondary}]}
          numberOfLines={2}>
          {startup.description}
        </Text>

        {/* Tags */}
        {startup.tags && startup.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <TagList tags={startup.tags} maxTags={3} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.category, {backgroundColor: colors.card}]}>
            <Text style={[styles.categoryText, {color: colors.primary}]}>
              {startup.category}
            </Text>
          </View>
          <BookmarkButton
            startupId={startup._id}
            variant="ghost"
            size="small"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Memoize for performance - only re-render if startup changes
export const StartupCard = React.memo(StartupCardComponent);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: BORDER_RADIUS.large,
    marginBottom: SPACING.lg,
    marginLeft: 4,
    overflow: 'hidden',
  },
  draftBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  draftText: {
    color: COLORS.light.background,
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  content: {
    paddingTop: SPACING.lg,
    paddingRight: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingLeft: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  date: {
    fontSize: FONT_SIZES.caption,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.caption,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  titleContent: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  authorName: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    lineHeight: FONT_SIZES.title * 1.3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.circle,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * 1.5,
    marginBottom: SPACING.md,
  },
  tagsContainer: {
    marginBottom: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
  },
  categoryText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
});
