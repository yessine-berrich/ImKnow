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
import { articleService } from '../../../../../../services/article.service';

interface Category {
  id: string;
  name: string;
  description: string;
  articleCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
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
        console.log('👤 Rôle utilisateur sur CategoriesPage:', payload.role);

        // 🔴 Redirection vers 403 si EMPLOYEE
        if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
          console.log('⛔ Accès refusé - redirection vers 403');
          router.push('/error-403');
          return;
        }

        setIsCheckingRole(false);
        loadCategories();
      } catch (err) {
        console.error('❌ Erreur de vérification du rôle:', err);
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
      
      // Récupérer tous les articles pour compter par catégorie
      let articlesByCategory: Record<number, number> = {};
      try {
        const articles = await articleService.findAll();
        articlesByCategory = articles.reduce((acc, article) => {
          if (article.category?.id) {
            acc[article.category.id] = (acc[article.category.id] || 0) + 1;
          }
          return acc;
        }, {} as Record<number, number>);
      } catch (err) {
        console.error('Erreur chargement articles:', err);
      }

      // Transformer pour le frontend
      const frontendCategories: Category[] = apiCategories.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        description: cat.description || '',
        articleCount: articlesByCategory[cat.id] || 0,
      }));

      setCategories(frontendCategories);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError('Impossible de charger les catégories');
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
      toast.success('Catégorie modifiée avec succès');
    } else {
      await categoryService.create(categoryData);
      toast.success('Catégorie créée avec succès');
    }

    await loadCategories();
    handleCloseModal();
  };

  const handleDeleteCategory = async (id: string | number) => {
    const category = categories.find(cat => cat.id === id);
    if (!category) return;

    const message = category.articleCount > 0
      ? `Êtes-vous sûr de vouloir supprimer "${category.name}" ? Cette catégorie contient ${category.articleCount} article(s).`
      : `Êtes-vous sûr de vouloir supprimer "${category.name}" ?`;

    if (await confirm(message)) {
      try {
        await categoryService.delete(Number(id));
        await loadCategories();
        toast.success('Catégorie supprimée avec succès');
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de la catégorie';
        toast.error(errMessage);
      }
    }
  };

  const handleEditCategory = (category: { id: string | number; name: string; description: string }) => {
    setEditingCategory({
      ...category,
      id: category.id.toString(),
      articleCount: 0,
    });
    setIsCreateModalOpen(true);
  };

  const handleViewArticles = (categoryId: string | number) => {
    window.location.href = `/articles?category=${categoryId}`;
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
            Vérification des accès...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez patienter
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
          <p className="text-gray-600 dark:text-gray-400">Chargement des catégories...</p>
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
            Réessayer
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
            Catégories
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organisez vos articles par thème et facilitez la navigation
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