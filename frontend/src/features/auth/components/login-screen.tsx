import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  type TextStyle,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/shared/components/app-logo';
import FaceScanModal from '@/features/auth/components/face-scan-modal';
import OnboardingScreen from '@/features/onboarding/components/onboarding-screen';
import RegisterScreen from '@/features/auth/components/register-screen';
import UserAvatar from '@/shared/components/user-avatar';
import { USE_MOCK_AUTH } from '@/constants/api';
import { CommonIcons, LoginIcons } from '@/constants/icons';
import { Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import { clearSavedApplication } from '@/features/onboarding/store/onboardingStore';
import type { LoginError, LoginRequest, LoginResponse, RememberedUser, SavedApplication } from '@/models';
import { forgetRememberedUser, getRememberedUser } from '@/services/auth.service';

// Các khối hiện lần lượt một lần khi mở màn, trượt nhẹ từ dưới lên, không nảy.
const enter = (delay: number) => FadeInDown.duration(420).delay(delay).easing(Easing.out(Easing.cubic));

const LOGIN_ERRORS: Record<LoginError, TranslationKey> = {
  invalidCredentials: 'login.errors.invalidCredentials',
  locked: 'login.errors.locked',
  disabled: 'login.errors.disabled',
  unsupportedRole: 'login.errors.unsupportedRole',
  network: 'login.errors.network',
  unknown: 'login.errors.unknown',
};

const ROW_HEIGHT = 60;
const ACTION_HEIGHT = 54;

type Field = 'username' | 'password';

// Tắt viền focus mặc định của trình duyệt; trạng thái focus đã có nền và vạch màu của dòng.
// Type của RN không có `outlineStyle: 'none'` nhưng react-native-web nhận giá trị này.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

// Face ID mô phỏng chỉ có khi chạy dev (Expo Go, web) để demo; bản build thật luôn dùng Face ID của máy.
const CAN_SIMULATE_FACE_ID = __DEV__;

// Chỉ hiện nút khi máy có nhận diện khuôn mặt (Face ID); web không hỗ trợ sinh trắc học.
async function hasFaceRecognition(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return hardware && enrolled && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  } catch {
    return false;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { login, loginWithFaceId, sessionExpired } = useAuth();

  // Đã đăng nhập trên máy này rồi thì chỉ hỏi mật khẩu hoặc Face ID cho đúng tài khoản đó.
  const [remembered, setRemembered] = useState<RememberedUser | null>(null);
  // Chờ đọc xong dữ liệu trên máy rồi mới vẽ form, tránh form đầy đủ chớp lên rồi đổi.
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [simulating, setSimulating] = useState(false);
  // Đăng ký hiện thay chỗ form đăng nhập; quay lại thì form vẫn giữ nguyên trạng thái. Đăng ký gồm hai phần:
  // `onboarding` (gửi hồ sơ CCCD + ảnh, nhân viên duyệt, customer-service) rồi `register` (tạo tài khoản đăng nhập
  // cho hồ sơ đã duyệt, auth-service).
  const [mode, setMode] = useState<'login' | 'onboarding' | 'register'>('login');
  const [approvedApplication, setApprovedApplication] = useState<SavedApplication | null>(null);
  // Thông báo thành công (vd. vừa đăng ký xong), khác với lỗi.
  const [notice, setNotice] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    let active = true;
    Promise.all([hasFaceRecognition(), getRememberedUser()]).then(([face, user]) => {
      if (!active) return;
      setFaceAvailable(face);
      setRemembered(user);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const switchAccount = () => {
    forgetRememberedUser();
    setRemembered(null);
    setUsername('');
    setPassword('');
    setError(null);
    setNotice(null);
  };

  const openRegister = () => {
    Keyboard.dismiss();
    setError(null);
    setNotice(null);
    setMode('onboarding');
  };

  // Đăng ký xong: về form đăng nhập, điền sẵn tên vừa tạo, chỉ còn nhập mật khẩu.
  const handleRegistered = (newUsername: string) => {
    // Hồ sơ đăng ký đã dùng xong (đã có tài khoản đăng nhập): quên trên máy.
    void clearSavedApplication();
    setApprovedApplication(null);
    setUsername(newUsername);
    setPassword('');
    setError(null);
    setNotice(t('login.registered'));
    setMode('login');
  };

  const handleSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    const req: LoginRequest = { username: remembered?.username ?? username.trim(), password };
    if (!req.username || !req.password) {
      setError(t('login.errors.required'));
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await login(req);
      if (!res.success) setError(failureText(res));
    } catch {
      setError(t('login.errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  // Lỗi từ auth-service có loại lỗi (dịch theo ngôn ngữ đang dùng); lỗi của chế độ mock chỉ có câu thông báo.
  const failureText = (res: LoginResponse) =>
    res.error ? t(LOGIN_ERRORS[res.error]) : (res.message ?? t('login.errors.failed'));

  const completeFaceLogin = async () => {
    if (!remembered) return;
    setLoading(true);
    try {
      const res = await loginWithFaceId({ username: remembered.username });
      if (!res.success) setError(failureText(res));
    } catch {
      setError(t('login.errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleFaceId = async () => {
    if (loading) return;
    Keyboard.dismiss();
    if (!remembered) return;
    setError(null);
    // Máy/môi trường không có Face ID thật (web, giả lập) thì dùng màn mô phỏng khi đang dev.
    if (!faceAvailable) {
      if (CAN_SIMULATE_FACE_ID) setSimulating(true);
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('login.faceIdPrompt'),
      cancelLabel: t('common.cancel'),
      disableDeviceFallback: true,
    });
    if (!result.success) {
      if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') return;
      // Expo Go không khai báo quyền Face ID nên iOS không mở được camera; cần development build.
      // Native iOS trả mã này nhưng type của thư viện chưa liệt kê, nên so sánh dạng chuỗi.
      if ((result.error as string) === 'missing_usage_description') {
        if (CAN_SIMULATE_FACE_ID) setSimulating(true);
        else setError(t('login.errors.faceIdNeedsBuild'));
        return;
      }
      if (result.error === 'lockout') {
        setError(t('login.errors.faceIdLockout'));
        return;
      }
      setError(t('login.errors.faceIdFailed'));
      return;
    }
    await completeFaceLogin();
  };

  const iconColor = (field: Field) => (focused === field ? theme.primary : theme.textSecondary);

  if (mode === 'onboarding') {
    return (
      <OnboardingScreen
        onCancel={() => setMode('login')}
        onApproved={(application) => {
          setApprovedApplication(application);
          setMode('register');
        }}
      />
    );
  }

  if (mode === 'register' && approvedApplication) {
    return (
      <RegisterScreen
        application={approvedApplication}
        onCancel={() => setMode('onboarding')}
        onRegistered={handleRegistered}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nền trang trí: quầng xanh nhạt phía trên và hai khối tròn mờ, không bắt chạm. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[theme.primarySoft, theme.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.orb, styles.orbTop, { backgroundColor: theme.scoreEnd }]} />
        <View style={[styles.orb, styles.orbSide, { backgroundColor: theme.scoreStart }]} />
      </View>

      {ready && (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.container} onPress={Keyboard.dismiss} accessible={false}>
          {remembered ? (
            <Animated.View key="returning" entering={enter(0)} style={styles.header}>
              <View style={styles.avatarWrap}>
                <UserAvatar user={remembered} size={84} />
              </View>
              <Text style={styles.subtitle}>{t('login.hello')}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {remembered.fullName}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View key="new" entering={enter(0)} style={styles.header}>
              <View style={styles.logo}>
                <AppLogo size={88} />
              </View>
              <Text style={styles.title}>{t('login.welcome')}</Text>
              <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
            </Animated.View>
          )}

          <Animated.View entering={enter(120)} style={[styles.form, styles.card]}>
            {notice ? (
              <Text style={styles.notice} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            ) : null}
            {/* Vừa bị đưa về đây vì phiên hết hạn (API trả 401); có lỗi đăng nhập mới thì chỉ hiện lỗi đó. */}
            {!notice && !error && sessionExpired ? (
              <Text style={styles.expired} accessibilityLiveRegion="polite" role="alert">
                {t('login.errors.sessionExpired')}
              </Text>
            ) : null}

            {/* Ô nhập gộp một khối; dòng đang nhập có nền nhạt và vạch màu bên trái. */}
            <View style={styles.group}>
              {!remembered && (
              <>
              <View style={[styles.row, focused === 'username' && styles.rowFocused]}>
                {focused === 'username' && <View style={styles.focusBar} />}
                <SymbolView name={LoginIcons.user} size={IconSize.xl} tintColor={iconColor('username')} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('login.usernamePlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t('login.username')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>
              <View style={styles.divider} />
              </>
              )}
              <View style={[styles.row, focused === 'password' && styles.rowFocused]}>
                {focused === 'password' && <View style={styles.focusBar} />}
                <SymbolView name={LoginIcons.lock} size={IconSize.xl} tintColor={iconColor('password')} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t('login.password')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}>
                  <SymbolView
                    name={showPassword ? CommonIcons.eye : CommonIcons.eyeSlash}
                    size={IconSize.xl}
                    tintColor={theme.primary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => Alert.alert(t('login.forgotPassword'), t('common.comingSoon'))}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.forgot}>
              <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
            </Pressable>

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.button, (loading || pressed) && styles.dim]}
                onPress={handleSubmit}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}>
                <View style={styles.buttonFill}>
                  {loading ? (
                    <ActivityIndicator color={theme.onPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>{t('login.submit')}</Text>
                  )}
                </View>
              </Pressable>
              {/* Face ID chỉ dùng cho tài khoản đã nhớ; lần đầu trên máy phải nhập tài khoản và mật khẩu.
                  Với auth-service thật thì chưa có Face ID (app chưa lưu refresh token trên máy). */}
              {remembered && USE_MOCK_AUTH && (faceAvailable || CAN_SIMULATE_FACE_ID) && (
                <Pressable
                  style={({ pressed }) => [styles.faceButton, (loading || pressed) && styles.dim]}
                  onPress={handleFaceId}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={t('login.faceId')}>
                  <SymbolView name={LoginIcons.faceId} size={IconSize.xxl} tintColor={theme.primary} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          {remembered ? (
            <Animated.View key="returning-footer" entering={enter(240)} style={styles.switchRow}>
              <Text style={styles.note}>{t('login.notYou')}</Text>
              <Pressable onPress={switchAccount} hitSlop={8} accessibilityRole="button">
                <Text style={styles.switchText}>{t('login.switchAccount')}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View key="new-footer" entering={enter(240)}>
              <View style={styles.switchRow}>
                <Text style={styles.note}>{t('login.noAccount')}</Text>
                <Pressable onPress={openRegister} hitSlop={8} accessibilityRole="button" disabled={loading}>
                  <Text style={styles.switchText}>{t('login.register')}</Text>
                </Pressable>
              </View>
              {USE_MOCK_AUTH && <Text style={[styles.note, styles.noteSpaced]}>{t('login.demoNote')}</Text>}
            </Animated.View>
          )}
        </Pressable>
      </KeyboardAvoidingView>
      )}

      {CAN_SIMULATE_FACE_ID && (
        <FaceScanModal
          visible={simulating}
          onCancel={() => setSimulating(false)}
          onSuccess={() => {
            setSimulating(false);
            completeFaceLogin();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four },
    orb: { position: 'absolute', borderRadius: 999, opacity: 0.14 },
    orbTop: { width: 280, height: 280, top: -110, right: -90 },
    orbSide: { width: 220, height: 220, top: 200, left: -130 },
    header: { alignItems: 'center', marginBottom: 28 },
    logo: { marginBottom: 18 },
    title: { ...Typography.title, fontSize: 26, lineHeight: 32, color: theme.text },
    subtitle: { ...Typography.body, marginTop: 6, color: theme.textSecondary },
    form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
    // Form nằm trong một thẻ nổi trên nền trang trí.
    card: {
      padding: 20,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      boxShadow: theme.tabBarShadow,
    },
    group: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundMuted,
      overflow: 'hidden',
    },
    row: {
      height: ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 18,
    },
    rowFocused: { backgroundColor: theme.primarySoft },
    focusBar: {
      position: 'absolute',
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      backgroundColor: theme.primary,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
    input: { flex: 1, height: '100%', fontSize: 16, color: theme.text, ...WEB_NO_OUTLINE },
    forgot: { alignSelf: 'flex-end', marginTop: 14 },
    forgotText: { ...Typography.callout, color: theme.primary, fontWeight: '600' },
    error: { ...Typography.callout, marginTop: 12, color: theme.danger },
    notice: {
      ...Typography.callout,
      marginBottom: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: Radius.md,
      overflow: 'hidden',
      color: theme.success,
      backgroundColor: theme.successSoft,
    },
    expired: {
      ...Typography.callout,
      marginBottom: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: Radius.md,
      overflow: 'hidden',
      color: theme.warning,
      backgroundColor: theme.warningSoft,
    },
    actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    button: { flex: 1, height: ACTION_HEIGHT, borderRadius: Radius.lg, overflow: 'hidden', boxShadow: theme.fabShadow },
    buttonFill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    faceButton: {
      width: ACTION_HEIGHT,
      height: ACTION_HEIGHT,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      borderWidth: 1,
      borderColor: theme.borderAccent,
    },
    dim: { opacity: 0.7 },
    buttonText: { fontSize: 16, fontWeight: '700', color: theme.onPrimary },
    note: { ...Typography.caption, textAlign: 'center', color: theme.textSecondary },
    noteSpaced: { marginTop: 20 },
    switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
    switchText: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
    avatarWrap: { marginBottom: 16, borderRadius: 44, boxShadow: theme.fabShadow },
  });
}
