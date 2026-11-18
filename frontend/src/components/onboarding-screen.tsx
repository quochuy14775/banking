import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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
  type TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import OnboardingPhotoStep from '@/components/onboarding-photo-step';
import OnboardingScanStep from '@/components/onboarding-scan-step';
import OnboardingStatus from '@/components/onboarding-status';
import PrimaryButton from '@/components/primary-button';
import { KycIcons, OnboardingIcons, TransferIcons, type IconName } from '@/constants/icons';
import { DATA_CONSENT_VERSION } from '@/constants/onboarding';
import { Fonts, IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  formatFullDate,
  isValidContactEmail,
  isValidContactPhone,
  onboardingErrorText,
} from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n, type TranslationKey } from '@/i18n';
import { clearSavedApplication, loadSavedApplication, saveApplication } from '@/lib/onboardingStore';
import type { ApplicationPhotos, CccdInfo, ContactField, SavedApplication } from '@/models';
import { submitApplication } from '@/services/customer.service';

/**
 * `loading`: đọc hồ sơ đã gửi trên máy · `intro`: giới thiệu · `scan`: quét QR trên CCCD · `review`: xem thông tin, nhập
 * liên hệ, đồng ý · `photos`: chụp 3 ảnh rồi gửi · `status`: theo dõi hồ sơ đã gửi (chờ duyệt, từ chối, đã duyệt).
 */
type Phase = 'loading' | 'intro' | 'scan' | 'review' | 'photos' | 'status';
type FieldErrors = Partial<Record<ContactField | 'consent', string>>;
type Styles = ReturnType<typeof createStyles>;

// Tắt viền focus mặc định của trình duyệt, giống màn đăng nhập.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

interface Props {
  /** Quay lại màn đăng nhập. */
  onCancel: () => void;
  /** Hồ sơ đã được nhân viên duyệt: sang bước tạo tài khoản đăng nhập. */
  onApproved: (application: SavedApplication) => void;
}

/**
 * Đăng ký mở tài khoản, gọi customer-service: quét QR trên CCCD → kiểm tra thông tin, nhập liên hệ, đồng ý → chụp mặt
 * trước, mặt sau CCCD và ảnh chân dung → gửi hồ sơ → nhân viên duyệt (API quản trị) → khách tạo tài khoản đăng nhập.
 * Hồ sơ đã gửi được giữ trên máy, nên mở lại app là thấy ngay trạng thái thay vì phải làm lại.
 */
export default function OnboardingScreen({ onCancel, onApproved }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('loading');
  const [saved, setSaved] = useState<SavedApplication | null>(null);
  const [info, setInfo] = useState<CccdInfo | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Đã gửi hồ sơ trên máy này thì vào thẳng màn trạng thái.
  useEffect(() => {
    let active = true;
    loadSavedApplication().then((application) => {
      if (!active) return;
      setSaved(application);
      setPhase(application ? 'status' : 'intro');
    });
    return () => {
      active = false;
    };
  }, []);

  // Nút Back của Android cho màn giới thiệu và màn kiểm tra thông tin; các bước camera và trạng thái tự xử lý.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'intro' || phase === 'loading') {
        onCancel();
        return true;
      }
      if (phase === 'review') {
        setPhase('scan');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [phase, onCancel]);

  const handleScanned = (scanned: CccdInfo) => {
    setInfo(scanned);
    setConsent(false);
    setErrors({});
    setFormError(null);
    setPhase('review');
  };

  const edit = (field: ContactField, setter: (value: string) => void) => (value: string) => {
    setter(value);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError(null);
  };

  const goToPhotos = () => {
    Keyboard.dismiss();
    const found: FieldErrors = {};
    if (!isValidContactPhone(phone)) found.phone = t('onboarding.errors.phoneInvalid');
    if (!isValidContactEmail(email)) found.email = t('onboarding.errors.emailInvalid');
    if (!consent) found.consent = t('onboarding.review.consentRequired');
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length === 0) setPhase('photos');
  };

  /** Đủ 3 ảnh: gửi hồ sơ, lưu mã hồ sơ + mã tra cứu trên máy, rồi sang màn trạng thái. */
  const submit = async (photos: ApplicationPhotos) => {
    if (!info || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitApplication({
        info,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        consentVersion: DATA_CONSENT_VERSION,
        photos,
      });
      if (res.success && res.application) {
        await saveApplication(res.application);
        setSaved(res.application);
        setPhase('status');
        return;
      }
      // Lỗi dữ liệu (SĐT, email, thông tin CCCD) sửa ở màn kiểm tra thông tin.
      setErrors({ ...res.fieldErrors });
      const hasFieldErrors = !!res.fieldErrors && Object.values(res.fieldErrors).some(Boolean);
      setFormError(hasFieldErrors ? null : onboardingErrorText(t, res.error, res.message));
      setPhase('review');
    } catch {
      setFormError(t('onboarding.errors.unknown'));
      setPhase('review');
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = async () => {
    await clearSavedApplication();
    setSaved(null);
    setInfo(null);
    setPhone('');
    setEmail('');
    setConsent(false);
    setErrors({});
    setFormError(null);
    setPhase('intro');
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.root, styles.centered]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (phase === 'status' && saved) {
    return (
      <OnboardingStatus
        application={saved}
        onExit={onCancel}
        onApproved={() => onApproved(saved)}
        onStartOver={() => void startOver()}
      />
    );
  }

  if (phase === 'scan') {
    return <OnboardingScanStep onBack={() => setPhase(info ? 'review' : 'intro')} onScanned={handleScanned} />;
  }

  if (phase === 'photos') {
    return <OnboardingPhotoStep submitting={submitting} onBack={() => setPhase('review')} onDone={(p) => void submit(p)} />;
  }

  if (phase === 'review' && info) {
    const rows: { key: TranslationKey; value: string; mono?: boolean }[] = [
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
        <Header title={t('onboarding.title')} onBack={() => setPhase('scan')} styles={styles} theme={theme} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={styles.title}>{t('onboarding.review.title')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.review.hint')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t('onboarding.review.fromCccd')}</Text>
                <Pressable
                  onPress={() => setPhase('scan')}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                  <SymbolView name={KycIcons.rescan} size={IconSize.sm} tintColor={theme.primary} />
                  <Text style={styles.linkText}>{t('onboarding.review.rescan')}</Text>
                </Pressable>
              </View>
              {rows.map((row, i) => (
                <View key={row.key} style={[styles.row, i > 0 && styles.divider]}>
                  <Text style={styles.rowLabel}>{t(row.key)}</Text>
                  <Text style={[styles.rowValue, row.mono && styles.mono]}>{row.value}</Text>
                  <SymbolView name={KycIcons.locked} size={IconSize.xs} tintColor={theme.textMuted} />
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t('onboarding.review.contactTitle')}</Text>
              </View>
              <ContactInput
                icon={OnboardingIcons.phone}
                label={t('onboarding.review.phone')}
                value={phone}
                onChangeText={edit('phone', setPhone)}
                error={errors.phone}
                maxLength={CONTACT_PHONE_MAX_LENGTH}
                keyboardType="phone-pad"
                autoComplete="tel"
                styles={styles}
                theme={theme}
              />
              <ContactInput
                icon={OnboardingIcons.email}
                label={t('onboarding.review.email')}
                value={email}
                onChangeText={edit('email', setEmail)}
                error={errors.email}
                maxLength={CONTACT_EMAIL_MAX_LENGTH}
                keyboardType="email-address"
                autoComplete="email"
                styles={styles}
                theme={theme}
              />
              <Text style={styles.hint}>{t('onboarding.review.contactHint')}</Text>
            </View>

            <View>
              <Pressable
                onPress={() => {
                  setConsent((v) => !v);
                  if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
                }}
                accessibilityRole="checkbox"
                accessibilityLabel={t('onboarding.review.consent')}
                accessibilityState={{ checked: consent }}
                aria-checked={consent}
                style={styles.consent}>
                <View style={[styles.checkbox, consent && styles.checkboxOn]}>
                  {consent && <SymbolView name={KycIcons.check} size={IconSize.sm} tintColor={theme.onPrimary} />}
                </View>
                <Text style={styles.consentText}>{t('onboarding.review.consent')}</Text>
              </Pressable>
              {errors.consent && (
                <Text style={styles.consentError} role="alert">
                  {errors.consent}
                </Text>
              )}
            </View>

            {formError && (
              <Text style={styles.formError} accessibilityLiveRegion="polite" role="alert">
                {formError}
              </Text>
            )}

            <PrimaryButton label={t('onboarding.review.next')} onPress={goToPhotos} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const steps: { icon: IconName; key: TranslationKey }[] = [
    { icon: OnboardingIcons.qr, key: 'onboarding.intro.steps.scan' },
    { icon: OnboardingIcons.photo, key: 'onboarding.intro.steps.photos' },
    { icon: OnboardingIcons.review, key: 'onboarding.intro.steps.review' },
    { icon: OnboardingIcons.login, key: 'onboarding.intro.steps.login' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title={t('onboarding.title')} onBack={onCancel} styles={styles} theme={theme} />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>{t('onboarding.intro.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.intro.subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('onboarding.intro.stepsTitle')}</Text>
          </View>
          {steps.map((step, i) => (
            <View key={step.key} style={[styles.row, i > 0 && styles.divider]}>
              <SymbolView name={step.icon} size={IconSize.lg} tintColor={theme.primary} />
              <Text style={styles.rowValue}>{t(step.key)}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label={t('onboarding.intro.start')} onPress={() => setPhase('scan')} />

        <View style={styles.switchRow}>
          <Text style={styles.hint}>{t('onboarding.intro.haveAccount')}</Text>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <Text style={styles.linkText}>{t('onboarding.intro.backToLogin')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function ContactInput({
  icon,
  label,
  error,
  styles,
  theme,
  ...input
}: {
  icon: IconName;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  maxLength: number;
  keyboardType: 'phone-pad' | 'email-address';
  autoComplete: 'tel' | 'email';
  styles: Styles;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.inputBlock}>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <SymbolView name={icon} size={IconSize.lg} tintColor={error ? theme.danger : theme.textSecondary} />
        <TextInput
          {...input}
          style={styles.input}
          placeholder={label}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {error && (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    centered: { alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
    pressed: { opacity: 0.6 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...Typography.title, color: theme.text, flex: 1 },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
    title: { ...Typography.title, color: theme.text },
    subtitle: { ...Typography.callout, color: theme.textSecondary, marginTop: Spacing.one },
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.two, paddingBottom: Spacing.one },
    cardTitle: { ...Typography.bodyStrong, color: theme.text },
    link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkText: { ...Typography.callout, fontWeight: '700', color: theme.primary },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 11 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    rowLabel: { ...Typography.callout, width: 110, color: theme.textMuted },
    rowValue: { ...Typography.body, flex: 1, color: theme.text },
    mono: { fontFamily: Fonts.mono },
    inputBlock: { paddingVertical: Spacing.one },
    inputRow: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundMuted,
    },
    inputRowError: { borderColor: theme.danger },
    input: { flex: 1, height: '100%', fontSize: 16, color: theme.text, ...WEB_NO_OUTLINE },
    fieldError: { ...Typography.caption, color: theme.danger, marginTop: Spacing.one },
    hint: { ...Typography.caption, color: theme.textSecondary, paddingVertical: Spacing.two },
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
    consentError: { ...Typography.caption, color: theme.danger, marginTop: Spacing.one, marginLeft: 30 },
    formError: { ...Typography.callout, color: theme.danger },
    switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  });
}
