// app/(admin)/(others-pages)/(categories)/categories/page.tsx
'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import CreateCategoryModal from '@/components/modals/CreateCategoryModal';
import { confirm } from '@/components/modals/ConfirmModal';
import CategoriesManager from '@/components/categories/CategoriesManager';
import { categoryService, Category as ApiCategory } from '../../../../../../services/category.service';
import { toast } from '@/components/modals/ToastContainer';
import { publicationService } from '../../../../../../services/publication.service';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface Category {
  id: string;
  name: string;
  description: string;
  publicationCount: number;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        loadCategories();
      } catch (err) {
        router.push('/login');
      }
    };

    checkUserRole();
  }, [router]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();

      // Récupérer les catégories
      const apiCategories = await categoryService.findAll();
      
      // Récupérer tous les publications pour compter par catégorie
      let publicationsByCategory: Record<number, number> = {};
      try {
        const publications = await publicationService.findAll();
        publicationsByCategory = publications.reduce((acc, publication) => {
          if (publication.category?.id) {
            acc[publication.category.id] = (acc[publication.category.id] || 0) + 1;
          }
          return acc;
        }, {} as Record<number, number>);
      } catch (err) {
        // ignore publication count errors
      }

      // Transformer pour le frontend
      const frontendCategories: Category[] = apiCategories.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        description: cat.description || '',
        publicationCount: publicationsByCategory[cat.id] || 0,
      }));

      setCategories(frontendCategories);
    } catch (err) {
      setError(t('categories_page.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData: {
    name: string;
    description: string;
  }) => {
    if (editingCategory) {
      await categoryService.update(Number(editingCategory.id), categoryData);
      toast.success(t('categories_page.toast_updated'));
    } else {
      await categoryService.create(categoryData);
      toast.success(t('categories_page.toast_created'));
    }

    await loadCategories();
    handleCloseModal();
  };

  const handleDeleteCategory = async (id: string | number) => {
    const category = categories.find(cat => cat.id === id);
    if (!category) return;

    const message = category.publicationCount > 0
      ? t('categories_page.delete_confirm_with_count', { name: category.name, count: category.publicationCount })
      : t('categories_page.delete_confirm', { name: category.name });

    if (await confirm(message)) {
      try {
        await categoryService.delete(Number(id));
        await loadCategories();
        toast.success(t('categories_page.toast_deleted'));
      } catch (err) {
        const errMessage = translateError(err instanceof Error ? err.message : undefined, t) || t('categories_page.toast_delete_error');
        toast.error(errMessage);
      }
    }
  };

  const handleEditCategory = (category: { id: string | number; name: string; description: string }) => {
    setEditingCategory({
      ...category,
      id: category.id.toString(),
      publicationCount: 0,
    });
    setIsCreateModalOpen(true);
  };

  const handleViewPublications = (categoryId: string | number) => {
    window.location.href = `/publications?category=${categoryId}`;
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
  };

  // ✅ 2. GESTION DES ÉTATS DE CHARGEMENT

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('categories_page.checking_role')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('categories_page.please_wait')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-[#168F6F] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('categories_page.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadCategories}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t('categories_page.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('categories_page.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('categories_page.subtitle')}
          </p>
        </div>

        {/* Categories Manager */}
        <CategoriesManager
          categories={categories}
          onCreateClick={() => setIsCreateModalOpen(true)}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      {/* Create/Edit Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onCreateCategory={handleCreateCategory}
        editCategory={editingCategory ? {
          id: editingCategory.id,
          name: editingCategory.name,
          description: editingCategory.description
        } : null}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
