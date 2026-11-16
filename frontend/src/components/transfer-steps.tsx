import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { TransferIcons } from '@/constants/icons';
import { Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';

export const TRANSFER_STEPS = ['form', 'confirm', 'otp', 'success'] as const;
export type TransferStep = (typeof TRANSFER_STEPS)[number];

const DOT_SIZE = 26;
const HALO_SIZE = DOT_SIZE + 8;
const LINE_MS = 360;
const BREATH_MS = 1200;
const EASE_OUT = Easing.out(Easing.cubic);

type Styles = ReturnType<typeof createStyles>;

export default function TransferSteps({ current }: { current: TransferStep }) {
  const styles = useThemedStyles(createStyles);
  const currentIndex = TRANSFER_STEPS.indexOf(current);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: TRANSFER_STEPS.length, now: currentIndex + 1 }}>
      {TRANSFER_STEPS.map((step, i) => (
        <StepItem
          key={step}
          step={step}
          index={i}
          done={i < currentIndex}
          active={i === currentIndex}
          last={i === TRANSFER_STEPS.length - 1}
          styles={styles}
        />
      ))}
    </View>
  );
}

function StepItem({
  step,
  index,
  done,
  active,
  last,
  styles,
}: {
  step: TransferStep;
  index: number;
  done: boolean;
  active: boolean;
  last: boolean;
  styles: Styles;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  // 0 = chưa tới, 1 = đang ở bước này, 2 = đã xong.
  const state = useSharedValue(done ? 2 : active ? 1 : 0);
  const fill = useSharedValue(done ? 1 : 0);
  const breath = useSharedValue(0);
  // Đoạn nối ngay sau bước hiện tại "thở" để báo đang chờ người dùng hoàn tất bước này.
  const breathing = active && !last;

  useEffect(() => {
    state.set(withTiming(done ? 2 : active ? 1 : 0, { duration: 240, easing: EASE_OUT }));
    fill.set(withTiming(done ? 1 : 0, { duration: LINE_MS, easing: EASE_OUT }));
  }, [done, active, state, fill]);

  useEffect(() => {
    if (!breathing) {
      cancelAnimation(breath);
      breath.set(withTiming(0, { duration: 200 }));
      return;
    }
    breath.set(0);
    breath.set(withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(breath);
  }, [breathing, breath]);

  const breathStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.get(), [0, 1], [0, 0.6]),
    transform: [{ scaleX: interpolate(breath.get(), [0, 1], [0.35, 1]) }],
  }));

  const dotStyle = useAnimatedStyle(() => {
    const s = state.get();
    return {
      borderColor: interpolateColor(s, [0, 1, 2], [theme.border, theme.primary, theme.primary]),
      backgroundColor: interpolateColor(s, [0, 1, 2], [
        theme.backgroundElement,
        theme.primarySoft,
        theme.primary,
      ]),
    };
  });

  // Không scale chính vòng tròn (viền bị răng cưa khi scale); bước hiện tại có quầng sáng phía sau.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(state.get(), [0, 1, 2], [0, 1, 0]),
  }));

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));

  return (
    <View style={[styles.item, !last && styles.flex]}>
      <View style={styles.node}>
        <View style={styles.dotWrap}>
        <Animated.View style={[styles.halo, haloStyle]} pointerEvents="none" />
        <Animated.View style={[styles.dot, dotStyle]}>
          {done ? (
            <Animated.View key="done" entering={ZoomIn.duration(240).easing(EASE_OUT)}>
              <SymbolView name={TransferIcons.check} size={IconSize.sm} tintColor={theme.onPrimary} />
            </Animated.View>
          ) : (
            <Text style={[styles.dotText, active && styles.dotTextActive]}>{index + 1}</Text>
          )}
        </Animated.View>
        </View>
        <Text style={[styles.label, (done || active) && styles.labelActive]} numberOfLines={1}>
          {t(`transfer.steps.${step}`)}
        </Text>
      </View>
      {!last && (
        <View style={styles.line}>
          <Animated.View style={[styles.lineBreath, breathStyle]} />
          <Animated.View style={[styles.lineFill, fillStyle]} />
        </View>
      )}
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    item: { flexDirection: 'row', alignItems: 'flex-start' },
    flex: { flex: 1 },
    node: { alignItems: 'center', gap: Spacing.one, minWidth: 56 },
    dotWrap: { width: HALO_SIZE, height: HALO_SIZE, alignItems: 'center', justifyContent: 'center' },
    halo: {
      position: 'absolute',
      width: HALO_SIZE,
      height: HALO_SIZE,
      borderRadius: HALO_SIZE / 2,
      backgroundColor: theme.primarySoft,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotText: { ...Typography.micro, color: theme.textMuted, fontWeight: '700' },
    dotTextActive: { color: theme.primary },
    label: { ...Typography.micro, color: theme.textMuted },
    labelActive: { color: theme.text, fontWeight: '600' },
    line: {
      flex: 1,
      height: 2,
      borderRadius: 1,
      marginTop: HALO_SIZE / 2 - 1,
      marginHorizontal: -Spacing.two,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    lineFill: { ...StyleSheet.absoluteFill, backgroundColor: theme.primary, transformOrigin: 'left' },
    lineBreath: { ...StyleSheet.absoluteFill, backgroundColor: theme.primary, transformOrigin: 'left' },
  });
}
