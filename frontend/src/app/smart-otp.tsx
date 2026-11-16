import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import OtpInput from '@/components/otp-input';
import PrimaryButton from '@/components/primary-button';
import { SmartOtpIcons, TransferIcons, type IconName } from '@/constants/icons';
import { Fonts, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { dayKey, formatDate, formatTime } from '@/helpers';
import { TOTP_PERIOD_SECONDS, totpSecondsLeft, totpStep } from '@/helpers/totp';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { pinFailureMessage, useSmartOtp, type PinFailure } from '@/lib/smartOtpStore';

const RESEND_SECONDS = 60;
const STEP_IN_MS = 280;
// Hiệu ứng chạy một lần, chậm dần về cuối, không nảy (giống màn Chuyển khoản).
const EASE_OUT = Easing.out(Easing.cubic);
const pop = (delay = 0) => ZoomIn.duration(240).easing(EASE_OUT).delay(delay);

/**
 * `overview`: giới thiệu (chưa bật) hoặc trạng thái (đang bật) · `setPin` → `confirmPin` → `sms`: các bước kích hoạt
 * · `done`: vừa kích hoạt xong · `unlock`: nhập PIN để xem mã hoặc để hủy · `code`: mã hiện tại, tự đổi mỗi 30 giây.
 */
type Phase = 'overview' | 'setPin' | 'confirmPin' | 'sms' | 'done' | 'unlock' | 'code';
type UnlockPurpose = 'code' | 'deactivate';
type Notice = { tone: 'success' | 'warning'; text: string };
type Styles = ReturnType<typeof createStyles>;

// Thứ tự các bước, để nội dung trượt vào từ phải (tiến) hoặc trái (lùi).
const PHASE_ORDER: Phase[] = ['overview', 'setPin', 'confirmPin', 'sms', 'done', 'unlock', 'code'];

// PIN dễ đoán: 6 số giống nhau hoặc dãy tăng/giảm liền nhau (111111, 123456, 987654).
function isWeakPin(pin: string): boolean {
  const digits = Array.from(pin, Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return [0, 1, -1].some((diff) => steps.every((s) => s === diff));
}

function formatActivatedAt(iso: string): string {
  return iso ? `${formatTime(iso)} · ${formatDate(dayKey(new Date(iso)))}` : '';
}

/**
 * Màn Smart OTP, mở từ ngăn kéo tài khoản. Chưa bật: giới thiệu rồi kích hoạt (đặt PIN, nhập lại PIN, xác nhận
 * bằng OTP SMS để server cấp khóa cho máy). Đang bật: xem trạng thái, lấy mã OTP hiện tại hoặc hủy Smart OTP.
 */
export default function SmartOtpScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const {
    status,
    info,
    otherDevice,
    refresh,
    startActivation,
    resendActivationOtp,
    completeActivation,
    generateCode,
    deactivate,
  } = useSmartOtp();

  const [phase, setPhase] = useState<Phase>('overview');
  const [forward, setForward] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [otp, setOtp] = useState('');
  const [activationId, setActivationId] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [unlockPurpose, setUnlockPurpose] = useState<UnlockPurpose>('code');
  // PIN giữ tạm trong lúc đang xem mã để tự tạo mã mới mỗi 30 giây; rời bước là xóa.
  const [codePin, setCodePin] = useState('');
  const [code, setCode] = useState<{ step: number; value: string } | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const step = totpStep(now);
  const secondsLeft = totpSecondsLeft(now);

  // Mở màn thì đối chiếu lại trạng thái với server; rời màn thì xóa PIN, mã đang hiện và quay về đầu.
  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        setPhase('overview');
        setPinInput('');
        setNewPin('');
        setOtp('');
        setActivationId(null);
        setCodePin('');
        setCode(null);
        setError('');
        setNotice(null);
        setSubmitting(false);
      };
    }, [refresh]),
  );

  useEffect(() => {
    if (phase !== 'sms' || resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, resendIn]);

  useEffect(() => {
    if (phase !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Sang khoảng 30 giây mới thì tự tạo mã mới; Smart OTP vừa bị hủy ở nơi khác thì quay về màn đầu.
  useEffect(() => {
    if (phase !== 'code' || !codePin || code?.step === step) return;
    let active = true;
    generateCode(codePin).then((res) => {
      if (!active) return;
      if (res.ok) {
        setCode({ step: totpStep(res.at), value: res.code });
        return;
      }
      setCodePin('');
      setCode(null);
      setForward(false);
      setPhase('overview');
    });
    return () => {
      active = false;
    };
  }, [phase, codePin, code?.step, step, generateCode]);

  const goTo = (next: Phase) => {
    setError('');
    setForward(PHASE_ORDER.indexOf(next) >= PHASE_ORDER.indexOf(phase));
    setPhase(next);
  };

  const stepEntering = (forward ? FadeInRight : FadeInLeft).duration(STEP_IN_MS);

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  };

  const startSetup = () => {
    setNotice(null);
    setNewPin('');
    setPinInput('');
    goTo('setPin');
  };

  // Các hàm submit dưới đây tự chạy khi vừa nhập đủ 6 số (OtpInput gọi `onComplete`), không cần bấm nút.
  const submitNewPin = (pin: string) => {
    if (isWeakPin(pin)) {
      setPinInput('');
      fail(t('smartOtp.errors.weakPin'));
      return;
    }
    setNewPin(pin);
    setPinInput('');
    goTo('confirmPin');
  };

  const submitConfirmPin = async (pin: string) => {
    if (pin !== newPin) {
      setPinInput('');
      fail(t('smartOtp.errors.pinMismatch'));
      return;
    }
    setSubmitting(true);
    const res = await startActivation();
    setSubmitting(false);
    if (!res.success || !res.activationId) {
      setPinInput('');
      fail(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setActivationId(res.activationId);
    setPinInput('');
    setOtp('');
    setResendIn(RESEND_SECONDS);
    goTo('sms');
  };

  const submitSms = async (code: string) => {
    if (!activationId) return;
    setSubmitting(true);
    const res = await completeActivation(activationId, code, newPin);
    setSubmitting(false);
    if (!res.success) {
      setOtp('');
      fail(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewPin('');
    setOtp('');
    setActivationId(null);
    goTo('done');
  };

  const resend = async () => {
    if (!activationId || resendIn > 0) return;
    const res = await resendActivationOtp(activationId);
    if (!res.success) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setOtp('');
    setError('');
    setResendIn(RESEND_SECONDS);
  };

  const openUnlock = (purpose: UnlockPurpose) => {
    setNotice(null);
    setUnlockPurpose(purpose);
    setPinInput('');
    goTo('unlock');
  };

  // Sai PIN thì báo ngay tại chỗ. Sai quá số lần (Smart OTP vừa bị hủy) thì về màn đầu và báo ở đó.
  const handlePinFailure = (failure: PinFailure) => {
    setPinInput('');
    if (failure.reason === 'wrongPin') {
      fail(pinFailureMessage(failure, t));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setNotice({ tone: 'warning', text: pinFailureMessage(failure, t) });
    goTo('overview');
  };

  const submitUnlock = async (pin: string) => {
    setSubmitting(true);
    if (unlockPurpose === 'code') {
      const res = await generateCode(pin);
      setSubmitting(false);
      if (!res.ok) {
        handlePinFailure(res);
        return;
      }
      setCodePin(pin);
      setPinInput('');
      setNow(res.at);
      setCode({ step: totpStep(res.at), value: res.code });
      goTo('code');
      return;
    }
    const res = await deactivate(pin);
    setSubmitting(false);
    if (!res.ok) {
      if (res.reason === 'failed') {
        setPinInput('');
        fail(res.message ?? t('transfer.errors.unknown'));
      } else {
        handlePinFailure(res);
      }
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPinInput('');
    setNotice({ tone: 'success', text: t('smartOtp.deactivated') });
    goTo('overview');
  };

  const closeCode = () => {
    setCodePin('');
    setCode(null);
    goTo('overview');
  };

  const handleBack = () => {
    setPinInput('');
    setOtp('');
    if (phase === 'overview') router.navigate('/');
    else if (phase === 'confirmPin') goTo('setPin');
    else if (phase === 'sms') {
      setNewPin('');
      setActivationId(null);
      goTo('setPin');
    } else if (phase === 'code') closeCode();
    else goTo('overview');
  };

  const pinPhase =
    phase === 'setPin'
      ? { title: t('smartOtp.setPin.title'), hint: t('smartOtp.setPin.hint'), submit: submitNewPin }
      : phase === 'confirmPin'
        ? { title: t('smartOtp.confirmPin.title'), hint: t('smartOtp.confirmPin.hint'), submit: submitConfirmPin }
        : phase === 'unlock'
          ? {
              title: t('smartOtp.unlock.title'),
              hint: t(unlockPurpose === 'code' ? 'smartOtp.unlock.codeHint' : 'smartOtp.unlock.deactivateHint'),
              submit: submitUnlock,
            }
          : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {phase !== 'done' && (
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
          {t('smartOtp.title')}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Lần đầu mở màn thì hiện ngay; hiệu ứng trượt chỉ chạy khi chuyển bước. */}
          <LayoutAnimationConfig skipEntering>
            {phase === 'overview' && (
              <Animated.View key="overview" entering={stepEntering} style={styles.stepBody}>
                {notice && <NoticeBox notice={notice} styles={styles} />}
                {status === 'loading' ? (
                  <ActivityIndicator color={theme.primary} style={styles.loading} />
                ) : status === 'active' && info ? (
                  <>
                    <View style={styles.center}>
                      <Animated.View entering={pop(100)} style={[styles.badgeLarge, styles.badgeSuccess]}>
                        <SymbolView name={SmartOtpIcons.shield} size={IconSize.hero} tintColor={theme.success} />
                      </Animated.View>
                      <Text style={styles.sectionTitle}>{t('smartOtp.title')}</Text>
                      <View style={styles.statusChip}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{t('smartOtp.status.on')}</Text>
                      </View>
                    </View>
                    <View style={styles.card}>
                      <InfoRow label={t('smartOtp.status.device')} value={info.deviceName} styles={styles} />
                      <InfoRow
                        label={t('smartOtp.status.activatedAt')}
                        value={formatActivatedAt(info.activatedAt)}
                        styles={styles}
                      />
                      <InfoRow
                        label={t('smartOtp.status.method')}
                        value={t('smartOtp.status.methodValue')}
                        styles={styles}
                      />
                    </View>
                    <PrimaryButton label={t('smartOtp.getCode')} onPress={() => openUnlock('code')} />
                    <Pressable
                      onPress={() => openUnlock('deactivate')}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                      <Text style={styles.dangerText}>{t('smartOtp.deactivate')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.center}>
                      <Animated.View entering={pop(100)} style={styles.badgeLarge}>
                        <SymbolView name={SmartOtpIcons.shield} size={IconSize.hero} tintColor={theme.primary} />
                      </Animated.View>
                      <Text style={[styles.sectionTitle, styles.textCenter]}>{t('smartOtp.intro.title')}</Text>
                      <Text style={styles.hint}>{t('smartOtp.intro.body')}</Text>
                    </View>
                    <View style={styles.card}>
                      <Benefit icon={SmartOtpIcons.offline} text={t('smartOtp.intro.offline')} styles={styles} />
                      <Benefit icon={SmartOtpIcons.timer} text={t('smartOtp.intro.rotating')} styles={styles} />
                      <Benefit icon={SmartOtpIcons.device} text={t('smartOtp.intro.device')} styles={styles} />
                    </View>
                    {otherDevice && (
                      <NoticeBox
                        notice={{ tone: 'warning', text: t('smartOtp.intro.otherDevice', { device: otherDevice }) }}
                        styles={styles}
                      />
                    )}
                    <PrimaryButton label={t('smartOtp.intro.activate')} onPress={startSetup} />
                  </>
                )}
              </Animated.View>
            )}

            {pinPhase && (
              <Animated.View key={phase} entering={stepEntering} style={styles.stepBody}>
                <StepHeader icon={SmartOtpIcons.key} title={pinPhase.title} hint={pinPhase.hint} styles={styles} />
                <Animated.View style={shakeStyle}>
                  <OtpInput
                    secure
                    value={pinInput}
                    onChange={(v) => {
                      setPinInput(v);
                      if (error) setError('');
                    }}
                    onComplete={pinPhase.submit}
                    busy={submitting}
                    error={!!error}
                    accessibilityLabel={t('smartOtp.pinLabel')}
                  />
                </Animated.View>
                <CheckStatus checking={submitting} error={error} styles={styles} />
              </Animated.View>
            )}

            {phase === 'sms' && (
              <Animated.View key="sms" entering={stepEntering} style={styles.stepBody}>
                <StepHeader
                  icon={TransferIcons.shield}
                  title={t('smartOtp.sms.title')}
                  hint={t('smartOtp.sms.hint')}
                  demo={t('transfer.otpDemo')}
                  styles={styles}
                />
                <Animated.View style={shakeStyle}>
                  <OtpInput
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (error) setError('');
                    }}
                    onComplete={submitSms}
                    busy={submitting}
                    error={!!error}
                    accessibilityLabel={t('transfer.otpLabel')}
                  />
                </Animated.View>
                <CheckStatus checking={submitting} error={error} styles={styles} />
                <View style={styles.center}>
                  {resendIn > 0 ? (
                    <Text style={styles.hint}>{t('transfer.resendIn', { seconds: resendIn })}</Text>
                  ) : (
                    <Pressable onPress={resend} accessibilityRole="button" hitSlop={8}>
                      <Text style={styles.link}>{t('transfer.resend')}</Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            )}

            {phase === 'done' && (
              <Animated.View key="done" entering={FadeIn.duration(200)} style={[styles.center, styles.success]}>
                <Animated.View entering={pop()} style={[styles.badge, styles.badgeDone]}>
                  <SymbolView name={TransferIcons.success} size={IconSize.badge} tintColor={theme.success} />
                </Animated.View>
                <Animated.Text entering={FadeInDown.delay(180).duration(300)} style={styles.sectionTitle}>
                  {t('smartOtp.doneTitle')}
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(260).duration(300)} style={styles.hint}>
                  {t('smartOtp.doneMessage')}
                </Animated.Text>
                <Animated.View entering={FadeInDown.delay(360).duration(300)} style={styles.fullWidth}>
                  <PrimaryButton label={t('smartOtp.done')} onPress={() => goTo('overview')} />
                </Animated.View>
              </Animated.View>
            )}

            {phase === 'code' && code && (
              <Animated.View key="code" entering={stepEntering} style={styles.stepBody}>
                <Text style={[styles.sectionTitle, styles.textCenter]}>{t('smartOtp.code.title')}</Text>
                <View style={styles.codeCard}>
                  <Animated.Text
                    key={code.value}
                    entering={FadeIn.duration(200)}
                    style={styles.code}
                    accessibilityLabel={code.value.split('').join(' ')}>
                    {`${code.value.slice(0, 3)} ${code.value.slice(3)}`}
                  </Animated.Text>
                  <View style={styles.track}>
                    <View style={[styles.bar, { width: `${(secondsLeft / TOTP_PERIOD_SECONDS) * 100}%` }]} />
                  </View>
                  <Text style={styles.caption}>{t('smartOtp.code.expiresIn', { seconds: secondsLeft })}</Text>
                </View>
                <Text style={styles.hint}>{t('smartOtp.code.hint')}</Text>
                <PrimaryButton label={t('smartOtp.done')} onPress={closeCode} />
              </Animated.View>
            )}
          </LayoutAnimationConfig>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepHeader({
  icon,
  title,
  hint,
  demo,
  styles,
}: {
  icon: IconName;
  title: string;
  hint: string;
  demo?: string;
  styles: Styles;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Animated.View entering={pop(100)} style={styles.badge}>
        <SymbolView name={icon} size={IconSize.xxl} tintColor={theme.primary} />
      </Animated.View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {demo && <Text style={styles.demo}>{demo}</Text>}
    </View>
  );
}

function Benefit({ icon, text, styles }: { icon: IconName; text: string; styles: Styles }) {
  const theme = useTheme();
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <SymbolView name={icon} size={IconSize.md} tintColor={theme.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function NoticeBox({ notice, styles }: { notice: Notice; styles: Styles }) {
  const theme = useTheme();
  const success = notice.tone === 'success';
  const color = success ? theme.success : theme.warning;
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      style={[styles.notice, success ? styles.noticeSuccess : styles.noticeWarning]}
      accessibilityLiveRegion="polite">
      <SymbolView name={success ? TransferIcons.success : SmartOtpIcons.warning} size={IconSize.md} tintColor={color} />
      <Text style={[styles.noticeText, { color }]}>{notice.text}</Text>
    </Animated.View>
  );
}

/** Dưới ô nhập: đang kiểm tra mã thì hiện vòng xoay, kiểm tra xong mà sai thì hiện lỗi. */
function CheckStatus({ checking, error, styles }: { checking: boolean; error: string; styles: Styles }) {
  const theme = useTheme();
  if (checking) return <ActivityIndicator color={theme.primary} />;
  return <ErrorText message={error} styles={styles} />;
}

function ErrorText({ message, styles }: { message: string; styles: Styles }) {
  if (!message) return null;
  return (
    <Animated.Text
      key={message}
      entering={FadeInUp.duration(200)}
      style={[styles.error, styles.textCenter]}
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
    content: { padding: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.five },
    stepBody: { gap: Spacing.three },
    loading: { marginTop: Spacing.five },
    center: { alignItems: 'center', gap: Spacing.one },
    textCenter: { textAlign: 'center' },
    sectionTitle: { ...Typography.heading, color: theme.text },
    hint: { ...Typography.callout, color: theme.textSecondary, textAlign: 'center' },
    demo: { ...Typography.caption, color: theme.textMuted },
    link: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
    error: { ...Typography.callout, color: theme.danger, fontWeight: '500' },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.two,
    },
    badgeLarge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.two,
    },
    badgeSuccess: { backgroundColor: theme.successSoft },
    badgeDone: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.successSoft },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.one,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: theme.successSoft,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success },
    statusText: { ...Typography.callout, color: theme.success, fontWeight: '700' },
    card: {
      padding: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      gap: Spacing.three,
    },
    benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
    benefitIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitText: { ...Typography.callout, color: theme.text, flex: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
    infoLabel: { ...Typography.callout, color: theme.textMuted },
    infoValue: { ...Typography.callout, color: theme.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.md,
    },
    noticeSuccess: { backgroundColor: theme.successSoft },
    noticeWarning: { backgroundColor: theme.warningSoft },
    noticeText: { ...Typography.callout, fontWeight: '500', flex: 1 },
    secondaryButton: {
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
    },
    dangerText: { ...Typography.bodyStrong, color: theme.danger },
    success: { paddingTop: Spacing.five, gap: Spacing.two },
    fullWidth: { alignSelf: 'stretch', marginTop: Spacing.four },
    codeCard: {
      alignItems: 'center',
      gap: Spacing.three,
      paddingVertical: Spacing.four,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
    },
    code: {
      fontFamily: Fonts.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '700',
      letterSpacing: 4,
      color: theme.text,
    },
    track: {
      alignSelf: 'stretch',
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundSelected,
      overflow: 'hidden',
    },
    bar: { height: '100%', borderRadius: 3, backgroundColor: theme.primary },
    caption: { ...Typography.caption, color: theme.textSecondary },
  });
}
