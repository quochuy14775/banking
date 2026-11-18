import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/shared/components/primary-button';
import { KycIcons, LoginIcons, QrIcons, TransferIcons, type IconName } from '@/constants/icons';
import { Fonts, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatFullDate, maskIdNumber, parseCccdQr } from '@/helpers';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import type { CccdInfo } from '@/models';
import { getDemoCccdQrPayload, getDemoSelfie, submitKyc } from '@/services/kyc.service';

/**
 * `scan`: camera sau quét mã QR trên CCCD · `review`: kiểm tra thông tin đã điền và đồng ý
 * · `face`: camera trước chụp khuôn mặt rồi gửi xác thực · `done`: đã xác thực.
 */
type Phase = 'scan' | 'review' | 'face' | 'done';
/** Bước khuôn mặt: chờ bắt đầu · đang làm theo hướng dẫn · đang gửi xác thực · lỗi (cho thử lại). */
type FaceState = 'idle' | 'running' | 'checking' | 'error';
type Styles = ReturnType<typeof createStyles>;

interface InfoRow {
  key: TranslationKey;
  value: string;
  mono?: boolean;
}

// Khung theo tỉ lệ thẻ CCCD (chuẩn ID-1: 85,6 × 53,98 mm).
const CARD_RATIO = 85.6 / 53.98;
const CARD_MAX_WIDTH = 340;
const CORNER = 26;
const CORNER_WIDTH = 4;
// Ô mã QR ở góc trên bên phải mặt trước CCCD, tính theo bề rộng thẻ.
const QR_SIZE_RATIO = 0.27;
const QR_INSET_RATIO = 0.05;
const SCAN_LINE_MS = 1400;
const RETRY_DELAY_MS = 1500;
// Quét quá lâu chưa nhận ra mã thì gợi ý chỉnh khoảng cách/lấy nét.
const SLOW_SCAN_MS = 6000;
// Các dòng thông tin vừa được điền hiện lần lượt, để thấy rõ là app tự điền.
const ROW_STAGGER_MS = 50;

// Bước khuôn mặt: 3 hướng dẫn ngắn, mỗi hướng dẫn giữ 1,6 s; ảnh được chụp lúc người dùng đang nhìn thẳng.
// Đây chỉ là hướng dẫn theo thời gian: kiểm tra người thật và so khớp khuôn mặt do server/SDK eKYC làm.
const FACE_PROMPTS = ['straight', 'left', 'blink'] as const;
const PROMPT_MS = 1600;
const CAPTURE_AT_MS = 900;
const OVAL_WIDTH = 224;
const OVAL_HEIGHT = 292;

// Màn camera luôn trên nền tối nên dùng màu cố định thay vì theo theme (giống màn Quét mã QR).
const ON_CAMERA = '#FFFFFF';
const ON_CAMERA_MUTED = 'rgba(255, 255, 255, 0.72)';
const GLASS = 'rgba(255, 255, 255, 0.16)';
const SCRIM = 'rgba(0, 0, 0, 0.35)';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Màn xác thực eKYC bằng CCCD gắn chip. Mỗi bước chỉ có hướng dẫn ngay trên màn, không có danh sách bước:
 * quét mã QR ở mặt trước CCCD → kiểm tra thông tin đã điền sẵn và đồng ý → chụp khuôn mặt → đã xác thực.
 * Mở từ trang Cá nhân (`from=profile`), ngăn kéo tài khoản hoặc ô tìm kiếm ở trang chủ.
 */
export default function KycScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const pathname = usePathname();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, updateUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scan');
  const [info, setInfo] = useState<CccdInfo | null>(null);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [prompt, setPrompt] = useState(0);
  const [faceError, setFaceError] = useState('');
  const [faceCameraReady, setFaceCameraReady] = useState(false);
  // Khoá để mỗi lần quét chỉ xử lý một mã (camera bắn sự kiện liên tục).
  const handling = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceCamera = useRef<CameraView>(null);
  // Mỗi lượt chụp khuôn mặt có một số; rời bước hoặc rời màn thì tăng số để lượt cũ tự dừng.
  const faceRun = useRef(0);
  const askedOnce = useRef(false);
  const [slowScan, setSlowScan] = useState(false);

  const verified = !!user?.kycVerified;
  const exitTo = from === 'profile' ? '/profile' : '/';
  const onScreen = pathname === '/kyc';
  const showScanner = phase === 'scan' || !info;
  // Mỗi lúc chỉ được một camera preview: camera sau ở bước quét, camera trước ở bước khuôn mặt.
  const cameraReady = onScreen && showScanner && !verified && !!permission?.granted;
  const faceCameraOn = onScreen && phase === 'face' && !!info && !verified && !!permission?.granted;

  // Camera bật mà sau vài giây chưa đọc được mã thì hiện gợi ý; đổi trạng thái thì đếm lại.
  useEffect(() => {
    if (!cameraReady) return;
    const timer = setTimeout(() => setSlowScan(true), SLOW_SCAN_MS);
    return () => {
      clearTimeout(timer);
      setSlowScan(false);
    };
  }, [cameraReady]);

  // Lần đầu vào màn thì hỏi quyền camera ngay, để người dùng thấy camera cùng hướng dẫn quét luôn.
  // Web chờ người dùng bấm nút (trình duyệt nên hỏi quyền sau một thao tác của người dùng).
  useEffect(() => {
    if (Platform.OS === 'web' || askedOnce.current || !onScreen || verified) return;
    if (permission?.status === PermissionStatus.UNDETERMINED && permission.canAskAgain) {
      askedOnce.current = true;
      void requestPermission();
    }
  }, [onScreen, verified, permission, requestPermission]);

  // Mỗi lần vào lại màn thì bắt đầu từ bước quét, hoặc hiện trạng thái đã xác thực.
  useFocusEffect(
    useCallback(() => {
      handling.current = false;
      faceRun.current += 1;
      setError('');
      setInfo(null);
      setConsent(false);
      setConsentError(false);
      setFaceState('idle');
      setPrompt(0);
      setFaceError('');
      setPhase(verified ? 'done' : 'scan');
      return () => {
        faceRun.current += 1;
        setTorch(false);
        setFaceCameraReady(false);
        if (retryTimer.current) clearTimeout(retryTimer.current);
      };
    }, [verified]),
  );

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    retryTimer.current = setTimeout(() => {
      handling.current = false;
    }, RETRY_DELAY_MS);
  };

  const handleData = (data: string) => {
    if (handling.current) return;
    handling.current = true;
    const result = parseCccdQr(data);
    if (!result.ok) {
      fail(t(`kyc.errors.${result.reason}`));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setError('');
    setTorch(false);
    setInfo(result.info);
    setPhase('review');
  };

  const rescan = () => {
    handling.current = false;
    setInfo(null);
    setConsent(false);
    setConsentError(false);
    setPhase('scan');
  };

  // Phải đồng ý (gồm cả việc xử lý ảnh khuôn mặt) trước khi bật camera trước.
  const goToFace = () => {
    if (!consent) {
      setConsentError(true);
      return;
    }
    setFaceState('idle');
    setPrompt(0);
    setFaceError('');
    setPhase('face');
  };

  const leaveFace = () => {
    faceRun.current += 1;
    setFaceCameraReady(false);
    setFaceState('idle');
    setPrompt(0);
    setFaceError('');
    setPhase('review');
  };

  const capturePhoto = async (): Promise<string | null> => {
    try {
      const picture = await faceCamera.current?.takePictureAsync({ quality: 0.6, shutterSound: false });
      return picture?.uri ?? null;
    } catch {
      return null;
    }
  };

  const failFace = (message: string) => {
    setFaceError(message);
    setFaceState('error');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  /** Chạy các hướng dẫn lần lượt, chụp ảnh lúc nhìn thẳng, rồi gửi thông tin CCCD + ảnh để xác thực. */
  const startFace = async (demo: boolean) => {
    if (!user || !info) return;
    const run = ++faceRun.current;
    const alive = () => faceRun.current === run;
    setFaceError('');
    setPrompt(0);
    setFaceState('running');

    let selfie: Promise<string | null> = Promise.resolve(demo ? getDemoSelfie() : null);
    await sleep(CAPTURE_AT_MS);
    if (!alive()) return;
    if (!demo) selfie = capturePhoto();
    for (let i = 1; i < FACE_PROMPTS.length; i++) {
      await sleep(i === 1 ? PROMPT_MS - CAPTURE_AT_MS : PROMPT_MS);
      if (!alive()) return;
      Haptics.selectionAsync();
      setPrompt(i);
    }
    await sleep(PROMPT_MS);
    if (!alive()) return;

    setFaceState('checking');
    const photo = await selfie;
    if (!alive()) return;
    if (!photo) {
      failFace(t('kyc.face.errors.capture'));
      return;
    }
    const res = await submitKyc({ userId: user.id, info, consent, selfie: photo });
    if (!alive()) return;
    if (!res.success || !res.profile) {
      failFace(res.message ?? t('kyc.face.errors.notRecognized'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFaceCameraReady(false);
    updateUser(res.profile);
    setPhase('done');
  };

  const permissionBlock = (message: string) =>
    permission &&
    !permission.granted && (
      <View style={styles.permission}>
        <View style={styles.permissionRow}>
          <SymbolView name={QrIcons.camera} size={IconSize.lg} tintColor={ON_CAMERA} />
          <Text style={styles.permissionText}>{message}</Text>
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
    );

  if (!verified && showScanner) {
    return (
      <View style={styles.cameraRoot}>
        {cameraReady && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            // iOS mặc định tắt tự lấy nét: mã QR nhỏ, dày trên CCCD sẽ mờ ở khoảng cách gần.
            autofocus="on"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => handleData(data)}
          />
        )}

        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.cameraHeader}>
            <GlassButton
              icon={TransferIcons.back}
              label={t('transfer.back')}
              onPress={() => router.navigate(exitTo)}
              styles={styles}
            />
            <Text style={styles.cameraTitle} accessibilityRole="header">
              {t('kyc.title')}
            </Text>
            {cameraReady ? (
              <GlassButton
                icon={torch ? QrIcons.torchOff : QrIcons.torch}
                label={t(torch ? 'qr.torchOff' : 'qr.torchOn')}
                onPress={() => setTorch((v) => !v)}
                active={torch}
                styles={styles}
              />
            ) : (
              <View style={styles.buttonSpace} />
            )}
          </View>

          {/* Vào màn là thấy ngay hướng dẫn quét; chưa có quyền camera thì thêm một khối nhỏ để cấp quyền. */}
          <View style={styles.center}>
            <Text style={styles.scanTitle}>{t('kyc.scanTitle')}</Text>
            <CardFrame running={cameraReady} color={theme.scoreStart} />
            <Text style={styles.scanHint}>{t('kyc.scanHint')}</Text>
            <Text style={styles.scanTip}>{t('kyc.scanTip')}</Text>
            {slowScan && error === '' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.slowHint}>
                <Text style={styles.slowHintText} accessibilityLiveRegion="polite">
                  {t('kyc.slowScan')}
                </Text>
              </Animated.View>
            )}
            {permissionBlock(t('kyc.permissionMessage'))}

            {error !== '' && (
              <Animated.View
                key={error}
                entering={FadeInUp.duration(200)}
                exiting={FadeOut.duration(150)}
                style={styles.error}>
                <Text style={styles.errorPillText} accessibilityLiveRegion="polite" role="alert">
                  {error}
                </Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.actions}>
            <GlassAction
              icon={KycIcons.idCard}
              label={t('kyc.sample')}
              onPress={() => {
                handling.current = false;
                handleData(getDemoCccdQrPayload());
              }}
              styles={styles}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!verified && info && phase === 'face') {
    const busy = faceState === 'running' || faceState === 'checking';
    let message = t('kyc.face.hint');
    if (faceState === 'running') message = t(`kyc.face.prompts.${FACE_PROMPTS[prompt]}`);
    if (faceState === 'checking') message = t('kyc.face.checking');
    if (faceState === 'error') message = faceError;
    const ringColor =
      faceState === 'error' ? theme.danger : faceState === 'idle' ? ON_CAMERA_MUTED : theme.scoreStart;

    return (
      <View style={styles.cameraRoot}>
        {faceCameraOn && (
          <CameraView
            ref={faceCamera}
            style={StyleSheet.absoluteFill}
            facing="front"
            animateShutter={false}
            onCameraReady={() => setFaceCameraReady(true)}
          />
        )}

        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.cameraHeader}>
            <GlassButton icon={TransferIcons.back} label={t('transfer.back')} onPress={leaveFace} styles={styles} />
            <Text style={styles.cameraTitle} accessibilityRole="header">
              {t('kyc.title')}
            </Text>
            <View style={styles.buttonSpace} />
          </View>

          <View style={styles.center}>
            <Text style={styles.scanTitle}>{t('kyc.face.title')}</Text>
            <View
              style={[styles.oval, { borderColor: ringColor }, faceState === 'idle' && styles.ovalIdle]}
              accessible={false}>
              {!faceCameraOn && <SymbolView name={LoginIcons.faceId} size={88} tintColor={ON_CAMERA_MUTED} />}
              {faceState === 'checking' && (
                <View style={styles.ovalBusy}>
                  <ActivityIndicator color={ON_CAMERA} size="large" />
                </View>
              )}
            </View>
            <Animated.Text
              key={`${faceState}-${prompt}`}
              entering={FadeIn.duration(180)}
              style={[styles.faceMessage, faceState === 'error' && styles.faceMessageError]}
              accessibilityLiveRegion="polite"
              role="alert">
              {message}
            </Animated.Text>
            {faceState === 'running' && (
              <View style={styles.promptDots}>
                {FACE_PROMPTS.map((key, i) => (
                  <View key={key} style={[styles.promptDot, i <= prompt && { backgroundColor: theme.scoreStart }]} />
                ))}
              </View>
            )}
            {faceState === 'idle' && <Text style={styles.scanTip}>{t('kyc.face.tip')}</Text>}
            {!busy && permissionBlock(t('kyc.face.permissionMessage'))}
          </View>

          <View style={styles.actions}>
            {busy ? (
              <Text style={styles.holdText}>{t('kyc.face.holdSteady')}</Text>
            ) : (
              <>
                {permission?.granted && (
                  <PrimaryButton
                    label={t(faceState === 'error' ? 'kyc.face.retry' : 'kyc.face.start')}
                    onPress={() => void startFace(false)}
                    loading={!faceCameraReady}
                  />
                )}
                <GlassAction
                  icon={LoginIcons.faceId}
                  label={t('kyc.face.sample')}
                  onPress={() => void startFace(true)}
                  styles={styles}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!verified && info) {
    const rows: InfoRow[] = [
      { key: 'kyc.fields.fullName', value: info.fullName },
      { key: 'kyc.fields.idNumber', value: info.idNumber, mono: true },
      ...(info.oldIdNumber ? [{ key: 'kyc.fields.oldIdNumber' as const, value: info.oldIdNumber, mono: true }] : []),
      { key: 'kyc.fields.dateOfBirth', value: formatFullDate(info.dateOfBirth), mono: true },
      { key: 'kyc.fields.gender', value: t(`profile.info.genders.${info.gender}`) },
      { key: 'kyc.fields.address', value: info.permanentAddress },
      ...(info.issueDate
        ? [{ key: 'kyc.fields.issueDate' as const, value: formatFullDate(info.issueDate), mono: true }]
        : []),
    ];

    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title={t('kyc.title')} onBack={rescan} styles={styles} theme={theme} />
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <Text style={styles.title}>{t('kyc.reviewTitle')}</Text>
            <Text style={styles.subtitle}>{t('kyc.reviewHint')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t('kyc.fromCccd')}</Text>
              <Pressable
                onPress={rescan}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rescan, pressed && styles.pressed]}>
                <SymbolView name={KycIcons.rescan} size={IconSize.sm} tintColor={theme.primary} />
                <Text style={styles.rescanText}>{t('kyc.rescan')}</Text>
              </Pressable>
            </View>
            {rows.map((row, i) => (
              <Animated.View
                key={row.key}
                entering={FadeIn.duration(180).delay(i * ROW_STAGGER_MS)}
                style={[styles.row, i > 0 && styles.divider]}>
                <Text style={styles.rowLabel}>{t(row.key)}</Text>
                <Text style={[styles.rowValue, row.mono && styles.mono]}>{row.value}</Text>
                <SymbolView name={KycIcons.locked} size={IconSize.xs} tintColor={theme.textMuted} />
              </Animated.View>
            ))}
          </View>

          <View>
            <Pressable
              onPress={() => {
                setConsent((v) => !v);
                setConsentError(false);
              }}
              accessibilityRole="checkbox"
              accessibilityLabel={t('kyc.consent')}
              accessibilityState={{ checked: consent }}
              aria-checked={consent}
              style={styles.consent}>
              <View style={[styles.checkbox, consent && styles.checkboxOn]}>
                {consent && <SymbolView name={KycIcons.check} size={IconSize.sm} tintColor={theme.onPrimary} />}
              </View>
              <Text style={styles.consentText}>{t('kyc.consent')}</Text>
            </Pressable>
            {consentError && (
              <Text style={styles.errorText} role="alert">
                {t('kyc.consentRequired')}
              </Text>
            )}
          </View>

          <PrimaryButton label={t('kyc.continue')} onPress={goToFace} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const summary: InfoRow[] = [];
  if (user) summary.push({ key: 'kyc.fields.fullName', value: user.fullName });
  if (user?.idNumber) summary.push({ key: 'kyc.fields.idNumber', value: maskIdNumber(user.idNumber), mono: true });
  if (user?.dateOfBirth) {
    summary.push({ key: 'kyc.fields.dateOfBirth', value: formatFullDate(user.dateOfBirth), mono: true });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title={t('kyc.title')} onBack={() => router.navigate(exitTo)} styles={styles} theme={theme} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.doneHead}>
          <View style={styles.doneIcon}>
            <SymbolView name={KycIcons.verified} size={IconSize.badge} tintColor={theme.success} />
          </View>
          <Text style={[styles.title, styles.textCenter]}>{t('kyc.doneTitle')}</Text>
          <Text style={[styles.subtitle, styles.textCenter]}>{t('kyc.doneMessage')}</Text>
        </View>
        {summary.length > 0 && (
          <View style={styles.card}>
            {summary.map((row, i) => (
              <View key={row.key} style={[styles.row, i > 0 && styles.divider]}>
                <Text style={styles.rowLabel}>{t(row.key)}</Text>
                <Text style={[styles.rowValue, row.mono && styles.mono]}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}
        <PrimaryButton label={t('kyc.backToProfile')} onPress={() => router.navigate('/profile')} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Khung hình thẻ CCCD với ô mã QR ở góc trên bên phải; vạch quét chạy trong ô mã QR khi camera đang bật. */
function CardFrame({ running, color }: { running: boolean; color: string }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - Spacing.five * 2, CARD_MAX_WIDTH);
  const cardHeight = cardWidth / CARD_RATIO;
  const qrSize = Math.round(cardWidth * QR_SIZE_RATIO);
  const inset = Math.round(cardWidth * QR_INSET_RATIO);
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
    transform: [{ translateY: progress.get() * (qrSize - 12) }],
  }));

  return (
    <View style={{ width: cardWidth, height: cardHeight }}>
      <View style={[frame.corner, frame.topLeft, { borderColor: color }]} />
      <View style={[frame.corner, frame.topRight, { borderColor: color }]} />
      <View style={[frame.corner, frame.bottomLeft, { borderColor: color }]} />
      <View style={[frame.corner, frame.bottomRight, { borderColor: color }]} />
      <View style={[frame.qr, { width: qrSize, height: qrSize, top: inset, right: inset, borderColor: color }]}>
        <Animated.View style={[frame.qrLine, { backgroundColor: color }, lineStyle]} />
      </View>
    </View>
  );
}

function GlassButton({
  icon,
  label,
  onPress,
  active,
  styles,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  styles: Styles;
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

/** Nút phụ trên nền camera (vd "Dùng CCCD mẫu"). */
function GlassAction({
  icon,
  label,
  onPress,
  styles,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <SymbolView name={icon} size={IconSize.lg} tintColor={ON_CAMERA} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Header({ title, onBack, styles, theme }: { title: string; onBack: () => void; styles: Styles; theme: ThemeColors }) {
  const { t } = useI18n();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('transfer.back')}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
      </Pressable>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const frame = StyleSheet.create({
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
  qr: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.sm, overflow: 'hidden' },
  qrLine: { position: 'absolute', top: 5, left: 5, right: 5, height: 2, borderRadius: 1 },
});

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.7 },
    // Bước quét và bước khuôn mặt (nền camera).
    cameraRoot: { flex: 1, backgroundColor: '#000000' },
    overlay: { flex: 1, backgroundColor: SCRIM },
    cameraHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
    },
    cameraTitle: { ...Typography.heading, color: ON_CAMERA },
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.three,
      paddingHorizontal: Spacing.four,
    },
    scanTitle: { ...Typography.title, color: ON_CAMERA, textAlign: 'center' },
    scanHint: { ...Typography.body, color: ON_CAMERA, textAlign: 'center' },
    scanTip: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center', marginTop: -Spacing.two },
    error: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: theme.danger,
    },
    slowHint: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.lg, backgroundColor: GLASS },
    slowHintText: { ...Typography.callout, color: ON_CAMERA, textAlign: 'center' },
    errorPillText: { ...Typography.callout, color: ON_CAMERA, fontWeight: '600', textAlign: 'center' },
    permission: {
      alignSelf: 'stretch',
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: GLASS,
    },
    permissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    permissionText: { ...Typography.callout, flex: 1, color: ON_CAMERA },
    permissionButton: {
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: Radius.lg,
      backgroundColor: theme.primary,
    },
    permissionButtonText: { ...Typography.bodyStrong, color: theme.onPrimary },
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
    oval: {
      width: OVAL_WIDTH,
      height: OVAL_HEIGHT,
      borderRadius: OVAL_WIDTH / 2,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    ovalIdle: { borderStyle: 'dashed', borderWidth: 3 },
    ovalBusy: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: SCRIM,
    },
    faceMessage: { ...Typography.heading, color: ON_CAMERA, textAlign: 'center' },
    faceMessageError: { color: '#FCA5A5' },
    promptDots: { flexDirection: 'row', gap: 6, marginTop: -Spacing.one },
    promptDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.28)' },
    holdText: { ...Typography.callout, color: ON_CAMERA_MUTED, textAlign: 'center', paddingVertical: 14 },
    // Bước kiểm tra và màn đã xác thực (nền sáng theo theme).
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...Typography.title, color: theme.text, flex: 1 },
    content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
    title: { ...Typography.title, color: theme.text },
    subtitle: { ...Typography.callout, color: theme.textSecondary, marginTop: Spacing.one },
    textCenter: { textAlign: 'center' },
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Spacing.two,
      paddingBottom: Spacing.one,
    },
    cardTitle: { ...Typography.bodyStrong, color: theme.text },
    rescan: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rescanText: { ...Typography.callout, fontWeight: '600', color: theme.primary },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingVertical: 11 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    rowLabel: { ...Typography.callout, width: 110, color: theme.textMuted },
    rowValue: { ...Typography.body, flex: 1, color: theme.text },
    mono: { fontFamily: Fonts.mono },
    consent: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
    checkbox: {
      width: 22,
      height: 22,
      marginTop: 1,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
    consentText: { ...Typography.callout, flex: 1, color: theme.textSecondary },
    errorText: { ...Typography.caption, color: theme.danger, marginTop: Spacing.one, marginLeft: 30 },
    doneHead: { alignItems: 'center', paddingTop: Spacing.four, gap: Spacing.one },
    doneIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.successSoft,
      marginBottom: Spacing.two,
    },
  });
}
