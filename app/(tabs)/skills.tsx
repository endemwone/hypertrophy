import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { MuscleGroup, Exercise, Equipment } from '@/store/types';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';
import ProgressionRail from '@/components/ProgressionRail';
import AddExerciseModal from '@/components/AddExerciseModal';

const GROUPS: MuscleGroup[] = ['Push', 'Pull', 'Core', 'Legs'];

export default function SkillTreeScreen() {
  const insets = useSafeAreaInsets();
  const exercises = useStore((s) => s.exercises);
  const unlockedExercises = useStore((s) => s.unlockedExercises);
  const getQualifyingSessions = useStore((s) => s.getQualifyingSessions);
  const profile = useStore((s) => s.profile);
  const routines = useStore((s) => s.routines);
  const updateRoutine = useStore((s) => s.updateRoutine);

  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>('Push');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);

  // Build progression chains for selected group
  const chains = useMemo(() => {
    const groupExercises = Object.values(exercises).filter(
      (ex) => ex.group === selectedGroup
    );

    // Find root exercises (no prevProgressionId)
    const roots = groupExercises.filter(
      (ex) => !ex.prevProgressionId
    );

    const result: { name: string; exercises: Exercise[] }[] = [];

    for (const root of roots) {
      const chain: Exercise[] = [root];
      let current = root;
      while (current.nextProgressionId) {
        const next = exercises[current.nextProgressionId];
        if (!next) break;
        chain.push(next);
        current = next;
      }
      result.push({
        name: root.name.replace(/\s/g, ' ') + ' Line',
        exercises: chain,
      });
    }

    // Add standalone custom exercises (no progression chain)
    const chainedIds = new Set(result.flatMap((c) => c.exercises.map((e) => e.id)));
    const standalones = groupExercises.filter((ex) => !chainedIds.has(ex.id));
    if (standalones.length > 0) {
      result.push({
        name: 'Custom',
        exercises: standalones,
      });
    }

    return result;
  }, [exercises, selectedGroup]);

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const handleAddToRoutine = (routineId: string) => {
    if (!selectedExercise) return;
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;

    if (routine.exerciseIds.includes(selectedExercise.id)) {
      Alert.alert('Already added', 'This exercise is already in the routine.');
      return;
    }

    updateRoutine(routineId, {
      exerciseIds: [...routine.exerciseIds, selectedExercise.id],
    });
    setShowRoutinePicker(false);
    setSelectedExercise(null);
  };

  const isUnlocked = selectedExercise
    ? unlockedExercises.includes(selectedExercise.id)
    : false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Text style={styles.title}>Skill Tree</Text>

      {/* Group Tabs */}
      <View style={styles.tabRow}>
        {GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.tab,
              selectedGroup === g && {
                borderBottomColor: MuscleGroupColors[g],
              },
            ]}
            onPress={() => setSelectedGroup(g)}
          >
            <Text
              style={[
                styles.tabText,
                selectedGroup === g && {
                  color: MuscleGroupColors[g],
                },
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progression Rails */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chains.map((chain) => (
          <ProgressionRail
            key={chain.name}
            chainName={chain.name}
            exercises={chain.exercises}
            onExercisePress={handleExercisePress}
          />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color={Colors.background} />
      </TouchableOpacity>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Exercise Detail Bottom Sheet */}
      <Modal
        visible={!!selectedExercise}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedExercise(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedExercise(null)}
        >
          <View style={styles.sheet}>
            {selectedExercise && (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{selectedExercise.name}</Text>
                <View style={styles.sheetRow}>
                  <View
                    style={[
                      styles.levelBadge,
                      {
                        backgroundColor: isUnlocked
                          ? MuscleGroupColors[selectedExercise.group]
                          : Colors.textMuted,
                      },
                    ]}
                  >
                    <Text style={styles.levelText}>
                      Lv.{selectedExercise.level}
                    </Text>
                  </View>
                  <Text style={styles.sheetGroup}>{selectedExercise.group}</Text>
                </View>

                {/* Equipment */}
                <Text style={styles.sheetLabel}>EQUIPMENT</Text>
                <View style={styles.equipRow}>
                  {selectedExercise.equipment.map((eq) => (
                    <View key={eq} style={styles.equipPill}>
                      <Text style={styles.equipText}>{eq}</Text>
                    </View>
                  ))}
                </View>

                {/* Unlock requirements */}
                {selectedExercise.nextProgressionId && isUnlocked && (
                  <>
                    <Text style={styles.sheetLabel}>UNLOCK NEXT</Text>
                    <Text style={styles.sheetDesc}>
                      Hit {selectedExercise.targetRepsToUnlock} reps ×{' '}
                      {selectedExercise.targetSetsToUnlock} sets for{' '}
                      {profile.unlockThreshold} sessions to unlock next skill
                    </Text>
                    <Text style={styles.progressText}>
                      Progress: {getQualifyingSessions(selectedExercise.id)}/
                      {profile.unlockThreshold} qualifying sessions
                    </Text>
                  </>
                )}

                {!isUnlocked && selectedExercise.prevProgressionId && (
                  <>
                    <Text style={styles.sheetLabel}>HOW TO UNLOCK</Text>
                    <Text style={styles.sheetDesc}>
                      Complete{' '}
                      {exercises[selectedExercise.prevProgressionId]?.name ||
                        'the previous exercise'}{' '}
                      for {profile.unlockThreshold} qualifying sessions
                    </Text>
                  </>
                )}

                {/* Form Cues */}
                {selectedExercise.formCues.length > 0 && (
                  <>
                    <Text style={styles.sheetLabel}>FORM CUES</Text>
                    {selectedExercise.formCues.map((cue, i) => (
                      <View key={i} style={styles.cueRow}>
                        <Text style={styles.cueBullet}>•</Text>
                        <Text style={styles.cueText}>{cue}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Add to Routine */}
                {isUnlocked && (
                  <TouchableOpacity
                    style={styles.addToRoutineBtn}
                    onPress={() => setShowRoutinePicker(true)}
                  >
                    <Feather
                      name="plus"
                      size={18}
                      color={Colors.background}
                    />
                    <Text style={styles.addToRoutineText}>Add to Routine</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Routine Picker */}
      <Modal
        visible={showRoutinePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoutinePicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add to Routine</Text>
            {routines.length === 0 ? (
              <Text style={styles.emptyText}>
                No routines yet. Create one from the Dashboard.
              </Text>
            ) : (
              routines.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.routinePickRow}
                  onPress={() => handleAddToRoutine(r.id)}
                >
                  <Text style={styles.routinePickName}>{r.name}</Text>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowRoutinePicker(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: Spacing.md,
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  levelText: {
    color: Colors.background,
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  sheetGroup: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sheetLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  equipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  equipPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  equipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  sheetDesc: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  progressText: {
    color: Colors.accent,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  cueRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cueBullet: {
    color: Colors.accent,
    fontSize: FontSizes.md,
  },
  cueText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    flex: 1,
    lineHeight: 22,
  },
  addToRoutineBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    minHeight: 56,
  },
  addToRoutineText: {
    color: Colors.background,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  routinePickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 56,
  },
  routinePickName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  cancelBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 48,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
