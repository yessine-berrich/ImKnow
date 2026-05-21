'use client';
import Checkbox from '@/components/form/input/Checkbox';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from '@/icons';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, decodeToken } from '../../../services/auth.service';
import { useUser } from '@/context/UserContext';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

// Variants d'animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUser();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedBanner, setVerifiedBanner] = useState(false);
  const [signupBanner, setSignupBanner] = useState(false);
  const [deletedBanner, setDeletedBanner] = useState(false);

  useEffect(() => {
    if (searchParams?.get('verified') === 'true') {
      setVerifiedBanner(true);
      const t = setTimeout(() => setVerifiedBanner(false), 6000);
      return () => clearTimeout(t);
    }
    if (searchParams?.get('success') === 'account-created') {
      setSignupBanner(true);
    }
    if (searchParams?.get('deleted') === 'true') {
      setDeletedBanner(true);
    }
  }, [searchParams]);
  const [isChecked, setIsChecked] = useState(false);

  // ── Error classification ──────────────────────────────────────────────────
  const isLockError =
    !!error &&
    (error.toLowerCase().includes('bloqué') ||
      error.toLowerCase().includes('trop de tentatives') ||
      error.toLowerCase().includes('compte temporairement') ||
      error.toLowerCase().includes('locked') ||
      error.toLowerCase().includes('too many attempts'));

  const isAttemptWarning =
    !!error &&
    !isLockError &&
    (error.toLowerCase().includes('tentative') ||
      error.toLowerCase().includes('restante') ||
      error.toLowerCase().includes('attempt') ||
      error.toLowerCase().includes('remaining'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email, password, isChecked);

      if (response.accessToken) {
        // Token is already stored by login(); now populate the global auth
        // context BEFORE navigating so every component sees the user instantly.
        await refreshUser();
        router.push('/home');
      } else if (response.message) {
        // 200 OK but with an info message (e.g. "verify your email")
        setError(response.message);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred during sign in.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col w-full"
    >
      {/* Title */}
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
          {t('signin_form.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('signin_form.subtitle')}
        </p>
      </motion.div>

      {/* ── Account deleted success banner ── */}
      {deletedBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 mb-4 text-sm rounded-xl flex items-start gap-2 border border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400"
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>
            {t('signin_form.deleted_banner')}
          </span>
        </motion.div>
      )}

      {/* ── Account created — check email banner ── */}
      {signupBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 mb-4 text-sm rounded-xl flex items-start gap-2 border"
          style={{
            backgroundColor: '#168F6F15',
            borderColor: '#168F6F40',
            color: '#0e6b52',
          }}
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          <span>
            {t('signin_form.signup_banner')}
          </span>
        </motion.div>
      )}

      {/* ── Email verified success banner ── */}
      {verifiedBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 mb-4 text-sm rounded-xl flex items-start gap-2 border"
          style={{
            backgroundColor: '#168F6F15',
            borderColor: '#168F6F40',
            color: '#0e6b52',
          }}
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            {t('signin_form.verified_banner')}
          </span>
        </motion.div>
      )}

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-3 mb-4 text-sm rounded-xl flex items-start gap-2 ${
            isLockError
              ? "text-red-700 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400"
              : isAttemptWarning
              ? "text-orange-700 bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400"
              : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
          }`}
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            {isLockError ? (
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            )}
          </svg>
          <span>{translateError(error, t)}</span>
        </motion.div>
      )}

      {/* Google button */}
      <motion.div variants={itemVariants} className="mb-5">
        <GoogleLoginButton
          text="Sign in with Google"
          onError={(errorMsg) => setError(errorMsg)}
        />
      </motion.div>

      {/* Divider */}
      <motion.div variants={itemVariants} className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">
            {t('signin_form.divider')}
          </span>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Email */}
          <motion.div variants={itemVariants}>
            <Label>
              {t('signin_form.label_email')} <span className="text-error-500">*</span>
            </Label>
            <Input
              placeholder="info@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="transition-all duration-300 focus:scale-[1.02]"
            />
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants}>
            <Label>
              {t('signin_form.label_password')} <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t('signin_form.placeholder_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.02]"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
          </motion.div>

          {/* Remember me + Forgot */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('signin_form.keep_logged_in')}
              </span>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-[#168F6F] hover:text-[#0F6B54] dark:text-[#1AA886] transition-all duration-300 hover:underline"
            >
              {t('signin_form.forgot_password')}
            </Link>
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants}>
            <Button
              className="w-full !bg-gradient-to-r !from-[#168F6F] !to-[#1AA886] hover:!from-[#0F6B54] hover:!to-[#168F6F] !border-none !text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#168F6F]/30"
              size="sm"
              type="submit"
              disabled={isLoading || isLockError}
            >
              {isLoading ? (
                <div className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('signin_form.btn_connecting')}
                </div>
              ) : isLockError ? (
                t('signin_form.btn_locked')
              ) : (
                t('signin_form.btn_sign_in')
              )}
            </Button>
          </motion.div>
        </div>
      </form>

      {/* Sign up link */}
      {/* <motion.p variants={itemVariants} className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[#168F6F] hover:text-[#0F6B54] dark:text-[#1AA886] font-medium transition-all duration-300 hover:underline"
        >
          Sign Up
        </Link>
      </motion.p> */}
    </motion.div>
  );
}