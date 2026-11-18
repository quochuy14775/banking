import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommonIcons, LoginIcons, TransferIcons } from '@/constants/icons';
import { Radius, Spacing, Typography, IconSize } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useI18n } from '@/i18n';

const OVAL_WIDTH = 240;
const OVAL_HEIGHT = 310;
const SCAN_MS = 2200;
const LINE_MS = 1400;
const SUCCESS_HOLD_MS = 700;

// Màn quét luôn trên nền camera tối nên dùng màu cố định thay vì theo theme.
const ON_CAMERA = '#FFFFFF';
const ON_CAMERA_MUTED = 'rgba(255, 255, 255, 0.72)';
const SCRIM = 'rgba(5, 12, 10, 0.6)';

type Phase = 'scanning' | 'success';

interface Props {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * MÔ PHỎNG Face ID cho bản demo (Expo Go / web, nơi Face ID thật không chạy):
 * bật camera trước, quét vài giây rồi báo thành công. Không nhận diện khuôn mặt thật.
 * Chỉ được mở khi `__DEV__`; bản build thật dùng Face ID của hệ điều hành.
 */
export default function FaceScanModal({ visible, onSuccess, onCancel }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [wasVisible, setWasVisible] = useState(visible);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const line = useSharedValue(0);
  // Giữ callback mới nhất mà không làm effect quét chạy lại khi cha render lại.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Mỗi lần mở lại thì quét lại từ đầu.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPhase('scanning');
  }

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible) return;
    line.set(0);
    line.set(withRepeat(withTiming(1, { duration: LINE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    timers.current.push(
      setTimeout(() => {
        cancelAnimation(line);
        setPhase('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timers.current.push(setTimeout(() => onSuccessRef.current(), SUCCESS_HOLD_MS));
      }, SCAN_MS),
    );
    const pending = timers.current;
    return () => {
      cancelAnimation(line);
      pending.forEach(clearTimeout);
      timers.current = [];
    };
  }, [visible, line]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: line.get() * (OVAL_HEIGHT - 40) }],
  }));

  const success = phase === 'success';
  const ringColor = success ? theme.success : theme.scoreStart;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        {permission?.granted && <CameraView style={StyleSheet.absoluteFill} facing="front" />}
        {/* Modal là cửa sổ native riêng nên dùng insets thủ công thay cho SafeAreaView. */}
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <SymbolView name={CommonIcons.close} size={IconSize.lg} tintColor={ON_CAMERA} />
            </Pressable>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('login.faceScan.simulated')}</Text>
            </View>
          </View>

          <View style={styles.center}>
            <View style={[styles.oval, { borderColor: ringColor }]}>
              {!permission?.granted && (
                <SymbolView name={LoginIcons.faceId} size={96} tintColor={ON_CAMERA_MUTED} />
              )}
              {!success && (
                <Animated.View style={[styles.scanLine, { backgroundColor: ringColor }, lineStyle]} />
              )}
              {success && (
                <Animated.View entering={ZoomIn.duration(240)} style={[styles.check, { backgroundColor: theme.success }]}>
                  <SymbolView name={TransferIcons.check} size={IconSize.badge} tintColor={ON_CAMERA} />
                </Animated.View>
              )}
            </View>
            <Animated.Text key={phase} entering={FadeIn.duration(200)} style={styles.title} role="alert">
              {success ? t('login.faceScan.success') : t('login.faceScan.scanning')}
            </Animated.Text>
            <Text style={styles.hint}>{t('login.faceScan.hint')}</Text>
          </View>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{t('login.faceScan.usePassword')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, backgroundColor: SCRIM, justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  badgeText: { ...Typography.caption, color: ON_CAMERA, fontWeight: '700' },
  center: { alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  oval: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    height: 3,
    borderRadius: 2,
  },
  check: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.heading, color: ON_CAMERA },
  hint: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center' },
  cancel: { alignSelf: 'center', paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, marginBottom: Spacing.three },
  cancelText: { ...Typography.bodyStrong, color: ON_CAMERA },
});
