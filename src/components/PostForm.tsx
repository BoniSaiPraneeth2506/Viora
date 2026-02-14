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
import {Send, ImageIcon, Tag as TagIcon, Link} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {ImagePickerComponent} from './ImagePickerComponent';
import {TagsInput} from './TagsInput';
import {MarkdownInput} from './MarkdownInput';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';
import {sanityWriteClient} from '../lib/write-client';

interface PostFormData {
  title: string;
  description: string;
  category: string;
  image: string;
  pitch: string;
  tags: string[];
}

interface PostFormProps {
  existingData?: {
    _id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    pitch: string;
    tags: string[];
  };
  isEdit?: boolean;
}

export const PostForm: React.FC<PostFormProps> = ({existingData, isEdit = false}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [formData, setFormData] = useState<PostFormData>({
    title: existingData?.title || '',
    description: existingData?.description || '',
    category: existingData?.category || '',
    image: existingData?.image || '',
    pitch: existingData?.pitch || '',
    tags: existingData?.tags || [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PostFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PostFormData, string>> = {};

    if (formData.title.length < 3 || formData.title.length > 100) {
      newErrors.title = 'Title must be between 3 and 100 characters';
    }

    if (formData.description.length < 20 || formData.description.length > 500) {
      newErrors.description = 'Description must be between 20 and 500 characters';
    }

    if (formData.category.length < 3 || formData.category.length > 20) {
      newErrors.category = 'Category must be between 3 and 20 characters';
    }

    if (!formData.image || formData.image.length === 0) {
      newErrors.image = 'Image URL is required';
    }

    if (formData.pitch.length < 10) {
      newErrors.pitch = 'Pitch must be at least 10 characters';
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

      if (isEdit && existingData?._id) {
        // UPDATE existing startup
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          image: formData.image,
          pitch: formData.pitch,
          tags: formData.tags,
          slug: {
            _type: 'slug',
            current: slug,
          },
        };

        await sanityWriteClient
          .patch(existingData._id)
          .set(updateData)
          .commit();

        // Success! Show feedback
        Alert.alert(
          '✅ Post Updated!',
          'Your startup post has been updated',
          [
            {
              text: 'View Post',
              onPress: () => {
                (navigation.navigate as any)('StartupDetail', {
                  id: existingData._id,
                });
              },
            },
          ],
          {cancelable: false}
        );
      } else {
        // CREATE new startup
        const docToCreate = {
          _type: 'startup',
          title: formData.title,
          description: formData.description,
          category: formData.category,
          image: formData.image,
          pitch: formData.pitch,
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
          isDraft: false,
        };

        const result = await sanityWriteClient.create(docToCreate);

        // Success! Show feedback
        Alert.alert(
          '✅ Post Created!',
          'Your startup post is now live',
          [
            {
              text: 'View in Feed',
              onPress: () => {
                (navigation.navigate as any)('Home', {
                  newPost: result,
                  timestamp: Date.now(),
                });
              },
            },
          ],
          {cancelable: false}
        );
      }
    } catch (error) {
      console.error('❌ Post operation failed:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEdit ? 'update' : 'create'} post. Please try again.`,
        [{text: 'OK'}]
      );
      setErrors({
        title: `Failed to ${isEdit ? 'update' : 'create'} post. Please try again.`,
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
            placeholder="My Startup Name"
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
            placeholder="Brief description of your startup"
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

        {/* Image Section */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Image *</Text>
          
          <ImagePickerComponent
            onImageSelected={(imageUri) => {
              setFormData(prev => ({...prev, image: imageUri}));
              if (errors.image) {
                setErrors(prev => ({...prev, image: undefined}));
              }
            }}
            currentImage={formData.image}
            error={errors.image}
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
                borderColor: errors.image ? '#EF4444' : colors.border,
              },
            ]}
            placeholder="https://image-url.com/image.jpg"
            placeholderTextColor={colors.textSecondary}
            value={formData.image.startsWith('file://') ? '' : formData.image}
            onChangeText={(text) => {
              setFormData(prev => ({...prev, image: text}));
              if (errors.image) {
                setErrors(prev => ({...prev, image: undefined}));
              }
            }}
            autoCapitalize="none"
            keyboardType="url"
          />
          {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
        </View>

        {/* Pitch - Enhanced Markdown Editor */}
        <MarkdownInput
          label="Pitch *"
          placeholder="Describe your startup idea, what problem it solves, and what makes it unique. Use markdown for formatting!"
          value={formData.pitch}
          onChangeText={(text) => {
            setFormData(prev => ({...prev, pitch: text}));
            if (errors.pitch) {
              setErrors(prev => ({...prev, pitch: undefined}));
            }
          }}
          error={errors.pitch}
          maxLength={1000}
        />

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
              backgroundColor: colors.primary,
              opacity: isSubmitting ? 0.7 : 1,
            },
            SHADOWS.medium,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}>
          {isSubmitting ? (
            <View style={styles.submitButtonContent}>
              <ActivityIndicator size="small" color="white" style={styles.loadingSpinner} />
              <Text style={styles.submitButtonText}>
                {isEdit ? 'Updating...' : 'Creating Post...'}
              </Text>
            </View>
          ) : (
            <View style={styles.submitButtonContent}>
              <Send size={20} color="white" />
              <Text style={styles.submitButtonText}>
                {isEdit ? 'Update Startup' : 'Publish Startup'}
              </Text>
            </View>
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
  pitchSection: {
    marginBottom: SPACING.xl + SPACING.md,
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
  pitchInput: {
    minHeight: 150,
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
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingSpinner: {
    marginRight: SPACING.xs,
  },
});
