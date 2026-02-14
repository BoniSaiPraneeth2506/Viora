import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
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
import {StartupCard} from './StartupCard';

// Module-level cache to persist data across mount/unmount cycles
const startupCache = new Map<string, Startup[]>();

interface StartupListProps {
  userId: string;
  contentType: 'posts' | 'upvoted' | 'saved';
  headerComponent?: React.ReactNode;
}

const StartupListComponent: React.FC<StartupListProps> = ({
  userId,
  contentType,
  headerComponent,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const {user} = useAuth();
  const cacheKey = `${userId}-${contentType}`;
  const cached = startupCache.get(cacheKey);

  const [startups, setStartups] = useState<Startup[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip fetch if we already have cached data for this key
    if (fetchedRef.current === cacheKey && startups.length > 0) return;
    if (cached && cached.length > 0) {
      fetchedRef.current = cacheKey;
      return;
    }
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
      startupCache.set(cacheKey, data);
      fetchedRef.current = cacheKey;
      setStartups(data);
    } catch (err) {
      console.error(`❌ Error fetching ${contentType} startups:`, err);
      setError('Failed to load startups');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({item}: {item: Startup}) => (
    <View style={styles.cardWrapper}>
      <StartupCard startup={item} />
    </View>
  );

  const renderEmpty = () => {
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
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          {contentType === 'posts' && 'No posts yet'}
          {contentType === 'upvoted' && 'No upvoted posts yet'}
          {contentType === 'saved' && 'No saved posts yet'}
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={loading ? [] : startups}
      renderItem={renderItem}
      keyExtractor={item => item._id}
      ListHeaderComponent={headerComponent ? () => <>{headerComponent}</> : undefined}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      removeClippedSubviews={true}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={10}
      updateCellsBatchingPeriod={50}
    />
  );
};

// Memoize to prevent re-render when parent changes
export const StartupList = React.memo(StartupListComponent);

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: SPACING.xxxl * 3,
    flexGrow: 1,
  },
  cardWrapper: {
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.sm,
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
