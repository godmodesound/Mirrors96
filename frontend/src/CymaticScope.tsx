import React from 'react';
import ScopeNodePanel from './ScopeNodePanel';

// Legacy consumers now share the exact same live renderer, AnalyserNode feed
// and signal controls instead of maintaining a second divergent simulation.
export { MEDIUMS, GEOMETRIES } from './ScopeNodePanel';
export type { Medium, Geometry } from './ScopeNodePanel';

export default function CymaticScope({ frequencies, playing }: { frequencies: number[]; playing: boolean }) {
  return <ScopeNodePanel frequencies={frequencies} playing={playing} />;
}