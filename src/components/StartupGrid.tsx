import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {Eye, Heart, MessageCircle} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';
import {sanityClient} from '../lib/sanity';
import {
  STARTUPS_BY_AUTHOR_QUERY,
  UPVOTED_STARTUPS_BY_AUTHOR_QUERY,
  SAVED_STARTUPS_BY_AUTHOR_QUERY,
} from '../lib/queries';
import {Startup} from '../types';
import {useAuth} from '../contexts/AuthContext';

interface StartupGridProps {
  userId: string;
  contentType: 'posts' | 'upvoted' | 'saved';
}

const {width} = Dimensions.get('window');
const ITEM_GAP = 12;
const ITEM_WIDTH = (width - SPACING.lg * 2 - ITEM_GAP) / 2;

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const StartupGridItem: React.FC<{startup: Startup; onPress: () => void}> = ({
  startup,
  onPress,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <TouchableOpacity
      style={[styles.itemContainer, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.9}>
      {/* Image */}
      {startup.image ? (
        <Image
          source={{uri: startup.image}}
          style={styles.startupImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholderImage, {backgroundColor: colors.border}]}>
          <Text style={[styles.placeholderText, {color: colors.textSecondary}]}>
            {startup.title.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Category Badge */}
        {startup.category && (
          <View
            style={[styles.categoryBadge, {backgroundColor: colors.primary + '20'}]}>
            <Text
              style={[
                styles.categoryText,
                {color: colors.primary},
              ]}>
              {startup.category}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text
          style={[styles.title, {color: colors.text}]}
          numberOfLines={2}>
          {startup.title}
        </Text>

        {/* Description */}
        <Text
          style={[styles.description, {color: colors.textSecondary}]}
          numberOfLines={2}>
          {startup.description}
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Eye size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.statText, {color: colors.textSecondary}]}>
              {formatCount(startup.views ?? 0)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Heart size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.statText, {color: colors.textSecondary}]}>
              {formatCount(startup.upvotes ?? 0)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const StartupGrid: React.FC<StartupGridProps> = ({
  userId,
  contentType,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const navigation = useNavigation();
  const {user} = useAuth();

  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStartups();
  }, [userId, contentType]);

  const fetchStartups = async () => {
    console.log(`📥 Fetching ${contentType} startups for user:`, userId);
    setLoading(true);
    setError(null);

    try {
      let query = '';
      let params: any = {id: userId};

      // Add current user ID for hasUpvoted/isSaved flags
      if (user?._id) {
        params.userId = user._id;
      }

      switch (contentType) {
        case 'posts':
          query = STARTUPS_BY_AUTHOR_QUERY;
          break;
        case 'upvoted':
          query = UPVOTED_STARTUPS_BY_AUTHOR_QUERY;
          break;
        case 'saved':
          query = SAVED_STARTUPS_BY_AUTHOR_QUERY;
          break;
      }

      const data = await sanityClient.fetch<Startup[]>(query, params);
      console.log(`✅ Fetched ${data.length} ${contentType} startups`);
      setStartups(data);
    } catch (err) {
      console.error(`❌ Error fetching ${contentType} startups:`, err);
      setError('Failed to load startups');
    } finally {
      setLoading(false);
    }
  };

  const handleStartupPress = (startup: Startup) => {
    navigation.navigate('StartupDetail' as never, {id: startup._id} as never);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, {color: colors.error}]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, {backgroundColor: colors.primary}]}
          onPress={fetchStartups}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!startups || startups.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          {contentType === 'posts' && 'No posts yet'}
          {contentType === 'upvoted' && 'No upvoted posts yet'}
          {contentType === 'saved' && 'No saved posts yet'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={startups}
      renderItem={({item}) => (
        <StartupGridItem startup={item} onPress={() => handleStartupPress(item)} />
      )}
      keyExtractor={item => item._id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  row: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startupImage: {
    width: '100%',
    height: ITEM_WIDTH * 0.6,
  },
  placeholderImage: {
    width: '100%',
    height: ITEM_WIDTH * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: SPACING.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.small,
    marginBottom: SPACING.xs,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 12,
    marginBottom: SPACING.sm,
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
  },
  errorText: {
    fontSize: FONT_SIZES.body,
    marginBottom: SPACING.md,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});
