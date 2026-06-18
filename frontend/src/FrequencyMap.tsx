import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Easing } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Line,
  Path,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Text as SvgText,
  Rect,
  Polygon,
  Ellipse,
} from 'react-native-svg';
import { AudioEngine } from './AudioEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_W = SCREEN_WIDTH - 32;
const MAP_H = MAP_W * 0.9;
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// Sacred Geometry Types
type GeometryType = 'TREE' | 'MERKABA' | 'METATRON' | 'VE64' | 'SRI_YANTRA' | 'TORUS' | 'PHI_SPIRAL' | 'ICOSA';

const GEOMETRY_TABS: { id: GeometryType; label: string; description: string }[] = [
  { id: 'TREE', label: 'TREE', description: 'Tree of Life — 10 Sephiroth, pathways of consciousness ascension' },
  { id: 'MERKABA', label: 'MERKABA', description: 'Star Tetrahedron — counter-rotating light vehicle for crown-root coherence' },
  { id: 'METATRON', label: 'METATRON', description: "Metatron's Cube — 13 spheres containing all Platonic solids" },
  { id: 'VE64', label: 'VE / 64-TET', description: 'Vector Equilibrium — zero-point energy structure, 64 tetrahedra' },
  { id: 'SRI_YANTRA', label: 'SRI YANTRA', description: 'Sri Yantra — 9 interlocking triangles, cosmic creation geometry' },
  { id: 'TORUS', label: 'TORUS', description: 'Toroidal Field — self-sustaining energy flow pattern' },
  { id: 'PHI_SPIRAL', label: 'Φ SPIRAL', description: 'Golden Spiral — Fibonacci sequence, natural growth pattern' },
  { id: 'ICOSA', label: 'ICOSA', description: 'Icosahedron — 20 faces, water element, emotional flow' },
];

// Generic Node interface for all geometries
interface GeometryNode {
  id: string;
  name: string;
  x: number;
  y: number;
  freq: number;
  band: string;
  color: string;
}

// ═══════════════════════════════════════════════════════════════
// TREE OF LIFE - 10 Sephiroth
// ═══════════════════════════════════════════════════════════════
const TREE_NODES: GeometryNode[] = [
  { id: 'kether', name: 'KETHER', x: CX, y: MAP_H * 0.08, freq: 963, band: 'CROWN', color: '#FFFFFF' },
  { id: 'chokmah', name: 'CHOKMAH', x: MAP_W * 0.75, y: MAP_H * 0.18, freq: 852, band: 'WISDOM', color: '#808080' },
  { id: 'binah', name: 'BINAH', x: MAP_W * 0.25, y: MAP_H * 0.18, freq: 741, band: 'UNDERSTANDING', color: '#000000' },
  { id: 'chesed', name: 'CHESED', x: MAP_W * 0.75, y: MAP_H * 0.38, freq: 639, band: 'MERCY', color: '#4169E1' },
  { id: 'geburah', name: 'GEBURAH', x: MAP_W * 0.25, y: MAP_H * 0.38, freq: 528, band: 'STRENGTH', color: '#DC143C' },
  { id: 'tiphareth', name: 'TIPHARETH', x: CX, y: MAP_H * 0.48, freq: 528, band: 'BEAUTY', color: '#FFD700' },
  { id: 'netzach', name: 'NETZACH', x: MAP_W * 0.75, y: MAP_H * 0.62, freq: 417, band: 'VICTORY', color: '#32CD32' },
  { id: 'hod', name: 'HOD', x: MAP_W * 0.25, y: MAP_H * 0.62, freq: 396, band: 'SPLENDOR', color: '#FF8C00' },
  { id: 'yesod', name: 'YESOD', x: CX, y: MAP_H * 0.75, freq: 285, band: 'FOUNDATION', color: '#9370DB' },
  { id: 'malkuth', name: 'MALKUTH', x: CX, y: MAP_H * 0.92, freq: 174, band: 'KINGDOM', color: '#8B4513' },
];

const TREE_CONNECTIONS = [
  ['kether', 'chokmah'], ['kether', 'binah'], ['chokmah', 'binah'],
  ['chokmah', 'chesed'], ['binah', 'geburah'], ['chokmah', 'tiphareth'], ['binah', 'tiphareth'],
  ['chesed', 'geburah'], ['chesed', 'tiphareth'], ['geburah', 'tiphareth'],
  ['chesed', 'netzach'], ['geburah', 'hod'], ['tiphareth', 'netzach'], ['tiphareth', 'hod'],
  ['netzach', 'hod'], ['netzach', 'yesod'], ['hod', 'yesod'], ['tiphareth', 'yesod'],
  ['yesod', 'malkuth'],
];

// ═══════════════════════════════════════════════════════════════
// MERKABA - Star Tetrahedron (Brain Regions)
// ═══════════════════════════════════════════════════════════════
const MERKABA_NODES: GeometryNode[] = [
  { id: 'crown', name: 'CROWN', x: CX, y: MAP_H * 0.12, freq: 963, band: 'GAMMA', color: '#FF6B6B' },
  { id: 'l_frontal', name: 'L FRONTAL', x: MAP_W * 0.22, y: MAP_H * 0.28, freq: 18, band: 'BETA', color: '#FFD93D' },
  { id: 'r_frontal', name: 'R FRONTAL', x: MAP_W * 0.78, y: MAP_H * 0.28, freq: 18, band: 'BETA', color: '#FFD93D' },
  { id: 'pineal', name: 'PINEAL', x: CX, y: MAP_H * 0.42, freq: 936, band: 'ALPHA', color: '#FF6B6B' },
  { id: 'l_temporal', name: 'L TEMPORAL', x: MAP_W * 0.08, y: MAP_H * 0.50, freq: 12, band: 'ALPHA', color: '#6BCB77' },
  { id: 'r_temporal', name: 'R TEMPORAL', x: MAP_W * 0.92, y: MAP_H * 0.50, freq: 12, band: 'ALPHA', color: '#6BCB77' },
  { id: 'thalamus', name: 'THALAMUS', x: CX, y: MAP_H * 0.58, freq: 6, band: 'THETA', color: '#4D96FF' },
  { id: 'l_parietal', name: 'L PARIETAL', x: MAP_W * 0.22, y: MAP_H * 0.72, freq: 10, band: 'ALPHA', color: '#FFD93D' },
  { id: 'r_parietal', name: 'R PARIETAL', x: MAP_W * 0.78, y: MAP_H * 0.72, freq: 10, band: 'ALPHA', color: '#FFD93D' },
  { id: 'root', name: 'ROOT', x: CX, y: MAP_H * 0.88, freq: 396, band: 'DELTA', color: '#9B59B6' },
];

const MERKABA_CONNECTIONS = [
  ['crown', 'l_frontal'], ['crown', 'r_frontal'], ['l_frontal', 'r_frontal'],
  ['l_frontal', 'pineal'], ['r_frontal', 'pineal'], ['crown', 'pineal'],
  ['l_temporal', 'r_temporal'], ['l_temporal', 'pineal'], ['r_temporal', 'pineal'],
  ['l_temporal', 'thalamus'], ['r_temporal', 'thalamus'], ['pineal', 'thalamus'],
  ['thalamus', 'l_parietal'], ['thalamus', 'r_parietal'], ['l_parietal', 'r_parietal'],
  ['l_parietal', 'root'], ['r_parietal', 'root'], ['thalamus', 'root'],
  ['l_frontal', 'l_temporal'], ['r_frontal', 'r_temporal'],
  ['l_temporal', 'l_parietal'], ['r_temporal', 'r_parietal'],
];

// ═══════════════════════════════════════════════════════════════
// METATRON'S CUBE - 13 Spheres
// ═══════════════════════════════════════════════════════════════
const METATRON_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  const centerNode: GeometryNode = { id: 'center', name: 'SOURCE', x: CX, y: CY, freq: 432, band: 'OM', color: '#FFFFFF' };
  nodes.push(centerNode);
  
  // Inner hexagon (6 nodes)
  const innerR = MAP_W * 0.18;
  const innerFreqs = [528, 639, 741, 852, 963, 396];
  const innerNames = ['LOVE', 'CONNECT', 'AWAKEN', 'INTUITION', 'ONENESS', 'LIBERATE'];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    nodes.push({
      id: `inner_${i}`,
      name: innerNames[i],
      x: CX + Math.cos(angle) * innerR,
      y: CY + Math.sin(angle) * innerR,
      freq: innerFreqs[i],
      band: `${innerFreqs[i]}Hz`,
      color: `hsl(${i * 60}, 70%, 60%)`,
    });
  }
  
  // Outer hexagon (6 nodes)
  const outerR = MAP_W * 0.36;
  const outerFreqs = [174, 285, 417, 528, 639, 741];
  const outerNames = ['EARTH', 'QUANTUM', 'CHANGE', 'MIRACLE', 'RELATION', 'EXPRESS'];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 60) * (Math.PI / 180);
    nodes.push({
      id: `outer_${i}`,
      name: outerNames[i],
      x: CX + Math.cos(angle) * outerR,
      y: CY + Math.sin(angle) * outerR,
      freq: outerFreqs[i],
      band: `${outerFreqs[i]}Hz`,
      color: `hsl(${i * 60 + 30}, 70%, 50%)`,
    });
  }
  return nodes;
})();

// ═══════════════════════════════════════════════════════════════
// VECTOR EQUILIBRIUM / 64-TET
// ═══════════════════════════════════════════════════════════════
const VE64_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  // Center
  nodes.push({ id: 've_center', name: 'ZERO POINT', x: CX, y: CY, freq: 432, band: 'BALANCE', color: '#FFFFFF' });
  
  // 12 vertices of cuboctahedron
  const freqs = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963, 1074, 1185];
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'UP-N', 'UP-S', 'DN-N', 'DN-S'];
  
  // Square vertices (4)
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90 + 45) * (Math.PI / 180);
    const r = MAP_W * 0.35;
    nodes.push({
      id: `ve_sq_${i}`,
      name: names[i * 2],
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r,
      freq: freqs[i * 2],
      band: 'VERTEX',
      color: `hsl(${i * 90}, 70%, 60%)`,
    });
  }
  
  // Triangle vertices top (4)
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * (Math.PI / 180);
    const r = MAP_W * 0.22;
    nodes.push({
      id: `ve_tri_t_${i}`,
      name: names[i * 2 + 1],
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.6 - MAP_H * 0.15,
      freq: freqs[i * 2 + 1],
      band: 'VERTEX',
      color: `hsl(${i * 90 + 45}, 70%, 50%)`,
    });
  }
  
  // Triangle vertices bottom (4)
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * (Math.PI / 180);
    const r = MAP_W * 0.22;
    nodes.push({
      id: `ve_tri_b_${i}`,
      name: `V${i + 8}`,
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.6 + MAP_H * 0.15,
      freq: freqs[i + 8] || 432,
      band: 'VERTEX',
      color: `hsl(${i * 90 + 22}, 60%, 55%)`,
    });
  }
  
  return nodes;
})();

// ═══════════════════════════════════════════════════════════════
// SRI YANTRA - 9 Interlocking Triangles
// ═══════════════════════════════════════════════════════════════
const SRI_YANTRA_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  // Bindu (center point)
  nodes.push({ id: 'bindu', name: 'BINDU', x: CX, y: CY, freq: 432, band: 'SOURCE', color: '#FF0000' });
  
  // Inner triangle points (upward - Shiva)
  const innerR = MAP_W * 0.12;
  nodes.push({ id: 'shiva_1', name: 'SHIVA 1', x: CX, y: CY - innerR, freq: 963, band: 'CONSCIOUSNESS', color: '#4169E1' });
  nodes.push({ id: 'shiva_2', name: 'SHIVA 2', x: CX - innerR * 0.866, y: CY + innerR * 0.5, freq: 852, band: 'CONSCIOUSNESS', color: '#4169E1' });
  nodes.push({ id: 'shiva_3', name: 'SHIVA 3', x: CX + innerR * 0.866, y: CY + innerR * 0.5, freq: 741, band: 'CONSCIOUSNESS', color: '#4169E1' });
  
  // Middle triangle points (downward - Shakti)
  const midR = MAP_W * 0.22;
  nodes.push({ id: 'shakti_1', name: 'SHAKTI 1', x: CX, y: CY + midR, freq: 639, band: 'ENERGY', color: '#DC143C' });
  nodes.push({ id: 'shakti_2', name: 'SHAKTI 2', x: CX - midR * 0.866, y: CY - midR * 0.5, freq: 528, band: 'ENERGY', color: '#DC143C' });
  nodes.push({ id: 'shakti_3', name: 'SHAKTI 3', x: CX + midR * 0.866, y: CY - midR * 0.5, freq: 417, band: 'ENERGY', color: '#DC143C' });
  
  // Outer points
  const outerR = MAP_W * 0.35;
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 - 90) * (Math.PI / 180);
    nodes.push({
      id: `outer_${i}`,
      name: `PETAL ${i + 1}`,
      x: CX + Math.cos(angle) * outerR,
      y: CY + Math.sin(angle) * outerR,
      freq: [174, 285, 396, 417, 528, 639, 741, 852][i],
      band: 'LOTUS',
      color: `hsl(${i * 45}, 70%, 55%)`,
    });
  }
  
  return nodes;
})();

// ═══════════════════════════════════════════════════════════════
// TORUS - Toroidal Field
// ═══════════════════════════════════════════════════════════════
const TORUS_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  // Center axis
  nodes.push({ id: 'torus_center', name: 'AXIS', x: CX, y: CY, freq: 432, band: 'CENTER', color: '#FFFFFF' });
  nodes.push({ id: 'torus_top', name: 'INFLOW', x: CX, y: MAP_H * 0.1, freq: 963, band: 'RECEIVE', color: '#00CED1' });
  nodes.push({ id: 'torus_bottom', name: 'OUTFLOW', x: CX, y: MAP_H * 0.9, freq: 174, band: 'EMIT', color: '#FF6B6B' });
  
  // Outer ring (energy flow)
  const outerR = MAP_W * 0.4;
  const flowFreqs = [285, 396, 417, 528, 639, 741, 852, 963];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 - 90) * (Math.PI / 180);
    nodes.push({
      id: `torus_outer_${i}`,
      name: `FLOW ${i + 1}`,
      x: CX + Math.cos(angle) * outerR,
      y: CY + Math.sin(angle) * outerR * 0.5,
      freq: flowFreqs[i],
      band: 'FLOW',
      color: `hsl(${180 + i * 22}, 70%, 55%)`,
    });
  }
  
  // Inner ring
  const innerR = MAP_W * 0.2;
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    nodes.push({
      id: `torus_inner_${i}`,
      name: `CORE ${i + 1}`,
      x: CX + Math.cos(angle) * innerR,
      y: CY + Math.sin(angle) * innerR * 0.4,
      freq: [432, 528, 639, 741, 852, 963][i],
      band: 'CORE',
      color: `hsl(${i * 60}, 80%, 60%)`,
    });
  }
  
  return nodes;
})();

// ═══════════════════════════════════════════════════════════════
// PHI SPIRAL - Golden Ratio
// ═══════════════════════════════════════════════════════════════
const PHI_SPIRAL_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  const PHI = 1.618033988749895;
  const fibFreqs = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963, 1074, 1185];
  
  // Spiral points
  for (let i = 0; i < 12; i++) {
    const angle = i * 137.5 * (Math.PI / 180); // Golden angle
    const r = MAP_W * 0.03 * Math.pow(PHI, i * 0.3);
    const clampedR = Math.min(r, MAP_W * 0.42);
    nodes.push({
      id: `phi_${i}`,
      name: `Φ${i + 1}`,
      x: CX + Math.cos(angle) * clampedR,
      y: CY + Math.sin(angle) * clampedR,
      freq: fibFreqs[i],
      band: `${fibFreqs[i]}Hz`,
      color: `hsl(${i * 30}, 70%, ${50 + i * 2}%)`,
    });
  }
  
  return nodes;
})();

// ═══════════════════════════════════════════════════════════════
// ICOSAHEDRON - 12 Vertices
// ═══════════════════════════════════════════════════════════════
const ICOSA_NODES: GeometryNode[] = (() => {
  const nodes: GeometryNode[] = [];
  const PHI = 1.618033988749895;
  const freqs = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963, 1074, 1185];
  const names = ['NORTH', 'EAST', 'SOUTH', 'WEST', 'NE-UP', 'SE-UP', 'SW-UP', 'NW-UP', 'NE-DN', 'SE-DN', 'SW-DN', 'NW-DN'];
  
  // Top and bottom poles
  nodes.push({ id: 'icosa_top', name: 'APEX', x: CX, y: MAP_H * 0.08, freq: 963, band: 'PEAK', color: '#00CED1' });
  nodes.push({ id: 'icosa_bottom', name: 'NADIR', x: CX, y: MAP_H * 0.92, freq: 174, band: 'BASE', color: '#FF6B6B' });
  
  // Upper ring (5 vertices)
  const upperR = MAP_W * 0.35;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    nodes.push({
      id: `icosa_upper_${i}`,
      name: names[i],
      x: CX + Math.cos(angle) * upperR,
      y: MAP_H * 0.32 + Math.sin(angle) * upperR * 0.15,
      freq: freqs[i + 2],
      band: 'UPPER',
      color: `hsl(${i * 72}, 70%, 55%)`,
    });
  }
  
  // Lower ring (5 vertices, offset by 36°)
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90 + 36) * (Math.PI / 180);
    nodes.push({
      id: `icosa_lower_${i}`,
      name: names[i + 5],
      x: CX + Math.cos(angle) * upperR,
      y: MAP_H * 0.68 + Math.sin(angle) * upperR * 0.15,
      freq: freqs[i + 7] || 432,
      band: 'LOWER',
      color: `hsl(${i * 72 + 36}, 60%, 50%)`,
    });
  }
  
  return nodes;
})();

// Solfeggio Frequencies
const SOLFEGGIO_FREQS = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963];

// Brainwave Bands
const BRAINWAVE_BANDS = [
  { name: 'DELTA', range: '0.5-4 Hz', color: '#9B59B6', width: 10 },
  { name: 'THETA', range: '4-8 Hz', color: '#4D96FF', width: 12 },
  { name: 'ALPHA', range: '8-12 Hz', color: '#6BCB77', width: 12 },
  { name: 'BETA', range: '12-30 Hz', color: '#FFD93D', width: 20 },
  { name: 'GAMMA', range: '30-100 Hz', color: '#FF6B6B', width: 20 },
  { name: 'HIGH GAMMA', range: '100+ Hz', color: '#4D96FF', width: 26 },
];

// State Machine Protocols
interface StateProtocol {
  id: string;
  name: string;
  subtitle: string;
  band: string;
  frequencies: number[];
  color: string;
}

const STATE_PROTOCOLS: StateProtocol[] = [
  { id: 'serenity', name: 'SERENITY', subtitle: 'DEEP CALM', band: 'ALPHA WAVE', frequencies: [432, 528], color: '#6BCB77' },
  { id: 'hyperfocus', name: 'HYPERFOCUS', subtitle: 'CONCENTRATION', band: 'BETA/GAMMA', frequencies: [40, 963], color: '#FFD93D' },
  { id: 'overdrive', name: 'OVERDRIVE', subtitle: 'MAX ENERGY', band: 'DOPAMINE', frequencies: [741, 852], color: '#FF6B6B' },
  { id: 'genesis', name: 'GENESIS', subtitle: 'CREATIVE FLOW', band: 'THETA', frequencies: [528, 639], color: '#4D96FF' },
  { id: 'euphoria', name: 'EUPHORIA', subtitle: 'BLISS', band: 'SEROTONIN', frequencies: [528, 963], color: '#9B59B6' },
  { id: 'regenerate', name: 'REGENERATE', subtitle: 'CELLULAR RENEWAL', band: 'DEEP RENEWAL', frequencies: [174, 285, 396], color: '#00CED1' },
];

// Cortex Layer Protocols  
const CORTEX_PROTOCOLS = [
  { id: 'prefrontal', name: 'PREFRONTAL', subtitle: 'EXECUTIVE FUNCTION', freq: 40, color: '#FF6B6B' },
  { id: 'motor', name: 'MOTOR CORTEX', subtitle: 'MOVEMENT PREP', freq: 20, color: '#FFD93D' },
  { id: 'sensory', name: 'SENSORY', subtitle: 'PERCEPTION', freq: 10, color: '#6BCB77' },
  { id: 'auditory', name: 'AUDITORY', subtitle: 'SOUND PROCESSING', freq: 432, color: '#4D96FF' },
  { id: 'visual', name: 'VISUAL', subtitle: 'SIGHT PROCESSING', freq: 528, color: '#9B59B6' },
  { id: 'limbic', name: 'LIMBIC', subtitle: 'EMOTION CENTER', freq: 639, color: '#FF69B4' },
];

interface Props {
  onFrequencySelect?: (freq: number) => void;
  showBrainMirror?: boolean;
}

export function FrequencyMap({ onFrequencySelect, showBrainMirror = true }: Props) {
  const [activeGeometry, setActiveGeometry] = useState<GeometryType>('MERKABA');
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set()); // For "Play Geometry" - multiple active nodes
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);
  const [protocolTab, setProtocolTab] = useState<'STATE' | 'CORTEX'>('STATE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingGeometry, setIsPlayingGeometry] = useState(false); // For geometry sequence playback
  const [activeSolfeggio, setActiveSolfeggio] = useState<number | null>(null);
  const [geometryPlayIndex, setGeometryPlayIndex] = useState<number>(-1); // Current node index in sequence
  const geometryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get nodes based on active geometry
  const currentNodes = useMemo(() => {
    switch (activeGeometry) {
      case 'TREE': return TREE_NODES;
      case 'MERKABA': return MERKABA_NODES;
      case 'METATRON': return METATRON_NODES;
      case 'VE64': return VE64_NODES;
      case 'SRI_YANTRA': return SRI_YANTRA_NODES;
      case 'TORUS': return TORUS_NODES;
      case 'PHI_SPIRAL': return PHI_SPIRAL_NODES;
      case 'ICOSA': return ICOSA_NODES;
      default: return MERKABA_NODES;
    }
  }, [activeGeometry]);

  // Get connections based on active geometry
  const currentConnections = useMemo(() => {
    switch (activeGeometry) {
      case 'TREE': return TREE_CONNECTIONS;
      case 'MERKABA': return MERKABA_CONNECTIONS;
      default: return [];
    }
  }, [activeGeometry]);

  // Get current geometry description
  const currentDescription = useMemo(() => {
    return GEOMETRY_TABS.find(t => t.id === activeGeometry)?.description || '';
  }, [activeGeometry]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Reset active node when geometry changes
  useEffect(() => {
    setActiveNode(null);
    setActiveNodes(new Set());
    setIsPlaying(false);
    setIsPlayingGeometry(false);
    setGeometryPlayIndex(-1);
    if (geometryIntervalRef.current) {
      clearInterval(geometryIntervalRef.current);
      geometryIntervalRef.current = null;
    }
    AudioEngine.stopCamelot();
  }, [activeGeometry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geometryIntervalRef.current) {
        clearInterval(geometryIntervalRef.current);
      }
    };
  }, []);

  // Play Geometry - lights up nodes sequentially and plays their frequencies
  const handlePlayGeometry = () => {
    if (isPlayingGeometry) {
      // Stop playing
      if (geometryIntervalRef.current) {
        clearInterval(geometryIntervalRef.current);
        geometryIntervalRef.current = null;
      }
      setIsPlayingGeometry(false);
      setActiveNodes(new Set());
      setGeometryPlayIndex(-1);
      AudioEngine.stopCamelot();
      AudioEngine.stopMulti();
      setIsPlaying(false);
    } else {
      // Start playing geometry sequence
      setIsPlayingGeometry(true);
      setIsPlaying(true);
      setActiveNode(null);
      setActiveSolfeggio(null);
      
      let index = 0;
      const litNodes = new Set<string>();
      
      // Light up first node immediately
      if (currentNodes.length > 0) {
        const firstNode = currentNodes[0];
        litNodes.add(firstNode.id);
        setActiveNodes(new Set(litNodes));
        setGeometryPlayIndex(0);
        AudioEngine.playCamelot(firstNode.freq);
      }
      
      // Set up interval to light up remaining nodes
      geometryIntervalRef.current = setInterval(() => {
        index++;
        
        if (index >= currentNodes.length) {
          // All nodes lit - keep them all active and play combined frequency
          const allFreqs = currentNodes.map(n => n.freq).slice(0, 6); // Limit to 6 for audio
          AudioEngine.playMulti(allFreqs, 0.15);
          
          // Keep all nodes lit for a moment, then restart sequence
          setTimeout(() => {
            if (geometryIntervalRef.current) {
              // Reset and continue loop
              index = 0;
              litNodes.clear();
              const firstNode = currentNodes[0];
              litNodes.add(firstNode.id);
              setActiveNodes(new Set(litNodes));
              setGeometryPlayIndex(0);
              AudioEngine.playCamelot(firstNode.freq);
            }
          }, 2000);
        } else {
          // Light up next node
          const node = currentNodes[index];
          litNodes.add(node.id);
          setActiveNodes(new Set(litNodes));
          setGeometryPlayIndex(index);
          AudioEngine.playCamelot(node.freq);
        }
      }, 600); // 600ms between each node
    }
  };

  const handleNodePress = (node: GeometryNode) => {
    if (activeNode === node.id) {
      AudioEngine.stopCamelot();
      setActiveNode(null);
      setIsPlaying(false);
    } else {
      AudioEngine.playCamelot(node.freq);
      setActiveNode(node.id);
      setIsPlaying(true);
      onFrequencySelect?.(node.freq);
    }
  };

  const handleSolfeggioPress = (freq: number) => {
    if (activeSolfeggio === freq) {
      AudioEngine.stopCamelot();
      setActiveSolfeggio(null);
      setIsPlaying(false);
    } else {
      AudioEngine.playCamelot(freq);
      setActiveSolfeggio(freq);
      setIsPlaying(true);
      onFrequencySelect?.(freq);
    }
  };

  const handleProtocolPress = (protocol: StateProtocol) => {
    if (activeProtocol === protocol.id) {
      AudioEngine.stopMulti();
      setActiveProtocol(null);
      setIsPlaying(false);
    } else {
      AudioEngine.playMulti(protocol.frequencies, 0.3);
      setActiveProtocol(protocol.id);
      setIsPlaying(true);
    }
  };

  const handleCortexPress = (cortex: typeof CORTEX_PROTOCOLS[0]) => {
    if (activeProtocol === cortex.id) {
      AudioEngine.stopCamelot();
      setActiveProtocol(null);
      setIsPlaying(false);
    } else {
      AudioEngine.playCamelot(cortex.freq);
      setActiveProtocol(cortex.id);
      setIsPlaying(true);
      onFrequencySelect?.(cortex.freq);
    }
  };

  // Get active node info for telemetry
  const activeNodeData = activeNode ? currentNodes.find(n => n.id === activeNode) : null;

  // Render geometry-specific decorations
  const renderGeometryDecorations = () => {
    switch (activeGeometry) {
      case 'METATRON':
        // Draw circles around nodes for Metatron's Cube
        return currentNodes.map((node, i) => (
          <SvgCircle
            key={`metatron-circle-${i}`}
            cx={node.x}
            cy={node.y}
            r={i === 0 ? MAP_W * 0.08 : MAP_W * 0.05}
            fill="none"
            stroke={node.color}
            strokeWidth={0.5}
            opacity={0.3}
          />
        ));
      
      case 'SRI_YANTRA':
        // Draw concentric triangles
        const triangles = [];
        for (let i = 0; i < 3; i++) {
          const r = MAP_W * (0.15 + i * 0.1);
          // Upward triangle
          triangles.push(
            <Polygon
              key={`sri-up-${i}`}
              points={`${CX},${CY - r} ${CX - r * 0.866},${CY + r * 0.5} ${CX + r * 0.866},${CY + r * 0.5}`}
              fill="none"
              stroke="#4169E1"
              strokeWidth={0.8}
              opacity={0.4 - i * 0.1}
            />
          );
          // Downward triangle
          triangles.push(
            <Polygon
              key={`sri-down-${i}`}
              points={`${CX},${CY + r} ${CX - r * 0.866},${CY - r * 0.5} ${CX + r * 0.866},${CY - r * 0.5}`}
              fill="none"
              stroke="#DC143C"
              strokeWidth={0.8}
              opacity={0.4 - i * 0.1}
            />
          );
        }
        return triangles;
      
      case 'TORUS':
        // Draw torus field lines
        const torusLines = [];
        for (let i = 0; i < 8; i++) {
          const angle = i * 45 * (Math.PI / 180);
          torusLines.push(
            <Path
              key={`torus-line-${i}`}
              d={`M ${CX} ${MAP_H * 0.1} Q ${CX + Math.cos(angle) * MAP_W * 0.5} ${CY} ${CX} ${MAP_H * 0.9}`}
              fill="none"
              stroke="#00CED1"
              strokeWidth={0.5}
              opacity={0.2}
            />
          );
        }
        // Outer ellipse
        torusLines.push(
          <Ellipse
            key="torus-outer"
            cx={CX}
            cy={CY}
            rx={MAP_W * 0.42}
            ry={MAP_H * 0.22}
            fill="none"
            stroke="#00CED1"
            strokeWidth={1}
            opacity={0.3}
          />
        );
        return torusLines;
      
      case 'PHI_SPIRAL':
        // Draw golden spiral
        const spiralPath = [];
        let prevX = CX, prevY = CY;
        const PHI = 1.618033988749895;
        for (let i = 0; i <= 720; i += 10) {
          const angle = i * (Math.PI / 180);
          const r = MAP_W * 0.01 * Math.pow(PHI, i / 360);
          const clampedR = Math.min(r, MAP_W * 0.44);
          const x = CX + Math.cos(angle) * clampedR;
          const y = CY + Math.sin(angle) * clampedR;
          if (i > 0) {
            spiralPath.push(
              <Line
                key={`spiral-${i}`}
                x1={prevX}
                y1={prevY}
                x2={x}
                y2={y}
                stroke="#FFD700"
                strokeWidth={0.8}
                opacity={0.4}
              />
            );
          }
          prevX = x;
          prevY = y;
        }
        return spiralPath;
      
      case 'ICOSA':
        // Draw icosahedron edges
        const icoLines = [];
        // Connect top to upper ring
        for (let i = 0; i < 5; i++) {
          const upperNode = currentNodes.find(n => n.id === `icosa_upper_${i}`);
          if (upperNode) {
            icoLines.push(
              <Line
                key={`ico-top-${i}`}
                x1={CX}
                y1={MAP_H * 0.08}
                x2={upperNode.x}
                y2={upperNode.y}
                stroke="#00CED1"
                strokeWidth={0.6}
                opacity={0.3}
              />
            );
          }
        }
        // Connect bottom to lower ring
        for (let i = 0; i < 5; i++) {
          const lowerNode = currentNodes.find(n => n.id === `icosa_lower_${i}`);
          if (lowerNode) {
            icoLines.push(
              <Line
                key={`ico-bottom-${i}`}
                x1={CX}
                y1={MAP_H * 0.92}
                x2={lowerNode.x}
                y2={lowerNode.y}
                stroke="#FF6B6B"
                strokeWidth={0.6}
                opacity={0.3}
              />
            );
          }
        }
        // Connect upper ring
        for (let i = 0; i < 5; i++) {
          const curr = currentNodes.find(n => n.id === `icosa_upper_${i}`);
          const next = currentNodes.find(n => n.id === `icosa_upper_${(i + 1) % 5}`);
          if (curr && next) {
            icoLines.push(
              <Line
                key={`ico-upper-ring-${i}`}
                x1={curr.x}
                y1={curr.y}
                x2={next.x}
                y2={next.y}
                stroke="#00CED1"
                strokeWidth={0.6}
                opacity={0.25}
              />
            );
          }
        }
        // Connect lower ring
        for (let i = 0; i < 5; i++) {
          const curr = currentNodes.find(n => n.id === `icosa_lower_${i}`);
          const next = currentNodes.find(n => n.id === `icosa_lower_${(i + 1) % 5}`);
          if (curr && next) {
            icoLines.push(
              <Line
                key={`ico-lower-ring-${i}`}
                x1={curr.x}
                y1={curr.y}
                x2={next.x}
                y2={next.y}
                stroke="#FF6B6B"
                strokeWidth={0.6}
                opacity={0.25}
              />
            );
          }
        }
        // Connect between rings
        for (let i = 0; i < 5; i++) {
          const upper = currentNodes.find(n => n.id === `icosa_upper_${i}`);
          const lower1 = currentNodes.find(n => n.id === `icosa_lower_${i}`);
          const lower2 = currentNodes.find(n => n.id === `icosa_lower_${(i + 4) % 5}`);
          if (upper && lower1) {
            icoLines.push(
              <Line
                key={`ico-cross-${i}-a`}
                x1={upper.x}
                y1={upper.y}
                x2={lower1.x}
                y2={lower1.y}
                stroke="#9370DB"
                strokeWidth={0.5}
                opacity={0.2}
              />
            );
          }
          if (upper && lower2) {
            icoLines.push(
              <Line
                key={`ico-cross-${i}-b`}
                x1={upper.x}
                y1={upper.y}
                x2={lower2.x}
                y2={lower2.y}
                stroke="#9370DB"
                strokeWidth={0.5}
                opacity={0.2}
              />
            );
          }
        }
        return icoLines;
      
      default:
        return null;
    }
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerTitle}>&gt; FREQUENCY_MAP</Text>
        <Text style={st.headerSub}>/ {activeGeometry}</Text>
        <View style={st.headerRight}>
          {(isPlaying || isPlayingGeometry) && <View style={st.liveDot} />}
          <TouchableOpacity 
            style={[st.playBtn, isPlayingGeometry && st.playBtnActive]} 
            onPress={handlePlayGeometry}
          >
            <Text style={[st.playBtnText, isPlayingGeometry && st.playBtnTextActive]}>
              {isPlayingGeometry ? '■ STOP' : '▶ PLAY GEOMETRY'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Geometry Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabsScroll} contentContainerStyle={st.tabsContainer}>
        {GEOMETRY_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[st.tab, activeGeometry === tab.id && st.tabActive]}
            onPress={() => setActiveGeometry(tab.id)}
          >
            <Text style={[st.tabText, activeGeometry === tab.id && st.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Geometry Description */}
      <Text style={st.geoDescription}>
        {currentDescription}
      </Text>

      {/* Main Visualization */}
      <View style={st.vizContainer}>
        {/* Left Telemetry */}
        <View style={st.telemetryLeft}>
          <Text style={st.telemetryLabel}>◇ GEOMETRY</Text>
          <Text style={st.telemetryValue}>{activeGeometry}</Text>
          <Text style={st.telemetryLabel}>NODES: {currentNodes.length}</Text>
          <Text style={st.telemetryLabel}>STATUS: {isPlaying ? 'LIVE' : 'IDLE'}</Text>
        </View>

        {/* SVG Visualization */}
        <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
          <Defs>
            {/* Background gradient */}
            <RadialGradient id="map-bg" cx="50%" cy="50%" r="70%">
              <Stop offset="0%" stopColor="#1a0505" stopOpacity="1" />
              <Stop offset="50%" stopColor="#0d0202" stopOpacity="1" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </RadialGradient>

            {/* Node glows */}
            {currentNodes.map((node, i) => (
              <RadialGradient key={`glow-${node.id}`} id={`glow-${node.id}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={node.color} stopOpacity={activeNode === node.id ? '1' : '0.6'} />
                <Stop offset="50%" stopColor={node.color} stopOpacity={activeNode === node.id ? '0.5' : '0.2'} />
                <Stop offset="100%" stopColor={node.color} stopOpacity="0" />
              </RadialGradient>
            ))}

            {/* Center glow */}
            <RadialGradient id="center-glow" cx="50%" cy="50%" r="30%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={isPlaying ? '0.15' : '0.05'} />
              <Stop offset="70%" stopColor="#ff0a0a" stopOpacity={isPlaying ? '0.08' : '0.02'} />
              <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Background */}
          <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#map-bg)" />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <G key={`grid-${i}`}>
              <Line x1={MAP_W * ratio} y1={0} x2={MAP_W * ratio} y2={MAP_H} stroke="#ff0a0a" strokeWidth={0.3} opacity={0.1} />
              <Line x1={0} y1={MAP_H * ratio} x2={MAP_W} y2={MAP_H * ratio} stroke="#ff0a0a" strokeWidth={0.3} opacity={0.1} />
            </G>
          ))}

          {/* Geometry-specific decorations */}
          {renderGeometryDecorations()}

          {/* Connections (for geometries with defined connections) */}
          {currentConnections.map((conn, i) => {
            const fromNode = currentNodes.find(n => n.id === conn[0]);
            const toNode = currentNodes.find(n => n.id === conn[1]);
            if (!fromNode || !toNode) return null;
            const isActive = activeNode === conn[0] || activeNode === conn[1] || activeNodes.has(conn[0]) || activeNodes.has(conn[1]);
            return (
              <Line
                key={`conn-${i}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isActive ? '#ffffff' : '#ff0a0a'}
                strokeWidth={isActive ? 1.5 : 0.8}
                opacity={isActive ? 0.8 : 0.3}
              />
            );
          })}

          {/* Center glow */}
          <SvgCircle cx={CX} cy={CY} r={MAP_W * 0.15} fill="url(#center-glow)" />

          {/* Nodes */}
          {currentNodes.map((node) => {
            const isActive = activeNode === node.id || activeNodes.has(node.id);
            const nodeR = isActive ? 18 : 12;
            return (
              <G key={node.id} onPress={() => handleNodePress(node)}>
                {/* Glow */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 40 : 28}
                  fill={`url(#glow-${node.id})`}
                />
                {/* Outer ring */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={nodeR + 4}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 0.8 : 0.3}
                />
                {/* Node body */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={nodeR}
                  fill="#0a0505"
                  stroke={node.color}
                  strokeWidth={isActive ? 2 : 1}
                />
                {/* Inner glow */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={nodeR * 0.5}
                  fill={node.color}
                  opacity={isActive ? 1 : 0.6}
                />
                {/* Hot pixel */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 3 : 2}
                  fill="#ffffff"
                  opacity={isActive ? 1 : 0.5}
                />
                {/* Label */}
                <SvgText
                  x={node.x}
                  y={node.y + nodeR + 12}
                  fill={isActive ? '#ffffff' : node.color}
                  fontSize={6}
                  fontWeight="700"
                  textAnchor="middle"
                  letterSpacing={0.5}
                >
                  {node.name}
                </SvgText>
                {/* Frequency label */}
                <SvgText
                  x={node.x}
                  y={node.y + nodeR + 21}
                  fill="#666"
                  fontSize={5}
                  textAnchor="middle"
                >
                  {node.freq} Hz
                </SvgText>
              </G>
            );
          })}

          {/* Axis labels */}
          <SvgText x={6} y={MAP_H - 6} fill="#ff0a0a" fontSize={6} opacity={0.2}>
            {activeGeometry} · {currentNodes.length} NODES
          </SvgText>
        </Svg>

        {/* Right Telemetry */}
        <View style={st.telemetryRight}>
          <Text style={st.telemetryLabel}>◇ TELEMETRY</Text>
          <Text style={st.telemetryValue}>BAND: {activeNodeData?.band || 'ALPHA'}</Text>
          <Text style={st.telemetryValue}>{activeNodeData?.freq || '432'} Hz</Text>
          <Text style={st.telemetryLabel}>{isPlaying ? 'TRANSMIT' : 'STANDBY'}</Text>
        </View>
      </View>

      {/* Brainwave Spectrum Bar */}
      <View style={st.spectrumContainer}>
        <Text style={st.spectrumLabel}>TUNING: 432Hz</Text>
        <View style={st.spectrumBar}>
          {BRAINWAVE_BANDS.map((band, i) => (
            <View
              key={band.name}
              style={[st.spectrumSegment, { backgroundColor: band.color, flex: band.width }]}
            />
          ))}
        </View>
        <View style={st.spectrumLabels}>
          {BRAINWAVE_BANDS.map((band) => (
            <Text key={band.name} style={[st.spectrumBandLabel, { color: band.color }]}>
              {band.name.split(' ')[0]}
            </Text>
          ))}
        </View>
      </View>

      {/* Solfeggio Frequencies */}
      <View style={st.solfeggioSection}>
        <Text style={st.solfeggioTitle}>◁ SOLFEGGIO</Text>
        <View style={st.solfeggioGrid}>
          {SOLFEGGIO_FREQS.map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[st.solfeggioBtn, activeSolfeggio === freq && st.solfeggioBtnActive]}
              onPress={() => handleSolfeggioPress(freq)}
            >
              <Text style={[st.solfeggioText, activeSolfeggio === freq && st.solfeggioTextActive]}>{freq}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Protocol Section Header - conditionally rendered */}
      {showBrainMirror && (
        <>
          <View style={st.protocolHeader}>
            <View style={st.protocolTitleBox}>
              <Text style={st.protocolMainTitle}>BRAIN MIRROR V2.0</Text>
            </View>
            <Text style={st.protocolSubtitle}>CORTEX-LAYERED FREQUENCY PROTOCOLS</Text>
          </View>

          {/* Protocol Tabs */}
          <View style={st.protocolTabs}>
            <TouchableOpacity
              style={[st.protocolTab, protocolTab === 'STATE' && st.protocolTabActive]}
              onPress={() => setProtocolTab('STATE')}
            >
              <Text style={[st.protocolTabText, protocolTab === 'STATE' && st.protocolTabTextActive]}>STATE MACHINE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.protocolTab, protocolTab === 'CORTEX' && st.protocolTabActive]}
              onPress={() => setProtocolTab('CORTEX')}
            >
              <Text style={[st.protocolTabText, protocolTab === 'CORTEX' && st.protocolTabTextActive]}>CORTEX LAYERS</Text>
            </TouchableOpacity>
          </View>

          {/* Protocol Cards */}
          <View style={st.protocolGrid}>
            {protocolTab === 'STATE' ? (
              STATE_PROTOCOLS.map((protocol) => (
                <TouchableOpacity
                  key={protocol.id}
                  style={[st.protocolCard, activeProtocol === protocol.id && st.protocolCardActive]}
                  onPress={() => handleProtocolPress(protocol)}
                >
                  <Text style={[st.protocolName, { color: protocol.color }]}>{protocol.name}</Text>
                  <Text style={st.protocolDescription}>{protocol.subtitle}</Text>
                  <Text style={st.protocolBand}>{protocol.band}</Text>
                  {activeProtocol === protocol.id && (
                    <View style={[st.protocolActiveDot, { backgroundColor: protocol.color }]} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              CORTEX_PROTOCOLS.map((cortex) => (
                <TouchableOpacity
                  key={cortex.id}
                  style={[st.protocolCard, activeProtocol === cortex.id && st.protocolCardActive]}
                  onPress={() => handleCortexPress(cortex)}
                >
                  <Text style={[st.protocolName, { color: cortex.color }]}>{cortex.name}</Text>
                  <Text style={st.protocolDescription}>{cortex.subtitle}</Text>
                  <Text style={st.protocolBand}>{cortex.freq} Hz</Text>
                  {activeProtocol === cortex.id && (
                    <View style={[st.protocolActiveDot, { backgroundColor: cortex.color }]} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}

      {/* Help text */}
      <Text style={st.helpText}>
        Tap nodes to activate · Headphones for binaural effect
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    marginHorizontal: 0,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ff0a0a20',
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#ff0a0a60',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 1,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff00',
  },
  playBtn: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff0a0a15',
  },
  playBtnActive: {
    backgroundColor: '#ff0a0a',
    borderColor: '#ff3030',
  },
  playBtnText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  playBtnTextActive: {
    color: '#000000',
  },
  tabsScroll: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#ff0a0a10',
  },
  tabsContainer: {
    paddingHorizontal: 12,
    gap: 4,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  tabActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a20',
  },
  tabText: {
    color: '#666',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: '#ff0a0a',
  },
  geoDescription: {
    color: '#ff0a0a40',
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  vizContainer: {
    position: 'relative',
  },
  telemetryLeft: {
    position: 'absolute',
    left: 8,
    top: 8,
    zIndex: 10,
  },
  telemetryRight: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  telemetryLabel: {
    color: '#ff0a0a',
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  telemetryValue: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  spectrumContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  spectrumLabel: {
    color: '#ff0a0a40',
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  spectrumBar: {
    flexDirection: 'row',
    height: 24,
    borderWidth: 1,
    borderColor: '#ff0a0a30',
  },
  spectrumSegment: {
    height: '100%',
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  spectrumBandLabel: {
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  solfeggioSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ff0a0a10',
  },
  solfeggioTitle: {
    color: '#ff0a0a60',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  solfeggioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  solfeggioBtn: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0a0505',
  },
  solfeggioBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a20',
  },
  solfeggioText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  solfeggioTextActive: {
    color: '#ff0a0a',
  },
  protocolHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ff0a0a20',
    marginTop: 8,
  },
  protocolTitleBox: {
    borderWidth: 2,
    borderColor: '#ff0a0a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff0a0a10',
  },
  protocolMainTitle: {
    color: '#ff0a0a',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },
  protocolSubtitle: {
    color: '#ff0a0a60',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 8,
  },
  protocolTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  protocolTab: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    backgroundColor: '#0a0505',
  },
  protocolTabActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a15',
  },
  protocolTabText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  protocolTabTextActive: {
    color: '#ff0a0a',
  },
  protocolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  protocolCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    backgroundColor: '#0a0505',
    position: 'relative',
  },
  protocolCardActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a10',
  },
  protocolName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  protocolDescription: {
    color: '#888',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  protocolBand: {
    color: '#ff0a0a60',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  protocolActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  helpText: {
    color: '#ff0a0a30',
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
