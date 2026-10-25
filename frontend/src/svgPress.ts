import { Platform } from 'react-native';

/** Tap handler for react-native-svg elements. On web, onPress makes svg forward RN responder props to the DOM
 *  (React "Unknown event handler property" errors), so use a plain DOM click there instead. */
export const svgPress = (fn: () => void): { onPress?: () => void } =>
  (Platform.OS === 'web' ? ({ onClick: fn } as { onPress?: () => void }) : { onPress: fn });
