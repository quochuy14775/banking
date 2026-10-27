import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AppLanguage,
  AppSettings,
  GetSettingsResponse,
  ThemePreference,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from '@/models';

const STORAGE_KEY = 'vietbank.settings.v1';
const THEMES: ThemePreference[] = ['light', 'dark', 'system'];
const LANGUAGES: AppLanguage[] = ['vi', 'en'];

export const DEFAULT_SETTINGS: AppSettings = { theme: 'light', language: 'vi', faceIdEnabled: false };

function normalize(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const value = raw as Record<string, unknown>;
  return {
    theme: THEMES.includes(value.theme as ThemePreference)
      ? (value.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    language: LANGUAGES.includes(value.language as AppLanguage)
      ? (value.language as AppLanguage)
      : DEFAULT_SETTINGS.language,
    faceIdEnabled:
      typeof value.faceIdEnabled === 'boolean' ? value.faceIdEnabled : DEFAULT_SETTINGS.faceIdEnabled,
  };
}

export async function getSettings(): Promise<GetSettingsResponse> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return { success: true, data: raw ? normalize(JSON.parse(raw)) : DEFAULT_SETTINGS };
  } catch {
    return { success: false, data: DEFAULT_SETTINGS, message: 'Không đọc được cài đặt.' };
  }
}

export async function updateSettings(req: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
  try {
    const { data: current } = await getSettings();
    const next = normalize({ ...current, ...req.changes });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { success: true, data: next };
  } catch {
    return { success: false, message: 'Không lưu được cài đặt.' };
  }
}
