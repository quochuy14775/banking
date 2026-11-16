import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CommonIcons, HomeIcons } from '@/constants/icons';
import { AmbientLoops } from '@/constants/motion';
import { Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatCompactVND, formatVND } from '@/helpers';
import { useAmbientLoop } from '@/hooks/use-ambient-loop';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { SpendingInsight } from '@/models';

interface Props {
  insight: SpendingInsight;
  onSetLimit: () => void;
  onDismiss: () => void;
}

/** Khối 6 – Gợi ý: một kết luận + một con số làm theo được; người dùng có thể đóng. */
export default function InsightCard({ insight, onSetLimit, onDismiss }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t, locale } = useI18n();
  const category = t(`home.spending.categories.${insight.category}`);

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.icon}>
        <BulbGlow color={theme.warning} styles={styles} />
        <SymbolView name={HomeIcons.insight} size={IconSize.lg} tintColor={theme.warning} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('home.insight.overspendTitle', { category })}</Text>
          <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('home.insight.dismiss')}>
            <SymbolView name={CommonIcons.close} size={IconSize.sm} tintColor={theme.warning} />
          </Pressable>
        </View>
        <Text style={styles.body}>
          {t('home.insight.overspendBody', {
            amount: formatCompactVND(insight.amount, locale),
            percent: insight.changePercent,
            limit: formatVND(insight.dailyLimit),
          })}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onSetLimit}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{t('home.insight.setLimit')}</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
            <Text style={styles.ghostText}>{t('home.insight.later')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Quầng sáng sau bóng đèn: sáng lên rồi dịu xuống, như "vừa nảy ra một ý".
 * Chỉ đổi độ sáng, không di chuyển; dừng thì giữ ở mức sáng thấp.
 */
function BulbGlow({ color, styles }: { color: string; styles: ReturnType<typeof createStyles> }) {
  const running = useAmbientLoop();
  const { cycle, minOpacity, maxOpacity } = AmbientLoops.bulb;
  const glow = useSharedValue<number>(minOpacity);

  useEffect(() => {
    if (!running) {
      cancelAnimation(glow);
      glow.set(minOpacity);
      return;
    }
    glow.set(
      withRepeat(withTiming(maxOpacity, { duration: cycle / 2, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(glow);
  }, [running, glow, cycle, minOpacity, maxOpacity]);

  const animated = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: color }, animated]} />;
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderRadius: Radius.xxl,
      backgroundColor: theme.warningSoft,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundElement,
      overflow: 'hidden',
    },
    glow: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
    flex: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
    title: { ...Typography.bodyStrong, flex: 1, color: theme.warning },
    body: { ...Typography.callout, color: theme.text, marginTop: 3, lineHeight: 19 },
    actions: { flexDirection: 'row', gap: Spacing.two, marginTop: 10 },
    primary: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: Radius.pill,
      backgroundColor: theme.warning,
    },
    primaryText: { ...Typography.callout, fontWeight: '600', color: theme.warningSoft },
    ghost: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill },
    ghostText: { ...Typography.callout, fontWeight: '600', color: theme.warning },
    pressed: { opacity: 0.7 },
  });
}
