import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/primary-button';
import { transactionIcon } from '@/components/transaction-row';
import { HistoryIcons, TransferIcons } from '@/constants/icons';
import { Fonts, MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatDateTime, formatSignedVND, formatVND } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { Account, Transaction } from '@/models';

// Hiệu ứng chạy một lần, chậm dần về cuối, không nảy (giống sheet thanh toán hóa đơn).
const EASE_OUT = Easing.out(Easing.cubic);

interface Props {
  /** Giao dịch đang xem; `null` thì đóng sheet. */
  transaction: Transaction | null;
  account?: Account;
  onClose: () => void;
}

export default function TransactionDetailSheet({ transaction, account, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // Giữ giao dịch vừa xem để nội dung không biến mất trong lúc sheet mờ dần khi đóng.
  const [shown, setShown] = useState<Transaction | null>(transaction);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  if (transaction && transaction !== shown) setShown(transaction);
  const tx = transaction ?? shown;
  if (!tx) return null;

  const isIn = tx.type === 'in';
  const copyReference = async () => {
    await Clipboard.setStringAsync(tx.reference);
    setCopiedId(tx.id);
  };

  return (
    <Modal visible={transaction !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        {/* Modal là cửa sổ native riêng nên dùng insets thủ công thay cho SafeAreaView. */}
        <Animated.View
          entering={SlideInDown.duration(320).easing(EASE_OUT)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.handle} />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {t('history.detail.title')}
            </Text>
            <View style={styles.center}>
              <View style={[styles.badge, isIn && styles.badgeIn]}>
                <SymbolView name={transactionIcon(tx)} size={IconSize.xxl} tintColor={isIn ? theme.success : theme.primary} />
              </View>
              <Text style={[styles.amount, isIn && styles.amountIn]}>{formatSignedVND(tx.amount, tx.type)}</Text>
              <View style={styles.status}>
                <SymbolView name={TransferIcons.success} size={IconSize.sm} tintColor={theme.success} />
                <Text style={styles.statusText}>{t('history.detail.success')}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Row label={t('history.detail.time')} value={formatDateTime(tx.createdAt)} />
              <Row label={t('history.detail.category')} value={t(`history.categories.${tx.category}`)} />
              {account && <Row label={t('history.detail.account')} value={`${account.label}\n${account.number}`} />}
              <Row
                label={t(isIn ? 'history.detail.sender' : 'history.detail.recipient')}
                value={tx.counterpartyName}
                strong
              />
              {tx.counterpartyBank && <Row label={t('history.detail.bank')} value={tx.counterpartyBank} />}
              {tx.counterpartyAccount && (
                <Row label={t('history.detail.accountNumber')} value={tx.counterpartyAccount} mono />
              )}
              <Row label={t('history.detail.content')} value={tx.description} />
              <Row label={t('history.detail.fee')} value={tx.fee ? formatVND(tx.fee) : t('history.detail.free')} />
              <Row label={t('history.detail.balanceAfter')} value={formatVND(tx.balanceAfter)} strong mono />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('history.detail.reference')}</Text>
                <Pressable
                  onPress={copyReference}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('history.detail.copy')}
                  style={({ pressed }) => [styles.copy, pressed && styles.pressed]}>
                  <Text style={[styles.rowValue, styles.mono]}>{tx.reference}</Text>
                  <SymbolView name={HistoryIcons.copy} size={IconSize.sm} tintColor={theme.primary} />
                </Pressable>
              </View>
              {copiedId === tx.id && (
                <Text style={styles.copied} accessibilityLiveRegion="polite">
                  {t('history.detail.copied')}
                </Text>
              )}
            </View>

            <PrimaryButton label={t('common.close')} onPress={onClose} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    sheet: {
      maxHeight: '92%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: Spacing.two,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginBottom: Spacing.three,
    },
    scroll: { flexGrow: 0 },
    body: { gap: Spacing.three, paddingBottom: Spacing.two },
    pressed: { opacity: 0.7 },
    sheetTitle: { ...Typography.heading, color: theme.text, textAlign: 'center' },
    center: { alignItems: 'center', gap: Spacing.two },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeIn: { backgroundColor: theme.successSoft },
    amount: { ...Typography.display, color: theme.text, ...MoneyText },
    amountIn: { color: theme.success },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: theme.successSoft,
    },
    statusText: { ...Typography.callout, color: theme.success, fontWeight: '700' },
    card: {
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      gap: Spacing.three,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
    rowLabel: { ...Typography.callout, color: theme.textMuted },
    rowValue: { ...Typography.callout, color: theme.text, textAlign: 'right', flexShrink: 1 },
    rowValueStrong: { fontWeight: '700' },
    mono: { fontFamily: Fonts.mono },
    copy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
    copied: { ...Typography.caption, color: theme.success, textAlign: 'right', marginTop: -Spacing.two },
  });
}
