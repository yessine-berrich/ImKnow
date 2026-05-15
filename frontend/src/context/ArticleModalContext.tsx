// context/ArticleModalContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import ArticleDetailModal from '@/components/modals/ArticleDetailModal';

interface ArticleModalContextType {
  openArticleModal: (article: any, commentId?: number) => void;
  closeArticleModal: () => void;
}

const ArticleModalContext = createContext<ArticleModalContextType | undefined>(undefined);

export function useArticleModal() {
  const context = useContext(ArticleModalContext);
  if (!context) {
    throw new Error('useArticleModal must be used within ArticleModalProvider');
  }
  return context;
}

interface ArticleModalProviderProps {
  children: ReactNode;
}

export function ArticleModalProvider({ children }: ArticleModalProviderProps) {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openArticleModal = (article: any, commentId?: number) => {
    if (commentId) {
      article.scrollToCommentId = commentId;
    }
    setSelectedArticle(article);
    setIsOpen(true);
  };

  const closeArticleModal = () => {
    setIsOpen(false);
    setSelectedArticle(null);
  };

  return (
    <ArticleModalContext.Provider value={{ openArticleModal, closeArticleModal }}>
      {children}
      <ArticleDetailModal
        isOpen={isOpen}
        onClose={closeArticleModal}
        article={selectedArticle}
        onLike={() => {}}
        onBookmark={() => {}}
        onShare={() => {}}
      />
    </ArticleModalContext.Provider>
  );
}