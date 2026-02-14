import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {NavBar} from '../components/NavBar';
import {PostForm} from '../components/PostForm';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

export const CreatePostScreen: React.FC = () => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <NavBar />
      <PostForm />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
