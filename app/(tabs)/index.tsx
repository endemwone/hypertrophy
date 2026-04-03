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
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '@/constants/theme';
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
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Ready to suffer, <Text style={{ color: Colors.accent }}>{profile.name || 'Athlete'}</Text>?
          </Text>
          <View style={styles.streakPill}>
            <Feather name="zap" size={14} color={Colors.accent} />
            <Text style={styles.streakText}>
              {streak > 0 ? `${streak} DAY STREAK` : 'START YOUR STREAK'}
            </Text>
          </View>
        </View>

        {/* Deload Banner */}
        {showDeload && (
          <View style={styles.deloadBanner}>
            <Feather name="alert-triangle" size={20} color={Colors.warning} />
            <Text style={styles.deloadText}>
              Away for {daysSinceLastSession} days. Ease back in? 👀
            </Text>
            <TouchableOpacity
              onPress={() => setDeloadDismissed(true)}
              style={styles.deloadClose}
            >
              <Feather name="x" size={18} color={Colors.warning} />
            </TouchableOpacity>
          </View>
        )}

        {/* Chaos Mode Launcher */}
        <TouchableOpacity
          style={styles.chaosCard}
          onPress={handleChaosMode}
          activeOpacity={0.8}
        >
          <View style={styles.chaosGlow} />
          <View style={styles.chaosContent}>
            <View>
              <Text style={styles.chaosTitle}>🔀 CHAOS MODE™</Text>
              <Text style={styles.chaosSubtitle}>Generate a surprise session</Text>
            </View>
            <Feather name="zap" size={24} color={Colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Equipment Toggle */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>EQUIPMENT</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{availableEquipment.length} ACTIVE</Text>
          </View>
        </View>
        <EquipmentToggle />

        {/* Routines */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>YOUR ROUTINES</Text>
          <TouchableOpacity 
            onPress={() => {
              setEditRoutineId(null);
              setShowCreateModal(true);
            }}
          >
            <Text style={styles.addText}>NEW +</Text>
          </TouchableOpacity>
        </View>

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
          <View style={styles.routineGrid}>
            {routines.map((r) => (
              <RoutineCard
                key={r.id}
                routine={r}
                onPress={() => handleRoutinePress(r.id)}
                onLongPress={() => handleRoutineLongPress(r.id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxxl,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  streakText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deloadBanner: {
    backgroundColor: Colors.deloadBg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.deloadBorder,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deloadText: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    flex: 1,
  },
  deloadClose: {
    padding: Spacing.xs,
  },
  chaosCard: {
    marginHorizontal: Spacing.lg,
    height: 90,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  chaosGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: Colors.accent,
  },
  chaosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  chaosTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chaosSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '900',
    letterSpacing: 2,
  },
  addText: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
  },
  routineGrid: {
    paddingHorizontal: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accent,
  },
});
