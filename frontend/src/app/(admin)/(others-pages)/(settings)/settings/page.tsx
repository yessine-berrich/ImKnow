'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Palette } from 'lucide-react';
import ProfileTab from '@/components/settings/ProfileTab';
import SecurityTab from '@/components/settings/SecurityTab';
import AppearanceTab from '@/components/settings/AppearanceTab';
import { getToken } from '../../../../../../services/auth.service';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { t, language: currentLang, setLanguage } = useTranslation();
  const { user: userData, loading } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  const tabs = [
    { id: 'profile', label: t('profile.title'), icon: User },
    { id: 'security', label: t('security.title'), icon: Lock },
    { id: 'appearance', label: t('appearance.title'), icon: Palette },
  ] as const;

  // Sync language from user profile on first load
  useEffect(() => {
    if (userData?.language && userData.language !== currentLang) {
      setLanguage(userData.language as 'fr' | 'en');
    }
  }, [userData?.language]);

  const handleSaveProfile = (_updatedUser: any) => {
    // UserContext.updateUser() is called by ProfileTab directly; nothing to do here.
  };

  const handlePasswordChange = (passwordData: any) => {
    console.log('Password changed successfully');
  };

  const handleTwoFactorToggle = () => {
    setSecurity(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang as 'fr' | 'en');
    if (userData) {
      try {
        const token = getToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        await fetch(`${API_URL}/api/users/${userData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ language: lang }),
        });
      } catch (error) {
        console.error('Error updating language:', error);
      }
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    if (userData) {
      try {
        const token = getToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        await fetch(`${API_URL}/api/users/${userData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ timezone: tz }),
        });
      } catch (error) {
        console.error('Error updating timezone:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#168F6F', borderTopColor: 'transparent' }}></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('common.error_loading')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('common.unable_to_load')}
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 rounded-lg hover:opacity-90 transition-colors text-white"
            style={{ backgroundColor: '#168F6F' }}
          >
            {t('common.login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('common.settings')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('common.settings_description')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 mb-6">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <ProfileTab 
              currentProfile={{
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                phone: userData.phone || '',
                country: userData.country || '',
                city: userData.city || '',
                postalCode: userData.postalCode || '',
                bio: userData.bio || '',
                department: userData.department || '', 
                avatar: userData.profileImage,
              }}
              userId={userData.id}
              onSave={handleSaveProfile}
            />
          )}
          
          {activeTab === 'security' && (
            <SecurityTab 
              security={security}
              onPasswordChange={handlePasswordChange}
              onTwoFactorToggle={handleTwoFactorToggle}
              userId={userData.id}
              user={userData}
            />
          )}
          
          {activeTab === 'appearance' && (
            <AppearanceTab 
              language={userData.language || currentLang}
              timezone={userData.timezone || 'Europe/Paris'}
              onLanguageChange={handleLanguageChange}
              onTimezoneChange={handleTimezoneChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}