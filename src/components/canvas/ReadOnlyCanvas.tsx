import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Stroke } from './DrawingCanvas';
import { colors } from '../../theme';

interface ReadOnlyCanvasProps {
  strokes: Stroke[];
  width: number;
  height: number;
}

export const ReadOnlyCanvas: React.FC<ReadOnlyCanvasProps> = React.memo(
  ({ strokes, width, height }) => {
    // Render brush strokes only (not text)
    const brushStrokes = useMemo(
      () => strokes.filter((s) => s.type !== 'text'),
      [strokes]
    );

    return (
      <View style={[styles.container, { width, height }]}>
        {/* SVG for brush strokes */}
        <Svg width={width} height={height} style={styles.svg}>
          {brushStrokes.map((stroke) => (
            <Path
              key={stroke.id}
              d={stroke.path}
              stroke={stroke.color}
              strokeWidth={stroke.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>

        {/* Label */}
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Partner's Drawing</Text>
        </View>
      </View>
    );
  }
);

ReadOnlyCanvas.displayName = 'ReadOnlyCanvas';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  label: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
