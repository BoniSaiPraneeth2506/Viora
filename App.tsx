/**
 * Viora - YC Directory Mobile App
 * @format
 */

import React from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {AuthProvider} from './src/contexts/AuthContext';
import {SocketProvider} from './src/contexts/SocketContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {COLORS} from './src/constants/theme';

const AppContent = () => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent
      />
      <AppNavigator />
    </View>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: '#000000'}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

