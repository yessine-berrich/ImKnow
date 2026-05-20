'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { X, Heart, Eye, Share2, Bookmark, MessageCircle, MoreHorizontal, FileText, Printer, Edit, Trash2, Clock, Flag, User } from 'lucide-react';
import MarkdownPreview from '../markdoun-editor/MarkdownPreview';
import CommentsSection from '../comments/commentsSection';
import { isAuthenticated, getToken, fetchCurrentUser } from '../../../services/auth.service';
import { publicationService } from '../../../services/publication.service';
import { FollowRelationshipDto, followService } from '../../../services/follow.service';
import Avatar from '../ui/avatar/Avatar';
import SharePublicationModal from '../publication/SharePublicationModal';
import ReportPublicationModal from '../publication/ReportPublicationModal';
import CreatePublicationModal from '../modals/CreatePublicationModal';
import PublicationHistoryModal from '../modals/PublicationHistoryModal';
import { useTranslation } from '@/context/LanguageContext';

interface Publication {
  id: string;
  title: string;
  content: string;
  description: string;
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
  tags: string[];
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
  scrollToCommentId?: number;
  media?: Array<{
    id: number;
    url: string;
    filename: string;
    mimetype: string;
    type: 'image' | 'video' | 'document';
    size: number | null;
  }>;
}

interface PublicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: Publication | null;
  currentUserId?: number | string | null;
  userToken?: string;
  onLike?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPublicationUpdated?: () => void;
  onModalLikeUpdate?: (isLiked: boolean, likesCount: number) => void;
  onModalBookmarkUpdate?: (isBookmarked: boolean) => void;
  onModalCommentAdded?: (commentsCount: number) => void;
  onModalViewIncremented?: (viewsCount: number) => void;
  showActions?: boolean;
  showHistory?: boolean;
}

export default function PublicationDetailModal({
  isOpen,
  onClose,
  publication,
  currentUserId,
  userToken,
  onLike,
  onBookmark,
  onShare,
  onEdit,
  onDelete,
  onPublicationUpdated,
  onModalLikeUpdate,
  onModalBookmarkUpdate,
  onModalCommentAdded,
  onModalViewIncremented,
  showActions = true,
  showHistory = false,
}: PublicationDetailModalProps) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [isLiked, setIsLiked] = useState(publication?.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(publication?.isBookmarked || false);
  const [likesCount, setLikesCount] = useState(publication?.stats?.likes || 0);
  const [viewsCount, setViewsCount] = useState(publication?.stats?.views || 0);
  const [commentsCount, setCommentsCount] = useState(publication?.stats?.comments || 0);
  const [isIncrementingView, setIsIncrementingView] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [friends, setFriends] = useState<FollowRelationshipDto[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const friends = await followService.getFriends();
        setFriends(friends);
      }
      catch {
        // ignore friend loading errors
      }
    };

    loadFriends();
  }, []);


  useEffect(() => {
    if (publication) {
      setIsLiked(publication.isLiked || false);
      setIsBookmarked(publication.isBookmarked || false);
      setLikesCount(publication.stats?.likes || 0);
      setCommentsCount(publication.stats?.comments || 0);
      setViewsCount(publication.stats?.views || 0);

      if (isOpen && publication.id) {
        incrementView(publication.id);
      }
    }
  }, [publication, isOpen]);

  useEffect(() => {
    if (isOpen && publication?.scrollToCommentId) {
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${publication.scrollToCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          commentElement.classList.add('bg-yellow-50', 'dark:bg-yellow-900/20');
          setTimeout(() => {
            commentElement.classList.remove('bg-yellow-50', 'dark:bg-yellow-900/20');
          }, 2000);
        }
      }, 300);
    }
  }, [isOpen, publication]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const incrementView = async (publicationId: string) => {
    if (isIncrementingView) return;

    setIsIncrementingView(true);
    try {
      const token = getToken();

      const response = await fetch(`http://localhost:3000/api/publications/${publicationId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newViewsCount = data.views;
        setViewsCount(newViewsCount);

        if (onModalViewIncremented) {
          onModalViewIncremented(newViewsCount);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'incrémentation des vues:', error);
    } finally {
      setIsIncrementingView(false);
    }
  };

  const handleLike = async () => {
    if (!publication || !publication.id) return;

    if (!isAuthenticated()) {
      toast.info(t('publication_card.toast_login_like'));
      return;
    }

    if (isLiking) return;

    setIsLiking(true);

    try {
      const result = await publicationService.toggleLike(parseInt(publication.id));

      const newIsLiked = result.publication.isLiked;
      const newLikesCount = result.publication.likesCount;

      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      onModalLikeUpdate?.(newIsLiked, newLikesCount);
    } catch {
      toast.error(t('publication_card.toast_like_error'));
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!publication || !publication.id) return;

    if (!isAuthenticated()) {
      toast.info(t('publication_card.toast_login_bookmark'));
      return;
    }

    if (isBookmarking) return;

    setIsBookmarking(true);

    try {
      const result = await publicationService.toggleBookmark(parseInt(publication.id));

      const newIsBookmarked = result.publication.isBookmarked;
      setIsBookmarked(newIsBookmarked);
      onModalBookmarkUpdate?.(newIsBookmarked);
    } catch {
      toast.error(t('publication_card.toast_bookmark_error'));
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleShare = () => {
    if (!publication) return;
    setIsShareModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onPublicationUpdated?.();
  };

  const handleEditClick = () => {
    setIsMenuOpen(false);
    setIsEditModalOpen(true);
    onEdit?.(publication?.id as string);
  };

  const handleOpenHistory = () => {
    setIsMenuOpen(false);
    setIsHistoryModalOpen(true);
  };

  const exportToPDF = () => {
    setIsExporting(true);
    setIsMenuOpen(false);
    
    if (!publication) return;
    
    try {
      const cleanContent = publication.content;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${publication.title}</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
              .title { font-size: 28px; color: #00926B; font-weight: bold; }
              .meta { color: #6b7280; font-size: 14px; }
              .content { font-size: 15px; margin-top: 30px; white-space: pre-wrap; line-height: 1.8; }
              .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <h1 class="title">${publication.title}</h1>
            <p class="meta">${publication.author.name} · ${publication.author.department} · ${getTimeAgo(publication.publishedAt)}</p>
            <div class="content">${cleanContent.replace(/\n/g, '<br>')}</div>
            <div class="footer">${t('publication_card.export_footer')} · ${new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</div>
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
        a.download = `${publication.title.replace(/[^a-z0-9]/gi, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
      }
    } catch {
      setIsExporting(false);
    }
  };

  const handleCommentAdded = () => {
    const newCommentsCount = commentsCount + 1;
    setCommentsCount(newCommentsCount);
    onModalCommentAdded?.(newCommentsCount);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffInMs / 60000);

    if (minutes < 1) return t('publication_card.time_just_now');
    if (minutes < 60) return t('publication_card.time_minutes_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('publication_card.time_hours_short', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return days === 1
      ? t('publication_card.time_days_ago_one', { count: days })
      : t('publication_card.time_days_ago_plural', { count: days });
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: "numeric", month: "short" });
  };

  const hasBeenUpdated = (): boolean => {
    if (!publication?.updatedAt) return false;

    try {
      const publishedDate = new Date(publication.publishedAt);
      const updatedDate = new Date(publication.updatedAt);

      const publishedTime = Math.floor(publishedDate.getTime() / 1000);
      const updatedTime = Math.floor(updatedDate.getTime() / 1000);
      const timeDiff = Math.abs(updatedTime - publishedTime);
      const isDifferent = timeDiff > 60;

      return isDifferent;
    } catch (error) {
      console.error('Erreur comparaison dates:', error);
      return false;
    }
  };

  const navigateToAuthorProfile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const user = await fetchCurrentUser();
      const loggedInUserId = user?.id;
      const authorId = publication?.author?.id?.toString();
      if (loggedInUserId && authorId && loggedInUserId.toString() === authorId) {
        router.push('/profile');
      } else {
        if (publication?.author?.id) {
          router.push(`/profile/${publication.author.id}`);
        } else {
          router.push(`/profile/${encodeURIComponent(publication?.author?.name ?? '')}`);
        }
      }
    } catch {
      if (publication?.author?.id) router.push(`/profile/${publication.author.id}`);
      else router.push(`/profile/${encodeURIComponent(publication?.author?.name ?? '')}`);
    }
    onClose();
  };

  // Vérification si l'utilisateur est le propriétaire
  const isOwner = currentUserId && publication?.author?.id
    ? Number(currentUserId) === Number(publication.author.id)
    : false;

  if (!isOpen || !publication) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar
              src={publication.author.avatar}
              alt={publication.author.name || publication.author.initials}
              size="medium"
              className="!w-12 !h-12"
            />
            <div className="flex-1 min-w-0">
              <button
                onClick={navigateToAuthorProfile}
                className="group/name flex items-center gap-1.5 max-w-full"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover/name:text-[#00926B] dark:group-hover/name:text-[#00B383] transition-colors">
                  {publication.author.name}
                </h3>
                <User size={14} className="text-gray-400 group-hover/name:text-[#00926B] dark:group-hover/name:text-[#00B383] transition-colors flex-shrink-0" />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{publication.author.department}</span>
                <span>•</span>
                <span>{getTimeAgo(publication.publishedAt)}</span>
              </div>

              {hasBeenUpdated() && (
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>{t('publication_card.updated_at', { time: getTimeAgo(publication.updatedAt!) })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Menu à 3 points */}
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#00926B] border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('publication_card.menu_exporting')}</span>
                        </>
                      ) : (
                        <>
                          <FileText size={16} />
                          <span>{t('publication_card.menu_export_pdf')}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                              <h1 style="color: #00926B;">${publication.title}</h1>
                              <div style="color: #6b7280; margin: 15px 0;">
                                <strong>${t('publication_card.print_author')}:</strong> ${publication.author.name}<br/>
                                <strong>${t('publication_card.print_date')}:</strong> ${new Date(publication.publishedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                              </div>
                              <div style="margin: 20px 0; color: #4b5563;">
                                ${publication.content.replace(/\n/g, '<br>')}
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
                      <span>{t('publication_card.menu_print')}</span>
                    </button>

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/home?publication=${publication.id}`;
                        navigator.clipboard.writeText(url);
                        setIsMenuOpen(false);
                        toast.success(t('publication_card.toast_link_copied'));
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span>{t('publication_card.menu_copy_link')}</span>
                    </button>
                    
                    {onEdit && (
                      <button
                        onClick={handleEditClick}
                        className="w-full text-left px-4 py-2 text-sm text-[#00926B] dark:text-[#00B383] hover:bg-[#00926B]/10 dark:hover:bg-[#00926B]/20 transition-colors flex items-center gap-2"
                      >
                        <Edit size={16} />
                        <span>{t('publication_card.menu_edit')}</span>
                      </button>
                    )}
                    
                    {showHistory && (
                      <button
                        onClick={handleOpenHistory}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <Clock size={16} />
                        <span>{t('publication_card.menu_history')}</span>
                      </button>
                    )}
                    
                    {onDelete && (
                      <button
                        onClick={async () => {
                          if (await confirm(t('publication_card.delete_confirm'))) {
                            onDelete(publication.id);
                            onClose();
                          }
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        <span>{t('publication_card.menu_delete')}</span>
                      </button>
                    )}

                    {/* Signaler — uniquement si l'utilisateur n'est pas l'auteur */}
                    {!onDelete && (
                      <>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                        <button
                          onClick={() => { setIsReportModalOpen(true); setIsMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Flag size={16} />
                          <span>{t('publication_card.menu_report')}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              aria-label={t('publication_card.aria_close')}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] text-sm font-medium rounded-full">
                {publication.category.name}
              </span>
              {publication.isFeatured && (
                <span className="flex items-center gap-1 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-full">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L3 5l3.5-.5z" />
                  </svg>
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {publication.title}
            </h1>

            <div className="prose dark:prose-invert max-w-none">
              <MarkdownPreview content={publication.content} />
            </div>

            {publication.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200 dark:border-gray-800">
                {publication.tags.map((tag, i) => {
                  const label = typeof tag === 'object' && tag !== null ? (tag as any).name ?? JSON.stringify(tag) : tag;
                  const key = typeof tag === 'object' && tag !== null ? ((tag as any).id ?? i) : `${tag}-${i}`;
                  return (
                    <span
                      key={key}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <CommentsSection
            publicationId={parseInt(publication.id)}
            onCommentAdded={handleCommentAdded}
            mentionableUsers={friends.map(friend => ({
              id: friend.user.id,
              firstName: friend.user.firstName,
              lastName: friend.user.lastName,
              profileImage: friend.user.profileImage
            }))}
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 transition-colors group/like ${isLiking
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                  }`}
                aria-label={isLiked ? t('publication_card.aria_unlike') : t('publication_card.aria_like')}
              >
                <Heart
                  size={20}
                  className={`transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'group-hover/like:scale-110'
                    } ${isLiking ? 'opacity-50' : ''}`}
                />
                <span className="text-sm font-medium">{likesCount}</span>
              </button>

              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <MessageCircle size={20} />
                <span className="text-sm font-medium">{commentsCount}</span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Eye size={20} />
                <span className="text-sm font-medium">{viewsCount}</span>
              </div>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
                title={t('publication_card.share_label')}
                aria-label={t('publication_card.aria_share')}
              >
                <Share2 size={20} />
                <span className="text-sm font-medium hidden sm:inline">{t('publication_card.share_label')}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`p-2 rounded-lg transition-all ${isBookmarked
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400'
                  } ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isBookmarked ? t('publication_card.aria_bookmark_remove') : t('publication_card.aria_bookmark_add')}
                aria-label={isBookmarked ? t('publication_card.aria_bookmark_remove') : t('publication_card.aria_bookmark_add')}
              >
                <Bookmark
                  size={20}
                  className={isBookmarked ? 'fill-yellow-500' : ''}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isShareModalOpen && (
        <SharePublicationModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          publication={{ id: publication.id, title: publication.title, description: publication.description }}
        />
      )}

      {isReportModalOpen && (
        <ReportPublicationModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          publicationId={publication.id}
          publicationTitle={publication.title}
        />
      )}

      <CreatePublicationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        publicationId={publication.id}
      />

      <PublicationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        publicationId={publication.id}
        publicationTitle={publication.title}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}