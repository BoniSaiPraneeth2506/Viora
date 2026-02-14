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

type FollowersRouteParams = {
  Followers: {
    userId: string;
    username: string;
  };
};

export const FollowersScreen: React.FC = () => {
  const route = useRoute<RouteProp<FollowersRouteParams, 'Followers'>>();
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user: currentUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [followers, setFollowers] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const {userId, username} = route.params || {};

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  const fetchFollowers = async () => {
    try {
      console.log('📥 Fetching followers for user:', userId);
      
      // Get followers - users who have this userId in their following array
      const query = `*[_type == "author" && $userId in following[]._ref]{
        _id,
        name,
        username,
        image,
        bio
      }`;
      
      const data = await sanityClient.fetch(query, {userId});
      console.log(`✅ Fetched ${data.length} followers`);
      setFollowers(data);
    } catch (error) {
      console.error('❌ Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFollower = ({item}: {item: Author}) => (
    <TouchableOpacity
      style={[styles.followerItem, {backgroundColor: colors.card, borderBottomColor: colors.border}]}
      onPress={() => navigation.navigate('Profile' as never, {id: item._id} as never)}
      activeOpacity={0.7}>
      <View style={styles.followerContent}>
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
            {followers.length} followers
          </Text>
        </View>
      </View>

      {/* Followers List */}
      {followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
            No followers yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderFollower}
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
  followerItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  followerContent: {
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
