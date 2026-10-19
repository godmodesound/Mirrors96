import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { skinStyles, SK } from './skins';


interface FrequencyLayer {
  id: number;
  frequency: number;
  gain: number;
  isPlaying: boolean;
}

interface SendCodesModalProps {
  visible: boolean;
  onClose: () => void;
  layers: FrequencyLayer[];
  loadedArchiveName?: string | null;
}

export default function SendCodesModal({ visible, onClose, layers, loadedArchiveName }: SendCodesModalProps) {
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const activeFrequencies = layers.filter(l => l.frequency > 0).map(l => l.frequency);
  const freqString = activeFrequencies.join(' · ');
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '.');

  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    
    setIsSharing(true);
    try {
      // Capture the LCD card as an image
      const uri = await viewShotRef.current.capture();
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share with the native share sheet
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Send CODES',
          UTI: 'public.png',
        });
      } else {
        // Fallback for web or unsupported platforms
        console.log('Sharing not available on this platform');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 20 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SEND CODES</Text>
            <Text style={styles.headerSub}>Share your frequency configuration</Text>
          </View>

          {/* LCD Card Preview - This gets captured */}
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.lcdOuter}>
              <View style={styles.lcdInner}>
                {/* MIRRORS ASCII Art */}
                <View style={styles.lcdAsciiRow}>
                  <Text style={styles.lcdAscii}>M̲I̲R̲R̲O̲R̲S̲</Text>
                </View>

                {/* Identification Program */}
                <View style={styles.lcdIdSection}>
                  <Text style={styles.lcdIdTitle}>IDENTIFICATION</Text>
                  <Text style={styles.lcdIdSub}>PROGRAM</Text>
                </View>

                {/* Frequencies Display */}
                <View style={styles.lcdFreqSection}>
                  <Text style={styles.lcdFreqLabel}>ACTIVE CODES</Text>
                  <Text style={styles.lcdFreqValue} numberOfLines={2} adjustsFontSizeToFit>
                    {freqString || '432'} Hz
                  </Text>
                  {loadedArchiveName && (
                    <Text style={styles.lcdPresetName}>{loadedArchiveName}</Text>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.lcdFooter}>
                  <Text style={styles.lcdFooterText}>
                    godmodesound.com // MIRRORS 96 ▊
                  </Text>
                  <Text style={styles.lcdTimestamp}>{timestamp}</Text>
                </View>
              </View>
            </View>
          </ViewShot>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareBtn, isSharing && styles.shareBtnDisabled]} 
              onPress={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color={SK('#000')} size="small" />
              ) : (
                <Text style={styles.shareBtnText}>▶ TRANSMIT</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info text */}
          <Text style={styles.infoText}>
            Share via Messages, AirDrop, or any app
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = skinStyles({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    maxWidth: 400,
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'TerminatorRealNFI',
  },
  headerSub: {
    color: '#5a1a1a',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  
  // LCD Screen Styles
  lcdOuter: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 4,
  },
  lcdInner: {
    backgroundColor: '#a89f4c', // Olive/gold LCD color
    padding: 20,
    borderRadius: 2,
    minHeight: 220,
  },
  lcdAsciiRow: {
    marginBottom: 8,
  },
  lcdAscii: {
    color: '#2a2a6a', // Dark blue LCD text
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    textDecorationLine: 'underline',
  },
  lcdIdSection: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  lcdIdTitle: {
    color: '#2a2a6a',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  lcdIdSub: {
    color: '#2a2a6a',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginTop: 8,
  },
  lcdFreqSection: {
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a6a20',
  },
  lcdFreqLabel: {
    color: '#2a2a6a',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    marginBottom: 6,
  },
  lcdFreqValue: {
    color: '#2a2a6a',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  lcdPresetName: {
    color: '#2a2a6a',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 6,
    opacity: 0.8,
  },
  lcdFooter: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lcdFooterText: {
    color: '#2a2a6a',
    fontSize: 9,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  lcdTimestamp: {
    color: '#2a2a6a',
    fontSize: 8,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    opacity: 0.7,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#3a1010',
    backgroundColor: '#050202',
    minHeight: 48,
  },
  cancelBtnText: {
    color: '#5a1a1a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  shareBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#ff0a0a',
    minHeight: 48,
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  infoText: {
    color: '#3a1010',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});
