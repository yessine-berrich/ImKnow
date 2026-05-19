// app/(admin)/(others-pages)/publications/rejected/duplicates/page.tsx
'use client';

import { getToken } from '../../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DuplicatesTable from '@/components/tables/DuplicatesTable';

export interface DuplicatePublication {
  id: number;
  title: string;
  content: string;
  rejectionReason: string;
  moderationScore: number | null;
  moderationResult: string | null;
  duplicateScore: number;
  similarPublicationsCache: {
    id: number;
    score: number;
    title: string;
    createdAt: string;
  }[];
  author: {
    id: number;
    name: string;
    email: string;
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

export default function DuplicatePublicationsPage() {
  const [publications, setPublications] = useState<DuplicatePublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
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
    if (!isCheckingRole) {
      fetchPublications();
    }
  }, [isCheckingRole]);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      const response = await fetch('http://localhost:3000/api/publications/rejected/duplicates', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 403) { router.push('/error-403'); return; }
      if (response.status === 401) { localStorage.removeItem('auth_token'); router.push('/login'); return; }
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setPublications(data.publications || []);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des publications');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Vérification des accès...</h3>
          <p className="text-gray-600 dark:text-gray-400">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chargement des publications...</h3>
          <p className="text-gray-600 dark:text-gray-400">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error && publications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Erreur de chargement</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchPublications}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <RefreshCw size={18} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <DuplicatesTable
        publications={publications}
        onRefresh={fetchPublications}
        title="Publications Rejetés — Doublons"
        description="Publications rejetés automatiquement en raison d'une similarité élevée avec des publications existants"
      />
    </div>
  );
}