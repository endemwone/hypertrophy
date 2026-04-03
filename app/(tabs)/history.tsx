import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { MuscleGroup } from '@/store/types';
import { getMonthYearLabel, getWeeksAgoDate, getTodayString, subtractDays } from '@/utils/dateUtils';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';
import VolumeChart from '@/components/VolumeChart';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const sessions = useStore((s) => s.sessions);
  const exercises = useStore((s) => s.exercises);
  const routines = useStore((s) => s.routines);
  const getCurrentStreak = useStore((s) => s.getCurrentStreak);
  const getVolumeByMuscleGroup = useStore((s) => s.getVolumeByMuscleGroup);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const streak = getCurrentStreak();

  // Volume chart data (last 8 weeks)
  const chartData = useMemo(() => {
    const today = getTodayString();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = subtractDays(today, (i + 1) * 7);
      const end = subtractDays(today, i * 7);
      const volumes = getVolumeByMuscleGroup(start, end);
      weeks.push({
        week: `W${8 - i}`,
        volumes,
      });
    }
    return weeks;
  }, [sessions]);

  // Muscle group balance (last 30 days)
  const balance = useMemo(() => {
    const today = getTodayString();
    const start = subtractDays(today, 30);
    const volumes = getVolumeByMuscleGroup(start, today);
    const total = Object.values(volumes).reduce((sum, v) => sum + v, 0);
    if (total === 0) return null;

    const groups: MuscleGroup[] = ['Push', 'Pull', 'Core', 'Legs'];
    return groups.map((g) => ({
      group: g,
      percentage: Math.round((volumes[g] / total) * 100),
      volume: volumes[g],
    }));
  }, [sessions]);

  // Grouped sessions by month
  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].reverse();
    const groups: { label: string; sessions: typeof sorted }[] = [];
    let currentLabel = '';

    for (const session of sorted) {
      const label = getMonthYearLabel(session.date);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, sessions: [] });
      }
      groups[groups.length - 1].sessions.push(session);
    }

    return groups;
  }, [sessions]);

  const getRoutineName = (id: string) => {
    if (id === 'chaos') return 'Chaos Mode 🎲';
    const r = routines.find((r) => r.id === id);
    return r?.name || 'Unknown Routine';
  };

  // Check push/pull imbalance
  const hasImbalance =
    balance &&
    balance.find((b) => b.group === 'Push')?.percentage! > 50 &&
    (balance.find((b) => b.group === 'Pull')?.percentage || 0) <
      (balance.find((b) => b.group === 'Push')?.percentage || 0) / 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>History</Text>

        {/* Streak */}
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>
            {streak > 0
              ? `🔥 ${streak} day streak`
              : 'Start your streak today.'}
          </Text>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              No workouts yet. Get after it.
            </Text>
          </View>
        ) : (
          <>
            {/* Volume Chart */}
            <VolumeChart data={chartData} />

            {/* Muscle Group Balance */}
            {balance && (
              <View style={styles.balanceSection}>
                <Text style={styles.sectionLabel}>MUSCLE GROUP BALANCE (30 DAYS)</Text>
                <View style={styles.balanceRow}>
                  {balance.map((b) => (
                    <View
                      key={b.group}
                      style={[
                        styles.balancePill,
                        hasImbalance &&
                          b.group === 'Push' && {
                            borderColor: Colors.warning,
                            backgroundColor: Colors.deloadBg,
                          },
                      ]}
                    >
                      <View
                        style={[
                          styles.balanceDot,
                          { backgroundColor: MuscleGroupColors[b.group] },
                        ]}
                      />
                      <Text style={styles.balanceLabel}>{b.group}</Text>
                      <Text style={styles.balancePercent}>
                        {b.percentage}%
                      </Text>
                    </View>
                  ))}
                </View>
                {hasImbalance && (
                  <Text style={styles.imbalanceWarning}>
                    ⚠️ Push volume is dominant. Consider adding more Pull work.
                  </Text>
                )}
              </View>
            )}

            {/* Session History */}
            <Text style={[styles.sectionLabel, { paddingHorizontal: Spacing.lg }]}>
              SESSION HISTORY
            </Text>
            {groupedSessions.map((group) => (
              <View key={group.label}>
                <Text style={styles.monthLabel}>{group.label}</Text>
                {group.sessions.map((session) => {
                  const isExpanded = expandedSessionId === session.id;
                  const totalSets = session.sets.length;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionRow}
                      onPress={() =>
                        setExpandedSessionId(
                          isExpanded ? null : session.id
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionDate}>
                            {session.date}
                          </Text>
                          <Text style={styles.sessionRoutine}>
                            {getRoutineName(session.routineId)}
                          </Text>
                        </View>
                        <View style={styles.sessionMeta}>
                          <Text style={styles.sessionSets}>
                            {totalSets} sets
                          </Text>
                          {session.moodTag && (
                            <Text style={styles.sessionMood}>
                              {session.moodTag}
                            </Text>
                          )}
                          <Feather
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={Colors.textMuted}
                          />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.sessionExpanded}>
                          {[...new Set(session.sets.map((s) => s.exerciseId))].map(
                            (exId) => {
                              const ex = exercises[exId];
                              const sets = session.sets.filter(
                                (s) => s.exerciseId === exId
                              );
                              return (
                                <View key={exId} style={styles.exerciseBreakdown}>
                                  <Text style={styles.exerciseName}>
                                    {ex?.name || exId}
                                  </Text>
                                  <Text style={styles.exerciseSets}>
                                    {sets
                                      .map((s) => `${s.reps}`)
                                      .join(', ')}{' '}
                                    reps
                                  </Text>
                                </View>
                              );
                            }
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </>
        )}

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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  balanceSection: {
    paddingHorizontal: Spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  balancePill: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  balancePercent: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  imbalanceWarning: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  monthLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sessionRow: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    minHeight: 56,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionRoutine: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sessionSets: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  sessionMood: {
    fontSize: 18,
  },
  sessionExpanded: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
  },
  exerciseBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  exerciseSets: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
});
