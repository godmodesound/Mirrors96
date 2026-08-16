import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// ══════════════════════════════════════════════════════════════
// LATTICE FRAMEWORK — "The Lattice That Binds All Dimensions"
//
// Distills the master infographic into a functional panel that
// maps the currently-playing carrier frequency to its position
// across the dimensional / geometric / energetic axes of the
// unified field.
//
//   Ψ  =  I · E × G × S
//   Universe = Information · Energy × Geometry × Symmetry
//
// Tabs (compact, tap to expand):
//   HIER · BIND · ENRG · GEO · FRC · FLOW
//
// Each tab surfaces the sub-nodes of the infographic and
// highlights the row corresponding to the base frequency.
// ══════════════════════════════════════════════════════════════

interface Props {
  baseFreq: number;
}

type Tab = 'HIER' | 'BIND' | 'ENRG' | 'GEO' | 'FRC' | 'FLOW';

// ── Dimensional hierarchy 0D → 11D ──
const HIER = [
  { d: '0D',  name: 'POINT',                 color: '#c9d2dd' },
  { d: '1D',  name: 'LINE',                  color: '#e8ecf5' },
  { d: '2D',  name: 'PLANE',                 color: '#7fd4ff' },
  { d: '3D',  name: 'VOLUME',                color: '#5aff8a' },
  { d: '4D',  name: 'SPACETIME',             color: '#7db7ff' },
  { d: '5D',  name: 'HIGHER SPATIAL',        color: '#ffb84d' },
  { d: '6D',  name: 'PATTERN MANIFOLD',      color: '#ff7a3a' },
  { d: '7D',  name: 'VIBRATIONAL TOPOLOGY',  color: '#c56aff' },
  { d: '8D',  name: 'INFORMATION GEOMETRY',  color: '#4da8ff' },
  { d: '9D',  name: 'QUANTUM SYMMETRY',      color: '#8dff9d' },
  { d: '10D', name: 'STRING / M FRAMEWORK',  color: '#ffd75e' },
  { d: '11D', name: 'UNIFIED FIELD',         color: '#ff2a5e' },
];

// ── Glue: how they bind ──
const BIND = [
  { key: 'ENT',  name: 'QUANTUM ENTANGLEMENT', role: 'NETWORK'          },
  { key: 'SPN',  name: 'SPIN NETWORK',         role: 'QUANTUM GEOMETRY' },
  { key: 'VAC',  name: 'VACUUM ENERGY',        role: 'ZERO-POINT FIELD' },
  { key: 'INF',  name: 'INFORMATION',          role: 'PRIMARY SUBSTRATE'},
  { key: 'SYM',  name: 'SYMMETRY',             role: 'GOVERNING LAW'    },
];

// ── The energies that make it possible ──
const ENRG = [
  { key: 'ZP',   name: 'ZERO-POINT',       role: 'FOUNDATION',        color: '#7fd4ff' },
  { key: 'SCL',  name: 'SCALAR',           role: 'CARRIES INFORMATION', color: '#5aff8a' },
  { key: 'EM',   name: 'ELECTROMAGNETIC',  role: 'FORCE & LIGHT',     color: '#ff2a5e' },
  { key: 'GRV',  name: 'GRAVITATIONAL',    role: 'CURVES SPACETIME',  color: '#c56aff' },
  { key: 'CON',  name: 'CONSCIOUSNESS',    role: 'OBSERVER / FIELD',  color: '#ffd75e' },
];

// ── The geometric lattice (visible patterns) ──
const GEO = [
  { key: 'FLW', name: 'FLOWER OF LIFE',   role: '6-FOLD SEED'    },
  { key: 'MET', name: "METATRON'S CUBE",  role: '13-NODE MATRIX' },
  { key: 'TOR', name: 'TORUS',            role: 'DONUT FIELD'    },
  { key: 'MRK', name: 'MERKABAH',         role: 'STAR TETRAHEDRON' },
  { key: 'E8',  name: 'E8 LATTICE',       role: '248-D PROJECTION' },
];

// ── Forces & interactions ──
const FRC = [
  { key: 'GRV', name: 'GRAVITY',          color: '#7db7ff' },
  { key: 'EM',  name: 'ELECTROMAGNETISM', color: '#ff2a5e' },
  { key: 'STR', name: 'STRONG FORCE',     color: '#5aff8a' },
  { key: 'WK',  name: 'WEAK FORCE',       color: '#c56aff' },
  { key: 'UNI', name: 'UNIFIED FIELD',    color: '#e8ecf5' },
];

// ── The flow of creation (Pure Potential → Matter) ──
const FLOW = [
  { key: 'PP',  step: 'PURE POTENTIAL', sub: 'ZERO-POINT'   },
  { key: 'VB',  step: 'VIBRATION',      sub: 'FREQUENCY'    },
  { key: 'GM',  step: 'GEOMETRY',       sub: 'SHAPE'        },
  { key: 'FD',  step: 'FIELD',          sub: 'INFORMATION'  },
  { key: 'MT',  step: 'MATTER',         sub: 'MANIFESTATION'},
];

// ── Map a frequency to its lattice slots ──
function latticeMap(f: number) {
  // Dimensional index by log2 partition of 432Hz reference
  // (0D..11D binned across the audible→scalar spectrum)
  const oct = Math.log2(Math.max(1, f) / 27); // 27Hz ~ 0D floor
  const hierIdx = Math.max(0, Math.min(11, Math.round(oct)));
  // Geometry cycle every 5 octaves — anchors to base symmetry
  const geoIdx = Math.floor(Math.abs(oct)) % GEO.length;
  // Energy phase — high f leans toward EM, low f toward gravitational/scalar
  const energyIdx = f < 40 ? 3 : f < 150 ? 1 : f < 1000 ? 2 : f < 8000 ? 0 : 4;
  // Force phase — same domain logic
  const forceIdx = f < 40 ? 0 : f < 400 ? 1 : f < 2000 ? 2 : f < 12000 ? 3 : 4;
  return { hierIdx, geoIdx, energyIdx, forceIdx };
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'HIER', label: 'HIER' },
  { key: 'BIND', label: 'BIND' },
  { key: 'ENRG', label: 'ENRG' },
  { key: 'GEO',  label: 'GEO'  },
  { key: 'FRC',  label: 'FRC'  },
  { key: 'FLOW', label: 'FLOW' },
];

export default function LatticeFramework({ baseFreq }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('HIER');
  const m = useMemo(() => latticeMap(baseFreq), [baseFreq]);

  // Current focus resolves per tab
  const focus = {
    HIER: HIER[m.hierIdx],
    BIND: BIND[Math.min(BIND.length - 1, m.hierIdx % BIND.length)],
    ENRG: ENRG[m.energyIdx],
    GEO:  GEO[m.geoIdx],
    FRC:  FRC[m.forceIdx],
    FLOW: FLOW[Math.min(FLOW.length - 1, Math.floor(m.hierIdx / 3))],
  };

  return (
    <View style={st.wrap}>
      {/* ── Header strip: title + equation + toggle ── */}
      <TouchableOpacity
        style={st.header}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
      >
        <View style={st.titleBlock}>
          <Text style={st.titlePre}>◈</Text>
          <Text style={st.title}>THE LATTICE</Text>
          <Text style={st.titleSub}>THAT BINDS ALL DIMENSIONS</Text>
        </View>
        <View style={st.eqBlock}>
          <Text style={st.eqPsi}>Ψ</Text>
          <Text style={st.eqEq}>=</Text>
          <Text style={[st.eqTerm, { color: '#7fd4ff' }]}>I</Text>
          <Text style={st.eqDot}>·</Text>
          <Text style={[st.eqTerm, { color: '#ff2a5e' }]}>E</Text>
          <Text style={st.eqDot}>×</Text>
          <Text style={[st.eqTerm, { color: '#5aff8a' }]}>G</Text>
          <Text style={st.eqDot}>×</Text>
          <Text style={[st.eqTerm, { color: '#c56aff' }]}>S</Text>
        </View>
        <Text style={st.chev}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {/* Always-visible axis banner */}
      <Text style={st.axisBanner}>
        SYMMETRY · INFORMATION · ENERGY · GEOMETRY · CONSCIOUSNESS
      </Text>

      {/* Focus strip (one-liner summary at collapsed state) */}
      <View style={st.focusRow}>
        <View style={[st.focusPill, { borderColor: focus.HIER.color }]}>
          <Text style={[st.focusPillLbl, { color: focus.HIER.color }]}>DIM</Text>
          <Text style={[st.focusPillVal, { color: focus.HIER.color }]}>{focus.HIER.d}</Text>
        </View>
        <View style={[st.focusPill, { borderColor: focus.ENRG.color }]}>
          <Text style={[st.focusPillLbl, { color: focus.ENRG.color }]}>ENRG</Text>
          <Text style={[st.focusPillVal, { color: focus.ENRG.color }]}>{focus.ENRG.name.split(' ')[0]}</Text>
        </View>
        <View style={[st.focusPill, { borderColor: '#e8c87d' }]}>
          <Text style={[st.focusPillLbl, { color: '#e8c87d' }]}>GEO</Text>
          <Text style={[st.focusPillVal, { color: '#e8c87d' }]}>{focus.GEO.name.split(' ')[0]}</Text>
        </View>
        <View style={[st.focusPill, { borderColor: focus.FRC.color }]}>
          <Text style={[st.focusPillLbl, { color: focus.FRC.color }]}>FRC</Text>
          <Text style={[st.focusPillVal, { color: focus.FRC.color }]}>{focus.FRC.name.split(' ')[0]}</Text>
        </View>
      </View>

      {open && (
        <>
          {/* Tab bar */}
          <View style={st.tabBar}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[st.tab, tab === t.key && st.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[st.tabTxt, tab === t.key && st.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content per tab */}
          {tab === 'HIER' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>DIMENSIONAL HIERARCHY · FROM POINT TO ALL</Text>
              {HIER.map((row, i) => {
                const active = i === m.hierIdx;
                return (
                  <View key={row.d} style={[st.row, active && st.rowActive]}>
                    <Text style={[st.rowD, { color: row.color }, active && st.rowDActive]}>{row.d}</Text>
                    <Text style={[st.rowName, active && { color: row.color }]}>{row.name}</Text>
                    {active && <Text style={st.rowMarker}>◈ {baseFreq.toFixed(1)} Hz</Text>}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {tab === 'BIND' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>HOW THEY BIND · THE GLUE</Text>
              {BIND.map(row => (
                <View key={row.key} style={st.row}>
                  <Text style={st.rowKey}>{row.key}</Text>
                  <Text style={st.rowName}>{row.name}</Text>
                  <Text style={st.rowRole}>{row.role}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {tab === 'ENRG' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>THE ENERGIES THAT MAKE IT POSSIBLE</Text>
              {ENRG.map((row, i) => {
                const active = i === m.energyIdx;
                return (
                  <View key={row.key} style={[st.row, active && st.rowActive]}>
                    <Text style={[st.rowKey, { color: row.color }]}>{row.key}</Text>
                    <Text style={[st.rowName, active && { color: row.color }]}>{row.name}</Text>
                    <Text style={[st.rowRole, active && { color: row.color, opacity: 0.9 }]}>{row.role}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {tab === 'GEO' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>THE GEOMETRIC LATTICE · VISIBLE PATTERNS</Text>
              {GEO.map((row, i) => {
                const active = i === m.geoIdx;
                return (
                  <View key={row.key} style={[st.row, active && st.rowActive]}>
                    <Text style={st.rowKey}>{row.key}</Text>
                    <Text style={[st.rowName, active && { color: '#e8c87d' }]}>{row.name}</Text>
                    <Text style={st.rowRole}>{row.role}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {tab === 'FRC' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>FORCES & INTERACTIONS · WHAT OPERATES INSIDE</Text>
              {FRC.map((row, i) => {
                const active = i === m.forceIdx;
                return (
                  <View key={row.key} style={[st.row, active && st.rowActive]}>
                    <Text style={[st.rowKey, { color: row.color }]}>{row.key}</Text>
                    <Text style={[st.rowName, active && { color: row.color }]}>{row.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {tab === 'FLOW' && (
            <ScrollView style={st.content} nestedScrollEnabled>
              <Text style={st.contentH}>THE FLOW OF CREATION · FROM ENERGY TO FORM</Text>
              <View style={st.flowChain}>
                {FLOW.map((row, i) => (
                  <React.Fragment key={row.key}>
                    <View style={st.flowNode}>
                      <Text style={st.flowStep}>{row.step}</Text>
                      <Text style={st.flowSub}>({row.sub})</Text>
                    </View>
                    {i < FLOW.length - 1 && <Text style={st.flowArrow}>→</Text>}
                  </React.Fragment>
                ))}
              </View>
              <Text style={st.flowNote}>
                YOU = OBSERVER + FIELD · INPUT (FREQUENCY) → OUTPUT (REALITY)
              </Text>
            </ScrollView>
          )}

          {/* Legend footer */}
          <Text style={st.eqLegend}>
            Ψ UNIVERSE  ·  I INFORMATION (PATTERN)  ·  E ENERGY (VIBRATION)  ·
            G GEOMETRY (STRUCTURE)  ·  S SYMMETRY (LAW)
          </Text>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: '#2a1010',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#050709',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2028',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 1,
  },
  titlePre: { color: '#ff0a0a', fontSize: 10, fontWeight: '900' },
  title: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  titleSub: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  eqBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginLeft: 'auto',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 4,
    backgroundColor: '#000',
  },
  eqPsi: { color: '#ffd75e', fontSize: 12, fontWeight: '900' },
  eqEq: { color: '#c9d2dd', fontSize: 10, fontWeight: '900' },
  eqTerm: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  eqDot: { color: '#c9d2dd', fontSize: 10, fontWeight: '900' },
  chev: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
  },
  axisBanner: {
    color: '#7d8794',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
    paddingVertical: 6,
  },
  focusRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'center',
  },
  focusPillLbl: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.7,
  },
  focusPillVal: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1a2028',
    borderRadius: 4,
    padding: 2,
    backgroundColor: '#000',
  },
  tab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 3,
  },
  tabActive: {
    backgroundColor: '#ff0a0a',
  },
  tabTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#7d8794',
  },
  tabTxtActive: { color: '#000' },
  content: {
    maxHeight: 260,
    marginTop: 8,
  },
  contentH: {
    color: '#c9d2dd',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2028',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,32,40,0.5)',
  },
  rowActive: {
    backgroundColor: 'rgba(255,10,10,0.08)',
    borderRadius: 3,
    borderBottomColor: '#ff0a0a',
  },
  rowD: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    minWidth: 32,
    opacity: 0.85,
  },
  rowDActive: { opacity: 1 },
  rowKey: {
    color: '#7d8794',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    minWidth: 32,
  },
  rowName: {
    color: '#c9d2dd',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1,
  },
  rowRole: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.8,
    opacity: 0.9,
  },
  rowMarker: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  flowChain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  flowNode: {
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#000',
    minWidth: 78,
  },
  flowStep: {
    color: '#c9d2dd',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  flowSub: {
    color: '#5a646f',
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  flowArrow: { color: '#ff0a0a', fontSize: 12, fontWeight: '900' },
  flowNote: {
    color: '#7d8794',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 8,
  },
  eqLegend: {
    color: '#5a646f',
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a2028',
    lineHeight: 10,
  },
  quote: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 11,
  },
  quoteSig: {
    color: '#5a646f',
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: 3,
  },
});
