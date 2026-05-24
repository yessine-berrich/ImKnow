'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '../../../../../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Status = 'loading' | 'error';

export default function ConfirmAccountDeletionPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmDeletion = async () => {
      const userId = params?.userId;
      const token = params?.token;

      if (!userId || !token) {
        setStatus('error');
        setErrorMessage(t('delete_account_page.error_default'));
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/users/delete-account/confirm/${userId}/${token}`,
          { method: 'GET' },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data?.message || t('delete_account_page.error_default'));
          return;
        }

        // Clear all auth state immediately — account is now deleted
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('userId');
        document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict';

        // Redirect immediately to sign-in with success param before any
        // background API call can detect the missing token and override us.
        router.replace('/signin?deleted=true');
      } catch {
        setStatus('error');
        setErrorMessage(t('delete_account_page.error_network'));
      }
    };

    confirmDeletion();
  }, [params, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #e8f3f0 0%, #d4ebe5 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header band */}
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #168F6F, #0e6b52)' }} />

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <Image
                src="/images/logo/logo_2.png"
                alt="Logo"
                fill
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <div>
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('delete_account_page.loading_title')}</h2>
              <p className="text-gray-500 text-sm">
                {t('delete_account_page.loading_desc')}
              </p>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('delete_account_page.error_title')}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {errorMessage || t('delete_account_page.error_default')}
              </p>
              <button
                onClick={() => router.push('/signin')}
                className="w-full py-3 font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('delete_account_page.btn_back_signin')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            {t('delete_account_page.footer_help')}{' '}
            <a
              href="mailto:support@imknow.com"
              className="hover:underline"
              style={{ color: '#168F6F' }}
            >
              {t('delete_account_page.footer_contact')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
