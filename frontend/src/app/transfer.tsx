import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import BankPicker from '@/features/transfer/components/bank-picker';
import OtpInput from '@/shared/components/otp-input';
import PrimaryButton from '@/shared/components/primary-button';
import TransferSteps, { TRANSFER_STEPS, type TransferStep } from '@/features/transfer/components/transfer-steps';
import { SmartOtpIcons, TransferIcons } from '@/constants/icons';
import { Fonts, MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatNumberVND, formatVND } from '@/helpers';
import { refreshAccounts, useAccounts } from '@/shared/hooks/use-accounts';
import { useSmartOtpCode } from '@/features/smart-otp/hooks/use-smart-otp-code';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import type { AuthMethod, Bank, Contact } from '@/models';
import { getBankByCode } from '@/services/bank.service';
import {
  createTransfer,
  getContacts,
  getDemoLookupNumbers,
  lookupAccount,
  resendTransferOtp,
  verifyTransferOtp,
} from '@/services/transfer.service';

const RESEND_SECONDS = 60;
const LOOKUP_DEBOUNCE_MS = 400;
const MIN_ACCOUNT_DIGITS = 6;
const STEP_IN_MS = 280;
// Mọi hiệu ứng chạy một lần theo timing + ease-out, không dùng lò xo để tránh nảy qua lại.
const EASE_OUT = Easing.out(Easing.cubic);
const SMOOTH = { duration: 240, easing: EASE_OUT };
const pop = (delay = 0) => ZoomIn.duration(SMOOTH.duration).easing(EASE_OUT).delay(delay);


const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];
const MIN_SUGGESTION = 10_000;
const MAX_SUGGESTIONS = 3;

// Chưa nhập: mức hay dùng. Đã nhập: coi số đã gõ là phần đầu và thêm số 0 (5 → 50.000, 500.000, 5.000.000).
// Chỉ gợi ý mức không vượt số dư.
function suggestAmounts(typed: number, balance: number): number[] {
  if (typed <= 0) return QUICK_AMOUNTS.filter((v) => v <= balance);
  const result: number[] = [];
  for (let value = typed * 10; value <= balance && result.length < MAX_SUGGESTIONS; value *= 10) {
    if (value >= MIN_SUGGESTION) result.push(value);
  }
  return result;
}

type Styles = ReturnType<typeof createStyles>;

export default function TransferScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { user } = useAuth();
  const accounts = useAccounts();
  const smartOtpCode = useSmartOtpCode();

  const [step, setStep] = useState<TransferStep>('form');
  // Hướng chuyển bước để nội dung trượt vào từ phải (tiến) hoặc trái (lùi).
  const [forward, setForward] = useState(true);
  const otpShake = useSharedValue(0);
  const otpShakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: otpShake.get() }] }));
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [manualBank, setManualBank] = useState<Bank | null>(null);
  const [manualNumber, setManualNumber] = useState('');
  // Kết quả tra cứu gắn với đúng truy vấn đã gửi, để bỏ qua kết quả cũ khi người dùng sửa số.
  const [lookup, setLookup] = useState<{ query: string; name: string; error?: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState<Contact | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  // Server chọn khi tạo lệnh: SMS thì nhập mã nhận qua tin nhắn, Smart OTP thì nhập PIN để app tự tạo mã.
  const [authMethod, setAuthMethod] = useState<AuthMethod>('sms');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dữ liệu từ mã QR (màn Quét QR truyền qua params). `qrId` đổi mỗi lần quét để biết cần điền lại.
  const params = useLocalSearchParams<{
    qrId?: string;
    bankCode?: string;
    account?: string;
    amount?: string;
    note?: string;
    name?: string;
  }>();
  const [appliedQrId, setAppliedQrId] = useState<string | undefined>(undefined);
  const [pendingBankCode, setPendingBankCode] = useState<string | null>(null);
  const [qrRecipient, setQrRecipient] = useState<{ account: string; name: string } | null>(null);

  if (params.qrId && params.qrId !== appliedQrId) {
    setAppliedQrId(params.qrId);
    setStep('form');
    setForward(true);
    setEntryMode('manual');
    setManualBank(null);
    setPendingBankCode(params.bankCode ?? null);
    setManualNumber(params.account ?? '');
    setAmount((params.amount ?? '').replace(/\D/g, ''));
    setNote(params.note ?? '');
    setQrRecipient(params.name ? { account: params.account ?? '', name: params.name } : null);
    setRecipient(null);
    setTransferId(null);
    setOtp('');
    setError('');
  }

  const fromAccount = accounts.find((a) => a.id === fromAccountId) ?? accounts[0];
  const amountNumber = Number(amount) || 0;
  const manualDigits = manualNumber.replace(/\D/g, '');
  const canLookup = !!manualBank && manualDigits.length >= MIN_ACCOUNT_DIGITS;
  const lookupQuery = canLookup ? `${manualBank.code}|${manualDigits}` : '';
  const currentLookup = lookup && lookup.query === lookupQuery ? lookup : null;
  // Tra cứu không ra nhưng mã QR có kèm tên chủ tài khoản thì dùng tên trong mã.
  const qrName = qrRecipient && qrRecipient.account === manualDigits ? qrRecipient.name : '';
  const resolvedName = currentLookup?.name || (currentLookup?.error ? qrName : '');
  const lookupError = resolvedName ? '' : (currentLookup?.error ?? '');
  const lookingUp = canLookup && !currentLookup;
  const lookupStatus = lookingUp ? 'pending' : resolvedName ? 'found' : lookupError ? 'error' : null;
  const isSmartOtp = authMethod === 'smartOtp';
  const demoNumbers = getDemoLookupNumbers();
  const amountSuggestions = suggestAmounts(amountNumber, fromAccount?.balance ?? 0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getContacts({ userId: user.id }).then((res) => {
      if (active && res.success) setContacts(res.items);
    });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!lookupQuery) return;
    let active = true;
    const [bank, number] = lookupQuery.split('|');
    const timer = setTimeout(() => {
      lookupAccount({ bank, number }).then((res) => {
        if (!active) return;
        setLookup(
          res.success
            ? { query: lookupQuery, name: res.name ?? '' }
            : { query: lookupQuery, name: '', error: res.message ?? t('transfer.errors.unknown') },
        );
      });
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [lookupQuery, t]);

  useEffect(() => {
    if (!pendingBankCode) return;
    let active = true;
    getBankByCode(pendingBankCode).then((bank) => {
      if (!active) return;
      setManualBank(bank);
      setPendingBankCode(null);
    });
    return () => {
      active = false;
    };
  }, [pendingBankCode]);

  useEffect(() => {
    if (step !== 'otp' || authMethod !== 'sms' || resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [step, authMethod, resendIn]);

  const goTo = (next: TransferStep) => {
    setError('');
    setForward(TRANSFER_STEPS.indexOf(next) >= TRANSFER_STEPS.indexOf(step));
    setStep(next);
  };

  const stepEntering = (forward ? FadeInRight : FadeInLeft).duration(STEP_IN_MS);

  const handleContinue = () => {
    const target =
      entryMode === 'manual'
        ? resolvedName && manualBank
          ? { id: 'manual-entry', name: resolvedName, bank: manualBank.shortName, number: manualDigits }
          : null
        : selectedContact;
    if (!target) {
      setError(t(entryMode === 'manual' ? 'transfer.errors.manualRecipient' : 'transfer.errors.recipient'));
      return;
    }
    if (amountNumber <= 0) {
      setError(t('transfer.errors.amount'));
      return;
    }
    if (fromAccount && amountNumber > fromAccount.balance) {
      setError(t('transfer.errors.balance'));
      return;
    }
    setRecipient(target);
    goTo('confirm');
  };

  const handleConfirm = async () => {
    if (!user || !fromAccount || !recipient) return;
    setSubmitting(true);
    const res = await createTransfer({
      userId: user.id,
      fromAccountId: fromAccount.id,
      toBank: recipient.bank,
      toNumber: recipient.number,
      toName: recipient.name,
      amount: amountNumber,
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success || !res.transferId) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setTransferId(res.transferId);
    setAuthMethod(res.authMethod ?? 'sms');
    setOtp('');
    setResendIn(RESEND_SECONDS);
    goTo('otp');
  };

  // Tự gọi khi vừa nhập đủ 6 số, người dùng không phải bấm nút.
  const handleVerify = async (code: string) => {
    if (!transferId) return;
    setSubmitting(true);
    // Smart OTP: ô nhập là mã PIN; app mở khóa rồi tự tạo mã gửi lên, PIN không rời khỏi máy.
    const unlocked = isSmartOtp ? await smartOtpCode(code) : { code };
    const res =
      'code' in unlocked
        ? await verifyTransferOtp({ transferId, otp: unlocked.code })
        : { success: false, message: unlocked.error };
    setSubmitting(false);
    if (!res.success) {
      // Xóa mã vừa nhập để gõ lại ngay; đủ 6 số là tự kiểm tra lần nữa.
      setOtp('');
      setError(res.message ?? t('transfer.errors.unknown'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      otpShake.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refreshAccounts();
    goTo('success');
  };

  const handleResend = async () => {
    if (!transferId || resendIn > 0) return;
    const res = await resendTransferOtp({ transferId });
    if (!res.success) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setOtp('');
    setError('');
    setResendIn(RESEND_SECONDS);
  };

  const reset = () => {
    setSelectedContact(null);
    setManualBank(null);
    setManualNumber('');
    setAmount('');
    setNote('');
    setRecipient(null);
    setTransferId(null);
    setOtp('');
    goTo('form');
  };

  const handleBack = () => {
    if (step === 'confirm') goTo('form');
    else if (step === 'otp') goTo('confirm');
    else router.navigate('/');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {step !== 'success' && (
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('transfer.back')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
          </Pressable>
        )}
        <Text style={styles.title} accessibilityRole="header">
          {t('transfer.title')}
        </Text>
      </View>

      <View style={styles.stepsWrap}>
        <TransferSteps current={step} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Lần đầu mở màn thì hiện ngay; hiệu ứng trượt chỉ chạy khi chuyển bước. */}
          <LayoutAnimationConfig skipEntering>
          {step === 'form' && (
            <Animated.View key="form" entering={stepEntering} style={styles.stepBody}>
              <Field label={t('transfer.fromAccount')} styles={styles}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {accounts.map((acc) => {
                    const active = acc.id === fromAccount?.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setFromAccountId(acc.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        style={[styles.accountChip, active && styles.accountChipActive]}>
                        <Text style={[styles.accountLabel, active && styles.textOnPrimarySoft]}>{acc.label}</Text>
                        <Text style={styles.accountBalance}>{formatVND(acc.balance)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Field>

              <Field label={t('transfer.recipient')} styles={styles}>
                <EntryModeSegment
                  value={entryMode}
                  onChange={setEntryMode}
                  label={(mode) => t(`transfer.${mode}`)}
                  styles={styles}
                />

                {entryMode === 'saved' ? (
                  <Animated.View key="saved" entering={FadeIn.duration(220)} style={styles.list}>
                    {/* Quay lại tab thì dấu ✓ đã chọn hiện sẵn, chỉ bật khi đổi lựa chọn. */}
                    <LayoutAnimationConfig skipEntering>
                    {contacts.map((c) => {
                      const active = selectedContact?.id === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedContact(c)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.contact, active && styles.contactActive]}>
                          <View style={[styles.avatar, active && styles.avatarActive]}>
                            <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                              {c.name.split(' ').pop()?.[0]}
                            </Text>
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.contactName}>{c.name}</Text>
                            <Text style={styles.contactMeta}>
                              {c.bank} · <Text style={styles.mono}>{c.number}</Text>
                            </Text>
                          </View>
                          {active && (
                            <Animated.View entering={pop()}>
                              <SymbolView name={TransferIcons.check} size={IconSize.md} tintColor={theme.primary} />
                            </Animated.View>
                          )}
                        </Pressable>
                      );
                    })}
                    </LayoutAnimationConfig>
                  </Animated.View>
                ) : (
                  <Animated.View key="manual" entering={FadeIn.duration(220)} style={styles.list}>
                    <BankPicker value={manualBank} onChange={setManualBank} />
                    <TextInput
                      value={manualNumber}
                      onChangeText={(text) => setManualNumber(text.replace(/\D/g, ''))}
                      placeholder={t('transfer.numberPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="number-pad"
                      style={[styles.input, styles.mono]}
                    />
                    {lookupStatus && (
                      <Animated.View
                        entering={FadeInUp.duration(200)}
                        exiting={FadeOut.duration(150)}
                        layout={LinearTransition}
                        style={[
                          styles.lookup,
                          lookupStatus === 'found' && styles.lookupOk,
                          lookupStatus === 'error' && styles.lookupError,
                        ]}>
                        {lookupStatus === 'found' && (
                          <SymbolView name={TransferIcons.check} size={IconSize.sm} tintColor={theme.success} />
                        )}
                        {lookupStatus === 'error' && (
                          <SymbolView name={TransferIcons.warning} size={IconSize.sm} tintColor={theme.danger} />
                        )}
                        {lookupStatus === 'pending' && <ActivityIndicator size="small" color={theme.textMuted} />}
                        <Animated.Text
                          key={lookupStatus}
                          entering={FadeIn.duration(200)}
                          style={[
                            styles.lookupText,
                            lookupStatus === 'found' && styles.lookupTextOk,
                            lookupStatus === 'error' && styles.lookupTextError,
                          ]}>
                          {lookupStatus === 'found'
                            ? resolvedName
                            : lookupStatus === 'error'
                              ? lookupError
                              : t('transfer.lookingUp')}
                        </Animated.Text>
                      </Animated.View>
                    )}
                    {!resolvedName && (
                      <View style={styles.demoBox}>
                        <Text style={styles.demoText}>{t('transfer.demoLookup')}</Text>
                        <View style={styles.chipRow}>
                          {demoNumbers.map((n) => (
                            <Pressable
                              key={n}
                              onPress={() => setManualNumber(n)}
                              accessibilityRole="button"
                              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                              <Text style={[styles.chipText, styles.mono]}>{n}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </Animated.View>
                )}
              </Field>

              <Field label={t('transfer.amount')} styles={styles}>
                <TextInput
                  value={amountNumber ? formatNumberVND(amountNumber) : ''}
                  onChangeText={(text) => setAmount(text.replace(/\D/g, '').slice(0, 12))}
                  placeholder="0 ₫"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, styles.amountInput]}
                />
                <View style={styles.chipRow}>
                  {amountSuggestions.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setAmount(String(value))}
                      accessibilityRole="button"
                      accessibilityLabel={formatVND(value)}
                      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                      <Text style={styles.chipText}>{formatNumberVND(value)}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label={t('transfer.note')} styles={styles}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('transfer.notePlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  maxLength={140}
                  style={styles.input}
                />
              </Field>

              <ErrorText message={error} styles={styles} />
              <PrimaryButton label={t('transfer.continue')} onPress={handleContinue} />
            </Animated.View>
          )}

          {step === 'confirm' && recipient && fromAccount && (
            <Animated.View key="confirm" entering={stepEntering} style={styles.stepBody}>
              <Text style={styles.sectionTitle}>{t('transfer.confirmTitle')}</Text>
              <View style={styles.summary}>
                <Animated.Text entering={pop(120)} style={styles.summaryAmount}>
                  {formatVND(amountNumber)}
                </Animated.Text>
                <Row label={t('transfer.fromAccount')} value={`${fromAccount.label}\n${fromAccount.number}`} styles={styles} />
                <Row label={t('transfer.recipient')} value={`${recipient.name}\n${recipient.bank}`} styles={styles} />
                <Row label={t('transfer.accountNumber')} value={recipient.number} styles={styles} />
                {note.trim() !== '' && <Row label={t('transfer.notePlaceholder')} value={note.trim()} styles={styles} />}
              </View>
              <ErrorText message={error} styles={styles} />
              <PrimaryButton
                label={t('transfer.confirm')}
                onPress={handleConfirm}
                loading={submitting}
              />
            </Animated.View>
          )}

          {step === 'otp' && (
            <Animated.View key="otp" entering={stepEntering} style={styles.stepBody}>
              <View style={styles.center}>
                <Animated.View entering={pop(100)} style={styles.badge}>
                  <SymbolView
                    name={isSmartOtp ? SmartOtpIcons.shield : TransferIcons.shield}
                    size={IconSize.xxl}
                    tintColor={theme.primary}
                  />
                </Animated.View>
                <Text style={styles.sectionTitle}>{t(isSmartOtp ? 'smartOtp.confirm.title' : 'transfer.otpTitle')}</Text>
                <Text style={styles.hint}>
                  {t(isSmartOtp ? 'smartOtp.confirm.transferHint' : 'transfer.otpHint', {
                    amount: formatVND(amountNumber),
                  })}
                </Text>
                {!isSmartOtp && <Text style={styles.demo}>{t('transfer.otpDemo')}</Text>}
              </View>
              <Animated.View style={otpShakeStyle}>
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (error) setError('');
                  }}
                  onComplete={handleVerify}
                  busy={submitting}
                  error={!!error}
                  secure={isSmartOtp}
                  accessibilityLabel={t(isSmartOtp ? 'smartOtp.pinLabel' : 'transfer.otpLabel')}
                />
              </Animated.View>
              {submitting ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <ErrorText message={error} styles={styles} center />
              )}
              {!isSmartOtp && (
                <View style={styles.center}>
                  {resendIn > 0 ? (
                    <Text style={styles.hint}>{t('transfer.resendIn', { seconds: resendIn })}</Text>
                  ) : (
                    <Pressable onPress={handleResend} accessibilityRole="button" hitSlop={8}>
                      <Text style={styles.link}>{t('transfer.resend')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Animated.View>
          )}

          {step === 'success' && recipient && (
            <Animated.View key="success" entering={FadeIn.duration(200)} style={[styles.center, styles.success]}>
              <Animated.View entering={pop()} style={[styles.badge, styles.badgeSuccess]}>
                <SymbolView name={TransferIcons.success} size={IconSize.badge} tintColor={theme.success} />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(180).duration(300)} style={styles.sectionTitle}>
                {t('transfer.successTitle')}
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(260).duration(300)} style={styles.hint}>
                {t('transfer.successMessage', { amount: formatVND(amountNumber), name: recipient.name })}
              </Animated.Text>
              <Animated.View entering={FadeInDown.delay(360).duration(300)} style={styles.successActions}>
                <PrimaryButton label={t('transfer.home')} onPress={() => router.navigate('/')} />
                <Pressable
                  onPress={reset}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryText}>{t('transfer.newTransfer')}</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}
          </LayoutAnimationConfig>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ENTRY_MODES = ['manual', 'saved'] as const;
type EntryMode = (typeof ENTRY_MODES)[number];
const SEGMENT_PADDING = 3;

function EntryModeSegment({
  value,
  onChange,
  label,
  styles,
}: {
  value: EntryMode;
  onChange: (mode: EntryMode) => void;
  label: (mode: EntryMode) => string;
  styles: Styles;
}) {
  const [itemWidth, setItemWidth] = useState(0);
  const offset = useSharedValue(0);
  const index = ENTRY_MODES.indexOf(value);

  useEffect(() => {
    offset.set(withTiming(index * itemWidth, SMOOTH));
  }, [index, itemWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View
      style={styles.segment}
      onLayout={(e) => setItemWidth((e.nativeEvent.layout.width - SEGMENT_PADDING * 2) / ENTRY_MODES.length)}>
      {itemWidth > 0 && <Animated.View style={[styles.segmentIndicator, { width: itemWidth }, indicatorStyle]} />}
      {ENTRY_MODES.map((mode) => (
        <Pressable
          key={mode}
          onPress={() => onChange(mode)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === mode }}
          style={styles.segmentItem}>
          <Text style={[styles.segmentText, value === mode && styles.segmentTextActive]}>{label(mode)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({ label, styles, children }: { label: string; styles: Styles; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ErrorText({ message, styles, center }: { message: string; styles: Styles; center?: boolean }) {
  if (!message) return null;
  return (
    <Animated.Text
      key={message}
      entering={FadeInUp.duration(200)}
      style={[styles.error, center && styles.textCenter]}
      accessibilityLiveRegion="polite"
      role="alert">
      {message}
    </Animated.Text>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      minHeight: 44,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.7 },
    title: { ...Typography.title, color: theme.text },
    stepsWrap: {
      marginHorizontal: Spacing.three,
      marginTop: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
    },
    content: { padding: Spacing.three, paddingBottom: Spacing.five },
    stepBody: { gap: Spacing.three },
    field: { gap: Spacing.two },
    label: { ...Typography.caption, color: theme.textSecondary, fontWeight: '600' },
    chips: { gap: Spacing.two },
    accountChip: {
      minWidth: 170,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      gap: Spacing.one,
    },
    accountChipActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    accountLabel: { ...Typography.callout, color: theme.textSecondary, fontWeight: '600' },
    accountBalance: { ...Typography.bodyStrong, color: theme.text, ...MoneyText },
    textOnPrimarySoft: { color: theme.onPrimarySoft },
    segment: {
      flexDirection: 'row',
      padding: SEGMENT_PADDING,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundSelected,
    },
    segmentIndicator: {
      position: 'absolute',
      top: SEGMENT_PADDING,
      bottom: SEGMENT_PADDING,
      left: SEGMENT_PADDING,
      borderRadius: Radius.md,
      backgroundColor: theme.backgroundElement,
      boxShadow: theme.tabBarShadow,
    },
    segmentItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, alignItems: 'center' },
    segmentText: { ...Typography.callout, color: theme.textSecondary, fontWeight: '500' },
    segmentTextActive: { color: theme.text, fontWeight: '700' },
    list: { gap: Spacing.two },
    contact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: theme.backgroundElement,
    },
    contactActive: { borderColor: theme.primary },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.backgroundSelected,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActive: { backgroundColor: theme.primary },
    avatarText: { ...Typography.bodyStrong, color: theme.onPrimarySoft },
    avatarTextActive: { color: theme.onPrimary },
    contactName: { ...Typography.bodyStrong, color: theme.text },
    contactMeta: { ...Typography.caption, color: theme.textMuted },
    mono: { fontFamily: Fonts.mono },
    input: {
      ...Typography.body,
      color: theme.text,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    amountInput: { fontSize: 22, lineHeight: 28, fontWeight: '700', ...MoneyText },
    lookup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.md,
      backgroundColor: theme.backgroundElement,
    },
    lookupOk: { backgroundColor: theme.successSoft },
    lookupText: { ...Typography.callout, color: theme.textMuted },
    lookupTextOk: { color: theme.success, fontWeight: '600' },
    lookupError: { backgroundColor: theme.dangerSoft },
    lookupTextError: { color: theme.danger, fontWeight: '500' },
    demoBox: {
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.borderAccent,
    },
    demoText: { ...Typography.caption, color: theme.textSecondary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
    chip: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one + 2,
      borderRadius: Radius.pill,
      backgroundColor: theme.primarySoft,
    },
    chipText: { ...Typography.callout, color: theme.onPrimarySoft, fontWeight: '600', ...MoneyText },
    error: { ...Typography.callout, color: theme.danger, fontWeight: '500' },
    textCenter: { textAlign: 'center' },
    secondaryButton: {
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
    },
    secondaryText: { ...Typography.bodyStrong, color: theme.text },
    sectionTitle: { ...Typography.heading, color: theme.text },
    summary: {
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      gap: Spacing.three,
    },
    summaryAmount: { ...Typography.display, color: theme.primary, textAlign: 'center', paddingVertical: Spacing.two, ...MoneyText },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
    summaryLabel: { ...Typography.callout, color: theme.textMuted },
    summaryValue: { ...Typography.callout, color: theme.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
    center: { alignItems: 'center', gap: Spacing.one },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.two,
    },
    badgeSuccess: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.successSoft },
    hint: { ...Typography.callout, color: theme.textSecondary, textAlign: 'center' },
    demo: { ...Typography.caption, color: theme.textMuted },
    link: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
    success: { paddingTop: Spacing.five, gap: Spacing.two },
    successActions: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.four },
  });
}
