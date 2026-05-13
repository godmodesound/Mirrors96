import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/AuthContext';
import MirrorsIdBanner from '../src/MirrorsIdBanner';

export default function MirrorsIdScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, login, register, logout, updateProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Profile editing state
  const [editingPhone, setEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editSmsOptIn, setEditSmsOptIn] = useState(false);

  const handleSubmit = async () => {
    if (mode === 'register') {
      if (!username.trim()) { setError('Username is required'); return; }
      if (username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
      if (!email.trim()) { setError('Email is required'); return; }
      if (!password.trim()) { setError('Password is required'); return; }
      if (password.trim().length < 6) { setError('Password must be at least 6 characters'); return; }
    } else {
      if (!email.trim() || !password.trim()) { setError('Email and password required'); return; }
    }

    setError('');
    setSubmitting(true);

    let result;
    if (mode === 'register') {
      result = await register(email.trim(), password.trim(), username.trim(), displayName.trim(), phone.trim(), smsOptIn);
    } else {
      result = await login(email.trim(), password.trim());
    }

    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Something went wrong');
    }
  };

  const handleUpdatePhone = async () => {
    setSubmitting(true);
    const result = await updateProfile({ phone: editPhone.trim(), sms_opt_in: editSmsOptIn });
    setSubmitting(false);
    if (result.success) {
      setEditingPhone(false);
    } else {
      setError(result.error || 'Update failed');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#ff0a0a" size="large" />
      </View>
    );
  }

  // ═══════════════════════════════════
  // LOGGED IN — USER ACCOUNT PROFILE
  // ═══════════════════════════════════
  if (user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>MIRRORS ID</Text>

          {/* ID Card */}
          <View style={styles.idCard}>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>VERIFIED ACCOUNT</Text>
            </View>
            <Text style={styles.idCode}>{user.mirrors_id}</Text>
            <View style={styles.idDivider} />
            <Text style={styles.idName}>{user.display_name?.toUpperCase() || user.username?.toUpperCase()}</Text>
            <Text style={styles.idUsername}>@{user.username}</Text>
            <Text style={styles.idEmail}>{user.email}</Text>
            {user.phone ? (
              <Text style={styles.idPhone}>{user.phone}</Text>
            ) : null}
            <View style={styles.idDivider} />

            <View style={styles.idRow}>
              <Text style={styles.idLabel}>USERNAME</Text>
              <Text style={styles.idValue}>@{user.username?.toUpperCase()}</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>STATUS</Text>
              <Text style={styles.idValue}>ACTIVE</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>ACCESS</Text>
              <Text style={styles.idValue}>FULL SPECTRUM</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>FREQUENCY</Text>
              <Text style={styles.idValue}>432 Hz ALIGNED</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>SMS UPDATES</Text>
              <Text style={styles.idValue}>{user.sms_opt_in ? 'ENABLED' : 'DISABLED'}</Text>
            </View>
          </View>

          {/* Contact & Notifications */}
          <Text style={styles.sectionTitle}>&gt; CONTACT & NOTIFICATIONS</Text>
          {!editingPhone ? (
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{user.phone || 'Not set'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Text Updates</Text>
                <Text style={[styles.contactValue, { color: user.sms_opt_in ? '#00E676' : '#5a1a1a' }]}>
                  {user.sms_opt_in ? 'Opted In' : 'Opted Out'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditPhone(user.phone || '');
                  setEditSmsOptIn(user.sms_opt_in || false);
                  setEditingPhone(true);
                }}
              >
                <Text style={styles.editBtnText}>UPDATE CONTACT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#3a1010"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.smsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smsLabel}>Receive text updates</Text>
                  <Text style={styles.smsDesc}>Events, music releases & upgrades</Text>
                </View>
                <Switch
                  value={editSmsOptIn}
                  onValueChange={setEditSmsOptIn}
                  trackColor={{ false: '#2a0a0a', true: '#ff0a0a40' }}
                  thumbColor={editSmsOptIn ? '#ff0a0a' : '#5a1a1a'}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.editBtn, { flex: 1, backgroundColor: '#0a0505' }]}
                  onPress={() => { setEditingPhone(false); setError(''); }}
                >
                  <Text style={[styles.editBtnText, { color: '#5a1a1a' }]}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={handleUpdatePhone}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.submitText}>SAVE</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* DIRECT CONNECT — CODES:I.D. */}
          <Text style={styles.sectionTitle}>&gt; CODES:I.D.</Text>
          <TouchableOpacity
            style={styles.directConnectCard}
            onPress={() => router.push('/chirpconnect')}
            activeOpacity={0.8}
          >
            <View style={styles.dcTop}>
              <View style={styles.dcIconWrap}>
                <Text style={styles.dcIcon}>◎</Text>
              </View>
              <View style={styles.dcInfo}>
                <Text style={styles.dcTitle}>CODES:I.D. · DIRECT CONNECT</Text>
                <Text style={styles.dcDesc}>Push-to-Talk • Hold to transmit</Text>
              </View>
              <Text style={styles.dcArrow}>▷</Text>
            </View>
            <View style={styles.dcDivider} />
            <View style={styles.dcMeta}>
              <View style={styles.dcMetaItem}>
                <View style={[styles.dcMetaDot, { backgroundColor: '#ff0a0a' }]} />
                <Text style={styles.dcMetaText}>GODMODE CHANNEL</Text>
              </View>
              <View style={styles.dcMetaItem}>
                <View style={[styles.dcMetaDot, { backgroundColor: '#ff304080' }]} />
                <Text style={styles.dcMetaText}>96 MIRRORS</Text>
              </View>
              <View style={styles.dcMetaItem}>
                <View style={[styles.dcMetaDot, { backgroundColor: '#ff304060' }]} />
                <Text style={styles.dcMetaText}>FREQ LAB</Text>
              </View>
            </View>
            <Text style={styles.dcNote}>
              Transmit as {user.display_name?.toUpperCase() || user.username?.toUpperCase()} • {user.mirrors_id}
            </Text>
          </TouchableOpacity>

          {/* Capabilities */}
          <Text style={styles.sectionTitle}>&gt; ACCOUNT CAPABILITIES</Text>
          <View style={styles.capList}>
            {[
              'Save custom frequency configurations',
              'Send frequencies to locations',
              'Save binaural presets',
              'Create mood stack combinations',
              'Push to Talk frequency transmission',
              'Access exclusive 432Hz content',
              'Receive event & music notifications',
            ].map((cap, i) => (
              <View key={i} style={styles.capItem}>
                <Text style={styles.capDot}>◆</Text>
                <Text style={styles.capText}>{cap}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ═══════════════════════════════════
  // NOT LOGGED IN — AUTH FORM
  // ═══════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MirrorsIdBanner />
        <Text style={styles.title}>MIRRORS ID</Text>
        <Text style={styles.subtitle}>
          {mode === 'register'
            ? 'Create your account to unlock the full spectrum'
            : 'Sign in to access your account'}
        </Text>

        {/* Mode Toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => { setMode('login'); setError(''); }}
          >
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              SIGN IN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
            onPress={() => { setMode('register'); setError(''); }}
          >
            <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
              CREATE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username..."
                  placeholderTextColor="#3a1010"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>Min 3 characters. This is your unique identity.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your display name (optional)..."
                  placeholderTextColor="#3a1010"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email..."
              placeholderTextColor="#3a1010"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password..."
              placeholderTextColor="#3a1010"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {mode === 'register' && (
              <Text style={styles.inputHint}>Min 6 characters.</Text>
            )}
          </View>

          {mode === 'register' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#3a1010"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.smsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smsLabel}>Receive text updates</Text>
                  <Text style={styles.smsDesc}>Get notified about events, new music & upgrades</Text>
                </View>
                <Switch
                  value={smsOptIn}
                  onValueChange={setSmsOptIn}
                  trackColor={{ false: '#2a0a0a', true: '#ff0a0a40' }}
                  thumbColor={smsOptIn ? '#ff0a0a' : '#5a1a1a'}
                />
              </View>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'register' ? 'CREATE MIRRORS ID' : 'SIGN IN'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Your Mirrors ID is your key to the GODMODE frequency network.
          Save custom setups, send frequencies to any location,
          and receive updates about new events, music releases & platform upgrades.
        </Text>

        {/* CODES Direct Connect for Anonymous Users */}
        <View style={styles.directConnectCard}>
          <TouchableOpacity onPress={() => router.push('/chirpconnect')} activeOpacity={0.8}>
            <View style={styles.dcTop}>
              <View style={styles.dcIconWrap}>
                <Text style={styles.dcIcon}>◎</Text>
              </View>
              <View style={styles.dcInfo}>
                <Text style={styles.dcTitle}>CODES:I.D. · DIRECT CONNECT</Text>
                <Text style={styles.dcDesc}>Push-to-Talk • No account needed</Text>
              </View>
              <Text style={styles.dcArrow}>▷</Text>
            </View>
            <Text style={[styles.dcNote, { marginTop: 10 }]}>
              Transmit anonymously or sign in for a verified identity
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16 },
  title: {
    color: '#ff0a0a', fontSize: 28, fontWeight: '700',
    textAlign: 'center', marginTop: 16, letterSpacing: 3,
  },
  subtitle: {
    color: '#5a1a1a', fontSize: 9, textAlign: 'center', marginTop: 8, lineHeight: 14,
  },
  modeRow: {
    flexDirection: 'row', gap: 8, marginTop: 20, justifyContent: 'center',
  },
  modeBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
  },
  modeBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  modeBtnText: { color: '#5a1a1a', fontSize: 10, fontWeight: '700' },
  modeBtnTextActive: { color: '#ff0a0a' },
  form: { marginTop: 20, gap: 14 },
  inputGroup: { gap: 4 },
  inputLabel: { color: '#ff0a0a', fontSize: 8, letterSpacing: 1, fontWeight: '600' },
  inputHint: { color: '#3a1010', fontSize: 7, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    color: '#ff3040', paddingHorizontal: 12, paddingVertical: 12, fontSize: 13,
  },
  smsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  smsLabel: { color: '#ff0a0a', fontSize: 10, fontWeight: '600' },
  smsDesc: { color: '#5a1a1a', fontSize: 8, marginTop: 2 },
  errorText: { color: '#ff3040', fontSize: 9, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center', marginTop: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#000', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  footerNote: {
    color: '#3a1010', fontSize: 8, textAlign: 'center', marginTop: 20, lineHeight: 13,
  },
  // Profile styles
  idCard: {
    borderWidth: 1, borderColor: '#ff0a0a', backgroundColor: '#0a0505',
    padding: 20, marginTop: 20,
  },
  idBadge: {
    alignSelf: 'flex-end', borderWidth: 1, borderColor: '#ff0a0a',
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8,
  },
  idBadgeText: { color: '#ff0a0a', fontSize: 7, letterSpacing: 2, fontWeight: '700' },
  idCode: {
    color: '#ff0a0a', fontSize: 22, fontWeight: '700', letterSpacing: 3,
  },
  idDivider: { height: 1, backgroundColor: '#2a0a0a', marginVertical: 10 },
  idName: { color: '#ff3040', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  idUsername: { color: '#ff0a0a', fontSize: 11, marginTop: 4, opacity: 0.8 },
  idEmail: { color: '#5a1a1a', fontSize: 9, marginTop: 4 },
  idPhone: { color: '#5a1a1a', fontSize: 9, marginTop: 2 },
  idRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  idLabel: { color: '#5a1a1a', fontSize: 8 },
  idValue: { color: '#ff0a0a', fontSize: 8, fontWeight: '700' },
  sectionTitle: {
    color: '#ff0a0a', fontSize: 12, fontWeight: '700',
    marginTop: 24, marginBottom: 10,
  },
  contactSection: {
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    padding: 14, gap: 10,
  },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  contactLabel: { color: '#5a1a1a', fontSize: 9 },
  contactValue: { color: '#ff0a0a', fontSize: 9, fontWeight: '600' },
  editBtn: {
    borderWidth: 1, borderColor: '#2a0a0a', paddingVertical: 10, alignItems: 'center',
  },
  editBtnText: { color: '#ff0a0a', fontSize: 9, letterSpacing: 1, fontWeight: '600' },
  capList: { gap: 8 },
  capItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capDot: { color: '#ff0a0a', fontSize: 8 },
  capText: { color: '#993333', fontSize: 9 },
  logoutBtn: {
    borderWidth: 1, borderColor: '#2a0a0a', paddingVertical: 12, alignItems: 'center', marginTop: 24,
  },
  logoutText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2 },
  // Direct Connect styles
  directConnectCard: {
    borderWidth: 1, borderColor: '#ff0a0a', backgroundColor: '#0a0505',
    padding: 14, borderRadius: 4,
  },
  dcTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dcIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#ff0a0a',
    backgroundColor: '#150505', justifyContent: 'center', alignItems: 'center',
  },
  dcIcon: { color: '#ff0a0a', fontSize: 22 },
  dcInfo: { flex: 1 },
  dcTitle: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  dcDesc: { color: '#5a1a1a', fontSize: 9, marginTop: 2, letterSpacing: 1 },
  dcArrow: { color: '#ff0a0a', fontSize: 16 },
  dcDivider: { height: 1, backgroundColor: '#2a0a0a', marginVertical: 10 },
  dcMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  dcMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dcMetaDot: { width: 6, height: 6, borderRadius: 3 },
  dcMetaText: { color: '#3a1010', fontSize: 8, letterSpacing: 1 },
  dcNote: { color: '#2a0a0a', fontSize: 7, marginTop: 8, textAlign: 'center', letterSpacing: 1 },
});
