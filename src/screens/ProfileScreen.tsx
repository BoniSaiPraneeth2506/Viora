import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {Edit, MessageCircle, FileQuestion, TrendingUp, MoreVertical, Settings, Info, User as UserIcon} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {NavBar} from '../components/NavBar';
import {BottomNav} from '../components/BottomNav';
import {ProfileTabs} from '../components/ProfileTabs';
import {Author} from '../types';
import {sanityClient} from '../lib/sanity';
import {AUTHOR_BY_ID_QUERY, USER_POSTS_COUNT_QUERY, CHECK_FOLLOW_STATUS_QUERY} from '../lib/queries';
import {sanityWriteClient} from '../lib/write-client';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SIZES, SHADOWS} from '../constants/theme';
import {RootStackParamList} from '../types/navigation';

type ProfileRouteParams = {
  Profile: {
    id: string;
  };
};

type NavigationProp = any; // Temporary fix for navigation typing

export const ProfileScreen: React.FC = () => {
  const route = useRoute<RouteProp<ProfileRouteParams, 'Profile'>>();
  const navigation = useNavigation<NavigationProp>();
  const {isDark} = useTheme();
  const {user: currentUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [profileUser, setProfileUser] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOwnProfile = currentUser?._id === (route.params?.id || currentUser?._id);
  const [showMenu, setShowMenu] = useState(false);

  // Move all callbacks and memos to top before any early returns
  const handleFollow = useCallback(async () => {
    // Prevent multiple simultaneous follow operations
    if (!currentUser?._id || !profileUser?._id || isProcessingFollow) {
      return;
    }

    // Store current states BEFORE any changes
    const originalFollowState = isFollowing;
    const originalFollowersCount = followersCount;
    const newFollowState = !isFollowing;

    // Clear any existing timeout
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }

    try {
      // Set loading state WITHOUT changing button text yet
      setIsProcessingFollow(true);
      setIsFollowLoading(true);

      // Database operation
      const performDatabaseUpdate = async () => {
        if (newFollowState) {
          // Follow operation
          await Promise.all([
            sanityWriteClient
              .patch(currentUser._id)
              .setIfMissing({following: []})
              .append('following', [{
                _type: 'reference', 
                _ref: profileUser._id, 
                _key: `follow-${profileUser._id}-${Date.now()}`
              }])
              .commit(),
            sanityWriteClient
              .patch(profileUser._id)
              .setIfMissing({followers: []})
              .append('followers', [{
                _type: 'reference', 
                _ref: currentUser._id, 
                _key: `follower-${currentUser._id}-${Date.now()}`
              }])
              .commit(),
          ]);
        } else {
          // Unfollow operation
          await Promise.all([
            sanityWriteClient
              .patch(currentUser._id)
              .unset([`following[_ref=="${profileUser._id}"]`])
              .commit(),
            sanityWriteClient
              .patch(profileUser._id)
              .unset([`followers[_ref=="${currentUser._id}"]`])
              .commit(),
          ]);
        }
      };

      // Perform database update
      await performDatabaseUpdate();

      // SUCCESS: Update UI state only after database operation completes
      setIsFollowing(newFollowState);
      setFollowersCount(prev => newFollowState ? prev + 1 : prev - 1);

    } catch (error) {
      console.error('Follow operation failed:', error);
      
      // KEEP ORIGINAL STATES on error
      Alert.alert(
        'Connection Issue', 
        `Unable to ${newFollowState ? 'follow' : 'unfollow'} ${profileUser?.username}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsFollowLoading(false);
      
      // Add a small delay before allowing next follow operation
      setTimeout(() => {
        setIsProcessingFollow(false);
      }, 200);
    }
  }, [currentUser, profileUser, isProcessingFollow, isFollowing, followersCount]);

  const handleFollowersPress = useCallback(() => {
    navigation.navigate('FollowList', {
      userId: profileUser?._id, 
      username: profileUser?.username,
      type: 'followers'
    });
  }, [navigation, profileUser?._id, profileUser?.username]);

  const handleFollowingPress = useCallback(() => {
    navigation.navigate('FollowList', {
      userId: profileUser?._id, 
      username: profileUser?.username, 
      type: 'following'
    });
  }, [navigation, profileUser?._id, profileUser?.username]);

  const handleMessagePress = useCallback(() => {
    // navigation.navigate('Messages' as never, {userId: profileUser?._id} as never);
  }, []);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile' as never);
  }, [navigation]);

  // Extract header component to pass to ProfileTabs for scrollable header
  // Memoize to prevent recreation on every render
  const profileHeader = useMemo(() => (
    <View style={[styles.header, {backgroundColor: colors.card}]}>
      {/* Top Section: Profile Pic + Stats + Kebab */}
      <View style={styles.topSection}>
        {/* Profile Picture */}
        <View style={styles.profilePicSection}>
          {profileUser?.image ? (
            <Image
              source={{uri: profileUser.image}}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: colors.primary}]}>
              <Text style={styles.avatarText}>
                {(profileUser?.name || profileUser?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          {/* Username row with kebab */}
          <View style={styles.usernameRow}>
            <Text style={[styles.username, {color: colors.text, flex: 1}]} numberOfLines={1}>
              {profileUser?.name}
            </Text>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.kebabBtn}
                onPress={() => setShowMenu(true)}
                activeOpacity={0.7}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <MoreVertical size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.text}]}>
                {postsCount}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                posts
              </Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
              <Text style={[styles.statValue, {color: colors.text}]}>
                {followersCount}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
              <Text style={[styles.statValue, {color: colors.text}]}>
                {followingCount}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                following
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bio Section */}
      {(profileUser?.username || profileUser?.bio) && (
        <View style={styles.bioSection}>
          {profileUser.username && (
            <Text style={[styles.displayName, {color: colors.text}]}>
              @{profileUser.username}
            </Text>
          )}
          {profileUser.bio && (
            <Text style={[styles.bio, {color: colors.text}]}>
              {profileUser.bio}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {isOwnProfile ? (
        <TouchableOpacity
          style={[styles.editButton, {borderColor: colors.border}]}
          onPress={handleEditProfile}
          activeOpacity={0.7}>
          <Text style={[styles.editButtonText, {color: colors.text}]}>
            Edit Profile
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowing ? colors.border : colors.primary,
                opacity: isProcessingFollow ? 0.8 : 1,
              },
            ]}
            onPress={handleFollow}
            disabled={isProcessingFollow}
            activeOpacity={0.8}>
            <View style={styles.followButtonContent}>
              {isFollowLoading ? (
                <ActivityIndicator 
                  size="small" 
                  color={isFollowing ? colors.text : '#FFFFFF'} 
                />
              ) : (
                <Text style={[
                  styles.followButtonText, 
                  {color: isFollowing ? colors.text : '#FFFFFF'}
                ]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.messageButton, {borderColor: colors.border}]}
            onPress={handleMessagePress}
            activeOpacity={0.7}>
            <Text style={[styles.messageButtonText, {color: colors.text}]}>
              Message
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Drafts & Stats Buttons - Only for own profile */}
      {isOwnProfile && (
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={[styles.headerButton, {backgroundColor: colors.card, borderColor: colors.border}]}
            onPress={() => {/* TODO: Handle draft navigation */}}
            activeOpacity={0.7}>
            <FileQuestion size={18} color={colors.text} />
            <Text style={[styles.headerButtonText, {color: colors.text}]}>
              Drafts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, {backgroundColor: colors.card, borderColor: colors.border}]}
            onPress={() => {/* TODO: Handle stats navigation */}}
            activeOpacity={0.7}>
            <TrendingUp size={18} color={colors.text} />
            <Text style={[styles.headerButtonText, {color: colors.text}]}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [
    colors.card, 
    colors.primary, 
    colors.text, 
    colors.textSecondary, 
    colors.border, 
    profileUser, 
    postsCount, 
    followersCount, 
    followingCount, 
    isOwnProfile, 
    isFollowing, 
    isProcessingFollow, 
    isFollowLoading,
    handleFollowersPress,
    handleFollowingPress,
    handleEditProfile,
    handleFollow,
    handleMessagePress,
    setShowMenu,
  ]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const userId = route.params?.id || currentUser?._id;
      if (!userId) return;

      const data = await sanityClient.fetch(AUTHOR_BY_ID_QUERY, {id: userId});
      
      // Only update state if this is still the current route (prevent race conditions)
      const currentUserId = route.params?.id || currentUser?._id;
      if (userId !== currentUserId) return;
      
      setProfileUser(data);
      
      // Set followers/following counts
      setFollowersCount(data.followers?.length || 0);
      setFollowingCount(data.following?.length || 0);
      
      // Check if current user is following this profile (only if not own profile)
      const isViewingOwnProfile = currentUser?._id === userId;
      if (!isViewingOwnProfile && currentUser?._id) {
        const followStatus = await sanityClient.fetch(CHECK_FOLLOW_STATUS_QUERY, {
          currentUserId: currentUser._id,
          targetUserId: userId
        });
        setIsFollowing(followStatus?.isFollowing || false);
      } else {
        setIsFollowing(false);
      }
      
      // Fetch user's own posts count (startups + reels)
      const countData = await sanityClient.fetch(USER_POSTS_COUNT_QUERY, {id: userId});
      setPostsCount(countData.totalCount);
      console.log(`📊 User posts count: ${countData.postsCount} startups + ${countData.reelsCount} reels = ${countData.totalCount} total`);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [route.params?.id, currentUser?._id]);

  useEffect(() => {
    // Clear previous profile data immediately when route changes to prevent stale data
    setProfileUser(null);
    setLoading(true);
    setIsFollowing(false);
    setFollowersCount(0);
    setFollowingCount(0);
    setPostsCount(0);
    
    fetchProfile();
  }, [route.params?.id, fetchProfile]);

  // Tab press listener - scroll to top when tapping active Profile tab (Instagram/TikTok UX)
  // Note: ProfileScreen uses complex nested scrolling (ProfileTabs > ContentTabs > Lists)
  // Future enhancement: Add ref forwarding to scroll components
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
      // For now, just detect the tap - scroll functionality needs component refactoring
      console.log('📍 Profile tab tapped while active');
      // TODO: Implement scroll to top when ProfileTabs/ContentTabs support refs
    });

    return unsubscribe;
  }, [navigation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <NavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <NavBar />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: colors.textSecondary}]}>
            User not found
          </Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />

      {/* ── Kebab dropdown menu ── */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuCard, {backgroundColor: isDark ? '#1C1C1E' : '#FFF'}]}> 
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                Alert.alert(
                  'About',
                  `${profileUser?.name || 'User'}\n@${profileUser?.username || ''}\n\n${profileUser?.bio || 'No bio yet.'}\n\nPosts: ${postsCount}  ·  Followers: ${followersCount}  ·  Following: ${followingCount}`,
                );
              }}>
              <Info size={20} color={colors.text} />
              <Text style={[styles.menuLabel, {color: colors.text}]}>About</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('Settings' as never);
              }}>
              <Settings size={20} color={colors.text} />
              <Text style={[styles.menuLabel, {color: colors.text}]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Profile Tabs with scrollable header */}
      <ProfileTabs
        isOwnProfile={isOwnProfile}
        userId={profileUser?._id || currentUser?._id || ''}
        headerComponent={profileHeader}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.body,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  profilePicSection: {
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  statsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: FONT_SIZES.title,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  bioSection: {
    marginBottom: SPACING.md,
  },
  displayName: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  bio: {
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: 18,
  },
  editButton: {
    width: '100%',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  followButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
    alignItems: 'center',
  },
  followButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followLoader: {
    marginRight: 6,
  },
  followButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    alignItems: 'center',
  },
  messageButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  headerButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  headerButtonText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: FONT_SIZES.bodySmall,
  },
  tabTextActive: {
    fontWeight: 'bold',
  },
  placeholderText: {
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
  },

  /* ── Kebab menu ── */
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kebabBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  menuCard: {
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});
