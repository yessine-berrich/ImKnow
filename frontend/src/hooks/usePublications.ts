// // hooks/usePublications.ts

// import { useState, useEffect, useCallback } from 'react';
// import { publicationService } from '../../services/publication.service';
// import {
//   Publication,
//   PublicationFilters,
//   PaginatedResponse,
//   CreatePublicationDto,
//   UpdatePublicationDto,
// } from '@/types/publication.types';

// interface UsePublicationsOptions {
//   autoLoad?: boolean;
//   initialFilters?: PublicationFilters;
// }

// export const usePublications = (options: UsePublicationsOptions = {}) => {
//   const { autoLoad = true, initialFilters = {} } = options;

//   const [publications, setPublications] = useState<Publication[]>([]);
//   const [total, setTotal] = useState(0);
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [filters, setFilters] = useState<PublicationFilters>(initialFilters);

//   const loadPublications = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const response: PaginatedResponse<Publication> = await publicationService.getPublications({
//         ...filters,
//         page,
//         limit,
//       });

//       setPublications(response.data);
//       setTotal(response.total);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des publications');
//       console.error('Error loading publications:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [filters, page, limit]);

//   useEffect(() => {
//     if (autoLoad) {
//       loadPublications();
//     }
//   }, [autoLoad, loadPublications]);

//   const createPublication = useCallback(async (data: CreatePublicationDto): Promise<Publication> => {
//     setError(null);
//     try {
//       const publication = await publicationService.createPublication(data);
//       await loadPublications(); // Recharger la liste
//       return publication;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la création de l\'publication');
//       throw err;
//     }
//   }, [loadPublications]);

//   const updatePublication = useCallback(async (id: number, data: UpdatePublicationDto): Promise<Publication> => {
//     setError(null);
//     try {
//       const publication = await publicationService.updatePublication(id, data);
//       await loadPublications(); // Recharger la liste
//       return publication;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la mise à jour de l\'publication');
//       throw err;
//     }
//   }, [loadPublications]);

//   const deletePublication = useCallback(async (id: number): Promise<void> => {
//     setError(null);
//     try {
//       await publicationService.deletePublication(id);
//       await loadPublications(); // Recharger la liste
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la suppression de l\'publication');
//       throw err;
//     }
//   }, [loadPublications]);

//   const likePublication = useCallback(async (id: number): Promise<void> => {
//     setError(null);
//     try {
//       await publicationService.likePublication(id);
//       // Mettre à jour localement
//       setPublications(prev =>
//         prev.map(publication =>
//           publication.id === id
//             ? { ...publication, likes: publication.likes + 1 }
//             : publication
//         )
//       );
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du like de l\'publication');
//       throw err;
//     }
//   }, []);

//   const updateFilters = useCallback((newFilters: Partial<PublicationFilters>) => {
//     setFilters(prev => ({ ...prev, ...newFilters }));
//     setPage(1); // Reset à la première page
//   }, []);

//   const nextPage = useCallback(() => {
//     if (page * limit < total) {
//       setPage(prev => prev + 1);
//     }
//   }, [page, limit, total]);

//   const previousPage = useCallback(() => {
//     if (page > 1) {
//       setPage(prev => prev - 1);
//     }
//   }, [page]);

//   const goToPage = useCallback((newPage: number) => {
//     if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
//       setPage(newPage);
//     }
//   }, [total, limit]);

//   return {
//     // Data
//     publications,
//     total,
//     page,
//     limit,
//     isLoading,
//     error,
//     filters,
    
//     // Actions
//     loadPublications,
//     createPublication,
//     updatePublication,
//     deletePublication,
//     likePublication,
//     updateFilters,
    
//     // Pagination
//     nextPage,
//     previousPage,
//     goToPage,
//     setLimit,
    
//     // Computed
//     hasNextPage: page * limit < total,
//     hasPreviousPage: page > 1,
//     totalPages: Math.ceil(total / limit),
//   };
// };

// // hooks/usePublication.ts

// export const usePublication = (id: number | null) => {
//   const [publication, setPublication] = useState<Publication | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadPublication = useCallback(async () => {
//     if (!id) return;

//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await publicationService.getPublication(id);
//       setPublication(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement de l\'publication');
//       console.error('Error loading publication:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [id]);

//   useEffect(() => {
//     loadPublication();
//   }, [loadPublication]);

//   const updatePublication = useCallback(async (data: UpdatePublicationDto): Promise<Publication> => {
//     if (!id) throw new Error('No publication ID provided');

//     setError(null);
//     try {
//       const updatedPublication = await publicationService.updatePublication(id, data);
//       setPublication(updatedPublication);
//       return updatedPublication;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la mise à jour de l\'publication');
//       throw err;
//     }
//   }, [id]);

//   const deletePublication = useCallback(async (): Promise<void> => {
//     if (!id) throw new Error('No publication ID provided');

//     setError(null);
//     try {
//       await publicationService.deletePublication(id);
//       setPublication(null);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la suppression de l\'publication');
//       throw err;
//     }
//   }, [id]);

//   const likePublication = useCallback(async (): Promise<void> => {
//     if (!id) throw new Error('No publication ID provided');

//     setError(null);
//     try {
//       const updatedPublication = await publicationService.likePublication(id);
//       setPublication(updatedPublication);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du like de l\'publication');
//       throw err;
//     }
//   }, [id]);

//   const incrementViews = useCallback(async (): Promise<void> => {
//     if (!id) return;

//     try {
//       await publicationService.incrementViews(id);
//       if (publication) {
//         setPublication({ ...publication, views: publication.views + 1 });
//       }
//     } catch (err: any) {
//       console.error('Error incrementing views:', err);
//     }
//   }, [id, publication]);

//   return {
//     publication,
//     isLoading,
//     error,
//     loadPublication,
//     updatePublication,
//     deletePublication,
//     likePublication,
//     incrementViews,
//   };
// };

// // hooks/useCategories.ts

// import { Category } from '@/types/publication.types';

// export const useCategories = () => {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadCategories = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await publicationService.getCategories();
//       setCategories(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des catégories');
//       console.error('Error loading categories:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadCategories();
//   }, [loadCategories]);

//   return {
//     categories,
//     isLoading,
//     error,
//     loadCategories,
//   };
// };

// // hooks/useTags.ts

// import { Tag } from '@/types/publication.types';

// export const useTags = () => {
//   const [tags, setTags] = useState<Tag[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadTags = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await publicationService.getTags();
//       setTags(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des tags');
//       console.error('Error loading tags:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadTags();
//   }, [loadTags]);

//   return {
//     tags,
//     isLoading,
//     error,
//     loadTags,
//   };
// };

// // hooks/useFileUpload.ts

// export const useFileUpload = () => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [error, setError] = useState<string | null>(null);

//   const uploadFile = useCallback(async (file: File) => {
//     setIsUploading(true);
//     setProgress(0);
//     setError(null);

//     try {
//       // Simuler la progression
//       const progressInterval = setInterval(() => {
//         setProgress(prev => Math.min(prev + 10, 90));
//       }, 100);

//       const mediaDto = await publicationService.uploadFile(file);

//       clearInterval(progressInterval);
//       setProgress(100);

//       return mediaDto;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de l\'upload du fichier');
//       throw err;
//     } finally {
//       setIsUploading(false);
//       setTimeout(() => setProgress(0), 1000);
//     }
//   }, []);

//   return {
//     uploadFile,
//     isUploading,
//     progress,
//     error,
//   };
// };