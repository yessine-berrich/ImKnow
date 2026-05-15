// components/settings/SecurityTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Key, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, Lock, Send, Monitor } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import DeleteAccountButton from './DeleteAccountButton';
import { userService } from '../../../services/user.service';
import SessionsTab from './SessionsTab';

interface SecurityTabProps {
  security: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    twoFactorEnabled: boolean;
  };
  onPasswordChange: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  onTwoFactorToggle: () => void;
  userId: string;
  user?: {
    email: string;
    isGoogleAccount?: boolean;
    firstName?: string;
    lastName?: string;
  };
}

export default function SecurityTab({ 
  security, 
  onPasswordChange, 
  onTwoFactorToggle, 
  userId,
  user
}: SecurityTabProps) {
  const { t } = useTranslation();
  
  // Password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  
  const [localSecurity, setLocalSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Check if user is a Google account
  const isGoogleAccount = user?.isGoogleAccount || false;

  useEffect(() => {
    setLocalSecurity({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setError('');
    setSuccess(false);
  }, [security]);

  useEffect(() => {
    setPasswordStrength({
      length: localSecurity.newPassword.length >= 8,
      uppercase: /[A-Z]/.test(localSecurity.newPassword),
      lowercase: /[a-z]/.test(localSecurity.newPassword),
      number: /[0-9]/.test(localSecurity.newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(localSecurity.newPassword),
    });
  }, [localSecurity.newPassword]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  const handleChange = (field: string, value: string) => {
    setLocalSecurity(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess(false);
  };

  const handlePasswordSubmit = async () => {
    // Prevent password change for Google accounts
    if (isGoogleAccount) {
      setError(t('security.cannot_change_google_password'));
      return;
    }

    setError('');

    if (!localSecurity.currentPassword) {
      setError(t('security.current_password_required'));
      return;
    }

    if (!localSecurity.newPassword) {
      setError(t('security.new_password_required'));
      return;
    }

    if (!isPasswordValid) {
      setError(t('security.password_criteria_not_met'));
      return;
    }

    if (localSecurity.newPassword !== localSecurity.confirmPassword) {
      setError(t('security.passwords_do_not_match'));
      return;
    }

    if (localSecurity.currentPassword === localSecurity.newPassword) {
      setError(t('security.password_same_as_old'));
      return;
    }

    setIsSubmitting(true);

    try {
      await userService.changePassword(
        parseInt(userId),
        localSecurity.currentPassword,
        localSecurity.newPassword
      );

      setSuccess(true);
      
      onPasswordChange({
        currentPassword: localSecurity.currentPassword,
        newPassword: localSecurity.newPassword,
        confirmPassword: localSecurity.confirmPassword,
      });

      setLocalSecurity({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || t('security.password_change_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailError('');
    
    if (!newEmail) {
      setEmailError(t('security.new_email_required'));
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(t('security.invalid_email'));
      return;
    }
    
    if (newEmail === user?.email) {
      setEmailError(t('security.email_same_as_current'));
      return;
    }
    
    setIsEmailSubmitting(true);
    
    try {
      await userService.requestEmailChange(newEmail);
      
      setEmailConfirmationSent(true);
      setEmailSuccess(true);
      setNewEmail('');
      
      setTimeout(() => {
        setEmailSuccess(false);
        setEmailConfirmationSent(false);
      }, 5000);
      
    } catch (error: any) {
      console.error('Error changing email:', error);
      setEmailError(error.message || t('security.email_change_error'));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Active Sessions */}
      <SessionsTab />

      {/* Section 2: Email Change */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('security.change_email')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('security.change_email_description')}
        </p>

        {emailConfirmationSent && (
          <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#168F6F10', borderColor: '#168F6F', borderWidth: 1 }}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#168F6F' }} />
            <div>
              <h3 className="font-medium" style={{ color: '#168F6F' }}>
                {t('security.email_confirmation_sent')}
              </h3>
              <p className="text-sm mt-1" style={{ color: '#168F6FCC' }}>
                {t('security.check_your_email')}
              </p>
            </div>
          </div>
        )}

        {emailError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">
                {t('common.error')}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {emailError}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('security.current_email')}
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('security.new_email')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isEmailSubmitting}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                style={{ focusRingColor: '#168F6F' }}
                placeholder={t('security.enter_new_email')}
              />
            </div>
          </div>

          <button
            onClick={handleEmailChange}
            disabled={isEmailSubmitting || !newEmail}
            className="px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: '#168F6F' }}
          >
            {isEmailSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isEmailSubmitting ? t('security.sending') : t('security.send_confirmation')}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            {t('security.email_change_info')}
          </p>
        </div>
      </div>

      {/* Section 3: Password Change */}
      {!isGoogleAccount ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.password_title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('security.password_description')}
          </p>

          {success && (
            <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#168F6F10', borderColor: '#168F6F', borderWidth: 1 }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#168F6F' }} />
              <div>
                <h3 className="font-medium" style={{ color: '#168F6F' }}>
                  {t('security.password_changed_success')}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#168F6FCC' }}>
                  {t('security.password_updated_message')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 dark:text-red-100">
                  {t('common.error')}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.current_password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={localSecurity.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  style={{ focusRingColor: '#168F6F' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.new_password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={localSecurity.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  style={{ focusRingColor: '#168F6F' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {localSecurity.newPassword && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('security.password_criteria')}
                  </p>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${passwordStrength.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.length ? 'bg-green-600' : 'bg-gray-300'}`} />
                      {t('security.criteria_min_length')}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordStrength.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.uppercase ? 'bg-green-600' : 'bg-gray-300'}`} />
                      {t('security.criteria_uppercase')}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordStrength.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.lowercase ? 'bg-green-600' : 'bg-gray-300'}`} />
                      {t('security.criteria_lowercase')}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordStrength.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.number ? 'bg-green-600' : 'bg-gray-300'}`} />
                      {t('security.criteria_number')}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordStrength.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.special ? 'bg-green-600' : 'bg-gray-300'}`} />
                      {t('security.criteria_special')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.confirm_password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={localSecurity.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  style={{ focusRingColor: '#168F6F' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {localSecurity.confirmPassword && localSecurity.newPassword !== localSecurity.confirmPassword && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t('security.passwords_do_not_match')}
                </p>
              )}
            </div>

            <button
              onClick={handlePasswordSubmit}
              disabled={isSubmitting || !isPasswordValid || localSecurity.newPassword !== localSecurity.confirmPassword}
              className="px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: '#168F6F' }}
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isSubmitting ? t('security.changing') : t('security.update_password')}
            </button>
          </div>
        </div>
      ) : (
        /* Google Account Info Message for Password Section */
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.password_title')}
            </h3>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('security.google_account_info')}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {t('security.password_managed_by_google')}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                  {t('security.change_password_google_instruction', { email: user?.email || '' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Delete Account */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('security.delete_account')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('security.delete_account_warning')}
        </p>
        <DeleteAccountButton
          isGoogleAccount={isGoogleAccount}
          userEmail={user?.email || ''}
        />
      </div>
    </div>
  );
}