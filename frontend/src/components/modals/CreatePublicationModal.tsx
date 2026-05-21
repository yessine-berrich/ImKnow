'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import MarkdownEditor, { MarkdownEditorRef } from '../markdoun-editor/MarkdownEditor';
import TagsSelector from '../tags/TagsSelector';
import { publicationService } from '../../../services/publication.service';
import type { UpdatePublicationDto } from '../../../services/publication.service';
import type { Publication } from '../../../services/publication.service';
import { toast } from '@/components/modals/ToastContainer';
import { useTranslation } from '@/context/LanguageContext';

interface CreatePublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  publicationId?: string;
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

export default function CreatePublicationModal({
  isOpen,
  onClose,
  onSuccess,
  publicationId,
}: CreatePublicationModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<number | ''>('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [changeSummary, setChangeSummary] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);

  const [isUploadingImage] = useState(false);
  const [uploadProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPublication, setIsLoadingPublication] = useState(false);
  const [originalPublication, setOriginalPublication] = useState<Publication | null>(null);

  const markdownEditorRef = useRef<MarkdownEditorRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tagsVersion, setTagsVersion] = useState(0);
  const isEditMode = !!publicationId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (isEditMode) {
        loadPublicationData();
      } else {
        resetForm();
      }
    }
    return () => {
      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.localUrl));
    };
  }, [isOpen, publicationId]);

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
      toast.error(t('create_pub_modal.toast_load_error'));
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
      throw new Error(error.message || t('create_pub_modal.error_create_tag'));
    }
    const newTag = await response.json();
    setAvailableTags((prev) => [...prev, { id: newTag.id, name: newTag.name }]);
    return newTag;
  };

  const loadPublicationData = async () => {
    if (!publicationId) return;
    setIsLoadingPublication(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/publications/${publicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const publication = await res.json();

      setOriginalPublication(publication as any);
      setTitle(publication.title || '');
      setCategory(publication.category?.id || '');
      setContent(publication.content || '');

      const rawTags: any[] = publication.tags || [];

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
      toast.error(error.message || t('create_pub_modal.toast_pub_load_error'));
    } finally {
      setIsLoadingPublication(false);
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
    } catch {
      // ignore
    }
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const validateForm = () => {
    if (!title.trim()) { toast.error(t('create_pub_modal.validate_title_required')); return false; }
    if (!category) { toast.error(t('create_pub_modal.validate_category_required')); return false; }
    if (!content.trim()) { toast.error(t('create_pub_modal.validate_content_required')); return false; }
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

      if (!validTypes.includes(file.type)) {
        toast.error(t('create_pub_modal.toast_unsupported_type', { name: file.name }));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('create_pub_modal.toast_file_too_large', { name: file.name }));
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

      toast.success(t('create_pub_modal.toast_file_added', { name: file.name }));
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
    selectedTags.forEach((id) => fd.append('tagIds', String(id)));
    pendingFiles.forEach(({ file }) => fd.append('files', file));
    return fd;
  };

  const handleCreateWithFiles = async (status: 'draft' | 'pending'): Promise<any> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const fd = buildCreateFormData(status);

    const response = await fetch(`${API_URL}/publications`, {
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
        await fetch(`${API_URL}/publications/${created.id}`, {
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
  ): (UpdatePublicationDto & { hasChanges: boolean }) | null => {
    if (!isEditMode || !originalPublication) return null;

    const dto: UpdatePublicationDto = {};
    let hasChanges = false;

    if (title !== originalPublication.title) { dto.title = title; hasChanges = true; }
    if (content !== originalPublication.content) { dto.content = content; hasChanges = true; }
    if (category !== (originalPublication.category as any)?.id) { dto.categoryId = category as number; hasChanges = true; }

    const rawOrigTags: any[] = (originalPublication as any).tags ?? [];
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
    dto.changeSummary = changeSummary.trim() || (status === 'draft' ? t('create_pub_modal.change_summary_draft') : t('create_pub_modal.change_summary_submit'));

    return { ...dto, hasChanges };
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSubmittingDraft(true);
    try {
      if (isEditMode && publicationId) {
        const updateDto = buildUpdateDto('draft');
        if (!updateDto?.hasChanges) { toast.info(t('create_pub_modal.toast_no_changes')); return; }
        const { hasChanges, ...dtoToSend } = updateDto;
        await publicationService.update(parseInt(publicationId), dtoToSend);
        toast.success(t('create_pub_modal.toast_draft_updated'));
        setOriginalPublication((prev) =>
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
        toast.success(t('create_pub_modal.toast_draft_saved'));
      }
      setTimeout(() => { resetForm(); onSuccess?.(); if (!isEditMode) onClose(); }, 1000);
    } catch (error: any) {
      toast.error(error.message || t('create_pub_modal.toast_save_error'));
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const handleSubmitForValidation = async () => {
    if (!validateForm()) return;
    setIsSubmittingPending(true);
    try {
      if (isEditMode && publicationId) {
        const updateDto = buildUpdateDto('pending');
        if (!updateDto) { toast.error(t('create_pub_modal.toast_build_error')); return; }

        const { hasChanges, ...dtoToSend } = updateDto;
        const hasContentChanges = Object.keys(dtoToSend).some(
          (k) => !['status', 'changeSummary'].includes(k)
        );

        let updatedPublication;
        if (!hasContentChanges) {
          updatedPublication = await publicationService.update(parseInt(publicationId), {
            status: 'pending' as any,
            changeSummary: t('create_pub_modal.change_summary_no_change'),
          });
        } else {
          updatedPublication = await publicationService.update(parseInt(publicationId), dtoToSend);
        }

        if (updatedPublication.status === 'rejected') {
          const rejectionMessage = (updatedPublication as any).rejectionReason || t('create_pub_modal.rejection_default');
          toast.error(t('create_pub_modal.toast_rejected', { reason: rejectionMessage }));
          setTimeout(() => { onClose(); }, 1500);
          return;
        } else if (updatedPublication.status === 'pending') {
          toast.success(t('create_pub_modal.toast_submitted'));
        } else if (updatedPublication.status === 'published') {
          toast.success(t('create_pub_modal.toast_published'));
        } else {
          toast.success(t('create_pub_modal.toast_submitted'));
        }

        setTimeout(() => {
          resetForm();
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        const createdPublication = await handleCreateWithFiles('pending');

        if (createdPublication.status === 'rejected') {
          const rejectionMessage = createdPublication.rejectionReason || t('create_pub_modal.rejection_default');
          toast.error(t('create_pub_modal.toast_rejected', { reason: rejectionMessage }));
          setTimeout(() => { onClose(); }, 1500);
          return;
        } else if (createdPublication.status === 'pending') {
          toast.success(t('create_pub_modal.toast_submitted'));
        } else if (createdPublication.status === 'published') {
          toast.success(t('create_pub_modal.toast_published'));
        } else {
          toast.success(t('create_pub_modal.toast_submitted'));
        }

        setTimeout(() => {
          resetForm();
          onSuccess?.();
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || t('create_pub_modal.toast_submit_error'));
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
      case 'heading1': prefix('# ', t('create_pub_modal.md_heading1')); break;
      case 'heading2': prefix('## ', t('create_pub_modal.md_heading2')); break;
      case 'heading3': prefix('### ', t('create_pub_modal.md_heading3')); break;
      case 'bold': wrap('**', '**', t('create_pub_modal.md_bold')); break;
      case 'italic': wrap('*', '*', t('create_pub_modal.md_italic')); break;
      case 'code': wrap('`', '`', t('create_pub_modal.md_code')); break;
      case 'quote': prefix('> ', t('create_pub_modal.md_quote')); break;
      case 'list': prefix('- ', t('create_pub_modal.md_list')); break;
      case 'orderedlist': prefix('1. ', t('create_pub_modal.md_ordered_list')); break;
      case 'checkbox': prefix('- [ ] ', t('create_pub_modal.md_checkbox')); break;
      case 'hr':
        newText = content.substring(0, start) + '\n---\n' + content.substring(end);
        cur = start + 5;
        break;
      case 'codeblock': {
        const inner = sel || t('create_pub_modal.md_code_placeholder');
        newText = content.substring(0, start) + `\`\`\`javascript\n${inner}\n\`\`\`\n` + content.substring(end);
        cur = start + 'javascript'.length + inner.length + 8;
        break;
      }
      case 'link': {
        const inner = sel || t('create_pub_modal.md_link_text');
        newText = content.substring(0, start) + `[${inner}](https://)` + content.substring(end);
        cur = start + inner.length + 'https://'.length + 4;
        break;
      }
      case 'table':
        newText =
          content.substring(0, start) +
          `\n| ${t('create_pub_modal.md_col1')} | ${t('create_pub_modal.md_col2')} | ${t('create_pub_modal.md_col3')} |\n` +
          '|-----------|-----------|-----------|\n' +
          `| ${t('create_pub_modal.md_cell1')} | ${t('create_pub_modal.md_cell2')} | ${t('create_pub_modal.md_cell3')} |\n` +
          `| ${t('create_pub_modal.md_cell4')} | ${t('create_pub_modal.md_cell5')} | ${t('create_pub_modal.md_cell6')} |\n` +
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
    setOriginalPublication(null);
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

  const modalTitle = isEditMode ? t('create_pub_modal.title_edit') : t('create_pub_modal.title_create');
  const draftButtonText = isEditMode ? t('create_pub_modal.btn_update_draft') : t('create_pub_modal.btn_save_draft');
  const submitButtonText = isEditMode ? t('create_pub_modal.btn_update_submit') : t('create_pub_modal.btn_submit');

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
              {isEditMode && originalPublication && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('create_pub_modal.current_status')} <span className="font-medium">{(originalPublication as any).status}</span>
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
            {isLoadingData || (isEditMode && isLoadingPublication) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {isLoadingPublication ? t('create_pub_modal.loading_pub') : t('create_pub_modal.loading')}
                </span>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('create_pub_modal.label_title')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('create_pub_modal.placeholder_title')}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('create_pub_modal.label_category')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white appearance-none bg-white dark:bg-gray-800 cursor-pointer disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('create_pub_modal.select_category')}</option>
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
                      {pendingFiles.length === 1
                        ? t('create_pub_modal.pending_files_one', { count: pendingFiles.length })
                        : t('create_pub_modal.pending_files_plural', { count: pendingFiles.length })}
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
                            title={t('create_pub_modal.remove_image')}
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
                  publicationTitle={title}
                  publicationContent={content}
                  onTagsUpdated={refreshTags}
                />

                {/* Change Summary — edit mode only */}
                {isEditMode && (
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('create_pub_modal.label_change_summary')}
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      {t('create_pub_modal.hint_change_summary')}
                    </p>
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder={t('create_pub_modal.placeholder_change_summary')}
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
              <span>{t('create_pub_modal.keyboard_shortcuts')}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmittingDraft || isLoadingData || (isEditMode && isLoadingPublication)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingDraft && <Loader2 size={18} className="animate-spin" />}
                {draftButtonText}
              </button>
              <button
                onClick={handleSubmitForValidation}
                disabled={isSubmittingPending || isLoadingData || (isEditMode && isLoadingPublication)}
                className="px-6 py-2.5 bg-[#168F6F] text-white font-medium rounded-lg hover:bg-[#0F6B54] transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingPending && <Loader2 size={18} className="animate-spin" />}
                {submitButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp  { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        .animate-slideUp  { animation: slideUp  0.3s cubic-bezier(0.16,1,0.3,1); }
        .animate-fadeIn   { animation: fadeIn   0.2s ease-out; }
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
