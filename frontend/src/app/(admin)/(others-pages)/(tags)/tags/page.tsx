// app/(admin)/(others-pages)/(tags)/tags/page.tsx
'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CreateTagModal from '@/components/modals/CreateTagModal';
import EditTagModal from '@/components/modals/EditTagModal';
import { confirm } from '@/components/modals/ConfirmModal';
import TagsManager from '@/components/tags/tagsManager';
import { toast } from '@/components/modals/ToastContainer';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface TagItem {
  id: string;
  name: string;
  count: number;
  trending?: boolean;
  color?: string;
}

const API_URL = "http://localhost:3000/api/tags";

export default function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [viewMode, setViewMode] = useState<'cloud' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ✅ 1. VÉRIFICATION DU RÔLE - Redirection vers /error-403 si pas ADMIN
  useEffect(() => {
    const checkUserRole = () => {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
          router.push('/error-403');
          return;
        }

        setIsCheckingRole(false);
        fetchTags();
      } catch (err) {
        router.push('/login');
      }
    };

    checkUserRole();
  }, [router]);

  // Charger les tags depuis le serveur
  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getToken();
      
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 🔴 GESTION DES ERREURS 403
      if (response.status === 403) {
        router.push('/error-403');
        return;
      }

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) throw new Error('load_error');
      
      const data = await response.json();
      
      // Adaptation des données NestJS -> Format TagItem
      const formattedTags: TagItem[] = data.map((tag: any) => {
        const count = tag.count ?? (tag.publications ? tag.publications.length : 0);
        return {
          id: tag.id.toString(),
          name: tag.name,
          count,
          trending: count > 5,
          color: 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] border border-[#168F6F]/20',
        };
      });
      
      setTags(formattedTags);
    } catch (error) {
      setError(t('tags_page.load_error_desc'));
      toast.error(t('tags_page.load_error_desc'));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Créer un tag (POST)
  const handleCreateTag = async (tagName: string): Promise<void> => {
    const token = getToken();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: tagName }),
    });

    if (response.status === 403) {
      router.push('/error-403');
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = Array.isArray(errorData.message)
        ? errorData.message[0]
        : (errorData.message || t('tags_page.modal_create_error'));
      throw new Error(message);
    }

    toast.success(t('tags_page.toast_created'));
    fetchTags();
  };

  // ✅ NOUVELLE FONCTION : Modifier un tag (PATCH)
  const handleEditTag = (tag: TagItem) => {
    setSelectedTag(tag);
    setIsEditModalOpen(true);
  };

  // ✅ NOUVELLE FONCTION : Mettre à jour un tag
  const handleUpdateTag = async (tagId: string, newName: string): Promise<void> => {
    const token = getToken();

    const response = await fetch(`${API_URL}/${tagId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newName }),
    });

    if (response.status === 403) {
      router.push('/error-403');
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = Array.isArray(errorData.message)
        ? errorData.message[0]
        : (errorData.message || t('tags_page.modal_edit_error'));
      throw new Error(message);
    }

    toast.success(t('tags_page.toast_updated'));
    fetchTags();
    setIsEditModalOpen(false);
    setSelectedTag(null);
  };

  // Supprimer un tag (DELETE)
  const handleDeleteTag = async (id: string) => {
    const token = getToken();
    
    if (await confirm(t('tags_page.delete_confirm'))) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (response.status === 403) {
          router.push('/error-403');
          return;
        }

        if (!response.ok) throw new Error('delete_failed');

        setTags(prev => prev.filter(tag => tag.id !== id));
        toast.success(t('tags_page.toast_deleted'));
      } catch (error: any) {
        toast.error(t('tags_page.toast_error'));
      }
    }
  };

  // ✅ 2. GESTION DES ÉTATS DE CHARGEMENT

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('tags_page.checking_role')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('tags_page.please_wait')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#168F6F] mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('tags_page.loading')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('tags_page.db_connecting')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            {t('tags_page.load_error')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchTags();
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('tags_page.retry')}
          </button>
        </div>
      </div>
    );
  }

  // ✅ 3. RENDU NORMAL (pour ADMIN uniquement)
  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('tags_page.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('tags_page.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2">
              <span className="font-medium text-gray-900 dark:text-white">{tags.length}</span> tags
              <span className="mx-2">•</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {tags.filter(tag => tag.trending).length}
              </span> {t('tags_page.trending_label')}
            </div>
          </div>
        </div>

        {/* Tags Manager Component - AVEC onEditTag */}
        <TagsManager
          tags={tags}
          onDeleteTag={handleDeleteTag}
          onEditTag={handleEditTag} // ✅ Prop ajoutée
          onSearch={() => {}} // Géré en interne par TagsManager
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateTagClick={() => setIsCreateModalOpen(true)}
        />
      </div>

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTag={handleCreateTag}
      />

      {/* Edit Tag Modal - À créer si nécessaire */}
      {selectedTag && (
        <EditTagModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTag(null);
          }}
          tag={selectedTag}
          onUpdateTag={handleUpdateTag}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}