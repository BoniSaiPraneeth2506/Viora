import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Clock, Eye, ThumbsUp, SlidersHorizontal, TrendingUp } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import { SortOption } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SortSelectProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
}

export function SortSelect({ value, onValueChange }: SortSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const options = [
    {
      value: 'latest' as SortOption,
      label: 'Latest',
      icon: Clock,
    },
    {
      value: 'trending' as SortOption,
      label: 'Trending',
      icon: TrendingUp,
    },
    {
      value: 'views' as SortOption,
      label: 'Most Viewed',
      icon: Eye,
    },
    {
      value: 'upvotes' as SortOption,
      label: 'Most Upvoted',
      icon: ThumbsUp,
    },
  ];

  const handleSelect = (newValue: SortOption) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
          }
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <SlidersHorizontal size={18} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.content, { backgroundColor: colors.card }]}>
            <View style={[styles.header, { 
              borderBottomColor: colors.border,
              backgroundColor: isDark ? colors.background : COLORS.gray[50],
            }]}>
              <Text style={[styles.headerText, { color: colors.text }]}>
                Sort by
              </Text>
            </View>
            
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = value === option.value;
              
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: '400',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
