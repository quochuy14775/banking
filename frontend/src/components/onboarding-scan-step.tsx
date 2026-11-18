import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KycIcons, QrIcons, TransferIcons } from '@/constants/icons';
import { IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { parseCccdQr } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { CccdInfo } from '@/models';
import { getDemoCccdQrPayload } from '@/services/kyc.service';

// Khung theo tỉ lệ thẻ CCCD (chuẩn ID-1: 85,6 × 53,98 mm).
const CARD_RATIO = 85.6 / 53.98;
const CARD_WIDTH = 300;
const RETRY_DELAY_MS = 1500;

// Màn camera luôn trên nền tối nên dùng màu cố định thay vì theo theme (giống màn eKYC).
const ON_CAMERA = '#FFFFFF';
const ON_CAMERA_MUTED = 'rgba(255, 255, 255, 0.72)';
const GLASS = 'rgba(255, 255, 255, 0.16)';
const SCRIM = 'rgba(0, 0, 0, 0.35)';

interface Props {
  onBack: () => void;
  onScanned: (info: CccdInfo) => void;
}

/**
 * Quét mã QR ở mặt trước CCCD gắn chip để điền sẵn thông tin. Mã QR không có chữ ký số, nên thông tin này chỉ để
 * điền form; nhân viên sẽ đối chiếu với ảnh CCCD khi duyệt. Bản dev có thêm nút dùng mã QR mẫu (thử trên web/máy ảo).
 */
export default function OnboardingScanStep({ onBack, onScanned }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  // Camera bắn sự kiện liên tục: mỗi lần chỉ xử lý một mã, đọc sai thì chờ một lúc rồi mới nhận mã tiếp.
  const handling = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = retryTimer;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  // Trên điện thoại hỏi quyền camera ngay; web chờ người dùng bấm (trình duyệt nên hỏi sau một thao tác).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (permission?.status === PermissionStatus.UNDETERMINED && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const handleData = (data: string) => {
    if (handling.current) return;
    handling.current = true;
    const result = parseCccdQr(data);
    if (!result.ok) {
      setError(t(`kyc.errors.${result.reason}`));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      retryTimer.current = setTimeout(() => {
        handling.current = false;
      }, RETRY_DELAY_MS);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScanned(result.info);
  };

  return (
    <View style={styles.root}>
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          // iOS mặc định tắt tự lấy nét: mã QR nhỏ, dày trên CCCD sẽ mờ ở khoảng cách gần.
          autofocus="on"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleData(data)}
        />
      )}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('transfer.back')}
            style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}>
            <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={ON_CAMERA} />
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {t('onboarding.title')}
          </Text>
          <View style={styles.buttonSpace} />
        </View>

        <View style={styles.center}>
          <Text style={styles.title}>{t('onboarding.scan.title')}</Text>
          <View style={[styles.frame, { borderColor: theme.scoreStart }]} />
          <Text style={styles.hint}>{t('onboarding.scan.hint')}</Text>
          <Text style={styles.tip}>{t('onboarding.scan.tip')}</Text>
          {permission && !permission.granted && (
            <View style={styles.permission}>
              <View style={styles.permissionRow}>
                <SymbolView name={QrIcons.camera} size={IconSize.lg} tintColor={ON_CAMERA} />
                <Text style={styles.permissionText}>{t('onboarding.scan.permissionMessage')}</Text>
              </View>
              <Pressable
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
                style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}>
                <Text style={styles.permissionButtonText}>
                  {t(permission.canAskAgain ? 'qr.permissionAllow' : 'qr.permissionSettings')}
                </Text>
              </Pressable>
            </View>
          )}
          {error !== '' && (
            <Animated.View key={error} entering={FadeInUp.duration(200)} exiting={FadeOut.duration(150)} style={styles.error}>
              <Text style={styles.errorText} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            </Animated.View>
          )}
        </View>

        {__DEV__ && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                handling.current = false;
                handleData(getDemoCccdQrPayload());
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <SymbolView name={KycIcons.idCard} size={IconSize.lg} tintColor={ON_CAMERA} />
              <Text style={styles.actionText}>{t('onboarding.scan.sampleDev')}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
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
    headerTitle: { ...Typography.heading, color: ON_CAMERA },
    buttonSpace: { width: 40 },
    glassButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: GLASS,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
    title: { ...Typography.title, color: ON_CAMERA, textAlign: 'center' },
    frame: {
      width: CARD_WIDTH,
      height: CARD_WIDTH / CARD_RATIO,
      maxWidth: '100%',
      borderWidth: 3,
      borderRadius: Radius.lg,
      borderStyle: 'dashed',
    },
    hint: { ...Typography.body, color: ON_CAMERA, textAlign: 'center' },
    tip: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center', marginTop: -Spacing.two },
    permission: { alignSelf: 'stretch', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: GLASS },
    permissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    permissionText: { ...Typography.callout, flex: 1, color: ON_CAMERA },
    permissionButton: { alignItems: 'center', paddingVertical: 11, borderRadius: Radius.lg, backgroundColor: theme.primary },
    permissionButtonText: { ...Typography.bodyStrong, color: theme.onPrimary },
    error: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: theme.danger,
    },
    errorText: { ...Typography.callout, color: ON_CAMERA, fontWeight: '600', textAlign: 'center' },
    actions: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
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
}
