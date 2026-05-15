'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
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
  onTagsUpdated?: () => void; // Callback pour rafraîchir les tags après création
}

const formatTagName = (input: string): string => {
  let name = input.replace(/^#+/, '');
  name = name.trim();
  if (name.length === 0) return '';
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return `#${name}`;
};

export default function TagsSelector({
  availableTags,
  selectedTags,
  toggleTag,
  isSubmitting,
  onCreateTag,
  articleTitle = '',
  articleContent = '',
  onTagsUpdated
}: TagsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedExisting, setSuggestedExisting] = useState<Tag[]>([]);
  const [suggestedNew, setSuggestedNew] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  // Filtrer les tags
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags([]);
      setShowDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase().replace(/^#/, '');
    const filtered = availableTags
      .filter(tag => tag.name.toLowerCase().replace(/^#/, '').includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);

    setFilteredTags(filtered);
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, availableTags]);

  // Fermer le dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tag: Tag) => {
    toggleTag(tag.id);
    setSearchQuery('');
    setShowDropdown(false);
    setSuccessMessage(`Tag ${tag.name} sélectionné`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim() || !onCreateTag) return;

    const formattedName = formatTagName(searchQuery);
    
    const existingTag = availableTags.find(
      tag => tag.name.toLowerCase() === formattedName.toLowerCase()
    );

    if (existingTag) {
      setErrorMessage(`Le tag ${formattedName} existe déjà !`);
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(formattedName);
      
      if (newTag && 'id' in newTag) {
        toggleTag((newTag as Tag).id);
        setSuccessMessage(`Tag ${formattedName} créé et sélectionné !`);
        // Notifier le parent que les tags ont été mis à jour
        onTagsUpdated?.();
      } else {
        setSuccessMessage(`Tag ${formattedName} créé !`);
      }
      
      setSearchQuery('');
      setShowDropdown(false);
    } catch (error) {
      setErrorMessage("Erreur lors de la création du tag");
    } finally {
      setIsCreating(false);
      setTimeout(() => setSuccessMessage(null), 2000);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: articleTitle || '',
          content: articleContent || '',
        }),
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();

      // ✅ Filtrer les tags déjà sélectionnés
      const existingNotSelected = (data.existingTags || []).filter(
        (tag: Tag) => !selectedTags.includes(tag.id)
      );
      
      setSuggestedExisting(existingNotSelected);
      setSuggestedNew(data.newSuggestions || []);
    } catch (err: any) {
      setSuggestionError('Échec de la suggestion de tags. Réessayez.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddExistingSuggestion = (tag: Tag) => {
    if (!selectedTags.includes(tag.id)) {
      toggleTag(tag.id);
    }
    setSuggestedExisting((prev) => prev.filter((t) => t.id !== tag.id));
  };

  const handleAddNewSuggestion = async (name: string) => {
    setCreatingTag(name);
    try {
      const formattedName = name.startsWith('#') ? name : `#${name}`;
      
      // Vérifier si le tag existe déjà
      const existing = availableTags.find(
        (t) => t.name.toLowerCase() === formattedName.toLowerCase()
      );
      
      if (existing) {
        if (!selectedTags.includes(existing.id)) {
          toggleTag(existing.id);
        }
      } else if (onCreateTag) {
        const created = await onCreateTag(formattedName);
        if (created && 'id' in created) {
          toggleTag((created as Tag).id);
          onTagsUpdated?.();
        }
      }
      setSuggestedNew((prev) => prev.filter((s) => s !== name));
    } catch (error) {
      setErrorMessage('Erreur lors de la création du tag suggéré');
    } finally {
      setCreatingTag(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0]);
      } else if (searchQuery.trim() && onCreateTag) {
        handleCreateTag();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectedTagsData = selectedTags
    .map(id => availableTags.find(t => t.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
    
  const hasSuggestions = suggestedExisting.length > 0 || suggestedNew.length > 0;
  const allSuggestionsUsed = showSuggestions && !isSuggesting && !hasSuggestions && !suggestionError;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Tags <span className="text-red-500">*</span>
        </label>

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
            {isSuggesting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {isSuggesting ? 'Analyse en cours…' : 'Suggérer via IA'}
          </button>
        )}
      </div>

      {/* Panneau des suggestions IA */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 dark:border-violet-800">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
                <Sparkles size={12} />
                Suggestions IA
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSuggestions(false);
                  setSuggestedExisting([]);
                  setSuggestedNew([]);
                  setSuggestionError(null);
                }}
                className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-3">
              {isSuggesting ? (
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 py-1">
                  <Loader2 size={13} className="animate-spin" />
                  L'IA analyse le contenu de votre article…
                </div>
              ) : suggestionError ? (
                <p className="text-xs text-red-500 dark:text-red-400">{suggestionError}</p>
              ) : allSuggestionsUsed ? (
                <p className="text-xs text-violet-500 dark:text-violet-400 italic">
                  ✓ Toutes les suggestions ont été ajoutées.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestedExisting.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Tags existants suggérés :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedExisting.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleAddExistingSuggestion(tag)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border font-medium transition-all
                              bg-white dark:bg-gray-800 border-violet-200 dark:border-violet-700 
                              text-violet-700 dark:text-violet-400 
                              hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:border-violet-400"
                          >
                            <Plus size={10} /> {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestedNew.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Nouveaux tags à créer :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedNew.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleAddNewSuggestion(name)}
                            disabled={creatingTag === name || isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border font-medium transition-all
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
                            {name.startsWith('#') ? name : `#${name}`}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                        Ces tags seront créés sur la plateforme lors du clic.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de recherche */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher ou ajouter un tag (ex: java → #Java)"
            disabled={isSubmitting || isCreating}
            className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-800 disabled:opacity-50"
          />
          {searchQuery.trim() && onCreateTag && (
            <button
              onClick={handleCreateTag}
              disabled={isCreating || isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleSelectTag(tag)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedTags.includes(tag.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <span className="text-gray-900 dark:text-white font-mono">{tag.name}</span>
                  {selectedTags.includes(tag.id) && (
                    <Check size={16} className="text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute mt-1 w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 z-20"
            >
              <AlertCircle size={14} />
              {errorMessage}
            </motion.div>
          )}
          
          {successMessage && !errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute mt-1 w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2 z-20"
            >
              <Check size={14} />
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags disponibles */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Tags disponibles :
        </p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          {availableTags.length > 0 ? (
            availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={isSubmitting}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 font-mono ${
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tag.name}
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
              Aucun tag disponible. Commencez par en créer un !
            </p>
          )}
        </div>
      </div>

      {/* Tags sélectionnés */}
      {selectedTagsData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags sélectionnés ({selectedTagsData.length}) :
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTagsData.map((tag) => (
              <span 
                key={tag.id} 
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-mono"
              >
                {tag.name}
                <button 
                  onClick={() => toggleTag(tag.id)}
                  disabled={isSubmitting}
                  className="hover:text-blue-900 dark:hover:text-blue-100 disabled:opacity-50 ml-1"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}