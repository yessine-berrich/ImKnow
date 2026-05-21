// app/(admin)/(others-pages)/(users)/users/page.tsx
'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UsersTable from '@/components/tables/UsersTable';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE';
  isEmailActive: boolean;
  status: 'actif' | 'inactif' | 'pending';
  createdAt: string;
  updatedAt: string;
  publications?: any[];
  _count?: {
    publications: number;
  };
}

export default function UsersPage() {
  const { t, language } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.sub);
      setCurrentUserRole(payload.role);

      if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
        router.push('/error-403');
        return;
      }

      setIsCheckingRole(false);
    } catch (err) {
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!isCheckingRole && currentUserId) {
      fetchUsers();
    }
  }, [isCheckingRole, currentUserId]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diffInMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffInMs / 60000);

    if (minutes < 1) return t('notifications.just_now');
    if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t(days > 1 ? 'tables.days_ago_plural' : 'tables.days_ago_one', { count: days });
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) throw new Error(t('users_page.not_authenticated'));

      const response = await fetch('http://localhost:3000/api/users?include=publications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 403) { router.push('/error-403'); return; }
      if (response.status === 401) { localStorage.removeItem('auth_token'); router.push('/login'); return; }
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);

      const data: User[] = await response.json();
      const otherUsers = data.filter(user => user.id !== currentUserId);

      const transformed = otherUsers.map((user) => {
        let userStatus: 'active' | 'inactive' | 'pending' | 'email_unverified';
        if (!user.isEmailActive) {
          userStatus = 'email_unverified';
        } else if (user.status === 'actif') {
          userStatus = 'active';
        } else if (user.status === 'inactif') {
          userStatus = 'inactive';
        } else {
          userStatus = 'pending';
        }

        const publicationCount = user.publications?.length || user._count?.publications || 0;

        return {
          id: user.id.toString(),
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || t('users_page.default_name'),
          email: user.email,
          avatar: user.profileImage,
          userId: user.id,
          role: user.role,
          status: userStatus,
          publications: publicationCount,
          joinedAt: new Date(user.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
            month: 'short',
            year: 'numeric',
          }),
          lastActive: user.updatedAt ? getTimeAgo(user.updatedAt) : t('users_page.never'),
        };
      });

      setUsers(transformed);
    } catch (err: any) {
      setError(translateError(err.message, t) || t('users_page.error_title'));
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('users_page.loading')}</h3>
        <p className="text-gray-600 dark:text-gray-400">{t('rejected.please_wait')}</p>
      </div>
    </div>
  );

  if (error && users.length === 0) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('users_page.error_title')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <button onClick={fetchUsers} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium">
          <RefreshCw size={18} /> {t('rejected.retry')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <UsersTable
        users={users}
        onRefresh={fetchUsers}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        title={t('users_page.title')}
        description={t('users_page.description')}
      />
    </div>
  );
}
