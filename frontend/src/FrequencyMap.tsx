import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { AudioEngine } from './AudioEngine';

const SW = Dimensions.get('window').width;
const MAP_W = SW - 16;
const MAP_H = MAP_W * 0.95;

// ═══ BRAINWAVE BANDS ═══
type Band = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
const BAND_COLORS: Record<Band, string> = {
  delta: '#00ccff',
  theta: '#8844ff',
  alpha: '#ffaa00',
  beta: '#ff6600',
  gamma: '#ff0a0a',
};
const BAND_RANGES: Record<Band, [number, number]> = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 100],
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
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  hz: number;
}

// ═══ GEOMETRY TYPES ═══
interface GeometryType {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  nodes: BrainNode[];
  edges: [number, number][]; // pairs of node indices to connect
}

const METATRON: GeometryType = {
  id: 'metatron',
  name: 'METATRON',
  subtitle: "METATRON'S CUBE",
  description: '13-circle Fruit of Life with all 5 Platonic solids — whole-brain non-local resonance.',
  // Metatron data matched to godmodesound.com
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

// ═══ COMPONENT ═══
interface Props {
  onLoadFrequencies?: (freqs: number[]) => void;
}

export default function FrequencyMap({ onLoadFrequencies }: Props) {
  const [selectedGeo, setSelectedGeo] = useState(METATRON);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      AudioEngine.stopAll();
      AudioEngine.stopMulti();
      setIsPlaying(false);
      return;
    }
    // Play all node frequencies via AudioEngine
    const freqs = selectedGeo.nodes.map(n => n.hz);
    AudioEngine.playMulti(freqs, 0.3);
    setIsPlaying(true);
    if (onLoadFrequencies) onLoadFrequencies(freqs);
  }, [isPlaying, selectedGeo, onLoadFrequencies]);

  const handleStop = useCallback(() => {
    AudioEngine.stopAll();
    AudioEngine.stopMulti();
    setIsPlaying(false);
  }, []);

  const handleSelectGeo = (geo: GeometryType) => {
    if (isPlaying) { handleStop(); }
    setSelectedGeo(geo);
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.headerRow}>
        <Text style={st.headerTitle}>{'\u003E'} FREQUENCY_MAP</Text>
        <Text style={st.headerSub}> / {selectedGeo.subtitle}</Text>
        <View style={st.headerRight}>
          <Text style={st.activeCount}>{selectedGeo.nodes.length} active</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={st.controlRow}>
        <TouchableOpacity style={[st.playBtn, isPlaying && st.playBtnActive]} onPress={handlePlay} activeOpacity={0.7}>
          <Text style={st.playBtnText}>{isPlaying ? '\u25A0 STOP' : '\u25B6 PLAY GEOMETRY'}</Text>
        </TouchableOpacity>
        {isPlaying && (
          <TouchableOpacity style={st.stopBtn} onPress={handleStop} activeOpacity={0.7}>
            <Text style={st.stopBtnText}>{'\u25A0'} STOP</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Geometry Tabs */}
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

      {/* Description */}
      <Text style={st.description}>{selectedGeo.description}</Text>

      {/* SVG Map */}
      <View style={st.mapContainer}>
        <View style={st.mapBorder}>
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <Defs>
              {selectedGeo.nodes.map((n, i) => {
                const band = getBand(n.hz);
                const c = BAND_COLORS[band];
                return (
                  <RadialGradient key={`grad-${i}`} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={c} stopOpacity="0.8" />
                    <Stop offset="60%" stopColor={c} stopOpacity="0.15" />
                    <Stop offset="100%" stopColor={c} stopOpacity="0" />
                  </RadialGradient>
                );
              })}
            </Defs>

            {/* Edges / Connection Lines */}
            {selectedGeo.edges.map(([a, b], i) => {
              const na = selectedGeo.nodes[a];
              const nb = selectedGeo.nodes[b];
              if (!na || !nb) return null;
              return (
                <Line
                  key={`edge-${i}`}
                  x1={na.x * MAP_W} y1={na.y * MAP_H}
                  x2={nb.x * MAP_W} y2={nb.y * MAP_H}
                  stroke={isPlaying ? '#ffaa0044' : '#ffffff18'}
                  strokeWidth={isPlaying ? 1.2 : 0.8}
                />
              );
            })}

            {/* Nodes */}
            {selectedGeo.nodes.map((n, i) => {
              const cx = n.x * MAP_W;
              const cy = n.y * MAP_H;
              const band = getBand(n.hz);
              const color = BAND_COLORS[band];
              const r = 14;
              return (
                <G key={`node-${i}`}>
                  {/* Outer glow */}
                  <Circle cx={cx} cy={cy} r={r * 2.2} fill={`url(#glow-${i})`} opacity={isPlaying ? 0.9 : 0.5} />
                  {/* Node circle */}
                  <Circle cx={cx} cy={cy} r={r} fill="#000000" stroke={color} strokeWidth={1.5} opacity={0.9} />
                  <Circle cx={cx} cy={cy} r={r * 0.45} fill={color} opacity={isPlaying ? 0.9 : 0.6} />
                  {/* Label */}
                  <SvgText
                    x={cx} y={cy - r - 6}
                    fill={color}
                    fontSize={7}
                    fontWeight="700"
                    textAnchor="middle"
                    letterSpacing={1}
                  >
                    {n.label}
                  </SvgText>
                  {/* Frequency */}
                  <SvgText
                    x={cx} y={cy + 3}
                    fill="#ffffff"
                    fontSize={7.5}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {n.hz < 100 ? n.hz.toFixed(n.hz % 1 ? 1 : 0) : Math.round(n.hz)}
                  </SvgText>
                  <SvgText
                    x={cx} y={cy + 12}
                    fill="#ffffff66"
                    fontSize={5}
                    textAnchor="middle"
                  >
                    Hz
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>

        {/* Info Panel */}
        <View style={st.infoPanel}>
          <View style={st.infoDotRow}>
            <View style={[st.infoDot, { backgroundColor: BAND_COLORS[dominantBand] }]} />
            <Text style={[st.infoLabel, { color: BAND_COLORS[dominantBand] }]}>
              {dominantBand.toUpperCase()}
            </Text>
          </View>
          <Text style={st.infoHz}>{'\u03A3'} {totalHz.toFixed(1)} Hz</Text>
          <Text style={st.infoNodes}>{selectedGeo.nodes.length} NODES</Text>
        </View>
      </View>

      {/* Brainwave Legend */}
      <View style={st.legend}>
        {(['delta', 'theta', 'alpha', 'beta', 'gamma'] as Band[]).map(b => (
          <View key={b} style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: BAND_COLORS[b] }]} />
            <Text style={st.legendText}>{b.charAt(0).toUpperCase() + b.slice(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ═══ STYLES ═══
const st = StyleSheet.create({
  container: {
    marginTop: 14,
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#ff0a0a66',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  activeCount: {
    color: '#ffffff44',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  controlRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
    marginBottom: 8,
  },
  playBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ff0a0a44',
    borderRadius: 3,
  },
  playBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a15',
  },
  playBtnText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 2,
  },
  stopBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ffffff33',
    borderRadius: 3,
  },
  stopBtnText: {
    color: '#ffffff88',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 2,
  },
  tabScroll: {
    marginBottom: 4,
  },
  tabRow: {
    paddingHorizontal: 8,
    gap: 4,
  },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ffffff18',
    borderRadius: 2,
  },
  tabActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a15',
  },
  tabText: {
    color: '#ffffff44',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#ff0a0a',
  },
  description: {
    color: '#ff0a0a44',
    fontSize: 7.5,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  mapContainer: {
    position: 'relative',
  },
  mapBorder: {
    borderWidth: 1,
    borderColor: '#ff0a0a22',
    borderRadius: 4,
    backgroundColor: '#050505',
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  infoPanel: {
    position: 'absolute',
    top: 8,
    right: 12,
    alignItems: 'flex-end',
    gap: 2,
  },
  infoDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  infoHz: {
    color: '#ffffff88',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  infoNodes: {
    color: '#ffffff44',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  legendText: {
    color: '#ffffff55',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 0.5,
  },
});
