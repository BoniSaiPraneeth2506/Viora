import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {MoreVertical, Edit, Trash2} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {sanityWriteClient} from '../lib/write-client';
import {COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS} from '../constants/theme';

interface KebabMenuProps {
  startupId: string;
  onDeleteSuccess?: () => void;
}

export const KebabMenu: React.FC<KebabMenuProps> = ({startupId, onDeleteSuccess}) => {
  const navigation = useNavigation();
  const {isDark} = useTheme();
  const colors = isDark ? COLORS.dark : COLORS.light;
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    setMenuVisible(false);
    (navigation.navigate as any)('EditPost', {id: startupId});
  };

  const handleDelete = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Delete Startup',
      'Are you sure you want to delete this startup? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
      {cancelable: true}
    );
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Delete the startup document
      await sanityWriteClient.delete(startupId);
      
      Alert.alert(
        'Success',
        'Startup deleted successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onDeleteSuccess) {
                onDeleteSuccess();
              } else {
                navigation.goBack();
              }
            },
          },
        ],
        {cancelable: false}
      );
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert(
        'Error',
        'Failed to delete startup. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        style={[styles.menuButton, {backgroundColor: colors.card, borderColor: colors.border}]}
        disabled={isDeleting}
        activeOpacity={0.7}>
        {isDeleting ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <MoreVertical size={18} color={colors.text} strokeWidth={2.5} />
        )}
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        statusBarTranslucent>
        <Pressable 
          style={styles.backdrop} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.menu, {backgroundColor: colors.card}, SHADOWS.large]}>
                {/* Edit Option */}
                <TouchableOpacity
                  style={[styles.menuItem, {borderBottomColor: colors.border}]}
                  onPress={handleEdit}
                  activeOpacity={0.6}>
                  <View style={[styles.iconCircle, {backgroundColor: '#DBEAFE'}]}>
                    <Edit size={16} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.menuText, {color: colors.text}]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* Delete Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDelete}
                  activeOpacity={0.6}>
                  <View style={[styles.iconCircle, {backgroundColor: '#FEE2E2'}]}>
                    <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.menuText, {color: '#EF4444'}]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.circle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...SHADOWS.small,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 105,
    paddingRight: SPACING.xl,
  },
  menuContainer: {
    minWidth: 140,
  },
  menu: {
    borderRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.circle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: '500',
  },
});
