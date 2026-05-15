'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ArticleDetailModal from '@/components/modals/ArticleDetailModal';

// Simuler des données d'article
const MOCK_ARTICLES = [
  {
    id: '1',
    title: 'Introduction à React',
    description: 'Un guide complet pour débuter avec React',
    content: 'Contenu détaillé de l\'article...',
    author: {
      id: '1',
      name: 'Jean Dupont',
      initials: 'JD',
      department: 'Développement',
    },
    category: {
      name: 'React',
      slug: 'react',
    },
    tags: ['React', 'JavaScript', 'Frontend'],
    isFeatured: true,
    publishedAt: '2024-02-01T10:00:00Z',
    status: 'published' as const,
    stats: {
      likes: 45,
      comments: 12,
      views: 1200,
    },
  },
  // ... autres articles
];

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      const foundArticle = MOCK_ARTICLES.find(a => a.id === params.id);
      if (foundArticle) {
        setArticle(foundArticle);
      } else {
        // Rediriger si l'article n'existe pas
        router.push('/home');
      }
    }
  }, [params.id, router]);

  const handleClose = () => {
    router.back();
  };

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ArticleDetailModal
        isOpen={true}
        onClose={handleClose}
        article={article}
        onLike={() => console.log('Like')}
        onBookmark={() => console.log('Bookmark')}
        onShare={() => console.log('Share')}
      />
    </div>
  );
}