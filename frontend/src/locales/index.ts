import fr from './fr/settings.json';
import en from './en/settings.json';

export const resources = {
  fr: { settings: fr },
  en: { settings: en },
};

export type Language = 'fr' | 'en';
export type TranslationKey = keyof typeof fr;