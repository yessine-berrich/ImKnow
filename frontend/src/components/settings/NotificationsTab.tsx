'use client';

import { Mail, Smartphone } from 'lucide-react';
import ToggleOption from './ToggleOption';
import { useTranslation } from '@/context/LanguageContext';

interface NotificationsTabProps {
  notifications: {
    email: boolean;
    push: boolean;
    comments: boolean;
    likes: boolean;
    follows: boolean;
    newsletter: boolean;
  };
  onToggle: (field: keyof NotificationsTabProps['notifications']) => void;
}

export default function NotificationsTab({ notifications, onToggle }: NotificationsTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('notifications.email_title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('notifications.email_description')}
        </p>

        <div className="space-y-4">
          <ToggleOption
            label={t('notifications.email_notifications')}
            description={t('notifications.email_notifications_desc')}
            checked={notifications.email}
            onChange={() => onToggle('email')}
          />
          <div className="border-t border-gray-200 dark:border-gray-800"></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('notifications.push_title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('notifications.push_description')}
        </p>

        <ToggleOption
          label={t('notifications.push_notifications')}
          description={t('notifications.push_notifications_desc')}
          checked={notifications.push}
          onChange={() => onToggle('push')}
        />
      </div>
    </>
  );
}