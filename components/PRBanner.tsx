import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface PRBannerProps {
  exerciseName: string;
  newBest: number;
  onDismiss: () => void;
}

export default function PRBanner({ exerciseName, newBest, onDismiss }: PRBannerProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(0, { duration: 400 }),
      withDelay(2000, withTiming(-100, { duration: 400 }))
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 400 }),
      withDelay(2000, withTiming(0, { duration: 400 }))
    );

    const timer = setTimeout(() => {
      onDismiss();
    }, 2900);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.title}>NEW PR 🔥</Text>
      <Text style={styles.detail}>
        {exerciseName} — {newBest} reps
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.prGold,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    zIndex: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE44D',
  },
  title: {
    color: Colors.background,
    fontSize: FontSizes.xl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  detail: {
    color: Colors.background,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
});
