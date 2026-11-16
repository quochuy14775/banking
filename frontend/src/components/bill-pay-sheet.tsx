import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BillCategoryIcon from '@/components/bill-category-icon';
import BillDueChip from '@/components/bill-due-chip';
import OtpInput from '@/components/otp-input';
import PrimaryButton from '@/components/primary-button';
import { SearchIcons, SmartOtpIcons, TransferIcons } from '@/constants/icons';
import { Fonts, MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { formatDayMonth, formatFullDate, formatVND } from '@/helpers';
import { refreshAccounts, useAccounts } from '@/hooks/use-accounts';
import { useSmartOtpCode } from '@/hooks/use-smart-otp-code';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import type { AuthMethod, BillCategory, BillDetail, BillProvider } from '@/models';
import { getDemoCustomerCodes, lookupBill, payBill, resendBillOtp, verifyBillOtp } from '@/services/bill.service';

export interface BillPayItem {
  bill: BillDetail;
  /** Tên hiển thị: nhãn đã lưu ("Điện nhà") hoặc tên doanh nghiệp. */
  label: string;
}

/** `pay`: trả các hóa đơn đã biết. `new`: tra cứu hóa đơn mới theo loại dịch vụ rồi trả. */
export type BillSheetMode = { kind: 'pay'; items: BillPayItem[] } | { kind: 'new'; category: BillCategory };

type SheetStep = 'lookup' | 'detail' | 'otp' | 'success';
const PROGRESS: readonly SheetStep[] = ['detail', 'otp', 'success'];
const RESEND_SECONDS = 60;
// Hiệu ứng chạy một lần, chậm dần về cuối, không nảy.
const EASE_OUT = Easing.out(Easing.cubic);
// Type của RN không có `outlineStyle: 'none'` nhưng react-native-web nhận giá trị này.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

interface Props {
  mode: BillSheetMode | null;
  providers: BillProvider[];
  onClose: () => void;
  /** Gọi ngay khi thanh toán xong để màn Hóa đơn tải lại danh sách. */
  onPaid: () => void;
}

export default function BillPaySheet({ mode, providers, onClose, onPaid }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const accounts = useAccounts();
  const smartOtpCode = useSmartOtpCode();

  const [openedMode, setOpenedMode] = useState<BillSheetMode | null>(null);
  const [step, setStep] = useState<SheetStep>('detail');
  const [items, setItems] = useState<BillPayItem[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  // Server chọn khi tạo lệnh: SMS thì nhập mã nhận qua tin nhắn, Smart OTP thì nhập PIN để app tự tạo mã.
  const [authMethod, setAuthMethod] = useState<AuthMethod>('sms');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  // Mỗi lần mở với yêu cầu mới thì bắt đầu lại từ đầu.
  if (mode !== openedMode) {
    setOpenedMode(mode);
    if (mode) {
      setStep(mode.kind === 'pay' ? 'detail' : 'lookup');
      setItems(mode.kind === 'pay' ? mode.items : []);
      setProviderId(null);
      setCode('');
      setLookingUp(false);
      setPaymentId(null);
      setReference('');
      setOtp('');
      setError('');
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== 'otp' || authMethod !== 'sms' || resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [step, authMethod, resendIn]);

  const providerOf = (bill: BillDetail) => providers.find((p) => p.id === bill.providerId);
  const category = mode?.kind === 'new' ? mode.category : null;
  const categoryProviders = category ? providers.filter((p) => p.category === category) : [];
  const provider = providers.find((p) => p.id === providerId);
  const demoCodes = providerId ? getDemoCustomerCodes(providerId) : [];
  const total = items.reduce((sum, i) => sum + i.bill.amount, 0);
  const fromAccount = accounts.find((a) => a.id === fromAccountId) ?? accounts[0];
  const single = items.length === 1 ? items[0] : null;
  const isSmartOtp = authMethod === 'smartOtp';

  const close = () => {
    if (!submitting) onClose();
  };

  const runLookup = async (pid: string, customerCode: string) => {
    if (!customerCode.trim()) {
      setError(t('bills.errors.codeRequired'));
      return;
    }
    setError('');
    setLookingUp(true);
    const res = await lookupBill({ providerId: pid, customerCode });
    setLookingUp(false);
    if (!res.success || !res.bill) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setItems([{ bill: res.bill, label: providers.find((p) => p.id === pid)?.shortName ?? res.bill.customerCode }]);
    setStep('detail');
  };

  const pay = async () => {
    if (!user || !fromAccount || items.length === 0) return;
    if (total > fromAccount.balance) {
      setError(t('bills.errors.balance'));
      return;
    }
    setError('');
    setSubmitting(true);
    const res = await payBill({ userId: user.id, fromAccountId: fromAccount.id, billIds: items.map((i) => i.bill.id) });
    setSubmitting(false);
    if (!res.success || !res.paymentId) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setPaymentId(res.paymentId);
    setAuthMethod(res.authMethod ?? 'sms');
    setOtp('');
    setResendIn(RESEND_SECONDS);
    setStep('otp');
  };

  // Tự gọi khi vừa nhập đủ 6 số, người dùng không phải bấm nút.
  const verify = async (code: string) => {
    if (!paymentId) return;
    setSubmitting(true);
    // Smart OTP: ô nhập là mã PIN; app mở khóa rồi tự tạo mã gửi lên, PIN không rời khỏi máy.
    const unlocked = isSmartOtp ? await smartOtpCode(code) : { code };
    const res =
      'code' in unlocked
        ? await verifyBillOtp({ paymentId, otp: unlocked.code })
        : { success: false, message: unlocked.error, reference: undefined };
    setSubmitting(false);
    if (!res.success) {
      // Xóa mã vừa nhập để gõ lại ngay; đủ 6 số là tự kiểm tra lần nữa.
      setOtp('');
      setError(res.message ?? t('transfer.errors.unknown'));
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
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setError('');
    setReference(res.reference ?? '');
    setStep('success');
    refreshAccounts();
    onPaid();
  };

  const resend = async () => {
    if (!paymentId || resendIn > 0) return;
    const res = await resendBillOtp({ paymentId });
    if (!res.success) {
      setError(res.message ?? t('transfer.errors.unknown'));
      return;
    }
    setOtp('');
    setError('');
    setResendIn(RESEND_SECONDS);
  };

  return (
    <Modal visible={mode !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          {/* Modal là cửa sổ native riêng nên dùng insets thủ công thay cho SafeAreaView. */}
          <Animated.View
            entering={SlideInDown.duration(320).easing(EASE_OUT)}
            style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
            <View style={styles.handle} />
            {step !== 'lookup' && <SheetProgress step={step} />}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {step === 'lookup' && category && (
                <Animated.View key="lookup" entering={FadeIn.duration(200)} style={styles.stack}>
                  <View style={styles.titleRow}>
                    <BillCategoryIcon category={category} size={40} />
                    <Text style={styles.sheetTitle}>
                      {t('bills.sheet.newTitle', { category: t(`bills.categories.${category}`) })}
                    </Text>
                  </View>
                  <Text style={styles.label}>{t('bills.sheet.provider')}</Text>
                  <View style={styles.list}>
                    {categoryProviders.map((p) => {
                      const active = p.id === providerId;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            setProviderId(p.id);
                            setCode('');
                            setError('');
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.option, active && styles.optionActive]}>
                          <View style={styles.flex}>
                            <Text style={styles.optionTitle}>{p.shortName}</Text>
                            <Text style={styles.optionSub} numberOfLines={1}>
                              {p.name}
                            </Text>
                          </View>
                          {active && (
                            <Animated.View entering={ZoomIn.duration(240).easing(EASE_OUT)}>
                              <SymbolView name={TransferIcons.check} size={IconSize.md} tintColor={theme.primary} />
                            </Animated.View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  {provider && (
                    <Animated.View key={provider.id} entering={FadeInUp.duration(220)} style={styles.stack}>
                      <Text style={styles.label}>{t('bills.sheet.customerCode')}</Text>
                      <View style={styles.codeRow}>
                        <TextInput
                          value={code}
                          onChangeText={(v) => {
                            setCode(v);
                            setError('');
                          }}
                          placeholder={t('bills.sheet.codePlaceholder', { hint: provider.codeHint })}
                          placeholderTextColor={theme.textMuted}
                          accessibilityLabel={t('bills.sheet.customerCode')}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          returnKeyType="search"
                          onSubmitEditing={() => runLookup(provider.id, code)}
                          style={[styles.input, styles.mono]}
                        />
                        <Pressable
                          onPress={() => runLookup(provider.id, code)}
                          disabled={lookingUp}
                          accessibilityRole="button"
                          accessibilityLabel={t('bills.sheet.check')}
                          style={({ pressed }) => [styles.searchButton, (pressed || lookingUp) && styles.pressed]}>
                          {lookingUp ? (
                            <ActivityIndicator color={theme.onPrimary} />
                          ) : (
                            <SymbolView name={SearchIcons.search} size={IconSize.xl} tintColor={theme.onPrimary} />
                          )}
                        </Pressable>
                      </View>
                      {lookingUp ? (
                        <Text style={styles.hint}>{t('bills.sheet.checking')}</Text>
                      ) : (
                        demoCodes.length > 0 && (
                          <View style={styles.demoBox}>
                            <Text style={styles.demoText}>{t('bills.sheet.demoCodes')}</Text>
                            <View style={styles.chipRow}>
                              {demoCodes.map((c) => (
                                <Pressable
                                  key={c}
                                  onPress={() => {
                                    setCode(c);
                                    runLookup(provider.id, c);
                                  }}
                                  accessibilityRole="button"
                                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                                  <Text style={[styles.chipText, styles.mono]}>{c}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        )
                      )}
                    </Animated.View>
                  )}
                  <ErrorText message={error} />
                </Animated.View>
              )}

              {step === 'detail' && items.length > 0 && (
                <Animated.View key="detail" entering={FadeInRight.duration(260)} style={styles.stack}>
                  {single ? (
                    <>
                      <View style={styles.titleRow}>
                        <BillCategoryIcon category={providerOf(single.bill)?.category ?? 'other'} size={44} />
                        <View style={styles.flex}>
                          <Text style={styles.itemTitle}>{single.label}</Text>
                          <Text style={styles.optionSub} numberOfLines={1}>
                            {providerOf(single.bill)?.name}
                          </Text>
                        </View>
                        <BillDueChip dueDate={single.bill.dueDate} />
                      </View>
                      <Animated.Text entering={ZoomIn.duration(240).easing(EASE_OUT).delay(80)} style={styles.amount}>
                        {formatVND(total)}
                      </Animated.Text>
                      <View>
                        <Row label={t('bills.sheet.customerName')} value={single.bill.customerName} />
                        <Row label={t('bills.sheet.customerCode')} value={single.bill.customerCode} mono />
                        <Row label={t('bills.sheet.period')} value={single.bill.period} />
                        <Row label={t('bills.sheet.dueDate')} value={formatFullDate(single.bill.dueDate)} />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.sheetTitle}>{t('bills.sheet.multiTitle', { count: items.length })}</Text>
                      <View style={styles.multiList}>
                        {items.map((i) => {
                          const p = providerOf(i.bill);
                          return (
                            <View key={i.bill.id} style={styles.multiRow}>
                              <BillCategoryIcon category={p?.category ?? 'other'} size={36} />
                              <View style={styles.flex}>
                                <Text style={styles.optionTitle}>{i.label}</Text>
                                <Text style={styles.optionSub}>
                                  {p?.shortName} · {formatDayMonth(i.bill.dueDate)}
                                </Text>
                              </View>
                              <Text style={styles.multiAmount}>{formatVND(i.bill.amount)}</Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t('bills.sheet.total')}</Text>
                        <Text style={styles.totalAmount}>{formatVND(total)}</Text>
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>{t('bills.sheet.fromAccount')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accounts}>
                    {accounts.map((acc) => {
                      const active = acc.id === fromAccount?.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => setFromAccountId(acc.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.account, active && styles.accountActive]}>
                          <Text style={[styles.accountLabel, active && styles.accountLabelActive]}>{acc.label}</Text>
                          <Text style={styles.accountBalance}>{formatVND(acc.balance)}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <ErrorText message={error} />
                  <PrimaryButton label={t('bills.sheet.pay', { amount: formatVND(total) })} onPress={pay} loading={submitting} />
                </Animated.View>
              )}

              {step === 'otp' && (
                <Animated.View key="otp" entering={FadeInRight.duration(260)} style={styles.stack}>
                  <View style={styles.center}>
                    <Animated.View entering={ZoomIn.duration(240).easing(EASE_OUT).delay(100)} style={styles.badge}>
                      <SymbolView
                        name={isSmartOtp ? SmartOtpIcons.shield : TransferIcons.shield}
                        size={IconSize.xxl}
                        tintColor={theme.primary}
                      />
                    </Animated.View>
                    <Text style={styles.sheetTitle}>{t(isSmartOtp ? 'smartOtp.confirm.title' : 'transfer.otpTitle')}</Text>
                    <Text style={styles.hint}>
                      {t(isSmartOtp ? 'smartOtp.confirm.billHint' : 'bills.sheet.otpHint', { amount: formatVND(total) })}
                    </Text>
                    {!isSmartOtp && <Text style={styles.demo}>{t('transfer.otpDemo')}</Text>}
                  </View>
                  <Animated.View style={shakeStyle}>
                    <OtpInput
                      value={otp}
                      onChange={(v) => {
                        setOtp(v);
                        if (error) setError('');
                      }}
                      onComplete={verify}
                      busy={submitting}
                      error={!!error}
                      secure={isSmartOtp}
                      accessibilityLabel={t(isSmartOtp ? 'smartOtp.pinLabel' : 'transfer.otpLabel')}
                    />
                  </Animated.View>
                  {submitting ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <ErrorText message={error} center />
                  )}
                  {!isSmartOtp && (
                    <View style={styles.center}>
                      {resendIn > 0 ? (
                        <Text style={styles.hint}>{t('transfer.resendIn', { seconds: resendIn })}</Text>
                      ) : (
                        <Pressable onPress={resend} accessibilityRole="button" hitSlop={8}>
                          <Text style={styles.link}>{t('transfer.resend')}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              )}

              {step === 'success' && (
                <Animated.View key="success" entering={FadeIn.duration(200)} style={[styles.stack, styles.center]}>
                  <Animated.View entering={ZoomIn.duration(240).easing(EASE_OUT)} style={[styles.badge, styles.badgeSuccess]}>
                    <SymbolView name={TransferIcons.success} size={IconSize.badge} tintColor={theme.success} />
                  </Animated.View>
                  <Text style={styles.sheetTitle}>{t('bills.sheet.successTitle')}</Text>
                  <Text style={styles.hint}>
                    {single
                      ? t('bills.sheet.successOne', { amount: formatVND(total), name: single.label })
                      : t('bills.sheet.successMany', { count: items.length, amount: formatVND(total) })}
                  </Text>
                  {reference !== '' && (
                    <Text style={[styles.demo, styles.mono]}>{t('bills.sheet.reference', { code: reference })}</Text>
                  )}
                  <View style={styles.fullWidth}>
                    <PrimaryButton label={t('bills.sheet.done')} onPress={onClose} />
                  </View>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SheetProgress({ step }: { step: SheetStep }) {
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const index = PROGRESS.indexOf(step);
  return (
    <View style={styles.progress}>
      {PROGRESS.map((s, i) => (
        <View key={s} style={styles.flex}>
          <View style={[styles.progressBar, i <= index && styles.progressBarOn]} />
          <Text style={[styles.progressLabel, i === index && styles.progressLabelOn]}>
            {t(`bills.sheet.steps.${s as 'detail' | 'otp' | 'success'}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

function ErrorText({ message, center }: { message: string; center?: boolean }) {
  const styles = useThemedStyles(createStyles);
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
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    kav: { width: '100%', maxHeight: '92%' },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: Spacing.two,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginBottom: Spacing.three,
    },
    scroll: { flexGrow: 0 },
    body: { paddingBottom: Spacing.two },
    stack: { gap: Spacing.three },
    flex: { flex: 1 },
    fullWidth: { alignSelf: 'stretch', marginTop: Spacing.two },
    pressed: { opacity: 0.7 },
    progress: { flexDirection: 'row', gap: 6, marginBottom: Spacing.three },
    progressBar: { height: 4, borderRadius: 2, backgroundColor: theme.border },
    progressBarOn: { backgroundColor: theme.primary },
    progressLabel: { ...Typography.micro, color: theme.textMuted, marginTop: 5 },
    progressLabelOn: { color: theme.primary, fontWeight: '700' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
    sheetTitle: { ...Typography.heading, color: theme.text, flexShrink: 1 },
    label: { ...Typography.caption, color: theme.textSecondary, fontWeight: '600', marginBottom: -Spacing.one },
    list: { gap: Spacing.two },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
    optionActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    optionTitle: { ...Typography.bodyStrong, color: theme.text },
    optionSub: { ...Typography.caption, color: theme.textMuted },
    itemTitle: { ...Typography.heading, color: theme.text },
    codeRow: { flexDirection: 'row', gap: Spacing.two },
    input: {
      ...Typography.body,
      flex: 1,
      color: theme.text,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
      ...WEB_NO_OUTLINE,
    },
    mono: { fontFamily: Fonts.mono },
    searchButton: {
      width: 50,
      borderRadius: Radius.lg,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    chipText: { ...Typography.callout, color: theme.onPrimarySoft, fontWeight: '600' },
    amount: { ...Typography.display, fontSize: 34, lineHeight: 40, color: theme.primary, textAlign: 'center', ...MoneyText },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: 7 },
    rowLabel: { ...Typography.callout, color: theme.textMuted },
    rowValue: { ...Typography.callout, color: theme.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
    multiList: {
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      paddingHorizontal: Spacing.three,
    },
    multiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      paddingVertical: Spacing.three,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    multiAmount: { ...Typography.bodyStrong, color: theme.text, ...MoneyText },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    totalLabel: { ...Typography.body, color: theme.textSecondary },
    totalAmount: { ...Typography.title, color: theme.primary, ...MoneyText },
    accounts: { gap: Spacing.two },
    account: {
      minWidth: 170,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      gap: Spacing.one,
    },
    accountActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    accountLabel: { ...Typography.callout, color: theme.textSecondary, fontWeight: '600' },
    accountLabelActive: { color: theme.onPrimarySoft },
    accountBalance: { ...Typography.bodyStrong, color: theme.text, ...MoneyText },
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
    error: { ...Typography.callout, color: theme.danger, fontWeight: '500' },
    textCenter: { textAlign: 'center' },
  });
}
