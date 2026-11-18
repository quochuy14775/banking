import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import AppLogo from '@/shared/components/app-logo';
import { CommonIcons } from '@/constants/icons';
import { useI18n } from '@/i18n';
import { Colors, MaxContentWidth, Spacing, IconSize } from '@/constants/theme';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Màn toàn trang thì ẩn thanh tab (vẫn render để route ẩn hoạt động).
const FULL_SCREEN_ROUTES = ['/transfer', '/qr', '/bills', '/kyc', '/smart-otp', '/history', '/statement'];

export default function AppTabs() {
  const { t } = useI18n();
  const hidden = FULL_SCREEN_ROUTES.includes(usePathname());
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList style={hidden ? styles.hidden : undefined}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{t('tabs.home')}</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>{t('tabs.profile')}</TabButton>
          </TabTrigger>
          <TabTrigger name="transfer" href="/transfer" />
          <TabTrigger name="qr" href="/qr" />
          <TabTrigger name="bills" href="/bills" />
          <TabTrigger name="kyc" href="/kyc" />
          <TabTrigger name="smart-otp" href="/smart-otp" />
          <TabTrigger name="history" href="/history" />
          <TabTrigger name="statement" href="/statement" />
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// `ref` của TabTriggerSlotProps bị type theo `View`, không khớp ref của Pressable.
export function TabButton({ children, isFocused, ...props }: Omit<TabTriggerSlotProps, 'ref'>) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { t } = useI18n();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={[styles.tabListContainer, props.style]}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <View style={styles.brand}>
          <AppLogo size={24} />
          <ThemedText type="smallBold">{t('common.appName')}</ThemedText>
        </View>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={colors.text}
              name={CommonIcons.externalLink}
              size={IconSize.xs}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  hidden: { display: 'none' },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
