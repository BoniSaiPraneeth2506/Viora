import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {ChevronLeft, Search, MessageSquare} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {Author} from '../types';
import {sanityClient} from '../lib/sanity';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

type TabType = 'followers' | 'following';

type FollowListRouteParams = {
  FollowList: {
    userId: string;
    username: string;
    initialTab?: TabType;
  };
};

export const FollowListScreen: React.FC = () => {
  const route = useRoute<RouteProp<FollowListRouteParams, 'FollowList'>>();
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user: currentUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const {userId, username, initialTab = 'followers'} = route.params || {};
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<Author[]>([]);
  const [following, setFollowing] = useState<Author[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<Author[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<Author[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Tab animation setup
  const slideAnimation = useState(new Animated.Value(activeTab === 'followers' ? 0 : 1))[0];
  const panRef = useRef<any>(null);
  const isHorizontalGesture = useRef(false);

  // Main tabs
  const mainTabs = [
    {id: 'followers' as TabType, label: 'Followers'},
    {id: 'following' as TabType, label: 'Following'},
  ];

  // Pan Responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Detect horizontal swipe very early (2px threshold)
        if (absDx > 2 && absDx > absDy) {
          isHorizontalGesture.current = true;
          setScrollEnabled(false); // Disable FlatList scroll
          return true;
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Aggressively capture horizontal swipes
        if (absDx > 8 && absDx > absDy) {
          isHorizontalGesture.current = true;
          setScrollEnabled(false);
          return true;
        }
        return false;
      },
      onPanResponderGrant: (_, gestureState) => {
        isHorizontalGesture.current = false;
        console.log('Gesture granted at dx:', gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Keep scroll disabled if horizontal gesture continues
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        if (absDx > absDy && absDx > 5) {
          isHorizontalGesture.current = true;
          setScrollEnabled(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Re-enable scrolling
        setScrollEnabled(true);
        
        if (isAnimating) {
          isHorizontalGesture.current = false;
          return;
        }

        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;
        const threshold = 25; // Lower threshold
        const velocityThreshold = 0.2;

        console.log('🔥 Swipe release:', {
          distance: swipeDistance.toFixed(2),
          velocity: swipeVelocity.toFixed(2),
          activeTab,
          isHorizontal: isHorizontalGesture.current,
        });

        // Only process if it was a horizontal gesture
        if (!isHorizontalGesture.current) {
          console.log('❌ Not a horizontal gesture');
          isHorizontalGesture.current = false;
          return;
        }

        // Check if swipe is strong enough
        const isStrongSwipe = Math.abs(swipeDistance) > threshold || Math.abs(swipeVelocity) > velocityThreshold;
        
        if (!isStrongSwipe) {
          console.log('❌ Swipe not strong enough');
          isHorizontalGesture.current = false;
          return;
        }

        // Toggle between tabs
        if (activeTab === 'followers') {
          console.log('✅ Switching from Followers to Following');
          handleTabPress('following');
        } else {
          console.log('✅ Switching from Following to Followers');
          handleTabPress('followers');
        }
        
        isHorizontalGesture.current = false;
      },
      onPanResponderTerminate: () => {
        console.log('Gesture terminated');
        setScrollEnabled(true);
        isHorizontalGesture.current = false;
      },
    })
  ).current;

  useEffect(() => {
    fetchData();
  }, [userId]);

  useEffect(() => {
    filterData();
  }, [searchQuery, followers, following]);

  // Initialize slide position
  useEffect(() => {
    const tabIndex = mainTabs.findIndex(tab => tab.id === activeTab);
    if (tabIndex !== -1) {
      slideAnimation.setValue(tabIndex);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching follow data for user:', userId);
      
      // Fetch followers and following in parallel
      const [followersData, followingData] = await Promise.all([
        fetchFollowers(),
        fetchFollowing()
      ]);

      setFollowers(followersData);
      setFollowing(followingData);
    } catch (error) {
      console.error('❌ Error fetching follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async (): Promise<Author[]> => {
    console.log('📞 Fetching followers for user:', userId);
    const query = `*[_type == "author" && $userId in following[]._ref]{
      _id,
      name,
      username,
      image,
      bio
    }`;
    
    const result = await sanityClient.fetch(query, {userId});
    console.log(`✅ Found ${result?.length || 0} followers`);
    return result || [];
  };

  const fetchFollowing = async (): Promise<Author[]> => {
    console.log('📞 Fetching following for user:', userId);
    const query = `*[_type == "author" && _id == $userId][0].following[]->{
      _id,
      name,
      username,
      image,
      bio
    }`;
    
    const result = await sanityClient.fetch(query, {userId});
    // Result might be null if user has no following, so handle it
    const following = result || [];
    console.log(`✅ Found ${following.length} following`);
    return following;
  };

  const filterData = () => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredFollowers(followers);
      setFilteredFollowing(following);
      return;
    }

    setFilteredFollowers(
      followers.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      )
    );

    setFilteredFollowing(
      following.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      )
    );
  };

  const handleTabPress = (tabId: TabType) => {
    if (tabId === activeTab || isAnimating) return;
    
    const tabIndex = mainTabs.findIndex(tab => tab.id === tabId);
    
    setIsAnimating(true);
    
    // Stop any existing animation before starting new one
    slideAnimation.stopAnimation(() => {
      // Fast, smooth animation with easing
      Animated.timing(slideAnimation, {
        toValue: tabIndex,
        duration: 180, // Quick and snappy
        useNativeDriver: true,
        easing: Easing.out(Easing.ease), // Smooth deceleration
      }).start((finished) => {
        if (finished) {
          setIsAnimating(false);
        }
      });
    });
    
    // Update state immediately for instant content switch
    setActiveTab(tabId);
  };

  const handleUserPress = (user: Author) => {
    navigation.navigate('Profile' as never, {userId: user._id, username: user.username} as never);
  };

  const handleMessagePress = (user: Author) => {
    // TODO: Implement messaging functionality
    console.log('Message user:', user.username);
  };

  const renderUserItem = ({item}: {item: Author}) => (
    <TouchableOpacity
      style={[styles.userItem, {backgroundColor: colors.cardBackground, borderBottomColor: colors.border}]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}>
      
      {/* Left: Profile Picture & Info */}
      <View style={styles.userInfo}>
        {item.image ? (
          <Image 
            source={{uri: item.image}} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, {backgroundColor: colors.primary}]}>
            <Text style={styles.avatarText}>
              {item.name?.[0]?.toUpperCase() || item.username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        
        <View style={styles.userDetails}>
          <Text style={[styles.username, {color: colors.text}]} numberOfLines={1}>
            {item.username || item.name}
          </Text>
          {item.name && item.username && (
            <Text style={[styles.displayName, {color: colors.textSecondary}]} numberOfLines={1}>
              {item.name}
            </Text>
          )}
        </View>
      </View>

      {/* Right: Message Button */}
      <TouchableOpacity
        style={[styles.messageButton, {backgroundColor: colors.surfaceSecondary}]}
        onPress={() => handleMessagePress(item)}
        activeOpacity={0.8}>
        <Text style={[styles.messageButtonText, {color: colors.text}]}>
          Message
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getCurrentData = () => {
    return activeTab === 'followers' ? filteredFollowers : filteredFollowing;
  };

  const getCurrentCount = () => {
    return activeTab === 'followers' ? followers.length : following.length;
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>      
      {/* Custom Header with Back Button */}
      <View style={[styles.header, {backgroundColor: colors.background, borderBottomColor: colors.border}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <ChevronLeft size={32} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerUsername, {color: colors.text}]}>
          @{username}
        </Text>
        
        {/* Empty view for centering */}
        <View style={{width: 28}} />
      </View>

      {/* Tab System */}
      <View style={styles.tabContainer}>
        {mainTabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === 'followers' ? followers.length : following.length;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
              disabled={isAnimating}>
              
              <Text style={[
                styles.tabLabelText,
                {color: isActive ? colors.text : colors.textSecondary}
              ]}>
                {tab.label} {count}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Single underline indicator - only for active tab */}
        <Animated.View
          style={[
            styles.slidingUnderline,
            {
              backgroundColor: colors.text,
              transform: [
                {
                  translateX: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Dimensions.get('window').width / 2], // Slide from left tab to right tab
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, {backgroundColor: colors.surfaceSecondary}]}>
        <Search 
          size={20} 
          color={colors.textSecondary} 
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, {color: colors.text}]}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Content - wrapped for swipe gesture support */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{flex: 1}} {...panResponder.panHandlers}>
          <FlatList
            data={getCurrentData()}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                  {searchQuery 
                    ? `No users found matching "${searchQuery}"`
                    : `No ${activeTab} yet`
                  }
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerUsername: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    position: 'relative', // For absolute positioning of underline
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  tabLabelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  slidingUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%', // Half width since we have 2 tabs
    height: 3,
    borderRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.large,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  displayName: {
    fontSize: FONT_SIZES.sm,
  },
  messageButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  messageButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});