// components/modals/EditTagModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface EditTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: { id: string; name: string; count?: number };
  onUpdateTag: (id: string, newName: string) => Promise<void>;
}

export default function EditTagModal({ isOpen, onClose, tag, onUpdateTag }: EditTagModalProps) {
  const { t } = useTranslation();
  const [tagName, setTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tag) {
      setTagName(tag.name.replace(/^#+/, ''));
      setError(null);
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await onUpdateTag(tag.id, tagName.trim());
    } catch (err: any) {
      setError(err.message || t('tags_page.modal_edit_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Ajouter une classe pour le flou global
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay avec z-index extrêmement élevé */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[99999]"
            onClick={onClose}
          />
          
          {/* Modal avec z-index encore plus élevé */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('tags_page.edit_modal_title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('tags_page.edit_modal_subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div className="mb-6">
                  <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tags_page.modal_name_label')}
                  </label>
                  <input
                    type="text"
                    id="tagName"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value.replace(/^#+/, ''))}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Ex: react, javascript, nextjs"
                    autoFocus
                    disabled={isLoading}
                  />
                  {tag.count !== undefined && (
                    <p className="mt-2 text-sm text-gray-500">
                      {t('tags_page.modal_usage', { count: tag.count })}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                  >
                    {t('tags_page.modal_cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !tagName.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('tags_page.modal_updating') : t('tags_page.modal_update_btn')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}