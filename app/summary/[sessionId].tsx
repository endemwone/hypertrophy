import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { PRRecord, MoodTag } from '@/store/types';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import MoodPicker from '@/components/MoodPicker';
import UnlockBanner from '@/components/UnlockBanner';

export default function SummaryScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    prs?: string;
    unlocks?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sessions = useStore((s) => s.sessions);
  const exercises = useStore((s) => s.exercises);
  const profile = useStore((s) => s.profile);
  const updateSessionMood = useStore((s) => s.updateSessionMood);

  const session = sessions.find((s) => s.id === params.sessionId);

  const prs: PRRecord[] = useMemo(() => {
    try {
      return params.prs ? JSON.parse(decodeURIComponent(params.prs)) : [];
    } catch {
      return [];
    }
  }, [params.prs]);

  const unlockIds: string[] = useMemo(() => {
    try {
      return params.unlocks
        ? JSON.parse(decodeURIComponent(params.unlocks))
        : [];
    } catch {
      return [];
    }
  }, [params.unlocks]);

  const [dismissedUnlocks, setDismissedUnlocks] = useState<Set<number>>(
    new Set()
  );

  if (!session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Session not found.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationMin = Math.round(session.durationSeconds / 60);
  const totalSets = session.sets.length;
  const totalReps = session.sets.reduce((sum, s) => sum + s.reps, 0);
  const volume = totalReps * (profile.bodyWeightKg || 0);

  // Group sets by exercise
  const exerciseBreakdown = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const set of session.sets) {
      const existing = map.get(set.exerciseId) || [];
      existing.push(set.reps);
      map.set(set.exerciseId, existing);
    }
    return Array.from(map.entries()).map(([exId, reps]) => ({
      exerciseId: exId,
      name: exercises[exId]?.name || exId,
      reps,
    }));
  }, [session.sets, exercises]);

  // Deduplicate PRs by exerciseId — keep highest newBest
  const uniquePRs = useMemo(() => {
    const prMap = new Map<string, PRRecord>();
    for (const pr of prs) {
      const existing = prMap.get(pr.exerciseId);
      if (!existing || pr.newBest > existing.newBest) {
        prMap.set(pr.exerciseId, pr);
      }
    }
    return Array.from(prMap.values());
  }, [prs]);

  const handleMoodSelect = (mood: MoodTag) => {
    updateSessionMood(session.id, mood);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Text style={styles.title}>Session Complete 💪</Text>
        <Text style={styles.duration}>{durationMin} minutes</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalReps}</Text>
            <Text style={styles.statLabel}>Reps</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {volume > 0 ? `${Math.round(volume)}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        {/* Mood Picker */}
        <View style={styles.section}>
          <MoodPicker
            selected={session.moodTag}
            onSelect={handleMoodSelect}
          />
        </View>

        {/* PRs */}
        {uniquePRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
            {uniquePRs.map((pr) => (
              <View key={pr.exerciseId} style={styles.prRow}>
                <Text style={styles.prName}>
                  {exercises[pr.exerciseId]?.name || pr.exerciseId}
                </Text>
                <Text style={styles.prDetail}>
                  {pr.newBest} reps
                  {pr.oldBest !== null ? ` (was ${pr.oldBest})` : ' (first!)'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Unlocks */}
        {unlockIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills Unlocked 🔓</Text>
            {unlockIds.map((id, index) => {
              const ex = exercises[id];
              if (!ex || dismissedUnlocks.has(index)) return null;
              return (
                <UnlockBanner
                  key={id}
                  exerciseName={ex.name}
                  level={ex.level}
                  index={index}
                  onDismiss={() =>
                    setDismissedUnlocks((prev) => new Set(prev).add(index))
                  }
                />
              );
            })}
          </View>
        )}

        {/* Exercise Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          {exerciseBreakdown.map((item) => (
            <View key={item.exerciseId} style={styles.breakdownRow}>
              <Text style={styles.breakdownName}>{item.name}</Text>
              <Text style={styles.breakdownSets}>
                {item.reps.join(', ')} reps
              </Text>
            </View>
          ))}
        </View>

        {/* Back to Dashboard */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    paddingTop: 100,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxxl,
    fontWeight: '900',
    paddingTop: Spacing.xxl,
    letterSpacing: -1,
  },
  duration: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.prGoldBg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.prGold,
  },
  prName: {
    color: Colors.prGold,
    fontSize: FontSizes.md,
    fontWeight: '700',
    flex: 1,
  },
  prDetail: {
    color: Colors.prGold,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  breakdownName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    flex: 1,
  },
  breakdownSets: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  doneButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    minHeight: 60,
    justifyContent: 'center',
  },
  doneButtonText: {
    color: Colors.background,
    fontSize: FontSizes.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
