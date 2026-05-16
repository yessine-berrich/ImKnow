'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, Check, AlertCircle, Sparkles, Loader2, Hash } from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';

interface Tag {
  id: number;
  name: string;
}

interface TagsSelectorProps {
  availableTags: Tag[];
  selectedTags: number[];
  toggleTag: (tagId: number) => void;
  isSubmitting: boolean;
  onCreateTag?: (tagName: string) => Promise<Tag | void>;
  articleTitle?: string;
  articleContent?: string;
  onTagsUpdated?: () => void;
}

const formatTagName = (input: string): string => {
  let name = input
    .replace(/^#+/, '')       // strip leading #
    .replace(/^[\s\-_]+/, '') // strip leading spaces, hyphens, underscores
    .replace(/[\s\-_]+$/, '') // strip trailing
    .trim();
  if (!name) return '';
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return `#${name}`;
};

const wordCount = (input: string): number =>
  input.replace(/^#+/, '').trim().split(/\s+/).filter(Boolean).length;

export default function TagsSelector({
  availableTags,
  selectedTags,
  toggleTag,
  isSubmitting,
  onCreateTag,
  articleTitle = '',
  articleContent = '',
  onTagsUpdated,
}: TagsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedExisting, setSuggestedExisting] = useState<Tag[]>([]);
  const [suggestedNew, setSuggestedNew] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  // Build dropdown items: filtered tags + optional "Create" entry
  const filteredTags = searchQuery.trim()
    ? availableTags
        .filter((t) => t.name.toLowerCase().replace(/^#/, '').includes(searchQuery.toLowerCase().replace(/^#/, '')))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
    : [];

  const formattedNew = searchQuery.trim() ? formatTagName(searchQuery) : '';
  const tooManyWords = wordCount(searchQuery) > 3;
  const canCreate =
    !!formattedNew &&
    !tooManyWords &&
    !!onCreateTag &&
    !availableTags.some((t) => t.name.toLowerCase() === formattedNew.toLowerCase());

  // total items in dropdown: filtered tags + (1 if canCreate)
  const dropdownSize = filteredTags.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setShowDropdown(searchQuery.trim().length > 0 && (dropdownSize > 0 || tooManyWords));
    setActiveIndex(-1);
  }, [searchQuery, dropdownSize, tooManyWords]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleSelectTag = (tag: Tag) => {
    toggleTag(tag.id);
    setSearchQuery('');
    setShowDropdown(false);
    if (!selectedTags.includes(tag.id)) {
      showFeedback(`${tag.name} ajouté`, 'success');
    }
  };

  const handleCreateTag = useCallback(async (name = searchQuery) => {
    if (!name.trim() || !onCreateTag) return;
    const formatted = formatTagName(name);
    const existing = availableTags.find((t) => t.name.toLowerCase() === formatted.toLowerCase());
    if (existing) {
      toggleTag(existing.id);
      setSearchQuery('');
      setShowDropdown(false);
      return;
    }
    setIsCreating(true);
    try {
      const newTag = await onCreateTag(formatted);
      if (newTag && 'id' in newTag) {
        toggleTag((newTag as Tag).id);
        onTagsUpdated?.();
        showFeedback(`${formatted} créé et ajouté`, 'success');
      }
      setSearchQuery('');
      setShowDropdown(false);
    } catch {
      showFeedback('Erreur lors de la création', 'error');
    } finally {
      setIsCreating(false);
    }
  }, [searchQuery, availableTags, onCreateTag, toggleTag, onTagsUpdated]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, dropdownSize - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (tooManyWords) return;
      if (activeIndex >= 0 && activeIndex < filteredTags.length) {
        handleSelectTag(filteredTags[activeIndex]);
      } else if (activeIndex === filteredTags.length && canCreate) {
        handleCreateTag();
      } else if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0]);
      } else if (canCreate) {
        handleCreateTag();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleSuggestTags = async () => {
    if (!articleTitle?.trim() && !articleContent?.trim()) {
      setSuggestionError('Ajoutez un titre ou du contenu avant de suggérer des tags.');
      setShowSuggestions(true);
      return;
    }
    setIsSuggesting(true);
    setSuggestionError(null);
    setShowSuggestions(true);
    setSuggestedExisting([]);
    setSuggestedNew([]);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/tags/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: articleTitle || '', content: articleContent || '' }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      const existingNotSelected = (data.existingTags || []).filter(
        (tag: Tag) => !selectedTags.includes(tag.id)
      );
      setSuggestedExisting(existingNotSelected);
      setSuggestedNew(data.newSuggestions || []);
    } catch {
      setSuggestionError('Échec de la suggestion. Réessayez.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddExistingSuggestion = (tag: Tag) => {
    if (!selectedTags.includes(tag.id)) toggleTag(tag.id);
    setSuggestedExisting((prev) => prev.filter((t) => t.id !== tag.id));
  };

  const handleAddNewSuggestion = async (name: string) => {
    setCreatingTag(name);
    try {
      const formatted = formatTagName(name);
      const existing = availableTags.find((t) => t.name.toLowerCase() === formatted.toLowerCase());
      if (existing) {
        if (!selectedTags.includes(existing.id)) toggleTag(existing.id);
      } else if (onCreateTag) {
        const created = await onCreateTag(formatted);
        if (created && 'id' in created) {
          toggleTag((created as Tag).id);
          onTagsUpdated?.();
        }
      }
      setSuggestedNew((prev) => prev.filter((s) => s !== name));
    } catch {
      showFeedback('Erreur lors de la création du tag suggéré', 'error');
    } finally {
      setCreatingTag(null);
    }
  };

  const handleAddAllSuggestions = async () => {
    for (const tag of suggestedExisting) handleAddExistingSuggestion(tag);
    for (const name of suggestedNew) await handleAddNewSuggestion(name);
  };

  const selectedTagsData = selectedTags
    .map((id) => availableTags.find((t) => t.id === id))
    .filter((t): t is Tag => t !== undefined);

  const hasSuggestions = suggestedExisting.length > 0 || suggestedNew.length > 0;
  const allSuggestionsUsed = showSuggestions && !isSuggesting && !hasSuggestions && !suggestionError;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Tags <span className="text-red-500">*</span>
          </label>
          {selectedTagsData.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#168F6F] text-white">
              {selectedTagsData.length}
            </span>
          )}
        </div>

        {(articleTitle || articleContent) && (
          <button
            type="button"
            onClick={handleSuggestTags}
            disabled={isSubmitting || isSuggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
              bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-700
              hover:from-violet-100 hover:to-purple-100 hover:border-violet-300
              dark:from-violet-900/20 dark:to-purple-900/20 dark:border-violet-700 dark:text-violet-400
              dark:hover:from-violet-900/30 dark:hover:to-purple-900/30
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSuggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {isSuggesting ? 'Analyse en cours…' : 'Suggérer via IA'}
          </button>
        )}
      </div>

      {/* AI Suggestions panel */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 dark:border-violet-800">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
                <Sparkles size={12} /> Suggestions IA
              </span>
              <div className="flex items-center gap-2">
                {hasSuggestions && !isSuggesting && (
                  <button
                    type="button"
                    onClick={handleAddAllSuggestions}
                    className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 underline underline-offset-2 transition-colors"
                  >
                    Tout ajouter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    setSuggestedExisting([]);
                    setSuggestedNew([]);
                    setSuggestionError(null);
                  }}
                  className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              {isSuggesting ? (
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 py-1">
                  <Loader2 size={13} className="animate-spin" />
                  L'IA analyse le contenu de votre article…
                </div>
              ) : suggestionError ? (
                <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {suggestionError}
                </p>
              ) : allSuggestionsUsed ? (
                <p className="text-xs text-violet-500 dark:text-violet-400 italic flex items-center gap-1.5">
                  <Check size={12} /> Toutes les suggestions ont été ajoutées.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestedExisting.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                        Tags existants
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedExisting.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleAddExistingSuggestion(tag)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border font-medium transition-all
                              bg-white dark:bg-gray-800 border-violet-200 dark:border-violet-700
                              text-violet-700 dark:text-violet-400
                              hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:border-violet-400
                              disabled:opacity-50"
                          >
                            <Plus size={10} /> {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestedNew.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                        Nouveaux tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedNew.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleAddNewSuggestion(name)}
                            disabled={creatingTag === name || isSubmitting}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border font-medium transition-all
                              bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-700
                              text-amber-700 dark:text-amber-400
                              hover:bg-amber-50 dark:hover:bg-amber-900/20
                              disabled:opacity-60"
                          >
                            {creatingTag === name ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Plus size={10} />
                            )}
                            {formatTagName(name)}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                        Ces tags seront créés sur la plateforme.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && dropdownSize > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher ou créer un tag (ex: react → #React)"
          disabled={isSubmitting || isCreating}
          className={`w-full pl-9 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-800 disabled:opacity-50 ${
            tooManyWords
              ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-400'
              : 'border-gray-300 dark:border-gray-700 focus:ring-[#168F6F]'
          }`}
        />
        {(isCreating) && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#168F6F] animate-spin" />
        )}

        {/* Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
            >
              {filteredTags.length > 0 && (
                <div className="py-1 max-h-48 overflow-y-auto">
                  {filteredTags.map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag.id);
                    const isActive = activeIndex === idx;
                    return (
                      <button
                        key={tag.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectTag(tag)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20'
                            : isSelected
                            ? 'bg-[#168F6F]/5 dark:bg-[#168F6F]/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Hash size={12} className="text-gray-400 flex-shrink-0" />
                          <span className={`text-sm font-mono ${isSelected ? 'text-[#168F6F] font-semibold' : 'text-gray-800 dark:text-gray-200'}`}>
                            {tag.name}
                          </span>
                        </div>
                        {isSelected && <Check size={14} className="text-[#168F6F] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {tooManyWords ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  Un tag ne peut pas dépasser 3 mots
                </div>
              ) : canCreate ? (
                <>
                  {filteredTags.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700" />
                  )}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCreateTag()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      activeIndex === filteredTags.length
                        ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20'
                        : 'hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10'
                    }`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#168F6F] text-white flex-shrink-0">
                      <Plus size={11} />
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Créer{' '}
                      <span className="font-mono font-semibold text-[#168F6F]">{formattedNew}</span>
                    </span>
                  </button>
                </>
              ) : null}

              {!tooManyWords && (
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400">
                    ↑↓ naviguer · Entrée sélectionner · Échap fermer
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline feedback */}
        <AnimatePresence>
          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`absolute mt-1 w-full rounded-lg p-2 text-xs flex items-center gap-1.5 z-20 ${
                feedbackMsg.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}
            >
              {feedbackMsg.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
              {feedbackMsg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected tags */}
      <AnimatePresence>
        {selectedTagsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {selectedTagsData.map((tag) => (
                <motion.span
                  key={tag.id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] border border-[#168F6F]/20 dark:border-[#168F6F]/30 rounded-full text-xs font-mono font-medium"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-[#168F6F]/20 dark:hover:bg-[#168F6F]/30 transition-colors disabled:opacity-50"
                  >
                    <X size={10} />
                  </button>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available tags cloud */}
      <div>
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          Tags disponibles
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          {availableTags.length > 0 ? (
            availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  disabled={isSubmitting}
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all disabled:opacity-50 ${
                    isSelected
                      ? 'bg-[#168F6F] text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#168F6F]/40 hover:text-[#168F6F] dark:hover:text-[#168F6F]'
                  }`}
                >
                  {tag.name}
                </button>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
              Aucun tag disponible. Créez-en un via la recherche.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
