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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const savePreferences = async (updated: { emailNotificationsEnabled: boolean; pushNotificationsEnabled: boolean }) => {
    const token = getToken();
    if (!token) {
      setMessage({ type: 'error', text: t('notification_settings.login_required') });
      return false;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/users/me/notifications-preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }
      setMessage({ type: 'success', text: t('notification_settings.save_success') });
      return true;
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setMessage({ type: 'error', text: t('notification_settings.save_error') });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToggle = async () => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    const ok = await savePreferences({ emailNotificationsEnabled: next, pushNotificationsEnabled: pushEnabled });
    if (!ok) setEmailEnabled(!next);
  };

  const handlePushToggle = async () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    const ok = await savePreferences({ emailNotificationsEnabled: emailEnabled, pushNotificationsEnabled: next });
    if (!ok) setPushEnabled(!next);
  };

  return (
    <>
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('notification_settings.email_title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('notification_settings.email_description')}
        </p>

        <div className="space-y-4">
          <ToggleOption
            label={saving ? t('notification_settings.saving') : t('notification_settings.email_notifications')}
            description={t('notification_settings.email_notifications_desc')}
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
            {t('notification_settings.push_title')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('notification_settings.push_description')}
        </p>

        <ToggleOption
          label={saving ? t('notification_settings.saving') : t('notification_settings.push_notifications')}
          description={t('notification_settings.push_notifications_desc')}
          checked={pushEnabled}
          onChange={handlePushToggle}
          disabled={saving}
        />
      </div>
    </>
  );
}
