import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';

import { Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { REJECT_REASON_MAX_LENGTH } from '@/services/admin-review.service';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

// Tắt viền focus mặc định của trình duyệt, giống các ô nhập khác; ô đang nhập đã có viền màu.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

interface Props {
  visible: boolean;
  /** Lý do gợi ý (đã dịch); bấm vào thì điền vào ô lý do để sửa tiếp. */
  suggestions: string[];
  loading: boolean;
  /** Lỗi khi gửi (vd mất mạng); hộp vẫn mở để thử lại mà không mất lý do đã nhập. */
  error: string | null;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

/** Từ chối hồ sơ: bắt buộc nhập lý do (tối đa 300 ký tự), có vài lý do gợi ý. Khách thấy lý do này. */
export default function RejectDialog({ visible, suggestions, loading, error, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const trimmed = reason.trim();
  const requiredError = submitted && !trimmed ? t('admin.rejectDialog.required') : null;

  const cancel = () => {
    if (!loading) onCancel();
  };

  const submit = () => {
    if (loading) return;
    setSubmitted(true);
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={cancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessible={false} />
        <View style={styles.card} role="dialog" accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header">
              {t('admin.rejectDialog.title')}
            </Text>
            <Text style={styles.hint}>{t('admin.rejectDialog.hint')}</Text>

            <TextInput
              style={[styles.input, focused && styles.inputFocused, requiredError && styles.inputError]}
              value={reason}
              onChangeText={setReason}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t('admin.rejectDialog.placeholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('admin.rejectDialog.label')}
              multiline
              maxLength={REJECT_REASON_MAX_LENGTH}
              editable={!loading}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.fieldError} accessibilityLiveRegion="polite">
                {requiredError ?? ''}
              </Text>
              <Text style={styles.counter}>
                {t('admin.rejectDialog.counter', { count: reason.length, max: REJECT_REASON_MAX_LENGTH })}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>{t('admin.rejectDialog.suggestions')}</Text>
            <View style={styles.suggestions}>
              {suggestions.map((suggestion) => {
                const selected = reason === suggestion;
                return (
                  <Pressable
                    key={suggestion}
                    onPress={() => setReason(suggestion)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.suggestion, selected && styles.suggestionSelected, pressed && styles.dim]}>
                    <Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>{suggestion}</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={cancel}
                disabled={loading}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, styles.secondary, (pressed || loading) && styles.dim]}>
                <Text style={styles.secondaryText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ busy: loading, disabled: loading }}
                style={({ pressed }) => [styles.button, styles.destructive, (pressed || loading) && styles.dim]}>
                {loading ? (
                  <ActivityIndicator color={theme.backgroundElement} />
                ) : (
                  <Text style={styles.destructiveText}>{t('admin.rejectDialog.confirm')}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three, backgroundColor: theme.overlay },
    card: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      boxShadow: theme.cardShadow,
      overflow: 'hidden',
    },
    content: { padding: Spacing.four, gap: Spacing.two },
    title: { ...Typography.heading, color: theme.text },
    hint: { ...Typography.callout, color: theme.textSecondary },
    input: {
      ...Typography.body,
      minHeight: 96,
      marginTop: Spacing.one,
      padding: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundMuted,
      color: theme.text,
      ...WEB_NO_OUTLINE,
    },
    inputFocused: { borderColor: theme.primary },
    inputError: { borderColor: theme.danger },
    inputFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
    fieldError: { ...Typography.caption, flex: 1, color: theme.danger },
    counter: { ...Typography.caption, color: theme.textMuted },
    sectionLabel: { ...Typography.micro, marginTop: Spacing.one, color: theme.textMuted, textTransform: 'uppercase' },
    suggestions: { gap: Spacing.two },
    suggestion: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
    suggestionSelected: { borderColor: theme.danger, backgroundColor: theme.dangerSoft },
    suggestionText: { ...Typography.callout, color: theme.text },
    suggestionTextSelected: { color: theme.danger },
    error: { ...Typography.callout, color: theme.danger },
    actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
    button: { flex: 1, minHeight: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
    secondary: { backgroundColor: theme.backgroundMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
    secondaryText: { ...Typography.bodyStrong, color: theme.text },
    destructive: { backgroundColor: theme.danger },
    destructiveText: { ...Typography.bodyStrong, color: theme.backgroundElement },
    dim: { opacity: 0.7 },
  });
}
