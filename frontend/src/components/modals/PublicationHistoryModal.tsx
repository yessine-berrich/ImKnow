// src/components/modals/PublicationHistoryModal.tsx
'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { X, Clock, User, RotateCcw, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface PublicationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicationId: string;
  publicationTitle: string;
}

interface Version {
  id: number;
  versionNumber: number;
  title: string;
  content: string;
  changeSummary: string;
  createdAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  status: string;
}

export default function PublicationHistoryModal({ 
  isOpen, 
  onClose, 
  publicationId,
  publicationTitle 
}: PublicationHistoryModalProps) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
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

  useEffect(() => {
    if (isOpen && publicationId) {
      fetchHistory();
    }
  }, [isOpen, publicationId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/publications/${publicationId}/history`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : undefined, t));
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (!await confirm('Êtes-vous sûr de vouloir revenir à cette version ?')) return;
    
    setIsReverting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/publications/${publicationId}/revert/${versionNumber}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du retour à la version');
      }

      toast.success('Publication restauré avec succès !');
      onClose();
      // Recharger la page ou rafraîchir les données
      window.location.reload();
    } catch (err) {
      toast.error(translateError(err instanceof Error ? err.message : undefined, t));
    } finally {
      setIsReverting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay avec z-index extrêmement élevé */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[99999]"
          />

          {/* Modal avec z-index encore plus élevé */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Historique des modifications
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {publicationTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement de l'historique...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500 dark:text-red-400">{error}</p>
                    <button
                      onClick={fetchHistory}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucune version
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Cet publication n'a pas encore d'historique de modifications.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {versions.map((version, index) => (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-xl p-4 transition-all ${
                          selectedVersion?.id === version.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                Version {version.versionNumber}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                version.status === 'published' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : version.status === 'draft'
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {version.status === 'published' ? 'Publié' : 
                                 version.status === 'draft' ? 'Brouillon' : 'En attente'}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {version.title}
                            </h3>
                            
                            {version.changeSummary && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                <span className="font-medium">Résumé :</span> {version.changeSummary}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>
                                  {version.author?.firstName} {version.author?.lastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(version.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => setSelectedVersion(
                                selectedVersion?.id === version.id ? null : version
                              )}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Voir les détails"
                            >
                              <ChevronRight className={`w-5 h-5 transition-transform ${
                                selectedVersion?.id === version.id ? 'rotate-90' : ''
                              }`} />
                            </button>
                            
                            {index > 0 && (
                              <button
                                onClick={() => handleRevert(version.versionNumber)}
                                disabled={isReverting}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Restaurer cette version"
                              >
                                <RotateCcw className={`w-5 h-5 ${isReverting ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Détails de la version */}
                        <AnimatePresence>
                          {selectedVersion?.id === version.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                            >
                              <div className="prose dark:prose-invert max-w-none">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Contenu :
                                </h4>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {version.content}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}