'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ConfirmEmailChangePage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmEmailChange = async () => {
      const userId = params?.userId;
      const token = params?.token;

      if (!userId || !token) {
        setStatus('error');
        setErrorMessage(t('confirm_email.invalid_link'));
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/users/confirm-email-change/${userId}/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          setStatus('success');
          // Redirect to sign in after 3 seconds
          setTimeout(() => {
            router.push('/signin?message=email_changed_success');
          }, 3000);
        } else {
          const error = await response.text();
          setStatus('error');
          setErrorMessage(error || t('confirm_email.failed'));
        }
      } catch (error) {
        console.error('Error confirming email change:', error);
        setStatus('error');
        setErrorMessage(t('confirm_email.error_occurred'));
      }
    };

    confirmEmailChange();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#168F6F' }} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('confirm_email.loading_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('confirm_email.loading_text')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#168F6F20' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: '#168F6F' }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('confirm_email.success_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('confirm_email.success_text')}
            </p>
            <button
              onClick={() => router.push('/signin')}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#168F6F' }}
            >
              {t('confirm_email.success_login')}
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('confirm_email.error_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {errorMessage || t('confirm_email.error_text')}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/profile/security')}
                className="w-full px-6 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#168F6F' }}
              >
                {t('confirm_email.go_security')}
              </button>
              <button
                onClick={() => router.push('/support')}
                className="w-full px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('confirm_email.contact_support')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}