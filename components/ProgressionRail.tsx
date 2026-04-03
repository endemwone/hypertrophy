import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Exercise } from '@/store/useStore';
import SkillCard from './SkillCard';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface ProgressionRailProps {
  chainName: string;
  exercises: Exercise[];
  onExercisePress: (exercise: Exercise) => void;
}

export default function ProgressionRail({
  chainName,
  exercises,
  onExercisePress,
}: ProgressionRailProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.chainName}>{chainName}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {exercises.map((exercise, index) => (
          <React.Fragment key={exercise.id}>
            <SkillCard
              exercise={exercise}
              onPress={() => onExercisePress(exercise)}
            />
            {index < exercises.length - 1 && (
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  chainName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  rail: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 0,
  },
  arrowContainer: {
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
});
