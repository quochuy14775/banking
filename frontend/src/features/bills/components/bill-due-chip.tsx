import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { daysUntil } from '@/helpers';
import { useTheme } from '@/shared/hooks/use-theme';
import { useI18n } from '@/i18n';

const DUE_SOON_DAYS = 3;

/** Nhãn hạn thanh toán: quá hạn/hôm nay (đỏ), còn ≤ 3 ngày (vàng), còn lâu (xám). */
export default function BillDueChip({ dueDate }: { dueDate: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  const days = daysUntil(dueDate);
  let text: string;
  let bg: string;
  let fg: string;
  if (days < 0) {
    text = t('bills.overdue');
    [bg, fg] = [theme.dangerSoft, theme.danger];
  } else if (days === 0) {
    text = t('bills.dueToday');
    [bg, fg] = [theme.dangerSoft, theme.danger];
  } else {
    text = t('bills.dueIn', { count: days });
    [bg, fg] = days <= DUE_SOON_DAYS ? [theme.warningSoft, theme.warning] : [theme.backgroundSelected, theme.textSecondary];
  }
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill },
  text: { ...Typography.micro, fontWeight: '700' },
});
