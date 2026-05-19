'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PublicationDetailModal from '@/components/modals/PublicationDetailModal';

// Simuler des données d'publication
const MOCK_PUBLICATIONS = [
  {
    id: '1',
    title: 'Introduction à React',
    description: 'Un guide complet pour débuter avec React',
    content: 'Contenu détaillé de l\'publication...',
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
  // ... autres publications
];

export default function PublicationPage() {
  const params = useParams();
  const router = useRouter();
  const [publication, setPublication] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      const foundPublication = MOCK_PUBLICATIONS.find(a => a.id === params.id);
      if (foundPublication) {
        setPublication(foundPublication);
      } else {
        // Rediriger si l'publication n'existe pas
        router.push('/home');
      }
    }
  }, [params.id, router]);

  const handleClose = () => {
    router.back();
  };

  if (!publication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicationDetailModal
        isOpen={true}
        onClose={handleClose}
        publication={publication}
        onLike={() => console.log('Like')}
        onBookmark={() => console.log('Bookmark')}
        onShare={() => console.log('Share')}
      />
    </div>
  );
}