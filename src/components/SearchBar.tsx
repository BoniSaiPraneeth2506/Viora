import React, {useState, memo, useRef, useCallback} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {Search, X} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, SIZES, BORDER_RADIUS} from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

const SearchBarComponent: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search startups...',
  onSubmit,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  const handleClear = useCallback(() => {
    onChangeText('');
    // Don't refocus - causes UI delay
    // User can tap again if they want to continue searching
  }, [onChangeText]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        {
          backgroundColor: colors.background,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}>
      <Search 
        size={20} 
        color={isFocused ? colors.primary : colors.textSecondary} 
        style={styles.icon} 
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, {color: colors.text}]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        onSubmitEditing={onSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        selectTextOnFocus={false}
        blurOnSubmit={false}
      />
      {value.length > 0 && (
        <TouchableOpacity 
          onPress={handleClear} 
          style={styles.clearButton} 
          activeOpacity={0.6}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders during parent state changes
export const SearchBar = memo(SearchBarComponent, (prevProps, nextProps) => {
  // Only re-render if value or placeholder changes
  // onChangeText and onSubmit are stable callbacks from parent, so no need to check them
  return prevProps.value === nextProps.value && 
         prevProps.placeholder === nextProps.placeholder;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  containerFocused: {
    borderWidth: 2,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: 52,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
        lineHeight: 22,
      },
      android: {
        paddingVertical: 14,
        textAlignVertical: 'center',
      },
    }),
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
