import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, type PressableInstance, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import QuickActionMenu from '@/components/quick-action-menu';
import { CommonIcons, TabBarIcons, type IconName } from '@/constants/icons';
import type { ThemeColors } from '@/constants/theme';
import { useQuickActions } from '@/hooks/use-quick-actions';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';

const BAR_HEIGHT = 64;
const BAR_SIDE = 20;
// Phải khớp nút đóng 60px mà QuickActionMenu vẽ đè lên FAB tại anchor.
const FAB_SIZE = 60;
const FAB_OVERHANG = 12;

type Styles = ReturnType<typeof createStyles>;

export default function AppTabs() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const actions = useQuickActions();
  const fabRef = useRef<PressableInstance>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const barBottom = Math.max(insets.bottom - 6, 14);

  const openMenu = () => {
    if (actions.length === 0) return;
    fabRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x: x + width / 2, y: y + height / 2 });
      setMenuVisible(true);
    });
  };

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />

      <TabList accessibilityRole="tablist" style={[styles.bar, { marginBottom: barBottom }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton
            icon={TabBarIcons.home.default}
            activeIcon={TabBarIcons.home.active}
            styles={styles}>
            {t('tabs.home')}
          </TabButton>
        </TabTrigger>
        <View style={styles.fabSpace} />
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton
            icon={TabBarIcons.profile.default}
            activeIcon={TabBarIcons.profile.active}
            styles={styles}>
            {t('tabs.profile')}
          </TabButton>
        </TabTrigger>
      </TabList>

      <Pressable
        ref={fabRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t('tabs.openQuickActions')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: barBottom + BAR_HEIGHT + FAB_OVERHANG - FAB_SIZE },
          pressed && styles.fabPressed,
        ]}>
        <SymbolView name={CommonIcons.plus} size={28} tintColor={theme.onPrimary} />
      </Pressable>

      <QuickActionMenu
        visible={menuVisible}
        anchor={anchor}
        actions={actions}
        onClose={() => setMenuVisible(false)}
        onSelect={(action) => {
          setMenuVisible(false);
          Alert.alert(t(`quickActions.${action.key}`), t('common.comingSoon'));
        }}
      />
    </Tabs>
  );
}

// `ref` của TabTriggerSlotProps bị type theo `View` (không khớp ref của Pressable) nên bỏ đi.
type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & {
  icon: IconName;
  activeIcon: IconName;
  styles: Styles;
};

function TabButton({ icon, activeIcon, styles, isFocused, children, ...props }: TabButtonProps) {
  const theme = useTheme();
  const focus = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focus.set(withTiming(isFocused ? 1 : 0, { duration: 220 }));
  }, [isFocused, focus]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: focus.get(),
    transform: [{ scaleX: interpolate(focus.get(), [0, 1], [0.4, 1]) }],
  }));

  const color = isFocused ? theme.primary : theme.textMuted;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        <SymbolView name={isFocused ? activeIcon : icon} size={22} tintColor={color} />
      </View>
      <Text style={[styles.label, { color }, isFocused && styles.labelActive]} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    slot: { flex: 1 },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: BAR_HEIGHT,
      marginHorizontal: BAR_SIDE,
      paddingHorizontal: 8,
      borderRadius: BAR_HEIGHT / 2,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      boxShadow: theme.tabBarShadow,
    },
    tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
    tabPressed: { opacity: 0.7 },
    iconWrap: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
    indicator: { ...StyleSheet.absoluteFill, borderRadius: 15, backgroundColor: theme.primarySoft },
    label: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
    labelActive: { fontWeight: '700' },
    fabSpace: { width: FAB_SIZE + 24 },
    fab: {
      position: 'absolute',
      alignSelf: 'center',
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      borderWidth: 4,
      borderColor: theme.background,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.fabShadow,
    },
    fabPressed: { transform: [{ scale: 0.94 }] },
  });
}
