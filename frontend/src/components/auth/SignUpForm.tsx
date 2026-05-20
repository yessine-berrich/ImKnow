"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "../../../services/auth.service";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { motion } from "framer-motion";
import { useTranslation } from '@/context/LanguageContext';

// Animation variants
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

// Password validation function
interface PasswordValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

const validatePassword = (password: string): PasswordValidation => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
  };
};

export default function SignUpForm() {
  const router = useRouter();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isValid: false,
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      setError(t('signup_form.error_pw_invalid'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signup(formData);
      // Redirect to sign-in with a success indicator so the page can show a
      // "Check your email to verify your account" message.
      router.push('/signin?success=account-created');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup_form.error_generic'),
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
          {t('signup_form.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('signup_form.subtitle')}
        </p>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
        >
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </motion.div>
      )}

      {/* Google button */}
      <motion.div variants={itemVariants} className="mb-5">
        <GoogleLoginButton
          text="Sign up with Google"
          onError={(errorMsg) => setError(errorMsg)}
        />
      </motion.div>

      {/* Divider */}
      <motion.div variants={itemVariants} className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">
            {t('signup_form.divider')}
          </span>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* First / Last name */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Label>
                {t('signup_form.label_first_name')} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                name="firstName"
                placeholder={t('signup_form.placeholder_first_name')}
                value={formData.firstName}
                onChange={handleChange}
                required
                className="transition-all duration-300 focus:scale-[1.02]"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Label>
                {t('signup_form.label_last_name')} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                name="lastName"
                placeholder={t('signup_form.placeholder_last_name')}
                value={formData.lastName}
                onChange={handleChange}
                required
                className="transition-all duration-300 focus:scale-[1.02]"
              />
            </motion.div>
          </div>

          {/* Email */}
          <motion.div variants={itemVariants}>
            <Label>
              {t('signup_form.label_email')} <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              name="email"
              placeholder={t('signup_form.placeholder_email')}
              value={formData.email}
              onChange={handleChange}
              required
              className="transition-all duration-300 focus:scale-[1.02]"
            />
          </motion.div>

          {/* Password with validation */}
          <motion.div variants={itemVariants}>
            <Label>
              {t('signup_form.label_password')} <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                name="password"
                placeholder={t('signup_form.placeholder_password')}
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                required
                className={`transition-all duration-300 focus:scale-[1.02] ${
                  formData.password && !passwordValidation.isValid && !isPasswordFocused
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
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
            
            {/* Password requirements list */}
            {(isPasswordFocused || (formData.password && !passwordValidation.isValid)) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs space-y-1.5"
              >
                <p className="text-gray-600 dark:text-gray-400 mb-1 font-medium">{t('signup_form.pw_must_contain')}</p>
                <div className={`flex items-center gap-2 ${passwordValidation.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className="text-sm">{passwordValidation.hasMinLength ? '✓' : '○'}</span>
                  <span>{t('signup_form.pw_min_length')}</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className="text-sm">{passwordValidation.hasUppercase ? '✓' : '○'}</span>
                  <span>{t('signup_form.pw_uppercase')}</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className="text-sm">{passwordValidation.hasLowercase ? '✓' : '○'}</span>
                  <span>{t('signup_form.pw_lowercase')}</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className="text-sm">{passwordValidation.hasNumber ? '✓' : '○'}</span>
                  <span>{t('signup_form.pw_number')}</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className="text-sm">{passwordValidation.hasSpecialChar ? '✓' : '○'}</span>
                  <span>{t('signup_form.pw_special')}</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants}>
            <Button
              className="w-full !bg-gradient-to-r !from-[#168F6F] !to-[#1AA886] hover:!from-[#0F6B54] hover:!to-[#168F6F] !border-none !text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#168F6F]/30"
              type="submit"
              disabled={isLoading || !passwordValidation.isValid}
            >
              {isLoading ? (
                <div className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('signup_form.btn_creating')}
                </div>
              ) : (
                t('signup_form.btn_sign_up')
              )}
            </Button>
          </motion.div>
        </div>
      </form>

      {/* Sign in link */}
      {/* <motion.p variants={itemVariants} className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="text-[#168F6F] hover:text-[#0F6B54] dark:text-[#1AA886] font-medium transition-all duration-300 hover:underline"
        >
          Sign In
        </Link>
      </motion.p> */}
    </motion.div>
  );
}