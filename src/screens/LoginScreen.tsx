import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Mail, Lock, User} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SIZES} from '../constants/theme';

export const LoginScreen: React.FC = () => {
  const {isDark} = useTheme();
  const {signIn, signUp} = useAuth();
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp && (!name.trim() || !username.trim())) {
      Alert.alert('Error', 'Please enter your name and username');
      return;
    }

    setLoading(true);
    try {
      let success;
      if (isSignUp) {
        success = await signUp(email.trim(), password, name.trim(), username.trim());
      } else {
        success = await signIn(email.trim(), password);
      }

      if (success) {
        // Auth context will handle navigation
        console.log(isSignUp ? 'Sign up successful' : 'Sign in successful');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
    setName('');
    setUsername('');
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}>
        {/* Logo/Branding */}
        <View style={styles.header}>
          <Text style={[styles.logo, {color: colors.primary}]}>
            Viora
          </Text>
          <Text style={[styles.appName, {color: colors.text}]}>
            YC Directory
          </Text>
          <Text style={[styles.tagline, {color: colors.textSecondary}]}>
            Pitch Your Startup, Connect With Entrepreneurs
          </Text>
        </View>

        {/* Auth Form */}
        <View style={styles.formSection}>
          {/* Sign Up Fields */}
          {isSignUp && (
            <>
              <View style={[styles.inputContainer, {borderColor: colors.border}]}>
                <User size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, {color: colors.text}]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={[styles.inputContainer, {borderColor: colors.border}]}>
                <User size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, {color: colors.text}]}
                  placeholder="Username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </>
          )}

          {/* Email Field */}
          <View style={[styles.inputContainer, {borderColor: colors.border}]}>
            <Mail size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, {color: colors.text}]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Password Field */}
          <View style={[styles.inputContainer, {borderColor: colors.border}]}>
            <Lock size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, {color: colors.text}]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {backgroundColor: colors.primary},
              loading && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Mode */}
          <TouchableOpacity
            onPress={toggleMode}
            disabled={loading}
            style={styles.toggleButton}>
            <Text style={[styles.toggleText, {color: colors.textSecondary}]}>
              {isSignUp
                ? 'Already have an account? '
                : "Don't have an account? "}
              <Text style={[styles.toggleLink, {color: colors.primary}]}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </TouchableOpacity>

          <Text style={[styles.terms, {color: colors.textSecondary}]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  tagline: {
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.lg,
    height: SIZES.button,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    height: '100%',
  },
  submitButton: {
    width: '100%',
    height: SIZES.button,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  toggleText: {
    fontSize: FONT_SIZES.body,
  },
  toggleLink: {
    fontWeight: '600',
  },
  terms: {
    fontSize: FONT_SIZES.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
