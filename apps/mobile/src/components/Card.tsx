import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Set false for flush lists that draw their own row padding. */
  padded?: boolean;
  /** Set false to drop the brand navy→gold strip from the card's top edge. */
  accent?: boolean;
};

const ACCENT_HEIGHT = 4;

/** Left, middle (55%) and right colours of an accent strip. */
export type AccentStops = readonly [string, string, string];

const BRAND_STOPS: AccentStops = [palette.navy800, palette.navy600, palette.gold500];

/**
 * Brand strip: logo navy on the left easing into the logo gold on the right.
 * Pass `stops` for a differently coloured strip, e.g. per-KPI tiles.
 */
export function AccentBar({ stops = BRAND_STOPS }: { stops?: AccentStops }) {
  // Gradient ids are document-global on web, so each colourway needs its own.
  const id = `accent-${stops.join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <Svg width="100%" height={ACCENT_HEIGHT} accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={stops[0]} />
          <Stop offset="0.55" stopColor={stops[1]} />
          <Stop offset="1" stopColor={stops[2]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={ACCENT_HEIGHT} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Positions an {@link AccentBar} on a tile that keeps its own padding — KPI
 * tiles and page heroes, where the strip can't simply be stacked on top.
 */
export const accentOverlay: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0 };

export function Card({ title, subtitle, action, children, padded = true, accent = true }: Props) {
  return (
    <View style={styles.card}>
      {accent ? <AccentBar /> : null}
      {title ? (
        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      <View style={padded ? styles.body : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[4],
    padding: space[5],
    paddingBottom: 0,
  },
  title: { ...textStyle('h3', fontFamily.bodySemibold), color: colors.text },
  subtitle: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[1] },
  body: { padding: space[5] },
});
