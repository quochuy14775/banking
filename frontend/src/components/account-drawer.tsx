import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import UserAvatar from '@/components/user-avatar';
import { CommonIcons, ProfileIcons, SettingsIcons, type IconName } from '@/constants/icons';
import { Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConfirmLogout } from '@/hooks/use-confirm-logout';
import { useTheme } from '@/hooks/use-theme';
import { THEME_FADE_DURATION, THEME_FADE_EASING, useThemeTransition } from '@/hooks/use-theme-transition';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import { mockUser } from '@/lib/mockData';
import { useSettings } from '@/lib/settingsStore';
import type { AppLanguage, ThemePreference } from '@/models';

const MAX_WIDTH = 360;
const WIDTH_RATIO = 0.88;
const DURATION = 320;
const EASING = Easing.bezier(0.2, 0.9, 0.3, 1);
const SEGMENT_ITEM = 40;
const SEGMENT_HEIGHT = 30;
const SEGMENT_GAP = 2;
const SEGMENT_PADDING = 3;
const SEGMENT_SPRING: WithSpringConfig = { damping: 18, stiffness: 240, mass: 0.7 };

const LANGUAGES: SegmentOption<AppLanguage>[] = [
  { key: 'vi', label: 'VI', a11yKey: 'languages.vi' },
  { key: 'en', label: 'EN', a11yKey: 'languages.en' },
];

const THEMES: SegmentOption<ThemePreference>[] = [
  { key: 'light', icon: SettingsIcons.light, a11yKey: 'drawer.themeLight' },
  { key: 'dark', icon: SettingsIcons.dark, a11yKey: 'drawer.themeDark' },
  { key: 'system', icon: SettingsIcons.system, a11yKey: 'drawer.themeSystem' },
];

type Styles = ReturnType<typeof createStyles>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

export default function AccountDrawer({ visible, onClose, onOpenProfile }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(MAX_WIDTH, width * WIDTH_RATIO);
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const themeTransition = useThemeTransition(visible);
  const confirmLogout = useConfirmLogout(onClose);
  const profile = user ?? mockUser;

  const [rendered, setRendered] = useState(visible);
  const progress = useSharedValue(0);

  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, { duration: DURATION, easing: EASING }));
      return;
    }
    progress.set(
      withTiming(0, { duration: DURATION - 60, easing: EASING }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setRendered, false);
      }),
    );
  }, [visible, progress]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.get()) * panelWidth }],
  }));

  const isDark = useColorScheme() === 'dark';
  const darkness = useSharedValue(isDark ? 1 : 0);
  useEffect(() => {
    darkness.set(withTiming(isDark ? 1 : 0, { duration: THEME_FADE_DURATION, easing: THEME_FADE_EASING }));
  }, [isDark, darkness]);
  const darkBackgroundStyle = useAnimatedStyle(() => ({ opacity: darkness.get() }));

  const comingSoon = (title: string) => Alert.alert(title, t('common.comingSoon'));

  return (
    <Modal
      transparent
      visible={rendered}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      {visible && <StatusBar style="light" />}
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>

        {themeTransition.overlay}

        <Animated.View style={[styles.panel, { width: panelWidth }, panelStyle]}>
          <LinearGradient
            colors={[Colors.light.drawerStart, Colors.light.drawerMid, Colors.light.drawerEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[StyleSheet.absoluteFill, darkBackgroundStyle]} pointerEvents="none">
            <LinearGradient
              colors={[Colors.dark.drawerStart, Colors.dark.drawerMid, Colors.dark.drawerEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={[styles.circle, styles.circleTop]} pointerEvents="none" />
          <View style={[styles.circle, styles.circleBottom]} pointerEvents="none" />

          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + Spacing.three,
              paddingBottom: insets.bottom + Spacing.four,
              paddingHorizontal: 14,
            }}
            showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <SymbolView name={CommonIcons.close} size={13} tintColor={theme.drawerText} />
            </Pressable>

            <View style={styles.identity}>
              <LinearGradient
                colors={[theme.drawerAccent, theme.drawerAccentAlt, theme.drawerAccent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}>
                <View style={styles.avatarGap}>
                  <UserAvatar user={profile} size={76} surfaceColor={theme.drawerAvatarBg} />
                </View>
              </LinearGradient>
              <Text style={styles.name}>{profile.fullName}</Text>
              <Text style={styles.meta}>
                @{profile.username} · {t('drawer.accountNumber', { account: profile.accountNumber })}
              </Text>
              <View style={styles.chips}>
                <Chip icon={SettingsIcons.qr} label={t('drawer.qr')} onPress={onOpenProfile} styles={styles} theme={theme} />
                <Chip
                  icon={SettingsIcons.profile}
                  label={t('drawer.profile')}
                  onPress={onOpenProfile}
                  styles={styles}
                  theme={theme}
                />
              </View>
            </View>

            <View style={styles.glass}>
              <Row
                icon={SettingsIcons.smartOtp}
                label={t('drawer.smartOtp')}
                onPress={() => comingSoon(t('drawer.smartOtp'))}
                styles={styles}
                theme={theme}>
                <Text style={styles.positive}>{t('drawer.enabled')}</Text>
              </Row>
              <Row
                icon={SettingsIcons.devices}
                label={t('drawer.accessManagement')}
                onPress={() => comingSoon(t('drawer.accessManagement'))}
                styles={styles}
                theme={theme}
                divider>
                <Text style={styles.value}>{t('drawer.devices', { count: 2 })}</Text>
              </Row>
              <Row icon={SettingsIcons.faceId} label={t('drawer.faceId')} styles={styles} theme={theme} divider>
                <Switch
                  value={settings.faceIdEnabled}
                  onValueChange={(faceIdEnabled) => updateSettings({ faceIdEnabled })}
                  trackColor={{ false: theme.drawerTrack, true: theme.drawerAccent }}
                  thumbColor={theme.drawerText}
                  ios_backgroundColor={theme.drawerTrack}
                  accessibilityLabel={t('drawer.faceId')}
                />
              </Row>
              <Row
                icon={SettingsIcons.password}
                label={t('drawer.changePassword')}
                onPress={() => comingSoon(t('drawer.changePassword'))}
                styles={styles}
                theme={theme}
                divider>
                <SymbolView name={CommonIcons.chevronRight} size={13} tintColor={theme.drawerTextMuted} />
              </Row>
            </View>

            <View style={[styles.glass, styles.gap]}>
              <Row icon={SettingsIcons.language} label={t('drawer.language')} styles={styles} theme={theme}>
                <Segment
                  options={LANGUAGES}
                  value={settings.language}
                  onChange={(language) => updateSettings({ language })}
                  styles={styles}
                  theme={theme}
                />
              </Row>
            </View>

            <View style={[styles.glass, styles.gap]}>
              <Row icon={SettingsIcons.theme} label={t('drawer.theme')} styles={styles} theme={theme}>
                <Segment
                  options={THEMES}
                  value={themeTransition.selectedTheme}
                  onChange={themeTransition.changeTheme}
                  styles={styles}
                  theme={theme}
                />
              </Row>
            </View>

            <Pressable
              onPress={confirmLogout}
              accessibilityRole="button"
              style={({ pressed }) => [styles.logoutWrap, pressed && styles.pressed]}>
              <LinearGradient
                colors={[theme.logoutStart, theme.logoutEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logout}>
                <SymbolView name={ProfileIcons.logout} size={17} tintColor={theme.drawerText} />
                <Text style={styles.logoutText}>{t('common.logout')}</Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.version}>
              {t('drawer.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ChipProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: Styles;
  theme: ThemeColors;
}

function Chip({ icon, label, onPress, styles, theme }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <SymbolView name={icon} size={14} tintColor={theme.drawerText} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

interface RowProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  divider?: boolean;
  styles: Styles;
  theme: ThemeColors;
  children: ReactNode;
}

function Row({ icon, label, onPress, divider, styles, theme, children }: RowProps) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <SymbolView name={icon} size={17} tintColor={theme.drawerText} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </>
  );
  if (!onPress) return <View style={[styles.row, divider && styles.divider]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.rowPressed]}>
      {content}
    </Pressable>
  );
}

interface SegmentOption<T extends string> {
  key: T;
  label?: string;
  icon?: IconName;
  a11yKey: TranslationKey;
}

interface SegmentProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  styles: Styles;
  theme: ThemeColors;
}

function Segment<T extends string>({ options, value, onChange, styles, theme }: SegmentProps<T>) {
  const { t } = useI18n();
  const index = Math.max(options.findIndex((o) => o.key === value), 0);
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(withSpring(index, SEGMENT_SPRING));
  }, [index, position]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * (SEGMENT_ITEM + SEGMENT_GAP) }],
  }));

  function select(key: T) {
    if (key === value) return;
    void Haptics.selectionAsync();
    onChange(key);
  }

  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
      {options.map((option, i) => (
        <Pressable
          key={option.key}
          onPress={() => select(option.key)}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.key === value }}
          accessibilityLabel={t(option.a11yKey)}
          style={({ pressed }) => [styles.segmentItem, pressed && styles.segmentPressed]}>
          <SegmentLayer option={option} index={i} position={position} active={false} styles={styles} theme={theme} />
          <SegmentLayer option={option} index={i} position={position} active styles={styles} theme={theme} />
        </Pressable>
      ))}
    </View>
  );
}

interface SegmentLayerProps<T extends string> {
  option: SegmentOption<T>;
  index: number;
  position: SharedValue<number>;
  active: boolean;
  styles: Styles;
  theme: ThemeColors;
}

// Hai lớp chồng nhau (màu thường và màu đang chọn) mờ dần theo vị trí nền trượt, nên màu đổi mượt thay vì nhảy.
function SegmentLayer<T extends string>({ option, index, position, active, styles, theme }: SegmentLayerProps<T>) {
  const layerStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(position.get() - index), 1);
    return { opacity: active ? 1 - distance : distance };
  });
  const color = active ? theme.drawerIndicatorText : theme.drawerTextMuted;

  return (
    <Animated.View style={[styles.segmentLayer, layerStyle]} pointerEvents="none">
      {option.icon ? (
        <SymbolView name={option.icon} size={15} tintColor={color} />
      ) : (
        <Text style={[styles.segmentText, { color }]}>{option.label}</Text>
      )}
    </Animated.View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    fill: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    panel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      borderTopLeftRadius: 32,
      borderBottomLeftRadius: 32,
    },
    circle: { position: 'absolute', backgroundColor: theme.drawerText },
    circleTop: { width: 260, height: 260, borderRadius: 130, top: -110, right: -90, opacity: 0.08 },
    circleBottom: { width: 180, height: 180, borderRadius: 90, bottom: 80, left: -90, opacity: 0.06 },
    close: {
      alignSelf: 'flex-end',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.drawerIconBg,
    },
    pressed: { opacity: 0.7 },
    identity: { alignItems: 'center', marginBottom: Spacing.four },
    avatarRing: { padding: 3, borderRadius: 44 },
    avatarGap: { padding: 3, borderRadius: 41, backgroundColor: theme.drawerStart },
    name: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: theme.drawerText, marginTop: 10 },
    meta: { fontSize: 13, lineHeight: 18, color: theme.drawerTextMuted, marginTop: 2, textAlign: 'center' },
    chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: theme.drawerGlass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.drawerGlassBorder,
    },
    chipText: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: theme.drawerText },
    glass: {
      borderRadius: 18,
      backgroundColor: theme.drawerGlass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.drawerGlassBorder,
      overflow: 'hidden',
    },
    gap: { marginTop: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 },
    rowPressed: { backgroundColor: theme.drawerGlass },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.drawerGlassBorder },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.drawerIconBg,
    },
    rowLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '500', color: theme.drawerText },
    value: { fontSize: 13, lineHeight: 18, color: theme.drawerTextMuted },
    positive: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: theme.drawerPositive },
    segment: {
      flexDirection: 'row',
      gap: SEGMENT_GAP,
      padding: SEGMENT_PADDING,
      borderRadius: 13,
      backgroundColor: theme.drawerTrack,
    },
    segmentIndicator: {
      position: 'absolute',
      top: SEGMENT_PADDING,
      left: SEGMENT_PADDING,
      width: SEGMENT_ITEM,
      height: SEGMENT_HEIGHT,
      borderRadius: 10,
      backgroundColor: theme.drawerIndicator,
    },
    segmentItem: { width: SEGMENT_ITEM, height: SEGMENT_HEIGHT },
    segmentPressed: { transform: [{ scale: 0.92 }] },
    segmentLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    segmentText: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
    logoutWrap: { marginTop: Spacing.four, borderRadius: 16, overflow: 'hidden' },
    logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50 },
    logoutText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: theme.drawerText },
    version: { fontSize: 12, lineHeight: 16, color: theme.drawerTextMuted, textAlign: 'center', marginTop: 12 },
  });
}
