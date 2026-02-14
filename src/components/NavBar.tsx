import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Search, LogOut, User} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {NotificationBell} from './NotificationBell';
import {COLORS, SIZES, SPACING, SHADOWS} from '../constants/theme';

interface NavBarProps {
  showSearch?: boolean;
  showNotification?: boolean;
  showProfile?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  showSearch = true,
  showNotification = true,
  showProfile = true,
}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const {signOut, user} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}>
        {/* Logo */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Home' as never)}
          style={styles.logoContainer}>
          <Text style={[styles.logoText, {color: colors.primary}]}>
            {user ? 'Viora' : 'YC Directory'}
          </Text>
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.actionsContainer}>
          {showSearch && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Search' as never)}
              style={styles.iconButton}
              hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
              <Search size={24} color={colors.text} />
            </TouchableOpacity>
          )}

          {showNotification && <NotificationBell />}

          {showProfile && user && (
            <>
              {Platform.OS === 'web' ? (
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={[
                    styles.logoutButton,
                    {backgroundColor: colors.card},
                  ]}>
                  <LogOut size={18} color={colors.text} />
                  <Text style={[styles.logoutText, {color: colors.text}]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Profile', {id: user._id} as never)
                  }
                  style={styles.iconButton}>
                  {user.image ? (
                    <Image
                      source={{uri: user.image}}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: '#3B82F6'}]}>
                      <Text style={styles.avatarText}>
                        {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...SHADOWS.small,
  },
  content: {
    height: SIZES.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconButton: {
    padding: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
