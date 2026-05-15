'use client';

import { useTranslation as useTranslationContext } from '@/context/LanguageContext';

export function useTranslation() {
  const { t, language, setLanguage } = useTranslationContext();
  
  return {
    t,
    language,
    setLanguage,
    isFrench: language === 'fr',
    isEnglish: language === 'en',
  };
}