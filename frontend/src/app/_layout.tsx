import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/shared/components/animated-icon';
import AppTabs from '@/shared/components/app-tabs';
import AdminReviewScreen from '@/features/admin-review/components/admin-review-screen';
import LoginScreen from '@/features/auth/components/login-screen';
import { AuthProvider, useAuth } from '@/features/auth/store/authStore';
import { NotificationProvider } from '@/features/notifications/store/notificationStore';
import { SettingsProvider } from '@/features/settings/store/settingsStore';
import { SmartOtpProvider } from '@/features/smart-otp/store/smartOtpStore';

SplashScreen.preventAutoHideAsync();
// Sáng tạm thời cho tới khi SettingsProvider đọc xong lựa chọn đã lưu; web không có setColorScheme.
if (Platform.OS !== 'web') Appearance.setColorScheme('light');

// Nhân viên (vai trò ADMIN) chỉ dùng màn duyệt hồ sơ đăng ký, không có các tab của khách.
function RootContent() {
  const { user, staff } = useAuth();
  if (staff) return <AdminReviewScreen />;
  return user ? <AppTabs /> : <LoginScreen />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <AuthProvider>
          <SmartOtpProvider>
            <NotificationProvider>
              <AnimatedSplashOverlay />
              <RootContent />
            </NotificationProvider>
          </SmartOtpProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
