import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedProps,
  cancelAnimation,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RestTimerProps {
  duration: number;
  remaining: number;
  exerciseName: string;
  setContext: string; // e.g. "Set 2 of 3"
  onAdd30: () => void;
  onSkip: () => void;
  isActive: boolean;
}

const RING_SIZE = 220;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestTimer({
  duration,
  remaining,
  exerciseName,
  setContext,
  onAdd30,
  onSkip,
  isActive,
}: RestTimerProps) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (duration > 0) {
      progress.value = remaining / duration;
    }
  }, [remaining, duration]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
  };

  const handleAdd30 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAdd30();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  if (!isActive) {
    return (
      <View style={styles.minimalContainer}>
        <Text style={styles.minimalText}>Rest timer ready</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.exerciseName}>{exerciseName}</Text>
      <Text style={styles.setContext}>{setContext}</Text>

      <View style={styles.ringContainer}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={styles.svg}
        >
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={Colors.surfaceBorder}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={Colors.accent}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <Text style={styles.timerNumber}>{formatTime(remaining)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdd30}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+30s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  minimalContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  minimalText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  exerciseName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  setContext: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timerNumber: {
    color: Colors.textPrimary,
    fontSize: 80,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  addButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 48,
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  skipButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  skipButtonText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
