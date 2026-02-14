import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated, Dimensions} from 'react-native';
import {FileText, ThumbsUp, Bookmark} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';
import {ContentTabs} from './ContentTabs';

type TabType = 'posts' | 'upvoted' | 'saved';

interface ProfileTabsProps {
  isOwnProfile: boolean;
  userId: string;
  headerComponent?: React.ReactNode;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  isOwnProfile,
  userId,
  headerComponent,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  
  // Main tabs (icons only) - Posts always shown, Upvoted & Saved only for own profile
  const mainTabs = [
    {id: 'posts' as TabType, icon: FileText},
    ...(isOwnProfile
      ? [
          {id: 'upvoted' as TabType, icon: ThumbsUp},
          {id: 'saved' as TabType, icon: Bookmark},
        ]
      : []),
  ];
  
  // Get screen dimensions for responsive layout - after mainTabs is defined
  const screenWidth = Dimensions.get('window').width;
  const containerMargin = SPACING.lg;
  const tabContainerWidth = screenWidth - (containerMargin * 2);
  const tabWidth = tabContainerWidth / mainTabs.length;
  
  // Smooth spring-based sliding animation
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handleTabPress = useCallback((tabId: TabType) => {
    if (tabId === activeTabRef.current) return;
    
    const tabIndex = mainTabs.findIndex(tab => tab.id === tabId);
    
    // Fast timing animation (more predictable than spring)
    Animated.timing(slideAnimation, {
      toValue: tabIndex,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Update state
    setActiveTab(tabId);
  }, [mainTabs, slideAnimation]);

  // Initialize and reset slide position when needed
  useEffect(() => {
    const tabIndex = mainTabs.findIndex(tab => tab.id === activeTab);
    if (tabIndex !== -1) {
      slideAnimation.setValue(tabIndex);
    }
  }, [mainTabs.length]); // Run when tab count changes

  // Header updates on activeTab change for correct colors
  // Data caching prevents refetch, so this is efficient
  const combinedHeader = useMemo(() => (
    <View>
      {/* Profile Header (avatar, stats, bio, buttons) */}
      {headerComponent}
      
      {/* Cool Sliding Tab System */}
      <View style={styles.tabContainer}>
        {/* Tab Bar */}
        <View style={styles.tabBackground}>
          {/* Sliding Active Indicator */}
          <Animated.View
            style={[
              styles.activeSlider,
              {
                backgroundColor: colors.primary,
                width: tabWidth,
                transform: [
                  {
                    translateX: slideAnimation.interpolate({
                      inputRange: [0, Math.max(mainTabs.length - 1, 1)],
                      outputRange: [0, tabWidth * (mainTabs.length - 1)],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
          
          {/* Tab Buttons */}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}>
                <Icon
                  size={22}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                  strokeWidth={isActive ? 2.8 : 2}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  ), [headerComponent, colors.primary, colors.textSecondary, tabWidth, slideAnimation, mainTabs, activeTab, handleTabPress]);

  return (
    <View style={styles.container}>
      {/* Conditional rendering - cached data in children prevents refetch */}
      {activeTab === 'posts' && (
        <ContentTabs userId={userId} contentType="posts" headerComponent={combinedHeader} />
      )}
      {activeTab === 'upvoted' && isOwnProfile && (
        <ContentTabs userId={userId} contentType="upvoted" headerComponent={combinedHeader} />
      )}
      {activeTab === 'saved' && isOwnProfile && (
        <ContentTabs userId={userId} contentType="saved" headerComponent={combinedHeader} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: 6,
    marginBottom: SPACING.sm,
  },
  tabBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 42,
    borderRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
  },
  activeSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: BORDER_RADIUS.large,
    zIndex: 0,
    shadowColor: COLORS.light.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
});
