import { Image, StyleSheet, Text, View } from 'react-native';
import { fontFamily, palette, radius, space } from '../theme';

const MARK = require('../../assets/mark.png');
const WORDMARK = require('../../assets/wordmark.png');

type Tone = 'light' | 'dark';

/**
 * The BillionBrains "B" mark, lifted from the corporate logo. On dark grounds
 * it sits on the cream tile it was drawn against, so the navy stays legible.
 */
export function LogoMark({ size = 48, tone = 'dark' }: { size?: number; tone?: Tone }) {
  const img = <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />;

  if (tone === 'dark') return img;

  return <View style={[styles.tile, { padding: size * 0.14 }]}>{img}</View>;
}

/** Mark + wordmark lockup. */
export function Logo({ tone = 'dark', size = 44 }: { tone?: Tone; size?: number }) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={size} tone={tone} />

      {tone === 'dark' ? (
        <Image
          source={WORDMARK}
          style={{ height: size * 0.72, width: size * 0.72 * (1310 / 220) }}
          resizeMode="contain"
          accessibilityLabel="BillionBrains Tech Ltd"
        />
      ) : (
        <View>
          <Text style={[styles.word, { fontSize: size * 0.4, color: palette.white }]}>
            BILLION<Text style={{ color: palette.gold500 }}>BRAINS</Text>
          </Text>
          <Text style={[styles.tag, { fontSize: size * 0.2 }]}>TECH LTD</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: palette.paper, borderRadius: radius.lg },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  word: { fontFamily: fontFamily.displayExtra, letterSpacing: -0.2 },
  tag: {
    fontFamily: fontFamily.display,
    color: palette.navy200,
    letterSpacing: 3,
    marginTop: space[1],
    paddingTop: space[1],
    borderTopWidth: 1,
    borderTopColor: palette.navy400,
    alignSelf: 'flex-start',
  },
});
