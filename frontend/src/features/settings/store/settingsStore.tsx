import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import type { AppSettings } from '@/models';
import * as settingsService from '@/services/settings.service';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(settingsService.DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    settingsService.getSettings().then((res) => {
      if (active) setSettings(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // react-native-web không có Appearance.setColorScheme.
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
  }, [settings.theme]);

  function updateSettings(changes: Partial<AppSettings>) {
    setSettings((prev) => ({ ...prev, ...changes }));
    void settingsService.updateSettings({ changes });
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
