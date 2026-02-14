import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {NavBar} from '../components/NavBar';
import {ReelForm} from '../components/ReelForm';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

export const CreateReelScreen: React.FC = () => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      <ReelForm />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
