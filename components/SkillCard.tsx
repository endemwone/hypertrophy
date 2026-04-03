import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Exercise, useStore } from '@/store/useStore';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';

interface SkillCardProps {
  exercise: Exercise;
  onPress: () => void;
}

export default function SkillCard({ exercise, onPress }: SkillCardProps) {
  const unlockedExercises = useStore((s) => s.unlockedExercises);
  const getQualifyingSessions = useStore((s) => s.getQualifyingSessions);
  const profile = useStore((s) => s.profile);

  const isUnlocked = unlockedExercises.includes(exercise.id);
  const qualifyingCount = exercise.prevProgressionId
    ? getQualifyingSessions(exercise.prevProgressionId)
    : 0;

  const groupColor = MuscleGroupColors[exercise.group] || Colors.accent;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnlocked ? { borderColor: groupColor } : styles.cardLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Level Badge */}
      <View
        style={[
          styles.levelBadge,
          { backgroundColor: isUnlocked ? groupColor : Colors.textMuted },
        ]}
      >
        <Text style={styles.levelText}>{exercise.level}</Text>
      </View>

      {/* Exercise Name */}
      <Text
        style={[
          styles.name,
          !isUnlocked && styles.nameLocked,
        ]}
        numberOfLines={2}
      >
        {exercise.name}
      </Text>

      {/* Lock overlay */}
      {!isUnlocked && (
        <View style={styles.lockOverlay}>
          <Feather name="lock" size={16} color={Colors.textMuted} />
          <Text style={styles.lockText}>
            {qualifyingCount}/{profile.unlockThreshold}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    minHeight: 120,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
  },
  cardLocked: {
    opacity: 0.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.lockedBg,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  levelText: {
    color: Colors.background,
    fontSize: FontSizes.xs,
    fontWeight: '900',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  nameLocked: {
    color: Colors.textMuted,
  },
  lockOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  lockText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
