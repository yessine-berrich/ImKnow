'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import MarkdownEditor, { MarkdownEditorRef } from '../markdoun-editor/MarkdownEditor';
import TagsSelector from '../tags/TagsSelector';
import { articleService } from '../../../services/article.service';
import type { UpdateArticleDto } from '../../../services/article.service';
import type { Article } from '../../../services/article.service';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  articleId?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Category {
  id: number;
  value: number;
  label: string;
  icon: string;
}

interface Tag {
  id: number;
  name: string;
}

interface PendingFile {
  file: File;
  localUrl: string;
}

export default function CreateArticleModal({
  isOpen,
  onClose,
  onSuccess,
  articleId,
}: CreateArticleModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<number | ''>('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [changeSummary, setChangeSummary] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isUploadingImage] = useState(false);
  const [uploadProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);

  const markdownEditorRef = useRef<MarkdownEditorRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tagsVersion, setTagsVersion] = useState(0);
  const isEditMode = !!articleId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (isEditMode) {
        loadArticleData();
      } else {
        resetForm();
      }
    }
    return () => {
      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.localUrl));
    };
  }, [isOpen, articleId]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [catRes, tagRes] = await Promise.all([
        fetch(`${API_URL}/categories`, { headers }),
        fetch(`${API_URL}/tags`, { headers }),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(
          data.map((cat: any) => ({
            id: cat.id,
            value: cat.id,
            label: cat.name,
            icon: cat.icon || '📁',
          }))
        );
      }
      if (tagRes.ok) {
        setAvailableTags(await tagRes.json());
      }
    } catch {
      showToast('error', '❌ Erreur lors du chargement des données');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateTag = async (tagName: string): Promise<Tag> => {
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ name: tagName }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du tag');
    }
    const newTag = await response.json();
    setAvailableTags((prev) => [...prev, { id: newTag.id, name: newTag.name }]);
    return newTag;
  };

  const loadArticleData = async () => {
    if (!articleId) return;
    setIsLoadingArticle(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/articles/${articleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const article = await res.json();

      setOriginalArticle(article as any);
      setTitle(article.title || '');
      setCategory(article.category?.id || '');
      setContent(article.content || '');

      const rawTags: any[] = article.tags || [];

      if (rawTags.length === 0) {
        setSelectedTags([]);
        return;
      }

      if (typeof rawTags[0] === 'object' && rawTags[0] !== null && 'id' in rawTags[0]) {
        setSelectedTags(rawTags.map((t: any) => t.id).filter(Boolean));
      } else {
        let tagsPool = availableTags;
        if (tagsPool.length === 0) {
          try {
            const tagRes = await fetch(`${API_URL}/tags`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (tagRes.ok) {
              tagsPool = await tagRes.json();
              setAvailableTags(tagsPool);
            }
          } catch {
            // ignore
          }
        }
        const resolvedIds = rawTags
          .map((name: string) => tagsPool.find((t) => t.name === name)?.id)
          .filter((id): id is number => id !== undefined);
        setSelectedTags(resolvedIds);
      }
    } catch (error: any) {
      showToast('error', `❌ ${error.message || "Erreur lors du chargement de l'article"}`);
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const refreshTags = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const newTags = await res.json();
        setAvailableTags(newTags);
        setTagsVersion(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erreur rafraîchissement tags:', error);
    }
  }, []);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const validateForm = () => {
    if (!title.trim()) { showToast('error', 'Le titre est obligatoire'); return false; }
    if (!category) { showToast('error', 'Veuillez sélectionner une catégorie'); return false; }
    if (!content.trim()) { showToast('error', 'Le contenu ne peut pas être vide'); return false; }
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

      if (!validTypes.includes(file.type)) {
        showToast('error', `Type non supporté: ${file.name}. Utilisez JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX.`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast('error', `${file.name} est trop lourd. Maximum 10 MB.`);
        return;
      }

      const localUrl = URL.createObjectURL(file);
      setPendingFiles((prev) => [...prev, { file, localUrl }]);

      const fileName = file.name.replace(/\.[^.]+$/, '');
      if (isImage) {
        insertAtCursor(`\n![${fileName}](${localUrl})\n`);
      } else {
        insertAtCursor(`\n[${fileName}](${localUrl})\n`);
      }

      showToast('success', `✅ ${file.name} ajouté (envoyé lors de la soumission)`);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertAtCursor = (text: string) => {
    const textarea = markdownEditorRef.current?.getTextarea?.() || textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const next = content.substring(0, start) + text + content.substring(end);
    setContent(next);
    setTimeout(() => {
      textarea.focus();
      const pos = start + text.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildCreateFormData = (status: 'draft' | 'pending'): FormData => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    fd.append('categoryId', String(category));
    fd.append('status', status);
    selectedTags.forEach((id) => fd.append('tagIds[]', String(id)));
    pendingFiles.forEach(({ file }) => fd.append('files', file));
    return fd;
  };

  const handleCreateWithFiles = async (status: 'draft' | 'pending'): Promise<any> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const fd = buildCreateFormData(status);

    const response = await fetch(`${API_URL}/articles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expirée');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Erreur ${response.status}`);
    }

    const created = await response.json();

    if (pendingFiles.length > 0 && created?.media?.length) {
      let patchedContent = content;
      pendingFiles.forEach((pf, idx) => {
        const media = created.media[idx];
        if (media?.url) {
          patchedContent = patchedContent.replace(
            new RegExp(escapeRegExp(pf.localUrl), 'g'),
            media.url
          );
        }
      });

      if (patchedContent !== content) {
        await fetch(`${API_URL}/articles/${created.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: patchedContent }),
        });
      }
    }

    pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.localUrl));

    return created;
  };

  const buildUpdateDto = (
    status: 'draft' | 'pending'
  ): (UpdateArticleDto & { hasChanges: boolean }) | null => {
    if (!isEditMode || !originalArticle) return null;

    const dto: UpdateArticleDto = {};
    let hasChanges = false;

    if (title !== originalArticle.title) { dto.title = title; hasChanges = true; }
    if (content !== originalArticle.content) { dto.content = content; hasChanges = true; }
    if (category !== (originalArticle.category as any)?.id) { dto.categoryId = category as number; hasChanges = true; }

    const rawOrigTags: any[] = (originalArticle as any).tags ?? [];
    const origTagIds: number[] = rawOrigTags
      .map((t: any) => (typeof t === 'object' ? t.id : undefined))
      .filter((id): id is number => id !== undefined)
      .sort();
    const currentTagIds = [...selectedTags].sort();

    if (JSON.stringify(origTagIds) !== JSON.stringify(currentTagIds)) {
      dto.tagIds = selectedTags;
      hasChanges = true;
    }

    dto.status = status as any;
    dto.changeSummary = changeSummary.trim() || (status === 'draft' ? 'Mise à jour du brouillon' : 'Soumission pour validation');

    return { ...dto, hasChanges };
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSubmittingDraft(true);
    try {
      if (isEditMode && articleId) {
        const updateDto = buildUpdateDto('draft');
        if (!updateDto?.hasChanges) { showToast('info', 'Aucune modification détectée'); return; }
        const { hasChanges, ...dtoToSend } = updateDto;
        await articleService.update(parseInt(articleId), dtoToSend);
        showToast('success', '✅ Brouillon mis à jour avec succès !');
        setOriginalArticle((prev) =>
          prev
            ? {
              ...prev,
              title,
              content,
              category: { ...prev.category, id: category as number },
              tags: availableTags.filter((t) => selectedTags.includes(t.id)),
              status: 'draft',
            }
            : prev
        );
      } else {
        await handleCreateWithFiles('draft');
        showToast('success', '✅ Brouillon sauvegardé avec succès !');
      }
      setTimeout(() => { resetForm(); onSuccess?.(); if (!isEditMode) onClose(); }, 1000);
    } catch (error: any) {
      showToast('error', `❌ ${error.message || 'Erreur lors de la sauvegarde'}`);
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const handleSubmitForValidation = async () => {
    if (!validateForm()) return;
    setIsSubmittingPending(true);
    try {
      if (isEditMode && articleId) {
        const updateDto = buildUpdateDto('pending');
        if (!updateDto) { showToast('error', 'Erreur lors de la construction du DTO'); return; }

        const { hasChanges, ...dtoToSend } = updateDto;
        const hasContentChanges = Object.keys(dtoToSend).some(
          (k) => !['status', 'changeSummary'].includes(k)
        );

        let updatedArticle;
        if (!hasContentChanges) {
          updatedArticle = await articleService.update(parseInt(articleId), {
            status: 'pending' as any,
            changeSummary: 'Soumission pour validation (aucun changement)',
          });
        } else {
          updatedArticle = await articleService.update(parseInt(articleId), dtoToSend);
        }

        if (updatedArticle.status === 'rejected') {
          const rejectionMessage = (updatedArticle as any).rejectionReason || 'Contenu inapproprié ou doublon détecté';
          showToast('error', `❌ Article rejeté : ${rejectionMessage}`);
          setTimeout(() => { onClose(); }, 1500);
          return;
        } else if (updatedArticle.status === 'pending') {
          showToast('success', '✅ Article soumis pour validation !');
        } else if (updatedArticle.status === 'published') {
          showToast('success', '✅ Article publié avec succès !');
        } else {
          showToast('success', '✅ Article soumis pour validation !');
        }

        setTimeout(() => {
          resetForm();
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        const createdArticle = await handleCreateWithFiles('pending');

        if (createdArticle.status === 'rejected') {
          const rejectionMessage = createdArticle.rejectionReason || 'Contenu inapproprié ou doublon détecté';
          showToast('error', `❌ Article rejeté : ${rejectionMessage}`);
          setTimeout(() => { onClose(); }, 1500);
          return;
        } else if (createdArticle.status === 'pending') {
          showToast('success', '✅ Article soumis pour validation !');
        } else if (createdArticle.status === 'published') {
          showToast('success', '✅ Article publié avec succès !');
        } else {
          showToast('success', '✅ Article soumis pour validation !');
        }

        setTimeout(() => {
          resetForm();
          onSuccess?.();
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      showToast('error', `❌ ${error.message || 'Erreur lors de la soumission'}`);
      setTimeout(() => { onClose(); }, 2000);
    } finally {
      setIsSubmittingPending(false);
    }
  };

  const insertMarkdown = (type: string) => {
    const textarea = markdownEditorRef.current?.getTextarea?.() || textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = content.substring(start, end);
    let newText = content;
    let cur = start;

    const wrap = (before: string, after: string, fallback: string) => {
      const inner = sel || fallback;
      newText = content.substring(0, start) + before + inner + after + content.substring(end);
      cur = start + before.length + inner.length + after.length;
    };
    const prefix = (pre: string, fallback: string) => {
      const inner = sel || fallback;
      newText = content.substring(0, start) + pre + inner + '\n' + content.substring(end);
      cur = start + pre.length + inner.length + 1;
    };

    switch (type) {
      case 'heading1': prefix('# ', 'Titre 1'); break;
      case 'heading2': prefix('## ', 'Titre 2'); break;
      case 'heading3': prefix('### ', 'Titre 3'); break;
      case 'bold': wrap('**', '**', 'texte en gras'); break;
      case 'italic': wrap('*', '*', 'texte en italique'); break;
      case 'code': wrap('`', '`', 'code'); break;
      case 'quote': prefix('> ', 'Citation'); break;
      case 'list': prefix('- ', 'élément de liste'); break;
      case 'orderedlist': prefix('1. ', 'élément numéroté'); break;
      case 'checkbox': prefix('- [ ] ', 'tâche à faire'); break;
      case 'hr':
        newText = content.substring(0, start) + '\n---\n' + content.substring(end);
        cur = start + 5;
        break;
      case 'codeblock': {
        const lang = prompt('Langage du code :', 'javascript') || '';
        const inner = sel || '// Votre code ici';
        newText = content.substring(0, start) + `\`\`\`${lang}\n${inner}\n\`\`\`\n` + content.substring(end);
        cur = start + lang.length + inner.length + 8;
        break;
      }
      case 'link': {
        const url = prompt('URL du lien :', 'https://');
        if (!url) return;
        const inner = sel || 'texte du lien';
        newText = content.substring(0, start) + `[${inner}](${url})` + content.substring(end);
        cur = start + inner.length + url.length + 4;
        break;
      }
      case 'table':
        newText =
          content.substring(0, start) +
          '\n| Colonne 1 | Colonne 2 | Colonne 3 |\n' +
          '|-----------|-----------|-----------|\n' +
          '| Cellule 1 | Cellule 2 | Cellule 3 |\n' +
          '| Cellule 4 | Cellule 5 | Cellule 6 |\n' +
          content.substring(end);
        cur = start + 15;
        break;
      default: return;
    }

    setContent(newText);
    setTimeout(() => {
      const ta = markdownEditorRef.current?.getTextarea?.() || textareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(cur, cur); }
    }, 0);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setContent('');
    setSelectedTags([]);
    setChangeSummary('');
    setShowPreview(false);
    setOriginalArticle(null);
    pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.localUrl));
    setPendingFiles([]);
  };

  useEffect(() => {
    const map: Record<string, string> = {
      b: 'bold', i: 'italic', k: 'link', e: 'code',
      '1': 'heading1', '2': 'heading2', '3': 'heading3',
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const ta = markdownEditorRef.current?.getTextarea?.() || textareaRef.current;
      if (!ta || ta !== document.activeElement || !(e.ctrlKey || e.metaKey)) return;
      if (map[e.key]) { e.preventDefault(); insertMarkdown(map[e.key]); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, content]);

  if (!isOpen) return null;

  const modalTitle = isEditMode ? "Modifier l'article" : 'Créer un article';
  const draftButtonText = isEditMode ? 'Mettre à jour le brouillon' : 'Sauvegarder brouillon';
  const submitButtonText = isEditMode ? 'Mettre à jour et soumettre' : 'Soumettre pour validation';

  const isSubmitting = isSubmittingDraft || isSubmittingPending;

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        />

        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{modalTitle}</h2>
              {isEditMode && originalArticle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Statut actuel : <span className="font-medium">{(originalArticle as any).status}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-8 py-6 custom-scrollbar">
            {isLoadingData || (isEditMode && isLoadingArticle) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {isLoadingArticle ? "Chargement de l'article..." : 'Chargement...'}
                </span>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Donnez un titre accrocheur à votre article..."
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white appearance-none bg-white dark:bg-gray-800 cursor-pointer disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pending files indicator */}
                {pendingFiles.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                      📎 {pendingFiles.length} image{pendingFiles.length > 1 ? 's' : ''} en attente d'envoi
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pendingFiles.map((pf, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-400"
                        >
                          <img src={pf.localUrl} alt={pf.file.name} className="w-6 h-6 object-cover rounded" />
                          <span className="truncate max-w-[120px]">{pf.file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(pf.localUrl);
                              setContent((prev) =>
                                prev.replace(
                                  new RegExp(`\\n?!\\[[^\\]]*\\]\\(${escapeRegExp(pf.localUrl)}\\)\\n?`, 'g'),
                                  ''
                                )
                              );
                              setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="hover:text-red-500 transition-colors ml-1 flex-shrink-0"
                            title="Retirer cette image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Markdown Editor */}
                <MarkdownEditor
                  ref={markdownEditorRef}
                  content={content}
                  setContent={setContent}
                  isSubmitting={isSubmitting}
                  isUploadingImage={isUploadingImage}
                  uploadProgress={uploadProgress}
                  fileInputRef={fileInputRef}
                  insertMarkdown={insertMarkdown}
                  handleImageUpload={handleImageUpload}
                  showPreview={showPreview}
                  setShowPreview={setShowPreview}
                />

                {/* Tags Selector */}
                <TagsSelector
                  availableTags={availableTags}
                  selectedTags={selectedTags}
                  toggleTag={toggleTag}
                  isSubmitting={isSubmitting}
                  onCreateTag={handleCreateTag}
                  articleTitle={title}
                  articleContent={content}
                  onTagsUpdated={refreshTags}
                />

                {/* Change Summary — edit mode only */}
                {isEditMode && (
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Résumé des modifications
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      Décrivez brièvement ce que vous avez changé (visible dans l'historique des versions).
                    </p>
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Ex : Correction de fautes, ajout d'une section, mise à jour des sources…"
                      maxLength={200}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-sm"
                    />
                    <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {changeSummary.length}/200
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-8 py-5 flex items-center justify-between z-10">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>💡</span>
              <span>Ctrl+B gras · Ctrl+I italique · Ctrl+K lien · Ctrl+E code</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmittingDraft || isLoadingData || (isEditMode && isLoadingArticle)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingDraft && <Loader2 size={18} className="animate-spin" />}
                {draftButtonText}
              </button>
              <button
                onClick={handleSubmitForValidation}
                disabled={isSubmittingPending || isLoadingData || (isEditMode && isLoadingArticle)}
                className="px-6 py-2.5 bg-[#168F6F] text-white font-medium rounded-lg hover:bg-[#0F6B54] transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingPending && <Loader2 size={18} className="animate-spin" />}
                {submitButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[999999] space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-lg shadow-2xl backdrop-blur-sm animate-slideIn ${toast.type === 'success' ? 'bg-green-600 text-white'
              : toast.type === 'error' ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
              }`}
          >
            <p className="font-medium">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="hover:opacity-80 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideUp  { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
        .animate-slideUp  { animation: slideUp  0.3s cubic-bezier(0.16,1,0.3,1); }
        .animate-fadeIn   { animation: fadeIn   0.2s ease-out; }
        .animate-slideIn  { animation: slideIn  0.3s cubic-bezier(0.16,1,0.3,1); }
        .custom-scrollbar::-webkit-scrollbar { width:8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:#f1f5f9; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-track { background:#1e293b; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background:#475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#64748b; }
      `}</style>
    </>
  );
}
