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
import { useStore, Exercise, MuscleGroup, Equipment } from '@/store/useStore';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Push', 'Pull', 'Core', 'Legs'];
const ALL_EQUIPMENT: Equipment[] = ['None', 'Pullup Bar', 'Rings', 'Parallettes', 'Wall'];

export default function AddExerciseModal({ visible, onClose }: AddExerciseModalProps) {
  const addCustomExercise = useStore((s) => s.addCustomExercise);

  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('Push');
  const [equipment, setEquipment] = useState<Equipment[]>(['None']);
  const [targetReps, setTargetReps] = useState('8');
  const [targetSets, setTargetSets] = useState('3');
  const [formCues, setFormCues] = useState(['', '', '', '']);

  const handleSave = () => {
    if (!name.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    addCustomExercise({
      name: name.trim(),
      group,
      equipment,
      level: 1,
      targetRepsToUnlock: parseInt(targetReps) || 8,
      targetSetsToUnlock: parseInt(targetSets) || 3,
      nextProgressionId: null,
      prevProgressionId: null,
      formCues: formCues.filter((c) => c.trim() !== ''),
    });

    // Reset form
    setName('');
    setGroup('Push');
    setEquipment(['None']);
    setTargetReps('8');
    setTargetSets('3');
    setFormCues(['', '', '', '']);
    onClose();
  };

  const toggleEquipment = (eq: Equipment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  };

  const updateCue = (index: number, value: string) => {
    const newCues = [...formCues];
    newCues[index] = value;
    setFormCues(newCues);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Custom Exercise</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Name */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Muscle Group */}
            <Text style={styles.label}>Muscle Group</Text>
            <View style={styles.pillRow}>
              {MUSCLE_GROUPS.map((mg) => (
                <TouchableOpacity
                  key={mg}
                  style={[
                    styles.pill,
                    group === mg && {
                      backgroundColor: MuscleGroupColors[mg] + '30',
                      borderColor: MuscleGroupColors[mg],
                    },
                  ]}
                  onPress={() => setGroup(mg)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      group === mg && { color: MuscleGroupColors[mg] },
                    ]}
                  >
                    {mg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Equipment */}
            <Text style={styles.label}>Equipment Required</Text>
            <View style={styles.pillRow}>
              {ALL_EQUIPMENT.map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[
                    styles.pill,
                    equipment.includes(eq) && styles.pillActive,
                  ]}
                  onPress={() => toggleEquipment(eq)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      equipment.includes(eq) && styles.pillTextActive,
                    ]}
                  >
                    {eq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Targets */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Target Reps</Text>
                <TextInput
                  style={styles.input}
                  value={targetReps}
                  onChangeText={setTargetReps}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Target Sets</Text>
                <TextInput
                  style={styles.input}
                  value={targetSets}
                  onChangeText={setTargetSets}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* Form Cues */}
            <Text style={styles.label}>Form Cues (optional)</Text>
            {formCues.map((cue, i) => (
              <TextInput
                key={i}
                style={[styles.input, { marginBottom: Spacing.sm }]}
                value={cue}
                onChangeText={(v) => updateCue(i, v)}
                placeholder={`Cue ${i + 1}`}
                placeholderTextColor={Colors.textMuted}
              />
            ))}
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim()}
          >
            <Text style={styles.saveButtonText}>Save Exercise</Text>
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
    maxHeight: '90%',
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
  closeButton: {
    padding: Spacing.sm,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 40,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.accent,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
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
