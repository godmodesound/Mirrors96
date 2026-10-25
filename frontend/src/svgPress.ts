import { Platform } from 'react-native';

/** Tap handler for react-native-svg elements. On web, onPress makes svg forward RN responder props to the DOM
 *  (React "Unknown event handler property" errors), so use a plain DOM click there instead.
 *  `onPress: null` is required: react-native-svg/web `prepare()` does `if (onPress !== null) clean.onClick = onPress`,
 *  so an undefined onPress would wipe our onClick. */
export const svgPress = (fn: () => void): { onPress?: () => void } =>
  (Platform.OS === 'web' ? ({ onClick: fn, onPress: null } as unknown as { onPress?: () => void }) : { onPress: fn });
