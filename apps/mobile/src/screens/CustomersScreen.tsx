import { useMemo, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t, tp, type MessageKey } from '@lms/i18n';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { Avatar } from '../components/rows';
import { IdIcon, PinIcon, SearchIcon } from '../components/icons';
import { customers, formatCurrency, idTypeLabel, lineById, lines, proofLabels } from '../lib/data';
import type { Customer } from '../lib/data';
import type { AppStackParamList, MainTabParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Customers'>,
  NativeStackScreenProps<AppStackParamList>
>;

/** `labelKey` is translated at render — `t()` must not run at import time. */
export const CUSTOMER_STATUS = {
  pending: { labelKey: 'common.status.pending', bg: palette.gold050, fg: palette.warning },
  approved: { labelKey: 'common.status.approved', bg: palette.successBg, fg: colors.success },
  active: { labelKey: 'common.status.active', bg: palette.successBg, fg: colors.success },
} as const satisfies Record<string, { labelKey: MessageKey; bg: string; fg: string }>;

export function CustomersScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [lineId, setLineId] = useState('all');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (lineId !== 'all' && customer.lineId !== lineId) return false;
      if (!needle) return true;
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.phone.includes(needle) ||
        customer.parentName.toLowerCase().includes(needle) ||
        customer.address.toLowerCase().includes(needle) ||
        customer.proofs.some((proof) => proof.number.toLowerCase().includes(needle))
      );
    });
  }, [lineId, query]);

  const requested = rows.reduce((sum, c) => sum + c.requestedAmount, 0);

  return (
    <Screen
      title={t('common.nav.customers')}
      subtitle={tp('customers.list.summary', rows.length, { amount: formatCurrency(requested) })}
    >
      <Pressable
        style={({ pressed }) => [styles.newBtn, pressed && styles.newBtnPressed]}
        onPress={() => navigation.navigate('NewCustomer')}
        accessibilityRole="button"
      >
        <Text style={styles.newBtnText}>{t('customers.list.newCustomer')}</Text>
      </Pressable>

      <View style={styles.search}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder={t('customers.list.searchPlaceholderShort')}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('customers.list.searchLabel')}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: 'all', name: t('customers.list.allLines') }, ...lines].map((option) => (
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

      <Card padded={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{t('customers.list.empty')}</Text>
        ) : (
          rows.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} navigation={navigation} />
          ))
        )}
      </Card>
    </Screen>
  );
}

function CustomerRow({
  customer,
  navigation,
}: {
  customer: Customer;
  navigation: Props['navigation'];
}) {
  const status = CUSTOMER_STATUS[customer.status];
  const first = customer.proofs[0];

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.head}
        onPress={() => navigation.navigate('CustomerView', { customerId: customer.id })}
        accessibilityRole="button"
        accessibilityHint={t('customers.list.openHint')}
      >
        <Avatar name={customer.name} />
        <View style={styles.flex}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.meta}>
            {customer.phone}
            {customer.altPhone ? ` · ${customer.altPhone}` : ''}
          </Text>
          <Text style={styles.meta}>{t('customers.list.careOf', { name: customer.parentName })}</Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(customer.requestedAmount)}</Text>
      </Pressable>

      <Text style={styles.address} numberOfLines={2}>
        {lineById(customer.lineId)?.name} · {customer.address}
      </Text>

      <View style={styles.foot}>
        <Pressable
          style={[styles.tag, styles.tagProof]}
          onPress={() => navigation.navigate('CustomerProof', { customerId: customer.id })}
          accessibilityRole="button"
          accessibilityLabel={
            first
              ? t('customers.list.proofOnFileFor', {
                  idType: proofLabels(customer.proofs),
                  name: customer.name,
                })
              : t('customers.list.addProofFor', { name: customer.name })
          }
        >
          <IdIcon size={13} color={first ? colors.brand : colors.textFaint} />
          <Text style={[styles.tagText, styles.tagTextProof, !first && styles.tagTextOff]}>
            {first
              ? `${idTypeLabel(first.type)}${customer.proofs.length > 1 ? ` +${customer.proofs.length - 1}` : ''}`
              : t('customers.list.addProof')}
          </Text>
        </Pressable>

        <View style={[styles.tag, !customer.geo && styles.tagOff]}>
          <PinIcon size={13} color={customer.geo ? palette.gold700 : colors.textFaint} />
          <Text style={[styles.tagText, !customer.geo && styles.tagTextOff]}>
            {customer.geo ? t('customers.list.pinned') : t('customers.list.noPin')}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{t(status.labelKey)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  newBtn: {
    height: sizing.buttonHeight,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnPressed: { backgroundColor: colors.brandPressed },
  newBtnText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textOnBrand },
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
  row: {
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[4] },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  amount: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  address: { ...textStyle('caption'), color: colors.textFaint, paddingLeft: 38 + space[4] },
  foot: { flexDirection: 'row', gap: space[2], paddingLeft: 38 + space[4] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: palette.gold050,
  },
  tagOff: { backgroundColor: colors.bg },
  tagProof: { backgroundColor: colors.bg },
  tagTextProof: { color: colors.brand },
  tagText: { ...textStyle('caption', fontFamily.bodySemibold), color: palette.gold700 },
  tagTextOff: { color: colors.textFaint },
  pill: { paddingVertical: 4, paddingHorizontal: space[3], borderRadius: radius.pill },
  pillText: { ...textStyle('caption', fontFamily.bodySemibold) },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center', padding: space[9] },
});
