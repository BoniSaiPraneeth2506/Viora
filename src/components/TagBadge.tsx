import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface TagBadgeProps {
  tag: string;
  variant?: 'default' | 'outline';
}

export const TagBadge: React.FC<TagBadgeProps> = ({tag, variant = 'default'}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View
      style={[
        styles.badge,
        variant === 'default'
          ? {backgroundColor: colors.card}
          : {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border,
            },
      ]}>
      <Text
        style={[
          styles.text,
          {color: variant === 'default' ? colors.primary : colors.text},
        ]}>
        {tag}
      </Text>
    </View>
  );
};

interface TagListProps {
  tags: string[];
  maxTags?: number;
}

export const TagList: React.FC<TagListProps> = ({tags, maxTags = 5}) => {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remainingCount = tags.length - displayTags.length;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}>
      {displayTags.map((tag, index) => (
        <TagBadge key={`${tag}-${index}`} tag={tag} />
      ))}
      {remainingCount > 0 && (
        <View style={[styles.badge, {backgroundColor: COLORS.light.card}]}>
          <Text style={[styles.text, {color: COLORS.light.textSecondary}]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  text: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: SPACING.sm,
  },
});
