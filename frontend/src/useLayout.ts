import { useWindowDimensions } from 'react-native';

/**
 * Adaptive layout for phone ↔ unfolded (iPhone Duo / tablet) screens.
 * Live-updates on fold/unfold and rotation via useWindowDimensions.
 */
export const WIDE_BREAKPOINT = 700;
export const CONTENT_MAX_WIDTH = 820;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const isLandscape = width > height;
  const contentWidth = isWide ? Math.min(width, CONTENT_MAX_WIDTH) : width;
  return {
    width,
    height,
    isWide,
    isLandscape,
    columns: isWide ? 2 : 1,
    /** inner width available to full-bleed cards (after 16 px gutters) */
    contentWidth,
    /** square canvases (cymascope / head model) — larger on the unfolded panel */
    canvasSize: Math.min(contentWidth - 32, isWide ? 520 : 360),
    /** apply to ScrollView contentContainerStyle so content centres on wide screens with no stretched UI */
    frame: { width: '100%' as const, maxWidth: isWide ? CONTENT_MAX_WIDTH : undefined, alignSelf: 'center' as const },
  };
}
