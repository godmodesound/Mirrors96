import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Text } from 'react-native';

import { skinStyles, SK } from './skins';

interface GodmodeSliderProps {
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

  const clamp = useCallback((val: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, val));
  }, []);

  const posToValue = useCallback((pageX: number) => {
    const ratio = clamp((pageX - trackLeft.current) / trackWidth.current, 0, 1);
    let val = minimumValue + ratio * (maximumValue - minimumValue);
    if (step) {
      val = Math.round(val / step) * step;
    }
    return clamp(val, minimumValue, maximumValue);
  }, [minimumValue, maximumValue, step, clamp]);

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
            onValueChange(newVal);
          });
        }
      },
      onPanResponderMove: (evt) => {
        const newVal = posToValue(evt.nativeEvent.pageX);
        onValueChange(newVal);
      },
      onPanResponderRelease: () => {
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
      },
    })
  ).current;

  const ratio = clamp((value - minimumValue) / (maximumValue - minimumValue), 0, 1);
  const fillWidth = `${ratio * 100}%`;

  return (
    <View style={[styles.container, style]}>
      <View
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
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 40,
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
    top: 12,
    elevation: 3,
  },
  thumbGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    top: 6,
    opacity: 0.2,
  },
});
