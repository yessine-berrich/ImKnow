// app/(admin)/(others-pages)/publications/rejected/moderation/page.tsx
'use client';

import { getToken } from '../../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ModerationTable from '@/components/tables/ModerationTable';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

export interface ModerationPublication {
  id: number;
  title: string;
  content: string;
  rejectionReason: string;
  moderationScore: number;
  moderationResult: {
    model?: string;
    score?: number;
    reason?: string;
    isFlagged?: boolean;
    categories?: Record<string, boolean> | string[];
    confidence?: number;
    moderatedAt?: string;
  } | null;
  duplicateScore: number | null;
  similarPublicationsCache: any[] | null;
  author: {
    id: number;
    name: string;
    email: string;
    role?: string;
    profileImage?: string | null;
  } | null;
  category: {
    id: number;
    name: string;
  } | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ModerationRejectedPage() {
  const { t } = useTranslation();
  const [publications, setPublications] = useState<ModerationPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') { router.push('/error-403'); return; }
      setIsCheckingRole(false);
    } catch {
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!isCheckingRole) fetchPublications();
  }, [isCheckingRole]);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) throw new Error(t('rejected.not_authenticated'));

      const response = await fetch('http://localhost:3000/api/publications/rejected/moderation', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.status === 403) { router.push('/error-403'); return; }
      if (response.status === 401) { localStorage.removeItem('auth_token'); router.push('/login'); return; }
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setPublications(data.publications || []);
    } catch (err: any) {
      setError(translateError(err.message, t) || t('rejected.load_error'));
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingRole) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('rejected.checking_role')}</h3>
        <p className="text-gray-600 dark:text-gray-400">{t('rejected.please_wait')}</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('rejected.loading')}</h3>
        <p className="text-gray-600 dark:text-gray-400">{t('rejected.please_wait')}</p>
      </div>
    </div>
  );

  if (error && publications.length === 0) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('rejected.error_title')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <button onClick={fetchPublications} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium">
          <RefreshCw size={18} /> {t('rejected.retry')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <ModerationTable
        publications={publications}
        onRefresh={fetchPublications}
        title={t('rejected.mod_title')}
        description={t('rejected.mod_description')}
      />
    </div>
  );
}
