import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Rect, Stop, LinearGradient, Defs } from 'react-native-svg';
import { Colors, MuscleGroupColors } from '@/constants/theme';
import { MuscleGroup } from '@/store/types';

interface Props {
  highlightedGroup?: MuscleGroup;
  size?: number;
}

const BodyAnatomy: React.FC<Props> = ({ highlightedGroup, size = 150 }) => {
  const getHighlightColor = (group: MuscleGroup) => {
    return highlightedGroup === group ? MuscleGroupColors[group] : '#2A2A2A';
  };

  const activeOpacity = 1;
  const inactiveOpacity = 0.5;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 1.5} viewBox="0 0 100 180">
        <G transform="translate(50, 10)">
          {/* Head & Neck */}
          <Path
            d="M-8,-10 a8,8 0 1,1 16,0 a8,8 0 1,1 -16,0 M-4,-2 L4,-2 L3,2 L-3,2 Z"
            fill="#1A1A1A"
          />

          {/* Shoulders (Push) */}
          <Path
            d="M-15,5 L-25,15 L-22,25 L-12,12 Z"
            fill={getHighlightColor('Push')}
          />
          <Path
            d="M15,5 L25,15 L22,25 L12,12 Z"
            fill={getHighlightColor('Push')}
          />

          {/* Traps (Pull) */}
          <Path
            d="M-12,2 L12,2 L8,8 L-8,8 Z"
            fill={getHighlightColor('Pull')}
          />

          {/* Chest (Push) */}
          <Path
            d="M-14,10 L14,10 L12,30 L-12,30 Z M-12,12 L0,12 L0,28 L-10,28 Z M2,12 L12,12 L10,28 L2,28 Z"
            fill={getHighlightColor('Push')}
          />

          {/* Abs (Core) */}
          <Path
            d="M-10,32 L10,32 L8,60 L-8,60 Z"
            fill={getHighlightColor('Core')}
          />
          {/* Detailed Ab lines */}
          <G opacity={0.3}>
            <Rect x="-6" y="34" width="12" height="4" fill={highlightedGroup === 'Core' ? '#000' : 'transparent'} />
            <Rect x="-6" y="42" width="12" height="4" fill={highlightedGroup === 'Core' ? '#000' : 'transparent'} />
            <Rect x="-6" y="50" width="12" height="4" fill={highlightedGroup === 'Core' ? '#000' : 'transparent'} />
          </G>

          {/* Back/Lats (Pull) -- visible from front edges */}
          <Path
            d="M-15,18 L-22,45 L-10,40 L-10,18 Z"
            fill={getHighlightColor('Pull')}
          />
          <Path
            d="M15,18 L22,45 L10,40 L10,18 Z"
            fill={getHighlightColor('Pull')}
          />

          {/* Upper Arms - Biceps (Pull) / Triceps (Push) */}
          <Path
            d="M-22,25 L-28,55 L-22,55 L-18,25 Z"
            fill={highlightedGroup === 'Push' || highlightedGroup === 'Pull' ? getHighlightColor(highlightedGroup) : '#1A1A1A'}
          />
          <Path
            d="M22,25 L28,55 L22,55 L18,25 Z"
            fill={highlightedGroup === 'Push' || highlightedGroup === 'Pull' ? getHighlightColor(highlightedGroup) : '#1A1A1A'}
          />

          {/* Forearms */}
          <Path
            d="M-28,55 L-25,85 L-20,85 L-22,55 Z"
            fill="#1A1A1A"
          />
          <Path
            d="M28,55 L25,85 L20,85 L22,55 Z"
            fill="#1A1A1A"
          />

          {/* Thighs (Legs) */}
          <Path
            d="M-12,62 L-18,110 L-6,110 L-2,62 Z"
            fill={getHighlightColor('Legs')}
          />
          <Path
            d="M12,62 L18,110 L6,110 L2,62 Z"
            fill={getHighlightColor('Legs')}
          />

          {/* Calves (Legs) */}
          <Path
            d="M-18,115 L-16,150 L-8,150 L-6,115 Z"
            fill={getHighlightColor('Legs')}
          />
          <Path
            d="M18,115 L16,150 L8,150 L6,115 Z"
            fill={getHighlightColor('Legs')}
          />
        </G>

        {/* Gloss overlay */}
        <Rect x="0" y="0" width="100" height="180" fill="url(#grad)" opacity={0.1} />
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 20,
  },
});

export default BodyAnatomy;
