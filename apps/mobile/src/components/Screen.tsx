import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, space, textStyle } from '../theme';

/** Scrollable body shared by the three tabs: page head, then stacked cards. */
export function Screen({
  title,
  subtitle,
  children,
}: {
  /** Omit on screens pushed above the tabs — the native header carries it. */
  title?: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={[styles.subtitle, !title && styles.subtitleLead]}>{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[4], paddingBottom: space[9], gap: space[5] },
  title: { ...textStyle('h2', fontFamily.display), color: colors.text },
  subtitle: { ...textStyle('bodySm'), color: colors.textMuted, marginTop: space[1] },
  subtitleLead: { marginTop: 0 },
});
