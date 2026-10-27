import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { NotificationIcons } from '@/constants/icons';
import type { ThemeColors } from '@/constants/theme';
import { formatBadgeCount } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';

const SIZE = 40;
const RIPPLE_DURATION = 1800;
const RIPPLE_GAP = 700;
const RING_STEP = 160;
const RING_REST = 800;
const RING_ANGLE = 12;

interface Props {
  count: number;
  onPress: () => void;
}

export default function NotificationBell({ count, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const active = count > 0;
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      [wave1, wave2, ring].forEach((value) => {
        cancelAnimation(value);
        value.set(0);
      });
      return;
    }
    const ripple = () =>
      withRepeat(
        withTiming(1, { duration: RIPPLE_DURATION, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
        -1,
        false,
      );
    const swing = (deg: number) =>
      withTiming(deg, { duration: RING_STEP, easing: Easing.inOut(Easing.ease) });

    wave1.set(ripple());
    wave2.set(withDelay(RIPPLE_GAP, ripple()));
    ring.set(
      withRepeat(
        withSequence(
          swing(-RING_ANGLE),
          swing(RING_ANGLE),
          swing(-RING_ANGLE),
          swing(RING_ANGLE),
          swing(0),
          withTiming(0, { duration: RING_REST }),
        ),
        -1,
        false,
      ),
    );
  }, [active, wave1, wave2, ring]);

  const wave1Style = useRippleStyle(wave1);
  const wave2Style = useRippleStyle(wave2);
  const bellStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring.get()}deg` }] }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={active ? t('notifications.bellUnread', { count }) : t('notifications.bell')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {active && (
        <>
          <Animated.View pointerEvents="none" style={[styles.ripple, wave1Style]} />
          <Animated.View pointerEvents="none" style={[styles.ripple, wave2Style]} />
        </>
      )}
      <Animated.View style={[styles.bell, bellStyle]}>
        <SymbolView
          name={NotificationIcons.bell}
          size={22}
          tintColor={theme.text}
        />
      </Animated.View>
      {active && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatBadgeCount(count)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function useRippleStyle(progress: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.6, 2.4]) }],
  }));
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { backgroundColor: theme.backgroundSelected },
    ripple: { ...StyleSheet.absoluteFill, borderRadius: SIZE / 2, backgroundColor: theme.notifyRipple },
    bell: { transformOrigin: ['50%', 0, 0] },
    badge: {
      position: 'absolute',
      top: 1,
      right: 1,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.background,
      backgroundColor: theme.notify,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: theme.onNotify, fontSize: 10, lineHeight: 12, fontWeight: '600' },
  });
}
