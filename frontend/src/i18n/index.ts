import { useCallback } from 'react';

import { useSettings } from '@/lib/settingsStore';
import type { AppLanguage } from '@/models';

import { en } from './locales/en';
import { vi } from './locales/vi';
import type { PluralEntry, TranslateParams, TranslationKey, Translations } from './types';

export type { TranslateParams, TranslationKey, Translations } from './types';

const dictionaries: Record<AppLanguage, Translations> = { vi, en };

const LOCALES: Record<AppLanguage, string> = { vi: 'vi-VN', en: 'en-US' };

function lookup(dictionary: Translations, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dictionary,
  );
}

function isPlural(entry: unknown): entry is PluralEntry {
  return !!entry && typeof entry === 'object' && 'one' in entry && 'other' in entry;
}

export function translate(language: AppLanguage, key: TranslationKey, params?: TranslateParams): string {
  const entry = lookup(dictionaries[language], key) ?? lookup(dictionaries.vi, key);
  let text: string;
  if (typeof entry === 'string') text = entry;
  else if (isPlural(entry)) text = Math.abs(Number(params?.count)) === 1 ? entry.one : entry.other;
  else return key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

export function useI18n() {
  const { settings } = useSettings();
  const language = settings.language;
  const t = useCallback<Translate>((key, params) => translate(language, key, params), [language]);
  return { t, language, locale: LOCALES[language] };
}
