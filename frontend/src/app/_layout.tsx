import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import LoginScreen from '@/components/login-screen';
import { AuthProvider, useAuth } from '@/lib/authStore';
import { NotificationProvider } from '@/lib/notificationStore';
import { SettingsProvider } from '@/lib/settingsStore';

SplashScreen.preventAutoHideAsync();
// Sáng tạm thời cho tới khi SettingsProvider đọc xong lựa chọn đã lưu; web không có setColorScheme.
if (Platform.OS !== 'web') Appearance.setColorScheme('light');

function RootContent() {
  const { user } = useAuth();
  return user ? <AppTabs /> : <LoginScreen />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <AuthProvider>
          <NotificationProvider>
            <AnimatedSplashOverlay />
            <RootContent />
          </NotificationProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
