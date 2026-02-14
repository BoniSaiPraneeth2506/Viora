import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Sparkles, MessageSquare, Copy, Check, ImageOff} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';
import {NavBar} from '../components/NavBar';
import {KebabMenu} from '../components/KebabMenu';
import {UpvoteButton} from '../components/UpvoteButton';
import {BookmarkButton} from '../components/BookmarkButton';
import {TagList} from '../components/TagBadge';
import {StartupCard} from '../components/StartupCard';
import {CommentList} from '../components/CommentList';
import {Startup, Comment} from '../types';
import {sanityClient, urlFor, formatRelativeTime} from '../lib/sanity';
import {
  STARTUP_BY_ID_QUERY,
  RELATED_STARTUPS_QUERY,
} from '../lib/queries';
import {trackStartupView} from '../lib/interactions';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';

const {width} = Dimensions.get('window');

type StartupDetailRouteProp = RouteProp<RootStackParamList, 'StartupDetail'>;

export const StartupDetailScreen: React.FC = () => {
  const route = useRoute<StartupDetailRouteProp>();
  const navigation = useNavigation();
  const {id} = route.params;
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [relatedStartups, setRelatedStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [coverImageError, setCoverImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    fetchStartupDetails();
    trackStartupView(id);
  }, [id]);

  const fetchStartupDetails = async () => {
    try {
      setLoading(true);
      
      const startupData = await sanityClient.fetch<Startup>(STARTUP_BY_ID_QUERY, {
        id,
        userId: user?._id || null
      });

      if (startupData) {
        setStartup(startupData);
        
        // Fetch related startups based on category and tags
        const related = await sanityClient.fetch<Startup[]>(
          RELATED_STARTUPS_QUERY,
          {
            currentId: id,
            category: startupData.category,
            tags: startupData.tags || [],
            userId: user?._id || null,
          }
        );
        setRelatedStartups(related);
      }
    } catch (error) {
      console.error('Error fetching startup details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      // In a real app, you'd have a proper URL
      await Share.share({
        message: `Check out ${startup?.title} on Viora!`,
        title: startup?.title,
      });
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAuthorPress = () => {
    if (startup?.author?._id) {
      navigation.navigate('Profile', {id: startup.author._id});
    }
  };

  const refetchStartupData = async () => {
    try {
      const startupData = await sanityClient.fetch<Startup>(STARTUP_BY_ID_QUERY, {
        id,
        userId: user?._id || null
      });
      if (startupData) {
        setStartup(startupData);
      }
    } catch (error) {
      console.error('Error refetching startup:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <NavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!startup) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <NavBar />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: colors.text}]}>
            Startup not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? ['#2C1E21', '#1C1C1E'] : ['#FFE5EC', '#FFF0F5']}
          style={styles.hero}>
          {/* Three-dots menu (only for author) */}
          {user?._id === startup.author._id && (
            <View style={styles.kebabMenuContainer}>
              <KebabMenu 
                startupId={id} 
                onDeleteSuccess={() => navigation.navigate('Home')}
              />
            </View>
          )}
          
          <Text style={[styles.date, {color: colors.textSecondary}]}>
            {formatRelativeTime(startup._createdAt)}
          </Text>
          <Text style={[styles.title, {color: colors.text}]}>
            {startup.title}
          </Text>
          <Text style={[styles.description, {color: colors.textSecondary}]}>
            {startup.description}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Cover Image */}
          {startup.image && (() => {
            const imageUrl = urlFor(startup.image).url();
            const hasValidImage = imageUrl && imageUrl.length > 0 && !coverImageError;

            if (!hasValidImage) {
              return (
                <View style={[styles.coverImage, styles.imagePlaceholder, {backgroundColor: colors.card}]}>
                  <ImageOff size={48} color={colors.textSecondary} opacity={0.5} />
                  <Text style={[styles.placeholderText, {color: colors.textSecondary}]}>
                    No Image
                  </Text>
                </View>
              );
            }

            return (
              <Image
                source={{uri: imageUrl}}
                style={styles.coverImage}
                resizeMode="cover"
                onError={() => setCoverImageError(true)}
              />
            );
          })()}

          {/* Author Info */}
          <TouchableOpacity
            style={styles.authorSection}
            onPress={handleAuthorPress}
            activeOpacity={0.7}>
            {startup.author?.image && !avatarError ? (
              <Image
                source={{uri: urlFor(startup.author.image).url()}}
                style={styles.authorAvatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={[styles.authorAvatar, styles.avatarPlaceholder, {backgroundColor: colors.card}]}>
                <Text style={[styles.avatarText, {color: colors.textSecondary}]}>
                  {startup.author?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, {color: colors.text}]}>
                {startup.author?.name}
              </Text>
              <Text style={[styles.authorUsername, {color: colors.textSecondary}]}>
                @{startup.author?.username}
              </Text>
            </View>
            <View style={[styles.categoryBadge, {backgroundColor: colors.primary + '20'}]}>
              <Text style={[styles.categoryText, {color: colors.primary}]}>
                {startup.category}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Tags */}
          {startup.tags && startup.tags.length > 0 && (
            <View style={styles.section}>
              <TagList tags={startup.tags} />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <UpvoteButton
              startupId={id}
              initialUpvotes={startup.upvotes || 0}
              upvotedBy={startup.upvotedBy}
              size="medium"
              onSuccess={refetchStartupData}
            />
            <BookmarkButton
              startupId={id}
              size="medium"
              showLabel={true}
              onSuccess={refetchStartupData}
            />
            <TouchableOpacity
              style={[styles.copyButton, {borderColor: colors.border}]}
              onPress={handleCopyLink}
              activeOpacity={0.7}>
              {linkCopied ? (
                <Check size={16} color={colors.primary} />
              ) : (
                <Copy size={16} color={colors.textSecondary} />
              )}
              <Text style={[styles.copyText, {color: colors.textSecondary}]}>
                {linkCopied ? 'Copied' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pitch Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>
              Pitch Details
            </Text>
            {startup.pitch ? (
              <Text style={[styles.pitch, {color: colors.text}]}>
                {typeof startup.pitch === 'string'
                  ? startup.pitch
                  : JSON.stringify(startup.pitch)}
              </Text>
            ) : (
              <Text style={[styles.noPitch, {color: colors.textSecondary}]}>
                No details provided
              </Text>
            )}
          </View>

          {/* Related Startups */}
          {relatedStartups.length > 0 && (
            <View style={styles.recommendedSection}>
              <View style={styles.sectionHeader}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, {color: colors.text}]}>
                  Recommended Posts
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, {color: colors.textSecondary}]}>
                Similar startups you might be interested in
              </Text>
              <View style={styles.relatedGrid}>
                {relatedStartups.map((relatedStartup) => (
                  <View key={relatedStartup._id} style={styles.relatedCard}>
                    <StartupCard startup={relatedStartup} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Comments Section */}
          <View style={styles.section}>
            <CommentList startupId={id} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.title,
    fontWeight: '600',
  },
  hero: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    minHeight: 200,
  },
  kebabMenuContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 100,
    elevation: 5,
  },
  date: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    maxWidth: 600,
  },
  content: {
    paddingBottom: SPACING.xxxl,
  },
  coverImage: {
    width: width,
    height: width * 0.6,
    marginBottom: SPACING.xl,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  authorUsername: {
    fontSize: FONT_SIZES.bodySmall,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.large,
  },
  categoryText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: SPACING.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1.5,
  },
  copyText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  pitch: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.6,
  },
  noPitch: {
    fontSize: FONT_SIZES.body,
    fontStyle: 'italic',
  },
  recommendedSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  relatedGrid: {
    gap: SPACING.md,
  },
  relatedCard: {
    marginBottom: SPACING.md,
  },
});
