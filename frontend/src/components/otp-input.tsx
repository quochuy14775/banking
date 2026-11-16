import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

const OTP_LENGTH = 6;
// Chờ một nhịp ngắn sau số cuối để kịp thấy ô thứ 6 được điền rồi mới kiểm tra hoặc chuyển bước.
const COMPLETE_DELAY_MS = 120;

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Gọi ngay khi vừa nhập đủ 6 số, để tự kiểm tra mà người dùng không phải bấm nút. */
  onComplete?: (value: string) => void;
  error?: boolean;
  /** Đang kiểm tra mã: ô mờ đi và không nhận thêm thao tác nhập. */
  busy?: boolean;
  /** Nhập mã PIN: ô hiện dấu chấm thay cho số và không gợi ý tự điền mã từ SMS. */
  secure?: boolean;
  accessibilityLabel: string;
}

// Một TextInput ẩn nhận bàn phím/autofill SMS, 6 ô chỉ để hiển thị.
export default function OtpInput({ value, onChange, onComplete, error, busy, secure, accessibilityLabel }: Props) {
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
    },
    [],
  );

  const handleChange = (text: string) => {
    if (busy) return;
    const next = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(next);
    if (completeTimer.current) clearTimeout(completeTimer.current);
    if (onComplete && next.length === OTP_LENGTH && next !== value) {
      completeTimer.current = setTimeout(() => onComplete(next), COMPLETE_DELAY_MS);
    }
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[styles.row, busy && styles.rowBusy]}
      accessible={false}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <View
          key={i}
          style={[styles.box, i === value.length && styles.boxActive, error && styles.boxError]}>
          {secure ? (
            i < value.length && <View style={styles.dot} />
          ) : (
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          )}
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType={secure ? 'none' : 'oneTimeCode'}
        autoComplete={secure ? 'off' : 'sms-otp'}
        maxLength={OTP_LENGTH}
        autoFocus
        caretHidden
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy }}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
    rowBusy: { opacity: 0.6 },
    box: {
      width: 44,
      height: 52,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.backgroundMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxActive: { borderColor: theme.primary },
    boxError: { borderColor: theme.danger },
    digit: { fontSize: 22, fontWeight: '700', color: theme.text },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.text },
    hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
  });
}
