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
} from 'react-native-svg';
import { AudioEngine } from './AudioEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_W = SCREEN_WIDTH - 32;
const MAP_H = MAP_W * 0.9;
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// Sacred Geometry Types
type GeometryType = 'TREE' | 'MERKABA' | 'METATRON' | 'VE64' | 'SRI_YANTRA' | 'TORUS' | 'PHI_SPIRAL' | 'ICOSA';

const GEOMETRY_TABS: { id: GeometryType; label: string }[] = [
  { id: 'TREE', label: 'TREE' },
  { id: 'MERKABA', label: 'MERKABA' },
  { id: 'METATRON', label: 'METATRON' },
  { id: 'VE64', label: 'VE / 64-TET' },
  { id: 'SRI_YANTRA', label: 'SRI YANTRA' },
  { id: 'TORUS', label: 'TORUS' },
  { id: 'PHI_SPIRAL', label: 'Φ SPIRAL' },
  { id: 'ICOSA', label: 'ICOSA' },
];

// Brain Region Nodes for Merkaba geometry
interface BrainNode {
  id: string;
  name: string;
  x: number;
  y: number;
  freq: number;
  band: string;
  color: string;
}

const BRAIN_NODES: BrainNode[] = [
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
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);
  const [protocolTab, setProtocolTab] = useState<'STATE' | 'CORTEX'>('STATE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSolfeggio, setActiveSolfeggio] = useState<number | null>(null);

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

  const handleNodePress = (node: BrainNode) => {
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
  const activeNodeData = activeNode ? BRAIN_NODES.find(n => n.id === activeNode) : null;

  // Merkaba geometry connections (Star Tetrahedron)
  const merkabaConnections = useMemo(() => {
    const nodes = BRAIN_NODES;
    return [
      // Upper tetrahedron (pointing up)
      { from: 'crown', to: 'l_frontal' },
      { from: 'crown', to: 'r_frontal' },
      { from: 'l_frontal', to: 'r_frontal' },
      { from: 'l_frontal', to: 'pineal' },
      { from: 'r_frontal', to: 'pineal' },
      { from: 'crown', to: 'pineal' },
      // Middle horizontal
      { from: 'l_temporal', to: 'r_temporal' },
      { from: 'l_temporal', to: 'pineal' },
      { from: 'r_temporal', to: 'pineal' },
      { from: 'l_temporal', to: 'thalamus' },
      { from: 'r_temporal', to: 'thalamus' },
      { from: 'pineal', to: 'thalamus' },
      // Lower tetrahedron (pointing down)
      { from: 'thalamus', to: 'l_parietal' },
      { from: 'thalamus', to: 'r_parietal' },
      { from: 'l_parietal', to: 'r_parietal' },
      { from: 'l_parietal', to: 'root' },
      { from: 'r_parietal', to: 'root' },
      { from: 'thalamus', to: 'root' },
      // Cross connections
      { from: 'l_frontal', to: 'l_temporal' },
      { from: 'r_frontal', to: 'r_temporal' },
      { from: 'l_temporal', to: 'l_parietal' },
      { from: 'r_temporal', to: 'r_parietal' },
    ];
  }, []);

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerTitle}>&gt; FREQUENCY_MAP</Text>
        <Text style={st.headerSub}>/ {activeGeometry}</Text>
        <View style={st.headerRight}>
          {isPlaying && <View style={st.liveDot} />}
          <TouchableOpacity style={st.playBtn} onPress={() => {
            if (isPlaying) {
              AudioEngine.stopAll();
              AudioEngine.stopCamelot();
              AudioEngine.stopMulti();
              setIsPlaying(false);
              setActiveNode(null);
              setActiveSolfeggio(null);
              setActiveProtocol(null);
            }
          }}>
            <Text style={st.playBtnText}>{isPlaying ? 'STOP' : 'PLAY GEOMETRY'}</Text>
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
        Star Tetrahedron — counter-rotating light vehicle for vertical crown-root coherence.
      </Text>

      {/* Main Visualization */}
      <View style={st.vizContainer}>
        {/* Left Telemetry */}
        <View style={st.telemetryLeft}>
          <Text style={st.telemetryLabel}>◇ GEOMETRY</Text>
          <Text style={st.telemetryValue}>{activeGeometry}</Text>
          <Text style={st.telemetryLabel}>NODES: {BRAIN_NODES.length}</Text>
          <Text style={st.telemetryLabel}>STATUS: {isPlaying ? 'LIVE' : 'IDLE'}</Text>
          
          {/* Brainwave indicator */}
          <View style={st.brainwaveIndicator}>
            <Text style={[st.bandLabel, { color: '#FFD93D' }]}>γ</Text>
            <Text style={[st.bandLabel, { color: '#FF6B6B' }]}>β</Text>
            <Text style={[st.bandLabel, { color: '#6BCB77' }]}>α</Text>
            <Text style={[st.bandLabel, { color: '#4D96FF' }]}>θ</Text>
            <Text style={[st.bandLabel, { color: '#9B59B6' }]}>δ</Text>
          </View>
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
            {BRAIN_NODES.map((node) => (
              <RadialGradient key={`glow-${node.id}`} id={`glow-${node.id}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={node.color} stopOpacity={activeNode === node.id ? '1' : '0.6'} />
                <Stop offset="50%" stopColor={node.color} stopOpacity={activeNode === node.id ? '0.5' : '0.2'} />
                <Stop offset="100%" stopColor={node.color} stopOpacity="0" />
              </RadialGradient>
            ))}

            {/* Center glow */}
            <RadialGradient id="center-glow" cx="50%" cy="50%" r="30%">
              <Stop offset="0%" stopColor="#ff0a0a" stopOpacity={isPlaying ? '0.4' : '0.1'} />
              <Stop offset="70%" stopColor="#ff0a0a" stopOpacity={isPlaying ? '0.1' : '0.02'} />
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

          {/* Merkaba Connections */}
          {merkabaConnections.map((conn, i) => {
            const fromNode = BRAIN_NODES.find(n => n.id === conn.from);
            const toNode = BRAIN_NODES.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            const isActive = activeNode === conn.from || activeNode === conn.to;
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

          {/* Brain Nodes */}
          {BRAIN_NODES.map((node) => {
            const isActive = activeNode === node.id;
            const nodeR = isActive ? 20 : 14;
            return (
              <G key={node.id} onPress={() => handleNodePress(node)}>
                {/* Glow */}
                <SvgCircle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 45 : 30}
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
                  y={node.y + nodeR + 14}
                  fill={isActive ? '#ffffff' : node.color}
                  fontSize={7}
                  fontWeight="700"
                  textAnchor="middle"
                  letterSpacing={1}
                >
                  {node.name}
                </SvgText>
                {/* Frequency label */}
                <SvgText
                  x={node.x}
                  y={node.y + nodeR + 24}
                  fill="#666"
                  fontSize={6}
                  textAnchor="middle"
                >
                  {node.freq} Hz · {node.band}
                </SvgText>
              </G>
            );
          })}

          {/* Axis labels */}
          <SvgText x={6} y={MAP_H / 2} fill="#ff0a0a" fontSize={8} opacity={0.3}>Y</SvgText>
          <SvgText x={MAP_W - 30} y={MAP_H / 2} fill="#ff0a0a" fontSize={7} opacity={0.3}>X:0.955</SvgText>
        </Svg>

        {/* Right Telemetry */}
        <View style={st.telemetryRight}>
          <Text style={st.telemetryLabel}>◇ TELEMETRY</Text>
          <Text style={st.telemetryValue}>BAND: {activeNodeData?.band || 'ALPHA'}</Text>
          <Text style={st.telemetryValue}>{activeNodeData?.freq || '432'} Hz</Text>
          <Text style={st.telemetryLabel}>{isPlaying ? '10 CH ACTIVE' : 'STANDBY'}</Text>
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
  playBtnText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
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
  brainwaveIndicator: {
    marginTop: 12,
    gap: 4,
  },
  bandLabel: {
    fontSize: 10,
    fontWeight: '900',
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
