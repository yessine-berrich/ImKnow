'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Hash } from 'lucide-react';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTag: (tagName: string) => void;
}

export default function CreateTagModal({
  isOpen,
  onClose,
  onCreateTag,
}: CreateTagModalProps) {
  const [tagName, setTagName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 500));
      onCreateTag(tagName.trim());
      setTagName('');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Créer un nouveau tag
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ajoutez un tag pour organiser vos articles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du tag <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Hash className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ex: React, TypeScript, IA..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Utilisez des noms descriptifs et pertinents
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!tagName.trim() || isSubmitting}
              className={`px-4 py-2.5 font-medium rounded-lg transition-all ${
                !tagName.trim() || isSubmitting
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isSubmitting ? 'Création...' : 'Créer le tag'}
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