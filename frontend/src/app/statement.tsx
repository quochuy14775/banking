import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/shared/components/primary-button';
import TransactionDetailSheet from '@/features/history/components/transaction-detail-sheet';
import TransactionRow from '@/features/history/components/transaction-row';
import { HistoryIcons, TransferIcons } from '@/constants/icons';
import { MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatFullDate, formatSignedVND, formatVND, maskAccountNumber, monthPeriod } from '@/helpers';
import { useAccounts } from '@/shared/hooks/use-accounts';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import { buildStatementHtml, exportStatementPdf } from '@/features/statement/statementPdf';
import type { AccountStatement, Transaction } from '@/models';
import { getStatement } from '@/services/transaction.service';

// Tháng này và 3 tháng trước (dữ liệu mẫu có khoảng 100 ngày).
const MONTH_OFFSETS = [0, 1, 2, 3];

type Styles = ReturnType<typeof createStyles>;

/**
 * Sao kê tài khoản theo tháng: số dư đầu kỳ, tổng tiền vào/ra, số dư cuối kỳ và từng giao dịch kèm số dư sau giao dịch.
 * Mở từ màn Lịch sử giao dịch (`from=history`, kèm `accountId`) hoặc ô tìm kiếm ở trang chủ.
 */
export default function StatementScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { user } = useAuth();
  const accounts = useAccounts();
  const params = useLocalSearchParams<{ accountId?: string; from?: string }>();

  const [appliedAccountParam, setAppliedAccountParam] = useState<string | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [result, setResult] = useState<{ key: string; statement?: AccountStatement; error: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  // Mở từ Lịch sử giao dịch thì chọn sẵn tài khoản đang xem ở đó.
  if (params.accountId && params.accountId !== appliedAccountParam) {
    setAppliedAccountParam(params.accountId);
    setAccountId(params.accountId);
  }

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const fetchAccountId = account?.id;
  const { from, to } = monthPeriod(monthOffset);
  const requestKey = `${fetchAccountId}|${from}|${to}`;
  const current = result?.key === requestKey ? result : null;
  const statement = current?.statement;
  const exitTo = params.from === 'history' ? '/history' : '/';

  useFocusEffect(
    useCallback(() => {
      if (!user || !fetchAccountId) return;
      let active = true;
      const key = `${fetchAccountId}|${from}|${to}`;
      getStatement({ userId: user.id, accountId: fetchAccountId, from, to }).then((res) => {
        if (active) {
          setResult({ key, statement: res.statement, error: res.success ? '' : (res.message ?? t('statement.error')) });
        }
      });
      return () => {
        active = false;
      };
    }, [user, fetchAccountId, from, to, t]),
  );

  const handleExport = async () => {
    if (!statement) return;
    setExportError('');
    setExporting(true);
    const outcome = await exportStatementPdf(
      buildStatementHtml(statement, t),
      `${t('statement.title')} ${statement.accountNumber}`,
    );
    setExporting(false);
    if (outcome === 'blocked') setExportError(t('statement.popupBlocked'));
    else if (outcome === 'failed') setExportError(t('statement.exportFailed'));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.navigate(exitTo)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('transfer.back')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('statement.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {accounts.map((acc) => {
            const active = acc.id === account?.id;
            return (
              <Pressable
                key={acc.id}
                onPress={() => setAccountId(acc.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.accountChip, active && styles.accountChipActive]}>
                <Text style={[styles.accountLabel, active && styles.accountLabelActive]}>{acc.label}</Text>
                <Text style={styles.accountNumber}>{maskAccountNumber(acc.number)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MONTH_OFFSETS.map((offset) => {
            const month = monthPeriod(offset);
            const active = offset === monthOffset;
            return (
              <Pressable
                key={offset}
                onPress={() => setMonthOffset(offset)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t('statement.month', { month: month.month, year: month.year })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!current ? (
          <ActivityIndicator color={theme.primary} style={styles.loading} />
        ) : !statement ? (
          <Text style={styles.emptyText}>{current.error || t('statement.error')}</Text>
        ) : (
          <View style={styles.body}>
            <LinearGradient
              colors={[theme.hero, theme.heroElement]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}>
              <Text style={styles.heroLabel}>
                {t('statement.period')} · {formatFullDate(statement.from)} – {formatFullDate(statement.to)}
              </Text>
              <Text style={styles.heroCaption}>{t('statement.closing')}</Text>
              <Text style={styles.heroAmount}>{formatVND(statement.closingBalance)}</Text>
              <View style={styles.stats}>
                <Stat label={t('statement.opening')} value={formatVND(statement.openingBalance)} styles={styles} />
                <Stat
                  label={t('statement.totalIn')}
                  value={formatSignedVND(statement.totalIn, 'in')}
                  note={t('statement.count', { count: statement.countIn })}
                  positive
                  styles={styles}
                />
                <Stat
                  label={t('statement.totalOut')}
                  value={formatSignedVND(statement.totalOut, 'out')}
                  note={t('statement.count', { count: statement.countOut })}
                  styles={styles}
                />
              </View>
            </LinearGradient>

            <PrimaryButton label={t('statement.export')} onPress={handleExport} loading={exporting} />
            {exportError !== '' && (
              <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                {exportError}
              </Text>
            )}

            <View style={styles.sectionHeader}>
              <SymbolView name={HistoryIcons.statement} size={IconSize.md} tintColor={theme.textSecondary} />
              <Text style={styles.section}>
                {t('statement.transactions')} · {t('statement.count', { count: statement.items.length })}
              </Text>
            </View>
            {statement.items.length === 0 ? (
              <Text style={styles.emptyText}>{t('statement.empty')}</Text>
            ) : (
              <View style={styles.card}>
                {statement.items.map((tx, index) => (
                  <View key={tx.id} style={index > 0 && styles.divider}>
                    <TransactionRow tx={tx} variant="statement" onPress={() => setSelected(tx)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <TransactionDetailSheet transaction={selected} account={account} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  note,
  positive,
  styles,
}: {
  label: string;
  value: string;
  note?: string;
  positive?: boolean;
  styles: Styles;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, positive && styles.statPositive]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note && <Text style={styles.statNote}>{note}</Text>}
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      minHeight: 44,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.7 },
    title: { ...Typography.title, color: theme.text },
    content: { paddingTop: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
    chips: { gap: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center' },
    accountChip: {
      minWidth: 160,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      gap: 2,
    },
    accountChipActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    accountLabel: { ...Typography.callout, color: theme.textSecondary, fontWeight: '600' },
    accountLabelActive: { color: theme.onPrimarySoft },
    accountNumber: { ...Typography.caption, color: theme.textMuted, ...MoneyText },
    chip: {
      paddingHorizontal: Spacing.three,
      paddingVertical: 7,
      borderRadius: Radius.pill,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { ...Typography.callout, color: theme.textSecondary, fontWeight: '600' },
    chipTextActive: { color: theme.onPrimary },
    loading: { marginTop: Spacing.five },
    body: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
    hero: { borderRadius: Radius.xxl, padding: 20, gap: Spacing.one, boxShadow: theme.cardShadow },
    heroLabel: { ...Typography.caption, color: theme.onHeroMuted },
    heroCaption: { ...Typography.callout, color: theme.onHeroMuted, marginTop: Spacing.two },
    heroAmount: { ...Typography.display, color: theme.onHero, ...MoneyText },
    stats: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
    stat: { flex: 1, gap: 2 },
    statLabel: { ...Typography.micro, color: theme.onHeroMuted },
    statValue: { ...Typography.callout, color: theme.onHero, fontWeight: '700', ...MoneyText },
    statPositive: { color: theme.onHeroSuccess },
    statNote: { ...Typography.micro, color: theme.onHeroMuted, fontWeight: '400' },
    error: { ...Typography.callout, color: theme.danger, fontWeight: '500', textAlign: 'center' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
    section: { ...Typography.bodyStrong, color: theme.textSecondary },
    card: { paddingHorizontal: Spacing.three, borderRadius: Radius.xl, backgroundColor: theme.backgroundElement },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    emptyText: { ...Typography.callout, color: theme.textMuted, textAlign: 'center', paddingVertical: Spacing.four },
  });
}
