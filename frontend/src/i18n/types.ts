import type { vi } from './locales/vi';

export interface PluralEntry {
  one: string;
  other: string;
}

type Widen<T> = T extends string
  ? string
  : T extends { one: string; other: string }
    ? PluralEntry
    : { -readonly [K in keyof T]: Widen<T[K]> };

export type Translations = Widen<typeof vi>;

type Join<K extends string, P extends string> = `${K}.${P}`;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string | PluralEntry ? K : Join<K, Paths<T[K]>>;
}[keyof T & string];

export type TranslationKey = Paths<Translations>;

export type TranslateParams = Record<string, string | number>;
