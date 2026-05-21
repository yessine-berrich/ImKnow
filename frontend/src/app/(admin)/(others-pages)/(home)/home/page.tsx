'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import PublicationCard from '@/components/publication/PublicationCard';
import TrendingPublications from '@/components/publication/Trendingpublications';
import TopContributors from '@/components/users/Topcontributors';
import PublicationDetailModal from '@/components/modals/PublicationDetailModal';
import { FileText, Loader2 } from 'lucide-react';
import CreatePublicationModal from '@/components/modals/CreatePublicationModal';
import { useSearchParams } from 'next/navigation';
import { fetchCurrentUser, isAuthenticated } from '../../../../../../services/auth.service';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { publicationService } from '../../../../../../services/publication.service';
import { useTranslation } from '@/context/LanguageContext';

interface Publication {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id?: number;
    name: string;
    initials: string;
    department?: string;
    avatar?: string | null;
  };
  category: {
    id?: number | string;
    name: string;
    slug?: string;
  };
  tags?: Array<string | { id?: number; name: string }>;
  publishedAt?: string;
  updatedAt?: string;
  status?: string;
  stats: {
    likes: number;
    comments: number;
    views: number;
    engagementRate?: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  media?: Array<{
    id: number;
    url: string;
    filename: string;
    mimetype: string;
    type: 'image' | 'video' | 'document';
    size: number | null;
  }>;
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#168F6F]" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingPublicationId, setEditingPublicationId] = useState<string | undefined>();

  const [selectedPublication, setSelectedPublication] = useState<any>(null);
  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);

  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const publicationIdFromUrl = searchParams.get('publication');
  const publicationRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!loading && publications.length > 0 && publicationIdFromUrl) {
      setTimeout(() => {
        const publicationElement = publicationRefs.current[publicationIdFromUrl];
        if (publicationElement) {
          publicationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          publicationElement.classList.add('highlight-publication');
          setTimeout(() => {
            publicationElement.classList.remove('highlight-publication');
          }, 2000);
        }
      }, 500);
    }
  }, [loading, publications, publicationIdFromUrl]);

  useEffect(() => {
    const loadUserAndPublications = async () => {
      try {
        const user = await fetchCurrentUser();
        const userId = user?.id;
        if (userId) setCurrentUserId(userId);
        await fetchPublications();
      } catch (error) {
        console.error('Error loading user or publications:', error);
      }
    };
    loadUserAndPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const response = await publicationService.getFeeds();

      const transformedPublications: Publication[] = response.data.map((publication: any) => ({
        id: publication.id.toString(),
        title: publication.title,
        description: publication.description || publication.content?.substring(0, 200) || '',
        content: publication.content,
        author: {
          id: publication.author?.id,
          name: publication.author?.name?.trim() || 'Unknown',
          initials: publication.author?.initials?.toUpperCase() || 'U',
          department: publication.author?.department || publication.author?.role || 'Membre',
          avatar: publication.author?.avatar || publication.author?.profileImage,
        },
        category: {
          id: publication.category?.id,
          name: publication.category?.name || 'Uncategorized',
          slug: publication.category?.slug || 'uncategorized',
        },
        tags: publication.tags || [],
        publishedAt: publication.createdAt,
        updatedAt: publication.updatedAt,
        status: publication.status,
        stats: {
          likes: publication.stats?.likes || 0,
          comments: publication.stats?.comments || 0,
          views: publication.stats?.views || 0,
        },
        isLiked: publication.isLiked || false,
        isBookmarked: publication.isBookmarked || false,
        media: publication.media || [],
      }));

      setPublications(transformedPublications);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('home.error_generic'));
      console.error('❌ Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPublicationModal = (publication: any) => {
    setSelectedPublication(publication);
    setIsPublicationModalOpen(true);
  };

  const handleClosePublicationModal = () => {
    setIsPublicationModalOpen(false);
    setSelectedPublication(null);
  };

  const handleModalLikeUpdate = (isLiked: boolean, likesCount: number) => {
    if (selectedPublication) {
      setPublications(prev => prev.map(publication =>
        publication.id === selectedPublication.id
          ? { ...publication, isLiked, stats: { ...publication.stats, likes: likesCount } }
          : publication
      ));
    }
  };

  const handleModalBookmarkUpdate = (isBookmarked: boolean) => {
    if (selectedPublication) {
      setPublications(prev => prev.map(publication =>
        publication.id === selectedPublication.id ? { ...publication, isBookmarked } : publication
      ));
    }
  };

  const handleModalCommentAdded = (commentsCount: number) => {
    if (selectedPublication) {
      setPublications(prev => prev.map(publication =>
        publication.id === selectedPublication.id
          ? { ...publication, stats: { ...publication.stats, comments: commentsCount } }
          : publication
      ));
    }
  };

  const handleModalViewIncremented = (viewsCount: number) => {
    if (selectedPublication) {
      setPublications(prev => prev.map(publication =>
        publication.id === selectedPublication.id
          ? { ...publication, stats: { ...publication.stats, views: viewsCount } }
          : publication
      ));
    }
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingPublicationId(undefined);
  };

  const handlePublicationSuccess = () => fetchPublications();

  const handleLike = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info(t('home.toast_login_like'));
        return;
      }
      const result = await publicationService.toggleLike(parseInt(id));
      setPublications(prev => prev.map(publication =>
        publication.id === id
          ? { ...publication, isLiked: result.publication.isLiked, stats: { ...publication.stats, likes: result.publication.likesCount } }
          : publication
      ));
    } catch (err) {
      console.error('❌ Erreur lors du like:', err);
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info(t('home.toast_login_bookmark'));
        return;
      }
      const result = await publicationService.toggleBookmark(parseInt(id));
      setPublications(prev => prev.map(publication =>
        publication.id === id ? { ...publication, isBookmarked: result.publication.isBookmarked } : publication
      ));
    } catch (err) {
      console.error('❌ Erreur lors du bookmark:', err);
    }
  };

  const handleShare = (id: string) => {
    const publication = publications.find(a => a.id === id);
    if (!publication) return;
    const url = `${window.location.origin}/home?publication=${id}`;
    if (navigator.share) {
      navigator.share({ title: publication.title, text: publication.description, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('home.toast_link_copied'));
    }
  };

  const handleEdit = (id: string) => {
    setEditingPublicationId(id);
    setCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(t('home.confirm_delete'))) return;
    try {
      await publicationService.delete(parseInt(id));
      setPublications(prev => prev.filter(publication => publication.id !== id));
    } catch (err) {
      console.error('❌ Erreur:', err);
      toast.error(err instanceof Error ? err.message : t('home.error_delete'));
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#168F6F] mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('home.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('home.error_title')}</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={fetchPublications}
            className="mt-4 px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
          >
            {t('home.error_retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Conteneur principal avec hauteur fixe - pas de scroll global */}
      <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <div className="h-full mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

            {/* ── Colonne principale : scroll indépendant sur les publications ── */}
            <div className="lg:col-span-2 h-full overflow-y-auto py-6 pr-2 scrollbar-hidden">
              
              {/* En-tête - PAS sticky, défile avec les publications */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('home.hero_title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('home.hero_subtitle')}
                </p>
                {!isAuthenticated() && (
                  <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    {t('home.auth_warning')}
                  </p>
                )}
              </div>

              {/* Liste des publications */}
              <div className="space-y-6 pb-6">
                {publications.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t('home.empty_title')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('home.empty_text')}
                    </p>
                    {currentUserId && (
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
                      >
                        {t('home.empty_create')}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {publications.map((publication) => (
                  <div
                    key={publication.id}
                    ref={(el) => { publicationRefs.current[publication.id] = el; }}
                    className="transition-all duration-300"
                  >
                    <PublicationCard
                      publication={publication}
                      onLike={handleLike}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onPublicationUpdated={handlePublicationSuccess}
                      showActions={isAuthenticated()}
                      currentUserId={currentUserId}
                      onEdit={currentUserId === publication.author.id ? handleEdit : undefined}
                      onDelete={currentUserId === publication.author.id ? handleDelete : undefined}
                      showHistory={currentUserId === publication.author.id}
                    />
                  </div>
                    ))}

                    <div className="text-center pt-4">
                      <button
                        onClick={fetchPublications}
                        className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                      >
                        {t('home.refresh')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <CreatePublicationModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSuccess={handlePublicationSuccess}
                publicationId={editingPublicationId}
              />
            </div>

            {/* ── Sidebar : scroll indépendant ── */}
            <div className="lg:col-span-1 h-full overflow-y-auto py-6 pl-2 scrollbar-hidden">
              <div className="space-y-6">
                <TrendingPublications onPublicationClick={handleOpenPublicationModal} />
                <TopContributors />
              </div>
            </div>

          </div>
        </div>

        <style jsx global>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .scrollbar-hidden::-webkit-scrollbar {
            display: none;
          }
          
          /* Hide scrollbar for IE, Edge and Firefox */
          .scrollbar-hidden {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          /* Highlight animation */
          @keyframes highlight {
            0%   { box-shadow: 0 0 0 0 rgba(22,143,111,0.5); background-color: rgba(22,143,111,0.1); }
            50%  { box-shadow: 0 0 20px 5px rgba(22,143,111,0.3); background-color: rgba(22,143,111,0.15); }
            100% { box-shadow: 0 0 0 0 rgba(22,143,111,0); background-color: transparent; }
          }
          .highlight-publication {
            animation: highlight 2s ease-in-out;
            border-radius: 16px;
          }
        `}</style>
      </div>

      {selectedPublication && (
        <PublicationDetailModal
          isOpen={isPublicationModalOpen}
          onClose={handleClosePublicationModal}
          publication={selectedPublication}
          onLike={() => {}}
          onBookmark={() => {}}
          onShare={() => {}}
          onModalLikeUpdate={handleModalLikeUpdate}
          onModalBookmarkUpdate={handleModalBookmarkUpdate}
          onModalCommentAdded={handleModalCommentAdded}
          onModalViewIncremented={handleModalViewIncremented}
        />
      )}
    </>
  );
}