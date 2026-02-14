import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useRoute, RouteProp, useNavigation, useScrollToTop} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {NavBar} from '../components/NavBar';
import {BottomNav} from '../components/BottomNav';
import {CreateModalContext} from '../contexts/CreateModalContext';
import {StartupCard} from '../components/StartupCard';
import {SearchBar} from '../components/SearchBar';
import {SortSelect} from '../components/SortSelect';
import {Startup, SortOption} from '../types';
import {sanityClient, getWeekAgoDate} from '../lib/sanity';
import {
  STARTUPS_QUERY_PAGINATED,
  STARTUPS_BY_VIEWS_QUERY_PAGINATED,
  STARTUPS_BY_UPVOTES_QUERY_PAGINATED,
  STARTUPS_TRENDING_QUERY,
} from '../lib/queries';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

const PAGE_SIZE = 12;

export const HomeScreen: React.FC = () => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const {openModal} = React.useContext(CreateModalContext);
  const route = useRoute<RouteProp<{params: {newPost?: any; timestamp?: number; scrollToTop?: boolean; scrollTimestamp?: number}}, 'params'>>();
  const navigation = useNavigation();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [allStartups, setAllStartups] = useState<Startup[]>([]); // Cache all fetched startups
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [offset, setOffset] = useState(0);
  
  const isFetchingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Memoize list content style for stability
  const listContentStyle = useMemo(() => ({
    paddingBottom: 80,
  }), []);

  // High-performance search - Instagram/TikTok style (NO LOGS IN LOOPS)
  const filterStartupsLocally = useCallback((startups: Startup[], query: string) => {
    // Trim once at the start
    const trimmedQuery = query.trim();
    
    // Early return for empty query - instant!
    if (!trimmedQuery) {
      return startups;
    }
    
    // Pre-process search terms once (not per item)
    const lowerQuery = trimmedQuery.toLowerCase();
    const searchTerms = lowerQuery.split(/\s+/).map(term => term.replace(/\s+/g, ''));
    
    // Fast filter with minimal operations
    return startups.filter(startup => {
      // Pre-build searchable text once per item (only what we need)
      const text = (
        (startup.title || '') +
        (startup.category || '') +
        (startup.author?.name || '') +
        (startup.description || '')
      ).toLowerCase().replace(/\s+/g, '');
      
      // Check all terms exist (fastest check)
      return searchTerms.every(term => text.includes(term));
    });
  }, []);

  // INSTANT SEARCH with useMemo - no debounce, no lag!
  const displayedStartups = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    // Super fast path for empty search - skip filter entirely
    if (!trimmedQuery) {
      return allStartups;
    }
    return filterStartupsLocally(allStartups, searchQuery);
  }, [allStartups, searchQuery, filterStartupsLocally]);

  // Memoize search mode check to prevent unnecessary re-renders
  const isSearching = useMemo(() => {
    return searchQuery.trim().length > 0;
  }, [searchQuery]);

  // Handle new post from navigation params
  useEffect(() => {
    if (route.params?.newPost && route.params?.timestamp) {
      console.log('✨ New post received via navigation!');
      console.log('📄 New post:', route.params.newPost);
      // Prepend the new post to cache
      setAllStartups(prev => {
        const exists = prev.some(s => s._id === route.params.newPost._id);
        if (exists) return prev;
        return [route.params.newPost, ...prev];
      });
    }
  }, [route.params?.timestamp]);

  // Handle scroll-to-top from BottomNav (when tapping active tab)
  useEffect(() => {
    if (route.params?.scrollToTop && route.params?.scrollTimestamp) {
      console.log('🏠 HomeScreen - Scroll-to-top triggered from BottomNav!');
      if (flatListRef.current) {
        console.log('🏠 HomeScreen - Scrolling to top now...');
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: true,
        });
      } else {
        console.log('🏠 HomeScreen - ERROR: Ref is null!');
      }
    }
  }, [route.params?.scrollTimestamp]);

  // Debug: Log ref status
  useEffect(() => {
    console.log('🏠 HomeScreen - FlatList ref status:', flatListRef.current ? 'ATTACHED' : 'NULL');
  }, [flatListRef.current]);

  // Scroll to top when tapping active Home tab (Official React Navigation way)
  useScrollToTop(flatListRef as React.RefObject<any>);

  // Debug: Add manual tab press listener to see if events are firing
  useEffect(() => {
    console.log('🏠 HomeScreen - Setting up tab press listener');
    const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
      console.log('🏠 HomeScreen - TAB PRESSED! Event:', e);
      console.log('🏠 HomeScreen - Current ref:', flatListRef.current);
      
      // Try manual scroll as backup
      if (flatListRef.current) {
        console.log('🏠 HomeScreen - Attempting manual scroll to top');
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: true,
        });
      } else {
        console.log('🏠 HomeScreen - ERROR: Ref is null!');
      }
    });

    return () => {
      console.log('🏠 HomeScreen - Cleaning up tab press listener');
      unsubscribe();
    };
  }, [navigation]);

  const fetchStartups = async (
    currentOffset: number = 0,
    isReset: boolean = false,
    sortOption: SortOption = sortBy,
  ) => {
    if (isFetchingRef.current) {
      console.log('⏭️ Already fetching, skipping...');
      return;
    }
    
    console.log('🏠 Fetching startups...', {sortBy: sortOption, offset: currentOffset});
    
    isFetchingRef.current = true;
    
    try {
      const params: any = {
        offset: currentOffset,
        limit: currentOffset + PAGE_SIZE,
        search: '', // Always empty - we filter locally
        userId: user?._id || null,
      };

      let query = STARTUPS_QUERY_PAGINATED;
      
      // Select query based on sort option
      switch (sortOption) {
        case 'views':
          query = STARTUPS_BY_VIEWS_QUERY_PAGINATED;
          break;
        case 'upvotes':
          query = STARTUPS_BY_UPVOTES_QUERY_PAGINATED;
          break;
        case 'trending':
          query = STARTUPS_TRENDING_QUERY;
          params.weekAgo = getWeekAgoDate();
          break;
        default:
          query = STARTUPS_QUERY_PAGINATED;
      }
      
      console.log('🔍 Executing query:', sortOption);
      console.log('📝 Query params:', params);

      const data = await sanityClient.fetch<Startup[]>(query, params);
      
      console.log('✅ Fetched', data.length, 'startups');

      if (isReset) {
        setAllStartups(data);
        console.log('🔄 Reset with', data.length, 'total');
        setOffset(PAGE_SIZE);
      } else {
        setAllStartups(prev => [...prev, ...data]);
        console.log('➕ Added', data.length, 'more startups');
        setOffset(prev => prev + PAGE_SIZE);
      }

      setHasMore(data.length === PAGE_SIZE);
      
      console.log('✅ Home screen loaded successfully');
    } catch (error) {
      console.error('❌ Error loading home screen data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Fetch initial data and on sort change
  useEffect(() => {
    setLoading(true);
    fetchStartups(0, true, sortBy);
  }, [sortBy]);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchStartups(0, true, sortBy);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading && !isFetchingRef.current) {
      setLoadingMore(true);
      fetchStartups(offset, false, sortBy);
    }
  };

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    // Instant update with no batching
    setSearchQuery(text);
  }, []);

  const renderFilterBar = useCallback(() => (
    <View style={[styles.filterBar, {backgroundColor: colors.background}]}>
      {isSearching ? (
        <View style={styles.searchResultsHeader}>
          <Text style={[styles.searchResultsText, {color: colors.textSecondary}]}>
            Search results for
          </Text>
          <Text style={[styles.searchQueryText, {color: colors.text}]} numberOfLines={1}>
            "{searchQuery.trim()}"
          </Text>
        </View>
      ) : (
        <Text style={[styles.filterTitle, {color: colors.text}]}>
          All Startups
        </Text>
      )}
      
      <SortSelect value={sortBy} onValueChange={handleSortChange} />
    </View>
  ), [sortBy, colors.background, colors.text, colors.textSecondary, isSearching, searchQuery, handleSortChange]);

  const renderItem = useCallback(({item}: {item: Startup}) => (
    <View style={styles.cardContainer}>
      <StartupCard startup={item} />
    </View>
  ), []);

  const keyExtractor = useCallback((item: Startup) => item._id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors.primary]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
        {isSearching 
          ? `No results found for "${searchQuery.trim()}"` 
          : 'No startups found'}
      </Text>
    </View>
  ), [isSearching, searchQuery, colors.textSecondary]);

  if (loading && displayedStartups.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <NavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <BottomNav onCreatePress={openModal} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      
      {/* Search Bar - Outside FlatList to prevent keyboard dismissal */}
      <View style={[styles.modernHeader, {backgroundColor: colors.background}]}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            placeholder="Search startups..."
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={displayedStartups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={displayedStartups.length}
        ListHeaderComponent={renderFilterBar}
        ListFooterComponent={renderFooter}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        // Performance optimizations (Instagram/TikTok style)
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={6}
      />
      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 80, // Space for bottom nav
  },
  modernHeader: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  searchContainer: {
    paddingHorizontal: SPACING.xs,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
  },
  filterTitle: {
    fontSize: FONT_SIZES.subHeading,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  searchResultsHeader: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  searchResultsText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchQueryText: {
    fontSize: FONT_SIZES.subHeading,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardContainer: {
    alignItems: 'center',
  },
  emptyContainer: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
});

