import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {NavBar} from '../components/NavBar';
import {BottomNav} from '../components/BottomNav';
import {COLORS} from '../constants/theme';

// This is a placeholder screen that should never actually be shown
// The Create button in BottomNav opens a modal instead
export const CreateScreen: React.FC = () => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  // Empty placeholder screen
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      <View style={styles.content} />
      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
