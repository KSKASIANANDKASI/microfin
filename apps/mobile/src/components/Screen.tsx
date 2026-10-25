import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { refreshPortfolio } from '../lib/data';
import { usePortfolio } from '../lib/usePortfolio';
import { colors, fontFamily, space, textStyle } from '../theme';

/**
 * Scrollable body shared by the three tabs: page head, then stacked cards.
 * Pull down to re-read the portfolio from the API; any change re-renders the screen.
 */
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
  usePortfolio();
  const [refreshing, setRefreshing] = useState(false);

  function onRefresh() {
    setRefreshing(true);
    refreshPortfolio()
      .catch(() => {
        // keep what is on screen; the next pull tries again
      })
      .finally(() => setRefreshing(false));
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
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
