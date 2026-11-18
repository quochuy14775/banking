import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { CommonIcons, LoginIcons } from '@/constants/icons';
import { IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { checkPassword, checkUsername, normalizeUsername } from '@/helpers';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n, type TranslationKey } from '@/i18n';
import type { SavedApplication } from '@/models';
import { register } from '@/services/auth.service';

// Cùng hiệu ứng vào màn với màn đăng nhập: các khối trượt nhẹ từ dưới lên, không nảy.
const enter = (delay: number) => FadeInDown.duration(420).delay(delay).easing(Easing.out(Easing.cubic));

const ROW_HEIGHT = 60;
const ACTION_HEIGHT = 54;

type Field = 'username' | 'password' | 'confirm';
type FieldErrors = Partial<Record<Field, string>>;

const USERNAME_ERRORS: Record<NonNullable<ReturnType<typeof checkUsername>>, TranslationKey> = {
  required: 'register.errors.usernameRequired',
  invalid: 'register.errors.usernameInvalid',
};

const PASSWORD_ERRORS: Record<NonNullable<ReturnType<typeof checkPassword>>, TranslationKey> = {
  required: 'register.errors.passwordRequired',
  length: 'register.errors.passwordLength',
  tooLong: 'register.errors.passwordTooLong',
  letterAndDigit: 'register.errors.passwordLetterAndDigit',
};

// Tắt viền focus mặc định của trình duyệt, giống màn đăng nhập.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

interface Props {
  /** Hồ sơ đăng ký đã được duyệt: tài khoản đăng nhập sẽ gắn với khách hàng của hồ sơ này. */
  application: SavedApplication;
  /** Quay lại màn đăng nhập mà không đăng ký. */
  onCancel: () => void;
  /** Đăng ký xong: màn đăng nhập điền sẵn tên đăng nhập vừa tạo. */
  onRegistered: (username: string) => void;
}

/**
 * Đăng ký tài khoản đăng nhập: tên đăng nhập, mật khẩu, nhập lại mật khẩu.
 * Kiểm tra định dạng ngay trên app (cùng quy tắc với auth-service) rồi mới gửi; lỗi từ backend hiện dưới đúng ô.
 */
export default function RegisterScreen({ application, onCancel, onRegistered }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  // Nút Back của Android quay về màn đăng nhập thay vì thoát app; đang gửi thì chờ xong, giống link "Đăng nhập".
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loading) onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [loading, onCancel]);

  // Sửa ô nào thì xóa lỗi của ô đó.
  const edit = (field: Field, setter: (value: string) => void) => (value: string) => {
    setter(value);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError(null);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const usernameIssue = checkUsername(username);
    if (usernameIssue) next.username = t(USERNAME_ERRORS[usernameIssue]);
    const passwordIssue = checkPassword(password);
    if (passwordIssue) next.password = t(PASSWORD_ERRORS[passwordIssue]);
    if (!confirm) next.confirm = t('register.errors.confirmRequired');
    else if (confirm !== password) next.confirm = t('register.errors.confirmMismatch');
    return next;
  };

  const handleSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const res = await register({
        username: normalizeUsername(username),
        password,
        applicationId: application.applicationId,
        accessCode: application.accessCode,
      });
      if (res.success) {
        onRegistered(res.user?.username ?? normalizeUsername(username));
        return;
      }
      const fieldErrors: FieldErrors = { ...res.fieldErrors };
      setErrors(fieldErrors);
      // Lỗi đã hiện dưới ô thì không cần câu chung; không có lỗi nào để hiện thì báo thất bại chung.
      const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
      setFormError(res.message ?? (hasFieldErrors ? null : t('register.errors.failed')));
    } catch {
      setFormError(t('register.errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const iconColor = (field: Field) =>
    errors[field] ? theme.danger : focused === field ? theme.primary : theme.textSecondary;

  // Dòng ghi chú dưới nhóm ô nhập: có lỗi thì hiện lỗi, chưa có thì hiện quy tắc của ô đó.
  const notes: { key: string; text: string; isError: boolean }[] = [
    errors.username
      ? { key: 'username', text: errors.username, isError: true }
      : { key: 'username', text: t('register.usernameHint'), isError: false },
    errors.password
      ? { key: 'password', text: errors.password, isError: true }
      : { key: 'password', text: t('register.passwordHint'), isError: false },
    ...(errors.confirm ? [{ key: 'confirm', text: errors.confirm, isError: true }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nền trang trí giống màn đăng nhập, không bắt chạm. */}
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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Form đăng ký dài hơn form đăng nhập nên cho cuộn được trên máy màn hình nhỏ. */}
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={enter(0)} style={styles.header}>
            <View style={styles.logo}>
              <AppLogo size={72} />
            </View>
            <Text style={styles.title}>{t('register.title')}</Text>
            <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
          </Animated.View>

          <Animated.View entering={enter(120)} style={[styles.form, styles.card]}>
            <View style={styles.group}>
              <View style={[styles.row, focused === 'username' && styles.rowFocused]}>
                {focused === 'username' && <View style={styles.focusBar} />}
                <SymbolView name={LoginIcons.user} size={IconSize.xl} tintColor={iconColor('username')} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={edit('username', setUsername)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('register.usernamePlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t('register.username')}
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
              <View style={[styles.row, focused === 'password' && styles.rowFocused]}>
                {focused === 'password' && <View style={styles.focusBar} />}
                <SymbolView name={LoginIcons.lock} size={IconSize.xl} tintColor={iconColor('password')} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={edit('password', setPassword)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('register.passwordPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t('register.password')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmRef.current?.focus()}
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
              <View style={styles.divider} />
              <View style={[styles.row, focused === 'confirm' && styles.rowFocused]}>
                {focused === 'confirm' && <View style={styles.focusBar} />}
                <SymbolView name={LoginIcons.lock} size={IconSize.xl} tintColor={iconColor('confirm')} />
                <TextInput
                  ref={confirmRef}
                  style={styles.input}
                  value={confirm}
                  onChangeText={edit('confirm', setConfirm)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t('register.confirmPassword')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.notes}>
              {notes.map((note) => (
                <Text
                  key={note.key}
                  style={note.isError ? styles.fieldError : styles.hint}
                  accessibilityLiveRegion={note.isError ? 'polite' : 'none'}>
                  {note.text}
                </Text>
              ))}
            </View>

            {formError ? (
              <Text style={styles.formError} accessibilityLiveRegion="polite" role="alert">
                {formError}
              </Text>
            ) : null}

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
                  <Text style={styles.buttonText}>{t('register.submit')}</Text>
                )}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={enter(240)} style={styles.switchRow}>
            <Text style={styles.note}>{t('register.haveAccount')}</Text>
            <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" disabled={loading}>
              <Text style={styles.switchText}>{t('register.backToLogin')}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: 24 },
    orb: { position: 'absolute', borderRadius: 999, opacity: 0.14 },
    orbTop: { width: 280, height: 280, top: -110, right: -90 },
    orbSide: { width: 220, height: 220, top: 200, left: -130 },
    header: { alignItems: 'center', marginBottom: 24 },
    logo: { marginBottom: 16 },
    title: { ...Typography.title, fontSize: 26, lineHeight: 32, color: theme.text },
    subtitle: { ...Typography.body, marginTop: 6, textAlign: 'center', color: theme.textSecondary },
    form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
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
    notes: { marginTop: 12, gap: 4 },
    hint: { ...Typography.caption, color: theme.textSecondary },
    fieldError: { ...Typography.caption, color: theme.danger },
    formError: { ...Typography.callout, marginTop: 12, color: theme.danger },
    button: {
      height: ACTION_HEIGHT,
      marginTop: 20,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      boxShadow: theme.fabShadow,
    },
    buttonFill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    dim: { opacity: 0.7 },
    buttonText: { fontSize: 16, fontWeight: '700', color: theme.onPrimary },
    note: { ...Typography.caption, textAlign: 'center', color: theme.textSecondary },
    switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
    switchText: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
  });
}
