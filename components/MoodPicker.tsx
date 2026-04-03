import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MoodTag } from '@/store/useStore';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

const MOODS: { tag: MoodTag; label: string }[] = [
  { tag: '💪', label: 'Strong' },
  { tag: '🔥', label: 'Fire' },
  { tag: '😐', label: 'Meh' },
  { tag: '😴', label: 'Tired' },
  { tag: '🤒', label: 'Sick' },
];

interface MoodPickerProps {
  selected?: MoodTag;
  onSelect: (mood: MoodTag) => void;
}

export default function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  const handleSelect = (mood: MoodTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(mood);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How did it feel?</Text>
      <View style={styles.row}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.tag}
            style={[
              styles.moodButton,
              selected === m.tag && styles.moodButtonSelected,
            ]}
            onPress={() => handleSelect(m.tag)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{m.tag}</Text>
            <Text
              style={[
                styles.label,
                selected === m.tag && styles.labelSelected,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.lg,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 48,
  },
  moodButtonSelected: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  emoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  labelSelected: {
    color: Colors.accent,
  },
});
