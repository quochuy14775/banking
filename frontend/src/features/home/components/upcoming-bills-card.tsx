import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import BillDueChip from '@/features/bills/components/bill-due-chip';
import HomeSection from '@/features/home/components/home-section';
import { BillCategoryColors } from '@/features/bills/bill-colors';
import { BillCategoryIcons, CommonIcons } from '@/constants/icons';
import { MoneyText, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { UpcomingLayout as L } from '@/features/home/upcoming-layout';
import { daysUntil, formatDayMonth, formatNumberVND, formatVND, parseISODate, weekdayKey } from '@/helpers';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import type { UpcomingBill } from '@/features/home/hooks/use-home-widgets';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';

const HIDDEN = '••••••';
// Cùng ngưỡng với BillDueChip: còn ≤ 3 ngày là "sắp tới hạn".
const DUE_SOON_DAYS = 3;
// Đủ dài để lấp chỗ trống giữa nhãn và số tiền; phần thừa bị cắt.
const LEADER_DOTS = '.'.repeat(120);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.out(Easing.cubic);
// Sau khi trả: vé đã trả mờ đi, các vé/nút bên dưới trượt lên chỗ trống; vé mới lộ ra (từ "+N hóa đơn khác") hiện dần.
const TICKET_EXIT = FadeOut.duration(160);
const TICKET_ENTER = FadeIn.duration(200).delay(120);
const SLIDE = LinearTransition.duration(240).easing(EASE_OUT);

type Styles = ReturnType<typeof createStyles>;

interface Props {
  items: UpcomingBill[];
  /** Số dư tài khoản thanh toán, để tính "còn lại sau khi trả". */
  balance: number;
  hidden: boolean;
  /** Mở bảng thanh toán ngay trên Home cho một hoặc nhiều hóa đơn. */
  onPay: (bills: UpcomingBill[]) => void;
}

/**
 * Hóa đơn nên trả ngay: tất cả hóa đơn quá hạn hoặc đến hạn hôm nay (trả gộp một lần);
 * nếu không có thì là hóa đơn gần hạn nhất.
 */
function urgentGroup(items: UpcomingBill[]): UpcomingBill[] {
  const urgent = items.filter((i) => daysUntil(i.bill.dueDate) <= 0);
  return urgent.length > 0 ? urgent : items.slice(0, 1);
}

/**
 * Khối 4 – Sắp đến hạn, kiểu "vé xé" gộp trong một card: phần tóm tắt viết như hóa đơn in,
 * tối đa `maxTickets` vé có cuống ngày đến hạn, cuối card là thanh "trả gộp" cho các hóa đơn cần trả ngay.
 * Số đo nằm ở `UpcomingLayout`.
 */
export default function UpcomingBillsCard({ items, balance, hidden, onPay }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const openBills = () => router.navigate('/bills');
  const total = items.reduce((sum, i) => sum + i.bill.amount, 0);
  const after = balance - total;
  const shown = items.slice(0, L.maxTickets);
  const rest = items.slice(L.maxTickets);
  const restTotal = rest.reduce((sum, i) => sum + i.bill.amount, 0);
  const group = urgentGroup(items);

  return (
    <HomeSection title={t('home.upcoming.title')} action={{ label: t('home.upcoming.viewAll'), onPress: openBills }}>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t('home.upcoming.empty')}</Text>
      ) : (
        <>
          <View style={styles.summary}>
            <LeaderRow label={t('home.upcoming.toPay')} value={formatVND(total)} styles={styles} />
            <LeaderRow
              label={t('home.upcoming.afterPay')}
              value={hidden ? HIDDEN : formatVND(after)}
              valueStyle={after < 0 ? styles.negative : styles.positive}
              styles={styles}
            />
          </View>

          {/* Lần đầu hiện khối thì không chạy hiệu ứng vào cho từng vé; chỉ chạy khi danh sách đổi sau khi trả. */}
          <LayoutAnimationConfig skipEntering>
            {shown.map((item) => (
              <Animated.View key={item.bill.id} entering={TICKET_ENTER} exiting={TICKET_EXIT} layout={SLIDE}>
                <Ticket item={item} onPress={() => onPay([item])} styles={styles} />
              </Animated.View>
            ))}

            {rest.length > 0 && (
              <Animated.View entering={TICKET_ENTER} exiting={TICKET_EXIT} layout={SLIDE}>
                <Pressable
                  onPress={openBills}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
                  <Text style={styles.moreText}>
                    {t('home.upcoming.more', { count: rest.length })} ·{' '}
                    <Text style={styles.moreAmount}>{formatVND(restTotal)}</Text>
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            <Animated.View layout={SLIDE}>
              <PayBar group={group} onPress={() => onPay(group)} styles={styles} />
            </Animated.View>
          </LayoutAnimationConfig>
        </>
      )}
    </HomeSection>
  );
}

function LeaderRow({
  label,
  value,
  valueStyle,
  styles,
}: {
  label: string;
  value: string;
  valueStyle?: object;
  styles: Styles;
}) {
  return (
    <View style={styles.leaderRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.leaderLabel}>{label}</Text>
      <Text style={styles.leaderDots} numberOfLines={1} ellipsizeMode="clip">
        {LEADER_DOTS}
      </Text>
      <Text style={[styles.summaryAmount, valueStyle]}>{value}</Text>
    </View>
  );
}

function Ticket({ item, onPress, styles }: { item: UpcomingBill; onPress: () => void; styles: Styles }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t, locale } = useI18n();
  const { bill, label, category } = item;
  const date = parseISODate(bill.dueDate);
  const days = daysUntil(bill.dueDate);
  // Cuống vé đổi màu theo độ gấp: quá hạn/hôm nay đỏ, sắp tới vàng, còn lâu thì màu thương hiệu.
  const stubColor = days <= 0 ? theme.danger : days <= DUE_SOON_DAYS ? theme.warning : theme.primary;
  const month = t('home.upcoming.monthShort', {
    month: date.getMonth() + 1,
    name: date.toLocaleString(locale, { month: 'short' }),
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.upcoming.payOne', { name: label })}, ${formatVND(bill.amount)}, ${formatDayMonth(bill.dueDate)}`}
      style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}>
      <View style={styles.stub}>
        <Text style={[styles.stubSmall, { color: stubColor }]}>{t(`bills.weekdays.${weekdayKey(bill.dueDate)}`)}</Text>
        <Text style={[styles.stubDay, { color: stubColor }]}>{date.getDate()}</Text>
        <Text style={[styles.stubSmall, { color: stubColor }]}>{month}</Text>
      </View>

      <View style={styles.perforation} pointerEvents="none">
        {Array.from({ length: L.perforationDashes }, (_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
      <View style={[styles.notch, styles.notchTop]} pointerEvents="none" />
      <View style={[styles.notch, styles.notchBottom]} pointerEvents="none" />

      <View style={styles.body}>
        <View style={styles.glyph}>
          <SymbolView
            name={BillCategoryIcons[category]}
            size={L.glyphSize}
            tintColor={BillCategoryColors[category][scheme].fg}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.chip}>
            <BillDueChip dueDate={bill.dueDate} />
          </View>
        </View>
        <Text style={styles.amount}>
          {formatNumberVND(bill.amount)}
          <Text style={styles.currency}> ₫</Text>
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Thanh trả gộp: nhìn là biết sẽ trả những hóa đơn nào (các vòng icon chồng nhau),
 * bao nhiêu tiền (số mono lớn) và bấm vào đâu (nút mũi tên).
 */
function PayBar({ group, onPress, styles }: { group: UpcomingBill[]; onPress: () => void; styles: Styles }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useI18n();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const total = group.reduce((sum, i) => sum + i.bill.amount, 0);
  const title =
    group.length > 1
      ? t('home.upcoming.payGroup', { count: group.length })
      : t('home.upcoming.payOne', { name: group[0]?.label ?? '' });

  if (group.length === 0) return null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.97, { duration: 120, easing: EASE_OUT }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 240, easing: EASE_OUT }))}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatVND(total)}: ${group.map((g) => g.label).join(', ')}`}
      style={[styles.payBar, pressStyle]}>
      <View style={[styles.avatars, { width: L.payAvatar + (group.length - 1) * (L.payAvatar - L.payAvatarOverlap) }]}>
        {group.map((g, i) => (
          <View
            key={g.bill.id}
            style={[styles.avatar, { left: i * (L.payAvatar - L.payAvatarOverlap), zIndex: group.length - i }]}>
            <SymbolView
              name={BillCategoryIcons[g.category]}
              size={L.payAvatar * 0.5}
              tintColor={BillCategoryColors[g.category][scheme].fg}
            />
          </View>
        ))}
      </View>
      <View style={styles.flex}>
        <Text style={styles.payTitle} numberOfLines={1}>
          {title}
        </Text>
        <Animated.Text key={total} entering={FadeIn.duration(180)} style={styles.payAmount}>
          {formatVND(total)}
        </Animated.Text>
      </View>
      <View style={styles.payGo}>
        <SymbolView name={CommonIcons.chevronRight} size={IconSize.md} tintColor={theme.primary} />
      </View>
    </AnimatedPressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    empty: { ...Typography.callout, color: theme.textSecondary },
    summary: { gap: 6, marginBottom: 2 },
    leaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    leaderLabel: { ...Typography.callout, color: theme.textSecondary },
    leaderDots: { flex: 1, ...Typography.callout, color: theme.textMuted, letterSpacing: 2 },
    summaryAmount: { fontSize: L.summaryAmountSize, fontWeight: '600', color: theme.text, ...MoneyText },
    positive: { color: theme.success },
    negative: { color: theme.danger },
    ticket: {
      flexDirection: 'row',
      marginTop: L.ticketGap,
      borderRadius: L.ticketRadius,
      backgroundColor: theme.backgroundInset,
    },
    pressed: { opacity: 0.7 },
    stub: { width: L.stubWidth, alignItems: 'center', justifyContent: 'center', paddingVertical: L.rowPad },
    stubSmall: { fontSize: 10, lineHeight: 13 },
    stubDay: { fontSize: L.stubDaySize, lineHeight: L.stubDaySize * 1.15, fontWeight: '600', ...MoneyText },
    perforation: {
      width: 1.5,
      paddingVertical: L.notch / 2 + 2,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dash: { width: 1.5, height: 4, borderRadius: 1, backgroundColor: theme.textMuted, opacity: 0.5 },
    // Khấc tròn tô màu nền card, đè lên mép vé để trông như vé bị bấm lỗ.
    notch: {
      position: 'absolute',
      left: L.stubWidth - L.notch / 2 + 0.75,
      width: L.notch,
      height: L.notch,
      borderRadius: L.notch / 2,
      backgroundColor: theme.backgroundElement,
    },
    notchTop: { top: -L.notch / 2 },
    notchBottom: { bottom: -L.notch / 2 },
    body: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: L.iconGap,
      paddingVertical: L.rowPad,
      paddingHorizontal: L.bodyPadX,
    },
    glyph: { width: L.glyphBox, alignItems: 'center' },
    name: { fontSize: L.titleSize, lineHeight: L.titleSize * 1.3, color: theme.text },
    chip: { marginTop: 3 },
    amount: { fontSize: L.amountSize, fontWeight: '600', color: theme.text, ...MoneyText },
    currency: { fontSize: L.amountSize * 0.7, fontWeight: '400', color: theme.textMuted },
    more: {
      marginTop: L.ticketGap,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
    },
    moreText: { ...Typography.callout, fontWeight: '600', color: theme.primary },
    moreAmount: MoneyText,
    payBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 10,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },
    avatars: { height: L.payAvatar },
    avatar: {
      position: 'absolute',
      width: L.payAvatar,
      height: L.payAvatar,
      borderRadius: L.payAvatar / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundElement,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    payTitle: { ...Typography.caption, color: theme.onPrimary },
    payAmount: { fontSize: L.payAmountSize, lineHeight: L.payAmountSize * 1.25, fontWeight: '700', color: theme.onPrimary, ...MoneyText },
    payGo: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.onPrimary,
    },
  });
}
