import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius } from '@/constants/theme';

interface ChatBubbleProps {
  text: string;
  time: string;
  isSent: boolean;
  isConsecutive?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  showTail?: boolean;
}

export function ChatBubble({
  text,
  time,
  isSent,
  isConsecutive = false,
  status = 'sent',
}: ChatBubbleProps) {
  const { theme, isDark } = useTheme();

  const bubbleStyle = isSent
    ? {
        backgroundColor: isDark ? theme.messageSent : theme.messageSent,
        borderBottomRightRadius: isConsecutive ? 4 : BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        borderTopLeftRadius: BorderRadius.lg,
        borderBottomLeftRadius: BorderRadius.lg,
      }
    : {
        backgroundColor: theme.messageReceived,
        borderBottomLeftRadius: isConsecutive ? 4 : BorderRadius.lg,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        borderBottomRightRadius: BorderRadius.lg,
      };

  const textColor = isSent ? (isDark ? '#FFFFFF' : '#000000') : theme.textPrimary;

  const renderStatus = () => {
    if (!isSent) return null;

    const iconColor =
      status === 'read'
        ? theme.read
        : status === 'delivered'
        ? theme.delivered
        : theme.delivered;

    if (status === 'sending') {
      return <Ionicons name="time-outline" size={14} color={theme.delivered} />;
    }

    if (status === 'read') {
      return (
        <View style={styles.doubleCheck}>
          <Ionicons name="checkmark" size={14} color={iconColor} />
          <Ionicons name="checkmark" size={14} color={iconColor} style={styles.secondCheck} />
        </View>
      );
    }

    return <Ionicons name="checkmark" size={14} color={iconColor} />;
  };

  return (
    <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
      <View style={[styles.bubble, bubbleStyle]}>
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
        <View style={styles.footer}>
          <Text style={[styles.time, { color: isSent ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : theme.textMuted }]}>
            {time}
          </Text>
          <View style={styles.statusContainer}>{renderStatus()}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  time: {
    fontSize: 11,
  },
  statusContainer: {
    marginLeft: 4,
    flexDirection: 'row',
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: -4,
  },
  secondCheck: {
    marginLeft: -8,
  },
});
