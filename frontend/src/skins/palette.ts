// ═══════════════════════════════════════════════════════════════
// SKINS — 13 visual identities. Pure re-color layer.
// Nothing here changes behaviour, layout or audio: every color the
// UI declares is passed through `mapColor()` and repainted with the
// active skin's Pantone-referenced palette.
// ═══════════════════════════════════════════════════════════════

export interface Skin {
  id: string;
  index: string;      // 01..13
  name: string;
  hero: string;       // Marvel reference
  pantone: string;    // Pantone reference of the accent
  accent: string;     // primary accent (replaces infrared)
  accent2: string;    // secondary accent (replaces greens/blues)
  light: boolean;     // light-mode skin (inverts the neutral ramp)
}

export const SKINS: Skin[] = [
  { id: 'symbiote', index: '01', name: 'SYMBIOTE',   hero: 'VENOM',           pantone: 'PANTONE 11-0601 Bright White', accent: '#F2F0EB', accent2: '#6E5CA6', light: false },
  { id: 't800',     index: '02', name: 'T-800',      hero: 'IRON MAN MK I',   pantone: 'PANTONE 199 C',                accent: '#E4002B', accent2: '#A2AAAD', light: false },
  { id: 't1000',    index: '03', name: 'T-1000',     hero: 'SILVER SURFER',   pantone: 'PANTONE 544 C',                accent: '#A7C6DA', accent2: '#5B7F95', light: false },
  { id: 'doom',     index: '04', name: 'DOOM',       hero: 'DOCTOR DOOM',     pantone: 'PANTONE 348 C',                accent: '#00843D', accent2: '#FF6A13', light: false },
  { id: 'winter',   index: '05', name: 'WINTER',     hero: 'WINTER SOLDIER',  pantone: 'PANTONE 2925 C',               accent: '#009CDE', accent2: '#4B7A96', light: true  },
  { id: 'ny96',     index: '06', name: 'NEW YORK 96', hero: 'SPIDER-MAN',     pantone: 'PANTONE 116 C',                accent: '#FFCD00', accent2: '#0057B8', light: false },
  { id: 'chakra',   index: '07', name: 'CHAKRA',     hero: 'DOCTOR STRANGE',  pantone: 'PANTONE 266 C',                accent: '#753BBD', accent2: '#FFA300', light: false },
  { id: 'y1950',    index: '08', name: '1950',       hero: 'CAPTAIN AMERICA', pantone: 'PANTONE 186 C',                accent: '#C8102E', accent2: '#003087', light: true  },
  { id: 'y1960',    index: '09', name: '1960',       hero: 'X-MEN',           pantone: 'PANTONE 219 C',                accent: '#E10098', accent2: '#FFDD00', light: false },
  { id: 'y1970',    index: '10', name: '1970',       hero: 'LUKE CAGE',       pantone: 'PANTONE 1385 C',               accent: '#C05131', accent2: '#84BD00', light: false },
  { id: 'y1980',    index: '11', name: '1980',       hero: 'IRON MAN',        pantone: 'PANTONE 232 C',                accent: '#E0218A', accent2: '#00B5E2', light: false },
  { id: 'y96',      index: '12', name: '96',         hero: 'MIRRORS',         pantone: 'PANTONE 179 C (INFRARED)',     accent: '#FF0A0A', accent2: '#FF0A0A', light: false },
  { id: 'y2000',    index: '13', name: '2000',       hero: 'HULK',            pantone: 'PANTONE 375 C',                accent: '#97D700', accent2: '#A7B1B7', light: false },
];

export const DEFAULT_SKIN_ID = 'y96';

export const getSkin = (id: string): Skin =>
  SKINS.find(s => s.id === id) || SKINS[11];

// ─────────── color math ───────────

const NAMED: Record<string, string> = {
  white: '#ffffff', black: '#000000', red: '#ff0000', lime: '#00ff00',
  blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', orange: '#ffa500',
  green: '#008000', gold: '#ffd700',
};

interface RGBA { r: number; g: number; b: number; a: number }

function parse(color: string): RGBA | null {
  let c = color.trim().toLowerCase();
  if (!c || c === 'transparent' || c === 'none' || c === 'currentcolor') return null;
  if (NAMED[c]) c = NAMED[c];
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    if (!/^[0-9a-f]+$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const m = c.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a };
  }
  const hm = c.match(/^hsla?\(\s*([\d.-]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+)\s*)?\)$/);
  if (hm) {
    const rgb = hsl2rgb(((+hm[1] % 360) + 360) % 360, +hm[2] / 100, +hm[3] / 100);
    return { ...rgb, a: hm[4] !== undefined ? +hm[4] : 1 };
  }
  return null;
}

function rgb2hsl(c: RGBA) {
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d > 0.0001) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === c.r) h = ((c.g - c.b) / d + (c.g < c.b ? 6 : 0));
    else if (max === c.g) h = (c.b - c.r) / d + 2;
    else h = (c.r - c.g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hsl2rgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return { r: r + m, g: g + m, b: b + m };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function out(h: number, s: number, l: number, a: number) {
  const { r, g, b } = hsl2rgb(((h % 360) + 360) % 360, clamp(s, 0, 1), clamp(l, 0, 1));
  const hex = (v: number) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  if (a >= 0.999) return `#${hex(r)}${hex(g)}${hex(b)}`;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${+a.toFixed(3)})`;
}

const cache = new Map<string, string>();

/** Re-color a single color literal for the given skin. */
export function mapColorFor(skinId: string, color: string): string {
  if (typeof color !== 'string') return color;
  const key = skinId + '|' + color;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const skin = getSkin(skinId);
  let result = color;

  if (skin.id !== DEFAULT_SKIN_ID) {
    const rgba = parse(color);
    if (rgba) {
      const { h, s, l } = rgb2hsl(rgba);
      const A = rgb2hsl(parse(skin.accent)!);
      const B = rgb2hsl(parse(skin.accent2)!);
      const light = skin.light;

      if (s < 0.09) {
        // neutrals — black/white/gray ramp, tinted by the accent hue
        const nl = light ? 1 - l : l;
        result = out(A.h, 0.05, nl, rgba.a);
      } else if (l < 0.15) {
        // very dark tinted surfaces (panels / fills)
        result = out(A.h, light ? 0.10 : Math.min(0.45, s), light ? 0.97 - l * 1.2 : l, rgba.a);
      } else if (l > 0.9) {
        result = out(A.h, 0.10, light ? 0.16 : l, rgba.a);
      } else {
        // chromatic accents
        const reddish = h < 45 || h > 320;
        const T = reddish ? A : B;
        if (T.s < 0.12) {
          // near-neutral accent (silver / white skins) — drive lightness, not hue
          const nl = light ? clamp(1 - l, 0.05, 0.35) : clamp(0.68 + 0.32 * l, 0, 1);
          result = out(T.h, Math.min(T.s, 0.04), nl, rgba.a);
        } else {
          const nl = light ? clamp(1 - l, 0.18, 0.5) : l;
          const ns = T.s * (0.45 + 0.55 * Math.min(1, s));
          result = out(T.h, ns, nl, rgba.a);
        }
      }
    }
  }

  cache.set(key, result);
  return result;
}

const COLOR_RE = /(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^()$]*\)|hsla?\([^()$]*\))/g;

/** Re-color every color literal found inside a string (used for WebView HTML). */
export function mapStringFor(skinId: string, str: string): string {
  if (skinId === DEFAULT_SKIN_ID) return str;
  return str.replace(COLOR_RE, (m) => mapColorFor(skinId, m));
}

const COLORISH = /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/;

export function isColorLiteral(v: unknown): boolean {
  return typeof v === 'string' && (COLORISH.test(v) || NAMED[v.toLowerCase()] !== undefined);
}
