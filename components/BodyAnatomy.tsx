import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Colors, MuscleGroupColors } from '@/constants/theme';
import { MuscleGroup } from '@/store/types';

interface Props {
  highlightedGroup?: MuscleGroup;
  size?: number;
}

const BodyAnatomy: React.FC<Props> = ({ highlightedGroup, size = 150 }) => {
  const getHighlightColor = (group: MuscleGroup) => {
    return highlightedGroup === group ? MuscleGroupColors[group] : '#333333';
  };

  const scale = size / 100;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 1.5} viewBox="0 0 60 100">
        <G transform="translate(30, 0)">
          {/* Head */}
          <Path
            d="M-5,5 a5,5 0 1,1 10,0 a5,5 0 1,1 -10,0"
            fill="#222"
          />
          
          {/* Torso - Pull (Back) & Push (Chest) */}
          <Path
            d="M-8,12 L8,12 L10,35 L-10,35 Z"
            fill={highlightedGroup === 'Push' || highlightedGroup === 'Pull' ? getHighlightColor(highlightedGroup) : '#222'}
          />

          {/* Abdominals - Core */}
          <Path
            d="M-7,25 L7,25 L6,34 L-6,34 Z"
            fill={getHighlightColor('Core')}
          />

          {/* Arms - Push (Triceps/Shoulders) & Pull (Biceps) */}
          {/* Left Arm */}
          <Path
            d="M-8,12 L-15,35 L-12,36 L-6,15 Z"
            fill={highlightedGroup === 'Push' || highlightedGroup === 'Pull' ? getHighlightColor(highlightedGroup) : '#222'}
          />
          {/* Right Arm */}
          <Path
            d="M8,12 L15,35 L12,36 L6,15 Z"
            fill={highlightedGroup === 'Push' || highlightedGroup === 'Pull' ? getHighlightColor(highlightedGroup) : '#222'}
          />

          {/* Legs - Legs group */}
          {/* Left Leg */}
          <Path
            d="M-10,35 L-12,70 L-7,70 L-3,36 Z"
            fill={getHighlightColor('Legs')}
          />
          {/* Right Leg */}
          <Path
            d="M10,35 L12,70 L7,70 L3,36 Z"
            fill={getHighlightColor('Legs')}
          />

          {/* Calves */}
          <Path
            d="M-12,70 L-11,90 L-7,90 L-7,70 Z"
            fill={getHighlightColor('Legs')}
          />
          <Path
            d="M12,70 L11,90 L7,90 L7,70 Z"
            fill={getHighlightColor('Legs')}
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BodyAnatomy;
