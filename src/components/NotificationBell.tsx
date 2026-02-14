import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Bell} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {sanityClient} from '../lib/sanity';
import {UNREAD_NOTIFICATION_COUNT_QUERY} from '../lib/queries';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

export const NotificationBell: React.FC = React.memo(() => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [unreadCount, setUnreadCount] = useState(0);
  const isFetchingRef = useRef(false);

  const fetchUnreadCount = async (silent = false) => {
    if (!user?._id || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      const count = await sanityClient.fetch<number>(
        UNREAD_NOTIFICATION_COUNT_QUERY,
        {userId: user._id}
      );
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Initial fetch only
  useEffect(() => {
    fetchUnreadCount();
  }, [user?._id]);

  // Refresh count when returning to notification screen only
  useFocusEffect(
    React.useCallback(() => {
      // Only refetch silently when needed
      fetchUnreadCount(true);
    }, [])
  );

  // Poll for new notifications every 30 seconds (silent updates)
  useEffect(() => {
    if (!user?._id) return;

    const interval = setInterval(() => {
      // Silent notification check - no logging
      fetchUnreadCount(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [user?._id]);

  const handlePress = () => {
    navigation.navigate('Notifications' as never);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
      <View style={styles.bellContainer}>
        <Bell size={24} color={colors.text} />
        
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: SPACING.sm,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});