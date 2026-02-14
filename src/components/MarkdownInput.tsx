import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Bold,
  Italic,
  List,
  Link,
  Eye,
  Edit3,
  Heading2,
  Code,
} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface MarkdownInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  maxLength?: number;
}

export const MarkdownInput: React.FC<MarkdownInputProps> = ({
  value,
  onChangeText,
  placeholder = "Write your pitch...",
  label,
  description,
  error,
  maxLength,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const insertMarkdown = (before: string, after: string = '', cursorOffset: number = 0) => {
    // Insert markdown at current position
    const insertion = before + after;
    onChangeText(value + insertion);
  };

  const formatMarkdown = (text: string) => {
    // Enhanced markdown to styled text conversion for preview
    let formatted = text;
    
    // Headers (## Header)
    formatted = formatted.replace(/^## (.*)$/gm, '📌 $1');
    formatted = formatted.replace(/^# (.*)$/gm, '📍 $1');
    
    // Bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '𝐁 $1');
    
    // Italic (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '𝘐 $1');
    
    // Lists (- item)
    formatted = formatted.replace(/^- (.*)$/gm, '• $1');
    
    // Code blocks (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '⌨️ $1');
    
    // Links ([text](url))
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '🔗 $1');
    
    return formatted;
  };

  const markdownButtons = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertMarkdown('**', '**'),
    },
    {
      icon: Italic,
      label: 'Italic', 
      action: () => insertMarkdown('*', '*'),
    },
    {
      icon: Heading2,
      label: 'Heading',
      action: () => insertMarkdown('\n## '),
    },
    {
      icon: List,
      label: 'List',
      action: () => insertMarkdown('\n- '),
    },
    {
      icon: Code,
      label: 'Code',
      action: () => insertMarkdown('`', '`'),
    },
    {
      icon: Link,
      label: 'Link',
      action: () => insertMarkdown('[', '](url)'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Label and Description */}
      {label && (
        <View style={styles.headerRow}>
          <Text style={[styles.label, {color: colors.text}]}>{label}</Text>
          {maxLength && (
            <Text style={[styles.charCount, {color: colors.textSecondary}]}>
              {value.length}/{maxLength}
            </Text>
          )}
        </View>
      )}
      {description && (
        <Text style={[styles.description, {color: colors.textSecondary}]}>
          {description}
        </Text>
      )}

      {/* Markdown Toolbar */}
      <View style={[styles.toolbar, {backgroundColor: colors.card, borderColor: colors.border}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.toolbarContent}>
            {markdownButtons.map((button, index) => {
              const Icon = button.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.toolbarButton, {backgroundColor: colors.background}]}
                  onPress={button.action}
                  activeOpacity={0.6}>
                  <Icon size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              );
            })}
            
            <View style={[styles.separator, {backgroundColor: colors.border}]} />
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  backgroundColor: isPreviewMode ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setIsPreviewMode(!isPreviewMode)}
              activeOpacity={0.6}>
              {isPreviewMode ? (
                <Edit3 size={18} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <Eye size={18} color={colors.primary} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.modeText,
                  {color: isPreviewMode ? '#FFFFFF' : colors.primary},
                ]}>
                {isPreviewMode ? 'Edit' : 'Preview'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Input/Preview Area */}
      {isPreviewMode ? (
        <ScrollView
          style={[
            styles.previewContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}>
          <Text style={[styles.previewText, {color: colors.text}]}>
            {value ? formatMarkdown(value) : '👁️ Nothing to preview yet... Start typing to see your formatted text!'}
          </Text>
        </ScrollView>
      ) : (
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: error ? '#EF4444' : colors.border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          multiline
          textAlignVertical="top"
          maxLength={maxLength}
        />
      )}

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  charCount: {
    fontSize: FONT_SIZES.caption,
  },
  description: {
    fontSize: FONT_SIZES.bodySmall,
    marginBottom: SPACING.md,
    lineHeight: FONT_SIZES.bodySmall * 1.4,
  },
  toolbar: {
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  toolbarButton: {
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: SPACING.sm,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
    gap: SPACING.xs,
  },
  modeText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  input: {
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    padding: SPACING.md,
    fontSize: FONT_SIZES.body,
    minHeight: 120,
    maxHeight: 200,
  },
  previewContainer: {
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    padding: SPACING.md,
    minHeight: 120,
    maxHeight: 200,
  },
  previewText: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.6,
    letterSpacing: 0.2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: FONT_SIZES.bodySmall,
    marginTop: SPACING.xs,
  },
});