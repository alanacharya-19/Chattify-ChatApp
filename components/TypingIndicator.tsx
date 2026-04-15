import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius } from '@/constants/theme';

interface TypingIndicatorProps {
  name?: string;
}

export function TypingIndicator({ name = 'User' }: TypingIndicatorProps) {
  const { theme } = useTheme();
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createAnimation = (opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createAnimation(dot1Opacity, 0);
    const animation2 = createAnimation(dot2Opacity, 200);
    const animation3 = createAnimation(dot3Opacity, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={[styles.container, { backgroundColor: theme.messageReceived, borderRadius: BorderRadius.lg }]}>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary, opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary, opacity: dot2Opacity }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary, opacity: dot3Opacity }]} />
      </View>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{name} is typing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
