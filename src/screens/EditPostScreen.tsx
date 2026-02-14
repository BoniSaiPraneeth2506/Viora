import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';
import {NavBar} from '../components/NavBar';
import {PostForm} from '../components/PostForm';
import {sanityClient} from '../lib/sanity';
import {STARTUP_BY_ID_QUERY} from '../lib/queries';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

type EditPostRouteProp = RouteProp<RootStackParamList, 'EditPost'>;

export const EditPostScreen: React.FC = () => {
  const route = useRoute<EditPostRouteProp>();
  const navigation = useNavigation();
  const {postId} = route.params;
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState<any>(null);

  useEffect(() => {
    fetchStartup();
  }, [postId]);

  const fetchStartup = async () => {
    try {
      setLoading(true);
      const data = await sanityClient.fetch(STARTUP_BY_ID_QUERY, {
        id: postId,
        userId: user?._id || null,
      });

      if (!data) {
        Alert.alert('Error', 'Startup not found', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
        return;
      }

      // Check if user is the author
      if (data.author._id !== user?._id) {
        Alert.alert(
          'Unauthorized',
          'You can only edit your own posts',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
        return;
      }

      setStartup(data);
    } catch (error) {
      console.error('Error fetching startup:', error);
      Alert.alert('Error', 'Failed to load startup', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } finally {
      setLoading(false);
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
            Unable to load startup
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient
            colors={isDark ? ['#2C1E21', '#1C1C1E'] : ['#FFE5EC', '#FFF0F5']}
            style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>
              Edit Your Startup
            </Text>
          </LinearGradient>

          {/* Post Form with existing data */}
          <PostForm
            existingData={{
              _id: startup._id,
              title: startup.title,
              description: startup.description,
              category: startup.category,
              image: startup.image,
              pitch: startup.pitch,
              tags: startup.tags || [],
            }}
            isEdit={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.title,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xxxl,
    minHeight: 180,
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
});
