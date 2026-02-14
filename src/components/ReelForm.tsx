import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {Send, Video, Tag as TagIcon, Link} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {VideoPickerComponent} from './VideoPickerComponent';
import {TagsInput} from './TagsInput';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';
import {sanityWriteClient} from '../lib/write-client';

interface ReelFormData {
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  tags: string[];
}

export const ReelForm: React.FC = () => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [formData, setFormData] = useState<ReelFormData>({
    title: '',
    description: '',
    category: '',
    videoUrl: '',
    tags: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ReelFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ReelFormData, string>> = {};

    if (formData.title.length < 3 || formData.title.length > 100) {
      newErrors.title = 'Title must be between 3 and 100 characters';
    }

    if (formData.description.length < 10 || formData.description.length > 500) {
      newErrors.description = 'Description must be between 10 and 500 characters';
    }

    if (formData.category.length < 3 || formData.category.length > 20) {
      newErrors.category = 'Category must be between 3 and 20 characters';
    }

    if (!formData.videoUrl || formData.videoUrl.length === 0) {
      newErrors.videoUrl = 'Video URL is required';
    }

    if (formData.tags.length > 5) {
      newErrors.tags = 'Maximum 5 tags allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Tags are now managed by TagsInput component

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Generate thumbnail from video URL
      // For Cloudinary URLs, we can extract frame as thumbnail
      // For other URLs, use the video URL itself (browsers handle poster frames)
      let thumbnailUrl = formData.videoUrl;
      
      if (formData.videoUrl.includes('cloudinary.com')) {
        // Cloudinary: Replace /upload/ with /upload/so_0/ to get first frame
        thumbnailUrl = formData.videoUrl.replace('/upload/', '/upload/so_0.0,w_400,h_711,c_fill/');
        console.log('📸 Generated Cloudinary thumbnail:', thumbnailUrl);
      } else if (formData.videoUrl.includes('res.cloudinary.com')) {
        // Alternative Cloudinary format
        thumbnailUrl = formData.videoUrl.replace('/video/upload/', '/video/upload/so_0.0,w_400,h_711,c_fill/');
        console.log('📸 Generated Cloudinary thumbnail:', thumbnailUrl);
      }

      // Create the reel document
      const docToCreate = {
        _type: 'reel',
        title: formData.title,
        description: formData.description,
        category: formData.category,
        videoUrl: formData.videoUrl,
        video: formData.videoUrl, // Adding both for compatibility
        thumbnail: thumbnailUrl, // Add thumbnail URL
        tags: formData.tags,
        slug: {
          _type: 'slug',
          current: slug,
        },
        author: {
          _type: 'reference',
          _ref: user?._id,
        },
        views: 0,
        upvotes: 0,
        upvotedBy: [],
        viewedBy: [], // Initialize viewedBy array for unique view tracking
      };
      
      const result = await sanityWriteClient.create(docToCreate);

      console.log('✅ Reel created successfully! Auto-navigating to Reels...');
      
      // Directly navigate to Reels section (Instagram/TikTok style)
      (navigation.navigate as any)('Main', {
        screen: 'Reels',
        params: {
          newReel: result,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('❌ Reel creation failed:', error);
      Alert.alert(
        'Error',
        'Failed to create reel. Please try again.',
        [{text: 'OK'}]
      );
      setErrors({
        title: 'Failed to create reel. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        style={[styles.container, {backgroundColor: colors.background}]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Title *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.title ? '#EF4444' : colors.border,
              },
            ]}
            placeholder="My Pitch Video"
            placeholderTextColor={colors.textSecondary}
            value={formData.title}
            onChangeText={(text) => {
              setFormData(prev => ({...prev, title: text}));
              if (errors.title) {
                setErrors(prev => ({...prev, title: undefined}));
              }
            }}
            maxLength={100}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Description *</Text>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.description ? '#EF4444' : colors.border,
              },
            ]}
            placeholder="Brief description of your pitch video"
            placeholderTextColor={colors.textSecondary}
            value={formData.description}
            onChangeText={(text) => {
              setFormData(prev => ({...prev, description: text}));
              if (errors.description) {
                setErrors(prev => ({...prev, description: undefined}));
              }
            }}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Category *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.category ? '#EF4444' : colors.border,
              },
            ]}
            placeholder="Tech, Health, Finance"
            placeholderTextColor={colors.textSecondary}
            value={formData.category}
            onChangeText={(text) => {
              setFormData(prev => ({...prev, category: text}));
              if (errors.category) {
                setErrors(prev => ({...prev, category: undefined}));
              }
            }}
            maxLength={20}
          />
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        {/* Video Section */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Video *</Text>
          
          <VideoPickerComponent
            onVideoSelected={(videoUri) => {
              setFormData(prev => ({...prev, videoUrl: videoUri}));
              if (errors.videoUrl) {
                setErrors(prev => ({...prev, videoUrl: undefined}));
              }
            }}
            currentVideo={formData.videoUrl}
            error={errors.videoUrl}
          />
          
          <View style={styles.orDivider}>
            <View style={[styles.orLine, {backgroundColor: colors.border}]} />
            <Text style={[styles.orText, {color: colors.textSecondary}]}>or URL</Text>
            <View style={[styles.orLine, {backgroundColor: colors.border}]} />
          </View>
          
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.videoUrl ? '#EF4444' : colors.border,
              },
            ]}
            placeholder="https://video-url.com/video.mp4"
            placeholderTextColor={colors.textSecondary}
            value={formData.videoUrl.startsWith('file://') ? '' : formData.videoUrl}
            onChangeText={(text) => {
              setFormData(prev => ({...prev, videoUrl: text}));
              if (errors.videoUrl) {
                setErrors(prev => ({...prev, videoUrl: undefined}));
              }
            }}
            autoCapitalize="none"
            keyboardType="url"
          />
          {errors.videoUrl && <Text style={styles.errorText}>{errors.videoUrl}</Text>}
        </View>

        {/* Tags */}
        <TagsInput
          tags={formData.tags}
          onTagsChange={(tags) => {
            setFormData(prev => ({...prev, tags}));
            if (errors.tags) {
              setErrors(prev => ({...prev, tags: undefined}));
            }
          }}
          maxTags={5}
          label="Tags (Optional)"
        />

          {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitting ? colors.card : colors.primary,
              opacity: isSubmitting ? 0.7 : 1,
            },
            SHADOWS.medium,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>🎬 Create Reel</Text>
              <Send size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl * 3,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  tagsSection: {
    marginBottom: SPACING.xl + SPACING.md,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: SPACING.md,
    lineHeight: FONT_SIZES.bodySmall * 1.4,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.md,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '500',
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  input: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    fontSize: FONT_SIZES.body,
    borderWidth: 1.5,
  },
  textarea: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    fontSize: FONT_SIZES.body,
    borderWidth: 1.5,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  inputWithIconField: {
    flex: 1,
    paddingLeft: SPACING.xl + SPACING.lg,
    paddingRight: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    fontSize: FONT_SIZES.body,
    borderWidth: 1.5,
  },
  helperText: {
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  errorText: {
    fontSize: FONT_SIZES.caption,
    color: '#EF4444',
    marginTop: SPACING.xs,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addTagButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  addTagText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
    gap: SPACING.xs,
  },
  tagText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  tagRemove: {
    fontSize: FONT_SIZES.title,
    fontWeight: '400',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: SPACING.lg,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
  },
});
