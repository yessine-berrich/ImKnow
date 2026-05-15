'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, resources } from '@/locales';

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

type TranslationKeys = NestedKeyOf<typeof resources.fr.settings>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'fr' || browserLang === 'en') {
        setLanguage(browserLang as Language);
      }
    }
  }, []);

  const setLanguageAndSave = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = resources[language]?.settings;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (!value) {
      // Fallback to French if translation not found
      let fallbackValue: any = resources.fr.settings;
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === 'object') {
          fallbackValue = fallbackValue[k];
        } else {
          fallbackValue = undefined;
          break;
        }
      }
      value = fallbackValue || key;
    }

    if (params && typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, match) => {
        return String(params[match] ?? `{${match}}`);
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: setLanguageAndSave, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}