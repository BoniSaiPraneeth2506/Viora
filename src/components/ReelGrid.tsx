import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {Eye, Heart, MessageCircle, Play} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';
import {sanityClient} from '../lib/sanity';
import {
  REELS_BY_AUTHOR_QUERY,
  UPVOTED_REELS_BY_AUTHOR_QUERY,
  SAVED_REELS_BY_AUTHOR_QUERY,
} from '../lib/queries';
import {Reel} from '../types';
import {useAuth} from '../contexts/AuthContext';
import {sanityWriteClient} from '../lib/write-client';

// Module-level cache to persist data across mount/unmount cycles
const reelCache = new Map<string, Reel[]>();
// Flag to prevent multiple simultaneous patch operations
let isPatchingInProgress = false;

interface ReelGridProps {
  userId: string;
  contentType: 'posts' | 'upvoted' | 'saved';
  headerComponent?: React.ReactNode;
}

const {width} = Dimensions.get('window');
const ITEM_GAP = 2;
const ITEM_WIDTH = (width - ITEM_GAP * 2) / 3;
const ITEM_HEIGHT = ITEM_WIDTH * (16 / 9); // 9:16 aspect ratio

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

/**
 * Auto-patch reel thumbnails that are missing
 * @returns Promise<boolean> - true if thumbnails were patched, false if none needed patching
 */
const patchMissingThumbnails = async (reels: Reel[]): Promise<boolean> => {
  // Prevent multiple simultaneous patch operations
  if (isPatchingInProgress) {
    console.log('⏳ Patching already in progress, skipping...');
    return false;
  }

  const reelsWithoutThumbnails = reels.filter(
    reel => !reel.thumbnail && reel.videoUrl
  );
  
  if (reelsWithoutThumbnails.length === 0) {
    console.log('✅ All reels have thumbnails!');
    return false; // No patching needed
  }
  
  isPatchingInProgress = true;
  console.log(`🔧 Found ${reelsWithoutThumbnails.length} reels without thumbnails, patching...`);
  
  try {
    for (const reel of reelsWithoutThumbnails) {
      try {
        // Generate thumbnail from videoUrl
        let thumbnailUrl = reel.videoUrl;
        
        if (reel.videoUrl?.includes('cloudinary.com')) {
          thumbnailUrl = reel.videoUrl?.replace(
            '/upload/',
            '/upload/so_0.0,w_400,h_711,c_fill/'
          );
        }
        
        console.log(`📸 Patching reel ${reel._id} with thumbnail:`, thumbnailUrl);
        
        await sanityWriteClient
          .patch(reel._id)
          .set({thumbnail: thumbnailUrl})
          .commit();
        
        console.log(`✅ Patched reel ${reel._id}`);
      } catch (error) {
        console.error(`❌ Failed to patch reel ${reel._id}:`, error);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🎉 Thumbnail patching complete!');
    return true; // Patching was performed
  } catch (error) {
    console.error('❌ Thumbnail patching failed:', error);
    return false;
  } finally {
    isPatchingInProgress = false;
  }
};

const ReelGridItem: React.FC<{reel: Reel; onPress: () => void}> = React.memo(({reel, onPress}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [imageError, setImageError] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // Generate thumbnail from videoUrl if not provided (Cloudinary support)
  const getThumbnailUrl = () => {
    if (reel.thumbnail && !imageError) {
      return reel.thumbnail;
    }
    
    // Try to generate from videoUrl
    if (reel.videoUrl) {
      if (reel.videoUrl.includes('cloudinary.com')) {
        // Generate Cloudinary thumbnail
        const cloudinaryThumb = reel.videoUrl.replace('/upload/', '/upload/so_0.0,w_400,h_711,c_fill/');
        console.log('📸 Generated Cloudinary thumbnail for reel:', reel._id, cloudinaryThumb);
        return cloudinaryThumb;
      }
      // For non-Cloudinary URLs, return video URL (browser/Image handles it)
      return reel.videoUrl;
    }
    
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        // Show play icon briefly
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 200);
        // Navigate immediately
        onPress();
      }}
      activeOpacity={0.7}>
      {/* Thumbnail or Placeholder */}
      {thumbnailUrl && !imageError ? (
        <Image
          source={{uri: thumbnailUrl}}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => {
            console.error('🖼️ Image load error for reel:', reel._id, e.nativeEvent.error);
            setImageError(true);
          }}
        />
      ) : (
        <View style={[styles.placeholder, {backgroundColor: colors.border}]}>
          <Play size={32} color={colors.textSecondary} strokeWidth={2} />
        </View>
      )}

      {/* Gradient Overlay */}
      <View style={styles.gradient} />

      {/* Play Icon - only visible on click */}
      {showPlayIcon && (
        <View style={styles.playIconOverlayCenter}>
          <View style={styles.playIconCircle}>
            <Play 
              size={18} 
              color="#000" 
              fill="#000" 
              strokeWidth={0} 
              style={{marginLeft: 2}}
            />
          </View>
        </View>
      )}

      {/* Stats Overlay */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Eye size={14} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.statText}>
            {formatCount(reel.views ?? 0)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Heart size={14} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.statText}>
            {formatCount(reel.upvotes ?? 0)}
          </Text>
        </View>
        <View style={styles.stat}>
          <MessageCircle size={14} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.statText}>
            {formatCount(reel.commentCount ?? 0)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ReelGridComponent: React.FC<ReelGridProps> = ({userId, contentType, headerComponent}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const navigation = useNavigation();
  const {user} = useAuth();
  const cacheKey = `${userId}-${contentType}`;
  const cached = reelCache.get(cacheKey);

  const [reels, setReels] = useState<Reel[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);
  const previousSavedReelsRef = useRef<Array<{_ref: string}> | undefined>(user?.savedReels);

  // Watch for changes in user's savedReels and invalidate cache
  useEffect(() => {
    const currentSavedReels = user?.savedReels;
    const previousSavedReels = previousSavedReelsRef.current;
    
    if (currentSavedReels && previousSavedReels) {
      const currentIds = currentSavedReels.map(r => r._ref).sort().join(',');
      const previousIds = previousSavedReels.map(r => r._ref).sort().join(',');
      
      if (currentIds !== previousIds) {
        console.log('💾 Saved reels changed, clearing cache for:', cacheKey);
        reelCache.delete(cacheKey);
        fetchedRef.current = null;
        // Refetch if this is the saved content type
        if (contentType === 'saved') {
          fetchReels();
        }
      }
    }
    
    previousSavedReelsRef.current = currentSavedReels;
  }, [user?.savedReels, contentType, cacheKey]);

  useEffect(() => {
    // Skip fetch if we already have cached data for this key
    if (fetchedRef.current === cacheKey && reels.length > 0) return;
    if (cached && cached.length > 0) {
      fetchedRef.current = cacheKey;
      return;
    }
    fetchReels();
  }, [userId, contentType]);

  const fetchReels = async () => {
    console.log(`📹 Fetching ${contentType} reels for user:`, userId);
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
          query = REELS_BY_AUTHOR_QUERY;
          break;
        case 'upvoted':
          query = UPVOTED_REELS_BY_AUTHOR_QUERY;
          break;
        case 'saved':
          query = SAVED_REELS_BY_AUTHOR_QUERY;
          break;
      }

      const data = await sanityClient.fetch<Reel[]>(query, params);
      console.log(`✅ Fetched ${data.length} ${contentType} reels`);
      // Reduced logging to prevent spam
      
      // Auto-patch missing thumbnails in background (only refetch if patching was done)
      if (data.length > 0) {
        patchMissingThumbnails(data).then((wasPatched) => {
          if (wasPatched) {
            console.log('🔄 Thumbnails were patched, refreshing...');
            // Invalidate cache and refetch to show updated thumbnails
            reelCache.delete(cacheKey);
            fetchedRef.current = null;
            // Small delay then refetch
            setTimeout(() => {
              if (fetchedRef.current !== cacheKey) {
                fetchReels();
              }
            }, 1000);
          } else {
            console.log('ℹ️ No thumbnails needed patching, skipping refetch');
          }
        });
      }
      
      reelCache.set(cacheKey, data);
      fetchedRef.current = cacheKey;
      setReels(data);
    } catch (err) {
      console.error(`❌ Error fetching ${contentType} reels:`, err);
      setError('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleReelPress = (reelId: string) => {
    console.log('🎬 Navigating to reel:', reelId);
    // @ts-ignore - Navigation typing
    navigation.navigate('Main', {
      screen: 'Reels',
      params: {targetReelId: reelId, timestamp: Date.now()},
    });
  };

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
            onPress={fetchReels}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          {contentType === 'posts' && 'No reels yet'}
          {contentType === 'upvoted' && 'No upvoted reels yet'}
          {contentType === 'saved' && 'No saved reels yet'}
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={loading ? [] : reels}
      renderItem={({item}) => (
        <ReelGridItem reel={item} onPress={() => handleReelPress(item._id)} />
      )}
      keyExtractor={item => item._id}
      ListHeaderComponent={headerComponent ? () => <>{headerComponent}</> : undefined}
      ListEmptyComponent={renderEmpty}
      numColumns={3}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      removeClippedSubviews={true}
      initialNumToRender={9}
      maxToRenderPerBatch={9}
      windowSize={10}
      updateCellsBatchingPeriod={50}
    />
  );
};

// Memoize to prevent re-render when parent changes
export const ReelGrid = React.memo(ReelGridComponent);

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xxxl * 3,
  },
  row: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: BORDER_RADIUS.small,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  statsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  playIconOverlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
