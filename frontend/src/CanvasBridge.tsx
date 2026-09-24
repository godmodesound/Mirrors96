import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine, ScopeFrame } from './AudioEngine';
import { skinHtml, SK } from './skins';

export type CanvasBridgeHandle = { call: (fn: string, payload: object) => void };

type Props = {
  html: string;
  width: number;
  height: number;
  /** substring that identifies messages from this canvas (e.g. '__spine') */
  tag: string;
  onMessage: (msg: any) => void;
  onReady: () => void;
  /** forward live analyser frames as window.pushWave({__wave,peak,...}) */
  liveAudio?: boolean;
  testID?: string;
};

/** Shared WebView (native) / iframe (web) canvas host with RN→canvas function calls and canvas→RN messages. */
const CanvasBridge = forwardRef<CanvasBridgeHandle, Props>(function CanvasBridge({ html, width, height, tag, onMessage, onReady, liveAudio, testID }, ref) {
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const skinned = React.useMemo(() => skinHtml(html), [html]);

  const call = useCallback((fn: string, payload: object) => {
    const json = JSON.stringify(payload);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.[fn]?.(json); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.${fn} && window.${fn}(${JSON.stringify(json)}); true;`);
    }
  }, []);
  useImperativeHandle(ref, () => ({ call }), [call]);

  const handleRaw = useCallback((raw: string) => {
    try { const msg = JSON.parse(raw); if (msg && msg[tag]) onMessage(msg); } catch {}
  }, [tag, onMessage]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => { if (typeof e.data === 'string' && e.data.includes(tag)) handleRaw(e.data); };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleRaw, tag]);

  const lastPush = useRef(0);
  useEffect(() => {
    if (!liveAudio) return;
    return AudioEngine.subscribeScope((frame: ScopeFrame) => {
      const now = Date.now();
      if (Platform.OS !== 'web' && now - lastPush.current < 60) return;
      lastPush.current = now;
      call('pushWave', { __wave: true, peak: frame.peak, rms: frame.rms, measuredHz: frame.measuredHz });
    });
  }, [liveAudio, call]);

  return (
    <View testID={testID} style={{ width, height, overflow: 'hidden', backgroundColor: SK('#000') }}>
      {Platform.OS === 'web' ? (
        React.createElement('iframe', { ref: iframeRef, srcDoc: skinned, style: { width: '100%', height: '100%', border: 'none', backgroundColor: SK('#000') }, onLoad: onReady })
      ) : (
        <WebView ref={webRef} source={{ html: skinned }} style={{ flex: 1, backgroundColor: 'transparent' }} javaScriptEnabled scrollEnabled={false} androidLayerType="hardware" onLoadEnd={onReady} onMessage={e => handleRaw(e.nativeEvent.data)} />
      )}
    </View>
  );
});

export default CanvasBridge;
