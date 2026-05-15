'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Folder, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (category: {
    name: string;
    description: string;
  }) => Promise<void> | void;
  editCategory?: {
    id: string | number;
    name: string;
    description: string;
  } | null;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onCreateCategory,
  editCategory,
}: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, description: false });
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Validation
  const nameError = touched.name && !name.trim() 
    ? 'Le nom est requis' 
    : name.trim().length > 50 
    ? 'Le nom ne doit pas dépasser 50 caractères'
    : null;
    
  const descriptionError = touched.description && !description.trim()
    ? 'La description est requise'
    : description.trim().length > 200
    ? 'La description ne doit pas dépasser 200 caractères'
    : null;

  const isValid = name.trim() && description.trim() 
    && name.trim().length <= 50 
    && description.trim().length <= 200;

  // Populate form when editing
  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setDescription(editCategory.description);
    }
  }, [editCategory]);

  // Reset form when opening for create
  useEffect(() => {
    if (isOpen && !editCategory) {
      setName('');
      setDescription('');
      setTouched({ name: false, description: false });
      setError(null);
    }
  }, [isOpen, editCategory]);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key and handle outside clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && isOpen && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isSubmitting]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation complète avant soumission
    setTouched({ name: true, description: true });
    
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateCategory({ 
        name: name.trim(), 
        description: description.trim()
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = (field: 'name' | 'description') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Overlay with backdrop blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slideUp max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header with gradient */}
        <div className="relative px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Folder className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {editCategory ? 'Modifiez les informations ci-dessous' : 'Créez une nouvelle catégorie pour organiser vos articles'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {error}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    Veuillez réessayer ou contacter le support.
                  </p>
                </div>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom de la catégorie <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Ex: Frontend, Backend, DevOps..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 pr-12 ${
                    nameError
                      ? 'border-red-500 dark:border-red-500'
                      : touched.name && name.trim()
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  disabled={isSubmitting}
                  maxLength={50}
                />
                {touched.name && name.trim() && !nameError && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex justify-between items-center">
                {nameError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {nameError}
                  </p>
                )}
                <p className={`text-xs ml-auto ${name.length > 45 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {name.length}/50
                </p>
              </div>
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleBlur('description')}
                  placeholder="Décrivez cette catégorie et son contenu..."
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none pr-12 ${
                    descriptionError
                      ? 'border-red-500 dark:border-red-500'
                      : touched.description && description.trim()
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  disabled={isSubmitting}
                  maxLength={200}
                />
                {touched.description && description.trim() && !descriptionError && (
                  <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex justify-between items-center">
                {descriptionError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {descriptionError}
                  </p>
                )}
                <p className={`text-xs ml-auto ${description.length > 180 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {description.length}/200
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border border-blue-100 dark:border-gray-700 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    Conseils pour une bonne catégorie :
                  </p>
                  <ul className="mt-1.5 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500">•</span>
                      Utilisez un nom court et évocateur (2-3 mots maximum)
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500">•</span>
                      Décrivez le type d'articles que vous y placerez
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500">•</span>
                      Évitez les noms trop génériques comme "Divers" ou "Autre"
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview (if both fields are filled) */}
            {name.trim() && description.trim() && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Aperçu de la catégorie :
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="min-w-[120px] px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-600 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editCategory ? 'Modification...' : 'Création...'}
                </>
              ) : (
                editCategory ? 'Enregistrer' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}