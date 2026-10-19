import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import NinetySixGuide from '../src/NinetySixGuide';
import LandingScope from '../src/LandingScope';

import { skinStyles, SK } from '../src/skins';
import { useLayout } from '../src/useLayout';

// Chakra Colors
const C = {
  root: '#E53935',      // Red
  sacral: '#FF6D00',    // Orange
  solar: '#FDD835',     // Yellow
  heart: '#43A047',     // Green
  throat: '#29B6F6',    // Blue
  eye: '#7C4DFF',       // Indigo
  crown: '#CE93D8',     // Violet
};

export default function HowScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const [a11yOpen, setA11yOpen] = useState(false);
  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: insets.bottom + 90 }, layout.frame]}>
          <LandingScope testID="how-scope" />
          <MirrorsIdBanner />

          {/* ══════ HEADER ══════ */}
          <View style={styles.header}>
            <View style={styles.terminalHeader}>
              <Text style={styles.terminalTitle}>HOW MIRRORS WORKS</Text>
            </View>
            <Text style={styles.heroText}>
              Every illness, emotion, and state of being has its own harmonic resonance.
            </Text>
            <Text style={styles.heroSub}>
              MIRRORS uses cymatics tuned to 432 Hz to resonate specific frequencies that promote focus, calm, and deep presence.
            </Text>
          </View>

          {/* ══════ THE PRINCIPLE — ROOT (RED) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.root }]}>&gt; THE PRINCIPLE</Text>
            <View style={[styles.contentBox, { borderColor: C.root + '40' }]}>
              <Text style={[styles.highlightText, { color: C.root }]}>EVERYTHING HAS A FREQUENCY</Text>
              <Text style={[styles.contentText, { color: C.root + 'CC' }]}>
                Every illness, emotion, and state of being vibrates at a specific frequency. When your body is out of balance, it produces disharmonic frequencies.
              </Text>
              <View style={styles.divider} />
              <Text style={[styles.highlightText, { color: C.root }]}>THE SOLUTION: FREQUENCY CANCELLATION</Text>
              <Text style={[styles.contentText, { color: C.root + 'CC' }]}>
                By introducing a precisely calibrated counter-frequency, you can shift the listening experience and bring the session into resonance.
              </Text>
              <Text style={[styles.contentText, { color: C.root + 'CC' }]}>
                Just like noise-canceling headphones eliminate unwanted sound, MIRRORS eliminates unwanted frequencies in your body.
              </Text>
            </View>
          </View>

          {/* ══════ THE PROCESS — SACRAL (ORANGE) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.sacral }]}>&gt; THE PROCESS</Text>
            <View style={styles.stepsContainer}>
              <View style={[styles.stepCard, { borderColor: C.sacral + '40' }]}>
                <View style={[styles.stepNumBox, { borderColor: C.sacral }]}><Text style={[styles.stepNum, { color: C.sacral }]}>01</Text></View>
                <Text style={[styles.stepTitle, { color: C.sacral }]}>IDENTIFY</Text>
                <Text style={[styles.stepDesc, { color: C.sacral + 'AA' }]}>Each condition has its resonant frequency signature. Pain vibrates at one frequency, anxiety at another, fatigue at another.</Text>
              </View>
              <View style={styles.stepConnector}><Text style={[styles.stepArrow, { color: C.sacral }]}>|</Text></View>
              <View style={[styles.stepCard, { borderColor: C.sacral + '40' }]}>
                <View style={[styles.stepNumBox, { borderColor: C.sacral }]}><Text style={[styles.stepNum, { color: C.sacral }]}>02</Text></View>
                <Text style={[styles.stepTitle, { color: C.sacral }]}>RESONATE</Text>
                <Text style={[styles.stepDesc, { color: C.sacral + 'AA' }]}>MIRRORS plays a precisely calibrated counter-frequency designed to bring you into a state of deep focus and presence.</Text>
              </View>
              <View style={styles.stepConnector}><Text style={[styles.stepArrow, { color: C.sacral }]}>|</Text></View>
              <View style={[styles.stepCard, { borderColor: C.sacral + '40' }]}>
                <View style={[styles.stepNumBox, { borderColor: C.sacral }]}><Text style={[styles.stepNum, { color: C.sacral }]}>03</Text></View>
                <Text style={[styles.stepTitle, { color: C.sacral }]}>ELIMINATE</Text>
                <Text style={[styles.stepDesc, { color: C.sacral + 'AA' }]}>As the frequencies align, you enter a state of deep listening and focused awareness at the vibrational level.</Text>
              </View>
            </View>
          </View>

          {/* ══════ WHY 432 Hz — SOLAR PLEXUS (YELLOW) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.solar }]}>&gt; WHY 432 Hz</Text>
            <View style={[styles.contentBox, { borderColor: C.solar + '40' }]}>
              <Text style={[styles.contentText, { color: C.solar + 'CC' }]}>
                432 Hz is not arbitrary — it is the natural frequency of the universe. The frequency at which water resonates, Earth vibrates, and human DNA is aligned.
              </Text>
              <View style={styles.gridRow}>
                <View style={[styles.gridCell, { borderColor: C.solar + '30' }]}>
                  <Text style={[styles.gridIcon, { color: C.solar }]}>~</Text>
                  <Text style={[styles.gridTitle, { color: C.solar }]}>WATER</Text>
                  <Text style={[styles.gridDesc, { color: C.solar + '99' }]}>Your body is 70% water. 432 Hz creates perfect geometric patterns in water molecules via cymatics.</Text>
                </View>
                <View style={[styles.gridCell, { borderColor: C.solar + '30' }]}>
                  <Text style={[styles.gridIcon, { color: C.solar }]}>*</Text>
                  <Text style={[styles.gridTitle, { color: C.solar }]}>DNA REPAIR</Text>
                  <Text style={[styles.gridDesc, { color: C.solar + '99' }]}>528 Hz (a harmonic of 432) is the "Love Frequency" — documented to repair DNA integrity.</Text>
                </View>
              </View>
              <View style={styles.gridRow}>
                <View style={[styles.gridCell, { borderColor: C.solar + '30' }]}>
                  <Text style={[styles.gridIcon, { color: C.solar }]}>@</Text>
                  <Text style={[styles.gridTitle, { color: C.solar }]}>EARTH</Text>
                  <Text style={[styles.gridDesc, { color: C.solar + '99' }]}>The Schumann Resonance (7.83 Hz) harmonizes perfectly with 432 Hz mathematics.</Text>
                </View>
                <View style={[styles.gridCell, { borderColor: C.solar + '30' }]}>
                  <Text style={[styles.gridIcon, { color: C.solar }]}>#</Text>
                  <Text style={[styles.gridTitle, { color: C.solar }]}>SACRED 9</Text>
                  <Text style={[styles.gridDesc, { color: C.solar + '99' }]}>432 reduces to 9 (4+3+2=9), the number of completion. Perfect harmonic relationships.</Text>
                </View>
              </View>
              <View style={[styles.warningBox, { borderColor: C.solar }]}>
                <Text style={[styles.warningLabel, { color: C.solar }]}>! THE 440 Hz PROBLEM</Text>
                <Text style={[styles.warningDesc, { color: C.solar + 'AA' }]}>Modern music is tuned to 440 Hz — a frequency introduced in the 1940s that creates dissonance in the human body. 432 Hz is the original, natural tuning that restores harmony.</Text>
              </View>
            </View>
          </View>

          {/* ══════ CYMATICS — HEART (GREEN) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.heart }]}>&gt; CYMATICS: VIBRATIONAL SCIENCE</Text>
            <View style={[styles.contentBox, { borderColor: C.heart + '40' }]}>
              <Text style={[styles.contentText, { color: C.heart + 'CC' }]}>
                Cymatics is the study of visible sound — how frequencies create geometric patterns in matter. When sound vibrates through water, sand, or cells, it creates specific shapes.
              </Text>
              <View style={styles.comparisonRow}>
                <View style={[styles.comparisonCell, { borderColor: SK('#5a1a1a') }]}>
                  <Text style={styles.compBadIcon}>X</Text>
                  <Text style={[styles.compTitle, { color: SK('#993333') }]}>DISHARMONIC</Text>
                  <Text style={[styles.compDesc, { color: SK('#662222') }]}>Chaotic, irregular patterns — illness, pain, emotional distress</Text>
                </View>
                <View style={[styles.comparisonCell, { borderColor: C.heart }]}>
                  <Text style={[styles.compGoodIcon, { color: C.heart }]}>+</Text>
                  <Text style={[styles.compTitle, { color: C.heart }]}>HARMONIC</Text>
                  <Text style={[styles.compDesc, { color: C.heart + 'AA' }]}>Perfect geometric patterns — focus, balance, calm</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════ BRAINWAVE ENTRAINMENT — THROAT (BLUE) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.throat }]}>&gt; BRAINWAVE ENTRAINMENT</Text>
            <View style={[styles.contentBox, { borderColor: C.throat + '40' }]}>
              <Text style={[styles.contentText, { color: C.throat + 'CC' }]}>
                Neural oscillations align with specific frequencies via the Frequency Following Response (FFR) — your brain's natural tendency to synchronize with external rhythmic stimuli.
              </Text>
              <View style={styles.dataTable}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: C.throat }]}>DELTA</Text>
                  <Text style={[styles.tableValue, { color: C.throat }]}>0.5-4 Hz</Text>
                  <Text style={[styles.tableDesc, { color: C.throat + '88' }]}>Deep sleep, rest</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: C.throat }]}>THETA</Text>
                  <Text style={[styles.tableValue, { color: C.throat }]}>4-8 Hz</Text>
                  <Text style={[styles.tableDesc, { color: C.throat + '88' }]}>Meditation, dreams</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: C.throat }]}>ALPHA</Text>
                  <Text style={[styles.tableValue, { color: C.throat }]}>8-12 Hz</Text>
                  <Text style={[styles.tableDesc, { color: C.throat + '88' }]}>Relaxed focus</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: C.throat }]}>BETA</Text>
                  <Text style={[styles.tableValue, { color: C.throat }]}>12-30 Hz</Text>
                  <Text style={[styles.tableDesc, { color: C.throat + '88' }]}>Alertness, vitality</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: C.throat }]}>GAMMA</Text>
                  <Text style={[styles.tableValue, { color: C.throat }]}>30+ Hz</Text>
                  <Text style={[styles.tableDesc, { color: C.throat + '88' }]}>Peak consciousness</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════ BINAURAL BEATS — THIRD EYE (INDIGO) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.eye }]}>&gt; BINAURAL BEATS</Text>
            <View style={[styles.contentBox, { borderColor: C.eye + '40' }]}>
              <Text style={[styles.contentText, { color: C.eye + 'CC' }]}>
                Playing different frequencies in each ear creates a perceived third tone that entrains your brainwaves.
              </Text>
              <View style={[styles.exampleBox, { borderColor: C.eye + '40' }]}>
                <Text style={[styles.exampleTitle, { color: C.eye }]}>EXAMPLE:</Text>
                <Text style={[styles.exampleText, { color: C.eye }]}>Left Ear: 432 Hz  |  Right Ear: 442 Hz</Text>
                <Text style={[styles.exampleResult, { color: C.eye }]}>Perceived: 10 Hz (Alpha State)</Text>
              </View>
              <Text style={[styles.warningText, { color: C.eye }]}>! STEREO HEADPHONES REQUIRED !</Text>
            </View>
          </View>

          {/* ══════ TARGETING ISSUES — CROWN (VIOLET) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.crown }]}>&gt; TARGETING YOUR ISSUES</Text>
            <View style={[styles.targetCard, { borderColor: C.root + '40' }]}>
              <Text style={[styles.targetTitle, { color: C.root }]}>PHYSICAL PAIN & INFLAMMATION</Text>
              <Text style={[styles.targetFreq, { color: C.root + 'CC' }]}>174 Hz - 285 Hz RANGE</Text>
              <Text style={[styles.targetDesc, { color: C.root + '99' }]}>Disrupts pain signals and promotes cellular regeneration. Counter-resonance eliminates chronic pain frequency signature.</Text>
            </View>
            <View style={[styles.targetCard, { borderColor: C.sacral + '40' }]}>
              <Text style={[styles.targetTitle, { color: C.sacral }]}>ANXIETY & FEAR</Text>
              <Text style={[styles.targetFreq, { color: C.sacral + 'CC' }]}>396 Hz + 528 Hz</Text>
              <Text style={[styles.targetDesc, { color: C.sacral + '99' }]}>396 Hz liberates fear and guilt. 528 Hz restores emotional balance. Cancels the resonant frequency of anxiety disorders.</Text>
            </View>
            <View style={[styles.targetCard, { borderColor: C.solar + '40' }]}>
              <Text style={[styles.targetTitle, { color: C.solar }]}>DEPRESSION & SADNESS</Text>
              <Text style={[styles.targetFreq, { color: C.solar + 'CC' }]}>639 Hz + 741 Hz</Text>
              <Text style={[styles.targetDesc, { color: C.solar + '99' }]}>639 Hz reconnects you to love. 741 Hz awakens intuition and clarity. Neutralizes the vibrational pattern of depression.</Text>
            </View>
            <View style={[styles.targetCard, { borderColor: C.throat + '40' }]}>
              <Text style={[styles.targetTitle, { color: C.throat }]}>INSOMNIA & SLEEP DISORDERS</Text>
              <Text style={[styles.targetFreq, { color: C.throat + 'CC' }]}>DELTA WAVES 0.5-4 Hz</Text>
              <Text style={[styles.targetDesc, { color: C.throat + '99' }]}>Entrains your brain to deep sleep states. Overrides the frequency of hypervigilance and restlessness.</Text>
            </View>
            <View style={[styles.targetCard, { borderColor: C.eye + '40' }]}>
              <Text style={[styles.targetTitle, { color: C.eye }]}>CHRONIC FATIGUE & LOW ENERGY</Text>
              <Text style={[styles.targetFreq, { color: C.eye + 'CC' }]}>BETA & GAMMA 13-40 Hz</Text>
              <Text style={[styles.targetDesc, { color: C.eye + '99' }]}>Stimulates alertness and vitality. Introduces energizing frequencies that cancel exhaustion patterns.</Text>
            </View>
          </View>

          {/* ══════ SOLFEGGIO — ROOT (RED) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.root }]}>&gt; SOLFEGGIO FREQUENCIES</Text>
            <View style={[styles.contentBox, { borderColor: C.root + '40' }]}>
              <View style={styles.dataTable}>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.root }]}>174 Hz</Text><Text style={[styles.tableDesc, { color: C.root + '99' }]}>Pain relief</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.sacral }]}>285 Hz</Text><Text style={[styles.tableDesc, { color: C.sacral + '99' }]}>Tissue regeneration</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.solar }]}>396 Hz</Text><Text style={[styles.tableDesc, { color: C.solar + '99' }]}>Liberation from fear</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.solar }]}>417 Hz</Text><Text style={[styles.tableDesc, { color: C.solar + '99' }]}>Facilitating change</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.heart }]}>528 Hz</Text><Text style={[styles.tableDesc, { color: C.heart + '99' }]}>DNA repair, love frequency</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.heart }]}>639 Hz</Text><Text style={[styles.tableDesc, { color: C.heart + '99' }]}>Relationships, connection</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.throat }]}>741 Hz</Text><Text style={[styles.tableDesc, { color: C.throat + '99' }]}>Mental clarity, intuition</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.eye }]}>852 Hz</Text><Text style={[styles.tableDesc, { color: C.eye + '99' }]}>Spiritual insight</Text></View>
                <View style={styles.tableRow}><Text style={[styles.tableFreq, { color: C.crown }]}>963 Hz</Text><Text style={[styles.tableDesc, { color: C.crown + '99' }]}>Pineal activation, divine</Text></View>
              </View>
            </View>
          </View>

          {/* ══════ HEALING — HEART (GREEN) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.heart }]}>&gt; HEALING WITHOUT MEDICINE</Text>
            <View style={[styles.contentBox, { borderColor: C.heart + '40' }]}>
              <Text style={[styles.contentText, { color: C.heart + 'CC' }]}>
                For thousands of years, humans have known that sound shapes experience. MIRRORS is a return to intentional listening.
              </Text>
              <View style={styles.benefitsRow}>
                <View style={[styles.benefitCell, { borderColor: SK('#5a1a1a') }]}>
                  <Text style={styles.benefitBadIcon}>X</Text>
                  <Text style={[styles.benefitLabel, { color: SK('#993333') }]}>NO SIDE EFFECTS</Text>
                  <Text style={[styles.benefitDesc, { color: SK('#662222') }]}>Unlike drugs that poison your system</Text>
                </View>
                <View style={[styles.benefitCell, { borderColor: SK('#5a1a1a') }]}>
                  <Text style={styles.benefitBadIcon}>X</Text>
                  <Text style={[styles.benefitLabel, { color: SK('#993333') }]}>NO SURGERY</Text>
                  <Text style={[styles.benefitDesc, { color: SK('#662222') }]}>No cutting into your body</Text>
                </View>
                <View style={[styles.benefitCell, { borderColor: C.heart + '40' }]}>
                  <Text style={[styles.benefitGoodIcon, { color: C.heart }]}>+</Text>
                  <Text style={[styles.benefitLabel, { color: C.heart }]}>PURE ENERGY</Text>
                  <Text style={[styles.benefitDesc, { color: C.heart + '99' }]}>Works with your body's resonance</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════ QUOTE — SOLAR (YELLOW) ══════ */}
          <View style={styles.section}>
            <View style={[styles.quoteBox, { borderLeftColor: C.solar }]}>
              <Text style={[styles.quoteText, { color: C.solar }]}>
                "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration."
              </Text>
              <Text style={[styles.quoteAuthor, { color: C.solar + 'AA' }]}>— NIKOLA TESLA</Text>
            </View>
          </View>

          {/* ══════ PHI RATIO — CROWN (VIOLET) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.crown }]}>&gt; PHI RATIO [1.618033...]</Text>
            <View style={[styles.phiBox, { borderColor: C.crown }]}>
              <Text style={[styles.phiText, { color: C.crown }]}>432 / 1.618 = 267 Hz</Text>
              <Text style={[styles.phiText, { color: C.crown }]}>432 * 1.618 = 699 Hz</Text>
              <Text style={[styles.phiText, { color: C.crown }]}>Fibonacci: 1, 1, 2, 3, 5, 8, 13...</Text>
            </View>
          </View>

          {/* ══════ BEST PRACTICES — THROAT (BLUE) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.throat }]}>&gt; BEST PRACTICES</Text>
            <View style={[styles.contentBox, { borderColor: C.throat + '40' }]}>
              <View style={styles.practiceItem}>
                <Text style={[styles.practiceIcon, { color: C.throat }]}>&gt;</Text>
                <View style={styles.practiceTextWrap}>
                  <Text style={[styles.practiceTitle, { color: C.throat }]}>USE HEADPHONES</Text>
                  <Text style={[styles.practiceDesc, { color: C.throat + '88' }]}>Binaural beats require separate channels for each ear.</Text>
                </View>
              </View>
              <View style={styles.practiceItem}>
                <Text style={[styles.practiceIcon, { color: C.throat }]}>&gt;</Text>
                <View style={styles.practiceTextWrap}>
                  <Text style={[styles.practiceTitle, { color: C.throat }]}>KEEP VOLUME LOW</Text>
                  <Text style={[styles.practiceDesc, { color: C.throat + '88' }]}>30-50% is optimal. Too loud can be uncomfortable.</Text>
                </View>
              </View>
              <View style={styles.practiceItem}>
                <Text style={[styles.practiceIcon, { color: C.throat }]}>&gt;</Text>
                <View style={styles.practiceTextWrap}>
                  <Text style={[styles.practiceTitle, { color: C.throat }]}>START SMALL</Text>
                  <Text style={[styles.practiceDesc, { color: C.throat + '88' }]}>Begin with 8-13 minute sessions if you're new.</Text>
                </View>
              </View>
              <View style={styles.practiceItem}>
                <Text style={[styles.practiceIcon, { color: C.throat }]}>&gt;</Text>
                <View style={styles.practiceTextWrap}>
                  <Text style={[styles.practiceTitle, { color: C.throat }]}>BE CONSISTENT</Text>
                  <Text style={[styles.practiceDesc, { color: C.throat + '88' }]}>Daily practice yields better results.</Text>
                </View>
              </View>
              <View style={styles.practiceItem}>
                <Text style={[styles.practiceIcon, { color: C.throat }]}>&gt;</Text>
                <View style={styles.practiceTextWrap}>
                  <Text style={[styles.practiceTitle, { color: C.throat }]}>STAY HYDRATED</Text>
                  <Text style={[styles.practiceDesc, { color: C.throat + '88' }]}>Sound sessions can be dehydrating.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════ CONNECT — EYE (INDIGO) ══════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.eye }]}>&gt; CONNECT WITH GODMODE</Text>
            <View style={styles.connectGrid}>
              <TouchableOpacity style={[styles.connectBtn, { borderColor: C.eye + '40' }]} onPress={() => Linking.openURL('https://instagram.com/mirrors.96')}>
                <Text style={[styles.connectLabel, { color: C.eye }]}>MIRRORS 96</Text>
                <Text style={[styles.connectSub, { color: C.eye + '88' }]}>@mirrors.96</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.connectBtn, { borderColor: C.eye + '40' }]} onPress={() => Linking.openURL('https://instagram.com/vincesinnott')}>
                <Text style={[styles.connectLabel, { color: C.eye }]}>GODMODE SOUND</Text>
                <Text style={[styles.connectSub, { color: C.eye + '88' }]}>@vincesinnott</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.connectBtn, { borderColor: C.eye + '40' }]} onPress={() => Linking.openURL('https://instagram.com/godmodellc')}>
                <Text style={[styles.connectLabel, { color: C.eye }]}>GODMODE LLC</Text>
                <Text style={[styles.connectSub, { color: C.eye + '88' }]}>@godmodellc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.connectBtn, { borderColor: C.eye + '40' }]} onPress={() => Linking.openURL('mailto:godmodesound@gmail.com?subject=Contact')}>
                <Text style={[styles.connectLabel, { color: C.eye }]}>CONTACT</Text>
                <Text style={[styles.connectSub, { color: C.eye + '88' }]}>godmodesound@gmail.com</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ══════ DISCLAIMER ══════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; LEGAL DISCLAIMER</Text>
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                MIRRORS is a sound experience for focus, calm, and presence. It is not a medical device and makes no therapeutic claims. Not intended to diagnose, treat, cure, or prevent any condition.
              </Text>
              <Text style={styles.disclaimerText}>
                This tool is intended for educational and experimental purposes. Do not use while driving, operating machinery, or if you have a history of seizures or epilepsy.
              </Text>
              <Text style={styles.disclaimerText}>
                Results vary by individual. Frequency exploration is based on acoustic science and artistic practice. Use MIRRORS as part of your personal listening practice. Consult healthcare professionals for any medical conditions.
              </Text>
            </View>
          </View>

          {/* ══════ PRIVACY POLICY ══════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; PRIVACY POLICY</Text>
            <View style={styles.disclaimerBox}>
              <Text style={styles.policyDate}>Effective Date: March 2026</Text>

              <Text style={styles.policyHeading}>1. INTRODUCTION</Text>
              <Text style={styles.disclaimerText}>
                GODMODE SOUND LLC ("we," "our," or "us") operates the MIRRORS mobile application. This Privacy Policy explains how we collect, use, and protect your information when you use our app.
              </Text>

              <Text style={styles.policyHeading}>2. INFORMATION WE COLLECT</Text>
              <Text style={styles.disclaimerText}>
                MIRRORS is designed with your privacy in mind. The app operates primarily on-device and does not require account creation or login.
              </Text>
              <Text style={styles.policyBullet}>- Device Information: Basic device type and OS version for app compatibility.</Text>
              <Text style={styles.policyBullet}>- Usage Data: Anonymous interaction data such as which frequencies are played, session duration, and feature usage. This data is not linked to your identity.</Text>
              <Text style={styles.policyBullet}>- Audio Processing: All audio generation and frequency synthesis occurs locally on your device. No audio data is transmitted to external servers.</Text>

              <Text style={styles.policyHeading}>3. INFORMATION WE DO NOT COLLECT</Text>
              <Text style={styles.policyBullet}>- No personal identification (name, email, phone)</Text>
              <Text style={styles.policyBullet}>- No location data</Text>
              <Text style={styles.policyBullet}>- No contacts or address book access</Text>
              <Text style={styles.policyBullet}>- No microphone or camera access</Text>
              <Text style={styles.policyBullet}>- No health or biometric data</Text>
              <Text style={styles.policyBullet}>- No financial or payment information</Text>

              <Text style={styles.policyHeading}>4. DATA STORAGE & SECURITY</Text>
              <Text style={styles.disclaimerText}>
                All user preferences and settings are stored locally on your device using secure on-device storage. We do not maintain external databases containing personal user data. Your frequency presets, session history, and app settings remain on your device.
              </Text>

              <Text style={styles.policyHeading}>5. THIRD-PARTY SERVICES</Text>
              <Text style={styles.disclaimerText}>
                The app may use third-party services for analytics and crash reporting. These services collect anonymized, aggregated data only. We do not sell, trade, or transfer your information to outside parties.
              </Text>

              <Text style={styles.policyHeading}>6. CHILDREN'S PRIVACY</Text>
              <Text style={styles.disclaimerText}>
                MIRRORS is not directed at children under 13. We do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us immediately.
              </Text>

              <Text style={styles.policyHeading}>7. YOUR RIGHTS</Text>
              <Text style={styles.disclaimerText}>
                You have the right to request deletion of any data associated with your use of the app. Since MIRRORS operates primarily on-device, you can clear all local data by uninstalling the application.
              </Text>

              <Text style={styles.policyHeading}>8. CHANGES TO THIS POLICY</Text>
              <Text style={styles.disclaimerText}>
                We may update this Privacy Policy from time to time. Changes will be reflected within the app with an updated effective date. Continued use of MIRRORS after changes constitutes acceptance of the updated policy.
              </Text>

              <Text style={styles.policyHeading}>9. CONTACT</Text>
              <Text style={styles.disclaimerText}>
                For questions or concerns regarding this Privacy Policy, contact us at:
              </Text>
              <Text style={styles.policyContact}>GODMODE SOUND LLC</Text>
              <Text style={styles.policyContact}>godmodesound@gmail.com</Text>
              <Text style={styles.policyContact}>instagram.com/godmodellc</Text>
            </View>
          </View>

          {/* ══════ ACCESSIBILITY STATEMENT (compressed / expandable) ══════ */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.a11yToggle}
              onPress={() => setA11yOpen(o => !o)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>&gt; MIRRORS 96 ACCESSIBILITY STATEMENT</Text>
              <Text style={styles.a11yChevron}>{a11yOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {a11yOpen && (
              <View style={styles.disclaimerBox}>
                <Text style={styles.policyDate}>Last Updated: August 14, 2026</Text>
                <Text style={styles.disclaimerText}>
                  MIRRORS 96 is committed to making its digital experiences accessible and usable for as many people as possible, including people with disabilities.
                </Text>

                <Text style={styles.policyHeading}>OUR COMMITMENT</Text>
                <Text style={styles.disclaimerText}>
                  Accessibility is integrated into the MIRRORS 96 experience, not treated as an afterthought. As the platform evolves, we continuously evaluate and improve accessibility across interfaces, audio experiences, visualizations, controls, and content — informed by recognized practices including the Web Content Accessibility Guidelines (WCAG) and device-level accessibility capabilities.
                </Text>

                <Text style={styles.policyHeading}>ACCESSIBILITY FEATURES</Text>
                <Text style={styles.disclaimerText}>
                  Depending on device, OS, and app version, considerations may include:
                </Text>
                <Text style={styles.policyBullet}>- Screen-reader-compatible interface elements & clearly labeled controls</Text>
                <Text style={styles.policyBullet}>- Logical navigation hierarchy, scalable text, sufficient visual contrast</Text>
                <Text style={styles.policyBullet}>- Alternatives to color-only information & appropriate touch-target sizing</Text>
                <Text style={styles.policyBullet}>- Reduced reliance on rapid animation; compatibility with device accessibility settings</Text>
                <Text style={styles.policyBullet}>- User control over audio playback; visual information accompanying audio where practical</Text>
                <Text style={styles.policyBullet}>- Audio/visual feedback designed to never be the sole channel for essential information</Text>
                <Text style={styles.disclaimerText}>
                  Because MIRRORS 96 incorporates sound, frequency-based audio, visual feedback, motion, and interactive experiences, certain features may inherently depend on particular sensory capabilities. We continue working to provide alternative methods of interaction where technically practical.
                </Text>

                <Text style={styles.policyHeading}>SENSORY CONSIDERATIONS</Text>
                <Text style={styles.disclaimerText}>
                  Some experiences may contain flashing or strobing visuals, animation, high-contrast imagery, repetitive patterns, spatial or binaural audio, frequency tones, or pulses. Users sensitive to flashing lights, motion, repetitive patterns, or particular sounds should review available controls and adjust device volume, display, motion, brightness, and accessibility settings before use. Where appropriate, MIRRORS 96 aims to provide meaningful control over sensory-intensive functionality.
                </Text>

                <Text style={styles.policyHeading}>CONTINUOUS IMPROVEMENT</Text>
                <Text style={styles.disclaimerText}>
                  Accessibility is an ongoing process. MIRRORS 96 will change as new features, technologies, OS capabilities, and accessibility standards become available. We welcome feedback from users who encounter an accessibility barrier.
                </Text>

                <Text style={styles.policyHeading}>ACCESSIBILITY FEEDBACK</Text>
                <Text style={styles.disclaimerText}>
                  If you experience difficulty accessing or using MIRRORS 96, please contact us and describe: the feature or screen you were attempting to access, the issue encountered, your device and OS, and any assistive technology in use. We will make reasonable efforts to investigate and identify practical improvements.
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:godmodesound@gmail.com?subject=Accessibility%20Feedback')}>
                  <Text style={styles.policyContact}>Contact: godmodesound@gmail.com</Text>
                </TouchableOpacity>

                <Text style={styles.policyHeading}>THIRD-PARTY SERVICES</Text>
                <Text style={styles.disclaimerText}>
                  MIRRORS 96 may integrate with or link to third-party platforms and technologies. We cannot control the accessibility of independently operated services, though we aim to consider accessibility when selecting external technologies.
                </Text>

                <Text style={styles.policyHeading}>OUR DIRECTION</Text>
                <Text style={styles.disclaimerText}>
                  MIRRORS 96 is built on the principle that technology should expand access to creative and sensory experiences — increasingly perceivable, operable, understandable, and robust across a broad range of users, devices, and abilities.
                </Text>

                <Text style={styles.policyContact}>MIRRORS 96</Text>
                <Text style={styles.policyContact}>The Future. Now.</Text>
                <Text style={styles.policyContact}>Powered by GODMODE SOUND</Text>
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />

          {/* last line of curiosity */}
          <NinetySixGuide variant="line" />
        </ScrollView>
      </View>
    </View>
  );
}

const F = 'TerminatorRealNFI';

const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },

  // Header
  header: { paddingTop: 16, paddingBottom: 4 },
  terminalHeader: { borderWidth: 1, borderColor: '#ff0a0a', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0a0505' },
  terminalTitle: { color: '#ff0a0a', fontSize: 16, fontFamily: F, fontWeight: '700', textAlign: 'center', letterSpacing: 2 },
  heroText: { color: '#ff3040', fontSize: 12, fontFamily: F, textAlign: 'center', marginTop: 16, lineHeight: 20, paddingHorizontal: 8 },
  heroSub: { color: '#993333', fontSize: 10, fontFamily: F, textAlign: 'center', marginTop: 10, lineHeight: 16, paddingHorizontal: 4 },

  // Sections
  section: { marginTop: 24 },
  sectionTitle: { color: '#ff0a0a', fontSize: 11, fontFamily: F, marginBottom: 8, letterSpacing: 1 },
  contentBox: { borderWidth: 1, borderColor: '#2a0a0a', padding: 12, backgroundColor: '#0a0505' },
  contentText: { color: '#993333', fontSize: 10, fontFamily: F, lineHeight: 16, marginBottom: 8 },
  highlightText: { color: '#ff3040', fontSize: 11, fontFamily: F, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#2a0a0a', marginVertical: 10 },

  // 3-Step Process
  stepsContainer: { alignItems: 'center' },
  stepCard: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505', padding: 14, width: '100%', alignItems: 'center' },
  stepNumBox: { borderWidth: 1, borderColor: '#ff0a0a', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepNum: { color: '#ff0a0a', fontSize: 14, fontFamily: F, fontWeight: '700' },
  stepTitle: { color: '#ff0a0a', fontSize: 14, fontFamily: F, fontWeight: '700', marginBottom: 6, letterSpacing: 2 },
  stepDesc: { color: '#993333', fontSize: 9, fontFamily: F, textAlign: 'center', lineHeight: 15 },
  stepConnector: { alignItems: 'center', paddingVertical: 2 },
  stepArrow: { color: '#ff0a0a', fontSize: 14, fontFamily: F },

  // 432Hz Grid
  gridRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  gridCell: { flex: 1, borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0d0505', padding: 10, alignItems: 'center' },
  gridIcon: { color: '#ff0a0a', fontSize: 18, fontFamily: F, marginBottom: 4 },
  gridTitle: { color: '#ff3040', fontSize: 9, fontFamily: F, fontWeight: '700', marginBottom: 4, letterSpacing: 1 },
  gridDesc: { color: '#662222', fontSize: 8, fontFamily: F, textAlign: 'center', lineHeight: 12 },

  // Warning box
  warningBox: { borderWidth: 1, borderColor: '#ff3040', padding: 10, backgroundColor: '#150505', marginTop: 10 },
  warningLabel: { color: '#ff3040', fontSize: 10, fontFamily: F, fontWeight: '700', marginBottom: 4 },
  warningDesc: { color: '#993333', fontSize: 9, fontFamily: F, lineHeight: 14 },

  // Cymatics comparison
  comparisonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  comparisonCell: { flex: 1, padding: 10, alignItems: 'center', borderWidth: 1, backgroundColor: '#0d0505' },
  compBadIcon: { color: '#5a1a1a', fontSize: 20, fontFamily: F, fontWeight: '700' },
  compGoodIcon: { color: '#ff0a0a', fontSize: 20, fontFamily: F, fontWeight: '700' },
  compTitle: { color: '#ff3040', fontSize: 9, fontFamily: F, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  compDesc: { color: '#662222', fontSize: 8, fontFamily: F, textAlign: 'center', lineHeight: 12, marginTop: 4 },

  // Data table
  dataTable: { marginTop: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  tableLabel: { color: '#ff3040', fontSize: 10, fontFamily: F, width: 60, fontWeight: '700' },
  tableValue: { color: '#ff0a0a', fontSize: 10, fontFamily: F, width: 70 },
  tableFreq: { color: '#ff0a0a', fontSize: 10, fontFamily: F, width: 70, fontWeight: '700' },
  tableDesc: { color: '#5a1a1a', fontSize: 10, fontFamily: F, flex: 1 },

  // Binaural example
  exampleBox: { marginTop: 12, padding: 10, backgroundColor: '#150505', borderWidth: 1, borderColor: '#2a0a0a' },
  exampleTitle: { color: '#ff3040', fontSize: 10, fontFamily: F, marginBottom: 6 },
  exampleText: { color: '#ff0a0a', fontSize: 10, fontFamily: F },
  exampleResult: { color: '#ff3040', fontSize: 10, fontFamily: F, marginTop: 6, fontWeight: '700' },
  warningText: { color: '#ff3040', fontSize: 10, fontFamily: F, textAlign: 'center', marginTop: 12 },

  // Target cards
  targetCard: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505', padding: 12, marginBottom: 8 },
  targetTitle: { color: '#ff3040', fontSize: 11, fontFamily: F, fontWeight: '700', marginBottom: 4, letterSpacing: 1 },
  targetFreq: { color: '#ff0a0a', fontSize: 10, fontFamily: F, marginBottom: 6 },
  targetDesc: { color: '#662222', fontSize: 9, fontFamily: F, lineHeight: 14 },

  // Benefits row
  benefitsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  benefitCell: { flex: 1, borderWidth: 1, borderColor: '#2a0a0a', padding: 8, alignItems: 'center', backgroundColor: '#0d0505' },
  benefitBadIcon: { color: '#5a1a1a', fontSize: 16, fontFamily: F, fontWeight: '700' },
  benefitGoodIcon: { color: '#ff0a0a', fontSize: 16, fontFamily: F, fontWeight: '700' },
  benefitLabel: { color: '#ff3040', fontSize: 7, fontFamily: F, fontWeight: '700', marginTop: 4, textAlign: 'center', letterSpacing: 1 },
  benefitDesc: { color: '#662222', fontSize: 7, fontFamily: F, textAlign: 'center', marginTop: 2, lineHeight: 10 },

  // Quote
  quoteBox: { borderLeftWidth: 2, borderLeftColor: '#ff0a0a', paddingLeft: 12, paddingVertical: 8, backgroundColor: '#0a0505' },
  quoteText: { color: '#ff3040', fontSize: 10, fontFamily: F, fontStyle: 'italic', lineHeight: 16 },
  quoteAuthor: { color: '#993333', fontSize: 9, fontFamily: F, marginTop: 8 },

  // Phi box
  phiBox: { borderWidth: 1, borderColor: '#ff0a0a', padding: 12, backgroundColor: '#150505' },
  phiText: { color: '#ff3040', fontSize: 10, fontFamily: F, marginVertical: 2 },

  // Best practices
  practiceItem: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a0808', alignItems: 'flex-start', gap: 8 },
  practiceIcon: { color: '#ff0a0a', fontSize: 10, fontFamily: F, fontWeight: '700', marginTop: 1 },
  practiceTextWrap: { flex: 1 },
  practiceTitle: { color: '#ff3040', fontSize: 10, fontFamily: F, fontWeight: '700' },
  practiceDesc: { color: '#662222', fontSize: 9, fontFamily: F, marginTop: 2, lineHeight: 13 },

  // Connect
  connectGrid: { gap: 8 },
  connectBtn: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connectLabel: { color: '#ff3040', fontSize: 10, fontFamily: F, fontWeight: '700' },
  connectSub: { color: '#5a1a1a', fontSize: 9, fontFamily: F },

  // Disclaimer
  disclaimerBox: { borderWidth: 1, borderColor: '#ff3040', padding: 12, backgroundColor: '#150505' },
  disclaimerText: { color: '#662222', fontSize: 8, fontFamily: F, lineHeight: 13, marginBottom: 8 },

  // Privacy Policy
  policyDate: { color: '#5a1a1a', fontSize: 8, fontFamily: F, marginBottom: 10, fontStyle: 'italic' },
  policyHeading: { color: '#993333', fontSize: 9, fontFamily: F, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 1 },
  policyBullet: { color: '#662222', fontSize: 8, fontFamily: F, lineHeight: 13, marginBottom: 4, paddingLeft: 8 },
  policyContact: { color: '#993333', fontSize: 8, fontFamily: F, lineHeight: 14 },
  // Accessibility statement (compressed/expandable)
  a11yToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  a11yChevron: { color: '#ff0a0a', fontSize: 10, fontFamily: F, marginBottom: 8 },
});
