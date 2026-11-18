import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminIcons, type IconName } from '@/constants/icons';
import { Fonts, IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { formatDate, formatDateTime } from '@/helpers';
import { useI18n, type TranslationKey } from '@/i18n';
import type { ApplicationDetail, ApplicationStatus, ReviewError } from '@/models';
import {
  approveApplication,
  documentTypeOf,
  getApplication,
  rejectApplication,
} from '@/services/admin-review.service';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

import { useDocumentImages } from '../hooks/use-document-images';
import { useReviewApi } from '../hooks/use-review-api';
import { documentLabel, reviewErrorText, statusColors } from '../review-text';
import ConfirmDialog from './confirm-dialog';
import DocumentPhoto from './document-photo';
import PhotoViewer, { type ViewerPhoto } from './photo-viewer';
import RejectDialog from './reject-dialog';

interface Props {
  applicationId: string;
  /** Màn hẹp: quay lại danh sách. Màn rộng (danh sách và chi tiết cạnh nhau) thì không có nút này. */
  onBack?: () => void;
  /** Hồ sơ vừa rời trạng thái chờ duyệt (duyệt, từ chối, hoặc người khác đã xử lý): danh sách bỏ hồ sơ này ra. */
  onReviewed: (applicationId: string) => void;
}

type Outcome = { kind: 'approved'; cifNumber: string } | { kind: 'rejected' };

// Lỗi cho thấy hồ sơ trên máy chủ đã khác lúc mở (người khác xử lý, trùng CCCD, vừa bị sửa): đóng hộp, báo và tải lại.
// Lỗi còn lại (mất mạng, không có quyền...) giữ hộp mở để thử lại mà không mất lý do đã nhập.
const STALE_ERRORS: readonly ReviewError[] = ['notPending', 'nationalIdTaken', 'concurrentUpdate', 'notFound'];

const REASONS: TranslationKey[] = ['admin.reasons.blurry', 'admin.reasons.portrait', 'admin.reasons.mismatch'];
const DUPLICATE_REASON: TranslationKey = 'admin.reasons.duplicate';

/** Chi tiết một hồ sơ: thông tin CCCD, liên hệ, 3 ảnh và nút duyệt/từ chối khi hồ sơ còn chờ duyệt. */
export default function ApplicationDetailView({ applicationId, onBack, onReviewed }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const run = useReviewApi();

  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loadError, setLoadError] = useState<ReviewError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    run((accessToken) => getApplication(accessToken, applicationId)).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.ok) {
        setDetail(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    });
    return () => {
      active = false;
    };
  }, [run, applicationId, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const documentUrls = detail?.documentUrls ?? [];
  const { imageOf, retry } = useDocumentImages(documentUrls);
  const photos: ViewerPhoto[] = documentUrls.map((url) => ({
    url,
    label: documentLabel(t, documentTypeOf(url)),
    image: imageOf(url),
  }));

  const openDialog = (kind: 'approve' | 'reject') => {
    setDialogError(null);
    setDialog(kind);
  };

  const closeDialog = () => {
    if (!submitting) setDialog(null);
  };

  const handleActionError = (error: ReviewError) => {
    // 401: đã được đưa về màn đăng nhập.
    if (error === 'sessionExpired') return;
    const text = reviewErrorText(t, error, 'action');
    if (!STALE_ERRORS.includes(error)) {
      setDialogError(text);
      return;
    }
    setDialog(null);
    setNotice(text);
    if (error === 'notPending') onReviewed(applicationId);
    reload();
  };

  const approve = async () => {
    if (submitting) return;
    setSubmitting(true);
    setDialogError(null);
    const res = await run((accessToken) => approveApplication(accessToken, applicationId));
    setSubmitting(false);
    if (!res.ok) {
      handleActionError(res.error);
      return;
    }
    setDialog(null);
    setNotice(null);
    setOutcome({ kind: 'approved', cifNumber: res.data.cifNumber });
    onReviewed(applicationId);
    // Kết quả duyệt chỉ có số CIF: tải lại để có trạng thái, thời điểm duyệt, mã khách hàng.
    reload();
  };

  const reject = async (reason: string) => {
    if (submitting) return;
    setSubmitting(true);
    setDialogError(null);
    const res = await run((accessToken) => rejectApplication(accessToken, applicationId, reason));
    setSubmitting(false);
    if (!res.ok) {
      handleActionError(res.error);
      return;
    }
    setDialog(null);
    setNotice(null);
    setDetail(res.data);
    setOutcome({ kind: 'rejected' });
    onReviewed(applicationId);
  };

  const header = (
    <View style={styles.header}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('admin.detail.back')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={AdminIcons.back} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
      )}
      <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
        {t('admin.detail.title')}
      </Text>
      {detail && <StatusBadge status={detail.status} />}
      {detail && (
        <Pressable
          onPress={reload}
          disabled={loading}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('admin.detail.reload')}
          accessibilityState={{ busy: loading }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <SymbolView name={AdminIcons.refresh} size={IconSize.lg} tintColor={theme.primary} />
          )}
        </Pressable>
      )}
    </View>
  );

  if (!detail) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          {loading ? (
            <>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.muted}>{t('admin.detail.loading')}</Text>
            </>
          ) : loadError && loadError !== 'sessionExpired' ? (
            <>
              <Text style={styles.errorText} accessibilityLiveRegion="polite" role="alert">
                {reviewErrorText(t, loadError)}
              </Text>
              {loadError !== 'notFound' && (
                <Pressable onPress={reload} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.link}>{t('admin.detail.retry')}</Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      </View>
    );
  }

  const pending = detail.status === 'PENDING_REVIEW';
  // Số CCCD đã có khách: máy chủ sẽ báo trùng nếu duyệt, nên khóa nút Duyệt và gợi ý lý do từ chối phù hợp.
  const blocked = pending && detail.nationalIdTaken;
  const suggestions = (blocked ? [DUPLICATE_REASON, ...REASONS] : [...REASONS, DUPLICATE_REASON]).map((key) => t(key));
  const empty = t('admin.detail.empty');

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {outcome?.kind === 'approved' && (
          <Banner tone="success" icon={AdminIcons.success} text={t('admin.detail.approvedBanner', { cif: outcome.cifNumber })} />
        )}
        {outcome?.kind === 'rejected' && <Banner tone="success" icon={AdminIcons.success} text={t('admin.detail.rejectedBanner')} />}
        {notice && <Banner tone="warning" icon={AdminIcons.warning} text={notice} />}
        {!loading && loadError && loadError !== 'sessionExpired' && (
          <Banner tone="danger" icon={AdminIcons.warning} text={reviewErrorText(t, loadError)} />
        )}
        {blocked && (
          <Banner
            tone="danger"
            icon={AdminIcons.warning}
            title={t('admin.detail.nationalIdTakenTitle')}
            text={t('admin.detail.nationalIdTakenMessage', { id: detail.nationalId })}
          />
        )}

        <Section title={t('admin.detail.identity')}>
          <Row first label={t('admin.detail.fields.fullName')} value={detail.fullName} strong />
          <Row label={t('admin.detail.fields.nationalId')} value={detail.nationalId} mono />
          {detail.oldIdNumber ? (
            <Row label={t('admin.detail.fields.oldIdNumber')} value={detail.oldIdNumber} mono />
          ) : null}
          <Row label={t('admin.detail.fields.dateOfBirth')} value={formatDate(detail.dateOfBirth)} />
          <Row label={t('admin.detail.fields.gender')} value={t(`admin.detail.gender.${detail.gender}`)} />
          <Row label={t('admin.detail.fields.address')} value={detail.address} />
          <Row
            label={t('admin.detail.fields.idIssueDate')}
            value={detail.idIssueDate ? formatDate(detail.idIssueDate) : empty}
          />
        </Section>

        <Section title={t('admin.detail.contact')}>
          <Row first label={t('admin.detail.fields.phone')} value={detail.phone ?? empty} />
          <Row label={t('admin.detail.fields.email')} value={detail.email ?? empty} />
        </Section>

        <Section title={t('admin.detail.photos')} hint={t('admin.detail.photosHint')}>
          <View style={styles.photos}>
            {photos.map((photo, index) => (
              <DocumentPhoto
                key={photo.url}
                label={photo.label}
                image={photo.image}
                onOpen={() => setViewerIndex(index)}
                onRetry={() => retry(photo.url)}
              />
            ))}
          </View>
        </Section>

        <Section title={t('admin.detail.processing')}>
          <Row first label={t('admin.detail.fields.submittedAt')} value={formatDateTime(detail.submittedAt)} />
          {detail.reviewedAt ? (
            <Row label={t('admin.detail.fields.reviewedAt')} value={formatDateTime(detail.reviewedAt)} />
          ) : null}
          {detail.rejectReason ? <Row label={t('admin.detail.fields.rejectReason')} value={detail.rejectReason} /> : null}
          {detail.customerId ? <Row label={t('admin.detail.fields.customerId')} value={detail.customerId} mono /> : null}
        </Section>
      </ScrollView>

      {pending && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => openDialog('reject')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionButton, styles.rejectButton, pressed && styles.pressed]}>
            <Text style={styles.rejectText}>{t('admin.detail.reject')}</Text>
          </Pressable>
          <Pressable
            onPress={() => openDialog('approve')}
            disabled={blocked}
            accessibilityRole="button"
            accessibilityState={{ disabled: blocked }}
            style={({ pressed }) => [
              styles.actionButton,
              styles.approveButton,
              blocked && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.approveText}>{t('admin.detail.approve')}</Text>
          </Pressable>
        </View>
      )}

      <ConfirmDialog
        visible={dialog === 'approve'}
        title={t('admin.approveDialog.title')}
        message={t('admin.approveDialog.message', { name: detail.fullName, id: detail.nationalId })}
        confirmLabel={t('admin.approveDialog.confirm')}
        loading={submitting}
        error={dialogError}
        onConfirm={approve}
        onCancel={closeDialog}
      />
      <RejectDialog
        visible={dialog === 'reject'}
        suggestions={suggestions}
        loading={submitting}
        error={dialogError}
        onSubmit={reject}
        onCancel={closeDialog}
      />
      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onRetry={retry}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const colors = statusColors(theme, status);
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.badgeText, { color: colors.color }]}>{t(`admin.status.${status}`)}</Text>
    </View>
  );
}

function Banner({
  tone,
  icon,
  title,
  text,
}: {
  tone: 'success' | 'warning' | 'danger';
  icon: IconName;
  title?: string;
  text: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;
  const background = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.dangerSoft;
  return (
    <View
      style={[styles.banner, { backgroundColor: background, borderColor: color }]}
      accessibilityLiveRegion="polite"
      role={tone === 'success' ? 'status' : 'alert'}>
      <SymbolView name={icon} size={IconSize.xl} tintColor={color} />
      <View style={styles.bannerBody}>
        {title ? <Text style={[styles.bannerTitle, { color }]}>{title}</Text> : null}
        <Text style={[styles.bannerText, { color }]}>{text}</Text>
      </View>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  first,
  mono,
  strong,
}: {
  label: string;
  value: string;
  first?: boolean;
  mono?: boolean;
  strong?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono, strong && styles.strong]} selectable>
        {value}
      </Text>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    pressed: { opacity: 0.7 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundElement,
    },
    headerTitle: { ...Typography.title, flex: 1, color: theme.text },
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
    badgeText: { ...Typography.micro, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
    muted: { ...Typography.callout, color: theme.textSecondary },
    errorText: { ...Typography.callout, color: theme.danger, textAlign: 'center' },
    link: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
    content: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: Spacing.three,
      paddingBottom: Spacing.four,
      gap: Spacing.three,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: Radius.lg,
      borderWidth: 1,
    },
    bannerBody: { flex: 1, gap: 2 },
    bannerTitle: { ...Typography.bodyStrong },
    bannerText: { ...Typography.callout },
    section: { gap: Spacing.one },
    sectionTitle: { ...Typography.micro, color: theme.textMuted, textTransform: 'uppercase', paddingHorizontal: Spacing.one },
    sectionHint: { ...Typography.caption, color: theme.textSecondary, paddingHorizontal: Spacing.one },
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingVertical: 11 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    rowLabel: { ...Typography.callout, width: 120, color: theme.textMuted },
    rowValue: { ...Typography.body, flex: 1, color: theme.text },
    mono: { fontFamily: Fonts.mono },
    strong: { fontWeight: '700' },
    photos: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two },
    actions: {
      flexDirection: 'row',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
    actionButton: { flex: 1, minHeight: 50, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    rejectButton: { borderWidth: 1, borderColor: theme.danger, backgroundColor: theme.dangerSoft },
    rejectText: { ...Typography.bodyStrong, color: theme.danger },
    approveButton: { backgroundColor: theme.primary },
    approveText: { ...Typography.bodyStrong, color: theme.onPrimary },
    disabled: { opacity: 0.4 },
  });
}
