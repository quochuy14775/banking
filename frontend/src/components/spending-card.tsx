import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import HomeSection from '@/components/home-section';
import { HomeIcons, SpendingCategoryIcons } from '@/constants/icons';
import { AmbientLoops } from '@/constants/motion';
import { SpendingLayout as L } from '@/constants/spending-layout';
import { SpendingRamp } from '@/constants/spending-colors';
import { MoneyText, Radius, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatCompactVND, parseISODate } from '@/helpers';
import { useAmbientLoop } from '@/hooks/use-ambient-loop';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n, type Translate } from '@/i18n';
import type { MonthlySpending, SpendingCategory, SpendingSummary } from '@/models';

type Period = 'current' | 'previous';
const EASE_OUT = Easing.out(Easing.cubic);
type Styles = ReturnType<typeof createStyles>;

/** % thay đổi so với tháng liền trước (0 khi tháng trước không có số liệu). */
function changePercent(amount: number, previous: number): number {
  return previous > 0 ? Math.round(((amount - previous) / previous) * 100) : 0;
}

/** Số ngày còn lại trong tháng hiện tại, tính cả hôm nay. */
function daysLeftInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
}

/**
 * Khối 5 – Tiền đi đâu, kiểu "thanh xếp tầng": tổng chi lớn (mono) + mức đổi so với tháng trước,
 * một thanh ngang chia theo tỉ lệ từng danh mục (một tông xanh, đậm nhất là mục chi nhiều nhất),
 * bên dưới là bảng xếp hạng có icon nét trần, % trong tổng chi, số tiền và % thay đổi.
 * Số đo nằm ở `SpendingLayout`.
 */
export default function SpendingCard({ data }: { data: SpendingSummary }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const styles = useThemedStyles(createStyles);
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<Period>('current');
  const month: MonthlySpending = data[period];
  const compareDate = parseISODate(month.month);
  compareDate.setMonth(compareDate.getMonth() - 1);
  const monthName = compareDate.toLocaleString(locale, { month: 'long' });
  // Tiếng Việt trả về "Tháng 10"; đứng giữa câu ("so với tháng 10") nên viết thường.
  const compareLabel = locale.startsWith('vi') ? monthName.toLocaleLowerCase(locale) : monthName;

  // Xếp theo số tiền giảm dần; màu trong dải xanh gán theo thứ hạng.
  const ramp = SpendingRamp[scheme];
  const ranked = [...month.categories].sort((a, b) => b.amount - a.amount);
  const colorOf = (index: number) => ramp[Math.min(index, ramp.length - 1)];

  const previousTotal = month.categories.reduce((sum, c) => sum + c.previousAmount, 0);
  const totalChange = changePercent(month.total, previousTotal);

  return (
    <HomeSection title={t('home.spending.title')} meta={t('home.spending.compare', { month: compareLabel })}>
      <View style={styles.segment} accessibilityRole="tablist">
        {(['current', 'previous'] as const).map((p) => {
          const active = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t(p === 'current' ? 'home.spending.thisMonth' : 'home.spending.lastMonth')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.total}>{formatCompactVND(month.total, locale)}</Text>
        <Text style={styles.totalMeta}>
          {t('home.spending.spentLower')}
          {' · '}
          <Text style={{ color: totalChange > 0 ? theme.danger : totalChange < 0 ? theme.success : theme.textMuted }}>
            {t('home.spending.totalChange', {
              change: `${totalChange > 0 ? '+' : ''}${totalChange}%`,
              month: compareLabel,
            })}
          </Text>
        </Text>
      </View>

      <View style={styles.stack} accessible={false}>
        {/* Thứ tự đoạn cố định theo danh mục (không theo hạng) để khi đổi tháng mỗi đoạn co/giãn tại chỗ. */}
        {month.categories.map((c) => (
          <StackPart
            key={c.key}
            amount={c.amount}
            color={colorOf(ranked.findIndex((r) => r.key === c.key))}
            style={styles.stackPart}
          />
        ))}
      </View>

      {ranked.map((c, i) => (
        <CategoryRow
          key={c.key}
          category={c}
          share={month.total > 0 ? Math.round((c.amount / month.total) * 100) : 0}
          color={colorOf(i)}
          styles={styles}
          locale={locale}
          t={t}
        />
      ))}

      {period === 'current' && <BudgetBar data={data} styles={styles} />}
    </HomeSection>
  );
}

/**
 * Một đoạn của thanh xếp tầng. Đổi tháng thì độ rộng (flex) chuyển dần sang tỉ lệ mới,
 * để thấy mục nào to ra, mục nào nhỏ lại giữa hai tháng.
 */
function StackPart({ amount, color, style }: { amount: number; color: string; style: object }) {
  const flex = useSharedValue(amount);
  useEffect(() => {
    flex.set(withTiming(amount, { duration: 260, easing: EASE_OUT }));
  }, [amount, flex]);
  const animated = useAnimatedStyle(() => ({ flex: flex.get() }));
  return <Animated.View style={[style, { backgroundColor: color }, animated]} />;
}

function CategoryRow({
  category,
  share,
  color,
  styles,
  locale,
  t,
}: {
  category: SpendingCategory;
  share: number;
  color: string;
  styles: Styles;
  locale: string;
  t: Translate;
}) {
  const theme = useTheme();
  const percent = changePercent(category.amount, category.previousAmount);
  const up = percent > 0;
  const down = percent < 0;
  const changeColor = up ? theme.danger : down ? theme.success : theme.textMuted;
  const name = t(`home.spending.categories.${category.key}`);
  const amount = formatCompactVND(category.amount, locale);
  const change = up
    ? t('home.spending.a11yUp', { percent })
    : down
      ? t('home.spending.a11yDown', { percent: Math.abs(percent) })
      : t('home.spending.noChange');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${t('home.spending.a11yRow', { category: name, amount, change })}, ${t('home.spending.a11yShare', { percent: share })}`}>
      <View style={styles.glyph}>
        <SymbolView name={SpendingCategoryIcons[category.key]} size={L.glyphSize} tintColor={color} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.share}>{share}%</Text>
      <Text style={styles.amount}>{amount}</Text>
      <View style={styles.change}>
        {(up || down) && (
          <SymbolView name={up ? HomeIcons.trendUp : HomeIcons.trendDown} size={IconSize.xs} tintColor={changeColor} />
        )}
        <Text style={[styles.changeText, { color: changeColor }]}>
          {up || down ? `${Math.abs(percent)}%` : t('home.spending.noChange')}
        </Text>
      </View>
    </View>
  );
}

/** Thanh ngân sách tháng này + mức được chi mỗi ngày còn lại để không vượt ngân sách. */
function BudgetBar({ data, styles }: { data: SpendingSummary; styles: Styles }) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const percent = Math.round((data.current.total / data.monthlyBudget) * 100);
  const remaining = Math.max(data.monthlyBudget - data.current.total, 0);
  const perDay = Math.floor(remaining / daysLeftInMonth() / 1_000) * 1_000;

  const barColor = percent > 100 ? theme.danger : theme.primary;
  const position = Math.min(percent, 100);

  return (
    <View style={styles.budget}>
      <View style={styles.barWrap}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: position }}>
          <View style={[styles.fill, { width: `${position}%`, backgroundColor: barColor }]} />
        </View>
        <TodayDot left={position} color={barColor} styles={styles} />
      </View>
      <View style={styles.budgetRow}>
        <Text style={styles.budgetText}>
          {t('home.spending.budget', { percent, budget: formatCompactVND(data.monthlyBudget, locale) })}
        </Text>
        <Text style={[styles.budgetText, styles.mono]}>
          {t('home.spending.perDay', { amount: formatCompactVND(perDay, locale) })}
        </Text>
      </View>
    </View>
  );
}

/**
 * Chấm "hôm nay" ở đầu thanh ngân sách: một quầng mờ lan ra rồi tan, chu kỳ chậm,
 * nói rằng tháng vẫn đang diễn ra và con số còn thay đổi. Dừng thì chỉ còn chấm tĩnh.
 */
function TodayDot({ left, color, styles }: { left: number; color: string; styles: Styles }) {
  const running = useAmbientLoop();
  const { cycle, maxScale, startOpacity } = AmbientLoops.budgetDot;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!running) {
      cancelAnimation(pulse);
      pulse.set(0);
      return;
    }
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: cycle * 0.6, easing: EASE_OUT }),
          withTiming(1, { duration: cycle * 0.4 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [running, pulse, cycle]);

  // Quầng lan từ cỡ chấm tới `maxScale` lần, mờ dần về 0; xong thì đứng yên tới chu kỳ sau.
  const halo = useAnimatedStyle(() => ({
    opacity: pulse.get() >= 1 ? 0 : startOpacity * (1 - pulse.get()),
    transform: [{ scale: 1 + (maxScale - 1) * pulse.get() }],
  }));

  return (
    <View pointerEvents="none" style={[styles.todayDotBox, { left: `${left}%` }]}>
      <Animated.View style={[styles.todayHalo, { backgroundColor: color }, halo]} />
      <View style={[styles.todayDot, { backgroundColor: color }]} />
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    segment: {
      flexDirection: 'row',
      padding: 2,
      borderRadius: 9,
      backgroundColor: theme.backgroundMuted,
      marginBottom: 12,
    },
    segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
    segmentActive: { backgroundColor: theme.backgroundElement, boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)' },
    segmentText: { ...Typography.callout, color: theme.textSecondary },
    segmentTextActive: { fontWeight: '600', color: theme.text },
    totalRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, marginBottom: 10 },
    total: { fontSize: L.totalSize, lineHeight: L.totalSize * 1.2, fontWeight: '700', color: theme.text, ...MoneyText },
    totalMeta: { ...Typography.caption, color: theme.textSecondary },
    stack: { flexDirection: 'row', gap: L.stackGap, height: L.stackHeight, marginBottom: 10 },
    stackPart: { borderRadius: L.stackRadius },
    row: { flexDirection: 'row', alignItems: 'center', gap: L.iconGap, paddingVertical: L.rowPadY },
    glyph: { width: L.glyphBox, alignItems: 'center' },
    name: { flex: 1, fontSize: L.nameSize, lineHeight: L.nameSize * 1.3, color: theme.text },
    share: { ...Typography.micro, fontWeight: '400', color: theme.textMuted, ...MoneyText },
    amount: {
      minWidth: L.amountMinWidth,
      textAlign: 'right',
      fontSize: L.amountSize,
      fontWeight: '600',
      color: theme.text,
      ...MoneyText,
    },
    change: { width: L.changeWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
    changeText: { ...Typography.caption, ...MoneyText },
    budget: { marginTop: 10, gap: 6 },
    barWrap: { justifyContent: 'center' },
    // Hộp 12×12 đặt tâm đúng tại điểm cuối phần đã chi.
    todayDotBox: { position: 'absolute', width: 12, height: 12, marginLeft: -6, alignItems: 'center', justifyContent: 'center' },
    todayHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
    todayDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.backgroundElement },
    track: { height: 6, borderRadius: Radius.pill, backgroundColor: theme.backgroundMuted, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: Radius.pill },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    budgetText: { ...Typography.caption, color: theme.textSecondary },
    mono: MoneyText,
  });
}
