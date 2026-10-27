import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CommonIcons, QuickActionIcons } from '@/constants/icons';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { radialPositions, type Point } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { QuickAction } from '@/models';

const CLOSE_SIZE = 60;
const BUTTON_SIZE = 52;
const ITEM_WIDTH = 88;
const STAGGER = 35;
const CLOSE_DURATION = 180;
const ARC = { startDeg: 160, endDeg: 20, radiusX: 115, radiusY: 150 };
const SPRING: WithSpringConfig = { damping: 16, stiffness: 180, mass: 0.8 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Styles = ReturnType<typeof createStyles>;

export interface QuickActionMenuProps {
  visible: boolean;
  anchor: { x: number; y: number } | null;
  actions: QuickAction[];
  onClose: () => void;
  onSelect: (action: QuickAction) => void;
}

export default function QuickActionMenu({
  visible,
  anchor,
  actions,
  onClose,
  onSelect,
}: QuickActionMenuProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [rendered, setRendered] = useState(visible);
  const progress = useSharedValue(0);
  const closeDuration = CLOSE_DURATION + STAGGER * Math.max(actions.length - 1, 0);

  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, SPRING));
      return;
    }
    progress.set(
      withTiming(0, { duration: closeDuration }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setRendered, false);
      }),
    );
  }, [visible, closeDuration, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.get() * 135}deg` }],
  }));

  if (!anchor || actions.length === 0) return null;

  const positions = radialPositions(actions.length, ARC);

  return (
    <Modal
      transparent
      visible={rendered}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root} onAccessibilityEscape={onClose}>
        <AnimatedPressable
          style={[styles.backdrop, backdropStyle]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('quickActions.closeMenu')}
        />

        {actions.map((action, index) => (
          <ActionItem
            key={action.key}
            action={action}
            index={index}
            count={actions.length}
            open={visible}
            center={anchor}
            offset={positions[index]}
            label={t(`quickActions.${action.key}`)}
            iconColor={theme.primary}
            styles={styles}
            onSelect={onSelect}
          />
        ))}

        <Pressable
          style={[styles.close, { left: anchor.x - CLOSE_SIZE / 2, top: anchor.y - CLOSE_SIZE / 2 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('quickActions.closeMenu')}>
          <Animated.View style={plusStyle}>
            <SymbolView name={CommonIcons.plus} size={28} tintColor={theme.onPrimary} />
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

interface ActionItemProps {
  action: QuickAction;
  index: number;
  count: number;
  open: boolean;
  center: Point;
  offset: Point;
  label: string;
  iconColor: string;
  styles: Styles;
  onSelect: (action: QuickAction) => void;
}

function ActionItem({
  action,
  index,
  count,
  open,
  center,
  offset,
  label,
  iconColor,
  styles,
  onSelect,
}: ActionItemProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      open
        ? withDelay(index * STAGGER, withSpring(1, SPRING))
        : withDelay((count - 1 - index) * STAGGER, withTiming(0, { duration: CLOSE_DURATION })),
    );
  }, [open, index, count, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.5], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: (p - 1) * offset.x },
        { translateY: (p - 1) * offset.y },
        { scale: interpolate(p, [0, 1], [0.3, 1]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.item,
        { left: center.x + offset.x - ITEM_WIDTH / 2, top: center.y + offset.y - BUTTON_SIZE / 2 },
        animatedStyle,
      ]}>
      <Pressable
        disabled={!open}
        onPress={() => onSelect(action)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.itemPressable, pressed && styles.pressed]}>
        <View style={styles.button}>
          <SymbolView
            name={QuickActionIcons[action.key]}
            tintColor={iconColor}
            fallback={<Text style={styles.fallback}>{label.charAt(0)}</Text>}
          />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    item: {
      position: 'absolute',
      width: ITEM_WIDTH,
      transformOrigin: ['50%', BUTTON_SIZE / 2, 0],
    },
    itemPressable: { alignItems: 'center', gap: Spacing.one },
    pressed: { opacity: 0.7 },
    button: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallback: { color: theme.primary, fontSize: 18, fontWeight: '700' },
    label: {
      color: theme.onHero,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    close: {
      position: 'absolute',
      width: CLOSE_SIZE,
      height: CLOSE_SIZE,
      borderRadius: CLOSE_SIZE / 2,
      borderWidth: 4,
      borderColor: theme.background,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
