'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import Link from 'next/link';
import {
  MessageCircle,
  Send,
  ChevronDown,
  Heart,
  Trash2,
  Reply,
  Pencil,
  Check,
  X,
  AtSign,
} from 'lucide-react';
import { fetchCurrentUser } from '../../../services/auth.service';
import { resolveAvatarUrl } from '@/utils/profile-image';
import { commentService, Comment, CommentAuthor } from '../../../services/comment.service';
import UIAvatar from '@/components/ui/avatar/Avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MentionUser {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
}

interface CommentsSectionProps {
  articleId: number;
  onCommentAdded?: () => void;
  /** Pass the list of users that can be mentioned (e.g. friends / followers) */
  mentionableUsers?: MentionUser[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(dateString: string): string {
  try {
    const diffInMs = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(diffInMs / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `il y a ${d} j`;
    if (h > 0) return `il y a ${h} h`;
    if (m > 0) return `il y a ${m} min`;
    return "à l'instant";
  } catch {
    return '';
  }
}

/** Returns the last @word being typed (or null if cursor is not inside one) */
function getActiveMention(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

/** Replace the active @word with the chosen username */
function replaceMention(text: string, cursorPos: number, fullName: string): { newText: string; newCursor: number } {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const newBefore = before.replace(/@(\w*)$/, `@${fullName} `);
  return { newText: newBefore + after, newCursor: newBefore.length };
}

/** Extract IDs of mentioned users from text */
function extractMentionedIds(text: string, users: MentionUser[]): number[] {
  const ids: number[] = [];
  users.forEach((u) => {
    const fullName = `${u.firstName} ${u.lastName}`;
    if (text.includes(`@${fullName}`)) ids.push(u.id);
  });
  return ids;
}

/** Render comment text with @mentions as clickable links */
function RenderContent({ content, mentionableUsers }: { content: string; mentionableUsers: MentionUser[] }) {
  // Créer un mapping nom complet -> id
  const userMap = new Map<string, number>();
  
  mentionableUsers.forEach((u) => {
    const fullName = `${u.firstName} ${u.lastName}`;
    userMap.set(fullName.toLowerCase(), u.id);
    userMap.set(`@${fullName.toLowerCase()}`, u.id);
    userMap.set(u.firstName.toLowerCase(), u.id);
    userMap.set(`@${u.firstName.toLowerCase()}`, u.id);
  });

  // Ajouter un log pour déboguer
  console.log('Mentionable users:', mentionableUsers.map(u => `${u.firstName} ${u.lastName}`));
  console.log('Content:', content);

  // Découper le texte par les espaces
  const words = content.split(/(\s+)/);
  
  const renderedWords = words.map((word, index) => {
    // Vérifier si le mot commence par @
    if (word.startsWith('@')) {
      const mentionName = word.slice(1).toLowerCase(); // Enlever le @ et mettre en minuscule
      const userId = userMap.get(mentionName);
      
      console.log(`Checking mention: ${mentionName}, found: ${userId}`);
      
      if (userId) {
        return (
          <Link
            key={index}
            href={`/profile/${userId}`}
            className="text-[#168F6F] hover:underline font-semibold cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Navigating to profile:', userId);
            }}
          >
            {word}
          </Link>
        );
      }
      // Mot avec @ mais pas un utilisateur valide
      return <span key={index} className="text-[#168F6F] font-semibold">{word}</span>;
    }
    // Texte normal
    return <span key={index}>{word}</span>;
  });

  return (
    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
      {renderedWords}
    </p>
  );
}

// ─── MentionInput ─────────────────────────────────────────────────────────────

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  onCursorChange?: (pos: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  mentionableUsers: MentionUser[];
  onEnter?: () => void;
  multiline?: boolean;
}

function MentionInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  mentionableUsers,
  onEnter,
  multiline = false,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const filtered = mentionableUsers.filter((u) => {
    const full = `${u.firstName} ${u.lastName}`.toLowerCase();
    return full.includes(mentionQuery.toLowerCase());
  }).slice(0, 6);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    onChange(val);
    setCursorPos(pos);
    const query = getActiveMention(val, pos);
    if (query !== null) {
      setMentionQuery(query);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      if (showDropdown) { setShowDropdown(false); return; }
      onEnter?.();
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const pickMention = (user: MentionUser) => {
    const fullName = `${user.firstName} ${user.lastName}`;
    const { newText, newCursor } = replaceMention(value, cursorPos, fullName);
    onChange(newText);
    setShowDropdown(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const sharedProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    className,
    onSelect: (e: any) => setCursorPos(e.target.selectionStart ?? 0),
  };

  return (
    <div className="relative flex-1">
      {multiline ? <textarea rows={3} {...sharedProps} /> : <input type="text" {...sharedProps} />}

      {showDropdown && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {filtered.map((u) => (
            <button
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); pickMention(u); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <UIAvatar
                src={u.profileImage}
                alt={`${u.firstName} ${u.lastName}`}
                size="small"
                className="!w-7 !h-7"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {u.firstName} {u.lastName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CommentAvatar ────────────────────────────────────────────────────────────

function CommentAvatar({ profileImage, name, size = 40 }: { profileImage?: string | null; name?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const src = resolveAvatarUrl(profileImage);

  const initials = name
    ? name.trim().split(/\s+/).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fontSize = Math.max(10, Math.round(size * 0.35));

  return (
    <div
      className="relative rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name || initials}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize, lineHeight: 1 }}>{initials}</span>
      )}
    </div>
  );
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  level?: number;
  currentUserId: number | null;
  currentUser: any;
  activeReplyId: number | null;
  replyContent: string;
  mentionableUsers: MentionUser[];
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
  onReplyToggle: (id: number | null) => void;
  onReplyContentChange: (val: string) => void;
  onReplySubmit: (id: number) => void;
  onUpdateComment: (id: number, content: string) => Promise<void>;
}

function CommentItem({
  comment,
  level = 0,
  currentUserId,
  currentUser,
  activeReplyId,
  replyContent,
  mentionableUsers,
  onLike,
  onDelete,
  onReplyToggle,
  onReplyContentChange,
  onReplySubmit,
  onUpdateComment,
}: CommentItemProps) {
  const isOwner = currentUserId === comment.author?.id;
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  if (!comment.author) return null;

  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      await onUpdateComment(comment.id, editContent.trim());
      setIsEditing(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className={`${level > 0 ? 'ml-12' : ''} mb-4`}>
      <div className="flex gap-3">
        {/* Avatar - cliquable vers le profil */}
        <Link href={`/profile/${comment.author.id}`} className="flex-shrink-0">
          <CommentAvatar profileImage={comment.author?.profileImage} name={authorName} size={40} />
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/profile/${comment.author.id}`}
                className="font-semibold text-sm hover:text-[#168F6F] hover:underline transition-colors"
              >
                {authorName}
              </Link>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(modifié)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <MentionInput
                  value={editContent}
                  onChange={setEditContent}
                  mentionableUsers={mentionableUsers}
                  placeholder="Modifier votre commentaire..."
                  multiline
                  className="w-full px-3 py-2 rounded-xl border border-[#168F6F] text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#168F6F] resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit || !editContent.trim()}
                    className="flex items-center gap-1 px-3 py-1 bg-[#168F6F] text-white rounded-full text-xs font-semibold hover:bg-[#0F6B54] disabled:opacity-50 transition-colors"
                  >
                    <Check size={12} />
                    {isSavingEdit ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X size={12} />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <RenderContent content={comment.content} mentionableUsers={mentionableUsers} />
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-1 ml-1">
              <button
                onClick={() => onLike(comment.id)}
                disabled={!currentUserId}
                className={`flex items-center gap-1 text-xs font-semibold ${
                  comment.isLiked ? 'text-[#168F6F]' : 'text-gray-500 hover:text-[#168F6F]'
                } disabled:opacity-50 transition-colors`}
              >
                <Heart size={14} className={comment.isLiked ? 'fill-[#168F6F]' : ''} />
                <span>{comment.likes > 0 ? comment.likes : "J'aime"}</span>
              </button>

              {currentUserId && (
                <button
                  onClick={() => {
                    onReplyToggle(activeReplyId === comment.id ? null : comment.id);
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-[#168F6F] transition-colors"
                >
                  Répondre
                </button>
              )}

              <span className="text-xs text-gray-400">{getTimeAgo(comment.createdAt)}</span>

              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-amber-600 transition-colors"
                  >
                    <Pencil size={12} />
                    Modifier
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply input */}
          {activeReplyId === comment.id && currentUserId && !isEditing && (
            <div className="mt-3 flex gap-2 items-center">
              <CommentAvatar profileImage={currentUser?.profileImage} name={`${currentUser?.firstName} ${currentUser?.lastName}`} size={32} />
              <div className="relative flex-1">
                <MentionInput
                  value={replyContent}
                  onChange={onReplyContentChange}
                  placeholder={`Répondre à ${comment.author.firstName}... (utilisez @ pour mentionner)`}
                  mentionableUsers={mentionableUsers}
                  onEnter={() => onReplySubmit(comment.id)}
                  className="w-full px-4 py-2 pr-24 border border-gray-300 dark:border-gray-700 rounded-full text-sm focus:ring-2 focus:ring-[#168F6F] focus:border-transparent outline-none bg-white dark:bg-gray-800"
                />
                <button
                  onClick={() => onReplySubmit(comment.id)}
                  disabled={!replyContent.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#168F6F] text-white rounded-full text-xs font-semibold hover:bg-[#0F6B54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Répondre
                </button>
              </div>
            </div>
          )}

          {/* Replies toggle */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs font-semibold text-[#168F6F] hover:text-[#0F6B54]"
              >
                <ChevronDown
                  size={14}
                  className={`transform transition-transform ${showReplies ? '' : '-rotate-90'}`}
                />
                {showReplies ? 'Masquer' : 'Voir'} {comment.replies.length} réponse
                {comment.replies.length > 1 ? 's' : ''}
              </button>

              {showReplies && (
                <div className="mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      level={level + 1}
                      currentUserId={currentUserId}
                      currentUser={currentUser}
                      activeReplyId={activeReplyId}
                      replyContent={replyContent}
                      mentionableUsers={mentionableUsers}
                      onLike={onLike}
                      onDelete={onDelete}
                      onReplyToggle={onReplyToggle}
                      onReplyContentChange={onReplyContentChange}
                      onReplySubmit={onReplySubmit}
                      onUpdateComment={onUpdateComment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

export default function CommentsSection({
  articleId,
  onCommentAdded,
  mentionableUsers = [],
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsCollapsed, setCommentsCollapsed] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // Load current user
  useEffect(() => {
    fetchCurrentUser()
      .then((userData) => {
        setCurrentUser(userData);
        setCurrentUserId(userData.id);
      })
      .catch(() => {
        setCurrentUser(null);
        setCurrentUserId(null);
      });
  }, []);

  // Load comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await commentService.findByArticle(articleId);
      setComments(data);
    } catch (err) {
      console.error('Erreur de chargement des commentaires:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Submit new comment
  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    try {
      const mentionedUserIds = extractMentionedIds(newComment, mentionableUsers);
      await commentService.create({
        articleId,
        content: newComment.trim(),
        mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined,
      });
      setNewComment('');
      await fetchComments();
      onCommentAdded?.();
    } catch (err) {
      console.error('Erreur lors de la création du commentaire:', err);
    }
  };

  // Submit reply
  const handleReply = async (commentId: number) => {
    if (!replyContent.trim() || !currentUserId) return;
    try {
      const mentionedUserIds = extractMentionedIds(replyContent, mentionableUsers);
      await commentService.create({
        articleId,
        content: replyContent.trim(),
        parentId: commentId,
        mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined,
      });
      setReplyContent('');
      setActiveReplyId(null);
      await fetchComments();
      onCommentAdded?.();
    } catch (err) {
      console.error('Erreur lors de la réponse:', err);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: number) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await commentService.remove(commentId);
      await fetchComments();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  // Like toggle with optimistic update
  const handleLike = async (commentId: number) => {
    if (!currentUserId) { toast.info('Connectez-vous pour liker'); return; }

    const updateLikes = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
        if (c.replies) return { ...c, replies: updateLikes(c.replies) };
        return c;
      });

    setComments((prev) => updateLikes(prev));

    try {
      const result = await commentService.toggleLike(commentId);
      setComments((prev) => {
        const verify = (list: Comment[]): Comment[] =>
          list.map((c) => {
            if (c.id === commentId && c.isLiked !== result.isLiked)
              return { ...c, isLiked: result.isLiked, likes: result.likes };
            if (c.replies) return { ...c, replies: verify(c.replies) };
            return c;
          });
        return verify(prev);
      });
    } catch {
      await fetchComments();
    }
  };

  // Update comment (edit)
  const handleUpdateComment = async (commentId: number, content: string) => {
    await commentService.update(commentId, { content });
    await fetchComments();
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const totalCount = comments.length;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCommentsCollapsed(!commentsCollapsed)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-[#168F6F] transition-colors"
          >
            <MessageCircle size={20} />
            <span className="font-semibold">
              {totalCount} commentaire{totalCount > 1 ? 's' : ''}
            </span>
          </button>
          <button
            onClick={() => setCommentsCollapsed(!commentsCollapsed)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ChevronDown
              size={20}
              className={`transform transition-transform ${commentsCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </div>

      {/* Body */}
      {!commentsCollapsed && (
        <div className="px-4 pb-6">
          {/* New comment input */}
          <div className="flex gap-3 mb-6">
            <CommentAvatar
              profileImage={currentUser?.profileImage}
              name={`${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`}
              size={40}
            />
            <div className="relative flex-1">
              <MentionInput
                value={newComment}
                onChange={setNewComment}
                placeholder={
                  currentUserId
                    ? 'Écrire un commentaire... (@ pour mentionner)'
                    : 'Connectez-vous pour commenter'
                }
                disabled={loading || !currentUserId}
                mentionableUsers={mentionableUsers}
                onEnter={handleSendComment}
                className="w-full px-4 py-2 pr-24 border border-gray-300 dark:border-gray-700 rounded-full text-sm focus:ring-2 focus:ring-[#168F6F] focus:border-transparent outline-none bg-gray-50 dark:bg-gray-800 disabled:opacity-60"
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim() || loading || !currentUserId}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#168F6F] text-white rounded-full text-xs font-semibold hover:bg-[#0F6B54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '...' : 'Publier'}
              </button>
            </div>
          </div>

          {/* Hint */}
          {currentUserId && mentionableUsers.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mb-4 ml-13">
              <AtSign size={11} />
              Tapez @ pour mentionner quelqu'un
            </p>
          )}

          {/* Comment list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#168F6F] border-t-transparent" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : rootComments.length > 0 ? (
            <div className="space-y-4">
              {rootComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  activeReplyId={activeReplyId}
                  replyContent={replyContent}
                  mentionableUsers={mentionableUsers}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onReplyToggle={(id) => {
                    setActiveReplyId(id);
                    setReplyContent('');
                  }}
                  onReplyContentChange={setReplyContent}
                  onReplySubmit={handleReply}
                  onUpdateComment={handleUpdateComment}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Soyez le premier à commenter !</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
