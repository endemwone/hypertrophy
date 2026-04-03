import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, MuscleGroupColors } from '@/constants/theme';
import { MuscleGroup } from '@/store/useStore';

interface VolumeChartProps {
  data: { week: string; volumes: Record<MuscleGroup, number> }[];
}

const BAR_MAX_HEIGHT = 120;

export default function VolumeChart({ data }: VolumeChartProps) {
  const groups: MuscleGroup[] = ['Push', 'Pull', 'Core', 'Legs'];
  const maxVolume = Math.max(
    ...data.map((w) =>
      Object.values(w.volumes).reduce((sum, v) => sum + v, 0)
    ),
    1
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VOLUME — LAST 8 WEEKS</Text>

      <View style={styles.chartArea}>
        {data.map((weekData, i) => {
          const total = Object.values(weekData.volumes).reduce(
            (sum, v) => sum + v,
            0
          );

          return (
            <View key={i} style={styles.barColumn}>
              <View style={styles.barStack}>
                {groups.map((g) => {
                  const vol = weekData.volumes[g];
                  if (vol === 0) return null;
                  const height = (vol / maxVolume) * BAR_MAX_HEIGHT;
                  return (
                    <View
                      key={g}
                      style={[
                        styles.barSegment,
                        {
                          height: Math.max(height, 2),
                          backgroundColor: MuscleGroupColors[g],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.weekLabel}>W{i + 1}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {groups.map((g) => (
          <View key={g} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: MuscleGroupColors[g] },
              ]}
            />
            <Text style={styles.legendText}>{g}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 30,
    paddingBottom: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barStack: {
    width: 24,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barSegment: {
    width: '100%',
    borderRadius: 2,
    marginBottom: 1,
  },
  weekLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
});
