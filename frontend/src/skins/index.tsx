import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import {
  SKINS, DEFAULT_SKIN_ID, Skin, getSkin,
  mapColorFor, mapStringFor, isColorLiteral,
} from './palette';

export { SKINS, DEFAULT_SKIN_ID, getSkin };
export type { Skin };

const STORE_KEY = '@godmode_skin_v1';

// Module-level active skin so that plain (non-hook) helpers can re-color.
// The whole screen tree is remounted on change, so every render reads fresh.
let ACTIVE = DEFAULT_SKIN_ID;

export const activeSkinId = () => ACTIVE;

/** Re-color one color literal with the active skin. Safe on any string. */
export const SK = (color: string): string => mapColorFor(ACTIVE, color);

/** Re-color every color literal inside a string (WebView HTML / SVG markup). */
export const skinHtml = (html: string): string => mapStringFor(ACTIVE, html);

// ─────────── themed StyleSheet ───────────

type AnyStyles = Record<string, any>;

function recolor(value: any, skinId: string): any {
  if (Array.isArray(value)) return value.map(v => recolor(v, skinId));
  if (value && typeof value === 'object') {
    const o: AnyStyles = {};
    for (const k in value) o[k] = recolor(value[k], skinId);
    return o;
  }
  if (isColorLiteral(value)) return mapColorFor(skinId, value as string);
  return value;
}

/**
 * Drop-in replacement for StyleSheet.create(). The declared (infrared) sheet is
 * the source of truth; each entry is lazily re-colored for the active skin and
 * cached per skin id.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function skinStyles<T extends NamedStyles<T> | NamedStyles<any>>(base: T & NamedStyles<any>): T {
  const sheets: Record<string, AnyStyles> = {};
  const sheetFor = (id: string): AnyStyles => {
    if (!sheets[id]) {
      sheets[id] = StyleSheet.create(
        (id === DEFAULT_SKIN_ID ? base : recolor(base, id)) as AnyStyles,
      );
    }
    return sheets[id];
  };
  return new Proxy(base, {
    get: (_t, prop: string) => sheetFor(ACTIVE)[prop as string],
    ownKeys: () => Reflect.ownKeys(base),
    getOwnPropertyDescriptor: (_t, prop) =>
      ({ ...Reflect.getOwnPropertyDescriptor(base, prop), value: sheetFor(ACTIVE)[prop as string] } as any),
  }) as T;
}

// ─────────── context ───────────

interface SkinCtx {
  skin: Skin;
  skinId: string;
  setSkinId: (id: string) => void;
  /** bump on every change — use as a remount key */
  epoch: number;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
}

const Ctx = createContext<SkinCtx>({
  skin: getSkin(DEFAULT_SKIN_ID),
  skinId: DEFAULT_SKIN_ID,
  setSkinId: () => {},
  epoch: 0,
  pickerOpen: false,
  setPickerOpen: () => {},
});

export const useSkin = () => useContext(Ctx);

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [skinId, setId] = useState(DEFAULT_SKIN_ID);
  const [epoch, setEpoch] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then(v => {
      if (v && v !== ACTIVE && SKINS.some(s => s.id === v)) {
        ACTIVE = v;
        setId(v);
        setEpoch(e => e + 1);
      }
    }).catch(() => {});
  }, []);

  const setSkinId = useCallback((id: string) => {
    ACTIVE = id;
    setId(id);
    setEpoch(e => e + 1);
    AsyncStorage.setItem(STORE_KEY, id).catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ skin: getSkin(skinId), skinId, setSkinId, epoch, pickerOpen, setPickerOpen }}>
      {children}
    </Ctx.Provider>
  );
}
