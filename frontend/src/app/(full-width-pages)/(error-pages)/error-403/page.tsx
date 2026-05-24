'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '../../../../context/LanguageContext';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f3f0] to-[#d4ebe5] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-16 relative">
            <Image
              src="/images/logo/logo_2_dark.png"
              alt="ImKnow Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="w-24 h-24 bg-[#168F6F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-12 w-12 text-[#168F6F]" />
        </div>
        
        <h1 className="text-5xl font-bold text-[#168F6F] mb-2">{t('error_403.title_403')}</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
          {t('error_403.heading')}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {t('error_403.description')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          {t('error_403.description_help')}
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-3 bg-[#168F6F] text-white rounded-xl hover:bg-[#0F6B54] transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg"
          >
            <ArrowLeft size={18} />
            {t('error_403.btn_previous')}
          </button>
          
          <button
            onClick={() => router.push('/home')}
            className="w-full px-6 py-3 bg-white dark:bg-gray-800 text-[#168F6F] rounded-xl border-2 border-[#168F6F] hover:bg-[#168F6F] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg"
          >
            <Home size={18} />
            {t('error_403.btn_home')}
          </button>
        </div>
      </div>
    </div>
  );
}