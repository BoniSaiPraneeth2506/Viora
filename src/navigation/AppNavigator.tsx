import React from 'react';
import {NavigationContainer, DefaultTheme, DarkTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS} from '../constants/theme';
import {LoginScreen} from '../screens/LoginScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {ReelsScreen} from '../screens/ReelsScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {MessagesScreen} from '../screens/MessagesScreen';
import {CreateScreen} from '../screens/CreateScreen';
import {CreatePostScreen} from '../screens/CreatePostScreen';
import {CreateReelScreen} from '../screens/CreateReelScreen';
import {EditPostScreen} from '../screens/EditPostScreen';
import {EditProfileScreen} from '../screens/EditProfileScreen';
import {FollowListScreen} from '../screens/FollowListScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {StartupDetailScreen} from '../screens/StartupDetailScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Hide tab bar for these screens
const screensWithoutTabs = [
  'Login',
  'StartupDetail',
  'CreatePost',
  'CreateReel',
  'EditPost',
  'EditProfile',
  'FollowList',
  'Chat',
];

export const AppNavigator = () => {
  const {isAuthenticated, isLoading} = useAuth();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  // Custom navigation theme to prevent white flash
  const navigationTheme = {
    ...isDark ? DarkTheme : DefaultTheme,
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  if (isLoading) {
    return null; // Could show splash screen here
  }

  return (
    <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            presentation: 'card',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            contentStyle: {
              backgroundColor: colors.background,
            },
            animationTypeForReplace: 'push',
          }}>
          {!isAuthenticated ? (
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{
                gestureEnabled: false, // Disable swipe back on login
              }}
            />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="StartupDetail" component={StartupDetailScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="CreatePost" component={CreatePostScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="FollowList" component={FollowListScreen} />
              <Stack.Screen name="CreateReel" component={CreateReelScreen} />
              <Stack.Screen name="EditPost" component={EditPostScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
  );
};

const MainTabs = () => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {display: 'none'}, // We use custom BottomNav
        lazy: false, // Prevent lazy loading that causes white flash
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Create" component={CreateScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
