import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore, Equipment } from '@/store/useStore';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const ALL_EQUIPMENT: Equipment[] = ['None', 'Pullup Bar', 'Rings', 'Parallettes', 'Wall'];

const EQUIPMENT_ICONS: Record<Equipment, string> = {
  None: '🏋️',
  'Pullup Bar': '🔩',
  Rings: '⭕',
  Parallettes: '🤸',
  Wall: '🧱',
};

export default function EquipmentToggle() {
  const availableEquipment = useStore((s) => s.availableEquipment);
  const toggleEquipment = useStore((s) => s.toggleEquipment);

  const handleToggle = (eq: Equipment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleEquipment(eq);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {ALL_EQUIPMENT.map((eq) => {
        const active = availableEquipment.includes(eq);
        return (
          <TouchableOpacity
            key={eq}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => handleToggle(eq)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{EQUIPMENT_ICONS[eq]}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {eq}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
    minHeight: 48,
  },
  pillActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  icon: {
    fontSize: FontSizes.md,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.accent,
  },
});
