import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HistoryIcons, TransactionCategoryIcons } from '@/constants/icons';
import { MoneyText, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { TransactionCategoryColors } from '@/constants/transaction-colors';
import { formatShortDateTime, formatSignedVND, formatTime, formatVND } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { Transaction } from '@/models';

/** Chuyển khoản dùng mũi tên vào/ra; các loại khác dùng biểu tượng riêng của loại giao dịch. */
export function transactionIcon(tx: Pick<Transaction, 'type' | 'category'>) {
  if (tx.category === 'transfer') return tx.type === 'in' ? HistoryIcons.moneyIn : HistoryIcons.moneyOut;
  return TransactionCategoryIcons[tx.category];
}

interface Props {
  tx: Transaction;
  onPress: () => void;
  /** `statement`: thêm ngày vào dòng phụ và hiện số dư sau giao dịch (giống bản sao kê) thay cho giờ. */
  variant?: 'history' | 'statement';
  /** `icon`: biểu tượng trong ô tròn nền nhạt. `ring`: vòng tròn nhỏ viền màu theo loại giao dịch, không biểu tượng. */
  marker?: 'icon' | 'ring';
}

export default function TransactionRow({ tx, onPress, variant = 'history', marker = 'icon' }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const isIn = tx.type === 'in';
  const amount = formatSignedVND(tx.amount, tx.type);
  const isStatement = variant === 'statement';
  const subtitle = isStatement ? `${formatShortDateTime(tx.createdAt)} · ${tx.description}` : tx.description;
  const meta = isStatement ? t('statement.balance', { amount: formatVND(tx.balanceAfter) }) : formatTime(tx.createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(`history.categories.${tx.category}`)}. ${tx.counterpartyName}. ${amount}. ${subtitle}. ${meta}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {marker === 'ring' ? (
        <View style={[styles.ring, { borderColor: TransactionCategoryColors[tx.category] }]} />
      ) : (
        <View style={[styles.icon, isIn && styles.iconIn]}>
          <SymbolView name={transactionIcon(tx)} size={IconSize.lg} tintColor={isIn ? theme.success : theme.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.counterpartyName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.end}>
        <Text style={[styles.amount, isIn && styles.amountIn]}>{amount}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 12 },
    pressed: { opacity: 0.7 },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconIn: { backgroundColor: theme.successSoft },
    ring: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
    body: { flex: 1, gap: 2 },
    title: { ...Typography.bodyStrong, color: theme.text },
    subtitle: { ...Typography.caption, color: theme.textMuted },
    end: { alignItems: 'flex-end', gap: 2 },
    amount: { ...Typography.bodyStrong, color: theme.text, ...MoneyText },
    amountIn: { color: theme.success },
    meta: { ...Typography.caption, color: theme.textMuted },
  });
}
