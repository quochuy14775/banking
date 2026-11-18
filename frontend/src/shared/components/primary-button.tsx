import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, Typography, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.out(Easing.cubic);

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

/** Nút chính nền màu thương hiệu (màu đặc, không gradient); lún nhẹ một lần khi bấm, không nảy. */
export default function PrimaryButton({ label, onPress, loading }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.97, { duration: 120, easing: EASE_OUT }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 240, easing: EASE_OUT }))}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      style={[styles.button, loading && styles.busy, pressStyle]}>
      {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.label}>{label}</Text>}
    </AnimatedPressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    button: {
      borderRadius: Radius.lg,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    busy: { opacity: 0.7 },
    label: { ...Typography.bodyStrong, color: theme.onPrimary },
  });
}
