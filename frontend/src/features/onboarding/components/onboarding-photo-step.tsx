import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/shared/components/primary-button';
import { QrIcons, TransferIcons } from '@/constants/icons';
import { DOCUMENT_KINDS, PHOTO_JPEG_QUALITY, PHOTO_MAX_WIDTH } from '@/features/onboarding/onboarding';
import { IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { ApplicationPhotos, CapturedPhoto, DocumentKind } from '@/models';

// Màn camera luôn trên nền tối nên dùng màu cố định thay vì theo theme (giống màn eKYC).
const ON_CAMERA = '#FFFFFF';
const ON_CAMERA_MUTED = 'rgba(255, 255, 255, 0.72)';
const GLASS = 'rgba(255, 255, 255, 0.16)';
const SCRIM = 'rgba(0, 0, 0, 0.35)';
const CARD_RATIO = 85.6 / 53.98;
const FRAME_WIDTH = 300;
const OVAL_WIDTH = 220;
const OVAL_HEIGHT = 280;

/** Ảnh PNG 1×1 dùng cho nút "ảnh mẫu" của bản dev (thử luồng trên web/máy ảo không có camera). */
const DEV_SAMPLE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

interface Props {
  /** Đang gửi hồ sơ (sau ảnh cuối): khóa các nút. */
  submitting: boolean;
  onBack: () => void;
  /** Đủ 3 ảnh: gửi hồ sơ. */
  onDone: (photos: ApplicationPhotos) => void;
}

/**
 * Chụp lần lượt mặt trước, mặt sau CCCD (camera sau) và ảnh chân dung (camera trước). Mỗi ảnh xem lại được, chụp lại
 * được, rồi thu nhỏ về JPEG trước khi gửi để mỗi ảnh chỉ vài trăm KB. Ảnh chỉ nằm trong bộ nhớ, không lưu vào thư viện.
 */
export default function OnboardingPhotoStep({ submitting, onBack, onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [index, setIndex] = useState(0);
  const [photos, setPhotos] = useState<Partial<ApplicationPhotos>>({});
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const camera = useRef<CameraView>(null);

  const kind: DocumentKind = DOCUMENT_KINDS[index];
  const isPortrait = kind === 'portrait';
  const busy = processing || submitting;

  // Nút Back của Android: đang xem lại ảnh thì chụp lại, ảnh sau thì lùi về ảnh trước, ảnh đầu thì về bước trước.
  const goBack = () => {
    if (busy) return;
    setError('');
    if (preview) setPreview(null);
    else if (index > 0) setIndex(index - 1);
    else onBack();
  };
  const goBackRef = useRef(goBack);
  useEffect(() => {
    goBackRef.current = goBack;
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  // Trên điện thoại hỏi quyền camera ngay; web chờ người dùng bấm (trình duyệt nên hỏi sau một thao tác).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (permission?.status === PermissionStatus.UNDETERMINED && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const capture = async () => {
    if (busy) return;
    setError('');
    setProcessing(true);
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (!picture) throw new Error('no picture');
      const context = ImageManipulator.manipulate(picture.uri);
      if (picture.width > PHOTO_MAX_WIDTH) context.resize({ width: PHOTO_MAX_WIDTH });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_JPEG_QUALITY, base64: true });
      if (!saved.base64) throw new Error('no base64');
      setPreview({ base64: saved.base64, uri: saved.uri });
      void Haptics.selectionAsync();
    } catch {
      setError(t('onboarding.photos.errors.capture'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessing(false);
    }
  };

  const accept = (photo: CapturedPhoto) => {
    const next = { ...photos, [kind]: photo };
    setPhotos(next);
    setPreview(null);
    if (index < DOCUMENT_KINDS.length - 1) {
      setIndex(index + 1);
      return;
    }
    if (next.idFront && next.idBack && next.portrait) {
      onDone({ idFront: next.idFront, idBack: next.idBack, portrait: next.portrait });
    }
  };

  const acceptDevSample = () => accept({ base64: DEV_SAMPLE_PNG, uri: `data:image/png;base64,${DEV_SAMPLE_PNG}` });

  const cameraOn = !!permission?.granted && !preview;

  return (
    <View style={styles.root}>
      {cameraOn && (
        // Đổi key khi đổi camera trước/sau để CameraView khởi động lại đúng camera.
        <CameraView
          key={isPortrait ? 'front' : 'back'}
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing={isPortrait ? 'front' : 'back'}
          autofocus="on"
          animateShutter={false}
        />
      )}
      {preview && <Image source={{ uri: preview.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            disabled={busy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('transfer.back')}
            style={({ pressed }) => [styles.glassButton, (pressed || busy) && styles.dim]}>
            <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={ON_CAMERA} />
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {t('onboarding.photos.progress', { current: index + 1, total: DOCUMENT_KINDS.length })}
          </Text>
          <View style={styles.buttonSpace} />
        </View>

        <View style={styles.center}>
          <Text style={styles.title}>{t(`onboarding.photos.kinds.${kind}`)}</Text>
          {!preview && (isPortrait ? <View style={styles.oval} /> : <View style={[styles.frame, { borderColor: theme.scoreStart }]} />)}
          {!preview && <Text style={styles.hint}>{t(`onboarding.photos.hints.${kind}`)}</Text>}
          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator color={ON_CAMERA} />
              <Text style={styles.hint}>{t(submitting ? 'onboarding.photos.submitting' : 'onboarding.photos.processing')}</Text>
            </View>
          )}
          {error !== '' && (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          )}
          {!preview && permission && !permission.granted && (
            <View style={styles.permission}>
              <View style={styles.permissionRow}>
                <SymbolView name={QrIcons.camera} size={IconSize.lg} tintColor={ON_CAMERA} />
                <Text style={styles.permissionText}>{t('onboarding.photos.permissionMessage')}</Text>
              </View>
              <Pressable
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
                style={({ pressed }) => [styles.permissionButton, pressed && styles.dim]}>
                <Text style={styles.permissionButtonText}>
                  {t(permission.canAskAgain ? 'qr.permissionAllow' : 'qr.permissionSettings')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {preview ? (
            <>
              <PrimaryButton label={t('onboarding.photos.usePhoto')} onPress={() => accept(preview)} loading={busy} />
              <Pressable
                onPress={() => setPreview(null)}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondary, (pressed || busy) && styles.dim]}>
                <Text style={styles.secondaryText}>{t('onboarding.photos.retake')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              {permission?.granted && (
                <PrimaryButton label={t('onboarding.photos.capture')} onPress={() => void capture()} loading={busy} />
              )}
              {__DEV__ && (
                <Pressable
                  onPress={acceptDevSample}
                  disabled={busy}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.secondary, (pressed || busy) && styles.dim]}>
                  <Text style={styles.secondaryText}>{t('onboarding.photos.sampleDev')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    overlay: { flex: 1, backgroundColor: SCRIM },
    dim: { opacity: 0.6 },
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
      width: FRAME_WIDTH,
      height: FRAME_WIDTH / CARD_RATIO,
      maxWidth: '100%',
      borderWidth: 3,
      borderRadius: Radius.lg,
      borderStyle: 'dashed',
    },
    oval: {
      width: OVAL_WIDTH,
      height: OVAL_HEIGHT,
      borderRadius: OVAL_WIDTH / 2,
      borderWidth: 3,
      borderStyle: 'dashed',
      borderColor: ON_CAMERA_MUTED,
    },
    hint: { ...Typography.body, color: ON_CAMERA, textAlign: 'center' },
    busy: { alignItems: 'center', gap: Spacing.two },
    error: { ...Typography.callout, color: '#FCA5A5', textAlign: 'center' },
    permission: { alignSelf: 'stretch', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: GLASS },
    permissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    permissionText: { ...Typography.callout, flex: 1, color: ON_CAMERA },
    permissionButton: { alignItems: 'center', paddingVertical: 11, borderRadius: Radius.lg, backgroundColor: theme.primary },
    permissionButtonText: { ...Typography.bodyStrong, color: theme.onPrimary },
    actions: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
    secondary: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: GLASS },
    secondaryText: { ...Typography.bodyStrong, color: ON_CAMERA },
  });
}
