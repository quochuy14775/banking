import { Alert } from 'react-native';

import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/authStore';

export function useConfirmLogout(onConfirmed?: () => void) {
  const { t } = useI18n();
  const { logout } = useAuth();

  return () =>
    Alert.alert(t('common.logout'), t('common.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => {
          onConfirmed?.();
          void logout();
        },
      },
    ]);
}
