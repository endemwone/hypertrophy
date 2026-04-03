import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface UnlockBannerProps {
  exerciseName: string;
  level: number;
  index: number; // for staggered animation
  onDismiss: () => void;
}

export default function UnlockBanner({ exerciseName, level, index, onDismiss }: UnlockBannerProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const staggerDelay = index * 600;

    translateY.value = withDelay(
      staggerDelay,
      withSequence(
        withTiming(0, { duration: 500 }),
        withDelay(2500, withTiming(100, { duration: 400 }))
      )
    );
    opacity.value = withDelay(
      staggerDelay,
      withSequence(
        withTiming(1, { duration: 500 }),
        withDelay(2500, withTiming(0, { duration: 400 }))
      )
    );
    scale.value = withDelay(
      staggerDelay,
      withSequence(
        withTiming(1.05, { duration: 300 }),
        withTiming(1, { duration: 200 }),
        withDelay(2500, withTiming(0.8, { duration: 400 }))
      )
    );

    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, staggerDelay);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, staggerDelay + 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.iconContainer}>
        <Text style={styles.lockIcon}>🔓</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>SKILL UNLOCKED</Text>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
        <Text style={styles.level}>Level {level}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.unlockGreenBg,
    borderWidth: 2,
    borderColor: Colors.unlockGreen,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.unlockGreen,
    fontSize: FontSizes.xs,
    fontWeight: '900',
    letterSpacing: 3,
  },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  level: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
});
