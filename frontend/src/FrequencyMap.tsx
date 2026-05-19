import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
  Animated, Easing,
} from 'react-native';
import Svg, {
  Circle, Line, G, Text as SvgText, Defs, RadialGradient, Stop,
  LinearGradient, Path, Rect, Ellipse,
} from 'react-native-svg';
import { AudioEngine } from './AudioEngine';

const SW = Dimensions.get('window').width;
const MAP_W = SW - 16;
const MAP_H = MAP_W * 1.15;
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// ═══ BRAINWAVE BANDS ═══
type Band = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
const BAND_COLORS: Record<Band, string> = {
  delta: '#00ccff',
  theta: '#a855f7',
  alpha: '#fbbf24',
  beta: '#f97316',
  gamma: '#ff0a0a',
};
const BAND_GLOW: Record<Band, string> = {
  delta: '#00ccff',
  theta: '#c084fc',
  alpha: '#fde68a',
  beta: '#fb923c',
  gamma: '#ff3040',
};
function getBand(hz: number): Band {
  if (hz < 4) return 'delta';
  if (hz < 8) return 'theta';
  if (hz < 13) return 'alpha';
  if (hz < 30) return 'beta';
  return 'gamma';
}

// ═══ BRAIN REGION NODES ═══
interface BrainNode {
  id: string;
  label: string;
  x: number;
  y: number;
  hz: number;
}

// ═══ GEOMETRY TYPES ═══
interface GeometryType {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  nodes: BrainNode[];
  edges: [number, number][];
}

const METATRON: GeometryType = {
  id: 'metatron',
  name: 'METATRON',
  subtitle: "METATRON'S CUBE",
  description: '13-circle Fruit of Life with all 5 Platonic solids — whole-brain non-local resonance.',
  nodes: [
    { id: 'crown', label: 'CROWN', x: 0.5, y: 0.06, hz: 5.3 },
    { id: 'prefrontal', label: 'PREFRONTAL', x: 0.5, y: 0.20, hz: 7.83 },
    { id: 'l_frontal', label: 'L FRONTAL', x: 0.28, y: 0.30, hz: 16 },
    { id: 'r_frontal', label: 'R FRONTAL', x: 0.72, y: 0.30, hz: 16 },
    { id: 'pineal', label: 'PINEAL', x: 0.42, y: 0.48, hz: 23 },
    { id: 'thalamus', label: 'THALAMUS', x: 0.58, y: 0.48, hz: 6 },
    { id: 'l_parietal', label: 'L PARIETAL', x: 0.08, y: 0.48, hz: 8 },
    { id: 'r_parietal', label: 'R PARIETAL', x: 0.92, y: 0.48, hz: 8 },
    { id: 'l_temporal', label: 'L TEMPORAL', x: 0.28, y: 0.66, hz: 10 },
    { id: 'r_temporal', label: 'R TEMPORAL', x: 0.72, y: 0.66, hz: 10 },
    { id: 'occipital', label: 'OCCIPITAL', x: 0.5, y: 0.78, hz: 7.83 },
    { id: 'brainstem', label: 'BRAINSTEM', x: 0.5, y: 0.94, hz: 2 },
  ],
  edges: [
    [0,1],[0,2],[0,3],[0,6],[0,7],
    [1,2],[1,3],[1,4],[1,5],
    [2,4],[2,6],[2,8],
    [3,5],[3,7],[3,9],
    [4,5],[4,8],[4,10],
    [5,9],[5,10],
    [6,8],[6,2],
    [7,9],[7,3],
    [8,10],[8,11],
    [9,10],[9,11],
    [10,11],
  ],
};

const TREE: GeometryType = {
  id: 'tree',
  name: 'TREE',
  subtitle: 'TREE OF LIFE',
  description: 'Kabbalistic 10-sephirot path — the original brain lattice configuration.',
  nodes: [
    { id: 'crown', label: 'KETHER', x: 0.5, y: 0.05, hz: 963 },
    { id: 'chokmah', label: 'CHOKMAH', x: 0.75, y: 0.15, hz: 852 },
    { id: 'binah', label: 'BINAH', x: 0.25, y: 0.15, hz: 741 },
    { id: 'chesed', label: 'CHESED', x: 0.75, y: 0.35, hz: 639 },
    { id: 'geburah', label: 'GEBURAH', x: 0.25, y: 0.35, hz: 528 },
    { id: 'tiphareth', label: 'TIPHARETH', x: 0.5, y: 0.45, hz: 528 },
    { id: 'netzach', label: 'NETZACH', x: 0.75, y: 0.60, hz: 417 },
    { id: 'hod', label: 'HOD', x: 0.25, y: 0.60, hz: 396 },
    { id: 'yesod', label: 'YESOD', x: 0.5, y: 0.75, hz: 285 },
    { id: 'malkuth', label: 'MALKUTH', x: 0.5, y: 0.94, hz: 174 },
  ],
  edges: [
    [0,1],[0,2],[1,2],[1,3],[1,5],[2,4],[2,5],
    [3,4],[3,5],[3,6],[4,5],[4,7],
    [5,6],[5,7],[5,8],[6,7],[6,8],[7,8],[8,9],
  ],
};

const MERKABA: GeometryType = {
  id: 'merkaba',
  name: 'MERKABA',
  subtitle: 'STAR TETRAHEDRON',
  description: 'Star Tetrahedron — counter-rotating light vehicle for vertical crown-root coherence.',
  nodes: [
    { id: 'top', label: 'CROWN', x: 0.5, y: 0.05, hz: 7.83 },
    { id: 'ul', label: 'L FRONTAL', x: 0.2, y: 0.35, hz: 10 },
    { id: 'ur', label: 'R FRONTAL', x: 0.8, y: 0.35, hz: 10 },
    { id: 'center', label: 'PINEAL', x: 0.5, y: 0.48, hz: 40 },
    { id: 'll', label: 'L TEMPORAL', x: 0.2, y: 0.65, hz: 6 },
    { id: 'lr', label: 'R TEMPORAL', x: 0.8, y: 0.65, hz: 6 },
    { id: 'bottom', label: 'BRAINSTEM', x: 0.5, y: 0.94, hz: 2 },
  ],
  edges: [
    [0,1],[0,2],[1,2],[0,3],[1,3],[2,3],
    [3,4],[3,5],[3,6],[4,5],[4,6],[5,6],
    [1,4],[2,5],
  ],
};

const VE64: GeometryType = {
  id: 've64',
  name: 'VE / 64-TET',
  subtitle: 'VECTOR EQUILIBRIUM',
  description: 'Cuboctahedron — Buckminster Fuller\'s zero-point matrix. All vectors equal.',
  nodes: [
    { id: 'n1', label: 'CROWN', x: 0.5, y: 0.05, hz: 432 },
    { id: 'n2', label: 'PREFRONTAL', x: 0.5, y: 0.22, hz: 528 },
    { id: 'n3', label: 'L FRONTAL', x: 0.15, y: 0.30, hz: 396 },
    { id: 'n4', label: 'R FRONTAL', x: 0.85, y: 0.30, hz: 396 },
    { id: 'n5', label: 'PINEAL', x: 0.35, y: 0.48, hz: 639 },
    { id: 'n6', label: 'THALAMUS', x: 0.65, y: 0.48, hz: 639 },
    { id: 'n7', label: 'L PARIETAL', x: 0.08, y: 0.55, hz: 285 },
    { id: 'n8', label: 'R PARIETAL', x: 0.92, y: 0.55, hz: 285 },
    { id: 'n9', label: 'L TEMPORAL', x: 0.22, y: 0.72, hz: 741 },
    { id: 'n10', label: 'R TEMPORAL', x: 0.78, y: 0.72, hz: 741 },
    { id: 'n11', label: 'OCCIPITAL', x: 0.5, y: 0.80, hz: 852 },
    { id: 'n12', label: 'BRAINSTEM', x: 0.5, y: 0.94, hz: 174 },
  ],
  edges: [
    [0,1],[0,2],[0,3],[1,2],[1,3],[1,4],[1,5],
    [2,4],[2,6],[3,5],[3,7],[4,5],[4,6],[4,8],
    [5,7],[5,9],[6,8],[7,9],[8,10],[8,11],
    [9,10],[9,11],[10,11],
  ],
};

const SRI_YANTRA: GeometryType = {
  id: 'sri',
  name: 'SRI YANTRA',
  subtitle: 'SRI YANTRA',
  description: '9 interlocking triangles around the central bindu — Tantric manifestation field.',
  nodes: [
    { id: 'bindu', label: 'BINDU', x: 0.5, y: 0.15, hz: 136.1 },
    { id: 'n2', label: 'L FRONTAL', x: 0.22, y: 0.30, hz: 10 },
    { id: 'n3', label: 'R FRONTAL', x: 0.78, y: 0.30, hz: 10 },
    { id: 'n4', label: 'PINEAL', x: 0.5, y: 0.38, hz: 7.83 },
    { id: 'n5', label: 'L PARIETAL', x: 0.12, y: 0.52, hz: 8 },
    { id: 'n6', label: 'R PARIETAL', x: 0.88, y: 0.52, hz: 8 },
    { id: 'n7', label: 'THALAMUS', x: 0.5, y: 0.55, hz: 6 },
    { id: 'n8', label: 'L TEMPORAL', x: 0.28, y: 0.72, hz: 12 },
    { id: 'n9', label: 'R TEMPORAL', x: 0.72, y: 0.72, hz: 12 },
    { id: 'n10', label: 'BRAINSTEM', x: 0.5, y: 0.90, hz: 2 },
  ],
  edges: [
    [0,1],[0,2],[0,3],[1,2],[1,4],[1,3],[2,3],[2,5],
    [3,4],[3,5],[3,6],[3,7],[3,8],
    [4,7],[5,8],[6,7],[6,8],[6,9],[7,9],[8,9],
  ],
};

const TORUS: GeometryType = {
  id: 'torus',
  name: 'TORUS',
  subtitle: 'TOROIDAL FIELD',
  description: 'Self-referencing donut field — up the axis, down the outer ring, back through root.',
  nodes: [
    { id: 'top', label: 'CROWN', x: 0.5, y: 0.05, hz: 7.83 },
    { id: 'ur', label: 'R FRONTAL', x: 0.82, y: 0.22, hz: 10 },
    { id: 'r', label: 'R PARIETAL', x: 0.92, y: 0.48, hz: 8 },
    { id: 'lr', label: 'R TEMPORAL', x: 0.78, y: 0.72, hz: 12 },
    { id: 'bot', label: 'BRAINSTEM', x: 0.5, y: 0.90, hz: 2 },
    { id: 'll', label: 'L TEMPORAL', x: 0.22, y: 0.72, hz: 12 },
    { id: 'l', label: 'L PARIETAL', x: 0.08, y: 0.48, hz: 8 },
    { id: 'ul', label: 'L FRONTAL', x: 0.18, y: 0.22, hz: 10 },
    { id: 'center', label: 'PINEAL', x: 0.5, y: 0.48, hz: 40 },
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],
  ],
};

const PHI_SPIRAL: GeometryType = {
  id: 'phi',
  name: '\u03A6 SPIRAL',
  subtitle: 'GOLDEN RATIO SPIRAL',
  description: 'Fibonacci spiral (\u03C6 = 1.618) seeded from Vesica Piscis — Solfeggio stacking by golden angle.',
  nodes: [
    { id: 'n1', label: 'BRAINSTEM', x: 0.5, y: 0.88, hz: 1.618 },
    { id: 'n2', label: 'OCCIPITAL', x: 0.62, y: 0.72, hz: 2.618 },
    { id: 'n3', label: 'R TEMPORAL', x: 0.78, y: 0.56, hz: 4.236 },
    { id: 'n4', label: 'R PARIETAL', x: 0.82, y: 0.36, hz: 6.854 },
    { id: 'n5', label: 'R FRONTAL', x: 0.68, y: 0.20, hz: 11.09 },
    { id: 'n6', label: 'CROWN', x: 0.5, y: 0.08, hz: 17.944 },
    { id: 'n7', label: 'L FRONTAL', x: 0.32, y: 0.20, hz: 29.034 },
    { id: 'n8', label: 'L PARIETAL', x: 0.18, y: 0.36, hz: 46.979 },
    { id: 'n9', label: 'L TEMPORAL', x: 0.22, y: 0.56, hz: 76.013 },
    { id: 'n10', label: 'PINEAL', x: 0.5, y: 0.48, hz: 432 },
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],
    [0,9],[9,10],[10,5],[10,0],
  ],
};

const ICOSA: GeometryType = {
  id: 'icosa',
  name: 'ICOSA',
  subtitle: 'ICOSAHEDRON',
  description: '20-faced water geometry — limbic regulation, glymphatic flow, emotional fluidity.',
  nodes: [
    { id: 'top', label: 'CROWN', x: 0.5, y: 0.05, hz: 528 },
    { id: 'n2', label: 'L FRONTAL', x: 0.18, y: 0.25, hz: 396 },
    { id: 'n3', label: 'R FRONTAL', x: 0.82, y: 0.25, hz: 396 },
    { id: 'n4', label: 'L PARIETAL', x: 0.08, y: 0.50, hz: 285 },
    { id: 'n5', label: 'R PARIETAL', x: 0.92, y: 0.50, hz: 285 },
    { id: 'n6', label: 'PINEAL', x: 0.5, y: 0.45, hz: 639 },
    { id: 'n7', label: 'L TEMPORAL', x: 0.18, y: 0.72, hz: 741 },
    { id: 'n8', label: 'R TEMPORAL', x: 0.82, y: 0.72, hz: 741 },
    { id: 'n9', label: 'OCCIPITAL', x: 0.5, y: 0.78, hz: 852 },
    { id: 'bot', label: 'BRAINSTEM', x: 0.5, y: 0.94, hz: 174 },
  ],
  edges: [
    [0,1],[0,2],[0,5],[1,2],[1,3],[1,5],[2,4],[2,5],
    [3,4],[3,6],[3,5],[4,5],[4,7],
    [5,6],[5,7],[5,8],[6,7],[6,8],[6,9],[7,8],[7,9],[8,9],
  ],
};

const GEOMETRIES: GeometryType[] = [TREE, MERKABA, METATRON, VE64, SRI_YANTRA, TORUS, PHI_SPIRAL, ICOSA];

// ═══ STARFIELD ═══
const NUM_STARS = 80;
const STARS = Array.from({ length: NUM_STARS }, (_, i) => ({
  x: Math.random() * MAP_W,
  y: Math.random() * MAP_H,
  r: Math.random() * 1.4 + 0.4,
  opacity: Math.random() * 0.5 + 0.15,
}));

// ═══ COMPONENT ═══
interface Props {
  onLoadFrequencies?: (freqs: number[]) => void;
}

const AnimatedNode = Animated.createAnimatedComponent(View);

export default function FrequencyMap({ onLoadFrequencies }: Props) {
  const [selectedGeo, setSelectedGeo] = useState(METATRON);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [soloNode, setSoloNode] = useState<number | null>(null);

  // Animations
  const breathAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const starTwinkle = useRef(new Animated.Value(0)).current;
  const edgeFlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous breath animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breathAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();

    // Star twinkle
    Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkle, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(starTwinkle, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();

    // Edge flow animation
    Animated.loop(
      Animated.timing(edgeFlow, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
    ).start();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [isPlaying]);

  const totalHz = useMemo(() =>
    selectedGeo.nodes.reduce((s, n) => s + n.hz, 0),
    [selectedGeo]
  );

  const dominantBand = useMemo(() => {
    const counts: Record<Band, number> = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    selectedGeo.nodes.forEach(n => { counts[getBand(n.hz)]++; });
    let max: Band = 'alpha';
    let maxC = 0;
    (Object.keys(counts) as Band[]).forEach(b => {
      if (counts[b] > maxC) { maxC = counts[b]; max = b; }
    });
    return max;
  }, [selectedGeo]);

  const handlePlayAll = useCallback(() => {
    if (isPlaying) {
      AudioEngine.stopAll();
      AudioEngine.stopMulti();
      setIsPlaying(false);
      setSoloNode(null);
      return;
    }
    const freqs = selectedGeo.nodes.map(n => n.hz);
    AudioEngine.playMulti(freqs, 0.3);
    setIsPlaying(true);
    setSoloNode(null);
    if (onLoadFrequencies) onLoadFrequencies(freqs);
  }, [isPlaying, selectedGeo, onLoadFrequencies]);

  const handleStop = useCallback(() => {
    AudioEngine.stopAll();
    AudioEngine.stopMulti();
    setIsPlaying(false);
    setSoloNode(null);
    setActiveNode(null);
  }, []);

  const handleNodeTap = useCallback((index: number) => {
    const node = selectedGeo.nodes[index];
    if (!node) return;

    if (soloNode === index) {
      // Unsolo
      AudioEngine.stopAll();
      AudioEngine.stopMulti();
      setSoloNode(null);
      setIsPlaying(false);
    } else {
      // Solo this node
      AudioEngine.stopAll();
      AudioEngine.stopMulti();
      AudioEngine.playMulti([node.hz], 0.5);
      setSoloNode(index);
      setIsPlaying(true);
    }
    setActiveNode(index);
  }, [selectedGeo, soloNode]);

  const handleSelectGeo = (geo: GeometryType) => {
    if (isPlaying) { handleStop(); }
    setSelectedGeo(geo);
    setActiveNode(null);
    setSoloNode(null);
  };

  // Animated values for rendering
  const breathScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  return (
    <View style={st.container}>
      {/* ═══ HEADER ═══ */}
      <View style={st.headerRow}>
        <View style={st.headerLeft}>
          <Text style={st.headerCaret}>{'\u276F'}</Text>
          <Text style={st.headerTitle}>FREQUENCY_MAP</Text>
          <Text style={st.headerSub}> / {selectedGeo.subtitle}</Text>
        </View>
        <View style={st.headerRight}>
          <View style={[st.statusDot, isPlaying && st.statusDotActive]} />
          <Text style={[st.activeCount, isPlaying && st.activeCountLive]}>
            {isPlaying ? 'ACTIVE' : `${selectedGeo.nodes.length} NODES`}
          </Text>
        </View>
      </View>

      {/* ═══ GEOMETRY TABS ═══ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabScroll} contentContainerStyle={st.tabRow}>
        {GEOMETRIES.map(g => (
          <TouchableOpacity
            key={g.id}
            style={[st.tab, selectedGeo.id === g.id && st.tabActive]}
            onPress={() => handleSelectGeo(g)}
            activeOpacity={0.7}
          >
            <Text style={[st.tabText, selectedGeo.id === g.id && st.tabTextActive]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ═══ DESCRIPTION ═══ */}
      <Text style={st.description}>{selectedGeo.description}</Text>

      {/* ═══ SVG MAP — INTERSTELLAR FIELD ═══ */}
      <View style={st.mapOuter}>
        <View style={st.mapContainer}>
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <Defs>
              {/* Deep space background gradient */}
              <RadialGradient id="bg-nebula" cx="50%" cy="40%" r="75%">
                <Stop offset="0%" stopColor="#0a001a" stopOpacity="1" />
                <Stop offset="40%" stopColor="#050010" stopOpacity="1" />
                <Stop offset="70%" stopColor="#020008" stopOpacity="1" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
              </RadialGradient>

              {/* Nebula accent */}
              <RadialGradient id="nebula-red" cx="30%" cy="60%" r="50%">
                <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0.1" />
                <Stop offset="60%" stopColor="#ff0a0a" stopOpacity="0.04" />
                <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
              </RadialGradient>

              <RadialGradient id="nebula-purple" cx="70%" cy="30%" r="45%">
                <Stop offset="0%" stopColor="#8844ff" stopOpacity="0.08" />
                <Stop offset="60%" stopColor="#8844ff" stopOpacity="0.03" />
                <Stop offset="100%" stopColor="#8844ff" stopOpacity="0" />
              </RadialGradient>

              {/* Dimensional portal glow */}
              <RadialGradient id="portal-glow" cx="50%" cy="48%" r="35%">
                <Stop offset="0%" stopColor={BAND_COLORS[dominantBand]} stopOpacity={isPlaying ? '0.12' : '0.04'} />
                <Stop offset="50%" stopColor={BAND_COLORS[dominantBand]} stopOpacity={isPlaying ? '0.04' : '0.01'} />
                <Stop offset="100%" stopColor={BAND_COLORS[dominantBand]} stopOpacity="0" />
              </RadialGradient>

              {/* Node glows */}
              {selectedGeo.nodes.map((n, i) => {
                const band = getBand(n.hz);
                const c = BAND_GLOW[band];
                const isSolo = soloNode === i;
                return (
                  <RadialGradient key={`glow-${i}`} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={c} stopOpacity={isSolo ? '1' : isPlaying ? '0.95' : '0.8'} />
                    <Stop offset="30%" stopColor={c} stopOpacity={isSolo ? '0.6' : isPlaying ? '0.4' : '0.2'} />
                    <Stop offset="60%" stopColor={c} stopOpacity={isSolo ? '0.2' : '0.06'} />
                    <Stop offset="100%" stopColor={c} stopOpacity="0" />
                  </RadialGradient>
                );
              })}

              {/* Edge energy gradient */}
              <LinearGradient id="edge-energy" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0.5" />
                <Stop offset="50%" stopColor="#ff3040" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0.5" />
              </LinearGradient>
            </Defs>

            {/* Background: Deep space */}
            <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#bg-nebula)" />
            <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#nebula-red)" />
            <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#nebula-purple)" />

            {/* Starfield */}
            {STARS.map((s, i) => (
              <Circle
                key={`star-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#ffffff"
                opacity={s.opacity}
              />
            ))}

            {/* Dimensional rings — concentric orbital rings */}
            {[0.15, 0.25, 0.35, 0.45].map((r, i) => (
              <Ellipse
                key={`ring-${i}`}
                cx={CX}
                cy={CY * 0.95}
                rx={MAP_W * r}
                ry={MAP_H * r * 0.55}
                fill="none"
                stroke={isPlaying ? '#ff0a0a' : '#ffffff'}
                strokeWidth={0.6}
                opacity={isPlaying ? 0.2 - i * 0.03 : 0.08 - i * 0.012}
                strokeDasharray={`${4 + i * 2},${8 + i * 4}`}
              />
            ))}

            {/* Portal glow in center */}
            <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#portal-glow)" />

            {/* ═══ GEOMETRY EDGES ═══ */}
            {selectedGeo.edges.map(([a, b], i) => {
              const na = selectedGeo.nodes[a];
              const nb = selectedGeo.nodes[b];
              if (!na || !nb) return null;
              const ax = na.x * MAP_W;
              const ay = na.y * MAP_H;
              const bx = nb.x * MAP_W;
              const by = nb.y * MAP_H;
              const isSoloEdge = soloNode !== null && (a === soloNode || b === soloNode);
              const isActiveEdge = activeNode !== null && (a === activeNode || b === activeNode);

              return (
                <G key={`edge-${i}`}>
                  {/* Outer glow line */}
                  {(isPlaying || isSoloEdge) && (
                    <Line
                      x1={ax} y1={ay} x2={bx} y2={by}
                      stroke={isSoloEdge ? BAND_COLORS[getBand(selectedGeo.nodes[soloNode!].hz)] : '#ff0a0a'}
                      strokeWidth={isSoloEdge ? 3 : 2}
                      opacity={isSoloEdge ? 0.3 : 0.08}
                    />
                  )}
                  {/* Main line */}
                  <Line
                    x1={ax} y1={ay} x2={bx} y2={by}
                    stroke={isSoloEdge ? BAND_COLORS[getBand(selectedGeo.nodes[soloNode!].hz)] : isActiveEdge ? '#ff3040' : isPlaying ? '#ff0a0a' : '#ffffff'}
                    strokeWidth={isSoloEdge ? 1.8 : isPlaying ? 1 : 0.7}
                    opacity={isSoloEdge ? 0.9 : isPlaying ? 0.45 : 0.2}
                  />
                </G>
              );
            })}

            {/* ═══ NODES ═══ */}
            {selectedGeo.nodes.map((n, i) => {
              const cx = n.x * MAP_W;
              const cy = n.y * MAP_H;
              const band = getBand(n.hz);
              const color = BAND_COLORS[band];
              const glow = BAND_GLOW[band];
              const isSolo = soloNode === i;
              const isActive = activeNode === i;
              const baseR = 22;
              const r = isSolo ? 28 : baseR;

              return (
                <G key={`node-${i}`} onPress={() => handleNodeTap(i)}>
                  {/* Outer dimensional halo — large soft glow */}
                  <Circle
                    cx={cx} cy={cy}
                    r={isSolo ? r * 4 : isPlaying ? r * 3 : r * 2.5}
                    fill={`url(#glow-${i})`}
                    opacity={isSolo ? 1 : isPlaying ? 0.7 : 0.4}
                  />

                  {/* Corona ring */}
                  {(isPlaying || isSolo) && (
                    <Circle
                      cx={cx} cy={cy}
                      r={isSolo ? r * 2.2 : r * 1.8}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSolo ? 1 : 0.5}
                      opacity={isSolo ? 0.6 : 0.2}
                      strokeDasharray={isSolo ? '0' : '3,5'}
                    />
                  )}

                  {/* Inner ring (orbit) */}
                  {isSolo && (
                    <Circle
                      cx={cx} cy={cy}
                      r={r * 1.5}
                      fill="none"
                      stroke={glow}
                      strokeWidth={0.8}
                      opacity={0.4}
                    />
                  )}

                  {/* Node body — dark core with colored border */}
                  <Circle
                    cx={cx} cy={cy}
                    r={r}
                    fill="#060612"
                    stroke={color}
                    strokeWidth={isSolo ? 2.5 : isActive ? 2 : 1.5}
                    opacity={1}
                  />

                  {/* Inner core — colored center */}
                  <Circle
                    cx={cx} cy={cy}
                    r={r * 0.55}
                    fill={color}
                    opacity={isSolo ? 1 : isPlaying ? 0.9 : 0.7}
                  />

                  {/* Hot pixel — white center for intensity */}
                  <Circle
                    cx={cx} cy={cy}
                    r={isSolo ? 4 : 2.5}
                    fill="#ffffff"
                    opacity={isSolo ? 1 : isPlaying ? 0.7 : 0.4}
                  />

                  {/* Label */}
                  <SvgText
                    x={cx} y={cy - r - 8}
                    fill={isSolo ? '#ffffff' : color}
                    fontSize={isSolo ? 9 : 7.5}
                    fontWeight="900"
                    textAnchor="middle"
                    letterSpacing={1.5}
                    opacity={isSolo ? 1 : 0.9}
                  >
                    {n.label}
                  </SvgText>

                  {/* Hz value */}
                  <SvgText
                    x={cx} y={cy + 4}
                    fill="#ffffff"
                    fontSize={isSolo ? 10 : 8}
                    fontWeight="900"
                    textAnchor="middle"
                    opacity={isSolo ? 1 : 0.95}
                  >
                    {n.hz < 100 ? n.hz.toFixed(n.hz % 1 ? 1 : 0) : Math.round(n.hz)}
                  </SvgText>
                  <SvgText
                    x={cx} y={cy + 12}
                    fill="#ffffff"
                    fontSize={4.5}
                    textAnchor="middle"
                    opacity={0.4}
                  >
                    Hz
                  </SvgText>
                </G>
              );
            })}

            {/* Coordinate grid markers */}
            <SvgText x={8} y={MAP_H - 6} fill="#ffffff" fontSize={5} opacity={0.1} letterSpacing={1}>
              DIMENSION: {selectedGeo.id.toUpperCase()}
            </SvgText>
            <SvgText x={MAP_W - 8} y={MAP_H - 6} fill="#ffffff" fontSize={5} opacity={0.1} letterSpacing={1} textAnchor="end">
              {'\u03A3'} {totalHz.toFixed(1)} Hz
            </SvgText>
          </Svg>

          {/* Solo node detail overlay */}
          {soloNode !== null && selectedGeo.nodes[soloNode] && (
            <View style={st.soloOverlay}>
              <View style={[st.soloBadge, { borderColor: BAND_COLORS[getBand(selectedGeo.nodes[soloNode].hz)] }]}>
                <Text style={[st.soloLabel, { color: BAND_COLORS[getBand(selectedGeo.nodes[soloNode].hz)] }]}>
                  {'\u25CF'} {selectedGeo.nodes[soloNode].label}
                </Text>
                <Text style={st.soloHz}>{selectedGeo.nodes[soloNode].hz} Hz</Text>
                <Text style={st.soloBand}>{getBand(selectedGeo.nodes[soloNode].hz).toUpperCase()} WAVE</Text>
              </View>
            </View>
          )}
        </View>

        {/* ═══ CONTROLS BAR ═══ */}
        <View style={st.controlBar}>
          <TouchableOpacity
            style={[st.playBtn, isPlaying && st.playBtnActive]}
            onPress={handlePlayAll}
            activeOpacity={0.7}
          >
            <Text style={[st.playIcon, isPlaying && st.playIconActive]}>
              {isPlaying ? '\u25A0' : '\u25B6'}
            </Text>
            <Text style={[st.playBtnText, isPlaying && st.playBtnTextActive]}>
              {isPlaying ? 'STOP ALL' : 'PLAY GEOMETRY'}
            </Text>
          </TouchableOpacity>

          <View style={st.infoCluster}>
            <View style={st.infoDotRow}>
              <View style={[st.infoDot, { backgroundColor: BAND_COLORS[dominantBand] }]} />
              <Text style={[st.infoLabel, { color: BAND_COLORS[dominantBand] }]}>
                {dominantBand.toUpperCase()}
              </Text>
            </View>
            <Text style={st.infoHz}>{'\u03A3'} {totalHz.toFixed(1)} Hz</Text>
          </View>
        </View>

        {/* ═══ NODE INTERACTION HINT ═══ */}
        <Text style={st.hint}>TAP ANY NODE TO SOLO · TAP AGAIN TO RELEASE</Text>

        {/* ═══ BRAINWAVE LEGEND ═══ */}
        <View style={st.legend}>
          {(['delta', 'theta', 'alpha', 'beta', 'gamma'] as Band[]).map(b => (
            <View key={b} style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: BAND_COLORS[b] }]} />
              <Text style={st.legendLabel}>{b.charAt(0).toUpperCase() + b.slice(1)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ═══ STYLES ═══
const st = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 4,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  headerCaret: {
    color: '#ff0a0a',
    fontSize: 10,
    marginRight: 6,
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#ff0a0a55',
    fontSize: 9,
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#333',
  },
  statusDotActive: {
    backgroundColor: '#00ff44',
  },
  activeCount: {
    color: '#555',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  activeCountLive: {
    color: '#00ff44',
  },

  // Tabs
  tabScroll: {
    marginBottom: 6,
  },
  tabRow: {
    paddingHorizontal: 8,
    gap: 5,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 3,
    backgroundColor: '#050505',
  },
  tabActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0000',
  },
  tabText: {
    color: '#444',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: '#ff0a0a',
  },

  // Description
  description: {
    color: '#ff0a0a44',
    fontSize: 8,
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 8,
    lineHeight: 12,
  },

  // Map
  mapOuter: {
    marginHorizontal: 0,
  },
  mapContainer: {
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 4,
    position: 'relative',
    backgroundColor: '#020005',
  },

  // Solo overlay
  soloOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  soloBadge: {
    backgroundColor: '#000000cc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  soloLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  soloHz: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  soloBand: {
    color: '#ffffff55',
    fontSize: 7,
    letterSpacing: 2,
    marginTop: 2,
  },

  // Controls
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginTop: 2,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ff0a0a33',
    borderRadius: 4,
    backgroundColor: '#0a0000',
  },
  playBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0000',
  },
  playIcon: {
    color: '#ff0a0a66',
    fontSize: 10,
  },
  playIconActive: {
    color: '#ff0a0a',
  },
  playBtnText: {
    color: '#ff0a0a88',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  playBtnTextActive: {
    color: '#ff0a0a',
  },
  infoCluster: {
    alignItems: 'flex-end',
    gap: 2,
  },
  infoDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  infoHz: {
    color: '#ffffff55',
    fontSize: 8,
    letterSpacing: 1,
  },

  // Hint
  hint: {
    color: '#ffffff22',
    fontSize: 7,
    letterSpacing: 3,
    textAlign: 'center',
    paddingVertical: 6,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffffff08',
    marginHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legendLabel: {
    color: '#ffffff44',
    fontSize: 7,
    letterSpacing: 1,
  },
});
