'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { resetPassword, verifyResetPasswordLink } from '../../../../../../services/auth.service';
import { useTranslation } from '../../../../../context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

type LinkStatus = 'loading' | 'valid' | 'invalid';
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface PasswordValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const userId = params?.id as string;
  const resetPasswordToken = params?.token as string;

  const [linkStatus, setLinkStatus] = useState<LinkStatus>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Password validation logic
  const validatePassword = (password: string): PasswordValidation => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

    return {
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isValid,
    };
  };

  const passwordValidation = validatePassword(newPassword);

  // Verify link validity on mount
  useEffect(() => {
    if (!userId || !resetPasswordToken) {
      setLinkStatus('invalid');
      return;
    }

    verifyResetPasswordLink(userId, resetPasswordToken)
      .then(() => setLinkStatus('valid'))
      .catch(() => setLinkStatus('invalid'));
  }, [userId, resetPasswordToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passwordValidation.isValid) {
      setErrorMessage(t('reset_password_page.error_requirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('reset_password_page.error_mismatch'));
      return;
    }

    setSubmitStatus('loading');

    try {
      await resetPassword(userId, resetPasswordToken, newPassword);
      setSubmitStatus('success');
    } catch (err: any) {
      setSubmitStatus('error');
      setErrorMessage(translateError(err.message, t) || t('errors.generic'));
    }
  };

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/aurora-bg-blur.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/30" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10">

        {/* Header band */}
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #168F6F, #0e6b52)' }} />

        <div className="p-8">

          {/* ── VERIFYING LINK ── */}
          {linkStatus === 'loading' && (
            <div className="text-center py-8">
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password_page.verifying_title')}</h2>
              <p className="text-gray-500 text-sm">{t('reset_password_page.verifying_desc')}</p>
            </div>
          )}

          {/* ── INVALID LINK ── */}
          {linkStatus === 'invalid' && (
            <>
              <Link
                href="/signin"
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {t('reset_password_page.back_to_signin')}
              </Link>

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative w-14 h-14">
                  <Image
                    src="/images/logo/logo_2.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password_page.invalid_title')}</h2>
                <p className="text-gray-500 text-sm mb-6">
                  {t('reset_password_page.invalid_desc')}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/forgot-password')}
                    className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                    style={{ backgroundColor: '#168F6F' }}
                  >
                    {t('reset_password_page.btn_request_new')}
                  </button>
                  <button
                    onClick={() => router.push('/signin')}
                    className="w-full py-3 font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {t('reset_password_page.back_to_signin')}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── VALID LINK — FORM ── */}
          {linkStatus === 'valid' && submitStatus !== 'success' && (
            <>
              <Link
                href="/signin"
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {t('reset_password_page.back_to_signin')}
              </Link>

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative w-14 h-14">
                  <Image
                    src="/images/logo/logo_2.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>

              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#168F6F15' }}
                >
                  <KeyRound className="w-8 h-8" style={{ color: '#168F6F' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password_page.form_title')}</h1>
                <p className="text-gray-500 text-sm">{t('reset_password_page.form_desc')}</p>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('reset_password_page.new_password_label')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder={t('reset_password_page.new_password_placeholder')}
                      required
                      disabled={submitStatus === 'loading'}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all disabled:bg-gray-50 focus:ring-2 focus:ring-opacity-50"
                      style={{
                        borderColor: isPasswordFocused ? '#168F6F' : '#e5e7eb',
                        boxShadow: isPasswordFocused ? `0 0 0 2px ${'#168F6F'}20` : 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password validation dropdown */}
                  {(isPasswordFocused || (newPassword && !passwordValidation.isValid)) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs space-y-1.5"
                    >
                      <p className="text-gray-600 dark:text-gray-400 mb-1 font-medium">{t('reset_password_page.pw_must_contain')}</p>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="text-sm">{passwordValidation.hasMinLength ? '✓' : '○'}</span>
                        <span>{t('reset_password_page.pw_min_length')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="text-sm">{passwordValidation.hasUppercase ? '✓' : '○'}</span>
                        <span>{t('reset_password_page.pw_uppercase')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="text-sm">{passwordValidation.hasLowercase ? '✓' : '○'}</span>
                        <span>{t('reset_password_page.pw_lowercase')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="text-sm">{passwordValidation.hasNumber ? '✓' : '○'}</span>
                        <span>{t('reset_password_page.pw_number')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="text-sm">{passwordValidation.hasSpecialChar ? '✓' : '○'}</span>
                        <span>{t('reset_password_page.pw_special')}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('reset_password_page.confirm_password_label')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('reset_password_page.confirm_password_placeholder')}
                      required
                      disabled={submitStatus === 'loading'}
                      className="w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder-gray-400 outline-none transition-all disabled:bg-gray-50"
                      style={{
                        borderColor: passwordsMismatch ? '#ef4444' : (confirmPassword ? '#e5e7eb' : '#e5e7eb'),
                        boxShadow: passwordsMismatch ? '0 0 0 2px #ef444420' : 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`mt-1 text-xs ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                      {passwordsMatch ? t('reset_password_page.passwords_match') : t('reset_password_page.passwords_no_match')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitStatus === 'loading' || !passwordValidation.isValid}
                  className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  style={{ backgroundColor: '#168F6F' }}
                >
                  {submitStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('reset_password_page.btn_resetting')}
                    </>
                  ) : (
                    t('reset_password_page.btn_reset')
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── SUCCESS ── */}
          {submitStatus === 'success' && (
            <div className="text-center py-4">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative w-14 h-14">
                  <Image
                    src="/images/logo/logo_2.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>

              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password_page.success_title')}</h2>
              <p className="text-gray-500 text-sm mb-8">
                {t('reset_password_page.success_desc')}
              </p>
              <button
                onClick={() => router.push('/signin')}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: '#168F6F' }}
              >
                {t('reset_password_page.btn_signin_now')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            {t('reset_password_page.footer_help')}{' '}
            <a
              href="mailto:support@imknow.com"
              className="hover:underline"
              style={{ color: '#168F6F' }}
            >
              {t('reset_password_page.footer_contact')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
