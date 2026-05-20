'use client';

import { useState } from 'react';
import { Mail, Smartphone } from 'lucide-react';
import ToggleOption from './ToggleOption';
import { useTranslation } from '@/context/LanguageContext';
import { getToken } from '../../../services/auth.service';

interface NotificationsTabProps {
  initialEmail: boolean;
  initialPush: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function NotificationsTab({ initialEmail, initialPush }: NotificationsTabProps) {
  const { t } = useTranslation();
  const [emailEnabled, setEmailEnabled] = useState(initialEmail);
  const [pushEnabled, setPushEnabled] = useState(initialPush);
  const [saving, setSaving] = useState(false);

  const savePreferences = async (updated: { emailNotificationsEnabled: boolean; pushNotificationsEnabled: boolean }) => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      await fetch(`${API_URL}/api/users/me/notifications-preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Error saving notification preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToggle = () => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    savePreferences({ emailNotificationsEnabled: next, pushNotificationsEnabled: pushEnabled });
  };

  const handlePushToggle = () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    savePreferences({ emailNotificationsEnabled: emailEnabled, pushNotificationsEnabled: next });
  };

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
            checked={emailEnabled}
            onChange={handleEmailToggle}
            disabled={saving}
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
          checked={pushEnabled}
          onChange={handlePushToggle}
          disabled={saving}
        />
      </div>
    </>
  );
}
