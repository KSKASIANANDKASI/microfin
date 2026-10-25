import { Image, StyleSheet, Text, View } from 'react-native';
import { fontFamily, palette, space } from '../theme';

const MARK = require('../../assets/mark.png');

type Tone = 'light' | 'dark';

/**
 * The Finance Easy "F" tile. It carries its own navy ground; on dark (brand
 * navy) grounds a faint white ring keeps its edge from melting into the page.
 */
export function LogoMark({ size = 48, tone = 'dark' }: { size?: number; tone?: Tone }) {
  return (
    <Image
      source={MARK}
      style={[{ width: size, height: size, borderRadius: size * 0.14 }, tone === 'light' && styles.ring]}
      resizeMode="contain"
    />
  );
}

/** Mark + the Finance Easy wordmark: navy and gold on light grounds, white and gold on dark. */
export function Logo({ tone = 'dark', size = 44 }: { tone?: Tone; size?: number }) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={size} tone={tone} />

      <Text style={[styles.word, { fontSize: size * 0.44, color: tone === 'dark' ? palette.navy800 : palette.white }]}>
        Finance <Text style={{ color: palette.gold500 }}>Easy</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)' },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  word: { fontFamily: fontFamily.displayExtra, letterSpacing: -0.2 },
});
