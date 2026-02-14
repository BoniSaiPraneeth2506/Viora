import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Tag, X} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  label?: string;
  description?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onTagsChange,
  maxTags = 5,
  placeholder = "tech, ai, health",
  label = "Tags",
  description,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [inputValue, setInputValue] = useState('');

  const handleTextChange = (text: string) => {
    setInputValue(text);
    
    // Check for comma or enter to add tags
    if (text.includes(',') || text.includes('\n')) {
      const newTags = text
        .split(/[,\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, maxTags - tags.length);
      
      if (newTags.length > 0) {
        const uniqueTags = newTags.filter(tag => !tags.includes(tag));
        if (uniqueTags.length > 0) {
          onTagsChange([...tags, ...uniqueTags].slice(0, maxTags));
        }
      }
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onTagsChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitEditing = () => {
    if (inputValue.trim() && tags.length < maxTags && !tags.includes(inputValue.trim())) {
      onTagsChange([...tags, inputValue.trim()]);
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Label and Description */}
      {label && (
        <Text style={[styles.label, {color: colors.text}]}>
          {label} ({tags.length}/{maxTags})
        </Text>
      )}
      {description && (
        <Text style={[styles.description, {color: colors.textSecondary}]}>
          {description}
        </Text>
      )}

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWithIcon}>
          <Tag size={18} color={colors.textSecondary} style={styles.icon} />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={tags.length >= maxTags ? `Max ${maxTags} tags reached` : placeholder}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSubmitEditing}
            editable={tags.length < maxTags}
            multiline={false}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
      </View>

      {/* Tags Display */}
      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.tag, {backgroundColor: colors.primary}]}
                onPress={() => removeTag(index)}
                activeOpacity={0.8}>
                <Text style={[styles.tagText, {color: '#FFFFFF'}]}>#{tag}</Text>
                <View style={[styles.removeButton, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <X size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Helper Text */}
      <Text style={[styles.helperText, {color: colors.textSecondary}]}>
        Type tags and press comma or enter to add. Tap tags to remove.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: SPACING.md,
    lineHeight: FONT_SIZES.bodySmall * 1.4,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.xl + SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    fontSize: FONT_SIZES.body,
    minHeight: 48,
  },
  tagsScroll: {
    marginBottom: SPACING.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.large,
    gap: SPACING.xs,
  },
  tagText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: FONT_SIZES.caption,
    lineHeight: FONT_SIZES.caption * 1.3,
  },
});