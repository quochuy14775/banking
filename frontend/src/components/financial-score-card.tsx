import { SymbolView } from 'expo-symbols';
import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { FinancialHealthIcons } from '@/constants/icons';
import { AmbientLoops } from '@/constants/motion';
import { Spacing, type ThemeColors, IconSize } from '@/constants/theme';
import { getHealthStatus, getScoreChange, getScoreDirection } from '@/helpers';
import { useAmbientLoop } from '@/hooks/use-ambient-loop';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n, type Translate } from '@/i18n';
import type { FinancialHealth, FinancialHealthStatus, FinancialHealthTrendPoint } from '@/models';

const RING_SIZE = 76;
const VIEW = 112;
const CENTER = VIEW / 2;
const RADIUS = 46;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FILL_DURATION = 1200;
const CHART_HEIGHT = 56;
const CHART_PAD = 6;
const LABEL_WIDTH = 32;

const TREND_ICONS = {
  up: FinancialHealthIcons.trendUp,
  down: FinancialHealthIcons.trendDown,
  flat: FinancialHealthIcons.trendFlat,
};

type ColorKey = keyof ThemeColors;

const STATUS_COLORS: Record<FinancialHealthStatus, { bg: ColorKey; fg: ColorKey }> = {
  good: { bg: 'successSoft', fg: 'success' },
  average: { bg: 'warningSoft', fg: 'warning' },
  poor: { bg: 'dangerSoft', fg: 'danger' },
};

function describeChange(change: number, t: Translate): string {
  if (change > 0) return t('financialHealth.changeUp', { count: change });
  if (change < 0) return t('financialHealth.changeDown', { count: Math.abs(change) });
  return t('financialHealth.changeFlat');
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Styles = ReturnType<typeof createStyles>;

interface Props {
  data: FinancialHealth;
  onPress: () => void;
}

export default function FinancialScoreCard({ data, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const statusKey = getHealthStatus(data.score, data.maxScore);
  const statusColors = STATUS_COLORS[statusKey];
  const statusLabel = t(`financialHealth.status.${statusKey}`);
  const change = getScoreChange(data.trend);
  const direction = getScoreDirection(change);
  const changeText = describeChange(change, t);
  const changeColor =
    direction === 'up' ? theme.success : direction === 'down' ? theme.danger : theme.textSecondary;
  const first = data.trend[0];
  const last = data.trend[data.trend.length - 1];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('financialHealth.summary', {
        score: data.score,
        max: data.maxScore,
        status: statusLabel,
        change: changeText,
      })} ${data.message}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <ScoreRing score={data.score} maxScore={data.maxScore} theme={theme} styles={styles} />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('financialHealth.title')}</Text>
            <View style={[styles.pill, { backgroundColor: theme[statusColors.bg] }]}>
              <Text style={[styles.pillText, { color: theme[statusColors.fg] }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.changeRow}>
            <SymbolView name={TREND_ICONS[direction]} size={IconSize.sm} tintColor={changeColor} />
            <Text style={[styles.change, { color: changeColor }]}>{changeText}</Text>
          </View>
          {data.percentile !== undefined && (
            <Text style={styles.percentile}>
              {t('financialHealth.percentile', { percent: data.percentile })}
            </Text>
          )}
        </View>
      </View>

      {first && last && data.trend.length > 1 && (
        <View style={styles.trendBox}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTitle}>
              {t('financialHealth.trend', { count: data.trend.length })}
            </Text>
            <Text style={styles.trendRange}>
              {first.score} → {last.score}
            </Text>
          </View>
          <TrendChart points={data.trend} theme={theme} styles={styles} />
        </View>
      )}

      <View style={styles.chips}>
        {data.checklist.map((item) => (
          <View
            key={item.label}
            style={[styles.chip, { backgroundColor: item.ok ? theme.successSoft : theme.warningSoft }]}>
            <SymbolView
              name={item.ok ? FinancialHealthIcons.ok : FinancialHealthIcons.warning}
              size={IconSize.sm}
              tintColor={item.ok ? theme.success : theme.warning}
            />
            <Text style={[styles.chipText, { color: item.ok ? theme.success : theme.warning }]}>
              {item.shortLabel}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

interface TrendChartProps {
  points: FinancialHealthTrendPoint[];
  theme: ThemeColors;
  styles: Styles;
}

function TrendChart({ points, theme, styles }: TrendChartProps) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores);
  const span = Math.max(Math.max(...scores) - min, 1);
  const lastIndex = points.length - 1;
  const x = (i: number) => CHART_PAD + (i * (width - CHART_PAD * 2)) / lastIndex;
  const y = (v: number) => CHART_PAD + (1 - (v - min) / span) * (CHART_HEIGHT - CHART_PAD * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
  const area = `${line} L${x(lastIndex).toFixed(1)} ${CHART_HEIGHT} L${x(0).toFixed(1)} ${CHART_HEIGHT} Z`;

  return (
    <View
      style={styles.trendChart}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={t('financialHealth.trendSummary', {
        points: points.map((p) => `${p.label} ${p.score}`).join(', '),
      })}>
      {width > 0 && (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.scoreStart} stopOpacity={0.35} />
                <Stop offset="1" stopColor={theme.scoreStart} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill={`url(#area${id})`} />
            <Path
              d={line}
              fill="none"
              stroke={theme.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <Circle
                key={p.label}
                cx={x(i)}
                cy={y(p.score)}
                r={i === lastIndex ? 5 : 3}
                fill={i === lastIndex ? theme.scoreEnd : theme.backgroundElement}
                stroke={theme.primary}
                strokeWidth={2}
              />
            ))}
          </Svg>
          <View style={styles.trendLabels}>
            {points.map((p, i) => (
              <Text
                key={p.label}
                style={[
                  styles.trendLabel,
                  { left: x(i) - LABEL_WIDTH / 2 },
                  i === lastIndex && styles.trendLabelActive,
                ]}>
                {p.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function useCountUp(target: number, duration = FILL_DURATION) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

interface RingProps {
  score: number;
  maxScore: number;
  theme: ThemeColors;
  styles: Styles;
}

function ScoreRing({ score, maxScore, theme, styles }: RingProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ratio = maxScore > 0 ? Math.min(Math.max(score / maxScore, 0), 1) : 0;
  const tipAngle = ratio * 2 * Math.PI;
  const tipX = CENTER + RADIUS * Math.cos(tipAngle);
  const tipY = CENTER + RADIUS * Math.sin(tipAngle);
  const display = useCountUp(score);

  const fill = useSharedValue(0);
  const beat = useSharedValue(0);
  const running = useAmbientLoop();

  useEffect(() => {
    fill.set(withTiming(ratio, { duration: FILL_DURATION, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [ratio, fill]);

  // Nhịp tim ở đầu cung điểm: đập hai nhịp "thình thịch" rồi nghỉ ~2/3 chu kỳ. Dừng thì đứng yên.
  useEffect(() => {
    if (!running) {
      cancelAnimation(beat);
      beat.set(0);
      return;
    }
    const { cycle, firstBeat, secondBeat } = AmbientLoops.heartbeat;
    const step = cycle * 0.08;
    const ease = Easing.out(Easing.cubic);
    beat.set(
      withRepeat(
        withSequence(
          withTiming(firstBeat, { duration: step, easing: ease }),
          withTiming(0, { duration: step, easing: ease }),
          withTiming(secondBeat, { duration: step, easing: ease }),
          withTiming(0, { duration: step, easing: ease }),
          withTiming(0, { duration: cycle - step * 4 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(beat);
  }, [running, beat]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - fill.get()),
  }));

  // Chấm đầu cung nở ra theo nhịp, kèm một quầng mờ lan ra rồi tan.
  const tipProps = useAnimatedProps(() => ({ r: 4 + 1.6 * beat.get() }));
  const pingProps = useAnimatedProps(() => ({
    r: 5 + 6 * beat.get(),
    opacity: 0.35 * beat.get(),
  }));

  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${VIEW} ${VIEW}`} style={styles.ringSvg}>
        <Defs>
          <LinearGradient id={`fill${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.scoreStart} />
            <Stop offset="1" stopColor={theme.scoreEnd} />
          </LinearGradient>
        </Defs>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={theme.scoreTrack} strokeWidth={STROKE} />
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`url(#fill${id})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
          animatedProps={arcProps}
        />
        <AnimatedCircle cx={tipX} cy={tipY} fill={theme.scoreEnd} animatedProps={pingProps} />
        <AnimatedCircle
          cx={tipX}
          cy={tipY}
          fill={theme.backgroundElement}
          stroke={theme.scoreEnd}
          strokeWidth={2}
          animatedProps={tipProps}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.score}>{display}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: 14,
      borderRadius: 24,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    pressed: { transform: [{ scale: 0.985 }] },
    top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    flex: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
    title: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: theme.text },
    pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    pillText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
    changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    change: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
    percentile: { fontSize: 12, lineHeight: 16, marginTop: 2, color: theme.textMuted },
    trendBox: {
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.backgroundMuted,
    },
    trendHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    trendTitle: { fontSize: 12, lineHeight: 16, color: theme.textMuted },
    trendRange: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: theme.primary },
    trendChart: { height: CHART_HEIGHT + 18 },
    trendLabels: { height: 16, marginTop: 2 },
    trendLabel: {
      position: 'absolute',
      width: LABEL_WIDTH,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 14,
      color: theme.textMuted,
    },
    trendLabelActive: { fontWeight: '600', color: theme.text },
    ring: { width: RING_SIZE, height: RING_SIZE },
    ringSvg: { transform: [{ rotate: '-90deg' }] },
    ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    score: { fontSize: 22, lineHeight: 26, fontWeight: '700', color: theme.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  });
}
