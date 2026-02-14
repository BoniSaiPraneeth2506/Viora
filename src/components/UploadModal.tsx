import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {FileText, Video} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
}

const UploadModalComponent: React.FC<UploadModalProps> = ({visible, onClose}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;

  // useCallback prevents re-creating functions on every render
  const handleCreatePost = useCallback(() => {
    // Navigate FIRST for instant response
    navigation.navigate('CreatePost' as never);
    // Close overlay immediately
    onClose();
  }, [navigation, onClose]);

  const handleCreateReel = useCallback(() => {
    // Navigate FIRST for instant response
    navigation.navigate('CreateReel' as never);
    // Close overlay immediately
    onClose();
  }, [navigation, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Pressable 
        style={styles.backdrop} 
        onPress={onClose}
      >
        {/* Menu positioned at bottom */}
        <View style={styles.menuWrapper}>
          <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.menu, {backgroundColor: colors.card}]}>
                {/* Create Post Option */}
                <TouchableOpacity
                  style={[styles.option, {borderBottomColor: colors.border}]}
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
                  style={styles.option}
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
                  onPress={onClose}
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
  );
};

// React.memo prevents unnecessary re-renders
export const UploadModal = React.memo(UploadModalComponent);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
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
  option: {
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
});
