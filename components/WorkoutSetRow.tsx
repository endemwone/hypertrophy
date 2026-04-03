import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorkoutSet } from '@/store/useStore';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface WorkoutSetRowProps {
  set: WorkoutSet;
  index: number;
}

export default function WorkoutSetRow({ set, index }: WorkoutSetRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.setNumber}>Set {index + 1}</Text>
      <Text style={styles.reps}>{set.reps} reps</Text>
      {set.weightAdded > 0 && (
        <Text style={styles.weight}>+{set.weightAdded}kg</Text>
      )}
      {set.isSuperset && (
        <Text style={styles.supersetBadge}>SS</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  setNumber: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    width: 50,
  },
  reps: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  weight: {
    color: Colors.accent,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  supersetBadge: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
