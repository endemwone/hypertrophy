import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Routine, useStore } from '@/store/useStore';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  onLongPress: () => void;
}

const EQUIPMENT_ICONS: Record<string, string> = {
  None: '🏋️',
  'Pullup Bar': '🔩',
  Rings: '⭕',
  Parallettes: '🤸',
  Wall: '🧱',
};

export default function RoutineCard({ routine, onPress, onLongPress }: RoutineCardProps) {
  const exercises = useStore((s) => s.exercises);
  const profile = useStore((s) => s.profile);

  const exerciseCount = routine.exerciseIds.length;
  const avgSetsPerExercise = 3;
  const restSeconds = profile.restTimerDuration || 90;
  const estimatedMinutes = Math.round(
    (exerciseCount * avgSetsPerExercise * (restSeconds + 30)) / 60
  );

  // Collect unique equipment needed
  const equipmentNeeded = new Set<string>();
  routine.exerciseIds.forEach((exId) => {
    const ex = exercises[exId];
    if (ex) {
      ex.equipment.forEach((eq) => equipmentNeeded.add(eq));
    }
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {routine.name}
        </Text>
        <Feather name="chevron-right" size={20} color={Colors.textMuted} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="list" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Feather name="clock" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>~{estimatedMinutes} min</Text>
        </View>

        <View style={styles.metaItem}>
          {Array.from(equipmentNeeded).map((eq) => (
            <Text key={eq} style={styles.equipIcon}>
              {EQUIPMENT_ICONS[eq] || '❓'}
            </Text>
          ))}
        </View>
      </View>

      {routine.supersetPairs.length > 0 && (
        <View style={styles.supersetBadge}>
          <Feather name="repeat" size={12} color={Colors.accent} />
          <Text style={styles.supersetText}>
            {routine.supersetPairs.length} superset{routine.supersetPairs.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  equipIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  supersetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  supersetText: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
