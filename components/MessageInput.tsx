import React, { useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Message',
}: MessageInputProps) {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const sendButtonScale = useRef(new Animated.Value(0)).current;
  const micButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value.trim().length > 0) {
      Animated.parallel([
        Animated.spring(sendButtonScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(micButtonScale, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(sendButtonScale, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(micButtonScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    }
  }, [value, sendButtonScale, micButtonScale]);

  const handleSend = () => {
    if (value.trim().length > 0) {
      onSend();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
      <View style={styles.leftActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="attach-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isDark ? theme.inputBg : theme.inputBg, borderRadius: BorderRadius.xl },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={1000}
        />
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="happy-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        {value.trim().length > 0 ? (
          <Animated.View
            style={[
              styles.sendButton,
              { transform: [{ scale: sendButtonScale }], backgroundColor: theme.primary },
            ]}
          >
            <TouchableOpacity onPress={handleSend} style={styles.sendButtonInner}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.sendButton,
              { transform: [{ scale: micButtonScale }], backgroundColor: theme.primary },
            ]}
          >
            <TouchableOpacity style={styles.sendButtonInner}>
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
