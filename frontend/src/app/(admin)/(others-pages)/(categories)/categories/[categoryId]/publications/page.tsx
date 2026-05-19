// app/(admin)/(categories)/[categoryId]/page.tsx
'use client';

import { getToken } from '../../../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, TrendingUp, Clock, Eye } from 'lucide-react';
import PublicationCard from '@/components/publication/PublicationCard';

interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
}

export default function CategoryPublicationsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;
  
  const [category, setCategory] = useState<Category | null>(null);
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Récupérer l'ID utilisateur depuis le token
  const getUserIdFromToken = () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      return decoded.sub || decoded.id || decoded.userId || null;
    } catch {
      const userIdFromStorage = localStorage.getItem('userId');
      return userIdFromStorage ? parseInt(userIdFromStorage) : null;
    }
  };

  useEffect(() => {
    const token = getToken();
    const userIdFromToken = getUserIdFromToken();
    
    if (token && userIdFromToken) {
      setIsAuthenticated(true);
      setCurrentUserId(userIdFromToken);
    } else {
      const userIdFromStorage = localStorage.getItem('userId');
      if (userIdFromStorage) {
        setIsAuthenticated(true);
        setCurrentUserId(parseInt(userIdFromStorage));
      } else {
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    }
  }, []);

  useEffect(() => {
    loadCategoryAndPublications();
  }, [categoryId, sortBy]);

  const loadCategoryAndPublications = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      // Charger les infos de la catégorie
      const categoryResponse = await fetch(`${API_URL}/api/categories/${categoryId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!categoryResponse.ok) {
        throw new Error('Catégorie introuvable');
      }

      const categoryData = await categoryResponse.json();
      setCategory(categoryData);

      // Charger tous les publications
      const publicationsResponse = await fetch(`${API_URL}/api/publications`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!publicationsResponse.ok) {
        throw new Error('Erreur lors du chargement des publications');
      }

      const allPublications = await publicationsResponse.json();

      // Filtrer par catégorie et par statut publié
      let filteredPublications = allPublications.filter(
        (publication: any) => 
          publication.category?.id === parseInt(categoryId) && 
          publication.status === 'published'
      );

      // Transformer les publications pour PublicationCard
      const formatted = filteredPublications.map((publication: any) => ({
        id: String(publication.id),
        title: publication.title,
        description: publication.description || publication.content?.substring(0, 150) + '...' || '',
        content: publication.content,
        author: publication.author || {
          id: 0,
          name: 'Utilisateur',
          initials: 'U',
          department: 'Membre',
          avatar: null,
        },
        category: publication.category || { 
          name: categoryData.name, 
          slug: categoryData.slug 
        },
        tags: publication.tags || [],
        publishedAt: publication.createdAt,
        status: publication.status || 'published',
        stats: publication.stats || { 
          likes: 0, 
          comments: 0, 
          views: 0 
        },
        isLiked: publication.isLiked || false,
        isBookmarked: publication.isBookmarked || false,
        isFeatured: false,
      }));

      // Trier selon le critère sélectionné
      switch (sortBy) {
        case 'popular':
          formatted.sort((a: any, b: any) => b.stats.likes - a.stats.likes);
          break;
        case 'views':
          formatted.sort((a: any, b: any) => b.stats.views - a.stats.views);
          break;
        case 'recent':
        default:
          formatted.sort((a: any, b: any) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
      }

      setPublications(formatted);
    } catch (err: any) {
      console.error('Error loading category publications:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string) => {
    const token = getToken();
    if (!token) {
      toast.info('Veuillez vous connecter pour liker un publication');
      return;
    }

    try {
      const publication = publications.find(a => a.id === id);
      if (!publication) return;

      const newIsLiked = !publication.isLiked;
      
      // Optimistic update
      setPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return {
            ...publication,
            isLiked: newIsLiked,
            stats: {
              ...publication.stats,
              likes: publication.stats.likes + (newIsLiked ? 1 : -1)
            }
          };
        }
        return publication;
      }));

      const response = await fetch(`${API_URL}/api/publications/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du like');
      }

      const result = await response.json();
      console.log('✅ Like response:', result);
      
    } catch (err) {
      console.error('Erreur like:', err);
      toast.error('Erreur lors du like');
      await loadCategoryAndPublications();
    }
  };

  const handleBookmark = async (id: string) => {
    const token = getToken();
    if (!token) {
      toast.info('Veuillez vous connecter pour sauvegarder un publication');
      return;
    }

    try {
      const publication = publications.find(a => a.id === id);
      if (!publication) return;

      const newIsBookmarked = !publication.isBookmarked;
      
      setPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return {
            ...publication,
            isBookmarked: newIsBookmarked
          };
        }
        return publication;
      }));

      const response = await fetch(`${API_URL}/api/publications/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du bookmark');
      }

      const result = await response.json();
      console.log('✅ Bookmark response:', result);
      
    } catch (err) {
      console.error('Erreur bookmark:', err);
      toast.error('Erreur lors du bookmark');
      await loadCategoryAndPublications();
    }
  };

  const handleShare = (id: string) => {
    const publication = publications.find(a => a.id === id);
    if (!publication) return;
    
    const url = `${window.location.origin}/publications/${id}`;
    if (navigator.share) {
      navigator.share({
        title: publication.title,
        text: publication.description,
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast.success('Lien copié !');
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié !');
    }
  };

  const getSortIcon = (type: typeof sortBy) => {
    if (sortBy !== type) return null;
    switch (type) {
      case 'recent': return <Clock className="w-4 h-4" />;
      case 'popular': return <TrendingUp className="w-4 h-4" />;
      case 'views': return <Eye className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement des publications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Erreur</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Retour
            </button>
            <button
              onClick={loadCategoryAndPublications}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Header avec retour */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {category?.name || 'Catégorie'}
              </h1>
              {category?.description && (
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  {category.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {publications.length} publication{publications.length > 1 ? 's' : ''}
                </span>
                {!isAuthenticated && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    Connectez-vous pour interagir
                  </span>
                )}
              </div>
            </div>

            {/* Filtres de tri */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                Trier par:
              </span>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'recent'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Récents</span>
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'popular'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Populaires</span>
                </button>
                <button
                  onClick={() => setSortBy('views')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'views'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Vues</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des publications */}
        {publications.length > 0 ? (
          <div className="space-y-6">
            {publications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onShare={handleShare}
                showActions={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun publication dans cette catégorie
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Cette catégorie ne contient pas encore d'publications.
            </p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Retour aux catégories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}