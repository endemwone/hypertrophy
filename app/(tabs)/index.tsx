import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { MuscleGroup, Exercise, Equipment } from '@/store/types';
import { getTodayString, daysBetween } from '@/utils/dateUtils';
import { generateUUID } from '@/utils/uuid';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import EquipmentToggle from '@/components/EquipmentToggle';
import RoutineCard from '@/components/RoutineCard';
import CreateRoutineModal from '@/components/CreateRoutineModal';

const GREETINGS = [
  "Ready to suffer, {name}?",
  "Time to earn it, {name}.",
  "No excuses, {name}. Let's go.",
  "Gains don't wait, {name}.",
  "Let's build something, {name}.",
];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const routines = useStore((s) => s.routines);
  const sessions = useStore((s) => s.sessions);
  const exercises = useStore((s) => s.exercises);
  const unlockedExercises = useStore((s) => s.unlockedExercises);
  const availableEquipment = useStore((s) => s.availableEquipment);
  const getCurrentStreak = useStore((s) => s.getCurrentStreak);
  const deleteRoutine = useStore((s) => s.deleteRoutine);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRoutineId, setEditRoutineId] = useState<string | null>(null);
  const [deloadDismissed, setDeloadDismissed] = useState(false);

  // Greeting
  const greeting = useMemo(() => {
    const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    return g.replace('{name}', profile.name || 'Athlete');
  }, []);

  // Streak
  const streak = getCurrentStreak();

  // Deload
  const daysSinceLastSession = useMemo(() => {
    if (sessions.length === 0) return null;
    const lastDate = sessions[sessions.length - 1].date;
    return daysBetween(lastDate, getTodayString());
  }, [sessions]);

  const showDeload =
    !deloadDismissed &&
    daysSinceLastSession !== null &&
    daysSinceLastSession >= 7;

  // Chaos Mode
  const handleChaosMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const compatible = unlockedExercises
      .map((id) => exercises[id])
      .filter(
        (ex): ex is Exercise =>
          !!ex && ex.equipment.some((eq) => availableEquipment.includes(eq))
      );

    const grouped = {
      Push: compatible.filter((e) => e.group === 'Push'),
      Pull: compatible.filter((e) => e.group === 'Pull'),
      Core: compatible.filter((e) => e.group === 'Core'),
      Legs: compatible.filter((e) => e.group === 'Legs'),
    };

    const shuffle = <T,>(arr: T[]): T[] =>
      [...arr].sort(() => Math.random() - 0.5);

    const picked: Exercise[] = [
      ...shuffle(grouped.Push).slice(0, 2),
      ...shuffle(grouped.Pull).slice(0, 2),
      ...shuffle(grouped.Core).slice(0, 1),
    ];

    // Fill remaining if any group was underpopulated
    if (picked.length < 5) {
      const remaining = compatible.filter(
        (e) => !picked.some((p) => p.id === e.id)
      );
      const needed = 5 - picked.length;
      picked.push(...shuffle(remaining).slice(0, needed));
    }

    if (picked.length === 0) {
      Alert.alert('No exercises available', 'Add equipment or unlock more skills first.');
      return;
    }

    // Navigate via a special chaos mode ID
    const chaosExerciseIds = picked.map((e) => e.id).join(',');
    router.push(`/workout/chaos?exercises=${chaosExerciseIds}`);
  }, [unlockedExercises, exercises, availableEquipment]);

  const handleRoutinePress = (routineId: string) => {
    router.push(`/workout/${routineId}`);
  };

  const handleRoutineLongPress = (routineId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Routine Actions', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditRoutineId(routineId);
          setShowCreateModal(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRoutine(routineId),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Text style={styles.greeting}>{greeting}</Text>

        {/* Streak */}
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>
            {streak > 0
              ? `🔥 ${streak} day streak`
              : 'Start your streak today.'}
          </Text>
        </View>

        {/* Deload Banner */}
        {showDeload && (
          <View style={styles.deloadBanner}>
            <Text style={styles.deloadText}>
              You've been away for {daysSinceLastSession} days. Ease back in? 👀
            </Text>
            <TouchableOpacity
              onPress={() => setDeloadDismissed(true)}
              style={styles.deloadClose}
            >
              <Feather name="x" size={18} color={Colors.warning} />
            </TouchableOpacity>
          </View>
        )}

        {/* Equipment Toggle */}
        <Text style={styles.sectionLabel}>EQUIPMENT</Text>
        <EquipmentToggle />

        {/* Chaos Mode */}
        <TouchableOpacity
          style={styles.chaosButton}
          onPress={handleChaosMode}
          activeOpacity={0.7}
        >
          <Text style={styles.chaosText}>🎲 Chaos Mode — Surprise Me</Text>
        </TouchableOpacity>

        {/* Routines */}
        <Text style={styles.sectionLabel}>YOUR ROUTINES</Text>

        {routines.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => {
              setEditRoutineId(null);
              setShowCreateModal(true);
            }}
          >
            <Feather name="plus-circle" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Create your first routine</Text>
          </TouchableOpacity>
        ) : (
          routines.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              onPress={() => handleRoutinePress(r.id)}
              onLongPress={() => handleRoutineLongPress(r.id)}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => {
          setEditRoutineId(null);
          setShowCreateModal(true);
        }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color={Colors.background} />
      </TouchableOpacity>

      {/* Create/Edit Routine Modal */}
      <CreateRoutineModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditRoutineId(null);
        }}
        editRoutineId={editRoutineId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  streakPill: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  streakText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  deloadBanner: {
    backgroundColor: Colors.deloadBg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.deloadBorder,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deloadText: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  deloadClose: {
    padding: Spacing.sm,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  chaosButton: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  chaosText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl + Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
