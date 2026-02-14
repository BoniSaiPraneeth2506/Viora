import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Platform, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Home,
  Play,
  PlusCircle,
  MessageCircle,
  User,
  FileText,
  Video,
} from 'lucide-react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {COLORS, SIZES, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';

interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface BottomNavProps {
  onCreatePress?: () => void;
}

const tabs: TabItem[] = [
  {name: 'Home', label: 'Home', icon: Home},
  {name: 'Reels', label: 'Reels', icon: Play},
  {name: 'Create', label: 'Create', icon: PlusCircle},
  {name: 'Messages', label: 'Messages', icon: MessageCircle},
  {name: 'Profile', label: 'Profile', icon: User},
];

export const BottomNav: React.FC<BottomNavProps> = ({onCreatePress}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const {isDark} = useTheme();
  const {user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;
  
  // Local state - no parent re-render!
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Fast handlers with useCallback
  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost' as never);
    setShowCreateMenu(false);
  }, [navigation]);

  const handleCreateReel = useCallback(() => {
    navigation.navigate('CreateReel' as never);
    setShowCreateMenu(false);
  }, [navigation]);

  const isActive = (tabName: string) => {
    // Create tab is never "active" since it's just a modal trigger
    if (tabName === 'Create') {
      return false;
    }
    return route.name === tabName;
  };

  const handlePress = (tabName: string) => {
    // Only log significant navigation events
    // console.log('📱 BottomNav - Tab pressed:', tabName);
    
    // Create button opens local menu instantly
    if (tabName === 'Create') {
      setShowCreateMenu(true);
      return;
    }
    
    // Check if tapping the already active tab (Instagram/TikTok behavior)
    const isAlreadyActive = route.name === tabName;
    if (isAlreadyActive) {
      console.log('📱 BottomNav - Tapping ACTIVE tab! Navigating with scroll flag');
      
      // Navigate with a special parameter to trigger scroll-to-top
      // @ts-ignore - Dynamic navigation params
      navigation.navigate(tabName, {
        scrollToTop: true,
        scrollTimestamp: Date.now(),
      });
      return;
    }
    
    // Profile tab needs user ID parameter (same as NavBar)
    if (tabName === 'Profile' && user) {
      // @ts-ignore - Dynamic navigation params
      navigation.navigate('Profile', {id: user._id});
      return;
    }
    
    // Otherwise navigate normally
    navigation.navigate(tabName as never);
  };

  return (
    <>
      {/* Create Menu Overlay - Always present, just hidden/shown */}
      {showCreateMenu && (
        <View style={styles.menuOverlay}>
          <Pressable 
            style={styles.menuBackdrop} 
            onPress={() => setShowCreateMenu(false)}
          >
            <View style={styles.menuWrapper}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.menu, {backgroundColor: colors.card}]}>
                  {/* Create Post Option */}
                  <TouchableOpacity
                    style={[styles.menuOption, {borderBottomColor: colors.border}]}
                    onPress={handleCreatePost}
                    activeOpacity={0.7}>
                    <View style={[styles.iconCircle, {backgroundColor: '#DBEAFE'}]}>
                      <FileText size={22} color="#3B82F6" strokeWidth={2} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, {color: colors.text}]}>
                        Create Post
                      </Text>
                      <Text style={[styles.optionDesc, {color: colors.textSecondary}]}>
                        Share your startup idea
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Create Reel Option */}
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={handleCreateReel}
                    activeOpacity={0.7}>
                    <View style={[styles.iconCircle, {backgroundColor: '#FCE7F3'}]}>
                      <Video size={22} color="#EC4899" strokeWidth={2} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, {color: colors.text}]}>
                        Create Reel
                      </Text>
                      <Text style={[styles.optionDesc, {color: colors.textSecondary}]}>
                        Upload a pitch video
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={[styles.cancelButton, {backgroundColor: colors.background}]}
                    onPress={() => setShowCreateMenu(false)}
                    activeOpacity={0.7}>
                    <Text style={[styles.cancelText, {color: colors.text}]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </View>
      )}

      <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = isActive(tab.name);
          const iconColor = active ? colors.primary : colors.textSecondary;
          const isCreateButton = tab.name === 'Create';

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handlePress(tab.name)}
              style={[
                styles.tab,
                isCreateButton && styles.createTab,
              ]}
              activeOpacity={0.6}
              delayPressIn={0}>
              <Icon
                size={isCreateButton ? 28 : 24}
                color={iconColor}
                strokeWidth={active ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.label,
                  {color: iconColor},
                  active && styles.activeLabel,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuWrapper: {
    padding: SPACING.lg,
  },
  menu: {
    borderRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.circle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: FONT_SIZES.bodySmall,
  },
  cancelButton: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.medium,
  },
  cancelText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  content: {
    flexDirection: 'row',
    height: SIZES.bottomNav,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  createTab: {
    transform: [{scale: 1.1}],
  },
  label: {
    fontSize: 11,
    marginTop: 4,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
