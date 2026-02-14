import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';
import {ReelGrid} from './ReelGrid';
import {StartupList} from './StartupList';

interface ContentTabsProps {
  userId: string;
  contentType: 'posts' | 'upvoted' | 'saved';
  headerComponent?: React.ReactNode;
}

const ContentTabsComponent: React.FC<ContentTabsProps> = ({
  userId,
  contentType,
  headerComponent,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const {width} = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('reels');
  const underlinePosition = useRef(new Animated.Value(1)).current;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const tabs = [
    {id: 'posts' as const, label: 'Posts'},
    {id: 'reels' as const, label: 'Reels'},
  ];

  const handleTabChange = useCallback((tabId: 'posts' | 'reels') => {
    setActiveTab(tabId);
    
    // Fast timing animation
    Animated.timing(underlinePosition, {
      toValue: tabId === 'posts' ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [underlinePosition]);

  const underlineWidth = (width - SPACING.lg * 2) / 2;
  const translateX = underlinePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, underlineWidth],
  });

// Header updates on activeTab change for correct colors
  // Data caching prevents refetch, so this is efficient
  const completeHeader = useMemo(() => (
    <View>
      {/* Profile Header + Main Tabs from parent */}
      {headerComponent}
      
      {/* Posts/Reels Tab Headers */}
      <View style={[styles.tabHeaders, {borderBottomColor: colors.border}]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabHeader}
              onPress={() => handleTabChange(tab.id)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Animated Underline */}
        <Animated.View
          style={[
            styles.underline,
            {
              backgroundColor: colors.primary,
              width: underlineWidth,
              transform: [{translateX}],
            },
          ]}
        />
      </View>
    </View>
  ), [headerComponent, colors.border, colors.primary, colors.textSecondary, activeTab, underlineWidth, translateX, handleTabChange]);

  return (
    <View style={styles.container}>
      {/* Conditional rendering - cached data prevents refetch on remount */}
      {activeTab === 'posts' ? (
        <StartupList 
          userId={userId} 
          contentType={contentType}
          headerComponent={completeHeader}
        />
      ) : (
        <ReelGrid 
          userId={userId} 
          contentType={contentType}
          headerComponent={completeHeader}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'relative',
    marginHorizontal: SPACING.lg,
    marginTop: 2,
    marginBottom: 4,
  },
  tabHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  tabLabel: {
    fontSize: FONT_SIZES.bodySmall,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
  },
});

// Memoize to prevent unnecessary re-renders when parent state changes
export const ContentTabs = React.memo(ContentTabsComponent);
