export type ThemePreference = 'light' | 'dark' | 'system';

export type AppLanguage = 'vi' | 'en';

export interface AppSettings {
  theme: ThemePreference;
  language: AppLanguage;
  faceIdEnabled: boolean;
}

export interface GetSettingsResponse {
  success: boolean;
  data: AppSettings;
  message?: string;
}

export interface UpdateSettingsRequest {
  changes: Partial<AppSettings>;
}

export interface UpdateSettingsResponse {
  success: boolean;
  data?: AppSettings;
  message?: string;
}
