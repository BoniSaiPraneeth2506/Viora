import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Share,
} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {CommentsModal} from './CommentsModal';
import {Reel} from '../types';
import {urlFor, formatCount, hasUserUpvoted} from '../lib/sanity';
import {handleReelUpvote, handleReelBookmark, trackReelView} from '../lib/interactions';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onUpdate?: (updates: Partial<Reel>) => void;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({reel, isActive, onUpdate}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user, updateUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();
  
  // Use videoUrl field from Sanity query
  const videoSource = reel.videoUrl || reel.video;
  
  // If no video source, return null or placeholder
  if (!videoSource) {
    console.warn('No video source for reel:', reel._id);
    return null;
  }
  
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    // Don't auto-play on mount - let isActive control playback
  });

  const [showControls, setShowControls] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(reel.upvotes || 0);
  const [commentCount, setCommentCount] = useState(reel.commentCount || 0);
  const [isUpvoted, setIsUpvoted] = useState(reel.hasUpvoted || false);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [viewTracked, setViewTracked] = useState(false); // Track if view has been counted

  // Sync state when reel data changes OR when user.savedReels changes
  useEffect(() => {
    setUpvoteCount(reel.upvotes || 0);
    setCommentCount(reel.commentCount || 0);
    setIsUpvoted(reel.hasUpvoted || false);
    setIsSaved(reel.isSaved || false);
    // Reduced logging to prevent spam
  }, [reel._id, reel.upvotes, reel.commentCount, reel.hasUpvoted, reel.isSaved]);

  // Also check if this reel is in user's savedReels array
  useEffect(() => {
    if (user?.savedReels) {
      const computedIsSaved = user.savedReels.some(s => s._ref === reel._id);
      if (computedIsSaved !== isSaved) {
        // Only log when state actually changes
        // console.log('🔄 Recomputing isSaved from user context:', reel._id, computedIsSaved);
        setIsSaved(computedIsSaved);
      }
    }
  }, [user?.savedReels, reel._id]);

  useEffect(() => {
    if (isActive && player) {
      // Small delay to ensure video is loaded before playing
      const playTimeout = setTimeout(() => {
        try {
          player.play();
          
          // Track view once when video starts playing (unique per user)
          if (!viewTracked && user?._id) {
            console.log('📹 Tracking view for reel:', reel._id);
            trackReelView(reel._id, user._id);
            setViewTracked(true);
          }
        } catch (error) {
          console.warn('Failed to play video:', reel._id, error);
        }
      }, 100);
      
      return () => clearTimeout(playTimeout);
    } else if (player) {
      player.pause();
    }
  }, [isActive, player, viewTracked, user?._id, reel._id]);

  const handlePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    setShowControls(true);
    setTimeout(() => setShowControls(false), 2000);
  };

  const handleMuteToggle = () => {
    player.muted = !player.muted;
  };

  const handleLike = async () => {
    if (!user) {
      navigation.navigate('Login' as never);
      return;
    }

    if (isUpvoting) return;

    // Optimistic update
    const previousUpvotes = upvoteCount;
    const previousIsUpvoted = isUpvoted;
    const newUpvotes = isUpvoted ? upvoteCount - 1 : upvoteCount + 1;
    const newIsUpvoted = !isUpvoted;
    
    setUpvoteCount(newUpvotes);
    setIsUpvoted(newIsUpvoted);
    setIsUpvoting(true);

    try {
      const result = await handleReelUpvote(reel._id, user._id, reel.upvotedBy);
      if (result) {
        // Update with server data - use computed fields from query
        setUpvoteCount(result.upvotes || 0);
        setIsUpvoted(result.hasUpvoted || false);
        
        // Notify parent to update reel list
        onUpdate?.({
          upvotes: result.upvotes || 0,
          hasUpvoted: result.hasUpvoted || false,
          upvotedBy: result.upvotedBy,
        });
      } else {
        // Revert on error
        setUpvoteCount(previousUpvotes);
        setIsUpvoted(previousIsUpvoted);
      }
    } catch (error) {
      // Revert on error
      setUpvoteCount(previousUpvotes);
      setIsUpvoted(previousIsUpvoted);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigation.navigate('Login' as never);
      return;
    }

    if (isSaving) return;

    // Optimistic update
    const previousIsSaved = isSaved;
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    setIsSaving(true);

    try {
      const result = await handleReelBookmark(
        reel._id,
        user._id,
        user.savedReels,
      );
      if (result) {
        // Update with fresh user data
        const actualIsSaved = result.savedReels?.some(s => s._ref === reel._id) || false;
        setIsSaved(actualIsSaved);
        
        // Update user context with new savedReels
        await updateUser({savedReels: result.savedReels});
        
        console.log('✅ Reel saved state:', actualIsSaved ? 'SAVED' : 'UNSAVED');
        console.log('📝 Updated savedReels:', result.savedReels?.map(r => r._ref));
        
        // Notify parent to update reel list with actual state
        onUpdate?.({
          isSaved: actualIsSaved,
        });
      } else {
        // Revert on error
        console.error('❌ Failed to save/unsave reel');
        setIsSaved(previousIsSaved);
      }
    } catch (error) {
      // Revert on error
      console.error('❌ Error saving reel:', error);
      setIsSaved(previousIsSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${reel.title} by @${reel.author.username} on Viora!`,
        title: reel.title,
      });
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };

  const handleAuthorPress = () => {
    // @ts-ignore - Dynamic navigation params
    navigation.navigate('Profile', {id: reel.author._id});
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handlePlayPause}>
      {/* Video */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Play/Pause Overlay */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          {!player.playing ? (
            <Play size={64} color="white" fill="white" />
          ) : (
            <Pause size={64} color="white" fill="white" />
          )}
        </View>
      )}

      {/* Right Side Actions */}
      <View style={[styles.rightActions, {bottom: insets.bottom + 160}]}>
        {/* Like */}
        <TouchableOpacity 
          onPress={handleLike} 
          style={styles.actionButton}
          disabled={isUpvoting}>
          {isUpvoting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Heart
              size={28}
              color={isUpvoted ? COLORS.light.error : 'white'}
              fill={isUpvoted ? COLORS.light.error : 'none'}
            />
          )}
          <Text style={styles.actionText}>{formatCount(upvoteCount)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          onPress={() => setShowComments(true)}
          style={styles.actionButton}>
          <MessageCircle size={28} color="white" />
          <Text style={styles.actionText}>
            {formatCount(commentCount)}
          </Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity 
          onPress={handleSave} 
          style={styles.actionButton}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Bookmark
              size={28}
              color={isSaved ? COLORS.light.warning : 'white'}
              fill={isSaved ? COLORS.light.warning : 'none'}
            />
          )}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
          <Share2 size={28} color="white" />
        </TouchableOpacity>

        {/* Mute/Unmute */}
        <TouchableOpacity onPress={handleMuteToggle} style={styles.actionButton}>
          {player.muted ? (
            <VolumeX size={28} color="white" />
          ) : (
            <Volume2 size={28} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={[styles.bottomInfo, {bottom: insets.bottom + 80}]}>
        <TouchableOpacity
          style={styles.authorContainer}
          onPress={handleAuthorPress}
          activeOpacity={0.7}>
          {reel.author.image ? (
            <Image
              source={{uri: reel.author.image}}
              style={styles.authorAvatar}
            />
          ) : (
            <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(reel.author.name || reel.author.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.authorName}>@{reel.author.username}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{reel.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {reel.description}
        </Text>
      </View>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        reelId={reel._id}
        reelTitle={reel.title}
        authorUsername={reel.author.username}
        onCommentCountChange={(newCount) => {
          console.log('💬 Comment count updated:', newCount);
          setCommentCount(newCount);
        }}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    gap: SPACING.xxl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 80,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  authorName: {
    color: 'white',
    fontSize: FONT_SIZES.body,
    fontWeight: 'bold',
  },
  title: {
    color: 'white',
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: 'white',
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: 20,
  },
});
