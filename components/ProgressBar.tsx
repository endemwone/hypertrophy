import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
}

const ProgressBar: React.FC<Props> = ({ progress, color = Colors.accent, height = 8 }) => {
  const width = Math.min(Math.max(progress, 0), 1) * 100;

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${width}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
});

export default ProgressBar;
