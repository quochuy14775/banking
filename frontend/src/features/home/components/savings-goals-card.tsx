import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import HomeSection from '@/features/home/components/home-section';
import { SavingsGoalIcons } from '@/constants/icons';
import { SavingsLayout as L } from '@/features/home/savings-layout';
import { SavingsGoalColors } from '@/features/home/spending-colors';
import { MoneyText, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import {
  currentGoalMonth,
  formatCompactVND,
  formatMonthYear,
  formatVND,
  goalMonths,
  goalStatus,
  requiredMonthly,
  type GoalStatus,
} from '@/helpers';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { SavingsGoal } from '@/models';

type ColorKey = keyof ThemeColors;
// Chậm dần về cuối, không nảy (cùng quy ước với các nút trong app).
const EASE_OUT = Easing.out(Easing.cubic);
type Styles = ReturnType<typeof createStyles>;

const STATUS: Record<GoalStatus, { bg: ColorKey; fg: ColorKey; fill: ColorKey }> = {
  onTrack: { bg: 'successSoft', fg: 'success', fill: 'primary' },
  behind: { bg: 'warningSoft', fg: 'warning', fill: 'warning' },
  done: { bg: 'successSoft', fg: 'success', fill: 'primary' },
};

interface Props {
  goals: SavingsGoal[];
  onContribute: (goalId: string, amount: number) => Promise<{ success: boolean }>;
}

/**
 * Khối 7 – Mục tiêu tiết kiệm, kiểu "thẻ tích tháng": mỗi tháng từ lúc bắt đầu tới hạn là một ô,
 * ô tô đậm = tháng đã góp đủ, ô có viền = tháng hiện tại. Cuối khối là các nút góp nhanh cho mục tiêu
 * đang chậm (chọn số tiền rồi bấm xác nhận). Số đo nằm ở `SavingsLayout`.
 */
export default function SavingsGoalsCard({ goals, onContribute }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  // Góp nhanh ưu tiên mục tiêu đang chậm, không có thì mục tiêu đầu tiên chưa đạt.
  const target = goals.find((g) => goalStatus(g) === 'behind') ?? goals.find((g) => goalStatus(g) !== 'done');

  return (
    <HomeSection title={t('home.goals.title')}>
      {goals.map((goal, index) => (
        <GoalStamps key={goal.id} goal={goal} first={index === 0} styles={styles} />
      ))}
      <View style={styles.legend}>
        <View style={[styles.legendBox, styles.stampCurrent]} />
        <Text style={styles.caption}>{t('home.goals.currentMonth')}</Text>
      </View>
      {target && <QuickContribute goal={target} onContribute={onContribute} styles={styles} />}
    </HomeSection>
  );
}

function GoalStamps({ goal, first, styles }: { goal: SavingsGoal; first: boolean; styles: Styles }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t, locale } = useI18n();
  const status = goalStatus(goal);
  const colors = STATUS[status];
  const months = goalMonths(goal);
  const perStamp = goal.target / months;
  const filledExact = Math.min(goal.saved / perStamp, months);
  const full = Math.floor(filledExact);
  const partial = filledExact - full;
  const current = currentGoalMonth(goal);
  const fill = theme[colors.fill];

  return (
    <View style={[styles.goal, !first && styles.goalDivider]}>
      <View style={styles.head}>
        <View style={styles.glyph}>
          <SymbolView name={SavingsGoalIcons[goal.icon]} size={L.glyphSize} tintColor={SavingsGoalColors[goal.icon][scheme].fg} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {goal.name}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {t('home.goals.deadline', { date: formatMonthYear(goal.deadline) })}
            {status !== 'done' &&
              ` · ${t('home.goals.perMonth', { amount: formatCompactVND(requiredMonthly(goal), locale) })}`}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: theme[colors.bg] }]}>
          <Text style={[styles.chipText, { color: theme[colors.fg] }]}>{t(`home.goals.${status}`)}</Text>
        </View>
      </View>

      <View
        style={styles.stamps}
        accessible
        accessibilityLabel={t('home.goals.a11yStamps', { filled: full, total: months })}>
        {Array.from({ length: months }, (_, i) => (
          <Stamp
            key={i}
            level={i < full ? 1 : i === full ? partial : 0}
            color={fill}
            current={i === current}
            styles={styles}
          />
        ))}
      </View>

      <View style={styles.foot}>
        <Text style={styles.mono}>
          <Text style={styles.saved}>{formatCompactVND(goal.saved, locale)}</Text>
          <Text style={styles.caption}> / {formatCompactVND(goal.target, locale)}</Text>
        </Text>
        <Text style={styles.caption}>
          {t('home.goals.perStamp', { amount: formatCompactVND(perStamp, locale) })}
        </Text>
      </View>
    </View>
  );
}

/**
 * Một ô tháng. `level` là phần đã góp của tháng đó (0..1). Khi `level` tăng (vừa góp thêm),
 * phần màu đổ đầy tới mức mới và ô "đóng dấu": co nhẹ rồi trở lại, để người dùng thấy đúng ô vừa đổi.
 * Giảm/khởi tạo thì đặt thẳng, không chạy hiệu ứng.
 */
function Stamp({ level, color, current, styles }: { level: number; color: string; current: boolean; styles: Styles }) {
  const fillLevel = useSharedValue(level);
  const scale = useSharedValue(1);
  const previous = useRef(level);

  useEffect(() => {
    if (level > previous.current) {
      fillLevel.set(withTiming(level, { duration: 260, easing: EASE_OUT }));
      scale.set(
        withSequence(
          withTiming(0.86, { duration: 90, easing: EASE_OUT }),
          withTiming(1, { duration: 220, easing: EASE_OUT }),
        ),
      );
    } else {
      fillLevel.set(level);
    }
    previous.current = level;
  }, [level, fillLevel, scale]);

  const cellStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  // Ô đầy thì màu đậm; ô đang góp dở thì nhạt hơn.
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillLevel.get() * 100}%`,
    opacity: fillLevel.get() >= 0.999 ? 1 : L.stampPartialOpacity,
  }));

  return (
    <Animated.View style={[styles.stamp, current && styles.stampCurrent, cellStyle]}>
      <Animated.View style={[styles.stampFill, { backgroundColor: color }, fillStyle]} />
    </Animated.View>
  );
}

/** Các nút góp nhanh: chọn một mức → hiện nút xác nhận (tránh lỡ tay chuyển tiền) → góp. */
function QuickContribute({
  goal,
  onContribute,
  styles,
}: {
  goal: SavingsGoal;
  onContribute: Props['onContribute'];
  styles: Styles;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const fullMonth = requiredMonthly(goal);
  const options = [...L.quickAmounts.map((amount) => ({ amount, full: false })), { amount: fullMonth, full: true }].filter(
    (o) => o.amount > 0,
  );

  const confirm = async () => {
    if (selected === null) return;
    setBusy(true);
    const res = await onContribute(goal.id, selected);
    setBusy(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDoneMessage(t('home.goals.contributed', { amount: formatVND(selected), name: goal.name }));
    }
    setSelected(null);
  };

  return (
    <View style={styles.quick}>
      <Text style={styles.quickTitle}>{t('home.goals.quickTitle', { name: goal.name })}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = selected === o.amount;
          return (
            <Pressable
              key={o.full ? 'full' : o.amount}
              onPress={() => {
                setSelected(active ? null : o.amount);
                setDoneMessage(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.full ? `${t('home.goals.fullMonth')}, ${formatVND(o.amount)}` : formatVND(o.amount)}
              style={({ pressed }) => [
                styles.amountChip,
                o.full && styles.amountChipFull,
                active && styles.amountChipActive,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.amountChipText,
                  (o.full || active) && styles.amountChipTextStrong,
                  o.full && styles.amountChipFullText,
                ]}>
                {o.full ? t('home.goals.fullMonth') : formatCompactVND(o.amount, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null && (
        <View style={styles.confirmRow}>
          <Pressable
            onPress={confirm}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy }}
            style={({ pressed }) => [styles.confirm, pressed && styles.pressed]}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <Text style={styles.confirmText}>{t('home.goals.confirm', { amount: formatVND(selected) })}</Text>
            )}
          </Pressable>
          {!busy && (
            <Pressable onPress={() => setSelected(null)} accessibilityRole="button" style={styles.cancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {doneMessage && <Text style={styles.done}>{doneMessage}</Text>}
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    goal: { paddingVertical: L.goalPadY },
    goalDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    head: { flexDirection: 'row', alignItems: 'center', gap: L.iconGap },
    glyph: { width: L.glyphBox, alignItems: 'center' },
    name: { fontSize: L.nameSize, lineHeight: L.nameSize * 1.3, color: theme.text },
    caption: { ...Typography.caption, color: theme.textMuted },
    mono: MoneyText,
    chip: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill },
    chipText: { ...Typography.micro, fontWeight: '700' },
    stamps: { flexDirection: 'row', gap: L.stampGap, marginTop: 10, marginBottom: 6 },
    stamp: {
      flex: 1,
      height: L.stampHeight,
      borderRadius: L.stampRadius,
      backgroundColor: theme.backgroundInset,
      overflow: 'hidden',
    },
    stampFill: { height: '100%' },
    stampCurrent: { borderWidth: L.stampCurrentBorder, borderColor: theme.text },
    foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    saved: { fontSize: L.amountSize, fontWeight: '600', color: theme.text },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    legendBox: { width: 10, height: 10, borderRadius: 3 },
    quick: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      gap: 6,
    },
    quickTitle: { ...Typography.caption, color: theme.textSecondary },
    chips: { flexDirection: 'row', gap: 6 },
    amountChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: Radius.md,
      backgroundColor: theme.primarySoft,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    amountChipFull: { backgroundColor: theme.primary },
    amountChipActive: { borderColor: theme.text },
    amountChipText: { ...Typography.callout, fontWeight: '600', color: theme.onPrimarySoft, ...MoneyText },
    amountChipTextStrong: { fontWeight: '700' },
    amountChipFullText: { color: theme.onPrimary },
    confirmRow: { flexDirection: 'row', gap: Spacing.two, marginTop: 4 },
    confirm: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      backgroundColor: theme.primary,
    },
    confirmText: { ...Typography.callout, fontWeight: '600', color: theme.onPrimary, ...MoneyText },
    cancel: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12 },
    cancelText: { ...Typography.callout, fontWeight: '600', color: theme.textSecondary },
    done: { ...Typography.caption, color: theme.success },
    pressed: { opacity: 0.7 },
  });
}
