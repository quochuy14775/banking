import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonIcons } from '@/constants/icons';
import { Radius, Typography, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import type { LoginRequest } from '@/models';

export default function LoginScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const handleSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    const req: LoginRequest = { username: username.trim(), password };
    if (!req.username || !req.password) {
      setError(t('login.errors.required'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await login(req);
      if (!res.success) setError(res.message ?? t('login.errors.failed'));
    } catch {
      setError(t('login.errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.container} onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>VB</Text>
            </View>
            <Text style={styles.title}>{t('common.appName')}</Text>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('login.username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('login.usernamePlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />

            <Text style={styles.label}>{t('login.password')}</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!loading}
              />
              <Pressable
                style={styles.toggle}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}>
                <SymbolView
                  name={showPassword ? CommonIcons.eye : CommonIcons.eyeSlash}
                  size={20}
                  tintColor={theme.primary}
                />
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.button, (loading || pressed) && styles.buttonDim]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}>
              {loading ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>{t('login.submit')}</Text>
              )}
            </Pressable>

            <Text style={styles.note}>{t('login.demoNote')}</Text>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    logo: {
      width: 64,
      height: 64,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: theme.primary,
    },
    logoText: { fontSize: 24, fontWeight: '700', color: theme.onPrimary },
    title: { ...Typography.display, color: theme.text },
    subtitle: { ...Typography.body, marginTop: 6, color: theme.textSecondary },
    form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12, color: theme.text },
    input: {
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1,
      paddingHorizontal: 14,
      fontSize: 16,
      backgroundColor: theme.backgroundElement,
      color: theme.text,
      borderColor: theme.border,
    },
    passwordWrap: { justifyContent: 'center' },
    passwordInput: { paddingRight: 48 },
    toggle: { position: 'absolute', right: 14 },
    error: { fontSize: 14, marginTop: 12, color: theme.danger },
    button: {
      height: 50,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      backgroundColor: theme.primary,
    },
    buttonDim: { opacity: 0.7 },
    buttonText: { fontSize: 16, fontWeight: '600', color: theme.onPrimary },
    note: { ...Typography.caption, textAlign: 'center', marginTop: 16, color: theme.textSecondary },
  });
}
