import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TransactionDetailSheet from '@/features/history/components/transaction-detail-sheet';
import TransactionRow from '@/features/history/components/transaction-row';
import { CommonIcons, HistoryIcons, SearchIcons, TransferIcons } from '@/constants/icons';
import { MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatSignedVND, groupByDay, maskAccountNumber, recentDays, removeDiacritics } from '@/helpers';
import { useAccounts } from '@/shared/hooks/use-accounts';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import type { Transaction, TransactionType } from '@/models';
import { getTransactions } from '@/services/transaction.service';

const PERIOD_DAYS = { d7: 7, d30: 30, d90: 90 } as const;
type PeriodKey = keyof typeof PERIOD_DAYS;
const PERIODS: PeriodKey[] = ['d7', 'd30', 'd90'];
type Filter = 'all' | TransactionType;
const FILTERS: Filter[] = ['all', 'in', 'out'];
// Type của RN không có `outlineStyle: 'none'` nhưng react-native-web nhận giá trị này.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

type Styles = ReturnType<typeof createStyles>;

const normalize = (value: string) => removeDiacritics(value).toLowerCase().trim();

// Khớp người nhận/chuyển, nội dung, mã giao dịch (không phân biệt dấu); gõ từ 3 chữ số thì khớp cả số tiền
// và số tài khoản.
function matches(tx: Transaction, query: string, digits: string): boolean {
  if (normalize(`${tx.counterpartyName} ${tx.description} ${tx.reference}`).includes(query)) return true;
  if (digits.length < 3) return false;
  return String(tx.amount).includes(digits) || (tx.counterpartyAccount ?? '').replace(/\D/g, '').includes(digits);
}

/** Lịch sử giao dịch theo tài khoản: lọc tiền vào/ra, khoảng thời gian, tìm kiếm; bấm một dòng để xem chi tiết. */
export default function HistoryScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { user } = useAuth();
  const accounts = useAccounts();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('d30');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Kết quả gắn với đúng yêu cầu đã gửi, để đổi tài khoản/khoảng thời gian thì không hiện dữ liệu cũ.
  const [result, setResult] = useState<{ key: string; items: Transaction[]; error: string } | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const fetchAccountId = account?.id;
  const { from, to } = recentDays(PERIOD_DAYS[period]);
  const requestKey = `${fetchAccountId}|${from}|${to}`;
  const current = result?.key === requestKey ? result : null;

  // Mỗi lần mở màn thì tải lại, để giao dịch vừa chuyển khoản/trả hóa đơn hiện ngay.
  useFocusEffect(
    useCallback(() => {
      if (!user || !fetchAccountId) return;
      let active = true;
      const key = `${fetchAccountId}|${from}|${to}`;
      getTransactions({ userId: user.id, accountId: fetchAccountId, from, to }).then((res) => {
        if (active) setResult({ key, items: res.items, error: res.success ? '' : (res.message ?? t('history.error')) });
      });
      return () => {
        active = false;
      };
    }, [user, fetchAccountId, from, to, t]),
  );

  const q = normalize(query);
  const digits = query.replace(/\D/g, '');
  const visible = (current?.items ?? []).filter(
    (tx) => (filter === 'all' || tx.type === filter) && (!q || matches(tx, q, digits)),
  );
  const totalIn = visible.filter((tx) => tx.type === 'in').reduce((sum, tx) => sum + tx.amount, 0);
  const totalOut = visible.filter((tx) => tx.type === 'out').reduce((sum, tx) => sum + tx.amount, 0);
  const sections = groupByDay(visible, (tx) => tx.createdAt, {
    today: t('common.today'),
    yesterday: t('common.yesterday'),
  });

  const openStatement = () => {
    if (!account) return;
    router.navigate({ pathname: '/statement', params: { accountId: account.id, from: 'history' } });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.navigate('/')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('transfer.back')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('history.title')}
        </Text>
        <Pressable
          onPress={openStatement}
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
          <SymbolView name={HistoryIcons.statement} size={IconSize.md} tintColor={theme.onPrimarySoft} />
          <Text style={styles.headerActionText}>{t('history.statement')}</Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
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

        <View style={styles.search}>
          <SymbolView name={SearchIcons.search} size={IconSize.md} tintColor={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('history.searchPlaceholder')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t('history.searchPlaceholder')}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query !== '' && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('history.clearSearch')}>
              <SymbolView name={CommonIcons.close} size={IconSize.sm} tintColor={theme.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f} label={t(`history.filters.${f}`)} active={filter === f} onPress={() => setFilter(f)} styles={styles} />
          ))}
          <View style={styles.chipDivider} />
          {PERIODS.map((p) => (
            <Chip key={p} label={t(`history.periods.${p}`)} active={period === p} onPress={() => setPeriod(p)} styles={styles} />
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(tx) => tx.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          visible.length > 0 ? (
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t('history.totalIn')}</Text>
                <Text style={[styles.summaryValue, styles.summaryIn]}>{formatSignedVND(totalIn, 'in')}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t('history.totalOut')}</Text>
                <Text style={styles.summaryValue}>{formatSignedVND(totalOut, 'out')}</Text>
              </View>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <View style={index > 0 && styles.itemDivider}>
            <TransactionRow tx={item} marker="ring" onPress={() => setSelected(item)} />
          </View>
        )}
        ListEmptyComponent={
          !current ? (
            <ActivityIndicator color={theme.primary} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <SymbolView name={HistoryIcons.empty} size={IconSize.hero} tintColor={theme.textMuted} />
              <Text style={styles.emptyText}>{current.error || t('history.empty')}</Text>
            </View>
          )
        }
      />

      <TransactionDetailSheet transaction={selected} account={account} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
    title: { ...Typography.title, color: theme.text, flex: 1 },
    headerAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: theme.primarySoft,
    },
    headerActionText: { ...Typography.callout, color: theme.onPrimarySoft, fontWeight: '700' },
    controls: { gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.two },
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
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      marginHorizontal: Spacing.three,
      paddingHorizontal: 14,
      height: 44,
      borderRadius: Radius.pill,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: { flex: 1, height: '100%', fontSize: 15, color: theme.text, ...WEB_NO_OUTLINE },
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
    chipDivider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: theme.border },
    list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
    },
    summaryItem: { flex: 1, gap: 2 },
    summaryDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: theme.border,
      marginHorizontal: Spacing.three,
    },
    summaryLabel: { ...Typography.caption, color: theme.textMuted },
    summaryValue: { ...Typography.bodyStrong, color: theme.text, ...MoneyText },
    summaryIn: { color: theme.success },
    section: {
      ...Typography.caption,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: Spacing.four,
      marginBottom: Spacing.two,
    },
    // Danh sách liền mạch trên nền màn hình (không bọc thẻ), chỉ có đường kẻ mảnh giữa các dòng.
    itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    loading: { marginTop: Spacing.five },
    empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six },
    emptyText: { ...Typography.callout, color: theme.textMuted, textAlign: 'center' },
  });
}
