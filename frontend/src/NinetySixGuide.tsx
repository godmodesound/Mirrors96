import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch as expoFetch } from 'expo/fetch';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SESSION_KEY = '@ninety_six_session';

interface GuideMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function NinetySixGuide() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<GuideMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const sessionRef = useRef<string>('');
  const listRef = useRef<FlatList>(null);

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    let sid = await AsyncStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `96-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await AsyncStorage.setItem(SESSION_KEY, sid);
    }
    sessionRef.current = sid;
    return sid;
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const sid = await ensureSession();
      const res = await fetch(`${API_BASE}/api/guide/history/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any, i: number) => ({
            id: `h-${i}`,
            role: m.role,
            text: m.text,
          }))
        );
      }
    } catch {}
  }, [ensureSession]);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible, loadHistory]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setStreaming(true);
    const sid = await ensureSession();
    const userMsg: GuideMsg = { id: `u-${Date.now()}`, role: 'user', text };
    const aiId = `a-${Date.now()}`;
    setMessages(prev => [...prev, userMsg, { id: aiId, role: 'assistant', text: '' }]);

    try {
      const res = await expoFetch(`${API_BASE}/api/guide/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.delta) {
              acc += obj.delta;
              setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: acc } : m)));
            } else if (obj.error) {
              acc = acc || `⚠ ${obj.error}`;
              setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: acc } : m)));
            }
          } catch {}
        }
      }
      if (!acc) {
        setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: '⚠ No response — try again.' } : m)));
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: `⚠ Connection issue: ${e?.message || e}` } : m)));
    }
    setStreaming(false);
  };

  return (
    <>
      {/* Floating 96 trigger */}
      <TouchableOpacity style={st.fab} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Text style={st.fabText}>96</Text>
        <View style={st.fabDot} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          style={[st.container, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={st.header}>
            <View style={st.headerBadge}>
              <Text style={st.headerBadgeText}>96</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.headerTitle}>96 · FREQUENCY GUIDE</Text>
              <Text style={st.headerSub}>THE FUTURE NOW — FREQUENCIES · PROTOCOLS · THE APP</Text>
            </View>
            <TouchableOpacity style={st.closeBtn} onPress={() => setVisible(false)}>
              <Text style={st.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={st.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={st.empty}>
                <Text style={st.emptyBig}>◈ 96</Text>
                <Text style={st.emptyText}>
                  {`THE FUTURE NOW\n\nI'm 96 — your frequency guide.\n\nAsk me things like:\n"What frequency helps with sleep?"\n"Build me a 15-minute focus protocol"\n"How does the MERKABA geometry work?"`}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[st.bubble, item.role === 'user' ? st.bubbleUser : st.bubbleAi]}>
                {item.role === 'assistant' && <Text style={st.bubbleTag}>96</Text>}
                <Text style={[st.bubbleText, item.role === 'user' && st.bubbleTextUser]}>
                  {item.text || '…'}
                </Text>
              </View>
            )}
          />

          {/* Input */}
          <View style={[st.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={st.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask 96 anything…"
              placeholderTextColor="#5a1a1a"
              multiline
              maxLength={800}
            />
            <TouchableOpacity
              style={[st.sendBtn, (!input.trim() || streaming) && st.sendBtnDisabled]}
              onPress={send}
              disabled={!input.trim() || streaming}
            >
              {streaming ? <ActivityIndicator color="#000" size="small" /> : <Text style={st.sendText}>▶</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0a0303',
    borderWidth: 2,
    borderColor: '#ff0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#ff0a0a',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  fabText: { color: '#ff0a0a', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  fabDot: { position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff0a0a' },
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#ff0a0a30',
  },
  headerBadge: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#ff0a0a',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0808',
  },
  headerBadgeText: { color: '#ff0a0a', fontSize: 14, fontWeight: '900' },
  headerTitle: { color: '#ff0a0a', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: '#5a1a1a', fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  closeBtn: { padding: 8 },
  closeText: { color: '#ff0a0a', fontSize: 18 },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyBig: { color: '#ff0a0a', fontSize: 34, fontWeight: '900', marginBottom: 16 },
  emptyText: { color: '#888', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  bubble: { maxWidth: '86%', borderRadius: 12, padding: 12, borderWidth: 1 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#ff0a0a', borderColor: '#ff0a0a' },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: '#0f0505', borderColor: '#ff0a0a40' },
  bubbleTag: { color: '#ff0a0a', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  bubbleText: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#000', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#ff0a0a30',
  },
  input: {
    flex: 1, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a',
    borderRadius: 12, color: '#fff', fontSize: 14, paddingHorizontal: 14,
    paddingVertical: 10, maxHeight: 110, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff0a0a',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendText: { color: '#000', fontSize: 16, fontWeight: '900' },
});
