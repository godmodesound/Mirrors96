import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Text } from 'react-native';

import { skinStyles, SK } from './skins';

interface GodmodeSliderProps {
  testID?: string;
  accessibilityLabel?: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
  step?: number;
  showValue?: boolean;
}

export default function GodmodeSlider({
  testID,
  accessibilityLabel,
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  minimumTrackTintColor = '#ff0a0a',
  maximumTrackTintColor = '#333333',
  thumbTintColor = '#ff6060',
  style,
  step,
  showValue = false,
}: GodmodeSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(0);
  const trackLeft = useRef(0);
  const [dragging, setDragging] = useState(false);
  const generatedId = React.useId();
  const live = useRef({ minimumValue, maximumValue, onValueChange, step });
  live.current = { minimumValue, maximumValue, onValueChange, step };

  const clamp = useCallback((val: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, val));
  }, []);

  const posToValue = useCallback((pageX: number) => {
    const { minimumValue: min, maximumValue: max, step: increment } = live.current;
    const ratio = clamp((pageX - trackLeft.current) / Math.max(1, trackWidth.current), 0, 1);
    let val = min + ratio * (max - min);
    if (increment) {
      val = Math.round(val / increment) * increment;
    }
    return clamp(val, min, max);
  }, [clamp]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        if (trackRef.current) {
          trackRef.current.measureInWindow((x, _y, w) => {
            trackLeft.current = x;
            trackWidth.current = w;
            const newVal = posToValue(evt.nativeEvent.pageX);
            live.current.onValueChange(newVal);
          });
        }
      },
      onPanResponderMove: (evt) => {
        const newVal = posToValue(evt.nativeEvent.pageX);
        live.current.onValueChange(newVal);
      },
      onPanResponderRelease: () => {
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
      },
    })
  ).current;

  const ratio = maximumValue > minimumValue ? clamp((value - minimumValue) / (maximumValue - minimumValue), 0, 1) : 0;
  const fillWidth = `${ratio * 100}%` as `${number}%`;

  return (
    <View style={[styles.container, style]}>
      <View
        testID={testID || `slider-${generatedId}`}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel || 'Adjust value'}
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => onValueChange(clamp(value + (event.nativeEvent.actionName === 'increment' ? 1 : -1) * (step || (maximumValue - minimumValue) / 100), minimumValue, maximumValue))}
        ref={trackRef}
        style={styles.track}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        {/* Background track */}
        <View style={[styles.trackBg, { backgroundColor: maximumTrackTintColor }]} />
        {/* Filled track */}
        <View style={[styles.trackFill, { width: fillWidth, backgroundColor: minimumTrackTintColor }]} />
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: fillWidth,
              backgroundColor: dragging ? SK('#ffffff') : thumbTintColor,
              transform: [{ translateX: -8 }, { scale: dragging ? 1.3 : 1 }],
            },
          ]}
        />
        {/* Active glow */}
        {dragging && (
          <View
            style={[
              styles.thumbGlow,
              {
                left: fillWidth,
                backgroundColor: minimumTrackTintColor,
                transform: [{ translateX: -14 }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = skinStyles({
  container: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: 14,
    elevation: 3,
  },
  thumbGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    top: 8,
    opacity: 0.2,
  },
});
