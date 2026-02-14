import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import {useFocusEffect, useRoute, RouteProp, useNavigation, useScrollToTop} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {NavBar} from '../components/NavBar';
import {BottomNav} from '../components/BottomNav';
import {ReelPlayer} from '../components/ReelPlayer';
import {Reel} from '../types';
import {sanityClient} from '../lib/sanity';
import {REELS_WITH_USER_QUERY, REELS_INFINITE_QUERY} from '../lib/queries';
import {COLORS} from '../constants/theme';
import {useAuth} from '../contexts/AuthContext';
import {CreateModalContext} from '../contexts/CreateModalContext';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export const ReelsScreen: React.FC = () => {
  const {isDark} = useTheme();
  const {user} = useAuth();
  const {openModal} = React.useContext(CreateModalContext);
  const route = useRoute<RouteProp<{params: {newReel?: any; timestamp?: number; scrollToTop?: boolean; scrollTimestamp?: number; targetReelId?: string}}, 'params'>>();
  const navigation = useNavigation();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToTarget = useRef(false);
  const isNavigatingToTarget = useRef(!!route.params?.targetReelId);
  const navigationCompleteTimestamp = useRef<number>(0); // Start true if navigating to target

  // Debug: Component lifecycle
  useEffect(() => {
    // Reduced logging
    return () => {
      // Component unmounted
    };
  }, []);

  // Handle new reel from navigation params
  useEffect(() => {
    if (route.params?.newReel && route.params?.timestamp) {
      console.log('✨ New reel received via navigation!');
      console.log('🎬 New reel:', route.params.newReel);
      // Prepend the new reel to the list
      setReels(prev => {
        // Avoid duplicates
        const exists = prev.some(r => r._id === route.params.newReel._id);
        if (exists) return prev;
        return [route.params.newReel, ...prev];
      });
      // Reset hasMoreReels since we have new content
      setHasMoreReels(true);
    }
  }, [route.params?.timestamp]);

  // Handle targetReelId from grid navigation - instant jump without scroll animation
  useEffect(() => {
    const targetId = route.params?.targetReelId;
    
    if (targetId && reels.length > 0 && !hasScrolledToTarget.current) {
      console.log('🎯 Target reel ID received:', targetId);
      
      // Find the index of the target reel
      const targetIndex = reels.findIndex(r => r._id === targetId);
      
      if (targetIndex !== -1) {
        console.log('📍 Instant navigation to target reel at index:', targetIndex);
        hasScrolledToTarget.current = true;
        isNavigatingToTarget.current = true;
        
        // STEP 1: Set currentIndex IMMEDIATELY - this is critical
        setCurrentIndex(targetIndex);
        
        // STEP 2: Instant scroll without any animation or delay
        // Use synchronous approach - no requestAnimationFrame delays
        const scrollNow = () => {
          if (flatListRef.current) {
            try {
              // INSTANT jump - no animation, no scroll effect
              flatListRef.current.scrollToIndex({
                index: targetIndex,
                animated: false, // Instant - no scroll animation
                viewPosition: 0,
              });
              console.log('✅ Instantly jumped to target reel at index:', targetIndex);
            } catch (error) {
              console.error('❌ scrollToIndex failed, using scrollToOffset:', error);
              // Fallback - also instant
              flatListRef.current.scrollToOffset({
                offset: targetIndex * SCREEN_HEIGHT,
                animated: false, // Instant
              });
            }
          }
          
          // STEP 3: Mark navigation complete and allow focus
          // Small delay to ensure render cycle completes
          navigationCompleteTimestamp.current = Date.now();
          setTimeout(() => {
            console.log('🏁 Navigation complete, ready for playback');
            isNavigatingToTarget.current = false;
          }, 100); // Minimal delay just for render
        };
        
        // Execute scroll immediately
        scrollNow();
        
      } else {
        console.warn('⚠️ Target reel not found:', targetId);
        isNavigatingToTarget.current = false;
      }
    } else if (!targetId) {
      // No target, clear navigation flag
      isNavigatingToTarget.current = false;
    }
  }, [route.params?.targetReelId, reels.length]);
  
  // Reset scroll flag when targetReelId changes (navigation params)
  useEffect(() => {
    if (route.params?.targetReelId) {
      console.log('🔄 New targetReelId detected, resetting navigation state');
      hasScrolledToTarget.current = false;
      isNavigatingToTarget.current = true;
    }
  }, [route.params?.targetReelId]);

  // Handle scroll-to-top from BottomNav (when tapping active tab)
  useEffect(() => {
    if (route.params?.scrollToTop && route.params?.scrollTimestamp) {
      console.log('🎬 ReelsScreen - Scroll-to-top triggered from BottomNav!');
      if (flatListRef.current) {
        console.log('🎬 ReelsScreen - Scrolling to top now...');
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: true,
        });
        setCurrentIndex(0);
      } else {
        console.log('🎬 ReelsScreen - ERROR: Ref is null!');
      }
    }
  }, [route.params?.scrollTimestamp]);

  // Debug: Log ref status
  useEffect(() => {
    console.log('🎬 ReelsScreen - FlatList ref status:', flatListRef.current ? 'ATTACHED' : 'NULL');
  }, [flatListRef.current]);

  // Scroll to top when tapping active Reels tab (Official React Navigation way)
  useScrollToTop(flatListRef as React.RefObject<any>);

  // Debug: Add manual tab press listener to see if events are firing
  useEffect(() => {
    console.log('🎬 ReelsScreen - Setting up tab press listener');
    const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
      console.log('🎬 ReelsScreen - TAB PRESSED! Event:', e);
      console.log('🎬 ReelsScreen - Current ref:', flatListRef.current);
      console.log('🎬 ReelsScreen - Current index:', currentIndex);
      
      // Try manual scroll as backup
      if (flatListRef.current) {
        console.log('🎬 ReelsScreen - Attempting manual scroll to top');
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: true,
        });
        setCurrentIndex(0);
      } else {
        console.log('🎬 ReelsScreen - ERROR: Ref is null!');
      }
    });

    return () => {
      console.log('🎬 ReelsScreen - Cleaning up tab press listener');
      unsubscribe();
    };
  }, [navigation, currentIndex]);

  useFocusEffect(
    useCallback(() => {
      // Check if we're navigating to a target reel at focus time
      if (isNavigatingToTarget.current) {
        console.log('⏸️ Screen focused but navigation in progress - delaying playback');
        
        // Wait for navigation to complete with faster polling
        let attempts = 0;
        const maxAttempts = 20; // Max 1 second (50ms * 20)
        
        const checkInterval = setInterval(() => {
          attempts++;
          
          if (!isNavigatingToTarget.current) {
            console.log('▶️ Navigation complete, enabling playback');
            setIsScreenFocused(true);
            clearInterval(checkInterval);
          } else if (attempts >= maxAttempts) {
            // Safety timeout - enable anyway after 1 second
            console.log('⚠️ Navigation taking too long, forcing enable');
            isNavigatingToTarget.current = false;
            setIsScreenFocused(true);
            clearInterval(checkInterval);
          }
        }, 50);
        
        return () => {
          clearInterval(checkInterval);
          setIsScreenFocused(false);
        };
      } else {
        // Normal focus behavior - no navigation pending
        console.log('▶️ Screen focused - playback enabled');
        setIsScreenFocused(true);
        
        return () => {
          console.log('⏸️ Screen unfocused - playback paused');
          setIsScreenFocused(false);
        };
      }
    }, [])
  );

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    console.log('🎬rels Fetching reels for user:', user?._id);
    
    try {
      const data = await sanityClient.fetch<Reel[]>(
        REELS_WITH_USER_QUERY,
        {userId: user?._id || null},
      );
      
      console.log('✅ Total', data.length, 'reels loaded');
      // Reduced logging to prevent spam
      
      setReels(data);
      setHasMoreReels(true); // Reset when fetching fresh data
      
      console.log('✅ Reels loaded successfully');
    } catch (error) {
      console.error('❌ Error loading reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReels = async () => {
    if (loadingMore || reels.length === 0 || !hasMoreReels) return;

    console.log('🔄 Loading more reels...');
    console.log('👤 User ID for load more:', user?._id);
    console.log('💾 Current savedReels for user:', user?.savedReels?.map(r => r._ref));
    setLoadingMore(true);
    try {
      const lastReel = reels[reels.length - 1];
      const params = {
        lastCreatedAt: lastReel._createdAt,
        userId: user?._id || null,
      };

      const newReels = await sanityClient.fetch<Reel[]>(
        REELS_INFINITE_QUERY,
        params,
      );
      
      console.log('➕ Loaded', newReels.length, 'more reels');
      console.log('💛 New reels saved states:', newReels.map(r => `${r._id}: ${r.isSaved ? 'SAVED' : 'NOT SAVED'}`));

      if (newReels.length > 0) {
        setReels(prev => [...prev, ...newReels]);
      } else {
        console.log('🏁 No more reels to load');
        setHasMoreReels(false);
      }
    } catch (error) {
      console.error('❌ Error loading more reels:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const handleReelUpdate = useCallback((reelId: string, updates: Partial<Reel>) => {
    console.log('🔄 Updating reel:', reelId, 'with:', updates);
    setReels(prev =>
      prev.map(reel => {
        if (reel._id === reelId) {
          const updated = {...reel, ...updates};
          console.log('✅ Updated reel state:', updated._id, 'isSaved:', updated.isSaved);
          return updated;
        }
        return reel;
      })
    );
  }, []);

  const renderItem = ({item, index}: {item: Reel; index: number}) => {
    // Extra safety: ensure we're at the right index and navigation is complete
    const shouldBeActive = 
      index === currentIndex && 
      isScreenFocused && 
      !isNavigatingToTarget.current &&
      (navigationCompleteTimestamp.current > 0 ? Date.now() - navigationCompleteTimestamp.current > 50 : true);
    
    return (
      <ReelPlayer 
        reel={item} 
        isActive={shouldBeActive}
        onUpdate={(updates) => handleReelUpdate(item._id, updates)}
      />
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    
    if (!hasMoreReels && reels.length > 0) {
      return (
        <View style={styles.endOfFeed}>
          <Text style={styles.endOfFeedText}>You've reached the end</Text>
          <Text style={styles.endOfFeedSubtext}>No more reels to show</Text>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: 'black'}]}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        overScrollMode="never"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={2}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={hasMoreReels ? loadMoreReels : undefined}
        onEndReachedThreshold={0.8}
        ListFooterComponent={renderFooter}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Handle scroll failure gracefully - instant retry
          console.warn('⚠️ ScrollToIndex failed, retrying instantly:', info);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false, // Instant retry
              viewPosition: 0,
            });
          }, 50);
        }}
        style={styles.flatList}
      />
      <View style={styles.topOverlay}>
        <NavBar />
      </View>
      <BottomNav onCreatePress={openModal} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: SCREEN_HEIGHT,
  },
  endOfFeed: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  endOfFeedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  endOfFeedSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
