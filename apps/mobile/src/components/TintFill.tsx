import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * A soft diagonal wash that fills its parent — the "full light colour" behind
 * hero cards and tinted KPI tiles. Put it first inside a tile with
 * `overflow: 'hidden'` so it clips to the rounded corners.
 */
export function TintFill({ from, to, via }: { from: string; to: string; via?: string }) {
  const stops: [string, string][] = via ? [['0', from], ['0.5', via], ['1', to]] : [['0', from], ['1', to]];
  // Gradient ids are document-global on web, so each colourway needs its own.
  const id = `tint-${[from, via, to].filter(Boolean).join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" accessibilityElementsHidden importantForAccessibility="no">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {stops.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
