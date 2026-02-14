import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Camera, Video, X, Play} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface VideoPickerProps {
  onVideoSelected: (videoUri: string) => void;
  currentVideo?: string;
  error?: string;
}

export const VideoPickerComponent: React.FC<VideoPickerProps> = ({
  onVideoSelected,
  currentVideo,
  error,
}) => {
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  const [isUploading, setIsUploading] = useState(false);

  const requestPermission = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your media to upload videos.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync()},
        ]
      );
      return false;
    }
    return true;
  };

  const pickVideoFromGallery = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        duration: 60, // Max 60 seconds
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        onVideoSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const recordVideo = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to record videos.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync()},
        ]
      );
      return;
    }

    try {
      setIsUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets?.[0]) {
        onVideoSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const showVideoPicker = () => {
    Alert.alert(
      'Select Video',
      'Choose how you want to add a video',
      [
        {text: 'Record Video', onPress: recordVideo},
        {text: 'Choose from Gallery', onPress: pickVideoFromGallery},
        {text: 'Cancel', style: 'cancel'},
      ],
      {cancelable: true}
    );
  };

  const removeVideo = () => {
    onVideoSelected('');
  };

  const getVideoThumbnail = (uri: string) => {
    // For local video files, we'll show a placeholder with play icon
    if (uri.startsWith('file://')) {
      return null;
    }
    // For URLs, try to extract thumbnail or show placeholder
    return uri;
  };

  return (
    <View style={styles.container}>
      {currentVideo ? (
        <View style={styles.videoContainer}>
          {getVideoThumbnail(currentVideo) ? (
            <Image source={{uri: getVideoThumbnail(currentVideo)}} style={styles.selectedVideo} />
          ) : (
            <View style={[styles.videoPlaceholder, {backgroundColor: colors.card}]}>
              <Play size={48} color={colors.primary} />
              <Text style={[styles.videoPlaceholderText, {color: colors.textSecondary}]}>
                Video Selected
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.removeButton, {backgroundColor: '#EF4444'}]}
            onPress={removeVideo}
            activeOpacity={0.7}>
            <X size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.changeButton, {backgroundColor: colors.primary}]}
            onPress={showVideoPicker}
            disabled={isUploading}
            activeOpacity={0.7}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.uploadContainer,
            {
              backgroundColor: colors.card,
              borderColor: error ? '#EF4444' : colors.border,
            },
          ]}
          onPress={showVideoPicker}
          disabled={isUploading}
          activeOpacity={0.7}>
          <View style={styles.uploadContent}>
            <View style={[styles.iconContainer, {backgroundColor: colors.primary}]}>
              <Video size={24} color="white" />
            </View>
            <Text style={[styles.uploadTitle, {color: colors.text}]}>
              {isUploading ? 'Uploading...' : 'Add Video'}
            </Text>
            <Text style={[styles.uploadSubtitle, {color: colors.textSecondary}]}>
              Tap to record or choose from gallery (max 60s)
            </Text>
            <View style={styles.buttonRow}>
              <View style={[styles.actionButton, {borderColor: colors.border}]}>
                <Camera size={16} color={colors.textSecondary} />
                <Text style={[styles.actionButtonText, {color: colors.textSecondary}]}>
                  Record
                </Text>
              </View>
              <View style={[styles.actionButton, {borderColor: colors.border}]}>
                <Video size={16} color={colors.textSecondary} />
                <Text style={[styles.actionButtonText, {color: colors.textSecondary}]}>
                  Gallery
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  videoContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
  },
  selectedVideo: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.medium,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  videoPlaceholderText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  changeButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small,
  },
  changeButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '600',
  },
  uploadContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.xl,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  uploadContent: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  uploadTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  uploadSubtitle: {
    fontSize: FONT_SIZES.bodySmall,
    textAlign: 'center',
    lineHeight: FONT_SIZES.bodySmall * 1.4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '500',
  },
});