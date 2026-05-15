'use client';

import { Palette, Globe, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

interface AppearanceTabProps {
  language: string;
  timezone: string;
  onLanguageChange: (language: string) => void;
  onTimezoneChange: (timezone: string) => void;
}

export default function AppearanceTab({
  language,
  timezone,
  onLanguageChange,
  onTimezoneChange,
}: AppearanceTabProps) {
  const { theme, setTheme } = useTheme();
  const { t, language: currentLang, setLanguage } = useTranslation();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as 'fr' | 'en');
    onLanguageChange(lang);
  };

  const getThemeDescription = () => {
    switch (theme) {
      case 'light':
        return t('appearance.light_desc');
      case 'dark':
        return t('appearance.dark_desc');
      case 'system':
        return t('appearance.system_desc');
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5" style={{ color: '#168F6F' }} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('appearance.title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('appearance.description')}
        </p>

        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ backgroundColor: '#168F6F10' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#168F6F20' }}>
            {getThemeIcon()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('appearance.current_theme')} :{' '}
              <span className="capitalize" style={{ color: '#168F6F' }}>
                {t(`appearance.${theme}`)}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {getThemeDescription()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-[#168F6F] bg-[#168F6F10]'
                : 'border-gray-200 dark:border-gray-800 hover:border-[#168F6F] hover:bg-[#168F6F05]'
            }`}
          >
            <div className="relative h-20 rounded-lg bg-gradient-to-b from-white to-gray-100 mb-3 overflow-hidden border border-gray-200">
              <div className="absolute top-2 left-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#168F6F' }}></div>
              <div className="absolute top-2 right-2 w-4 h-2 bg-gray-300 rounded"></div>
              <div className="absolute bottom-2 left-2 right-2 h-8 bg-white rounded shadow-sm"></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('appearance.light')}
              </p>
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-[#168F6F] bg-[#168F6F10]'
                : 'border-gray-200 dark:border-gray-800 hover:border-[#168F6F] hover:bg-[#168F6F05]'
            }`}
          >
            <div className="relative h-20 rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 mb-3 overflow-hidden">
              <div className="absolute top-2 left-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#168F6F' }}></div>
              <div className="absolute top-2 right-2 w-4 h-2 bg-gray-600 rounded"></div>
              <div className="absolute bottom-2 left-2 right-2 h-8 bg-gray-800 rounded shadow-sm border border-gray-700"></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('appearance.dark')}
              </p>
            </div>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'system'
                ? 'border-[#168F6F] bg-[#168F6F10]'
                : 'border-gray-200 dark:border-gray-800 hover:border-[#168F6F] hover:bg-[#168F6F05]'
            }`}
          >
            <div className="relative h-20 rounded-lg bg-gradient-to-r from-white to-gray-800 mb-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-400 to-gray-800"></div>
              <div className="absolute top-2 left-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#168F6F' }}></div>
              <div className="absolute top-2 right-2 w-4 h-2 bg-gray-400 rounded"></div>
              <div className="absolute bottom-2 left-2 right-2 h-8 bg-gradient-to-r from-white to-gray-800 rounded shadow-sm"></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('appearance.system')}
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          {t('appearance.theme_note')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5" style={{ color: '#168F6F' }} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('language_region.title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('language_region.description')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('language_region.language')}
            </label>
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
              style={{ focusRingColor: '#168F6F' }}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('language_region.quick_preview')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('language_region.test_themes')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-colors"
                title={t('appearance.light')}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-colors"
                title={t('appearance.dark')}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-colors"
                title={t('appearance.system')}
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}