import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QrIcons, TransferIcons, type IconName } from '@/constants/icons';
import { Radius, Spacing, Typography, IconSize } from '@/constants/theme';
import { parseVietQr } from '@/helpers';
import { useTheme } from '@/shared/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getBankByBin } from '@/services/bank.service';
import { getDemoQrPayload } from '@/services/transfer.service';

const FRAME = 248;
const CORNER = 34;
const CORNER_WIDTH = 4;
const SCAN_LINE_MS = 1800;
const RETRY_DELAY_MS = 1500;

// Màn quét luôn trên nền camera tối nên dùng màu cố định thay vì theo theme.
const ON_CAMERA = '#FFFFFF';
const ON_CAMERA_MUTED = 'rgba(255, 255, 255, 0.72)';
const GLASS = 'rgba(255, 255, 255, 0.16)';
const SCRIM = 'rgba(0, 0, 0, 0.35)';

export default function QrScanScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const pathname = usePathname();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  // Khoá để mỗi lần quét chỉ xử lý một mã (camera bắn sự kiện liên tục).
  const handling = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tab giữ màn hình luôn mounted; chỉ bật camera khi đang ở màn này.
  const active = pathname === '/qr';
  const cameraReady = active && !!permission?.granted;

  useFocusEffect(
    useCallback(() => {
      handling.current = false;
      setError('');
      return () => {
        setTorch(false);
        if (retryTimer.current) clearTimeout(retryTimer.current);
      };
    }, []),
  );

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    retryTimer.current = setTimeout(() => {
      handling.current = false;
    }, RETRY_DELAY_MS);
  };

  const handleData = async (data: string) => {
    if (handling.current) return;
    handling.current = true;
    const qr = parseVietQr(data);
    if (!qr) {
      fail(t('qr.errors.invalid'));
      return;
    }
    const bank = await getBankByBin(qr.bin);
    if (!bank) {
      fail(t('qr.errors.unsupportedBank'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate({
      pathname: '/transfer',
      params: {
        // Mỗi lần quét một id mới để màn Chuyển khoản biết cần điền lại.
        qrId: String(Date.now()),
        bankCode: bank.code,
        account: qr.accountNumber,
        amount: qr.amount ? String(qr.amount) : '',
        note: qr.note ?? '',
        name: qr.name ?? '',
      },
    });
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    setReadingImage(true);
    setError('');
    try {
      const found = await scanFromURLAsync(result.assets[0].uri, ['qr']);
      setReadingImage(false);
      handling.current = false;
      if (found.length === 0) {
        fail(t('qr.errors.noQrInImage'));
        return;
      }
      await handleData(found[0].data);
    } catch {
      setReadingImage(false);
      fail(t('qr.errors.imageFailed'));
    }
  };

  const applySample = () => {
    handling.current = false;
    handleData(getDemoQrPayload());
  };

  return (
    <View style={styles.root}>
      {cameraReady && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleData(data)}
        />
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <GlassButton
            icon={TransferIcons.back}
            label={t('transfer.back')}
            onPress={() => router.navigate('/')}
          />
          <Text style={styles.title} accessibilityRole="header">
            {t('qr.title')}
          </Text>
          {cameraReady ? (
            <GlassButton
              icon={torch ? QrIcons.torchOff : QrIcons.torch}
              label={t(torch ? 'qr.torchOff' : 'qr.torchOn')}
              onPress={() => setTorch((v) => !v)}
              active={torch}
            />
          ) : (
            <View style={styles.buttonSpace} />
          )}
        </View>

        <View style={styles.center}>
          {permission && !permission.granted ? (
            <View style={styles.permission}>
              <SymbolView name={QrIcons.camera} size={IconSize.hero} tintColor={ON_CAMERA} />
              <Text style={styles.permissionTitle}>{t('qr.permissionTitle')}</Text>
              <Text style={styles.permissionText}>{t('qr.permissionMessage')}</Text>
              <Pressable
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
                style={({ pressed }) => [styles.permissionButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
                <Text style={[styles.permissionButtonText, { color: theme.onPrimary }]}>
                  {t(permission.canAskAgain ? 'qr.permissionAllow' : 'qr.permissionSettings')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScanFrame running={cameraReady && !readingImage} color={theme.scoreStart} />
              <Text style={styles.hint}>{readingImage ? t('qr.scanningImage') : t('qr.hint')}</Text>
              {readingImage && <ActivityIndicator color={ON_CAMERA} />}
            </>
          )}

          {error !== '' && (
            <Animated.View
              key={error}
              entering={FadeInUp.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[styles.error, { backgroundColor: theme.danger }]}>
              <Text style={styles.errorText} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.actions}>
          <ActionButton icon={QrIcons.photo} label={t('qr.library')} onPress={pickFromLibrary} disabled={readingImage} />
          <ActionButton icon={QrIcons.sample} label={t('qr.sample')} onPress={applySample} disabled={readingImage} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ScanFrame({ running, color }: { running: boolean; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      return;
    }
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration: SCAN_LINE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(progress);
  }, [running, progress]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: running ? 1 : 0,
    transform: [{ translateY: progress.get() * (FRAME - CORNER) }],
  }));

  return (
    <View style={styles.frame}>
      <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
      <Animated.View style={[styles.scanLine, { backgroundColor: color, boxShadow: `0px 0px 12px 2px ${color}` }, lineStyle]} />
    </View>
  );
}

function GlassButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      style={({ pressed }) => [styles.glassButton, active && styles.glassButtonActive, pressed && styles.pressed]}>
      <SymbolView name={icon} size={IconSize.lg} tintColor={active ? '#14211C' : ON_CAMERA} />
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.pressed]}>
      <SymbolView name={icon} size={IconSize.lg} tintColor={ON_CAMERA} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, backgroundColor: SCRIM },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  title: { ...Typography.heading, color: ON_CAMERA },
  buttonSpace: { width: 40 },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonActive: { backgroundColor: ON_CAMERA },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: Radius.lg },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: Radius.lg },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: Radius.lg,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: Radius.lg,
  },
  scanLine: {
    position: 'absolute',
    top: CORNER / 2,
    left: Spacing.three,
    right: Spacing.three,
    height: 2,
    borderRadius: 1,
  },
  hint: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center' },
  error: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  errorText: { ...Typography.callout, color: ON_CAMERA, fontWeight: '600', textAlign: 'center' },
  permission: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.xxl,
    backgroundColor: GLASS,
  },
  permissionTitle: { ...Typography.heading, color: ON_CAMERA },
  permissionText: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center' },
  permissionButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  permissionButtonText: { ...Typography.bodyStrong },
  actions: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: GLASS,
  },
  actionText: { ...Typography.bodyStrong, color: ON_CAMERA },
});
