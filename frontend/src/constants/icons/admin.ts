import { CommonIcons } from './common';
import { Glyphs } from './glyphs';
import { KycIcons } from './kyc';
import { OnboardingIcons } from './onboarding';
import { ProfileIcons } from './profile';
import { TransferIcons } from './transfer';
import type { IconName } from './types';

// Màn duyệt hồ sơ đăng ký của nhân viên. Hình đã có ở nhóm khác thì trỏ tới đó, không khai báo lại.
export const AdminIcons = {
  back: TransferIcons.back,
  logout: ProfileIcons.logout,
  refresh: KycIcons.rescan,
  idCard: KycIcons.idCard,
  person: Glyphs.person,
  warning: OnboardingIcons.rejected,
  success: Glyphs.success,
  close: CommonIcons.close,
  next: CommonIcons.chevronRight,
  previous: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  photo: { ios: 'photo', android: 'image', web: 'image' },
  photoError: { ios: 'exclamationmark.triangle', android: 'broken_image', web: 'broken_image' },
  enlarge: { ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' },
  empty: { ios: 'tray', android: 'inbox', web: 'inbox' },
} satisfies Record<string, IconName>;
