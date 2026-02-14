import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft, Edit2, Plus, X} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {sanityClient, sanityWriteClient} from '../lib/sanity';
import {AUTHOR_BY_ID_QUERY} from '../lib/queries';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user, updateUser} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('📥 Fetching profile for editing:', user?._id);
      const data = await sanityClient.fetch(AUTHOR_BY_ID_QUERY, {id: user?._id});
      
      setName(data.name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setImageUrl(data.image || '');
      setSocialLinks(data.socialLinks || []);
      
      console.log('✅ Profile data loaded');
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        setImageUrl(selectedImageUri);
        console.log('✅ Image selected:', selectedImageUri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const addSocialLink = () => {
    if (newLink.trim()) {
      setSocialLinks([...socialLinks, newLink.trim()]);
      setNewLink('');
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving profile changes...');
      
      await sanityWriteClient
        .patch(user?._id!)
        .set({
          name: name.trim(),
          username: username.trim(),
          bio: bio.trim() || null,
          image: imageUrl.trim() || null,
          socialLinks: socialLinks.length > 0 ? socialLinks : null,
        })
        .commit();

      console.log('✅ Profile updated successfully');
      
      // Update user context with new data
      await updateUser({
        name: name.trim(),
        username: username.trim(), 
        bio: bio.trim() || undefined,
        image: imageUrl.trim() || undefined,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
          activeOpacity={0.7}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, {color: colors.primary}]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Profile Image Preview with Edit Button */}
        <View style={styles.imagePreviewContainer}>
          {imageUrl ? (
            <Image source={{uri: imageUrl}} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePreview, styles.imagePlaceholder, {backgroundColor: colors.primary}]}>
              <Text style={styles.imagePlaceholderText}>
                {(name || username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* Edit Icon Button */}
          <TouchableOpacity
            style={[styles.editIconButton, {backgroundColor: colors.primary}]}
            onPress={pickImage}
            activeOpacity={0.7}>
            <Edit2 size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={[styles.form, {backgroundColor: colors.card}]}>
          <View style={[styles.inputGroup, {borderBottomColor: colors.border}]}>
            <Text style={[styles.label, {color: colors.textSecondary}]}>Name *</Text>
            <TextInput
              style={[styles.input, {color: colors.text}]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.inputGroup, {borderBottomColor: colors.border}]}>
            <Text style={[styles.label, {color: colors.textSecondary}]}>Username *</Text>
            <TextInput
              style={[styles.input, {color: colors.text}]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputGroup, {borderBottomColor: colors.border}]}>
            <Text style={[styles.label, {color: colors.textSecondary}]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, {color: colors.text}]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.textSecondary}]}>
              URLs / Social Links
            </Text>
            <Text style={[styles.hint, {color: colors.textSecondary, marginBottom: SPACING.sm}]}>
              Add your social media profiles, website, or other links
            </Text>
            
            {/* Existing Links */}
            {socialLinks.map((link, index) => (
              <View key={index} style={[styles.linkItem, {backgroundColor: colors.card, borderColor: colors.border}]}>
                <Text style={[styles.linkText, {color: colors.text}]} numberOfLines={1}>
                  {link}
                </Text>
                <TouchableOpacity
                  onPress={() => removeSocialLink(index)}
                  style={styles.removeLinkButton}>
                  <X size={16} color={colors.error} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Add New Link */}
            <View style={styles.addLinkContainer}>
              <TextInput
                style={[styles.input, styles.linkInput, {color: colors.text, borderColor: colors.border}]}
                value={newLink}
                onChangeText={setNewLink}
                placeholder="https://instagram.com/username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                onPress={addSocialLink}
                style={[styles.addLinkButton, {backgroundColor: colors.primary}]}
                disabled={!newLink.trim()}
                activeOpacity={0.7}>
                <Plus size={20} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: SPACING.xs,
  },
  saveText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl * 2,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  form: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    fontSize: FONT_SIZES.body,
    paddingVertical: SPACING.xs,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.xs,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  linkText: {
    fontSize: FONT_SIZES.bodySmall,
    flex: 1,
    marginRight: SPACING.sm,
  },
  removeLinkButton: {
    padding: SPACING.xs,
  },
  addLinkContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  addLinkButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
