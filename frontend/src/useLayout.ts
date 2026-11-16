import { useWindowDimensions, Platform } from 'react-native';

/**
 * Project Rorrim — Adaptive layout for iPhone Duo (outer + inner displays).
 * Live-updates on fold, unfold, and rotation.
 *
 * Tuned for Duo outer (~390 px) and inner (~800+ px) screens.
 */
export const COMPACT_BREAKPOINT = 500;
export const WIDE_BREAKPOINT = 700;
export const CONTENT_MAX_WIDTH = 900;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const isCompact = width < COMPACT_BREAKPOINT;
  const isLandscape = width > height;
  const isDuoLike = isWide && Platform.OS === 'ios';

  const contentWidth = isWide ? Math.min(width, CONTENT_MAX_WIDTH) : width;

  return {
    width,
    height,
    isWide,
    isCompact,
    isLandscape,
    isDuoLike,
    columns: isWide ? 2 : 1,
    contentWidth,
    canvasSize: Math.min(contentWidth - 40, isWide ? 560 : 340),
    frame: {
      width: '100%' as const,
      maxWidth: isWide ? CONTENT_MAX_WIDTH : undefined,
      alignSelf: 'center' as const,
    },
    leftPane: isWide ? Math.min(360, width * 0.38) : width,
    rightPane: isWide ? width - Math.min(360, width * 0.38) : width,
  };
}
