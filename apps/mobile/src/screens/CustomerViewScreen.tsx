import type { ReactNode } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t, tp } from '@lms/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { Avatar, LoanStatePill } from '../components/rows';
import { IdIcon, PinIcon, PlusIcon } from '../components/icons';
import {
  customerById,
  formatCurrency,
  idTypeLabel,
  lineById,
  loansForCustomer,
  maskIdNumber,
  officerLabel,
  summarizeLoan,
  type Loan,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { CUSTOMER_STATUS } from './CustomersScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerView'>;

export function CustomerViewScreen({ navigation, route }: Props) {
  const customer = customerById(route.params.customerId);

  if (!customer) {
    return (
      <Screen subtitle={t('common.screens.customer')}>
        <Card>
          <Text style={styles.empty}>{t('customers.view.notFound')}</Text>
        </Card>
      </Screen>
    );
  }

  const line = lineById(customer.lineId);
  const status = CUSTOMER_STATUS[customer.status];
  const customerLoans = loansForCustomer(customer.id);
  const newLoan = () => navigation.navigate('NewLoan', { customerId: customer.id });

  return (
    <Screen subtitle={`${customer.phone} · ${line?.name ?? t('customers.view.noLine')}`}>
      <View style={styles.hero}>
        <Avatar name={customer.name} />
        <View style={styles.flex}>
          <Text style={styles.heroName}>{customer.name}</Text>
          <Text style={styles.meta}>{t('customers.list.careOf', { name: customer.parentName })}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{t(status.labelKey)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={newLoan}
          accessibilityRole="button"
        >
          <PlusIcon size={16} color={colors.textOnBrand} />
          <Text style={styles.btnText}>{t('customers.view.newLoan')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={() => navigation.navigate('CustomerProof', { customerId: customer.id })}
          accessibilityRole="button"
        >
          <IdIcon size={16} color={colors.brand} />
          <Text style={[styles.btnText, styles.btnTextGhost]}>
            {customer.proof ? t('customers.view.updateProof') : t('customers.list.addProof')}
          </Text>
        </Pressable>
      </View>

      <Card title={t('customers.view.profile')}>
        <View style={styles.facts}>
          <Fact
            label={t('customers.view.phone')}
            note={customer.altPhone ? t('customers.view.altPhone', { phone: customer.altPhone }) : undefined}
          >
            {customer.phone}
          </Fact>
          <Fact label={t('customers.view.parent')}>{customer.parentName}</Fact>
          <Fact label={t('customers.view.address')}>{customer.address}</Fact>
          <Fact
            label={t('customers.view.line')}
            note={line ? t('customers.view.officer', { name: officerLabel(line.officer) }) : undefined}
          >
            {line?.name ?? '—'}
          </Fact>
          <Fact label={t('customers.view.requestedAmount')}>{formatCurrency(customer.requestedAmount)}</Fact>
          <Fact
            label={t('customers.view.identityProof')}
            note={customer.proof ? maskIdNumber(customer.proof.number) : undefined}
            muted={!customer.proof}
          >
            {customer.proof ? idTypeLabel(customer.proof.type) : t('customers.view.notCaptured')}
          </Fact>
          <Fact
            label={t('customers.view.doorstepPin')}
            note={
              customer.geo
                ? customer.geo.accuracy
                  ? t('customers.view.accuracyAt', {
                      metres: customer.geo.accuracy,
                      time: customer.geo.capturedAt,
                    })
                  : customer.geo.capturedAt
                : undefined
            }
            muted={!customer.geo}
            icon={customer.geo ? <PinIcon size={14} color={palette.gold700} /> : undefined}
          >
            {customer.geo
              ? `${customer.geo.lat.toFixed(5)}, ${customer.geo.lng.toFixed(5)}`
              : t('customers.view.notPinned')}
          </Fact>
        </View>
      </Card>

      <Card
        title={t('customers.view.loans')}
        subtitle={
          customerLoans.length
            ? tp('customers.view.loansOnRecord', customerLoans.length)
            : t('customers.view.noLoans')
        }
        padded={false}
      >
        <View style={styles.listTop}>
          {customerLoans.length === 0 ? (
            <Text style={styles.empty}>{t('customers.view.nothingBookedMobile')}</Text>
          ) : (
            customerLoans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                onPress={() => navigation.navigate('LoanView', { loanId: loan.id })}
              />
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}

function Fact({
  label,
  note,
  muted,
  icon,
  children,
}: {
  label: string;
  note?: string;
  muted?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View>
      <Text style={styles.factLabel}>{label}</Text>
      <View style={styles.factValueRow}>
        {icon}
        <Text style={[styles.factValue, muted && styles.factMuted]}>{children}</Text>
      </View>
      {note ? <Text style={styles.meta}>{note}</Text> : null}
    </View>
  );
}

function LoanRow({ loan, onPress }: { loan: Loan; onPress: () => void }) {
  const summary = summarizeLoan(loan);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={t('customers.view.openLoanHint')}
    >
      <View style={styles.rowHead}>
        <Text style={styles.loanNo}>{loan.id}</Text>
        <Text style={styles.amount}>
          {summary.state === 'closed' ? '—' : formatCurrency(summary.outstanding)}
        </Text>
      </View>
      <Text style={styles.meta}>
        {t('customers.view.loanMetaShort', {
          type: loanTypeLabel(loan.type),
          principal: formatCurrency(loan.principal),
          rate: loan.annualRatePct,
          months: loan.months,
        })}
      </Text>
      <View style={styles.rowFoot}>
        <Text style={styles.meta}>{t('customers.view.disbursedOn', { date: formatDate(loan.disbursedOn) })}</Text>
        <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
  },
  heroName: { ...textStyle('h3', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  pill: { paddingVertical: 4, paddingHorizontal: space[3], borderRadius: radius.pill },
  pillText: { ...textStyle('caption', fontFamily.bodySemibold) },
  actions: { flexDirection: 'row', gap: space[3] },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: space[2],
    height: sizing.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { backgroundColor: colors.brandPressed },
  btnGhost: { backgroundColor: colors.bgElevated, borderColor: colors.border },
  btnGhostPressed: { backgroundColor: colors.bg },
  btnText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textOnBrand },
  btnTextGhost: { color: colors.brand },
  facts: { gap: space[4] },
  factLabel: { ...textStyle('caption'), color: colors.textFaint },
  factValueRow: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: 2 },
  factValue: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text, flexShrink: 1 },
  factMuted: { fontFamily: fontFamily.body, color: colors.textFaint },
  listTop: { marginTop: space[4], borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    gap: space[1],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bg },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    marginTop: space[1],
  },
  loanNo: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  amount: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  empty: { ...textStyle('bodySm'), color: colors.textFaint, textAlign: 'center', padding: space[7] },
});
