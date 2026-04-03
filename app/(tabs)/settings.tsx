import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Clipboard } from 'react-native';
import { useStore } from '@/store/useStore';
import { Equipment, MoodTag } from '@/store/types';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import EquipmentToggle from '@/components/EquipmentToggle';

const REST_OPTIONS = [60, 90, 120, 180];
const SUPERSET_REST_OPTIONS = [30, 45, 60];
const UNLOCK_OPTIONS = [1, 2, 3];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const exportStateAsBase64 = useStore((s) => s.exportStateAsBase64);
  const importStateFromBase64 = useStore((s) => s.importStateFromBase64);
  const resetAllData = useStore((s) => s.resetAllData);
  const importExercises = useStore((s) => s.importExercises);

  const [importData, setImportData] = useState('');
  const [importExerciseData, setImportExerciseData] = useState('');

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const encoded = exportStateAsBase64();
      // Try to copy to clipboard
      try {
        const ClipboardModule = require('react-native').Clipboard;
        if (ClipboardModule) {
          ClipboardModule.setString(encoded);
        }
      } catch (e) {
        // Clipboard may not be available
      }
      Alert.alert(
        'Exported!',
        'Data copied to clipboard. Paste it somewhere safe.'
      );
    } catch (e) {
      Alert.alert('Export failed', 'Something went wrong.');
    }
  };

  const handleImport = () => {
    if (!importData.trim()) {
      Alert.alert('Empty', 'Paste your backup data first.');
      return;
    }

    Alert.alert(
      'Replace all data?',
      'This will replace all current data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            const success = importStateFromBase64(importData.trim());
            if (success) {
              setImportData('');
              Alert.alert('Restored!', 'Data imported successfully.');
            } else {
              Alert.alert(
                'Invalid data',
                'Nothing was changed. Check your backup string.'
              );
            }
          },
        },
      ]
    );
  };

  const handleImportExercises = () => {
    if (!importExerciseData.trim()) {
      Alert.alert('Empty', 'Paste exercise JSON data first.');
      return;
    }

    try {
      const parsed = JSON.parse(importExerciseData.trim());
      if (!Array.isArray(parsed)) {
        Alert.alert('Invalid', 'Expected a JSON array of exercises.');
        return;
      }
      importExercises(parsed);
      setImportExerciseData('');
      Alert.alert('Imported!', `${parsed.length} exercises merged.`);
    } catch (e) {
      Alert.alert('Invalid JSON', 'Nothing was changed.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset ALL data?',
      'This will delete everything and restore defaults. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetAllData();
            Alert.alert('Done', 'All data has been reset.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile */}
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(v) => updateProfile({ name: v })}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
            Body Weight (kg)
          </Text>
          <TextInput
            style={styles.input}
            value={profile.bodyWeightKg ? String(profile.bodyWeightKg) : ''}
            onChangeText={(v) =>
              updateProfile({ bodyWeightKg: parseFloat(v) || 0 })
            }
            placeholder="e.g., 75"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />
          {profile.bodyWeightKg === 0 && (
            <Text style={styles.hint}>
              Set your body weight for accurate volume tracking.
            </Text>
          )}
        </View>

        {/* Workout Preferences */}
        <Text style={styles.sectionLabel}>WORKOUT PREFERENCES</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Rest Timer (seconds)</Text>
          <View style={styles.segmentRow}>
            {REST_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.segment,
                  profile.restTimerDuration === opt && styles.segmentActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateProfile({ restTimerDuration: opt });
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    profile.restTimerDuration === opt &&
                      styles.segmentTextActive,
                  ]}
                >
                  {opt}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
            Superset Rest (seconds)
          </Text>
          <View style={styles.segmentRow}>
            {SUPERSET_REST_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.segment,
                  profile.supersetRestTimerDuration === opt &&
                    styles.segmentActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateProfile({ supersetRestTimerDuration: opt });
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    profile.supersetRestTimerDuration === opt &&
                      styles.segmentTextActive,
                  ]}
                >
                  {opt}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
            Unlock Threshold (qualifying sessions)
          </Text>
          <View style={styles.segmentRow}>
            {UNLOCK_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.segment,
                  profile.unlockThreshold === opt && styles.segmentActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateProfile({ unlockThreshold: opt });
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    profile.unlockThreshold === opt &&
                      styles.segmentTextActive,
                  ]}
                >
                  {opt} session{opt > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Equipment */}
        <Text style={styles.sectionLabel}>EQUIPMENT</Text>
        <EquipmentToggle />

        {/* Data Portability */}
        <Text style={styles.sectionLabel}>DATA PORTABILITY</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Feather name="upload" size={18} color={Colors.textPrimary} />
            <Text style={styles.exportText}>Export Data</Text>
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xxl }]}>
            Import Data
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={importData}
            onChangeText={setImportData}
            placeholder="Paste backup string here..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.restoreButton, !importData.trim() && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={!importData.trim()}
          >
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xxl }]}>
            Import Exercises from JSON
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={importExerciseData}
            onChangeText={setImportExerciseData}
            placeholder='Paste JSON array of exercises...'
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[
              styles.restoreButton,
              !importExerciseData.trim() && styles.buttonDisabled,
            ]}
            onPress={handleImportExercises}
            disabled={!importExerciseData.trim()}
          >
            <Text style={styles.restoreText}>Import Exercises</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Feather name="trash-2" size={18} color={Colors.error} />
          <Text style={styles.resetText}>Reset All Data</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    minHeight: 48,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    color: Colors.warning,
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  segmentText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 56,
  },
  exportText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  restoreButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  restoreText: {
    color: Colors.background,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.error,
    minHeight: 56,
  },
  resetText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
});
