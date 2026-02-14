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
import {Camera, ImageIcon, X} from 'lucide-react-native';
import {useTheme} from '../contexts/ThemeContext';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS} from '../constants/theme';

interface ImagePickerProps {
  onImageSelected: (imageUri: string) => void;
  currentImage?: string;
  error?: string;
}

export const ImagePickerComponent: React.FC<ImagePickerProps> = ({
  onImageSelected,
  currentImage,
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
        'We need access to your photos to upload images.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync()},
        ]
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const takePhoto = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to take photos.',
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
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        {text: 'Camera', onPress: takePhoto},
        {text: 'Gallery', onPress: pickImageFromGallery},
        {text: 'Cancel', style: 'cancel'},
      ],
      {cancelable: true}
    );
  };

  const removeImage = () => {
    onImageSelected('');
  };

  return (
    <View style={styles.container}>
      {currentImage ? (
        <View style={styles.imageContainer}>
          <Image source={{uri: currentImage}} style={styles.selectedImage} />
          <TouchableOpacity
            style={[styles.removeButton, {backgroundColor: '#EF4444'}]}
            onPress={removeImage}
            activeOpacity={0.7}>
            <X size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.changeButton, {backgroundColor: colors.primary}]}
            onPress={showImagePicker}
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
          onPress={showImagePicker}
          disabled={isUploading}
          activeOpacity={0.7}>
          <View style={styles.uploadContent}>
            <View style={[styles.iconContainer, {backgroundColor: colors.primary}]}>
              <ImageIcon size={24} color="white" />
            </View>
            <Text style={[styles.uploadTitle, {color: colors.text}]}>
              {isUploading ? 'Uploading...' : 'Add Image'}
            </Text>
            <Text style={[styles.uploadSubtitle, {color: colors.textSecondary}]}>
              Tap to choose from gallery or take a photo
            </Text>
            <View style={styles.buttonRow}>
              <View style={[styles.actionButton, {borderColor: colors.border}]}>
                <Camera size={16} color={colors.textSecondary} />
                <Text style={[styles.actionButtonText, {color: colors.textSecondary}]}>
                  Camera
                </Text>
              </View>
              <View style={[styles.actionButton, {borderColor: colors.border}]}>
                <ImageIcon size={16} color={colors.textSecondary} />
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
  imageContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.medium,
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