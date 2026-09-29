import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { t, tp } from '@lms/i18n';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { InstallmentRow } from '../components/rows';
import { SearchIcon } from '../components/icons';
import { formatCurrency, lineById, lines, loanById } from '../lib/data';
import { useCollectionSheet } from '../lib/useCollectionSheet';
import { colors, fontFamily, radius, sizing, space, textStyle } from '../theme';

const FILTERS = ['all', 'due', 'overdue', 'collected'] as const;

type Filter = (typeof FILTERS)[number];

function filterLabel(id: Filter): string {
  if (id === 'all') return t('collection.filterAll');
  if (id === 'due') return t('common.status.dueToday');
  if (id === 'overdue') return t('common.status.overdue');
  return t('common.status.collected');
}

export function CollectionScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [lineId, setLineId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const navigation = useNavigation<any>();
  const sheet = useCollectionSheet();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sheet.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (lineId !== 'all' && item.lineId !== lineId) return false;
      if (!needle) return true;
      const line = lineById(item.lineId)?.name ?? '';
      return (
        item.customer.toLowerCase().includes(needle) ||
        item.loanNo.toLowerCase().includes(needle) ||
        line.toLowerCase().includes(needle)
      );
    });
  }, [sheet, filter, lineId, query]);

  const selectedLine = lineId === 'all' ? undefined : lineById(lineId);

  const outstanding = rows
    .filter((r) => r.status !== 'collected')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <Screen
      title={t('common.nav.collection')}
      subtitle={tp('collection.summary', rows.length, {
        scope: selectedLine ? selectedLine.name : t('collection.allLines'),
        amount: formatCurrency(outstanding),
      })}
    >
      <View style={styles.search}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder={t('collection.searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('collection.searchLabel')}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: 'all', name: t('collection.allLines') }, ...lines].map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setLineId(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: lineId === option.id }}
            style={[styles.chip, lineId === option.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, lineId === option.id && styles.chipTextOn]}>
              {option.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setFilter(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === option }}
            style={[styles.chip, filter === option && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === option && styles.chipTextOn]}>
              {filterLabel(option)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card padded={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{t('collection.empty')}</Text>
        ) : (
          rows.map((item) => (
            <InstallmentRow
              key={item.id}
              customer={item.customer}
              meta={t('collection.rowMeta', {
                loanNo: item.loanNo,
                line: lineById(item.lineId)?.name ?? '',
                date: item.dueOn,
              })}
              amount={item.amount}
              status={item.status}
              daysLate={item.daysLate}
              onPress={
                loanById(item.loanNo)
                  ? () => navigation.navigate('LoanView', { loanId: item.loanNo })
                  : undefined
              }
              accessibilityHint={t('collection.opensLoan')}
              action={
                <Pressable
                  disabled={item.status === 'collected'}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CollectPayment', { installmentId: item.id })}
                  style={[styles.action, item.status === 'collected' && styles.actionDone]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      item.status === 'collected' && styles.actionTextDone,
                    ]}
                  >
                    {item.status === 'collected' ? t('collection.receipted') : t('collection.collect')}
                  </Text>
                </Pressable>
              }
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingLeft: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: space[3],
    ...textStyle('bodySm'),
    color: colors.text,
  },
  chips: { gap: space[2], paddingRight: space[4] },
  chip: {
    height: 36,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textMuted },
  chipTextOn: { color: colors.textOnBrand },
  action: {
    height: sizing.buttonHeightSm,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  actionDone: { backgroundColor: colors.bg, borderColor: colors.border },
  actionText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textOnBrand },
  actionTextDone: { color: colors.textFaint },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center', padding: space[9] },
});
