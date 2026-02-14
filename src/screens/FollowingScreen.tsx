import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {ChevronLeft} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {NavBar} from '../components/NavBar';
import {BottomNav} from '../components/BottomNav';
import {Author} from '../types';
import {sanityClient} from '../lib/sanity';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

type FollowingRouteParams = {
  Following: {
    userId: string;
    username: string;
  };
};

export const FollowingScreen: React.FC = () => {
  const route = useRoute<RouteProp<FollowingRouteParams, 'Following'>>();
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user: currentUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [following, setFollowing] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const {userId, username} = route.params || {};

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  const fetchFollowing = async () => {
    try {
      console.log('📤 Fetching following for user:', userId);
      
      // Get user's following list
      const userQuery = `*[_type == "author" && _id == $id][0]{
        following
      }`;
      
      const userData = await sanityClient.fetch(userQuery, {id: userId});
      const followingIds = userData?.following?.map((f: any) => f._ref) || [];
      
      console.log(`📋 User is following ${followingIds.length} people`);
      
      // Get full details of following users
      if (followingIds.length > 0) {
        const query = `*[_type == "author" && _id in $ids]{
          _id,
          name,
          username,
          image,
          bio
        }`;
        
        const data = await sanityClient.fetch(query, {ids: followingIds});
        console.log(`✅ Fetched ${data.length} following users`);
        setFollowing(data);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('❌ Error fetching following:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFollowing = ({item}: {item: Author}) => (
    <TouchableOpacity
      style={[styles.followingItem, {backgroundColor: colors.card, borderBottomColor: colors.border}]}
      onPress={() => navigation.navigate('Profile' as never, {id: item._id} as never)}
      activeOpacity={0.7}>
      <View style={styles.followingContent}>
        {item.image ? (
          <Image source={{uri: item.image}} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: colors.primary}]}>
            <Text style={styles.avatarText}>
              {(item.name || item.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.username, {color: colors.text}]} numberOfLines={1}>
            {item.username || item.name}
          </Text>
          {item.name && item.username && (
            <Text style={[styles.name, {color: colors.textSecondary}]} numberOfLines={1}>
              {item.name}
            </Text>
          )}
          {item.bio && (
            <Text style={[styles.bio, {color: colors.textSecondary}]} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      
      {/* Header */}
      <View style={[styles.header, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {username || 'User'}
          </Text>
          <Text style={[styles.headerSubtitle, {color: colors.textSecondary}]}>
            {following.length} following
          </Text>
        </View>
      </View>

      {/* Following List */}
      {following.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
            Not following anyone yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          renderItem={renderFollowing}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
        />
      )}
      
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.caption,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  followingItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  followingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  name: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: 2,
  },
  bio: {
    fontSize: FONT_SIZES.caption,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
  },
});
