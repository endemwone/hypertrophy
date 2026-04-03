import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore, Exercise, MuscleGroup } from '@/store/useStore';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';

interface CreateRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  editRoutineId?: string | null;
}

export default function CreateRoutineModal({
  visible,
  onClose,
  editRoutineId,
}: CreateRoutineModalProps) {
  const exercises = useStore((s) => s.exercises);
  const unlockedExercises = useStore((s) => s.unlockedExercises);
  const availableEquipment = useStore((s) => s.availableEquipment);
  const createRoutine = useStore((s) => s.createRoutine);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const routines = useStore((s) => s.routines);
  const addSupersetPair = useStore((s) => s.addSupersetPair);

  const editRoutine = editRoutineId
    ? routines.find((r) => r.id === editRoutineId)
    : null;

  const [name, setName] = useState(editRoutine?.name || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    editRoutine?.exerciseIds || []
  );
  const [supersetPairs, setSupersetPairs] = useState<[string, string][]>(
    editRoutine?.supersetPairs || []
  );
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | 'All'>('All');

  // Available exercises - unlocked and equipment-compatible
  const availableExercises = useMemo(() => {
    return unlockedExercises
      .map((id) => exercises[id])
      .filter((ex): ex is Exercise => {
        if (!ex) return false;
        return ex.equipment.some((eq) => availableEquipment.includes(eq));
      })
      .filter(
        (ex) => filterGroup === 'All' || ex.group === filterGroup
      );
  }, [exercises, unlockedExercises, availableEquipment, filterGroup]);

  const toggleExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const toggleSuperset = (exId1: string, exId2: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pair: [string, string] = [exId1, exId2];
    const exists = supersetPairs.some(
      (p) => (p[0] === exId1 && p[1] === exId2) || (p[0] === exId2 && p[1] === exId1)
    );
    if (exists) {
      setSupersetPairs((prev) =>
        prev.filter(
          (p) => !((p[0] === exId1 && p[1] === exId2) || (p[0] === exId2 && p[1] === exId1))
        )
      );
    } else {
      setSupersetPairs((prev) => [...prev, pair]);
    }
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIds = [...selectedIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setSelectedIds(newIds);
  };

  const handleSave = () => {
    if (!name.trim() || selectedIds.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (editRoutine) {
      updateRoutine(editRoutine.id, {
        name: name.trim(),
        exerciseIds: selectedIds,
        supersetPairs,
      });
    } else {
      createRoutine(name.trim(), selectedIds);
      // Add superset pairs after creation
      const newRoutine = useStore.getState().routines[
        useStore.getState().routines.length - 1
      ];
      if (newRoutine) {
        for (const pair of supersetPairs) {
          addSupersetPair(newRoutine.id, pair);
        }
      }
    }

    setName('');
    setSelectedIds([]);
    setSupersetPairs([]);
    onClose();
  };

  const groups: (MuscleGroup | 'All')[] = ['All', 'Push', 'Pull', 'Core', 'Legs'];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {editRoutine ? 'Edit Routine' : 'Create Routine'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Routine Name */}
            <Text style={styles.label}>ROUTINE NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Upper Body Push"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Filter tabs */}
            <Text style={styles.label}>SELECT EXERCISES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.filterPill,
                      filterGroup === g && styles.filterPillActive,
                    ]}
                    onPress={() => setFilterGroup(g)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterGroup === g && styles.filterTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Exercise list */}
            {availableExercises.map((ex) => {
              const selected = selectedIds.includes(ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseRow, selected && styles.exerciseRowSelected]}
                  onPress={() => toggleExercise(ex.id)}
                >
                  <View style={styles.exerciseInfo}>
                    <View
                      style={[
                        styles.groupDot,
                        { backgroundColor: MuscleGroupColors[ex.group] },
                      ]}
                    />
                    <Text
                      style={[
                        styles.exerciseName,
                        selected && styles.exerciseNameSelected,
                      ]}
                    >
                      {ex.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selected && styles.checkboxSelected,
                    ]}
                  >
                    {selected && (
                      <Feather name="check" size={16} color={Colors.background} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Selected exercises - reorder */}
            {selectedIds.length > 0 && (
              <>
                <Text style={[styles.label, { marginTop: Spacing.xxl }]}>
                  ORDER ({selectedIds.length} SELECTED)
                </Text>
                {selectedIds.map((id, idx) => {
                  const ex = exercises[id];
                  if (!ex) return null;
                  return (
                    <View key={id} style={styles.reorderRow}>
                      <View style={styles.reorderInfo}>
                        <Text style={styles.reorderNumber}>{idx + 1}</Text>
                        <Text style={styles.reorderName}>{ex.name}</Text>
                      </View>
                      <View style={styles.reorderButtons}>
                        <TouchableOpacity
                          onPress={() => moveExercise(idx, 'up')}
                          disabled={idx === 0}
                          style={styles.reorderBtn}
                        >
                          <Feather
                            name="chevron-up"
                            size={20}
                            color={idx === 0 ? Colors.textDisabled : Colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveExercise(idx, 'down')}
                          disabled={idx === selectedIds.length - 1}
                          style={styles.reorderBtn}
                        >
                          <Feather
                            name="chevron-down"
                            size={20}
                            color={
                              idx === selectedIds.length - 1
                                ? Colors.textDisabled
                                : Colors.textSecondary
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Superset tagging */}
                {selectedIds.length >= 2 && (
                  <>
                    <Text style={[styles.label, { marginTop: Spacing.xxl }]}>
                      TAG SUPERSETS
                    </Text>
                    {selectedIds.slice(0, -1).map((id, idx) => {
                      const nextId = selectedIds[idx + 1];
                      const ex1 = exercises[id];
                      const ex2 = exercises[nextId];
                      if (!ex1 || !ex2) return null;

                      const isSuperset = supersetPairs.some(
                        (p) =>
                          (p[0] === id && p[1] === nextId) ||
                          (p[0] === nextId && p[1] === id)
                      );

                      return (
                        <TouchableOpacity
                          key={`${id}-${nextId}`}
                          style={[
                            styles.supersetRow,
                            isSuperset && styles.supersetRowActive,
                          ]}
                          onPress={() => toggleSuperset(id, nextId)}
                        >
                          <Feather
                            name="repeat"
                            size={16}
                            color={isSuperset ? Colors.accent : Colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.supersetLabel,
                              isSuperset && styles.supersetLabelActive,
                            ]}
                          >
                            {ex1.name} ↔ {ex2.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!name.trim() || selectedIds.length === 0) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!name.trim() || selectedIds.length === 0}
          >
            <Text style={styles.saveButtonText}>
              {editRoutine ? 'Update Routine' : 'Create Routine'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '92%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
  },
  closeBtn: {
    padding: Spacing.sm,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    minHeight: 48,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.accent,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 52,
  },
  exerciseRowSelected: {
    backgroundColor: Colors.accentMuted,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  exerciseNameSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 48,
  },
  reorderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reorderNumber: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    width: 20,
  },
  reorderName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reorderBtn: {
    padding: Spacing.sm,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 48,
  },
  supersetRowActive: {
    backgroundColor: Colors.accentMuted,
  },
  supersetLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  supersetLabelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: FontSizes.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
