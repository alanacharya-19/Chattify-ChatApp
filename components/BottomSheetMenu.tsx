import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';

export interface MenuItem {
  icon?: string;
  iconColor?: string;
  label: string;
  labelColor?: string;
  onPress: () => void;
  destructive?: boolean;
  divider?: boolean;
}

interface BottomSheetMenuProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  title?: string;
}

export function BottomSheetMenu({
  visible,
  onClose,
  items,
  title,
}: BottomSheetMenuProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menuContainer,
                { backgroundColor: isDark ? theme.surface : '#FFFFFF' },
              ]}
            >
              <View style={[styles.header, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
                <View style={styles.handle} />
                {title && (
                  <Text style={[styles.title, { color: theme.textSecondary }]}>
                    {title}
                  </Text>
                )}
              </View>
              
              <View style={styles.menuContent}>
                {items.map((item, index) => (
                  <React.Fragment key={index}>
                    {item.divider && (
                      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                    )}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        item.onPress();
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      {item.icon && (
                        <View
                          style={[
                            styles.iconContainer,
                            {
                              backgroundColor: item.iconColor
                                ? `${item.iconColor}20`
                                : `${theme.primary}20`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={item.iconColor || theme.primary}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.menuLabel,
                          {
                            color: item.destructive
                              ? '#FF3B30'
                              : item.labelColor || theme.textPrimary,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: isDark ? theme.surface : '#F0F0F0' },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: theme.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContent: {
    paddingTop: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  cancelText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
