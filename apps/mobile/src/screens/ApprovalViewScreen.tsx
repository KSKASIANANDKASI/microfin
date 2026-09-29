import { useState, type ReactNode } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  approvalBlocker,
  approveApplication,
  customerById,
  disburseApplication,
  formatCurrency,
  idTypeLabel,
  lineById,
  loanById,
  loansForCustomer,
  maskIdNumber,
  officerLabel,
  rejectApplication,
  summarizeLoan,
  type LoanApplication,
} from '../lib/data';
import { addMonths, computeLoan, formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';
import { ApplicationStatusPill } from './ApprovalsScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'ApprovalView'>;
type Navigation = Props['navigation'];

/** Stand-in for the API round trip, so the buttons show their busy state. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600));

export function ApprovalViewScreen({ navigation, route }: Props) {
  const { applicationId } = route.params;
  // Subscribing keeps the screen in step as the application moves through its states.
  const application = useApplications().find((a) => a.id === applicationId);

  if (!application) {
    return (
      <Screen subtitle={t('approvals.view.notFound', { id: applicationId })}>
        <View />
      </Screen>
    );
  }

  const customer = customerById(application.customerId);
  const line = lineById(application.lineId);
  const name = customer?.name ?? application.customerId;
  const terms = computeLoan(application);
  const lastDue = addMonths(application.disburseOn, application.months);
  const existing = loansForCustomer(application.customerId).map(summarizeLoan);
  const active = existing.filter((s) => s.state !== 'closed').length;
  const overdue = existing.filter((s) => s.state === 'overdue').length;

  return (
    <Screen
      title={name}
      subtitle={t('approvals.view.submittedBy', {
        officer: officerLabel(application.submittedBy),
        date: formatDate(application.submittedOn),
      })}
    >
      <View style={styles.statusRow}>
        <ApplicationStatusPill status={application.status} />
      </View>

      <Card title={t('approvals.view.borrower')}>
        <View style={styles.facts}>
          <Fact label={t('approvals.view.phone')}>
            {customer ? (
              <Pressable
                onPress={() => navigation.navigate('CustomerView', { customerId: customer.id })}
                accessibilityRole="link"
              >
                <Text style={[styles.factValue, styles.link]}>{customer.phone}</Text>
              </Pressable>
            ) : (
              <Text style={styles.factValue}>—</Text>
            )}
          </Fact>
          <Fact label={t('approvals.view.line')}>
            <Text style={styles.factValue}>{line?.name ?? '—'}</Text>
            {line ? <Text style={styles.factNote}>{officerLabel(line.officer)}</Text> : null}
          </Fact>
          <Fact label={t('approvals.view.identityProof')}>
            {customer?.proof ? (
              <>
                <Text style={styles.factValue}>{idTypeLabel(customer.proof.type)}</Text>
                <Text style={styles.factNote}>{maskIdNumber(customer.proof.number)}</Text>
              </>
            ) : (
              <Text style={styles.factMuted}>{t('approvals.view.noProof')}</Text>
            )}
          </Fact>
          <Fact label={t('approvals.view.requested')}>
            <Text style={styles.factValue}>{customer ? formatCurrency(customer.requestedAmount) : '—'}</Text>
          </Fact>
          <Fact label={t('approvals.view.existingLoans')}>
            <Text style={styles.factValue}>
              {active ? tp('approvals.view.loansSummary', active) : t('approvals.view.noLoans')}
            </Text>
            {overdue ? <Text style={styles.factBad}>{tp('approvals.view.overdueLoans', overdue)}</Text> : null}
          </Fact>
        </View>
      </Card>

      {terms ? (
        <Card title={t('approvals.view.terms')}>
          <View style={styles.summary}>
            <Row label={t('loans.fields.loanType')} value={loanTypeLabel(application.type)} />
            <Row label={t('loans.fields.principal')} value={formatCurrency(application.principal)} />
            <Row
              label={t('loans.fields.rate')}
              value={t('loans.summary.ratePerYear', { rate: application.annualRatePct })}
            />
            <Row label={t('loans.fields.tenure')} value={tp('loans.summary.months', application.months)} />
            <Row
              label={application.type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}
              value={formatCurrency(terms.totalInterest)}
            />
            <Row
              label={t('loans.fields.fee')}
              value={application.fee ? `− ${formatCurrency(application.fee)}` : '—'}
            />
            <Row label={t('loans.fields.emi')} value={formatCurrency(application.emi)} />
            <Row label={t('approvals.view.plannedDisbursal')} value={formatDate(application.disburseOn)} />
            <Row label={t('approvals.view.closes')} value={lastDue ? formatDate(lastDue) : '—'} />
            <Row label={t('loans.summary.netDisbursal')} value={formatCurrency(terms.netDisbursal)} total />
            <Row label={t('loans.summary.totalPayable')} value={formatCurrency(terms.totalPayable)} total />
          </View>
        </Card>
      ) : null}

      {application.status === 'pending' ? (
        <Decision application={application} name={name} overdue={overdue > 0} navigation={navigation} />
      ) : (
        <Outcome application={application} netDisbursal={terms?.netDisbursal ?? 0} navigation={navigation} />
      )}
    </Screen>
  );
}

function Decision({
  application,
  name,
  overdue,
  navigation,
}: {
  application: LoanApplication;
  name: string;
  overdue: boolean;
  navigation: Navigation;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<'approve' | 'reject'>();
  const blocked = approvalBlocker(application) === 'noProof';

  async function decide(action: 'approve' | 'reject') {
    if (action === 'reject' && !note.trim()) {
      setError(t('approvals.view.reasonRequired'));
      return;
    }
    setError(undefined);
    setBusy(action);
    // UI-only for now: PATCH /loans/:id { status } goes here.
    await settle();
    if (action === 'approve') approveApplication(application.id, note.trim());
    else rejectApplication(application.id, note.trim());
  }

  return (
    <Card title={t('approvals.view.decision')} subtitle={t('approvals.view.decisionSub')}>
      <View style={styles.stack}>
        {blocked ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t('approvals.view.blockedNoProof', { name })}</Text>
            <Pressable
              onPress={() => navigation.navigate('CustomerProof', { customerId: application.customerId })}
              accessibilityRole="button"
            >
              <Text style={styles.noticeLink}>{t('approvals.view.captureProof')}</Text>
            </Pressable>
          </View>
        ) : null}
        {overdue ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t('approvals.view.overdueWarning', { name })}</Text>
          </View>
        ) : null}

        <TextField
          label={t('approvals.view.note')}
          placeholder={t('approvals.view.notePlaceholder')}
          multiline
          numberOfLines={3}
          value={note}
          error={error}
          onChangeText={(next) => {
            setNote(next);
            if (error) setError(undefined);
          }}
        />

        <View style={styles.actions}>
          <Button
            label={t('approvals.view.approve')}
            loading={busy === 'approve'}
            disabled={!!busy || blocked}
            onPress={() => decide('approve')}
          />
          <Button
            label={t('approvals.view.reject')}
            variant="ghost"
            loading={busy === 'reject'}
            disabled={!!busy}
            onPress={() => decide('reject')}
          />
        </View>
      </View>
    </Card>
  );
}

function Outcome({
  application,
  netDisbursal,
  navigation,
}: {
  application: LoanApplication;
  netDisbursal: number;
  navigation: Navigation;
}) {
  const [busy, setBusy] = useState(false);
  const decidedOn = application.decidedOn ? formatDate(application.decidedOn) : '—';
  const loan = application.loanId ? loanById(application.loanId) : undefined;
  const firstDue = loan ? addMonths(loan.disbursedOn, 1) : undefined;

  async function disburse() {
    setBusy(true);
    // UI-only for now: POST /loans/:id/disburse goes here.
    await settle();
    disburseApplication(application.id);
  }

  return (
    <>
      <Card
        title={t('approvals.view.decision')}
        subtitle={
          application.status === 'rejected'
            ? t('approvals.view.rejectedOn', { date: decidedOn })
            : t('approvals.view.approvedOn', { date: decidedOn })
        }
      >
        <Text style={styles.noteText}>{application.note || '—'}</Text>
      </Card>

      {application.status === 'approved' ? (
        <Card title={t('approvals.view.disbursement')} subtitle={t('approvals.view.disbursementSub')}>
          <Button
            label={t('approvals.view.disburse', { amount: formatCurrency(netDisbursal) })}
            loading={busy}
            onPress={disburse}
          />
        </Card>
      ) : null}

      {application.status === 'disbursed' && loan ? (
        <Card title={t('approvals.view.disbursement')}>
          <View style={styles.stack}>
            <View style={[styles.notice, styles.noticeGood]}>
              <Text style={[styles.noticeText, styles.noticeTextGood]}>
                {t('approvals.view.disbursedAs', { loan: loan.id, date: firstDue ? formatDate(firstDue) : '—' })}
              </Text>
            </View>
            <Button
              label={t('approvals.view.openLoan')}
              variant="ghost"
              onPress={() => navigation.navigate('LoanView', { loanId: loan.id })}
            />
          </View>
        </Card>
      ) : null}
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.summaryRow, total && styles.summaryRowTotal]}>
      <Text style={[styles.summaryLabel, total && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, total && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[4] },
  actions: { gap: space[3] },
  statusRow: { flexDirection: 'row' },
  facts: { gap: space[4] },
  fact: { gap: 2 },
  factLabel: { ...textStyle('caption'), color: colors.textFaint },
  factValue: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  factNote: { ...textStyle('caption'), color: colors.textFaint },
  factMuted: { ...textStyle('bodySm'), color: colors.textFaint },
  factBad: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.danger },
  link: { color: colors.brand },
  summary: {
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[2],
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space[2],
    paddingTop: space[3],
  },
  summaryLabel: { ...textStyle('bodySm'), color: colors.textMuted, flex: 1 },
  summaryValue: { ...textStyle('bodySm'), color: colors.text, textAlign: 'right' },
  summaryStrong: { fontFamily: fontFamily.bodySemibold, color: colors.text },
  notice: {
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: palette.gold050,
  },
  noticeText: { ...textStyle('caption'), color: palette.gold700 },
  noticeLink: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  noticeGood: { backgroundColor: palette.successBg },
  noticeTextGood: { color: colors.success },
  noteText: { ...textStyle('bodySm'), color: colors.text },
});
