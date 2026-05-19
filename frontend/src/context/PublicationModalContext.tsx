// context/PublicationModalContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import PublicationDetailModal from '@/components/modals/PublicationDetailModal';

interface PublicationModalContextType {
  openPublicationModal: (publication: any, commentId?: number) => void;
  closePublicationModal: () => void;
}

const PublicationModalContext = createContext<PublicationModalContextType | undefined>(undefined);

export function usePublicationModal() {
  const context = useContext(PublicationModalContext);
  if (!context) {
    throw new Error('usePublicationModal must be used within PublicationModalProvider');
  }
  return context;
}

interface PublicationModalProviderProps {
  children: ReactNode;
}

export function PublicationModalProvider({ children }: PublicationModalProviderProps) {
  const [selectedPublication, setSelectedPublication] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPublicationModal = (publication: any, commentId?: number) => {
    if (commentId) {
      publication.scrollToCommentId = commentId;
    }
    setSelectedPublication(publication);
    setIsOpen(true);
  };

  const closePublicationModal = () => {
    setIsOpen(false);
    setSelectedPublication(null);
  };

  return (
    <PublicationModalContext.Provider value={{ openPublicationModal, closePublicationModal }}>
      {children}
      <PublicationDetailModal
        isOpen={isOpen}
        onClose={closePublicationModal}
        publication={selectedPublication}
        onLike={() => {}}
        onBookmark={() => {}}
        onShare={() => {}}
      />
    </PublicationModalContext.Provider>
  );
}