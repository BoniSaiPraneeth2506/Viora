/**
 * SettingsScreen — Instagram/YouTube-style static settings page
 * Clean grouped rows with logout at bottom
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  ArrowLeft,
  ChevronRight,
  User,
  Bell,
  Lock,
  Eye,
  Moon,
  Globe,
  HelpCircle,
  Info,
  Shield,
  Heart,
  LogOut,
  Smartphone,
} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants/theme';

/* ── row component ── */
interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
  colors: typeof COLORS.dark;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  trailing,
  danger,
  colors,
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress}>
    <View style={styles.rowIcon}>{icon}</View>
    <View style={styles.rowText}>
      <Text
        style={[
          styles.rowLabel,
          {color: danger ? '#FF3B30' : colors.text},
        ]}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.rowSub, {color: colors.textSecondary}]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {trailing || (
      onPress ? <ChevronRight size={18} color={colors.textSecondary} /> : null
    )}
  </TouchableOpacity>
);

/* ── section header ── */
const SectionHeader: React.FC<{title: string; color: string}> = ({
  title,
  color,
}) => (
  <Text style={[styles.sectionHeader, {color}]}>{title}</Text>
);

export const SettingsScreen: React.FC = () => {
  const {isDark, toggleTheme} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const navigation = useNavigation();
  const {signOut, user} = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            console.error('Logout error:', e);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Settings
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* ── Account ── */}
          <SectionHeader title="Account" color={colors.textSecondary} />
          <View style={[styles.card, {backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.border}]}>
            <SettingsRow
              icon={<User size={20} color={colors.text} />}
              label="Edit Profile"
              subtitle="Name, username, bio, photo"
              onPress={() => navigation.navigate('EditProfile' as never)}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Lock size={20} color={colors.text} />}
              label="Password"
              subtitle="Change your password"
              onPress={() => {}}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Smartphone size={20} color={colors.text} />}
              label="Linked Accounts"
              subtitle="Manage connected accounts"
              onPress={() => {}}
              colors={colors}
            />
          </View>

          {/* ── Preferences ── */}
          <SectionHeader title="Preferences" color={colors.textSecondary} />
          <View style={[styles.card, {backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.border}]}>
            <SettingsRow
              icon={<Bell size={20} color={colors.text} />}
              label="Notifications"
              subtitle="Push and in-app notifications"
              onPress={() => {}}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Moon size={20} color={colors.text} />}
              label="Dark Mode"
              trailing={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{false: '#767577', true: '#0095F6'}}
                  thumbColor="#fff"
                />
              }
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Globe size={20} color={colors.text} />}
              label="Language"
              subtitle="English"
              onPress={() => {}}
              colors={colors}
            />
          </View>

          {/* ── Privacy ── */}
          <SectionHeader title="Privacy & Security" color={colors.textSecondary} />
          <View style={[styles.card, {backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.border}]}>
            <SettingsRow
              icon={<Eye size={20} color={colors.text} />}
              label="Account Privacy"
              subtitle="Public account"
              onPress={() => {}}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Shield size={20} color={colors.text} />}
              label="Blocked Accounts"
              onPress={() => {}}
              colors={colors}
            />
          </View>

          {/* ── Support ── */}
          <SectionHeader title="Support" color={colors.textSecondary} />
          <View style={[styles.card, {backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.border}]}>
            <SettingsRow
              icon={<HelpCircle size={20} color={colors.text} />}
              label="Help Center"
              onPress={() => {}}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Heart size={20} color={colors.text} />}
              label="About Viora"
              subtitle="Version 1.0.0"
              onPress={() => {}}
              colors={colors}
            />
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <SettingsRow
              icon={<Info size={20} color={colors.text} />}
              label="Terms & Privacy Policy"
              onPress={() => {}}
              colors={colors}
            />
          </View>

          {/* ── Logout ── */}
          <View style={[styles.card, {backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.border, marginTop: 24}]}>
            <SettingsRow
              icon={<LogOut size={20} color="#FF3B30" />}
              label="Log Out"
              danger
              onPress={handleLogout}
              colors={colors}
            />
          </View>

          {/* Footer */}
          <Text style={[styles.footer, {color: colors.textSecondary}]}>
            Viora v1.0.0{'\n'}Made with love
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

/* ═══════════════════ Styles ═══════════════════ */
const styles = StyleSheet.create({
  container: {flex: 1},
  fill: {flex: 1},

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
  },
  backBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
  headerTitle: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},

  /* Scroll */
  scroll: {paddingHorizontal: 16, paddingBottom: 60},

  /* Section */
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  /* Card */
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {width: 28, alignItems: 'center'},
  rowText: {flex: 1, marginLeft: 14},
  rowLabel: {fontSize: 16, fontWeight: '400'},
  rowSub: {fontSize: 13, marginTop: 2},
  divider: {height: StyleSheet.hairlineWidth, marginLeft: 58},

  /* Footer */
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
    lineHeight: 18,
  },
});
