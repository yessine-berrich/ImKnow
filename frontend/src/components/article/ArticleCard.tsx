'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { Heart, MessageCircle, Eye, Share2, Bookmark, MoreHorizontal, Download, Printer, FileText, User, Edit, Trash2, Clock, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ArticleDetailModal from '@/components/modals/ArticleDetailModal';
import CreateArticleModal from '@/components/modals/CreateArticleModal';
import ArticleHistoryModal from '../modals/ArticleHistoryModal';
import { fetchCurrentUser } from '../../../services/auth.service';
import Avatar from '@/components/ui/avatar/Avatar';
import ShareArticleModal from './ShareArticleModal';
import ReportArticleModal from './ReportArticleModal';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    description: string;
    content: string;
    author: {
      id?: number;
      name: string;
      initials: string;
      department: string;
      avatar?: string | null;
    };
    category: {
      name: string;
      slug: string;
    };
    tags: Array<string | { id?: number; name: string }>;
    isFeatured?: boolean;
    publishedAt: string;
    updatedAt?: string;
    status: 'draft' | 'published' | 'pending' | 'rejected';
    stats: {
      likes: number;
      comments: number;
      views: number;
      engagementRate?: number;
    };
    isLiked?: boolean;
    isBookmarked?: boolean;
    media?: Array<{
      id: number;
      url: string;
      filename: string;
      mimetype: string;
      type: 'image' | 'video' | 'document';
      size: number | null;
    }>;
  };
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArticleUpdated?: () => void;
  currentUserId?: number | string | null; 
  showActions?: boolean;
  showHistory?: boolean; 
}

export default function ArticleCard({ 
  article, 
  onLike, 
  onBookmark, 
  onShare,
  onEdit,
  onDelete,
  onArticleUpdated,
  showActions = true ,
  currentUserId ,
  showHistory = false 
}: ArticleCardProps) {
  // États
  const [isLiked, setIsLiked] = useState(article.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);
  const [likesCount, setLikesCount] = useState(article.stats.likes);
  const [commentsCount, setCommentsCount] = useState(article.stats.comments);
  const [viewsCount, setViewsCount] = useState(article.stats.views);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Synchronisation avec les props
  useEffect(() => {
    setIsLiked(article.isLiked || false);
    setIsBookmarked(article.isBookmarked || false);
    setLikesCount(article.stats.likes);
    setCommentsCount(article.stats.comments);
    setViewsCount(article.stats.views);
  }, [article.isLiked, article.isBookmarked, article.stats.likes, article.stats.comments, article.stats.views]);

  // Gestion du clic en dehors du menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fonction pour extraire la première image (uniquement l'URL)
  const extractFirstImage = (content: string): string | null => {
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return imageMatch ? imageMatch[1] : null;
  };

  // Fonction pour extraire le texte sans AUCUNE image (supprime tous les ![...](url))
  const extractFirstText = (content: string): string => {
    if (!content) return '';
    // Supprime TOUTES les images markdown (avec leur texte alternatif)
    let textWithoutImages = content.replace(/!\[.*?\]\([^)]+\)/g, '');
    // Supprime également les liens markdown mais garde le texte
    textWithoutImages = textWithoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
    // Nettoie les caractères markdown résiduels
    textWithoutImages = textWithoutImages.replace(/[#*_`>]/g, '');
    // Nettoie les espaces multiples
    textWithoutImages = textWithoutImages.replace(/\s+/g, ' ').trim();
    return textWithoutImages.substring(0, 200);
  };

  // Fonction pour nettoyer le contenu (supprimer les images markdown)
  const getCleanContentForDisplay = (content: string): string => {
    if (!content) return '';
    // Supprime TOUTES les images markdown
    return content.replace(/!\[.*?\]\([^)]+\)/g, '');
  };

  // Handlers
  const handleOpenHistory = () => {
    setIsMenuOpen(false);
    setIsHistoryModalOpen(true);
  };

  const handleLike = () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    onLike?.(article.id);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(article.id);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleEditClick = () => {
    setIsMenuOpen(false);
    setIsEditModalOpen(true);
    onEdit?.(article.id);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onArticleUpdated?.();
  };

  const handleOpenModal = () => setIsModalOpen(true);

  const navigateToAuthorProfile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const user = await fetchCurrentUser();
      const currentUserId = user?.id;
      const authorId = article.author.id?.toString();
      
      if (currentUserId && authorId && currentUserId.toString() === authorId) {
        router.push('/profile');
      } else {
        if (article.author.id) {
          router.push(`/profile/${article.author.id}`);
        } else {
          router.push(`/profile/${encodeURIComponent(article.author.name)}`);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      if (article.author.id) {
        router.push(`/profile/${article.author.id}`);
      } else {
        router.push(`/profile/${encodeURIComponent(article.author.name)}`);
      }
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
    if (diffInDays > 0) return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    if (diffInHours > 0) return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    return 'il y a quelques minutes';
  };

  const exportToPDF = () => {
    setIsExporting(true);
    setIsMenuOpen(false);
    
    try {
      // Nettoyer le contenu des images markdown pour l'export
      const cleanContent = getCleanContentForDisplay(article.content);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${article.title}</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
              .title { font-size: 28px; color: #00926B; font-weight: bold; }
              .meta { color: #6b7280; font-size: 14px; }
              .content { font-size: 15px; margin-top: 30px; white-space: pre-wrap; line-height: 1.8; }
              .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <h1 class="title">${article.title}</h1>
            <p class="meta">${article.author.name} · ${article.author.department} · ${getTimeAgo(article.publishedAt)}</p>
            <div class="content">${cleanContent.replace(/\n/g, '<br>')}</div>
            <div class="footer">Exporté depuis KnowledgeHub · ${new Date().toLocaleDateString('fr-FR')}</div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            setIsExporting(false);
          }, 1000);
        };
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.title.replace(/[^a-z0-9]/gi, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
      }
    } catch {
      setIsExporting(false);
    }
  };

  // Callback pour mettre à jour les stats depuis le modal
  const handleModalLike = (newIsLiked: boolean, newLikesCount: number) => {
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
  };

  const handleModalBookmark = (newIsBookmarked: boolean) => {
    setIsBookmarked(newIsBookmarked);
  };

  const handleModalCommentAdded = (newCommentsCount: number) => {
    setCommentsCount(newCommentsCount);
  };

  const handleModalViewIncremented = (newViewsCount: number) => {
    setViewsCount(newViewsCount);
  };

  return (
    <>
      <article className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all duration-200 group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar cliquable */}
            <button
              onClick={navigateToAuthorProfile}
              className="relative group/avatar"
              aria-label={`Voir le profil de ${article.author.name}`}
            >
              <Avatar
                src={article.author.avatar}
                alt={article.author.name}
                size="medium"
                className="!w-12 !h-12 shadow-md transition-transform group-hover/avatar:scale-105"
              />
              <div className="absolute inset-0 bg-[#00926B]/0 group-hover/avatar:bg-[#00926B]/20 rounded-full transition-colors"></div>
            </button>

            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={navigateToAuthorProfile}
                  className="group/name flex items-center gap-1.5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover/name:text-[#00926B] dark:group-hover/name:text-[#00B383] transition-colors">
                    {article.author.name}
                  </h3>
                  <User size={14} className="text-gray-400 group-hover/name:text-[#00926B] transition-colors" />
                </button>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {article.author.department}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{getTimeAgo(article.publishedAt)}</span>
                <span>•</span>
              </div>
            </div>
          </div>

          {/* More Menu */}
          {showActions && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="More options"
                disabled={isExporting}
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MoreHorizontal size={20} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10">
                  <button
                    onClick={exportToPDF}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#00926B] border-t-transparent rounded-full animate-spin"></div>
                        <span>Export en cours...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span>Exporter en PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const cleanContent = getCleanContentForDisplay(article.content);
                        printWindow.document.write(`
                          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                            <h1 style="color: #00926B;">${article.title}</h1>
                            <div style="color: #6b7280; margin: 15px 0;">
                              <strong>Auteur:</strong> ${article.author.name}<br/>
                              <strong>Date:</strong> ${new Date(article.publishedAt).toLocaleDateString('fr-FR')}
                            </div>
                            <div style="margin: 20px 0; color: #4b5563;">
                              ${cleanContent.replace(/\n/g, '<br>')}
                            </div>
                          </div>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => {
                          printWindow.print();
                          setTimeout(() => printWindow.close(), 500);
                        }, 500);
                      }
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={16} />
                    <span>Imprimer</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/home?article=${article.id}`;
                      navigator.clipboard.writeText(url);
                      setIsMenuOpen(false);
                      toast.success('Lien copié !');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Copier le lien
                  </button>
                  
                  {/* Bouton Signaler — visible uniquement si l'utilisateur n'est pas l'auteur */}
                  {!onDelete && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { setIsReportModalOpen(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <Flag size={16} />
                        <span>Signaler</span>
                      </button>
                    </>
                  )}

                  {/* Bouton Modifier - ouvre le modal */}
                  {onEdit && (
                    <button
                      onClick={handleEditClick}
                      className="w-full text-left px-4 py-2 text-sm text-[#00926B] dark:text-[#00B383] hover:bg-[#00926B]/10 dark:hover:bg-[#00926B]/20 transition-colors flex items-center gap-2"
                    >
                      <Edit size={16} />
                      <span>Modifier</span>
                    </button>
                  )}
                 {/* Historique des versions - conditionné par showHistory */}
                  {showHistory && (
                    <button
                      onClick={handleOpenHistory}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Clock size={16} />
                      <span>Historique des versions</span>
                    </button>
                  )}
                  
                  {/* Bouton Supprimer */}
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
                          onDelete(article.id);
                          setIsMenuOpen(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category & Featured Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#00926B]/20 dark:hover:bg-[#00926B]/30 transition-colors cursor-pointer">
            {article.category.name}
          </span>
          {article.isFeatured && (
            <span className="flex items-center gap-1 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-full">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L3 5l3.5-.5z" />
              </svg>
              Featured
            </span>
          )}
        </div>

        {/* Title & Description - Clickable */}
        <div onClick={handleOpenModal} className="block mb-3 cursor-pointer group/link">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover/link:text-[#00926B] dark:group-hover/link:text-[#00B383] transition-colors line-clamp-2">
            {article.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {extractFirstText(article.description || article.content)}
          </p>
        </div>

        {/* Media Display - Show first image if available */}
        {(article.media && article.media.length > 0) && (
          <div className="mb-4" onClick={handleOpenModal}>
            {(() => {
              const firstImage = article.media.find(m => m.type === 'image');
              if (firstImage) {
                return (
                  <div className="relative overflow-hidden rounded-lg">
                    <img 
                      src={firstImage.url} 
                      alt="" 
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* If no media but content has images, extract and show first one */}
        {(!article.media || article.media.length === 0) && (() => {
          const firstContentImage = extractFirstImage(article.content);
          if (firstContentImage) {
            return (
              <div className="mb-4" onClick={handleOpenModal}>
                <div className="relative overflow-hidden rounded-lg">
                  <img 
                    src={firstContentImage} 
                    alt="" 
                    className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Tags - avec gestion des tags sous forme d'objets avec ID */}
<div className="flex flex-wrap gap-2 mb-4">
  {article.tags.map((tag, index) => {
    // Extraire l'ID du tag
    let tagId: number | null = null;
    let tagLabel: string = '';
    
    if (typeof tag === 'object' && tag !== null) {
      // Si c'est un objet, récupérer l'ID et le nom
      tagId = tag.id || null;
      tagLabel = tag.name || tag.label || JSON.stringify(tag);
    } else {
      // Si c'est une chaîne, on utilise la chaîne comme label
      tagLabel = String(tag);
    }
    
    const tagKey = tagId ? `tag-${tagId}` : `tag-${index}`;
    
    const handleTagClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (tagId) {
        // Si on a un ID, naviguer vers la page du tag
        router.push(`/tags/${tagId}/articles`);
      }
    };
    
    return (
      <button
        key={tagKey}
        onClick={handleTagClick}
        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        {tagLabel}
      </button>
    );
  })}
</div>
        {/* Footer - Stats & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          {/* Stats */}
          <div className="flex items-center gap-4">
            {/* Likes */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group/like"
            >
              <Heart
                size={20}
                className={`transition-all ${
                  isLiked
                    ? 'fill-red-500 text-red-500'
                    : 'group-hover/like:scale-110'
                }`}
              />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>

            {/* Comments */}
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-[#00926B] dark:hover:text-[#00B383] transition-colors"
            >
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{commentsCount}</span>
            </button>

            {/* Views */}
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Eye size={20} />
              <span className="text-sm font-medium">{viewsCount}</span>
            </div>

            {/* Bouton Export rapide */}
            <button
              onClick={exportToPDF}
              className="hidden sm:flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-[#00926B] dark:hover:text-[#00B383] transition-colors"
              title="Exporter en PDF"
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-[#00926B] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download size={20} />
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-[#00926B] dark:hover:text-[#00B383] hover:bg-[#00926B]/10 dark:hover:bg-[#00926B]/20 rounded-lg transition-all"
              aria-label="Share"
            >
              <Share2 size={20} />
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-all"
              aria-label="Bookmark"
            >
              <Bookmark
                size={20}
                className={isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}
              />
            </button>
          </div>
        </div>
      </article>

      {/* Modal de lecture */}
<ArticleDetailModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  article={article}
  onLike={handleLike}
  onBookmark={handleBookmark}
  onShare={handleShare}
  onEdit={onEdit}
  onDelete={onDelete}
  onArticleUpdated={onArticleUpdated}
  onModalLikeUpdate={handleModalLike}
  onModalBookmarkUpdate={handleModalBookmark}
  onModalCommentAdded={handleModalCommentAdded}
  onModalViewIncremented={handleModalViewIncremented}
  showActions={showActions}
  showHistory={showHistory}
  currentUserId={currentUserId}
/>

      {/* Modal d'édition */}
      <CreateArticleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        articleId={article.id}
      />
      
      <ArticleHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        articleId={article.id}
        articleTitle={article.title}
      />

      {/* Modal de partage */}
      <ShareArticleModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        article={{ id: article.id, title: article.title, description: article.description }}
      />

      {/* Modal de signalement */}
      <ReportArticleModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        articleId={article.id}
        articleTitle={article.title}
      />
    </>
  );
}
