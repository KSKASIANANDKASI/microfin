import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts, palette, radius, shadow, sizing, space, type } from '@lms/theme';

export { colors, palette, radius, sizing, space, type };

/** Font family names as registered with expo-font in App.tsx. */
export const fontFamily = {
  display: 'Poppins_700Bold',
  displayExtra: 'Poppins_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const fontStacks = fonts;

/** Turns a token entry into an RN text style. */
export function textStyle(token: keyof typeof type, family: string = fontFamily.body): TextStyle {
  const t = type[token];
  return {
    fontFamily: family,
    fontSize: t.size,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
  };
}

/** Cross-platform elevation from the shared shadow tokens. */
export function elevation(token: keyof typeof shadow): ViewStyle {
  const { android, ios } = shadow[token];
  return Platform.OS === 'android' ? { ...android } : { ...ios };
}

export const hairline = StyleSheet.hairlineWidth;
