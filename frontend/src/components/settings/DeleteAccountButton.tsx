// DeleteAccountButton.tsx

'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, X, Mail, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';
import { userService } from '../../../services/user.service';
import { useUser } from '@/context/UserContext';

interface DeleteAccountButtonProps {
  isGoogleAccount?: boolean;
  userEmail?: string;
}

export default function DeleteAccountButton({ isGoogleAccount = false, userEmail }: DeleteAccountButtonProps) {
  const { t } = useTranslation();
  const { clearUser } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleDelete = async () => {
    setError('');

    if (!isGoogleAccount && !password) {
      setError(t('security.current_password_required'));
      return;
    }

    setIsDeleting(true);

    try {
      const data = await userService.deleteAccount(password);

      if (data.requiresEmailConfirmation) {
        // Google account — confirmation email sent
        setConfirmationSent(true);
        setTimeout(() => {
          setShowModal(false);
          setConfirmationSent(false);
        }, 5000);
      } else {
        // Regular account deleted — clear all auth state and redirect to sign-in
        clearUser();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('userId');
        document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict';
        window.location.href = '/signin';
      }
    } catch (err: any) {
      setError(translateError(err.message, t) || t('security.delete_account_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirmation sent view
  if (confirmationSent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('security.confirmation_email_sent')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {t('security.check_email_to_delete', { email: userEmail })}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-4 py-2.5 border border-red-300 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        {t('security.delete_account')}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">{t('security.delete_account_title')}</h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPassword('');
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {t('security.delete_account_warning')}
                </p>

                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>{t('security.delete_data_publications')}</li>
                  <li>{t('security.delete_data_comments')}</li>
                  <li>{t('security.delete_data_profile')}</li>
                </ul>

                {/* Error banner — always visible */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                {!isGoogleAccount ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('security.enter_password_to_confirm')}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={isDeleting}
                      onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                          {t('security.google_account_delete_info')}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          {t('security.confirmation_email_will_be_sent', { email: userEmail })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setPassword('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    disabled={isDeleting}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || (!isGoogleAccount && !password)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('common.deleting')}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        {t('security.delete_account')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}